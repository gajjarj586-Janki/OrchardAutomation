import fs from 'node:fs';
import { collectAllOutcomes } from '../execution/FailureCollector';

export interface ExecutionSummary {
  requirementsProcessed: number;
  featuresGenerated: number;
  scenarios: number;
  testsExecuted: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface BuildExecutionSummaryParams {
  requirementsProcessed: number;
  featuresGenerated: number;
  reportPath: string;
}

/**
 * Tallies pass/fail/skip counts from Playwright's JSON report for the
 * "Execution report" section (see docs/reporting.md). Returns all zeros
 * for the test-related fields when no report exists yet (e.g. dry run)
 * rather than throwing - this summary must never block report generation.
 */
export function buildExecutionSummary(params: BuildExecutionSummaryParams): ExecutionSummary {
  if (!fs.existsSync(params.reportPath)) {
    return {
      requirementsProcessed: params.requirementsProcessed,
      featuresGenerated: params.featuresGenerated,
      scenarios: 0,
      testsExecuted: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const outcomes = collectAllOutcomes(params.reportPath);
  const passed = outcomes.filter((o) => o.status === 'passed' || o.status === 'flaky').length;
  const failed = outcomes.filter((o) => o.status === 'failed').length;
  const skipped = outcomes.filter((o) => o.status === 'skipped').length;

  return {
    requirementsProcessed: params.requirementsProcessed,
    featuresGenerated: params.featuresGenerated,
    scenarios: outcomes.length,
    testsExecuted: outcomes.length,
    passed,
    failed,
    skipped,
  };
}
