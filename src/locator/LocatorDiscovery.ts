import type { ParsedFeature } from '../bdd/types';
import type { AIClient } from '../ai/AIClient';
import type { MCPClient } from '../mcp/MCPClient';
import type { LocatorCandidate } from '../healer/LocatorCandidate';
import { AISuggestedLocatorListSchema } from '../ai/schemas/locatorSuggestionSchema';
import { isActionableText } from './actionText';
import { rankCandidates } from './LocatorRanking';

export interface ActionableStep {
  scenario: string;
  step: string;
}

export function extractActionableSteps(feature: ParsedFeature): ActionableStep[] {
  const results: ActionableStep[] = [];
  for (const scenario of feature.scenarios) {
    for (const step of scenario.steps) {
      if (isActionableText(step)) {
        results.push({ scenario: scenario.name, step });
      }
    }
  }
  return results;
}

export interface DiscoveryResult {
  feature: string;
  actionableStepCount: number;
  candidates: LocatorCandidate[];
  mcpStatus: 'OK' | 'SKIPPED' | 'ERROR';
  mcpNote?: string;
}

/**
 * Discovers locator candidates for a feature's actionable steps (steps
 * whose text names a concrete UI interaction, e.g. "Click Submit"). AI
 * proposes candidates; when MCP is configured, each is additionally
 * validated via MCP evidence. Without MCP, candidates come back
 * `validated: false` and the result honestly reports mcpStatus: 'SKIPPED'
 * rather than pretending they were checked against a live page.
 */
export async function discoverLocatorsForFeature(
  feature: ParsedFeature,
  aiClient: AIClient,
  mcpClient: MCPClient
): Promise<DiscoveryResult> {
  const actionableSteps = extractActionableSteps(feature);
  const candidates: LocatorCandidate[] = [];
  let mcpStatus: 'OK' | 'SKIPPED' | 'ERROR' = mcpClient.isConfigured ? 'OK' : 'SKIPPED';
  let mcpNote: string | undefined;

  // Nothing else ever calls mcpClient.connect() - without this, an adapter
  // has no way to know which page "validateLocator" should even be checking.
  // feature.targetUrl round-trips from the requirement's "Target URL:" line
  // (see FeatureParser.ts); no targetUrl means whatever page the session is
  // already on (or SKIPPED, if never connected).
  if (mcpClient.isConfigured && actionableSteps.length > 0 && feature.targetUrl) {
    const connectResult = await mcpClient.connect(feature.targetUrl);
    if (connectResult.status === 'ERROR') {
      mcpStatus = 'ERROR';
      mcpNote = connectResult.error;
    }
  }

  try {
    for (const action of actionableSteps) {
      const suggestions = await aiClient.withValidation({
        stage: 'LOCATOR_DISCOVERY',
        operation: () =>
          aiClient.provider.suggestLocator({
            intendedAction: action.step,
            feature: feature.title,
            scenario: action.scenario,
          }),
        validate: (result) => {
          const parsed = AISuggestedLocatorListSchema.safeParse(result);
          return parsed.success
            ? { valid: true, errors: [] }
            : { valid: false, errors: parsed.error.issues.map((i) => i.message) };
        },
      });

      for (const suggestion of suggestions) {
        const candidate: LocatorCandidate = {
          locator: suggestion.locator,
          strategy: suggestion.strategy,
          confidence: suggestion.confidence,
          reason: suggestion.reason,
          evidence: [{ source: 'ai', description: `Suggested from step: "${action.step}"` }],
          validated: false,
        };

        const mcpResult = await mcpClient.validateLocator(candidate.locator);
        if (mcpResult.status === 'OK') {
          candidate.validated = true;
          candidate.validationResult = mcpResult.data;
          candidate.evidence.push({
            source: 'mcp',
            description: 'Validated via MCP',
            data: mcpResult.data,
          });
        } else if (mcpResult.status === 'SKIPPED') {
          mcpStatus = 'SKIPPED';
          mcpNote = mcpResult.reason;
        } else {
          mcpStatus = 'ERROR';
          mcpNote = mcpResult.error;
        }

        candidates.push(candidate);
      }
    }
  } finally {
    if (mcpClient.isConfigured && actionableSteps.length > 0 && feature.targetUrl) {
      await mcpClient.disconnect();
    }
  }

  return {
    feature: feature.title,
    actionableStepCount: actionableSteps.length,
    candidates: rankCandidates(candidates),
    mcpStatus,
    mcpNote,
  };
}
