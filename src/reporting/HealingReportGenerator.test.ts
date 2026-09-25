import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHealingReport, formatHealingRecordText } from './HealingReportGenerator';
import type { HealingAttemptRecord } from '../healer/HealingHistory';

function makeRecord(overrides: Partial<HealingAttemptRecord> = {}): HealingAttemptRecord {
  return {
    id: '1',
    timestamp: new Date().toISOString(),
    project: 'test-project',
    environment: 'local',
    test: 'demo test',
    evidence: [],
    targetedRetry: 'PASSED',
    regression: 'NOT_RUN',
    aiProvider: 'mock',
    approvalStatus: 'REQUIRED',
    patchStatus: 'NOT_APPLIED',
    finalStatus: 'HEALED',
    candidateLocator: { strategy: 'role', value: 'button', name: 'Confirm' },
    validationResult: { valid: true, exists: true, count: 1, reason: 'ok' },
    ...overrides,
  };
}

test('formatHealingRecordText never hides the original failure and matches the required shape', () => {
  const text = formatHealingRecordText(makeRecord());
  assert.match(text, /^Original Test: FAILED \(demo test\)/);
  assert.match(text, /Healing Candidate: FOUND/);
  assert.match(text, /Candidate Validation: PASSED/);
  assert.match(text, /Targeted Retry: PASSED/);
  assert.match(text, /Final Status: HEALED/);
  assert.match(text, /Source Patch: NOT APPLIED/);
  assert.match(text, /Approval: REQUIRED/);
});

test('buildHealingReport reports "no attempts" text when there are none', () => {
  const report = buildHealingReport([]);
  assert.equal(report.text, 'No healing attempts this run.');
});
