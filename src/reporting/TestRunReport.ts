import fs from 'node:fs';
import path from 'node:path';
import {
  readPlaywrightReport,
  type PlaywrightResult,
  type PlaywrightAttachment,
} from '../execution/FailureCollector';
import type { ApiCallRecord } from '../fixtures/frameworkTest';

export interface DetailedTestResult {
  testName: string;
  feature: string;
  scenario: string;
  environment?: string;
  status: 'passed' | 'failed' | 'flaky' | 'skipped';
  durationMs: number;
  error?: string;
  /** Playwright's own on-failure screenshot (execution.screenshot config), if any. */
  screenshot?: string;
  /** Always captured, pass or fail, by src/fixtures/frameworkTest.ts - saved to reports/screenshots/. */
  finalScreenshot?: string;
  video?: string;
  trace?: string;
  apiCalls: ApiCallRecord[];
}

function findAttachment(result: PlaywrightResult, name: string): PlaywrightAttachment | undefined {
  return result.attachments.find((a) => a.name === name);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function decodeInlineJson<T>(attachment: PlaywrightAttachment | undefined, fallback: T): T {
  if (!attachment?.body) {
    return fallback;
  }
  try {
    return JSON.parse(Buffer.from(attachment.body, 'base64').toString('utf-8')) as T;
  } catch {
    return fallback;
  }
}

/**
 * Saves an inline (base64 `body`) image attachment to disk so reports can
 * reference a real file instead of embedding megabytes of base64 in JSON.
 * Returns the saved path, or the attachment's own `path` if it was already
 * written to disk by Playwright (e.g. the on-failure screenshot).
 */
function saveImageAttachment(
  attachment: PlaywrightAttachment | undefined,
  screenshotsDir: string,
  baseName: string
): string | undefined {
  if (!attachment) {
    return undefined;
  }
  if (attachment.path) {
    return attachment.path;
  }
  if (!attachment.body) {
    return undefined;
  }
  const ext = attachment.contentType.split('/')[1] ?? 'png';
  const filePath = path.join(screenshotsDir, `${baseName}.${ext}`);
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.writeFileSync(filePath, Buffer.from(attachment.body, 'base64'));
  return filePath;
}

/**
 * Builds one detailed entry per test from Playwright's JSON report: status,
 * runtime, screenshots (both Playwright's on-failure one and the
 * always-on "final-screenshot" from frameworkTest.ts), video, trace, and
 * any captured API request/response payloads. This is the per-test detail
 * `execution-summary.json` intentionally leaves out (it only aggregates).
 */
export function buildTestRunReport(
  reportPath: string,
  screenshotsDir: string
): DetailedTestResult[] {
  const specs = readPlaywrightReport(reportPath);
  const entries: DetailedTestResult[] = [];
  const seenNames = new Map<string, number>();

  for (const spec of specs) {
    for (const testEntry of spec.tests) {
      const result = testEntry.results[testEntry.results.length - 1];
      if (!result) continue;

      const status: DetailedTestResult['status'] =
        testEntry.status === 'unexpected'
          ? 'failed'
          : testEntry.status === 'expected'
            ? 'passed'
            : testEntry.status;

      const baseSlug = slugify(`${spec.file}-${spec.title}`);
      const occurrence = (seenNames.get(baseSlug) ?? 0) + 1;
      seenNames.set(baseSlug, occurrence);
      const baseName = occurrence > 1 ? `${baseSlug}-${occurrence}` : baseSlug;

      const finalScreenshot = saveImageAttachment(
        findAttachment(result, 'final-screenshot'),
        screenshotsDir,
        `${baseName}-final`
      );
      const failureScreenshot = findAttachment(result, 'screenshot')?.path;

      entries.push({
        testName: spec.title,
        feature: spec.file,
        scenario: spec.title,
        environment: testEntry.projectName,
        status,
        durationMs: result.duration,
        error: result.errors[0]?.message,
        screenshot: failureScreenshot,
        finalScreenshot,
        video: findAttachment(result, 'video')?.path,
        trace: findAttachment(result, 'trace')?.path,
        apiCalls: decodeInlineJson<ApiCallRecord[]>(findAttachment(result, 'api-calls'), []),
      });
    }
  }

  return entries;
}

export function writeTestRunReport(entries: DetailedTestResult[], filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf-8');
}
