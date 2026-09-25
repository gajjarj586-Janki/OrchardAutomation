import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MCPClient } from './MCPClient';
import type { MCPBrowserProvider } from './MCPBrowserProvider';

function makeProvider(overrides: Partial<MCPBrowserProvider> = {}): MCPBrowserProvider {
  return {
    name: 'fake',
    connect: async () => {},
    disconnect: async () => {},
    inspectPage: async () => ({
      url: 'about:blank',
      title: '',
      timestamp: new Date().toISOString(),
    }),
    getPageStructure: async () => ({ summary: '' }),
    getAccessibilitySnapshot: async () => ({ tree: {} }),
    findElements: async () => [],
    getElementAttributes: async () => ({ attributes: {} }),
    validateLocator: async () => ({ valid: true, exists: true, count: 1, reason: 'ok' }),
    ...overrides,
  };
}

test('MCPClient reports SKIPPED when no provider is configured', async () => {
  const client = new MCPClient(null);
  assert.equal(client.isConfigured, false);
  const result = await client.inspectPage();
  assert.equal(result.status, 'SKIPPED');
});

test('MCPClient reports OK and forwards data when a provider is configured', async () => {
  const client = new MCPClient(makeProvider());
  assert.equal(client.isConfigured, true);
  const result = await client.validateLocator({ strategy: 'role', value: 'button' });
  assert.equal(result.status, 'OK');
  assert.equal(result.status === 'OK' && result.data.valid, true);
});

test('MCPClient reports ERROR when the provider throws', async () => {
  const client = new MCPClient(
    makeProvider({
      inspectPage: async () => {
        throw new Error('connection reset');
      },
    })
  );
  const result = await client.inspectPage();
  assert.equal(result.status, 'ERROR');
  assert.equal(result.status === 'ERROR' && result.error, 'connection reset');
});
