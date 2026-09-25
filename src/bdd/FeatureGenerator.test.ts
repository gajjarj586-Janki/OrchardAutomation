import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateFeatureForRequirement } from './FeatureGenerator';
import { AIClient } from '../ai/AIClient';
import { MockAIProvider } from '../ai/providers/MockAIProvider';
import { Logger } from '../logging/Logger';
import type { RequirementInput } from './types';

const silentLogger = new Logger();
// Silence unit-test log noise while still exercising the real Logger class.
silentLogger.info = () => {};
silentLogger.warn = () => {};

function makeRequirement(): RequirementInput {
  return {
    id: 'example-generic-action.md',
    sourcePath: '/tmp/example-generic-action.md',
    title: 'Example Requirement',
    description: 'The application should allow a user to perform an action.',
    acceptanceCriteria: ['Valid input should be accepted.', 'Invalid input should show an error.'],
  };
}

test('generateFeatureForRequirement writes a valid .feature file (CREATED)', async () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-features-'));
  const aiClient = new AIClient(new MockAIProvider(), 3, silentLogger);

  const result = await generateFeatureForRequirement(makeRequirement(), { aiClient, featuresDir });

  assert.equal(result.status, 'CREATED');
  assert.equal(result.scenarioCount, 2);
  assert.ok(fs.existsSync(result.featurePath));
  const content = fs.readFileSync(result.featurePath, 'utf-8');
  assert.match(content, /MOCK AI provider/);
  assert.match(content, /Feature: Example Requirement/);
});

test('generateFeatureForRequirement is idempotent (UNCHANGED on second run)', async () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-features-'));
  const aiClient = new AIClient(new MockAIProvider(), 3, silentLogger);
  const requirement = makeRequirement();

  const first = await generateFeatureForRequirement(requirement, { aiClient, featuresDir });
  assert.equal(first.status, 'CREATED');

  const second = await generateFeatureForRequirement(requirement, { aiClient, featuresDir });
  assert.equal(second.status, 'UNCHANGED');
});

test('generateFeatureForRequirement --dry-run does not write a file', async () => {
  const featuresDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-features-'));
  const aiClient = new AIClient(new MockAIProvider(), 3, silentLogger);

  const result = await generateFeatureForRequirement(makeRequirement(), {
    aiClient,
    featuresDir,
    dryRun: true,
  });

  assert.equal(result.status, 'DRY_RUN');
  assert.equal(fs.existsSync(result.featurePath), false);
});
