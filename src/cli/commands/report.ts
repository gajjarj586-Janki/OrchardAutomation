import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { generateReports } from '../../reporting/ReportGenerator';
import { archivePdfReports } from '../../reporting/PdfReportArchiver';
import { HealingHistory } from '../../healer/HealingHistory';

function countFiles(dir: string, extension: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => name.endsWith(extension)).length;
}

export function registerReportCommand(program: Command): void {
  program
    .command('report')
    .description(
      'Generate reports/ (execution summary, AI report, healing report) from the last run.'
    )
    .action(async () => {
      try {
        const { rootDir, ctx } = bootstrapCli();
        const history = new HealingHistory(
          path.join(rootDir, 'healing', 'history', 'history.json')
        );

        const result = generateReports({
          rootDir,
          config: ctx.config,
          requirementsProcessed: countFiles(path.join(rootDir, 'requirements'), '.md'),
          featuresGenerated: countFiles(path.join(rootDir, 'features'), '.feature'),
          events: [],
          healingRecords: history.all(),
        });

        console.log('Execution summary:', JSON.stringify(result.execution, null, 2));
        console.log(`\nReports written under ${path.join(rootDir, 'reports')}`);

        // Playwright's own HTML report (reports/playwright/index.html) is
        // overwritten by every `npx playwright test` run - this renders one
        // readable, self-contained PDF per test (screenshot embedded) from
        // the same test-run-report.json data. Also fires automatically from
        // src/reporting/globalTeardown.ts on every raw `npx playwright
        // test` run; calling it again here lets reports/ be rebuilt without
        // re-running tests too.
        const pdfPaths = await archivePdfReports({ rootDir, testRun: result.testRun });
        for (const pdfPath of pdfPaths) {
          console.log(`PDF report archived: ${pdfPath}`);
        }
      } catch (error) {
        if (error instanceof FrameworkError) {
          reportFrameworkError(error);
          return;
        }
        throw error;
      }
    });
}
