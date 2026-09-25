import path from 'node:path';
import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { collectFailuresFromReport } from '../../execution/FailureCollector';
import { createAIClient } from '../../ai/createAIClient';

export function registerAnalyzeFailuresCommand(program: Command): void {
  program
    .command('analyze:failures')
    .description(
      'Analyze failures from the last `npm test` run (reports/json/playwright-results.json).'
    )
    .action(async () => {
      try {
        const { rootDir, ctx, events } = bootstrapCli();
        const reportPath = path.join(rootDir, 'reports', 'json', 'playwright-results.json');
        const aiClient = createAIClient(ctx.config, ctx.logger);

        const failures = collectFailuresFromReport(reportPath);

        if (failures.length === 0) {
          console.log('No failures found in the last test run.');
          return;
        }

        for (const failure of failures) {
          const analysis = await aiClient.provider.analyzeFailure(failure);
          events.emit('FAILURE_ANALYZED', {
            test: failure.testName,
            isLocatorFailure: analysis.isLocatorFailure,
          });
          console.log(`\n${failure.testName}`);
          console.log(`  locator-related: ${analysis.isLocatorFailure}`);
          if (analysis.suspectedElement) {
            console.log(`  suspected element: ${analysis.suspectedElement}`);
          }
          console.log(`  ${analysis.summary}`);
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
