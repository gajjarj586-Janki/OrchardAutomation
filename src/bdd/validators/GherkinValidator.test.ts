import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateFeatureFile,
  validateGherkinSyntax,
  validateGherkinContent,
} from './GherkinValidator';

const VALID_FEATURE = `Feature: Example

  Scenario: Something happens
    Given a precondition
    When an action occurs
    Then an outcome is observed
`;

test('validateGherkinSyntax accepts a well-formed feature', () => {
  const result = validateGherkinSyntax(VALID_FEATURE, 'example.feature');
  assert.equal(result.valid, true);
  assert.equal(result.scenarioCount, 1);
});

test('validateGherkinSyntax rejects malformed Gherkin', () => {
  const result = validateGherkinSyntax('Scenario: no feature line\n  Given x\n', 'bad.feature');
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('validateGherkinSyntax rejects a feature with no scenarios', () => {
  const result = validateGherkinSyntax('Feature: Empty\n', 'empty.feature');
  assert.equal(result.valid, false);
  assert.match(result.errors[0] ?? '', /no Scenario/);
});

test('validateGherkinContent flags an embedded password', () => {
  const result = validateGherkinContent('# password: hunter2\nFeature: X\n', 'secret.feature');
  assert.equal(result.valid, false);
  assert.match(result.errors[0] ?? '', /password/);
});

test('validateFeatureFile combines syntax and content checks', () => {
  const result = validateFeatureFile(VALID_FEATURE, 'example.feature');
  assert.equal(result.valid, true);
});
