import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JsonTestDataProvider } from './JsonTestDataProvider';
import { FrameworkError } from '../core/FrameworkError';

function makeDataDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-testdata-'));
  fs.writeFileSync(
    path.join(dir, 'users.json'),
    JSON.stringify({ standardUser: { username: 'generic-user' } })
  );
  return dir;
}

test('JsonTestDataProvider reads a whole file by key', async () => {
  const provider = new JsonTestDataProvider(makeDataDir());
  const users = await provider.get<{ standardUser: { username: string } }>('users');
  assert.equal(users.standardUser.username, 'generic-user');
});

test('JsonTestDataProvider drills into a dot-path', async () => {
  const provider = new JsonTestDataProvider(makeDataDir());
  const user = await provider.get<{ username: string }>('users.standardUser');
  assert.equal(user.username, 'generic-user');
});

test('JsonTestDataProvider throws a FrameworkError for a missing file', async () => {
  const provider = new JsonTestDataProvider(makeDataDir());
  await assert.rejects(() => provider.get('missing'), FrameworkError);
});

test('JsonTestDataProvider throws a FrameworkError for a missing path segment', async () => {
  const provider = new JsonTestDataProvider(makeDataDir());
  await assert.rejects(() => provider.get('users.nonexistent'), FrameworkError);
});
