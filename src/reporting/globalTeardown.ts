import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config/ConfigLoader';
import { generateReports } from './ReportGenerator';
import { archivePdfReports } from './PdfReportArchiver';
import { HealingHistory } from '../healer/HealingHistory';

function countFiles(dir: string, extension: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => name.endsWith(extension)).length;
}

/**
 * Playwright's own `globalTeardown` hook (see playwright.config.ts) - runs
 * once after every `npx playwright test` invocation, however it was
 * started (bare CLI, `npm test`, or as a subprocess of `npm run ai:test`),
 * after all reporters (including the json one this reads) have finished
 * writing. This is what makes `reports/json/*.json` and the per-test PDFs
 * under reports/pdf/ appear automatically from a plain test run, without
 * requiring a separate `npm run report` afterwards.
 *
 * Best-effort: report generation failing here must never fail the test run
 * that triggered it, so every step is wrapped and swallowed rather than
 * left to propagate.
 */
export default async function globalTeardown(): Promise<void> {
  const rootDir = process.cwd();

  try {
    const config = loadConfig({ rootDir });
    const history = new HealingHistory(path.join(rootDir, 'healing', 'history', 'history.json'));

    const result = generateReports({
      rootDir,
      config,
      requirementsProcessed: countFiles(path.join(rootDir, 'requirements'), '.md'),
      featuresGenerated: countFiles(path.join(rootDir, 'features'), '.feature'),
      events: [],
      healingRecords: history.all(),
    });

    const pdfPaths = await archivePdfReports({ rootDir, testRun: result.testRun });
    for (const pdfPath of pdfPaths) {
      console.log(`PDF report archived: ${pdfPath}`);
    }
  } catch (error) {
    console.error('globalTeardown: report generation failed (non-fatal):', error);
  }
}
