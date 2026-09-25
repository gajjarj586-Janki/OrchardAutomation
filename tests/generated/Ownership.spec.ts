// Generated from features/Ownership.feature - do not edit by hand.
// Re-run `npm run generate:tests` after the feature changes.
import { test } from '../../src/fixtures/frameworkTest';
import { runScenario } from '../../src/bdd/ScenarioRunner';
import { createHealer } from '../../src/healer/createHealer';
import { stepRegistry } from '../../steps/Ownership.steps';

test.describe("CRM Ownership Update", () => {
  test("Form is submitted successfully. The payload contains OwnershipEndDate__c in a valid date format (e.g., YYYY-MM-DD).", async ({ page }) => {
    await runScenario({ page }, [
    "the requirement \"CRM Ownership Update\" is ready to be tested",
    "the following condition is evaluated: \"Add VIN KMHJT81BLCU374044, click Check, select No to Do you still own this vehicle?, fill in all required fields, select a valid Month and Year for when the vehicle was sold, and submit the form.\"",
    "the expected outcome is satisfied",
    ], {
      testName: "Form is submitted successfully. The payload contains OwnershipEndDate__c in a valid date format (e.g., YYYY-MM-DD).",
      scenario: "Form is submitted successfully. The payload contains OwnershipEndDate__c in a valid date format (e.g., YYYY-MM-DD).",
      feature: "CRM Ownership Update",
      registry: stepRegistry,
      healer: createHealer(),
    });
  });
});
