// Generated from features/BATD.feature - do not edit by hand.
// Re-run `npm run generate:tests` after the feature changes.
import { test } from '../../src/fixtures/frameworkTest';
import { runScenario } from '../../src/bdd/ScenarioRunner';
import { createHealer } from '../../src/healer/createHealer';
import { stepRegistry } from '../../steps/BATD.steps';

test.describe("Book a Test Drive", () => {
  test("Booking a KONA Hybrid test drive at postcode 2000 with valid contact details and a selected purchase timeframe submits successfully and shows a confirmation message", async ({ page }) => {
    await runScenario({ page }, [
    "the requirement \"Book a Test Drive\" is ready to be tested",
    "the following condition is evaluated: \"Booking a KONA Hybrid test drive at postcode 2000 with valid contact details and a selected purchase timeframe submits successfully and shows a confirmation message.\"",
    "the expected outcome is satisfied",
    ], {
      testName: "Booking a KONA Hybrid test drive at postcode 2000 with valid contact details and a selected purchase timeframe submits successfully and shows a confirmation message",
      scenario: "Booking a KONA Hybrid test drive at postcode 2000 with valid contact details and a selected purchase timeframe submits successfully and shows a confirmation message",
      feature: "Book a Test Drive",
      registry: stepRegistry,
      healer: createHealer(),
    });
  });
});
