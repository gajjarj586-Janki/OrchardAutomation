import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from './ConfigLoader';
import { FrameworkError } from '../core/FrameworkError';

const MINIMAL_DEFAULT_YAML = `
project:
  name: test-project
application:
  baseUrl: ""
execution:
  browser: chromium
  headless: true
  timeout: 30000
  navigationTimeout: 30000
  retries: 1
  workers: 1
  screenshot: only-on-failure
  trace: retain-on-failure
  video: retain-on-failure
ai:
  enabled: true
  provider: mock
  model: ""
  maxRetries: 3
mcp:
  enabled: true
  provider: ""
healing:
  enabled: true
  autoHeal: true
  autoPatch: false
  autoCommit: false
  autoMerge: false
  maxAttempts: 3
  targetedRetry: true
  regressionAfterHealing: true
  regressionScope: affected
`;

function makeTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-config-test-'));
  fs.mkdirSync(path.join(root, 'config'));
  fs.writeFileSync(path.join(root, 'config', 'default.yaml'), MINIMAL_DEFAULT_YAML);
  return root;
}

test('loadConfig parses a valid default.yaml', () => {
  const root = makeTempRoot();
  const config = loadConfig({ rootDir: root });
  assert.equal(config.project.name, 'test-project');
  assert.equal(config.healing.autoPatch, false);
  assert.equal(config.ai.maxRetries, 3);
});

test('loadConfig layers config/local.yaml on top of defaults', () => {
  const root = makeTempRoot();
  fs.writeFileSync(
    path.join(root, 'config', 'local.yaml'),
    'application:\n  baseUrl: "https://example.test"\nhealing:\n  autoPatch: true\n'
  );
  const config = loadConfig({ rootDir: root });
  assert.equal(config.application.baseUrl, 'https://example.test');
  assert.equal(config.healing.autoPatch, true);
  // untouched sibling keys under healing must survive the merge
  assert.equal(config.healing.autoCommit, false);
});

test('loadConfig applies environment variable overrides', () => {
  const root = makeTempRoot();
  const prevProvider = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = 'openai';
  try {
    const config = loadConfig({ rootDir: root });
    assert.equal(config.ai.provider, 'openai');
  } finally {
    if (prevProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = prevProvider;
  }
});

test('loadConfig layers config/environments/<env>.yaml when explicitly requested', () => {
  const root = makeTempRoot();
  fs.mkdirSync(path.join(root, 'config', 'environments'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'config', 'environments', 'stage.yaml'),
    'application:\n  baseUrl: "https://stage.example.test"\nexecution:\n  retries: 4\n'
  );
  const config = loadConfig({ rootDir: root, env: 'stage' });
  assert.equal(config.application.baseUrl, 'https://stage.example.test');
  assert.equal(config.execution.retries, 4);
});

test('loadConfig resolves the environment ambiently from APP_ENV when --env is not passed', () => {
  const root = makeTempRoot();
  fs.mkdirSync(path.join(root, 'config', 'environments'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'config', 'environments', 'dev.yaml'),
    'execution:\n  headless: false\n'
  );
  const prevAppEnv = process.env.APP_ENV;
  process.env.APP_ENV = 'dev';
  try {
    const config = loadConfig({ rootDir: root });
    assert.equal(config.execution.headless, false);
  } finally {
    if (prevAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = prevAppEnv;
  }
});

test('loadConfig lets config/local.yaml override an environment file', () => {
  const root = makeTempRoot();
  fs.mkdirSync(path.join(root, 'config', 'environments'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'config', 'environments', 'stage.yaml'),
    'execution:\n  retries: 4\n'
  );
  fs.writeFileSync(path.join(root, 'config', 'local.yaml'), 'execution:\n  retries: 9\n');
  const config = loadConfig({ rootDir: root, env: 'stage' });
  assert.equal(config.execution.retries, 9);
});

test('loadConfig throws a FrameworkError when an explicit --env has no matching file', () => {
  const root = makeTempRoot();
  assert.throws(() => loadConfig({ rootDir: root, env: 'nonexistent-env' }), FrameworkError);
});

test('loadConfig does not throw when an ambient NODE_ENV has no matching environment file', () => {
  const root = makeTempRoot();
  const prevNodeEnv = process.env.NODE_ENV;
  const prevAppEnv = process.env.APP_ENV;
  delete process.env.APP_ENV;
  process.env.NODE_ENV = 'test';
  try {
    assert.doesNotThrow(() => loadConfig({ rootDir: root }));
  } finally {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = prevAppEnv;
  }
});

test('loadConfig throws a FrameworkError when default.yaml is missing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-config-test-empty-'));
  assert.throws(() => loadConfig({ rootDir: root }), FrameworkError);
});

test('loadConfig throws a FrameworkError when required fields fail validation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-config-test-invalid-'));
  fs.mkdirSync(path.join(root, 'config'));
  fs.writeFileSync(path.join(root, 'config', 'default.yaml'), 'project:\n  name: ""\n');
  assert.throws(() => loadConfig({ rootDir: root }), FrameworkError);
});
