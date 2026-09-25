import { test } from 'node:test';
import assert from 'node:assert/strict';
import { semanticNameMatches } from './LocatorValidator';

test('semanticNameMatches accepts a matching candidate name', () => {
  assert.equal(semanticNameMatches('Click Delete Account', 'Delete Account'), true);
});

test('semanticNameMatches rejects a plausible but wrong candidate (existence != correctness)', () => {
  // The exact example from the framework requirements: a valid button that
  // is not the one the scenario meant must be rejected.
  assert.equal(semanticNameMatches('Click Delete Account', 'Save Account'), false);
});

test('semanticNameMatches rejects when no candidate name is available', () => {
  assert.equal(semanticNameMatches('Click Delete Account', undefined), false);
});

test('semanticNameMatches is case-insensitive', () => {
  assert.equal(semanticNameMatches('Click Delete Account', 'delete account'), true);
});
