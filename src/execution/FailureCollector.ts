import fs from 'node:fs';
import type { TestFailure } from './TestFailure';
import { FrameworkError } from '../core/FrameworkError';

export interface PlaywrightAttachment {
  name: string;
  path?: string;
  /** Base64-encoded content - present when the attachment was provided inline (testInfo.attach with `body`) rather than via a file path. */
  body?: string;
  contentType: string;
}

export interface PlaywrightResult {
  status: string;
  duration: number;
  errors: Array<{ message?: string }>;
  attachments: PlaywrightAttachment[];
  startTime: string;
}

export interface PlaywrightTestEntry {
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  projectName?: string;
  results: PlaywrightResult[];
}

export interface PlaywrightSpec {
  title: string;
  file: string;
  tests: PlaywrightTestEntry[];
}

interface PlaywrightSuite {
  title: string;
  file?: string;
  specs: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

interface PlaywrightJSONReport {
  suites: PlaywrightSuite[];
}

function collectSpecs(suite: PlaywrightSuite, acc: PlaywrightSpec[]): void {
  acc.push(...suite.specs);
  for (const child of suite.suites ?? []) {
    collectSpecs(child, acc);
  }
}

function findAttachment(result: PlaywrightResult, name: string): string | undefined {
  return result.attachments.find((a) => a.name === name)?.path;
}

export function readPlaywrightReport(reportPath: string): PlaywrightSpec[] {
  if (!fs.existsSync(reportPath)) {
    throw new FrameworkError({
      stage: 'FAILURE_COLLECTION',
      message: `Playwright JSON report not found: ${reportPath}`,
      possibleCause: 'Tests have not been run yet, or the json reporter output path changed.',
      recommendedAction: 'Run `npm test` first.',
    });
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as PlaywrightJSONReport;
  const specs: PlaywrightSpec[] = [];
  for (const suite of report.suites) {
    collectSpecs(suite, specs);
  }
  return specs;
}

export interface TestOutcome {
  title: string;
  file: string;
  status: 'passed' | 'failed' | 'flaky' | 'skipped';
}

/** Every test in the report with a simplified overall status, for execution summaries. */
export function collectAllOutcomes(reportPath: string): TestOutcome[] {
  const specs = readPlaywrightReport(reportPath);
  const outcomes: TestOutcome[] = [];

  for (const spec of specs) {
    for (const testEntry of spec.tests) {
      const status: TestOutcome['status'] =
        testEntry.status === 'unexpected'
          ? 'failed'
          : testEntry.status === 'expected'
            ? 'passed'
            : testEntry.status;
      outcomes.push({ title: spec.title, file: spec.file, status });
    }
  }

  return outcomes;
}

/**
 * Parses Playwright's own JSON reporter output (reports/json/playwright-
 * results.json, see playwright.config.ts) into the framework's TestFailure
 * shape. Only specs whose final status is "unexpected" (failed after any
 * Playwright-level retries) are reported - "flaky" (failed then passed) is
 * not treated as a failure needing healing.
 */
export function collectFailuresFromReport(reportPath: string): TestFailure[] {
  const specs = readPlaywrightReport(reportPath);
  const failures: TestFailure[] = [];

  for (const spec of specs) {
    for (const testEntry of spec.tests) {
      if (testEntry.status !== 'unexpected') {
        continue;
      }
      const result = testEntry.results[testEntry.results.length - 1];
      if (!result) {
        continue;
      }

      failures.push({
        testName: spec.title,
        scenario: spec.title,
        feature: spec.file,
        error: result.errors[0]?.message ?? 'Unknown error (no message captured).',
        screenshot: findAttachment(result, 'screenshot'),
        trace: findAttachment(result, 'trace'),
        video: findAttachment(result, 'video'),
        timestamp: result.startTime,
        environment: testEntry.projectName,
      });
    }
  }

  return failures;
}
