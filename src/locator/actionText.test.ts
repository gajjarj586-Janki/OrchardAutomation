import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isActionableText, extractIntendedTargetName } from './actionText';

test('isActionableText recognizes common interaction verbs', () => {
  assert.equal(isActionableText('Click Submit'), true);
  assert.equal(isActionableText('the user clicks "Delete Account"'), true);
  assert.equal(isActionableText('the expected outcome is satisfied'), false);
});

test('extractIntendedTargetName strips the verb', () => {
  assert.equal(extractIntendedTargetName('Click Delete Account'), 'Delete Account');
  assert.equal(extractIntendedTargetName('the user clicks "Delete Account"'), 'Delete Account');
});

test('extractIntendedTargetName falls back to the whole text when no verb matches', () => {
  assert.equal(extractIntendedTargetName('Delete Account'), 'Delete Account');
});
