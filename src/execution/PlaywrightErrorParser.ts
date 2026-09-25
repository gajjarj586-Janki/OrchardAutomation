import type { LocatorDefinition, LocatorStrategy } from '../locator/LocatorDefinition';

export const LOCATOR_FAILURE_KEYWORDS = [
  'locator',
  'selector',
  'not found',
  'no element',
  'strict mode violation',
  'waiting for',
  'timeout',
];

export interface ParsedPlaywrightError {
  isLocatorRelated: boolean;
  /** The Playwright action that failed, e.g. "click", "fill", "check". */
  actionVerb?: string;
  /** The locator Playwright was waiting for/resolving, reconstructed from the error text. */
  locator?: LocatorDefinition;
}

const ACTION_VERB_PATTERN = /locator\.(\w+):/;

const LOCATOR_PATTERNS: Array<{ strategy: LocatorStrategy; regex: RegExp }> = [
  { strategy: 'role', regex: /getByRole\('([^']+)'(?:,\s*\{\s*name:\s*'([^']*)'[^}]*\})?\)/ },
  { strategy: 'label', regex: /getByLabel\('([^']*)'\)/ },
  { strategy: 'placeholder', regex: /getByPlaceholder\('([^']*)'\)/ },
  { strategy: 'text', regex: /getByText\('([^']*)'\)/ },
  { strategy: 'testId', regex: /getByTestId\('([^']*)'\)/ },
  { strategy: 'css', regex: /(?<!getBy\w*\()locator\('([^']*)'\)/ },
];

function parseLocatorFromMessage(message: string): LocatorDefinition | undefined {
  for (const { strategy, regex } of LOCATOR_PATTERNS) {
    const match = message.match(regex);
    if (!match) continue;

    if (strategy === 'role') {
      return { strategy, value: match[1] ?? '', name: match[2] };
    }
    return { strategy, value: match[1] ?? '' };
  }
  return undefined;
}

/**
 * Extracts what Playwright itself already told us about a failure: which
 * action it was performing (from "locator.click:" style prefixes) and
 * which locator it was resolving (from its "waiting for getByRole(...)"
 * call-log line). This is mechanical text parsing of Playwright's own
 * error format, not AI - it's the ground truth for what actually failed.
 */
export function parsePlaywrightError(message: string): ParsedPlaywrightError {
  const lower = message.toLowerCase();
  const isLocatorRelated = LOCATOR_FAILURE_KEYWORDS.some((keyword) => lower.includes(keyword));

  const actionVerb = message.match(ACTION_VERB_PATTERN)?.[1];
  const locator = parseLocatorFromMessage(message);

  return { isLocatorRelated, actionVerb, locator };
}
