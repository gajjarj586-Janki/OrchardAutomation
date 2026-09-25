import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runAiTestPipeline } from './AiTestPipeline';
import { ConfigSchema } from '../config/schema';

function makeProjectDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-pipeline-'));
  fs.mkdirSync(path.join(dir, 'requirements'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'requirements', 'demo.md'),
    '# Demo\n\n## Description\n\nSomething.\n\n## Acceptance Criteria\n\n- A thing happens.\n'
  );
  return dir;
}

test('runAiTestPipeline --dry-run generates features without writing steps/tests/reports', async () => {
  const rootDir = makeProjectDir();
  const config = ConfigSchema.parse({
    project: { name: 'dry-run-test' },
    application: {},
    execution: {},
    ai: {},
    mcp: {},
    healing: {},
  });

  const result = await runAiTestPipeline({ rootDir, config, dryRun: true });

  assert.equal(result.finalStatus, 'NO_TESTS');
  assert.equal(fs.existsSync(path.join(rootDir, 'features')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'steps')), false);
  assert.equal(fs.existsSync(path.join(rootDir, 'reports')), false);
});
