import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import type { AIClient } from '../ai/AIClient';
import type { MCPClient } from '../mcp/MCPClient';
import type { FrameworkConfig } from '../config/schema';
import type { EventBus } from '../events/EventBus';
import type { TestFailure } from '../execution/TestFailure';
import { resolveLocator, validateLocatorOnPage } from '../locator/LocatorValidator';
import { rankCandidates } from '../locator/LocatorRanking';
import type { LocatorCandidate } from './LocatorCandidate';
import { HealingHistory, type HealingAttemptRecord } from './HealingHistory';

const NO_ARG_ACTIONS = new Set(['click', 'check', 'uncheck', 'hover', 'dblclick', 'tap', 'focus']);

async function performAction(
  page: Page,
  candidate: LocatorCandidate,
  actionVerb: string
): Promise<void> {
  if (!NO_ARG_ACTIONS.has(actionVerb)) {
    throw new Error(
      `Targeted retry does not support action "${actionVerb}" (it requires a value the framework cannot recover from the failure alone).`
    );
  }
  const locator = resolveLocator(page, candidate.locator);
  const method =
    locator[actionVerb as 'click' | 'check' | 'uncheck' | 'hover' | 'dblclick' | 'tap' | 'focus'];
  await method.call(locator);
}

export interface HealAttemptInput {
  failure: TestFailure;
  /** Live Playwright page, when healing runs inline during the failing test. */
  page?: Page;
}

export interface HealDependencies {
  aiClient: AIClient;
  mcpClient: MCPClient;
  config: FrameworkConfig;
  history: HealingHistory;
  events?: EventBus;
}

function baseRecord(
  input: HealAttemptInput,
  config: FrameworkConfig,
  aiProviderName: string
): HealingAttemptRecord {
  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    project: config.project.name,
    application: config.application.baseUrl || undefined,
    environment: input.failure.environment ?? process.env.APP_ENV ?? 'local',
    test: input.failure.testName,
    scenario: input.failure.scenario,
    feature: input.failure.feature,
    evidence: [],
    targetedRetry: 'NOT_RUN',
    regression: 'NOT_RUN',
    aiProvider: aiProviderName,
    aiModel: config.ai.model || undefined,
    approvalStatus: 'NOT_APPLICABLE',
    patchStatus: 'NOT_APPLIED',
    finalStatus: 'NOT_APPLICABLE',
  };
}

/**
 * The core healing decision flow: analyze -> (if locator-related) generate
 * candidates -> rank -> validate (live page when available, else MCP, else
 * SKIPPED) -> targeted retry of just the failed action. Never patches
 * source and never claims HEALED without an actually-validated,
 * actually-retried candidate. See docs/healing.md.
 */
export async function attemptHeal(
  input: HealAttemptInput,
  deps: HealDependencies
): Promise<HealingAttemptRecord> {
  const { aiClient, mcpClient, config, history, events } = deps;
  const record = baseRecord(input, config, aiClient.provider.name);

  events?.emit('HEALING_STARTED', { test: input.failure.testName });

  if (!config.healing.enabled || !config.healing.autoHeal) {
    record.finalStatus = 'NOT_APPLICABLE';
    record.reason = 'Healing is disabled in configuration (healing.enabled/autoHeal).';
    history.append(record);
    return record;
  }

  const analysis = await aiClient.provider.analyzeFailure(input.failure);
  record.originalLocator = analysis.previousLocator;

  if (!analysis.isLocatorFailure) {
    record.finalStatus = 'NOT_APPLICABLE';
    record.reason = `Not a locator-related failure: ${analysis.summary}`;
    history.append(record);
    return record;
  }

  const suggestion = await aiClient
    .withValidation({
      stage: 'HEALING_CANDIDATE_GENERATION',
      operation: () =>
        aiClient.provider.generateHealingSuggestion({
          failure: input.failure,
          analysis,
          locatorContext: {
            intendedAction: analysis.intendedAction ?? '',
            previousLocator: analysis.previousLocator,
            feature: input.failure.feature,
            scenario: input.failure.scenario,
          },
        }),
      validate: (result) => ({
        valid: result.candidates.length > 0,
        errors: result.candidates.length > 0 ? [] : ['AI returned no healing candidates.'],
      }),
    })
    .catch(() => null);

  if (!suggestion || suggestion.candidates.length === 0) {
    record.finalStatus = 'FAILED';
    record.reason = 'No healing candidate could be generated.';
    history.append(record);
    return record;
  }

  const candidates: LocatorCandidate[] = suggestion.candidates.map((s) => ({
    locator: s.locator,
    strategy: s.strategy,
    confidence: s.confidence,
    reason: s.reason,
    evidence: [{ source: 'ai' as const, description: s.reason }],
    validated: false,
  }));

  const [best] = rankCandidates(candidates);
  events?.emit('HEALING_CANDIDATE_FOUND', {
    test: input.failure.testName,
    strategy: best?.strategy,
    confidence: best?.confidence,
  });

  record.candidateLocator = best?.locator;
  record.strategy = best?.strategy;
  record.confidence = best?.confidence;
  record.reason = best?.reason;
  record.evidence = best?.evidence ?? [];

  if (!best) {
    record.finalStatus = 'FAILED';
    history.append(record);
    return record;
  }

  if (input.page) {
    try {
      const validationResult = await validateLocatorOnPage(input.page, best.locator);
      record.validationResult = validationResult;
      best.validated = validationResult.valid;
      best.validationResult = validationResult;
    } catch (error) {
      // The live page can already be closed/closing here - e.g. when the
      // original failure was the *test's own* timeout (not a shorter,
      // isolated action timeout), Playwright starts tearing down the
      // page/context around the same moment this inline attempt runs.
      // Record that plainly instead of letting it throw: an uncaught
      // rejection here is swallowed by ScenarioRunner's outer catch (by
      // design, so a healing bug never masks the original test failure),
      // which would otherwise silently drop this attempt with no history
      // record at all - worse than an honest FAILED one.
      record.finalStatus = 'FAILED';
      record.reason = `${record.reason ?? ''} (candidate validation failed: live page unavailable - ${
        error instanceof Error ? error.message : String(error)
      })`.trim();
      history.append(record);
      return record;
    }
  } else {
    const mcpResult = await mcpClient.validateLocator(best.locator);
    if (mcpResult.status === 'OK') {
      record.validationResult = mcpResult.data;
      best.validated = mcpResult.data.valid;
    } else {
      record.reason = `${record.reason ?? ''} (candidate validation SKIPPED - ${
        mcpResult.status === 'SKIPPED' ? mcpResult.reason : mcpResult.error
      })`.trim();
    }
  }

  if (!best.validated) {
    record.finalStatus = 'CANDIDATE_FOUND';
    history.append(record);
    return record;
  }

  events?.emit('HEALING_CANDIDATE_VALIDATED', { test: input.failure.testName });

  if (input.page && analysis.actionVerb) {
    events?.emit('TARGETED_RETRY_STARTED', { test: input.failure.testName });
    try {
      await performAction(input.page, best, analysis.actionVerb);
      record.targetedRetry = 'PASSED';
      events?.emit('TARGETED_RETRY_PASSED', { test: input.failure.testName });
    } catch (error) {
      record.targetedRetry = 'FAILED';
      record.reason = `${record.reason ?? ''} (targeted retry failed: ${
        error instanceof Error ? error.message : String(error)
      })`.trim();
    }
  }

  record.finalStatus = record.targetedRetry === 'PASSED' ? 'HEALED' : 'CANDIDATE_VALIDATED';
  record.approvalStatus = record.finalStatus === 'HEALED' ? 'REQUIRED' : 'NOT_APPLICABLE';

  if (record.finalStatus === 'HEALED') {
    events?.emit('HEALING_COMPLETED', {
      test: input.failure.testName,
      finalStatus: record.finalStatus,
    });
    events?.emit('PATCH_REQUIRES_APPROVAL', { test: input.failure.testName });
  }

  history.append(record);
  return record;
}
