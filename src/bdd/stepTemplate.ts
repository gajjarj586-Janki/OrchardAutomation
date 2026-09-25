export interface StepTemplate {
  /** Human-readable pattern with quoted literals replaced by {string}. */
  pattern: string;
  /** camelCase Page Object method name derived from the pattern. */
  methodName: string;
  paramCount: number;
}

/**
 * Converts a raw Gherkin step's text into a reusable template: quoted
 * substrings become `{string}` placeholders (parameters), and the
 * remaining words become a camelCase method name. Deterministic and
 * dependency-free, so the same step text always maps to the same Page
 * Object method - this is what keeps generation idempotent.
 */
export function templateStep(stepText: string): StepTemplate {
  const pattern = stepText.replace(/"[^"]*"/g, '{string}');
  const paramCount = (pattern.match(/\{string\}/g) ?? []).length;

  const words = pattern
    .replace(/\{string\}/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const methodName =
    words
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('') || 'step';

  return { pattern, methodName, paramCount };
}

/** Turns a `{string}`-templated pattern back into a matcher for raw step text. */
export function stepPatternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withParams = escaped.replace(/\\\{string\\\}/g, '"([^"]*)"');
  return new RegExp(`^${withParams}$`);
}
