import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoverLocatorsForFeature, extractActionableSteps } from './LocatorDiscovery';
import { AIClient } from '../ai/AIClient';
import { MCPClient } from '../mcp/MCPClient';
import { Logger } from '../logging/Logger';
import type { AIProvider } from '../ai/AIProvider';
import type { MCPBrowserProvider } from '../mcp/MCPBrowserProvider';
import type { ParsedFeature } from '../bdd/types';

const silentLogger = new Logger();
silentLogger.info = () => {};
silentLogger.warn = () => {};

function notUsed(): never {
  throw new Error('not used in this test');
}

const fakeAIProvider: AIProvider = {
  name: 'fake',
  generate: notUsed,
  generateStructured: notUsed,
  generateFeature: notUsed,
  generateStepDefinitions: notUsed,
  analyzeFailure: notUsed,
  generateHealingSuggestion: notUsed,
  suggestLocator: async (context) => [
    {
      locator: { strategy: 'role', value: 'button', name: 'Confirm' },
      strategy: 'role',
      confidence: 0.8,
      reason: `derived from ${context.intendedAction}`,
    },
  ],
};

function makeFeature(steps: string[]): ParsedFeature {
  return {
    title: 'Demo',
    sourcePath: '/tmp/demo.feature',
    scenarios: [{ name: 'Scenario A', steps }],
  };
}

test('extractActionableSteps only picks steps that look like a UI interaction', () => {
  const feature = makeFeature(['Click Confirm', 'the expected outcome is satisfied']);
  const actionable = extractActionableSteps(feature);
  assert.equal(actionable.length, 1);
  assert.equal(actionable[0]?.step, 'Click Confirm');
});

test('discoverLocatorsForFeature returns unvalidated candidates and reports MCP SKIPPED when unconfigured', async () => {
  const aiClient = new AIClient(fakeAIProvider, 3, silentLogger);
  const mcpClient = new MCPClient(null);
  const feature = makeFeature(['Click Confirm']);

  const result = await discoverLocatorsForFeature(feature, aiClient, mcpClient);

  assert.equal(result.actionableStepCount, 1);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]?.validated, false);
  assert.equal(result.mcpStatus, 'SKIPPED');
});

test('discoverLocatorsForFeature connects MCP to the feature\'s targetUrl and disconnects when done', async () => {
  const calls: string[] = [];
  const fakeProvider: MCPBrowserProvider = {
    name: 'fake',
    connect: async (url) => {
      calls.push(`connect:${url}`);
    },
    disconnect: async () => {
      calls.push('disconnect');
    },
    inspectPage: notUsed,
    getPageStructure: notUsed,
    getAccessibilitySnapshot: notUsed,
    findElements: notUsed,
    getElementAttributes: notUsed,
    validateLocator: async () => ({ valid: true, exists: true, count: 1, reason: 'ok' }),
  };

  const aiClient = new AIClient(fakeAIProvider, 3, silentLogger);
  const mcpClient = new MCPClient(fakeProvider);
  const feature: ParsedFeature = {
    title: 'Demo',
    sourcePath: '/tmp/demo.feature',
    scenarios: [{ name: 'Scenario A', steps: ['Click Confirm'] }],
    targetUrl: 'https://example.com/page',
  };

  const result = await discoverLocatorsForFeature(feature, aiClient, mcpClient);

  assert.deepEqual(calls, ['connect:https://example.com/page', 'disconnect']);
  assert.equal(result.mcpStatus, 'OK');
  assert.equal(result.candidates[0]?.validated, true);
});

test('discoverLocatorsForFeature never calls connect/disconnect when the feature has no targetUrl', async () => {
  const calls: string[] = [];
  const fakeProvider: MCPBrowserProvider = {
    name: 'fake',
    connect: async () => {
      calls.push('connect');
    },
    disconnect: async () => {
      calls.push('disconnect');
    },
    inspectPage: notUsed,
    getPageStructure: notUsed,
    getAccessibilitySnapshot: notUsed,
    findElements: notUsed,
    getElementAttributes: notUsed,
    validateLocator: async () => ({ valid: true, exists: true, count: 1, reason: 'ok' }),
  };

  const aiClient = new AIClient(fakeAIProvider, 3, silentLogger);
  const mcpClient = new MCPClient(fakeProvider);
  const feature = makeFeature(['Click Confirm']); // no targetUrl

  await discoverLocatorsForFeature(feature, aiClient, mcpClient);

  assert.deepEqual(calls, []);
});

test('discoverLocatorsForFeature finds nothing to do for a non-actionable feature', async () => {
  const aiClient = new AIClient(fakeAIProvider, 3, silentLogger);
  const mcpClient = new MCPClient(null);
  const feature = makeFeature(['the expected outcome is satisfied']);

  const result = await discoverLocatorsForFeature(feature, aiClient, mcpClient);

  assert.equal(result.actionableStepCount, 0);
  assert.equal(result.candidates.length, 0);
});
