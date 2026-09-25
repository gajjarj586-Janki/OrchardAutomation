import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deepMerge } from './deepMerge';

test('deepMerge overrides scalar values', () => {
  const result = deepMerge({ a: 1, b: 2 }, { b: 3 });
  assert.deepEqual(result, { a: 1, b: 3 });
});

test('deepMerge recursively merges nested objects', () => {
  const result = deepMerge(
    { ai: { enabled: true, provider: 'mock' } },
    { ai: { provider: 'openai' } }
  );
  assert.deepEqual(result, { ai: { enabled: true, provider: 'openai' } });
});

test('deepMerge replaces arrays instead of concatenating', () => {
  const result = deepMerge({ list: [1, 2, 3] }, { list: [9] });
  assert.deepEqual(result, { list: [9] });
});

test('deepMerge ignores undefined override values', () => {
  const result = deepMerge({ a: 1 }, { a: undefined });
  assert.deepEqual(result, { a: 1 });
});
