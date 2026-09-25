import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectFailuresFromReport } from './FailureCollector';
import { FrameworkError } from '../core/FrameworkError';

const SAMPLE_REPORT = {
  suites: [
    {
      title: 'demo.spec.ts',
      file: 'demo.spec.ts',
      specs: [],
      suites: [
        {
          title: 'Demo Feature',
          file: 'demo.spec.ts',
          specs: [
            {
              title: 'A passing scenario',
              file: 'demo.spec.ts',
              tests: [
                {
                  status: 'expected',
                  projectName: 'chromium',
                  results: [
                    {
                      status: 'passed',
                      duration: 10,
                      errors: [],
                      attachments: [],
                      startTime: '2026-01-01T00:00:00.000Z',
                    },
                  ],
                },
              ],
            },
            {
              title: 'A failing scenario',
              file: 'demo.spec.ts',
              tests: [
                {
                  status: 'unexpected',
                  projectName: 'chromium',
                  results: [
                    {
                      status: 'failed',
                      duration: 20,
                      errors: [{ message: 'TimeoutError: locator.click: Timeout exceeded.' }],
                      attachments: [
                        {
                          name: 'screenshot',
                          path: 'test-results/x/screenshot.png',
                          contentType: 'image/png',
                        },
                        {
                          name: 'trace',
                          path: 'test-results/x/trace.zip',
                          contentType: 'application/zip',
                        },
                      ],
                      startTime: '2026-01-01T00:00:01.000Z',
                    },
                  ],
                },
              ],
            },
            {
              title: 'A flaky scenario (passed on retry)',
              file: 'demo.spec.ts',
              tests: [
                {
                  status: 'flaky',
                  projectName: 'chromium',
                  results: [
                    {
                      status: 'failed',
                      duration: 5,
                      errors: [{ message: 'boom' }],
                      attachments: [],
                      startTime: '2026-01-01T00:00:02.000Z',
                    },
                    {
                      status: 'passed',
                      duration: 5,
                      errors: [],
                      attachments: [],
                      startTime: '2026-01-01T00:00:03.000Z',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

test('collectFailuresFromReport only returns specs with final status "unexpected"', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-report-'));
  const reportPath = path.join(dir, 'playwright-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(SAMPLE_REPORT));

  const failures = collectFailuresFromReport(reportPath);

  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.testName, 'A failing scenario');
  assert.match(failures[0]?.error ?? '', /TimeoutError/);
  assert.equal(failures[0]?.screenshot, 'test-results/x/screenshot.png');
  assert.equal(failures[0]?.trace, 'test-results/x/trace.zip');
});

test('collectFailuresFromReport throws a FrameworkError when the report is missing', () => {
  assert.throws(
    () => collectFailuresFromReport('/nonexistent/playwright-results.json'),
    FrameworkError
  );
});
