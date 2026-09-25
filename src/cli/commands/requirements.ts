import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { discoverRequirementFiles, parseRequirementFile } from '../../bdd/RequirementParser';

export function registerRequirementsCommand(program: Command): void {
  program
    .command('requirements')
    .description('Discover and parse requirements/*.md, printing a summary.')
    .action(() => {
      try {
        const { requirementsDir, ctx, events } = bootstrapCli();
        const files = discoverRequirementFiles(requirementsDir);

        if (files.length === 0) {
          ctx.logger.warn(`No requirements found in ${requirementsDir}`, { status: 'SKIPPED' });
          console.log(`No requirement files found in ${requirementsDir}.`);
          return;
        }

        for (const file of files) {
          const requirement = parseRequirementFile(file);
          events.emit('REQUIREMENT_READ', {
            requirementId: requirement.id,
            title: requirement.title,
            acceptanceCriteriaCount: requirement.acceptanceCriteria.length,
          });
          console.log(`\n${requirement.id}`);
          console.log(`  title: ${requirement.title}`);
          console.log(`  acceptance criteria: ${requirement.acceptanceCriteria.length}`);
          if (requirement.targetUrl) {
            console.log(`  target URL: ${requirement.targetUrl}`);
          }
        }

        console.log(`\n${files.length} requirement(s) discovered in ${requirementsDir}.`);
      } catch (error) {
        if (error instanceof FrameworkError) {
          reportFrameworkError(error);
          return;
        }
        throw error;
      }
    });
}
