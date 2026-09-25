// Generated from features/framework-selfcheck.feature - do not edit by hand.
// Re-run `npm run generate:tests` after the feature changes.
import { test } from '../../src/fixtures/frameworkTest';
import { runScenario } from '../../src/bdd/ScenarioRunner';
import { createHealer } from '../../src/healer/createHealer';
import { stepRegistry } from '../../steps/framework-selfcheck.steps';

test.describe("Framework Self-Check", () => {
  test("Clicking the Confirm button updates the status text to \"Status: confirmed\"", async ({ page }) => {
    await runScenario({ page }, [
    "the requirement \"Framework Self-Check\" is ready to be tested",
    "the following condition is evaluated: \"Clicking the Confirm button updates the status text to \\\"Status: confirmed\\\".\"",
    "the expected outcome is satisfied",
    ], {
      testName: "Clicking the Confirm button updates the status text to \"Status: confirmed\"",
      scenario: "Clicking the Confirm button updates the status text to \"Status: confirmed\"",
      feature: "Framework Self-Check",
      registry: stepRegistry,
      healer: createHealer(),
    });
  });
});
