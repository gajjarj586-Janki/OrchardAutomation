import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeatureContent } from './FeatureParser';

const FEATURE = `Feature: Example

  Scenario: First
    Given a precondition
    When an action occurs
    Then an outcome is observed

  Scenario: Second
    Given another precondition
    Then a different outcome
`;

test('parseFeatureContent extracts title, scenarios, and step text without keywords', () => {
  const result = parseFeatureContent(FEATURE, 'example.feature');
  assert.equal(result.title, 'Example');
  assert.equal(result.scenarios.length, 2);
  assert.deepEqual(result.scenarios[0]?.steps, [
    'a precondition',
    'an action occurs',
    'an outcome is observed',
  ]);
  assert.equal(result.scenarios[1]?.name, 'Second');
});

test('parseFeatureContent extracts a Target-URL comment when present', () => {
  const withUrl = `# Target-URL: https://example.test/page\n${FEATURE}`;
  const result = parseFeatureContent(withUrl, 'example.feature');
  assert.equal(result.targetUrl, 'https://example.test/page');
});

test('parseFeatureContent leaves targetUrl undefined without a Target-URL comment', () => {
  const result = parseFeatureContent(FEATURE, 'example.feature');
  assert.equal(result.targetUrl, undefined);
});
