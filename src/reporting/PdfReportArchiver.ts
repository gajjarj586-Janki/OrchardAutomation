import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import type { DetailedTestResult } from './TestRunReport';

export interface ArchivePdfReportsParams {
  rootDir: string;
  testRun: DetailedTestResult[];
}

const STATUS_COLOR: Record<DetailedTestResult['status'], string> = {
  passed: '#188038',
  failed: '#c5221f',
  flaky: '#e37400',
  skipped: '#5f6368',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Inlines an image file as a base64 data URI so the PDF is fully
 * self-contained - readable even if reports/screenshots/ later moves or is
 * cleaned. Returns null (not thrown) if the file is missing/unreadable, so
 * one bad path never breaks the whole report. */
function imageDataUri(filePath: string | undefined): string | null {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  try {
    const ext = path.extname(filePath).slice(1) || 'png';
    const base64 = fs.readFileSync(filePath).toString('base64');
    return `data:image/${ext};base64,${base64}`;
  } catch {
    return null;
  }
}

/** "generated/Ownership.spec.ts" -> "Ownership" - matches the requirement/
 * feature basename used throughout (requirements/Ownership.md,
 * features/Ownership.feature), so a reader can trace a PDF straight back to
 * the requirement it came from. */
function requirementName(test: DetailedTestResult): string {
  const base = path.basename(test.feature, path.extname(test.feature));
  return base.replace(/\.spec$/, '') || 'test';
}

/** Filesystem-safe: strips anything that isn't alphanumeric/dash/underscore. */
function sanitizeForFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function renderHtml(test: DetailedTestResult): string {
  const color = STATUS_COLOR[test.status];
  const screenshotUri = imageDataUri(test.finalScreenshot) ?? imageDataUri(test.screenshot);
  const durationSeconds = (test.durationMs / 1000).toFixed(1);
  const generatedAt = new Date().toLocaleString();

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #202124; margin: 0; padding: 16px; font-size: 12px; }
  h1 { font-size: 16px; margin: 0 0 2px; display: flex; align-items: center; gap: 8px; }
  .status { color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .generated { color: #5f6368; margin: 0 0 10px; font-size: 10px; }
  .scenario { font-size: 12px; color: #3c4043; margin: 0 0 4px; }
  .meta { font-size: 10px; color: #5f6368; margin: 0 0 8px; }
  .error { background: #fce8e6; color: #c5221f; padding: 6px 8px; font-size: 10px; white-space: pre-wrap; word-break: break-word; border-radius: 4px; margin: 0 0 8px; }
  /* Thumbnail, not full-size: source screenshots are full-page captures
     (often 3000px+ tall) - shown at full resolution these alone would span
     several pages. The original PNG stays in reports/screenshots/ for
     anyone who needs to zoom in. */
  .screenshot { display: block; max-width: 300px; max-height: 340px; width: auto; height: auto; object-fit: contain; border: 1px solid #dadce0; border-radius: 4px; }
  .no-screenshot { font-size: 10px; color: #5f6368; font-style: italic; }
</style>
</head>
<body>
  <h1><span class="status" style="background:${color}">${test.status.toUpperCase()}</span> ${escapeHtml(requirementName(test))}</h1>
  <p class="generated">Generated ${escapeHtml(generatedAt)}</p>
  <p class="scenario">${escapeHtml(test.scenario)}</p>
  <p class="meta">Duration: ${durationSeconds}s${test.environment ? ` &middot; Environment: ${escapeHtml(test.environment)}` : ''}</p>
  ${test.error ? `<pre class="error">${escapeHtml(test.error)}</pre>` : ''}
  ${
    screenshotUri
      ? `<img class="screenshot" src="${screenshotUri}" alt="Final screenshot for ${escapeHtml(test.testName)}" />`
      : '<p class="no-screenshot">(no screenshot captured)</p>'
  }
</body>
</html>`;
}

/**
 * Renders one PDF per test from reports/json/test-run-report.json (status/
 * duration/error and the test's actual screenshot embedded inline as
 * base64) and saves each to reports/pdf/ as
 * `<requirementName>_<YYYY-MM-DD>_<status>.pdf` - e.g.
 * `Ownership_2026-09-25_passed.pdf` - so a report can be traced straight
 * back to the requirement it came from at a glance.
 *
 * Deliberately not a snapshot of Playwright's own HTML report: that report
 * is a client-rendered single-page app - a plain `page.pdf()` of it only
 * captures the collapsed test list, not each test's expanded screenshot,
 * which needs per-row interaction to reveal. Building our own printable
 * page from the same underlying data sidesteps that entirely.
 *
 * Note: the filename only has date resolution (not time), so re-running
 * the same requirement to the same status again on the same day overwrites
 * that day's PDF rather than accumulating a second copy.
 *
 * Best-effort by design: a PDF-export failure (e.g. no Chromium-based
 * browser available) must never fail the run that triggered it, so a
 * failed export is silently skipped rather than thrown.
 */
export async function archivePdfReports(params: ArchivePdfReportsParams): Promise<string[]> {
  if (params.testRun.length === 0) {
    return [];
  }

  const pdfDir = path.join(params.rootDir, 'reports', 'pdf');
  const date = new Date().toISOString().slice(0, 10);
  const written: string[] = [];

  let browser;
  try {
    fs.mkdirSync(pdfDir, { recursive: true });
    browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
  } catch {
    return [];
  }

  try {
    for (const test of params.testRun) {
      const filename = `${sanitizeForFilename(requirementName(test))}_${date}_${test.status}.pdf`;
      const outputPath = path.join(pdfDir, filename);
      try {
        const page = await browser.newPage();
        try {
          await page.setContent(renderHtml(test), { waitUntil: 'load' });
          await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '16px', bottom: '16px', left: '16px', right: '16px' },
          });
          written.push(outputPath);
        } finally {
          await page.close();
        }
      } catch {
        // one test's PDF failing to render must never skip the rest
      }
    }
  } finally {
    await browser.close();
  }

  return written;
}
