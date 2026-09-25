import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateTestFileForFeature } from './TestFileGenerator';
import type { ParsedFeature } from './types';

function makeFeature(): ParsedFeature {
  return {
    title: 'Demo',
    sourcePath: '/tmp/demo-feature.feature',
    scenarios: [{ name: 'Scenario A', steps: ['a precondition "value"', 'an outcome'] }],
  };
}

test('generateTestFileForFeature writes one test() per scenario', () => {
  const testsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-framework-tests-'));
  const result = generateTestFileForFeature(makeFeature(), { testsDir });

  assert.equal(result.status, 'CREATED');
  assert.equal(result.scenarioCount, 1);
  const content = fs.readFileSync(result.filePath, 'utf-8');
  assert.match(content, /test\.describe\("Demo"/);
  assert.match(content, /test\("Scenario A"/);
  assert.match(content, /runScenario/);
  assert.match(content, /steps\/demo-feature\.steps/);
});
