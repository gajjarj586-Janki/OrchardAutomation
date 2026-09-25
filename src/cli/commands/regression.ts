import path from 'node:path';
import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { runRegression } from '../../execution/RegressionRunner';

export function registerRegressionCommand(program: Command): void {
  program
    .command('regression')
    .description(
      'Run the regression suite (healing.regressionScope: affected|full) after a healing attempt.'
    )
    .action(async () => {
      try {
        const { rootDir, ctx } = bootstrapCli();
        const reportPath = path.join(rootDir, 'reports', 'json', 'playwright-results.json');
        const result = await runRegression({ rootDir, config: ctx.config, reportPath });

        if (result.scope === 'affected' && result.files.length === 0) {
          console.log('No affected files found in the last test run - nothing to run.');
          return;
        }

        console.log(`\nRegression (${result.scope}): ${result.success ? 'PASSED' : 'FAILED'}`);
        if (!result.success) {
          process.exitCode = result.exitCode;
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
