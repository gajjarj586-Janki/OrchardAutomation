import {
  runPlaywrightTests,
  type RunPlaywrightResult,
  type RunPlaywrightOptions,
} from './TestExecutor';
import { collectFailuresFromReport } from './FailureCollector';
import type { FrameworkConfig } from '../config/schema';

export interface RegressionOptions {
  rootDir: string;
  config: FrameworkConfig;
  reportPath: string;
  spawnFn?: RunPlaywrightOptions['spawnFn'];
  env?: RunPlaywrightOptions['env'];
}

export interface RegressionRunResult extends RunPlaywrightResult {
  scope: 'affected' | 'full';
  files: string[];
}

/**
 * Runs the regression suite after a healing attempt: "affected" (default)
 * re-runs only the spec files that had failures in the last report; "full"
 * runs the entire tests/ directory. Never runs more than affected scope
 * asks for - see healing.regressionScope in config/default.yaml.
 */
export async function runRegression(options: RegressionOptions): Promise<RegressionRunResult> {
  const scope = options.config.healing.regressionScope;

  if (scope === 'full') {
    const result = await runPlaywrightTests({
      cwd: options.rootDir,
      spawnFn: options.spawnFn,
      env: options.env,
    });
    return { ...result, scope, files: [] };
  }

  const failures = collectFailuresFromReport(options.reportPath);
  const files = [...new Set(failures.map((f) => f.feature).filter((f): f is string => Boolean(f)))];

  if (files.length === 0) {
    return { success: true, exitCode: 0, scope, files: [] };
  }

  // Playwright matches test-file args against forward-slash-normalized
  // paths, so join with "/" explicitly rather than path.join (which would
  // use "\" on Windows and silently match nothing).
  const args = files.map((file) => `tests/${file}`);
  const result = await runPlaywrightTests({
    cwd: options.rootDir,
    args,
    spawnFn: options.spawnFn,
    env: options.env,
  });
  return { ...result, scope, files };
}
