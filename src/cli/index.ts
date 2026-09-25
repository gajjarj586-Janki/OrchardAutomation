#!/usr/bin/env node
import { Command } from 'commander';
import { registerValidateConfigCommand } from './commands/validateConfig';
import { registerRequirementsCommand } from './commands/requirements';
import { registerGenerateFeaturesCommand } from './commands/generateFeatures';
import { registerValidateFeaturesCommand } from './commands/validateFeatures';
import { registerGenerateStepsCommand } from './commands/generateSteps';
import { registerGenerateTestsCommand } from './commands/generateTests';
import { registerDiscoverLocatorsCommand } from './commands/discoverLocators';
import { registerAnalyzeFailuresCommand } from './commands/analyzeFailures';
import { registerHealCommand } from './commands/heal';
import { registerRetryFailedCommand } from './commands/retryFailed';
import { registerRegressionCommand } from './commands/regression';
import { registerReportCommand } from './commands/report';
import { registerAiTestCommand } from './commands/aiTest';

const program = new Command();

program
  .name('ai-playwright-framework')
  .description('Generic AI-powered Playwright BDD self-healing test framework CLI')
  .version('0.1.0');

registerValidateConfigCommand(program);
registerRequirementsCommand(program);
registerGenerateFeaturesCommand(program);
registerValidateFeaturesCommand(program);
registerGenerateStepsCommand(program);
registerGenerateTestsCommand(program);
registerDiscoverLocatorsCommand(program);
registerAnalyzeFailuresCommand(program);
registerHealCommand(program);
registerRetryFailedCommand(program);
registerRegressionCommand(program);
registerReportCommand(program);
registerAiTestCommand(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
