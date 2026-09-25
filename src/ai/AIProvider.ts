import type {
  RequirementInput,
  GeneratedFeature,
  ParsedFeature,
  GeneratedSteps,
} from '../bdd/types';
import type { TestFailure } from '../execution/TestFailure';
import type {
  AIRequest,
  AIResponse,
  StructuredAIRequest,
  LocatorContext,
  AISuggestedLocator,
  FailureAnalysis,
  HealingContext,
  HealingSuggestion,
} from './types';

/**
 * Every AI-backed capability the framework needs. AI output from any
 * implementation is untrusted: callers must run it through schema/content/
 * syntax validation before acting on it - see AIClient.
 */
export interface AIProvider {
  readonly name: string;

  generate(request: AIRequest): Promise<AIResponse>;

  generateStructured<T>(request: StructuredAIRequest, schema: unknown): Promise<T>;

  generateFeature(input: RequirementInput): Promise<GeneratedFeature>;

  generateStepDefinitions(feature: ParsedFeature): Promise<GeneratedSteps>;

  suggestLocator(context: LocatorContext): Promise<AISuggestedLocator[]>;

  analyzeFailure(failure: TestFailure): Promise<FailureAnalysis>;

  generateHealingSuggestion(context: HealingContext): Promise<HealingSuggestion>;
}
