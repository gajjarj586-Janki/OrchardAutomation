import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { retryFailedTests } from './TargetedRetry';

function writeReport(dir: string, failing: boolean): string {
  const reportPath = path.join(dir, 'playwright-results.json');
  const tests = failing
    ? [
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
      ]
    : [];
  fs.writeFileSync(
    reportPath,
    JSON.stringify({
      suites: [
        {
          title: 'demo.spec.ts',
          specs: [{ title: 'A failing scenario', file: 'demo.spec.ts', tests }],
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

test('retryFailedTests does nothing when the last run had no failures', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-retry-'));
  const reportPath = writeReport(dir, false);
  const result = await retryFailedTests({ rootDir: dir, reportPath });
  assert.equal(result.testNames.length, 0);
  assert.equal(result.success, true);
});

test('retryFailedTests re-runs Playwright scoped to the failed test names', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-retry-'));
  const reportPath = writeReport(dir, true);
  const result = await retryFailedTests({
    rootDir: dir,
    reportPath,
    spawnFn: fakeSpawn(0) as never,
  });
  assert.deepEqual(result.testNames, ['A failing scenario']);
  assert.equal(result.success, true);
});
