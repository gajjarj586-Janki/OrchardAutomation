import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from '../AIProvider';
import type {
  AIRequest,
  AIResponse,
  StructuredAIRequest,
  LocatorContext,
  AISuggestedLocator,
  FailureAnalysis,
  HealingContext,
  HealingSuggestion,
} from '../types';
import type {
  RequirementInput,
  GeneratedFeature,
  ParsedFeature,
  GeneratedSteps,
} from '../../bdd/types';
import type { TestFailure } from '../../execution/TestFailure';
import { LOCATOR_STRATEGY_PRIORITY } from '../../locator/LocatorDefinition';
import { parsePlaywrightError } from '../../execution/PlaywrightErrorParser';
import { FrameworkError } from '../../core/FrameworkError';
import type { FrameworkConfig } from '../../config/schema';

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

/** Strips a ```<any language tag>\n ... ``` fence a model added despite being told not to. */
function stripCodeFence(text: string): string {
  const fenced = /```[a-zA-Z]*\n([\s\S]*?)```/.exec(text.trim());
  return (fenced?.[1] ?? text).trim();
}

/**
 * Real AI provider backed by Anthropic's Claude models. Every method's
 * output still goes through the same schema/content validation as the mock
 * (via `AIClient.withValidation` at the call site) - a real model is
 * untrusted input to this framework exactly like any other, see docs/ai.md.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';

  private readonly client: Pick<Anthropic, 'messages'>;
  private readonly model: string;

  /**
   * `client` is an injection seam for tests (mirrors `spawnFn` on
   * TestExecutor's `RunPlaywrightOptions`) - defaults to a real Anthropic
   * client so production call sites never need to pass it.
   */
  constructor(config: FrameworkConfig, client?: Pick<Anthropic, 'messages'>) {
    const apiKey = process.env.AI_API_KEY;
    if (!client && !apiKey) {
      throw new FrameworkError({
        stage: 'AI_PROVIDER',
        message: 'AI_PROVIDER=anthropic requires AI_API_KEY to be set.',
        possibleCause: 'AI_API_KEY is empty or unset.',
        recommendedAction: 'Set a real Anthropic API key as AI_API_KEY in .env.',
      });
    }
    if (!config.ai.model) {
      throw new FrameworkError({
        stage: 'AI_PROVIDER',
        message: 'AI_PROVIDER=anthropic requires AI_MODEL to be set to a Claude model id.',
        possibleCause: 'AI_MODEL is empty in .env.',
        recommendedAction:
          'Set AI_MODEL in .env (see https://docs.anthropic.com/en/docs/about-claude/models for current model ids).',
      });
    }
    this.client = client ?? new Anthropic({ apiKey });
    this.model = config.ai.model;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      ...(request.system ? { system: request.system } : {}),
      messages: [{ role: 'user', content: request.prompt }],
    });
    return { text: extractText(message), raw: message };
  }

  private async generateJson<T>(request: StructuredAIRequest): Promise<T> {
    const response = await this.generate({
      prompt: request.prompt,
      system: [
        request.system,
        'Respond with ONLY a single valid JSON value. No prose, no explanation, no markdown code fences.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    });

    try {
      return JSON.parse(stripCodeFence(response.text)) as T;
    } catch (error) {
      throw new FrameworkError({
        stage: 'AI_GENERATION',
        message: `Claude's response for "${request.purpose}" was not valid JSON.`,
        possibleCause: `Raw response: ${response.text.slice(0, 500)}`,
        recommendedAction: 'Retrying will ask again; if this persists, review/tighten the prompt.',
        cause: error,
      });
    }
  }

  async generateStructured<T>(request: StructuredAIRequest, _schema: unknown): Promise<T> {
    return this.generateJson<T>(request);
  }

  async generateFeature(input: RequirementInput): Promise<GeneratedFeature> {
    const criteria =
      input.acceptanceCriteria.length > 0
        ? input.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
        : '(none given - infer one reasonable scenario from the description alone)';

    const response = await this.generate({
      system: [
        'You write Gherkin (.feature file content) for a browser-automation test framework.',
        'Output ONLY the raw .feature file content - no markdown fences, no commentary.',
        '',
        'Hard requirements:',
        '- One `Feature:` line using the exact given title.',
        '- One `Scenario:` per acceptance criterion.',
        '- Every When/And step that performs a UI interaction MUST be phrased as exactly one',
        '  of these shapes (this exact grammar is machine-parsed downstream, do not deviate):',
        '    the user clicks "<element name>"',
        '    the user selects "<element name>"',
        '    the user checks "<element name>"',
        '    the user fills "<element name>"',
        '    the user types into "<element name>"',
        '    the user opens "<element name>"',
        '  One interaction per step - never combine two actions in one step.',
        '- Given steps set up preconditions (e.g. `Given the user is on the "<page>" page`).',
        '- Then steps assert outcomes in plain English (these are not machine-parsed).',
        '- Never invent secrets, credentials, or real personal data.',
      ].join('\n'),
      prompt: [
        `Title: ${input.title}`,
        input.targetUrl ? `Target URL: ${input.targetUrl}` : '',
        `Description: ${input.description}`,
        '',
        'Acceptance criteria:',
        criteria,
      ]
        .filter(Boolean)
        .join('\n'),
    });

    const content = stripCodeFence(response.text) + '\n';
    return { title: input.title, content };
  }

  async generateStepDefinitions(feature: ParsedFeature): Promise<GeneratedSteps> {
    // Dead in this pipeline today - the deterministic StepGenerator
    // (src/bdd/StepGenerator.ts) is authoritative and never consults this.
    // Kept honest/cheap rather than spending a real API call on unused output.
    const coveredSteps = Array.from(new Set(feature.scenarios.flatMap((s) => s.steps)));
    return {
      content: `// Not used - src/bdd/StepGenerator.ts is authoritative.\n// Feature: ${feature.title}\n`,
      coveredSteps,
    };
  }

  async suggestLocator(context: LocatorContext): Promise<AISuggestedLocator[]> {
    return this.generateJson<AISuggestedLocator[]>({
      purpose: 'suggestLocator',
      system: [
        'You suggest Playwright locator candidates for a UI element, given a',
        'business-language description of the action a test needs to perform.',
        'Respond with a JSON array of 1-3 candidates, most likely first, each shaped exactly as:',
        `{"locator": {"strategy": one of ${JSON.stringify(LOCATOR_STRATEGY_PRIORITY)}, "value": string, "name"?: string}, "strategy": <same as locator.strategy>, "confidence": number 0-1, "reason": string}`,
        'Prefer "role" with a "name" (accessible name) over CSS/XPath whenever plausible.',
      ].join('\n'),
      prompt: [
        `Intended action: ${context.intendedAction}`,
        context.previousLocator
          ? `Previously-failing locator: ${JSON.stringify(context.previousLocator)}`
          : '',
        context.feature ? `Feature: ${context.feature}` : '',
        context.scenario ? `Scenario: ${context.scenario}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  async analyzeFailure(failure: TestFailure): Promise<FailureAnalysis> {
    // The structural parse (locator/action-verb extraction) is deterministic
    // and doesn't need an LLM; only the human-readable summary calls Claude,
    // and that call is defensively caught - analyzeFailure runs inline during
    // a live test's healing attempt (see ScenarioRunner.ts), so an AI outage
    // here must degrade gracefully, never break the healing attempt outright.
    const parsed = parsePlaywrightError(failure.error);
    const fallbackSummary = parsed.isLocatorRelated
      ? `Locator-related failure detected via deterministic parsing for "${failure.testName}"${
          parsed.locator ? ` (locator: ${parsed.locator.strategy}="${parsed.locator.name ?? parsed.locator.value}")` : ''
        }.`
      : `No known locator-failure pattern detected for "${failure.testName}".`;

    let summary = fallbackSummary;
    try {
      const response = await this.generate({
        system:
          'In one or two sentences, explain what likely went wrong in this Playwright test failure, and whether it looks like a UI locator problem.',
        prompt: `Test: ${failure.testName}\nScenario: ${failure.scenario ?? '(none)'}\nError:\n${failure.error}`,
      });
      summary = response.text.trim() || fallbackSummary;
    } catch {
      // Keep fallbackSummary - see comment above.
    }

    return {
      isLocatorFailure: parsed.isLocatorRelated,
      suspectedElement: parsed.locator?.name ?? parsed.locator?.value,
      intendedAction: failure.scenario,
      previousLocator: parsed.locator,
      actionVerb: parsed.actionVerb,
      summary,
    };
  }

  async generateHealingSuggestion(context: HealingContext): Promise<HealingSuggestion> {
    const candidates = await this.suggestLocator(context.locatorContext);
    return {
      candidates,
      reasoning: `Claude healing suggestion based on failure analysis: ${context.analysis.summary}`,
    };
  }
}
