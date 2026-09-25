import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaywrightError } from './PlaywrightErrorParser';

const REAL_TIMEOUT_ERROR = `TimeoutError: locator.click: Timeout 1000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Confirmed' })
`;

test('parsePlaywrightError extracts the action verb and role locator from a real Playwright error', () => {
  const result = parsePlaywrightError(REAL_TIMEOUT_ERROR);
  assert.equal(result.isLocatorRelated, true);
  assert.equal(result.actionVerb, 'click');
  assert.deepEqual(result.locator, { strategy: 'role', value: 'button', name: 'Confirmed' });
});

test('parsePlaywrightError recognizes getByLabel/getByText/getByTestId forms', () => {
  assert.equal(parsePlaywrightError("waiting for getByLabel('Email')").locator?.strategy, 'label');
  assert.equal(parsePlaywrightError("waiting for getByText('Continue')").locator?.strategy, 'text');
  assert.equal(
    parsePlaywrightError("waiting for getByTestId('submit')").locator?.strategy,
    'testId'
  );
});

test('parsePlaywrightError reports isLocatorRelated:false for unrelated errors', () => {
  const result = parsePlaywrightError(
    'Error: NOT_IMPLEMENTED: this step has no implementation yet.'
  );
  assert.equal(result.isLocatorRelated, false);
  assert.equal(result.locator, undefined);
});
