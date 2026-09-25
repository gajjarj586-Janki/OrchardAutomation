import type { Locator, Page } from '@playwright/test';
import type { LocatorDefinition, LocatorValidationResult } from './LocatorDefinition';
import { extractIntendedTargetName } from './actionText';
import { FrameworkError } from '../core/FrameworkError';

/**
 * Turns a declarative LocatorDefinition into a real Playwright Locator,
 * honoring the framework's strategy priority (role > label > placeholder >
 * text > testId > css > xpath). This is the only place that knows how each
 * strategy maps to a Playwright API call.
 */
export function resolveLocator(page: Page, def: LocatorDefinition): Locator {
  const options = def.options as { exact?: boolean } | undefined;

  switch (def.strategy) {
    case 'role':
      return page.getByRole(def.value as Parameters<Page['getByRole']>[0], {
        ...(def.name ? { name: def.name } : {}),
        ...options,
      });
    case 'label':
      return page.getByLabel(def.value, options);
    case 'placeholder':
      return page.getByPlaceholder(def.value, options);
    case 'text':
      return page.getByText(def.value, options);
    case 'testId':
      return page.getByTestId(def.value);
    case 'css':
      return page.locator(def.value);
    case 'xpath':
      return page.locator(`xpath=${def.value}`);
    default:
      throw new FrameworkError({
        stage: 'LOCATOR_VALIDATION',
        message: `Unknown locator strategy: ${(def as LocatorDefinition).strategy}`,
      });
  }
}

/** "Click Delete Account" vs candidate name "Save Account" -> false. Existence is not correctness. */
export function semanticNameMatches(intendedAction: string, candidateName?: string): boolean {
  if (!candidateName) {
    return false;
  }
  const target = extractIntendedTargetName(intendedAction);
  return target.trim().toLowerCase() === candidateName.trim().toLowerCase();
}

export interface ValidateLocatorContext {
  intendedAction?: string;
}

/**
 * Validates a candidate locator against a LIVE Playwright page: does it
 * exist, is it unique, is it visible/enabled, and (when an intended action
 * is known) does its accessible name actually match what the scenario
 * meant. Existence alone is never enough - see docs/locator-discovery.md.
 */
export async function validateLocatorOnPage(
  page: Page,
  def: LocatorDefinition,
  context: ValidateLocatorContext = {}
): Promise<LocatorValidationResult> {
  let locator: Locator;
  try {
    locator = resolveLocator(page, def);
  } catch (error) {
    return {
      valid: false,
      exists: false,
      count: 0,
      reason: `Locator could not be resolved: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const count = await locator.count();
  if (count === 0) {
    return { valid: false, exists: false, count: 0, reason: 'Locator matched 0 elements.' };
  }
  if (count > 1) {
    return {
      valid: false,
      exists: true,
      count,
      reason: `Locator matched ${count} elements - not unique.`,
    };
  }

  const visible = await locator.isVisible().catch(() => false);
  const enabled = await locator.isEnabled().catch(() => false);
  const semanticMatch = context.intendedAction
    ? semanticNameMatches(context.intendedAction, def.name)
    : undefined;

  const valid = visible && semanticMatch !== false;

  return {
    valid,
    exists: true,
    count,
    visible,
    enabled,
    roleMatches: def.strategy === 'role',
    semanticMatch,
    reason: valid
      ? 'Locator resolved to exactly one visible element matching the intended action.'
      : !visible
        ? 'Locator resolved but the element is not visible.'
        : 'Locator resolved but its accessible name does not match the intended action.',
  };
}
