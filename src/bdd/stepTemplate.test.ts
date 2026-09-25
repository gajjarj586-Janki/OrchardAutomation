import { test } from 'node:test';
import assert from 'node:assert/strict';
import { templateStep, stepPatternToRegex } from './stepTemplate';

test('templateStep replaces quoted literals and derives a method name', () => {
  const result = templateStep('the requirement "Example Requirement" is ready to be tested');
  assert.equal(result.pattern, 'the requirement {string} is ready to be tested');
  assert.equal(result.methodName, 'theRequirementIsReadyToBeTested');
  assert.equal(result.paramCount, 1);
});

test('templateStep handles steps with no parameters', () => {
  const result = templateStep('the expected outcome is satisfied');
  assert.equal(result.paramCount, 0);
  assert.equal(result.methodName, 'theExpectedOutcomeIsSatisfied');
});

test('stepPatternToRegex round-trips a templated pattern against raw step text', () => {
  const { pattern } = templateStep('the following condition is evaluated: "Valid input."');
  const regex = stepPatternToRegex(pattern);
  const match = regex.exec('the following condition is evaluated: "Valid input."');
  assert.ok(match);
  assert.equal(match?.[1], 'Valid input.');
});
