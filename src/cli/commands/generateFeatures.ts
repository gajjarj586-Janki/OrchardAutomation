import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { discoverRequirementFiles, parseRequirementFile } from '../../bdd/RequirementParser';
import { generateFeatureForRequirement } from '../../bdd/FeatureGenerator';
import { createAIClient } from '../../ai/createAIClient';

export function registerGenerateFeaturesCommand(program: Command): void {
  program
    .command('generate:features')
    .description('Generate/update features/*.feature from requirements/*.md via the AI provider.')
    .option('--dry-run', 'Show what would be generated without writing files', false)
    .action(async (opts: { dryRun: boolean }) => {
      try {
        const { requirementsDir, featuresDir, ctx, events } = bootstrapCli();
        const aiClient = createAIClient(ctx.config, ctx.logger);
        const files = discoverRequirementFiles(requirementsDir);

        if (files.length === 0) {
          console.log(`No requirement files found in ${requirementsDir}.`);
          return;
        }

        let failed = 0;

        for (const file of files) {
          const requirement = parseRequirementFile(file);
          events.emit('REQUIREMENT_READ', { requirementId: requirement.id });

          try {
            const result = await generateFeatureForRequirement(requirement, {
              aiClient,
              featuresDir,
              dryRun: opts.dryRun,
            });
            events.emit('FEATURE_GENERATED', {
              requirementId: requirement.id,
              featurePath: result.featurePath,
              status: result.status,
              scenarioCount: result.scenarioCount,
            });
            console.log(
              `[${result.status}] ${requirement.id} -> ${result.featurePath} (${result.scenarioCount} scenario(s))`
            );
          } catch (error) {
            failed += 1;
            if (error instanceof FrameworkError) {
              console.error(`[FAIL] ${requirement.id}: ${error.message}`);
            } else {
              throw error;
            }
          }
        }

        if (failed > 0) {
          process.exitCode = 1;
          console.error(`\n${failed} requirement(s) failed feature generation.`);
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
