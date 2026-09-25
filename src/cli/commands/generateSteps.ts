import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { parseFeatureFile } from '../../bdd/FeatureParser';
import { generatePageObjectForFeature } from '../../bdd/PageObjectGenerator';
import { generateStepsForFeature } from '../../bdd/StepGenerator';

export function registerGenerateStepsCommand(program: Command): void {
  program
    .command('generate:steps')
    .description(
      'Generate steps/*.steps.ts and scaffold Page Objects (src/pages/generated) from features/*.feature.'
    )
    .option('--dry-run', 'Show what would be generated without writing files', false)
    .action((opts: { dryRun: boolean }) => {
      try {
        const { rootDir, ctx, events } = bootstrapCli();
        const featuresDir = path.join(rootDir, 'features');
        const stepsDir = path.join(rootDir, 'steps');
        const pagesDir = path.join(rootDir, 'src', 'pages', 'generated');

        if (!fs.existsSync(featuresDir)) {
          console.log(
            `No features directory found at ${featuresDir}. Run generate:features first.`
          );
          return;
        }

        const files = fs
          .readdirSync(featuresDir)
          .filter((name) => name.endsWith('.feature'))
          .sort();

        if (files.length === 0) {
          console.log(`No .feature files found in ${featuresDir}.`);
          return;
        }

        for (const name of files) {
          const feature = parseFeatureFile(path.join(featuresDir, name));

          const pageObjectResult = generatePageObjectForFeature(feature, {
            pagesDir,
            dryRun: opts.dryRun,
          });
          console.log(`[${pageObjectResult.status}] Page Object ${pageObjectResult.className}`);
          if (pageObjectResult.missingMethods.length > 0) {
            ctx.logger.warn(
              `${pageObjectResult.className} is missing method(s) for new steps: ${pageObjectResult.missingMethods.join(', ')}`,
              { status: 'REQUIRES HUMAN APPROVAL' }
            );
          }

          const stepsResult = generateStepsForFeature(feature, { stepsDir, dryRun: opts.dryRun });
          events.emit('STEP_GENERATED', {
            feature: name,
            filePath: stepsResult.filePath,
            status: stepsResult.status,
            stepCount: stepsResult.stepCount,
          });
          console.log(
            `[${stepsResult.status}] ${name} -> ${stepsResult.filePath} (${stepsResult.stepCount} step pattern(s))`
          );
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
