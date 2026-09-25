import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildTestRunReport } from './TestRunReport';

function makeReport(dir: string): string {
  const apiCalls = [
    {
      method: 'GET',
      url: 'https://api.example.test/status',
      status: 200,
      responseBody: '{"ok":true}',
      timestamp: new Date().toISOString(),
      durationMs: 42,
    },
  ];
  const apiCallsBody = Buffer.from(JSON.stringify(apiCalls)).toString('base64');
  const fakePng = Buffer.from('not-a-real-png');
  const screenshotBody = fakePng.toString('base64');

  const reportPath = path.join(dir, 'playwright-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({
      suites: [
        {
          title: 'demo.spec.ts',
          specs: [],
          suites: [
            {
              title: 'Demo Feature',
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
                          duration: 1234,
                          errors: [],
                          startTime: new Date().toISOString(),
                          attachments: [
                            {
                              name: 'api-calls',
                              contentType: 'application/json',
                              body: apiCallsBody,
                            },
                            {
                              name: 'final-screenshot',
                              contentType: 'image/png',
                              body: screenshotBody,
                            },
                          ],
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
                          duration: 987,
                          errors: [{ message: 'boom' }],
                          startTime: new Date().toISOString(),
                          attachments: [
                            {
                              name: 'screenshot',
                              contentType: 'image/png',
                              path: '/tmp/test-failed-1.png',
                            },
                            {
                              name: 'api-calls',
                              contentType: 'application/json',
                              body: apiCallsBody,
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
        },
      ],
    })
  );
  return reportPath;
}

test('buildTestRunReport captures status, duration, and API payloads for a passing test', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-testrun-'));
  const screenshotsDir = path.join(dir, 'screenshots');
  const entries = buildTestRunReport(makeReport(dir), screenshotsDir);

  const passing = entries.find((e) => e.testName === 'A passing scenario');
  assert.ok(passing);
  assert.equal(passing?.status, 'passed');
  assert.equal(passing?.durationMs, 1234);
  assert.equal(passing?.apiCalls.length, 1);
  assert.equal(passing?.apiCalls[0]?.url, 'https://api.example.test/status');
  assert.ok(passing?.finalScreenshot && fs.existsSync(passing.finalScreenshot));
});

test('buildTestRunReport captures the error and both screenshot kinds for a failing test', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-testrun-'));
  const screenshotsDir = path.join(dir, 'screenshots');
  const entries = buildTestRunReport(makeReport(dir), screenshotsDir);

  const failing = entries.find((e) => e.testName === 'A failing scenario');
  assert.ok(failing);
  assert.equal(failing?.status, 'failed');
  assert.equal(failing?.durationMs, 987);
  assert.equal(failing?.error, 'boom');
  assert.equal(failing?.screenshot, '/tmp/test-failed-1.png');
  assert.equal(failing?.apiCalls.length, 1);
});
