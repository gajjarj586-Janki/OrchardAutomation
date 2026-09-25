import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { runRegression } from './RegressionRunner';
import { ConfigSchema, type FrameworkConfig } from '../config/schema';

function makeConfig(regressionScope: 'affected' | 'full'): FrameworkConfig {
  return ConfigSchema.parse({
    project: { name: 'test-project' },
    application: {},
    execution: {},
    ai: {},
    mcp: {},
    healing: { regressionScope },
  });
}

function writeReport(dir: string): string {
  const reportPath = path.join(dir, 'playwright-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({
      suites: [
        {
          title: 'demo.spec.ts',
          specs: [
            {
              title: 'A failing scenario',
              file: 'generated/demo.spec.ts',
              tests: [
                {
                  status: 'unexpected',
                  results: [
                    {
                      status: 'failed',
                      duration: 1,
                      errors: [{ message: 'x' }],
                      attachments: [],
                      startTime: new Date().toISOString(),
                    },
                  ],
                },
              ],
            },
          ],
          suites: [],
        },
      ],
    })
  );
  return reportPath;
}

function fakeSpawn(exitCode: number) {
  return () => {
    const child = new EventEmitter() as unknown as ChildProcess;
    setImmediate(() => child.emit('close', exitCode));
    return child;
  };
}

test('runRegression with scope "affected" targets only the failing spec files', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-regression-'));
  const reportPath = writeReport(dir);
  const result = await runRegression({
    rootDir: dir,
    config: makeConfig('affected'),
    reportPath,
    spawnFn: fakeSpawn(0) as never,
  });
  assert.equal(result.scope, 'affected');
  assert.deepEqual(result.files, ['generated/demo.spec.ts']);
  assert.equal(result.success, true);
});

test('runRegression with scope "full" ignores the report and runs everything', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-regression-'));
  const reportPath = writeReport(dir);
  const result = await runRegression({
    rootDir: dir,
    config: makeConfig('full'),
    reportPath,
    spawnFn: fakeSpawn(0) as never,
  });
  assert.equal(result.scope, 'full');
  assert.deepEqual(result.files, []);
});
