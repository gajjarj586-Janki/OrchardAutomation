import path from 'node:path';
import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { retryFailedTests } from '../../execution/TargetedRetry';

export function registerRetryFailedCommand(program: Command): void {
  program
    .command('retry:failed')
    .description(
      'Re-run (via a real Playwright subprocess) only the tests that failed in the last run.'
    )
    .action(async () => {
      try {
        const { rootDir } = bootstrapCli();
        const reportPath = path.join(rootDir, 'reports', 'json', 'playwright-results.json');
        const result = await retryFailedTests({ rootDir, reportPath });

        if (result.testNames.length === 0) {
          console.log('No failures found in the last test run - nothing to retry.');
          return;
        }

        console.log(`\nTargeted Retry: ${result.success ? 'PASSED' : 'FAILED'}`);
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
