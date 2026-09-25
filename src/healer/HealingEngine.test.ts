import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { attemptHeal } from './HealingEngine';
import { HealingHistory } from './HealingHistory';
import { AIClient } from '../ai/AIClient';
import { MCPClient } from '../mcp/MCPClient';
import { Logger } from '../logging/Logger';
import { ConfigSchema, type FrameworkConfig } from '../config/schema';
import type { AIProvider } from '../ai/AIProvider';
import type { MCPBrowserProvider } from '../mcp/MCPBrowserProvider';
import type { TestFailure } from '../execution/TestFailure';
import type { Page } from '@playwright/test';

const silentLogger = new Logger();
silentLogger.info = () => {};
silentLogger.warn = () => {};

function makeConfig(overrides: Partial<FrameworkConfig['healing']> = {}): FrameworkConfig {
  return ConfigSchema.parse({
    project: { name: 'test-project' },
    application: {},
    execution: {},
    ai: {},
    mcp: {},
    healing: { ...overrides },
  });
}

function notUsed(): never {
  throw new Error('not used in this test');
}

const CANDIDATE = {
  locator: { strategy: 'role' as const, value: 'button', name: 'Confirm' },
  strategy: 'role' as const,
  confidence: 0.6,
  reason: 'heuristic correction',
};

const fakeAIProvider: AIProvider = {
  name: 'fake',
  generate: notUsed,
  generateStructured: notUsed,
  generateFeature: notUsed,
  generateStepDefinitions: notUsed,
  suggestLocator: async () => [CANDIDATE],
  analyzeFailure: async (failure) => ({
    isLocatorFailure: failure.error.includes('locator.click'),
    previousLocator: { strategy: 'role', value: 'button', name: 'Confirmed' },
    actionVerb: 'click',
    summary: 'fake analysis',
  }),
  generateHealingSuggestion: async () => ({ candidates: [CANDIDATE], reasoning: 'fake' }),
};

function makeFailure(error: string): TestFailure {
  return { testName: 'demo test', error, timestamp: new Date().toISOString() };
}

function makeHistory(): HealingHistory {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-healing-'));
  return new HealingHistory(path.join(dir, 'history.json'));
}

test('attemptHeal reports NOT_APPLICABLE when healing is disabled', async () => {
  const config = makeConfig({ enabled: false });
  const result = await attemptHeal(
    { failure: makeFailure('locator.click: Timeout') },
    {
      aiClient: new AIClient(fakeAIProvider, 3, silentLogger),
      mcpClient: new MCPClient(null),
      config,
      history: makeHistory(),
    }
  );
  assert.equal(result.finalStatus, 'NOT_APPLICABLE');
});

test('attemptHeal reports NOT_APPLICABLE for a non-locator failure', async () => {
  const config = makeConfig();
  const result = await attemptHeal(
    { failure: makeFailure('NOT_IMPLEMENTED: no body yet') },
    {
      aiClient: new AIClient(fakeAIProvider, 3, silentLogger),
      mcpClient: new MCPClient(null),
      config,
      history: makeHistory(),
    }
  );
  assert.equal(result.finalStatus, 'NOT_APPLICABLE');
});

test('attemptHeal reports CANDIDATE_FOUND when MCP is not configured and there is no live page', async () => {
  const config = makeConfig();
  const result = await attemptHeal(
    { failure: makeFailure('locator.click: Timeout 1000ms exceeded.') },
    {
      aiClient: new AIClient(fakeAIProvider, 3, silentLogger),
      mcpClient: new MCPClient(null),
      config,
      history: makeHistory(),
    }
  );
  assert.equal(result.finalStatus, 'CANDIDATE_FOUND');
  assert.equal(result.candidateLocator?.name, 'Confirm');
  assert.equal(result.targetedRetry, 'NOT_RUN');
});

test('attemptHeal reports CANDIDATE_VALIDATED when MCP validates the candidate but no live page exists for retry', async () => {
  const config = makeConfig();
  const mcpProvider: MCPBrowserProvider = {
    name: 'fake-mcp',
    connect: async () => {},
    disconnect: async () => {},
    inspectPage: notUsed,
    getPageStructure: notUsed,
    getAccessibilitySnapshot: notUsed,
    findElements: notUsed,
    getElementAttributes: notUsed,
    validateLocator: async () => ({ valid: true, exists: true, count: 1, reason: 'ok' }),
  };
  const result = await attemptHeal(
    { failure: makeFailure('locator.click: Timeout 1000ms exceeded.') },
    {
      aiClient: new AIClient(fakeAIProvider, 3, silentLogger),
      mcpClient: new MCPClient(mcpProvider),
      config,
      history: makeHistory(),
    }
  );
  assert.equal(result.finalStatus, 'CANDIDATE_VALIDATED');
  assert.equal(result.targetedRetry, 'NOT_RUN');
});

test('attemptHeal records FAILED (not a silent crash) when the live page is already closed during validation', async () => {
  // Reproduces a real race: when the original failure is the test's own
  // timeout (not a shorter, isolated action timeout), Playwright can start
  // tearing down the page/context around the same moment an inline heal
  // attempt tries to validate a candidate against that same "live" page.
  const closedPage = {
    getByRole: () => ({
      count: async () => {
        throw new Error('Target page, context or browser has been closed');
      },
    }),
  } as unknown as Page;

  const config = makeConfig();
  const history = makeHistory();
  const result = await attemptHeal(
    { failure: makeFailure('locator.click: Timeout 1000ms exceeded.'), page: closedPage },
    {
      aiClient: new AIClient(fakeAIProvider, 3, silentLogger),
      mcpClient: new MCPClient(null),
      config,
      history,
    }
  );

  assert.equal(result.finalStatus, 'FAILED');
  assert.match(result.reason ?? '', /live page unavailable/);
  // The attempt must still be recorded - a thrown error here must never
  // silently vanish with zero history, which is worse than an honest FAILED.
  assert.equal(history.all().length, 1);
});

test('attemptHeal appends every attempt to healing history', async () => {
  const config = makeConfig();
  const history = makeHistory();
  await attemptHeal(
    { failure: makeFailure('locator.click: Timeout 1000ms exceeded.') },
    {
      aiClient: new AIClient(fakeAIProvider, 3, silentLogger),
      mcpClient: new MCPClient(null),
      config,
      history,
    }
  );
  assert.equal(history.all().length, 1);
});
