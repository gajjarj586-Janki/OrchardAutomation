import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { parseFeatureFile } from '../../bdd/FeatureParser';
import { generateTestFileForFeature } from '../../bdd/TestFileGenerator';

export function registerGenerateTestsCommand(program: Command): void {
  program
    .command('generate:tests')
    .description('Generate tests/generated/*.spec.ts from features/*.feature.')
    .option('--dry-run', 'Show what would be generated without writing files', false)
    .action((opts: { dryRun: boolean }) => {
      try {
        const { rootDir } = bootstrapCli();
        const featuresDir = path.join(rootDir, 'features');
        const testsDir = path.join(rootDir, 'tests', 'generated');

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
          const result = generateTestFileForFeature(feature, { testsDir, dryRun: opts.dryRun });
          console.log(
            `[${result.status}] ${name} -> ${result.filePath} (${result.scenarioCount} scenario(s))`
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
