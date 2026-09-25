import path from 'node:path';
import { loadConfig } from '../config/ConfigLoader';
import { ExecutionContext } from '../core/ExecutionContext';
import { EventBus } from '../events/EventBus';
import { FrameworkError } from '../core/FrameworkError';

export interface CliContext {
  rootDir: string;
  requirementsDir: string;
  featuresDir: string;
  ctx: ExecutionContext;
  events: EventBus;
}

export interface BootstrapOptions {
  configFile?: string;
  /** Environment name (dev/stage/prod/...) - see config/environments/. Defaults to APP_ENV/NODE_ENV. */
  env?: string;
}

/**
 * Shared setup every CLI command needs: resolve config, build an
 * ExecutionContext (executionId + logger) and an EventBus, and resolve the
 * well-known project directories relative to the current working directory.
 */
export function bootstrapCli(options: BootstrapOptions = {}): CliContext {
  const rootDir = process.cwd();
  const config = loadConfig({ rootDir, configFile: options.configFile, env: options.env });
  const ctx = new ExecutionContext(config, options.env);
  const events = new EventBus(ctx.executionId, ctx.logger);

  return {
    rootDir,
    requirementsDir: path.join(rootDir, 'requirements'),
    featuresDir: path.join(rootDir, 'features'),
    ctx,
    events,
  };
}

export function reportFrameworkError(error: FrameworkError): void {
  console.error(`\n[${error.stage}] FAIL`);
  console.error(error.message);
  if (error.possibleCause) {
    console.error(`Possible cause: ${error.possibleCause}`);
  }
  if (error.recommendedAction) {
    console.error(`Recommended action: ${error.recommendedAction}`);
  }
  process.exitCode = 1;
}
