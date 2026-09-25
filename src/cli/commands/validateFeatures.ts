import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { validateFeatureFile } from '../../bdd/validators/GherkinValidator';

export function registerValidateFeaturesCommand(program: Command): void {
  program
    .command('validate:features')
    .description('Validate features/*.feature (Gherkin syntax + content rules such as no secrets).')
    .action(() => {
      try {
        const { featuresDir, events } = bootstrapCli();

        if (!fs.existsSync(featuresDir)) {
          console.log(`No features directory found at ${featuresDir}.`);
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

        let failed = 0;

        for (const name of files) {
          const featurePath = path.join(featuresDir, name);
          const content = fs.readFileSync(featurePath, 'utf-8');
          const result = validateFeatureFile(content, featurePath);

          events.emit('FEATURE_VALIDATED', {
            featurePath,
            valid: result.valid,
            scenarioCount: result.scenarioCount,
          });

          if (result.valid) {
            console.log(`[PASS] ${name} (${result.scenarioCount} scenario(s))`);
          } else {
            failed += 1;
            console.error(`[FAIL] ${name}`);
            for (const error of result.errors) {
              console.error(`  - ${error}`);
            }
          }
        }

        console.log(`\n${files.length - failed}/${files.length} feature file(s) valid.`);
        if (failed > 0) {
          process.exitCode = 1;
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
