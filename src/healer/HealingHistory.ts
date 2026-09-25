import fs from 'node:fs';
import path from 'node:path';
import type {
  LocatorDefinition,
  LocatorStrategy,
  LocatorValidationResult,
} from '../locator/LocatorDefinition';
import type { Evidence } from '../ai/types';

export type HealingFinalStatus =
  'HEALED' | 'CANDIDATE_VALIDATED' | 'CANDIDATE_FOUND' | 'NOT_APPLICABLE' | 'FAILED';

export type RetryOutcome = 'PASSED' | 'FAILED' | 'NOT_RUN';
export type RegressionOutcome = 'PASSED' | 'FAILED' | 'NOT_RUN' | 'SKIPPED';
export type ApprovalStatus = 'REQUIRED' | 'APPROVED' | 'REJECTED' | 'NOT_APPLICABLE';
export type PatchStatus = 'NOT_APPLIED' | 'APPLIED';

/**
 * One row of healing history, matching the fields the framework
 * requirements call out under "Healing history". Initially JSON storage
 * (healing/history/history.json); the shape is deliberately flat/plain so
 * a future move to Postgres (or another store) only changes HealingHistory
 * itself, never callers.
 */
export interface HealingAttemptRecord {
  id: string;
  timestamp: string;
  project: string;
  application?: string;
  environment: string;
  test: string;
  scenario?: string;
  feature?: string;
  page?: string;
  originalLocator?: LocatorDefinition;
  candidateLocator?: LocatorDefinition;
  strategy?: LocatorStrategy;
  confidence?: number;
  reason?: string;
  evidence: Evidence[];
  validationResult?: LocatorValidationResult;
  targetedRetry: RetryOutcome;
  regression: RegressionOutcome;
  aiProvider: string;
  aiModel?: string;
  approvalStatus: ApprovalStatus;
  patchStatus: PatchStatus;
  finalStatus: HealingFinalStatus;
}

/**
 * Append-only JSON store for healing attempts. Read-modify-write over a
 * single array is fine at this scale (framework verification, single
 * process) - see docs/healing.md for the documented path to a real
 * database once volume/concurrency requires it.
 */
export class HealingHistory {
  constructor(private readonly filePath: string) {}

  all(): HealingAttemptRecord[] {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(this.filePath, 'utf-8')) as HealingAttemptRecord[];
  }

  append(record: HealingAttemptRecord): void {
    const records = this.all();
    records.push(record);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(records, null, 2), 'utf-8');
  }
}
