import type { Command } from 'commander';
import { loadConfig } from '../../config/ConfigLoader';
import { runAiTestPipeline } from '../../core/AiTestPipeline';
import { FrameworkError } from '../../core/FrameworkError';
import { reportFrameworkError } from '../bootstrap';

export function registerAiTestCommand(program: Command): void {
  program
    .command('ai:test')
    .description(
      'Run the complete pipeline: requirements -> Gherkin -> steps -> locators -> Playwright -> healing -> reports.'
    )
    .option(
      '--dry-run',
      'Show what the pipeline would do without writing files or executing tests',
      false
    )
    .option('--config <path>', 'Additional config file to layer on top of defaults')
    .option('--env <name>', 'Environment to load (dev/stage/prod/...) - see config/environments/')
    .action(async (opts: { dryRun: boolean; config?: string; env?: string }) => {
      try {
        const rootDir = process.cwd();
        const config = loadConfig({ rootDir, configFile: opts.config, env: opts.env });
        const result = await runAiTestPipeline({
          rootDir,
          config,
          dryRun: opts.dryRun,
          env: opts.env,
        });

        if (result.finalStatus === 'FAILED') {
          process.exitCode = 1;
        }
      } catch (error) {
        if (error instanceof FrameworkError) {
          reportFrameworkError(error);
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });
}
