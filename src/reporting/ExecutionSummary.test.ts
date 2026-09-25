import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildExecutionSummary } from './ExecutionSummary';

test('buildExecutionSummary returns zeros when no report exists (e.g. dry run)', () => {
  const summary = buildExecutionSummary({
    requirementsProcessed: 2,
    featuresGenerated: 2,
    reportPath: '/nonexistent/playwright-results.json',
  });
  assert.equal(summary.testsExecuted, 0);
  assert.equal(summary.requirementsProcessed, 2);
});

test('buildExecutionSummary tallies pass/fail/skip from a real report', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-summary-'));
  const reportPath = path.join(dir, 'playwright-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({
      suites: [
        {
          title: 'demo.spec.ts',
          specs: [
            { title: 'a', file: 'demo.spec.ts', tests: [{ status: 'expected', results: [] }] },
            { title: 'b', file: 'demo.spec.ts', tests: [{ status: 'unexpected', results: [] }] },
            { title: 'c', file: 'demo.spec.ts', tests: [{ status: 'skipped', results: [] }] },
          ],
          suites: [],
        },
      ],
    })
  );

  const summary = buildExecutionSummary({
    requirementsProcessed: 1,
    featuresGenerated: 1,
    reportPath,
  });
  assert.equal(summary.testsExecuted, 3);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.skipped, 1);
});
