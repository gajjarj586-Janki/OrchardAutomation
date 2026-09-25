import fs from 'node:fs';
import path from 'node:path';
import { ExecutionContext } from './ExecutionContext';
import { EventBus } from '../events/EventBus';
import { discoverRequirementFiles, parseRequirementFile } from '../bdd/RequirementParser';
import { generateFeatureForRequirement } from '../bdd/FeatureGenerator';
import { validateFeatureFile } from '../bdd/validators/GherkinValidator';
import { parseFeatureFile } from '../bdd/FeatureParser';
import { generatePageObjectForFeature } from '../bdd/PageObjectGenerator';
import { generateStepsForFeature } from '../bdd/StepGenerator';
import { generateTestFileForFeature } from '../bdd/TestFileGenerator';
import { discoverLocatorsForFeature } from '../locator/LocatorDiscovery';
import { createAIClient } from '../ai/createAIClient';
import { createMCPClient } from '../mcp/MCPProviderFactory';
import { runNodeScript, resolvePackageBin } from './runCommand';
import { runPlaywrightTests } from '../execution/TestExecutor';
import { collectFailuresFromReport } from '../execution/FailureCollector';
import { runRegression } from '../execution/RegressionRunner';
import { HealingHistory, type HealingAttemptRecord } from '../healer/HealingHistory';
import { generateReports } from '../reporting/ReportGenerator';
import type { FrameworkConfig } from '../config/schema';

const TOTAL_STAGES = 12;

interface StageOutcome {
  status: string;
  detail?: string;
}

export interface AiTestPipelineOptions {
  rootDir: string;
  config: FrameworkConfig;
  dryRun?: boolean;
  /** Environment name (dev/stage/prod/...) resolved by the caller - used for log/report labeling. */
  env?: string;
}

export interface AiTestPipelineResult {
  finalStatus: 'PASSED' | 'HEALED' | 'FAILED' | 'NO_TESTS';
  ctx: ExecutionContext;
  reportsDir: string;
}

function label(index: number, name: string): string {
  return `[${index}/${TOTAL_STAGES}] ${name}`.padEnd(38, '.');
}

async function runStage(
  ctx: ExecutionContext,
  index: number,
  name: string,
  fn: () => Promise<StageOutcome>
): Promise<StageOutcome> {
  const start = Date.now();
  let outcome: StageOutcome;
  try {
    outcome = await fn();
  } catch (error) {
    outcome = { status: 'FAIL', detail: error instanceof Error ? error.message : String(error) };
  }
  const durationMs = Date.now() - start;
  ctx.recordStage({
    stage: name,
    status: outcome.status === 'PASS' ? 'PASS' : outcome.status === 'SKIPPED' ? 'SKIPPED' : 'FAIL',
    detail: outcome.detail,
    durationMs,
  });
  console.log(`${label(index, name)} ${outcome.status}`);
  if (outcome.detail) {
    console.log(`  ${outcome.detail}`);
  }
  return outcome;
}

/**
 * The master `npm run ai:test` pipeline. Orchestrates every stage the
 * framework requirements call out, in the exact 12-stage shape their
 * example console output shows. Never fakes success: a stage's status
 * reflects what actually happened, including SKIPPED/CANDIDATE FOUND
 * outcomes when AI/MCP are unavailable or healing could not be fully
 * validated and retried.
 */
export async function runAiTestPipeline(
  options: AiTestPipelineOptions
): Promise<AiTestPipelineResult> {
  const { rootDir, config, dryRun = false, env } = options;
  const ctx = new ExecutionContext(config, env);
  const events = new EventBus(ctx.executionId, ctx.logger);
  const pipelineStartedAt = new Date();

  const requirementsDir = path.join(rootDir, 'requirements');
  const featuresDir = path.join(rootDir, 'features');
  const stepsDir = path.join(rootDir, 'steps');
  const pagesDir = path.join(rootDir, 'src', 'pages', 'generated');
  const testsDir = path.join(rootDir, 'tests', 'generated');
  const reportPath = path.join(rootDir, 'reports', 'json', 'playwright-results.json');
  const reportsDir = path.join(rootDir, 'reports');

  const aiClient = createAIClient(config, ctx.logger);
  const mcpClient = createMCPClient(config, ctx.logger);
  const history = new HealingHistory(path.join(rootDir, 'healing', 'history', 'history.json'));

  console.log(`AI: ${config.ai.enabled ? `configured (${config.ai.provider})` : 'NOT CONFIGURED'}`);
  console.log(
    `MCP: ${config.mcp.enabled && config.mcp.provider ? `configured (${config.mcp.provider})` : 'NOT CONFIGURED'}`
  );
  if (dryRun) {
    console.log('DRY RUN - no files will be written, no tests will execute.\n');
  } else {
    console.log('');
  }

  await runStage(ctx, 1, 'Configuration', async () => ({ status: 'PASS' }));

  let requirementCount = 0;
  await runStage(ctx, 2, 'Requirements', async () => {
    const files = discoverRequirementFiles(requirementsDir);
    requirementCount = files.length;
    events.emit('REQUIREMENT_READ', { count: files.length });
    return { status: 'PASS', detail: `${files.length} requirement(s) found` };
  });

  let featureCount = 0;
  await runStage(ctx, 3, 'Gherkin Generation', async () => {
    const files = discoverRequirementFiles(requirementsDir);
    let failed = 0;
    for (const file of files) {
      const requirement = parseRequirementFile(file);
      try {
        const result = await generateFeatureForRequirement(requirement, {
          aiClient,
          featuresDir,
          dryRun,
        });
        events.emit('FEATURE_GENERATED', { requirementId: requirement.id, status: result.status });
        featureCount += 1;
      } catch {
        failed += 1;
      }
    }
    return failed > 0
      ? {
          status: 'FAIL',
          detail: `${failed}/${files.length} requirement(s) failed feature generation`,
        }
      : { status: 'PASS', detail: `${featureCount} feature(s) generated/verified` };
  });

  const featureFiles = fs.existsSync(featuresDir)
    ? fs
        .readdirSync(featuresDir)
        .filter((name) => name.endsWith('.feature'))
        .map((name) => path.join(featuresDir, name))
    : [];

  await runStage(ctx, 4, 'Gherkin Validation', async () => {
    let invalid = 0;
    for (const filePath of featureFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const result = validateFeatureFile(content, filePath);
      events.emit('FEATURE_VALIDATED', { file: path.basename(filePath), valid: result.valid });
      if (!result.valid) invalid += 1;
    }
    return invalid > 0
      ? { status: 'FAIL', detail: `${invalid}/${featureFiles.length} feature file(s) invalid` }
      : { status: 'PASS', detail: `${featureFiles.length} feature file(s) valid` };
  });

  await runStage(ctx, 5, 'Step Generation', async () => {
    for (const filePath of featureFiles) {
      const feature = parseFeatureFile(filePath);
      const pageObjectResult = generatePageObjectForFeature(feature, { pagesDir, dryRun });
      const stepsResult = generateStepsForFeature(feature, { stepsDir, dryRun });
      generateTestFileForFeature(feature, { testsDir, dryRun });
      events.emit('STEP_GENERATED', {
        feature: path.basename(filePath),
        pageObjectStatus: pageObjectResult.status,
        stepsStatus: stepsResult.status,
      });
    }
    return { status: 'PASS', detail: `${featureFiles.length} feature(s) processed` };
  });

  await runStage(ctx, 6, 'Locator Discovery', async () => {
    let actionable = 0;
    let mcpSkipped = false;
    for (const filePath of featureFiles) {
      const feature = parseFeatureFile(filePath);
      const result = await discoverLocatorsForFeature(feature, aiClient, mcpClient);
      actionable += result.actionableStepCount;
      if (result.mcpStatus !== 'OK') mcpSkipped = true;
      for (const candidate of result.candidates) {
        events.emit('LOCATOR_DISCOVERED', {
          feature: path.basename(filePath),
          strategy: candidate.strategy,
        });
      }
    }
    return {
      status: 'PASS',
      detail:
        actionable === 0
          ? 'no actionable steps found'
          : `${actionable} actionable step(s)${mcpSkipped ? ' - MCP validation SKIPPED (MCP NOT CONFIGURED)' : ''}`,
    };
  });

  if (dryRun) {
    console.log('\nDry run complete - stopping before Code Validation/Execution/Healing stages.');
    return { finalStatus: 'NO_TESTS', ctx, reportsDir };
  }

  const codeValidation = await runStage(ctx, 7, 'Code Validation', async () => {
    const tscPath = resolvePackageBin('typescript', 'bin/tsc', [rootDir, __dirname]);
    const eslintPath = resolvePackageBin('eslint', 'bin/eslint.js', [rootDir, __dirname]);
    const tsc = await runNodeScript(tscPath, ['--noEmit'], { cwd: rootDir });
    const lint = await runNodeScript(eslintPath, ['.'], { cwd: rootDir });
    return tsc.success && lint.success
      ? { status: 'PASS' }
      : {
          status: 'FAIL',
          detail: `typecheck: ${tsc.success ? 'PASS' : 'FAIL'}, lint: ${lint.success ? 'PASS' : 'FAIL'}`,
        };
  });

  if (codeValidation.status !== 'PASS') {
    console.log('\nFINAL STATUS: FAILED (generated code did not pass validation)');
    return { finalStatus: 'FAILED', ctx, reportsDir };
  }

  await runStage(ctx, 8, 'Playwright Execution', async () => {
    if (featureFiles.length === 0) {
      return { status: 'SKIPPED', detail: 'no features to execute' };
    }
    // Playwright runs as a subprocess with its own playwright.config.ts,
    // which resolves its environment independently via APP_ENV/NODE_ENV -
    // it never sees `ctx.environmentName` otherwise, so an explicit
    // `--env <name>` on this command would silently apply to every stage
    // except the one that actually needs it.
    const result = await runPlaywrightTests({
      cwd: rootDir,
      env: { ...process.env, APP_ENV: ctx.environmentName },
    });
    events.emit('TEST_EXECUTED', { success: result.success });
    return { status: result.success ? 'PASS' : 'FAIL' };
  });

  const failures = fs.existsSync(reportPath) ? collectFailuresFromReport(reportPath) : [];
  if (failures.length > 0) {
    events.emit('TEST_FAILED', { count: failures.length });
  }

  await runStage(ctx, 9, 'Failure Analysis', async () => {
    if (failures.length === 0) {
      return { status: 'PASS', detail: 'no failures to analyze' };
    }
    for (const failure of failures) {
      const analysis = await aiClient.provider.analyzeFailure(failure);
      events.emit('FAILURE_ANALYZED', {
        test: failure.testName,
        isLocatorFailure: analysis.isLocatorFailure,
      });
    }
    return { status: 'PASS', detail: `${failures.length} failure(s) analyzed` };
  });

  const healingRecords = await (async (): Promise<HealingAttemptRecord[]> => {
    // Inline healing already ran live during "Playwright Execution" (see
    // ScenarioRunner + createHealer wiring in generated tests). This stage
    // reports what happened rather than re-attempting it offline.
    return history.all().filter((record) => new Date(record.timestamp) >= pipelineStartedAt);
  })();

  await runStage(ctx, 10, 'Healing', async () => {
    if (failures.length === 0) {
      return { status: 'SKIPPED', detail: 'no failures' };
    }
    if (healingRecords.length === 0) {
      return { status: 'NOT APPLICABLE', detail: 'no locator-related failures identified' };
    }
    if (healingRecords.some((r) => r.finalStatus === 'HEALED')) {
      return { status: 'HEALED' };
    }
    if (
      healingRecords.some(
        (r) => r.finalStatus === 'CANDIDATE_VALIDATED' || r.finalStatus === 'CANDIDATE_FOUND'
      )
    ) {
      return { status: 'CANDIDATE FOUND' };
    }
    return { status: 'FAILED', detail: 'no healing candidate could be generated/validated' };
  });

  const healedTestNames = new Set(
    healingRecords.filter((r) => r.finalStatus === 'HEALED').map((r) => r.test)
  );

  // The meaningful "targeted retry" already happened INLINE inside
  // HealingEngine (see record.targetedRetry): it replayed just the failed
  // action against the SAME live page using the candidate locator. A
  // second, separate Playwright subprocess run of the same unpatched
  // source can never pass (autoPatch is off by default, so the source
  // still calls the original, wrong locator) - re-running it here would
  // only ever report a confusing FAIL for something that isn't a new
  // problem. So this stage reports the inline result rather than
  // re-attempting it against source that cannot have changed.
  const targetedRetry = await runStage(ctx, 11, 'Targeted Retry', async () => {
    if (healingRecords.length === 0) {
      return { status: 'NOT RUN', detail: 'no healing was attempted' };
    }
    if (healedTestNames.size === 0) {
      return { status: 'NOT RUN', detail: 'no healed candidates to verify' };
    }
    const allPassed = healingRecords
      .filter((r) => r.finalStatus === 'HEALED')
      .every((r) => r.targetedRetry === 'PASSED');
    return { status: allPassed ? 'PASS' : 'FAIL' };
  });

  await runStage(ctx, 12, 'Regression', async () => {
    if (healedTestNames.size === 0 || targetedRetry.status !== 'PASS') {
      return { status: 'NOT RUN' };
    }
    if (!config.healing.regressionAfterHealing) {
      return { status: 'SKIPPED', detail: 'healing.regressionAfterHealing is false' };
    }
    if (!config.healing.autoPatch) {
      return {
        status: 'SKIPPED',
        detail:
          'healing.autoPatch is false - the candidate was never applied to source, so a full regression run against unpatched source would just re-report the same known failure. Apply the patch, then run `npm run regression`.',
      };
    }
    const result = await runRegression({
      rootDir,
      config,
      reportPath,
      env: { ...process.env, APP_ENV: ctx.environmentName },
    });
    return { status: result.success ? 'PASS' : 'FAIL' };
  });

  const finalStatus: AiTestPipelineResult['finalStatus'] =
    failures.length === 0
      ? 'PASSED'
      : healedTestNames.size === failures.length && targetedRetry.status === 'PASS'
        ? 'HEALED'
        : 'FAILED';

  generateReports({
    rootDir,
    config,
    requirementsProcessed: requirementCount,
    featuresGenerated: featureCount,
    events: events.getEvents(),
    healingRecords: history.all(),
  });

  console.log(`\nFINAL STATUS: ${finalStatus}`);
  console.log(`\nReports:\n${reportsDir}`);

  return { finalStatus, ctx, reportsDir };
}
