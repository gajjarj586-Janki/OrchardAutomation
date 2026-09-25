import path from 'node:path';
import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { collectFailuresFromReport } from '../../execution/FailureCollector';
import { Healer } from '../../healer/Healer';
import type { HealingAttemptRecord } from '../../healer/HealingHistory';

function printReport(testName: string, record: HealingAttemptRecord): void {
  console.log(`\nOriginal Test: FAILED (${testName})`);
  console.log(`Healing Candidate: ${record.candidateLocator ? 'FOUND' : 'NOT FOUND'}`);
  console.log(
    `Candidate Validation: ${record.validationResult ? (record.validationResult.valid ? 'PASSED' : 'FAILED') : 'SKIPPED'}`
  );
  console.log(`Targeted Retry: ${record.targetedRetry}`);
  console.log(`Final Status: ${record.finalStatus}`);
  console.log(`Source Patch: ${record.patchStatus === 'APPLIED' ? 'APPLIED' : 'NOT APPLIED'}`);
  console.log(`Approval: ${record.approvalStatus}`);
}

export function registerHealCommand(program: Command): void {
  program
    .command('heal')
    .description(
      'Attempt to heal failures from the last `npm test` run (offline - no live page, so candidate validation relies on MCP when configured).'
    )
    .action(async () => {
      try {
        const { rootDir, ctx, events } = bootstrapCli();
        const reportPath = path.join(rootDir, 'reports', 'json', 'playwright-results.json');
        const healer = new Healer({ rootDir, config: ctx.config, logger: ctx.logger, events });

        const failures = collectFailuresFromReport(reportPath);

        if (failures.length === 0) {
          console.log('No failures found in the last test run.');
          return;
        }

        for (const failure of failures) {
          const record = await healer.heal(failure);
          printReport(failure.testName, record);
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
