import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

// Target URL from the requirement ("Target URL: ..." metadata line) -
// use this in whichever step method navigates to the page.
const TARGET_URL = '/au/en/book-a-test-drive'; // relative - baseURL comes from config
const SUBMIT_ENDPOINT = '/content/api/au/hyundai/v3/form/booktestdrive';

/**
 * Generated scaffold for feature "Book a Test Drive" (BATD.feature).
 * Regeneration never overwrites this file once it exists - fill in each
 * method with the real interaction for your application. Re-running
 * `generate:steps` will report new steps whose methods are missing
 * here, but will not touch existing methods.
 */
export class BatdPage extends BasePage {
  async theRequirementIsReadyToBeTested(_arg1: string): Promise<void> {
    await this.page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  }

  async theFollowingConditionIsEvaluated(_arg1: string): Promise<void> {
    await this.page.locator('#test-drive-page-model-pcm2').selectOption({ label: 'KONA' });
    await this.page.locator('#test-drive-page-energy-type').selectOption({ label: 'Hybrid' });

    await this.page.getByRole('button', { name: 'Set location' }).click();
    await this.page.locator('#locaion-modal-input:visible').fill('2000');
    await this.page.getByText('Dawes Point, NSW 2000', { exact: true }).click();
    await this.page.getByRole('button', { name: 'Set dealer' }).click();

    await this.page.locator('#test-drive-page-first-name').fill('John');
    await this.page.locator('#test-drive-page-last-name').fill('Jacob');
    await this.page.locator('#test-drive-page-email-address').fill('test@outlook.com');
    await this.page.locator('#test-drive-page-phone-number').fill('0411111111');
    await this.page.locator('#test-drive-page-purchase-time').selectOption({ label: '0-3 Months' });

    await this.page.locator('label[for="test-drive-page-privacy"]').click();
    await this.page.locator('label[for="test-drive-page-marketing"]').click();

    // Wait for the real submission response, not a fixed delay - this is
    // what makes the very next step race-free without needing a retry.
    // 45s (not 30s): clicking Submit first fires a GET /email/validation
    // call, and only after that resolves does the real booking POST fire -
    // 30s was occasionally too tight for that extra round-trip.
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) => res.url().includes(SUBMIT_ENDPOINT) && res.request().method() === 'POST',
        { timeout: 45000 }
      ),
      this.page.getByRole('button', { name: 'Submit request' }).click(),
    ]);

    if (!response.ok()) {
      throw new Error(`Booking submission failed: HTTP ${response.status()} from ${response.url()}`);
    }
  }

  async theExpectedOutcomeIsSatisfied(): Promise<void> {
    await expect(this.page.getByText('All done!')).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByText(/submitted successfully/i)).toBeVisible();
  }
}
