import path from 'node:path';
import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

const FIXTURE_PATH = path.resolve(__dirname, '../../../tests/fixtures/self-check.html');
const FIXTURE_URL = `file://${FIXTURE_PATH.replace(/\\/g, '/')}`;

/**
 * Generated scaffold for feature "Framework Self-Check" (framework-selfcheck.feature).
 * Regeneration never overwrites this file once it exists - fill in each
 * method with the real interaction for your application. Re-running
 * `generate:steps` will report new steps whose methods are missing
 * here, but will not touch existing methods.
 */
export class FrameworkSelfcheckPage extends BasePage {
  async theRequirementIsReadyToBeTested(_arg1: string): Promise<void> {
    await this.page.goto(FIXTURE_URL);
  }

  async theFollowingConditionIsEvaluatedStatusConfirmed(_arg1: string, _arg2: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Confirm' }).click();
  }

  async theExpectedOutcomeIsSatisfied(): Promise<void> {
    await expect(this.page.locator('#status')).toHaveText('Status: confirmed');
  }
}
