import { StepRegistry, type StepWorld } from './StepRegistry';
import type { Healer } from '../healer/Healer';
import type { TestFailure } from '../execution/TestFailure';

export interface ScenarioIdentity {
  testName: string;
  scenario?: string;
  feature?: string;
}

export interface RunScenarioOptions extends ScenarioIdentity {
  /**
   * The step registry belonging to this scenario's feature (created via
   * `createStepRegistry()` in the matching `steps/*.steps.ts` file). Kept
   * explicit, per-feature, rather than a shared global singleton - see
   * StepRegistry.ts for why.
   */
  registry: StepRegistry;
  /**
   * When provided, a step failure triggers an inline healing attempt
   * against the SAME live page before the original error is rethrown -
   * the original failure is never hidden, only enriched with a healing
   * record (see docs/healing.md).
   */
  healer?: Healer;
}

/**
 * Executes one scenario's raw step texts in order against the given
 * feature's step registry. Step definitions must already be imported (see
 * generated tests/generated/*.spec.ts) before this runs.
 */
export async function runScenario(
  world: StepWorld,
  steps: readonly string[],
  options: RunScenarioOptions
): Promise<void> {
  for (const stepText of steps) {
    const { handler, args } = options.registry.find(stepText);
    try {
      await handler(world, ...args);
    } catch (error) {
      if (options.healer) {
        const failure: TestFailure = {
          testName: options.testName,
          scenario: options.scenario,
          feature: options.feature,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        };
        await options.healer.heal(failure, world.page).catch(() => undefined);
      }
      throw error;
    }
  }
}
