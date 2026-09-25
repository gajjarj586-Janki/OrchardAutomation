/**
 * Priority order the framework prefers when discovering or ranking locators.
 * Index in this array is used as a tie-breaker "stability" signal - lower
 * index is preferred. See docs/locator-discovery.md.
 */
export const LOCATOR_STRATEGY_PRIORITY = [
  'role',
  'label',
  'placeholder',
  'text',
  'testId',
  'css',
  'xpath',
] as const;

export type LocatorStrategy = (typeof LOCATOR_STRATEGY_PRIORITY)[number];

/**
 * A single Playwright locator, described declaratively so it can be
 * serialized (reports, healing history) and later turned into a real
 * `page.getBy...`/`page.locator(...)` call by the framework's Page Object
 * layer.
 */
export interface LocatorDefinition {
  strategy: LocatorStrategy;
  /** e.g. role name ("button"), CSS selector, XPath expression, test id value. */
  value: string;
  /** Accessible name / label / placeholder / text, when the strategy uses one. */
  name?: string;
  /** Extra role options such as { exact: true } for getByRole. */
  options?: Record<string, unknown>;
}

export interface LocatorValidationResult {
  valid: boolean;
  exists: boolean;
  count: number;
  visible?: boolean;
  enabled?: boolean;
  roleMatches?: boolean;
  semanticMatch?: boolean;
  reason: string;
}
