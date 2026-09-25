import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateStepsForFeature } from './StepGenerator';
import type { ParsedFeature } from './types';

function makeFeature(): ParsedFeature {
  return {
    title: 'Demo',
    sourcePath: '/tmp/demo-feature.feature',
    scenarios: [{ name: 'Scenario A', steps: ['a precondition "value"', 'an outcome'] }],
  };
}

test('generateStepsForFeature writes step registrations delegating to the Page Object', () => {
  const stepsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-steps-'));
  const result = generateStepsForFeature(makeFeature(), { stepsDir });

  assert.equal(result.status, 'CREATED');
  assert.equal(result.stepCount, 2);
  const content = fs.readFileSync(result.filePath, 'utf-8');
  assert.match(content, /import \{ DemoFeaturePage \}/);
  assert.match(content, /defineStep\('a precondition \{string\}'/);
  assert.match(content, /page\.aPrecondition\(arg1\)/);
  // step definitions must not contain raw locators
  assert.doesNotMatch(content, /page\.locator\(/);
  assert.doesNotMatch(content, /getBy(Role|Label|Text|TestId|Placeholder)/);
});

test('generateStepsForFeature is idempotent', () => {
  const stepsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-steps-'));
  const feature = makeFeature();
  const first = generateStepsForFeature(feature, { stepsDir });
  assert.equal(first.status, 'CREATED');
  const second = generateStepsForFeature(feature, { stepsDir });
  assert.equal(second.status, 'UNCHANGED');
});
