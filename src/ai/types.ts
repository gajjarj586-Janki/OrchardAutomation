import type { LocatorDefinition, LocatorStrategy } from '../locator/LocatorDefinition';
import type { TestFailure } from '../execution/TestFailure';

export interface AIRequest {
  prompt: string;
  system?: string;
}

export interface AIResponse {
  text: string;
  raw?: unknown;
}

export interface StructuredAIRequest extends AIRequest {
  /** Short label used in logs/reports, e.g. "generateFeature". */
  purpose: string;
}

export interface Evidence {
  source: 'mcp' | 'ai' | 'static-analysis' | 'retry' | 'regression';
  description: string;
  data?: unknown;
}

export interface LocatorContext {
  /**
   * Business-language description of the intended action, e.g. "Click
   * Delete Account". May be empty when the pipeline could only recover a
   * failed locator (e.g. from a Playwright error), not a business phrase -
   * suggestLocator falls back to previousLocator-based heuristics then.
   */
  intendedAction: string;
  /** The locator that previously worked/was expected, if any. */
  previousLocator?: LocatorDefinition;
  /** Page/scenario/feature this locator is used in, for traceability. */
  page?: string;
  scenario?: string;
  feature?: string;
}

export interface AISuggestedLocator {
  locator: LocatorDefinition;
  strategy: LocatorStrategy;
  confidence: number;
  reason: string;
}

export interface FailureAnalysis {
  /** Whether the framework believes this failure is locator/element related. */
  isLocatorFailure: boolean;
  suspectedElement?: string;
  intendedAction?: string;
  /** The locator Playwright was resolving when it failed, if recoverable from the error text. */
  previousLocator?: LocatorDefinition;
  /** The Playwright action that failed (click, fill, check, ...), if recoverable. */
  actionVerb?: string;
  summary: string;
}

export interface HealingContext {
  failure: TestFailure;
  analysis: FailureAnalysis;
  locatorContext: LocatorContext;
}

export interface HealingSuggestion {
  candidates: AISuggestedLocator[];
  reasoning: string;
}
