import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

// Target URL from the requirement ("Target URL: ..." metadata line) -
// use this in whichever step method navigates to the page.
const TARGET_URL = '/au/en/crm-ownership-update'; // relative - baseURL comes from config
const SUBMIT_ENDPOINT = '/content/api/au/hyundai/v3/form/ownershipV2';
const VIN = 'KMHJT81BLCU374044';

/**
 * Generated scaffold for feature "CRM Ownership Update" (Ownership.feature).
 * Regeneration never overwrites this file once it exists - fill in each
 * method with the real interaction for your application. Re-running
 * `generate:steps` will report new steps whose methods are missing
 * here, but will not touch existing methods.
 */
export class OwnershipPage extends BasePage {
  async theRequirementIsReadyToBeTested(_arg1: string): Promise<void> {
    await this.page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  }

  async theFollowingConditionIsEvaluated(_arg1: string): Promise<void> {
    await this.page.getByPlaceholder('Enter your VIN').fill(VIN);
    await this.page.getByRole('button', { name: 'Check', exact: true }).click();

    // "Do you still own this vehicle?" is a custom-styled radio - like the
    // consent checkboxes on the test-drive form, the real click target is
    // the <label>, not the (visually hidden) <input> itself.
    await this.page.locator('label[for="notOwn"]').click();

    await this.page.locator('#fleet-registration-page-title').selectOption('Mr');
    await this.page.locator('#ownership-page-first-name').fill('John');
    await this.page.locator('#ownership-page-last-name').fill('Jacob');
    await this.page.locator('#ownership-page-email-address').fill('test@outlook.com');
    await this.page.locator('#ownership-page-phone-number').fill('0411111111');
    await this.page.locator('#ownership-page-page-address').fill('1 Test Street');
    await this.page.locator('#ownership-page-suburb').fill('Sydney');
    await this.page.locator('#fleet-registration-page-state').selectOption('NSW');
    await this.page.locator('#fleet-registration-page-postcode').fill('2000');
    await this.page.locator('#ownership-page-vehicle-status').selectOption({ label: 'Sold' });

    // The "When did you sell/stop owning this vehicle?" control is a
    // @vuepic/vue-datepicker in month-picker mode (format MM/yyyy), only
    // rendered once VehicleStatus is set. "Previous year" once always lands
    // in a fully past calendar year regardless of today's date, so any
    // month within it is guaranteed to be a valid past OwnershipEndDate__c.
    await this.page.locator('[data-test-id="dp-input"]').click();
    await this.page.getByLabel('Previous year').click();
    await this.page.locator('[data-test-id="Jun"]').click();

    await this.page.locator('#ownership-page-vehicle-replace').fill('Nothing yet');

    // Submitting the main form only opens a "Please confirm you no longer
    // own this vehicle" modal (a second, separate Submit button); the real
    // network request only fires after confirming there.
    await this.page.locator('form.ownership-page button.submit').click();

    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) => res.url().includes(SUBMIT_ENDPOINT) && res.request().method() === 'POST',
        { timeout: 45000 }
      ),
      this.page.locator('.tingle-modal-box').getByRole('button', { name: 'Submit' }).click(),
    ]);

    if (!response.ok()) {
      throw new Error(`Ownership update failed: HTTP ${response.status()} from ${response.url()}`);
    }

    // Acceptance criterion: the submitted payload's OwnershipEndDate__c must
    // be a valid YYYY-MM-DD date, not just "the request returned 200".
    const payload = JSON.parse(response.request().postData() ?? '{}') as Record<string, unknown>;
    const ownershipEndDate = payload.OwnershipEndDate__c;
    if (typeof ownershipEndDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ownershipEndDate)) {
      throw new Error(
        `OwnershipEndDate__c was not a valid YYYY-MM-DD date: ${JSON.stringify(ownershipEndDate)}`
      );
    }

    // Appends a DevTools-Payload-style panel (sorted keys, light background,
    // type-coloured values) to the *end* of <body> so the framework's
    // automatic final-screenshot (src/fixtures/frameworkTest.ts) - what
    // shows up as the test's image in reports/playwright - visually proves
    // what was actually sent, not just the confirmation banner. Appended in
    // normal flow (not `position: fixed`) deliberately: a fixed element only
    // renders once at a single viewport offset, but Playwright's full-page
    // screenshot temporarily stretches the viewport to the page's full
    // height to capture it in one shot - so "fixed" ends up pinned to
    // whatever content natively sits at that offset instead of following the
    // reader, which is what caused it to visually collide with page content
    // above. Appending in-flow avoids that entirely and is guaranteed to
    // render below all real page content, never overlapping it.
    // Done here (not in theExpectedOutcomeIsSatisfied) because
    // StepGenerator.ts constructs a *new* OwnershipPage instance per step -
    // instance fields don't survive between steps, only the underlying
    // page/DOM does, since this form confirms via a client-side swap rather
    // than a reload.
    // Cast via globalThis: this project's tsconfig has no "dom" lib (Page
    // Objects use Playwright's Locator API, never raw DOM), so `document`
    // isn't an ambient type here even though it's real at runtime in the
    // browser page this callback executes in.
    await this.page.evaluate(
      ({ endpoint, entries }: { endpoint: string; entries: [string, unknown][] }) => {
        const doc = (globalThis as unknown as { document: any }).document;

        const valueColor = (v: unknown) =>
          v === null
            ? '#8e8e8e'
            : typeof v === 'boolean' || typeof v === 'number'
              ? '#1a01cc'
              : '#c41a16';
        const formatValue = (v: unknown) => (v === null ? 'null' : JSON.stringify(v));

        const panel = doc.createElement('div');
        panel.id = 'submitted-payload-panel';
        Object.assign(panel.style, {
          margin: '0',
          padding: '16px 20px',
          background: '#f8f9fa',
          color: '#202124',
          fontFamily:
            'Menlo, Consolas, "Roboto Mono", monospace',
          fontSize: '12px',
          lineHeight: '1.6',
          borderTop: '3px solid #1a73e8',
        });

        const heading = doc.createElement('div');
        heading.textContent = `Request Payload — captured by test — POST ${endpoint}`;
        Object.assign(heading.style, {
          fontWeight: '700',
          fontSize: '13px',
          marginBottom: '10px',
          color: '#1a73e8',
        });
        panel.appendChild(heading);

        const list = doc.createElement('div');
        for (const [key, value] of entries) {
          const row = doc.createElement('div');
          const keySpan = doc.createElement('span');
          keySpan.textContent = key + ': ';
          keySpan.style.color = '#881391';
          const valueSpan = doc.createElement('span');
          valueSpan.textContent = formatValue(value);
          valueSpan.style.color = valueColor(value);
          row.appendChild(keySpan);
          row.appendChild(valueSpan);
          list.appendChild(row);
        }
        panel.appendChild(list);

        doc.body.appendChild(panel);
      },
      {
        endpoint: SUBMIT_ENDPOINT,
        entries: Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)),
      }
    );
  }

  async theExpectedOutcomeIsSatisfied(): Promise<void> {
    await expect(
      this.page.getByText('Thank you. Your request has been received successfully.')
    ).toBeVisible({ timeout: 20000 });
  }
}
