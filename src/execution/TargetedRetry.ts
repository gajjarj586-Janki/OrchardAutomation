import {
  runPlaywrightTests,
  type RunPlaywrightResult,
  type RunPlaywrightOptions,
} from './TestExecutor';
import { collectFailuresFromReport } from './FailureCollector';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface TargetedRetryOptions {
  rootDir: string;
  reportPath: string;
  /** Retry exactly these test names instead of every failure in the report - e.g. only healed candidates. */
  testNames?: string[];
  spawnFn?: RunPlaywrightOptions['spawnFn'];
}

export interface TargetedRetryResult extends RunPlaywrightResult {
  testNames: string[];
}

/**
 * Re-runs, via a real Playwright subprocess, only the tests that failed in
 * the last report - matched by exact test title with --grep, never the
 * whole suite. Against unpatched source this will fail the same way again;
 * that is expected and correct (see docs/healing.md on autoPatch).
 */
export async function retryFailedTests(
  options: TargetedRetryOptions
): Promise<TargetedRetryResult> {
  const testNames = options.testNames ?? [
    ...new Set(collectFailuresFromReport(options.reportPath).map((f) => f.testName)),
  ];

  if (testNames.length === 0) {
    return { success: true, exitCode: 0, testNames: [] };
  }

  const grepPattern = testNames.map(escapeRegex).join('|');
  const result = await runPlaywrightTests({
    cwd: options.rootDir,
    args: ['--grep', grepPattern],
    spawnFn: options.spawnFn,
  });
  return { ...result, testNames };
}
