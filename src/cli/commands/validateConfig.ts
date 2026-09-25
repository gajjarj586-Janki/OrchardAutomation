import type { Command } from 'commander';
import { loadConfig } from '../../config/ConfigLoader';
import { ExecutionContext } from '../../core/ExecutionContext';
import { FrameworkError } from '../../core/FrameworkError';

export function registerValidateConfigCommand(program: Command): void {
  program
    .command('validate-config')
    .description('Load and validate framework configuration, then print the resolved values.')
    .option('--config <path>', 'Path to an additional config file to layer on top of defaults')
    .option('--env <name>', 'Environment to load (dev/stage/prod/...) - see config/environments/')
    .action((opts: { config?: string; env?: string }) => {
      try {
        const config = loadConfig({ configFile: opts.config, env: opts.env });
        const ctx = new ExecutionContext(config);
        ctx.logger.info('Configuration is valid', { status: 'PASS' });
        console.log(JSON.stringify(config, null, 2));
      } catch (error) {
        if (error instanceof FrameworkError) {
          console.error(`\n[CONFIGURATION] FAIL\n${error.message}`);
          if (error.possibleCause) {
            console.error(`Possible cause: ${error.possibleCause}`);
          }
          if (error.recommendedAction) {
            console.error(`Recommended action: ${error.recommendedAction}`);
          }
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });
}
