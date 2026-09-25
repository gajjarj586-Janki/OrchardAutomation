import fs from 'node:fs';
import path from 'node:path';
import type { HealingAttemptRecord } from '../healer/HealingHistory';

/**
 * Renders one healing attempt in the exact shape the framework
 * requirements specify: the original failure is always shown first and is
 * never replaced by the healed outcome, only supplemented by it.
 */
export function formatHealingRecordText(record: HealingAttemptRecord): string {
  return [
    `Original Test: FAILED (${record.test})`,
    `Healing Candidate: ${record.candidateLocator ? 'FOUND' : 'NOT FOUND'}`,
    `Candidate Validation: ${
      record.validationResult ? (record.validationResult.valid ? 'PASSED' : 'FAILED') : 'SKIPPED'
    }`,
    `Targeted Retry: ${record.targetedRetry}`,
    `Regression: ${record.regression}`,
    `Final Status: ${record.finalStatus}`,
    `Source Patch: ${record.patchStatus === 'APPLIED' ? 'APPLIED' : 'NOT APPLIED'}`,
    `Approval: ${record.approvalStatus}`,
  ].join('\n');
}

export interface HealingReport {
  records: HealingAttemptRecord[];
  text: string;
}

export function buildHealingReport(records: HealingAttemptRecord[]): HealingReport {
  return {
    records,
    text:
      records.length > 0
        ? records.map(formatHealingRecordText).join('\n\n')
        : 'No healing attempts this run.',
  };
}

export function writeHealingReport(
  report: HealingReport,
  jsonPath: string,
  textPath: string
): void {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report.records, null, 2), 'utf-8');
  fs.mkdirSync(path.dirname(textPath), { recursive: true });
  fs.writeFileSync(textPath, `${report.text}\n`, 'utf-8');
}
