import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generatePageObjectForFeature } from './PageObjectGenerator';
import type { ParsedFeature } from './types';

function makeFeature(sourcePath: string): ParsedFeature {
  return {
    title: 'Demo',
    sourcePath,
    scenarios: [{ name: 'Scenario A', steps: ['a precondition "value"', 'an outcome'] }],
  };
}

test('generatePageObjectForFeature creates a stub Page Object once', () => {
  const pagesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-pages-'));
  const feature = makeFeature('/tmp/demo-feature.feature');

  const result = generatePageObjectForFeature(feature, { pagesDir });
  assert.equal(result.status, 'CREATED');
  assert.equal(result.className, 'DemoFeaturePage');
  const content = fs.readFileSync(result.filePath, 'utf-8');
  assert.match(content, /class DemoFeaturePage extends BasePage/);
  assert.match(content, /aPrecondition\(_arg1: string\)/);
  assert.match(content, /anOutcome\(\): Promise<void>/);
});

test('generatePageObjectForFeature emits a TARGET_URL constant when the feature carries one', () => {
  const pagesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-pages-'));
  const feature: ParsedFeature = {
    ...makeFeature('/tmp/demo-feature.feature'),
    targetUrl: 'https://example.test/page',
  };

  const result = generatePageObjectForFeature(feature, { pagesDir });
  const content = fs.readFileSync(result.filePath, 'utf-8');
  assert.match(content, /const TARGET_URL = "https:\/\/example\.test\/page";/);
  // the constant must actually be referenced, or generated code fails typecheck (noUnusedLocals)
  assert.match(content, /\$\{TARGET_URL\}/);
});

test('generatePageObjectForFeature never overwrites an existing file', () => {
  const pagesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-pages-'));
  const feature = makeFeature('/tmp/demo-feature.feature');

  generatePageObjectForFeature(feature, { pagesDir });
  const filePath = path.join(pagesDir, 'DemoFeaturePage.ts');
  fs.writeFileSync(filePath, '// hand-edited content\n');

  const second = generatePageObjectForFeature(feature, { pagesDir });
  assert.equal(second.status, 'EXISTS');
  assert.deepEqual(second.missingMethods.sort(), ['aPrecondition', 'anOutcome']);
  assert.equal(fs.readFileSync(filePath, 'utf-8'), '// hand-edited content\n');
});
