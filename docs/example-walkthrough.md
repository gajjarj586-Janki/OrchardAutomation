# Worked example: adding a new test end to end

This walks through the entire loop - write a requirement, generate
everything, implement the one manual step, run it - using a real,
already-proven example: `requirements/book-a-test-drive.md`, which books a
test drive on Hyundai Australia's staging site. Follow the same steps for
any project.

> **A note on shell syntax:** every `VAR=value command` below is bash
> syntax (macOS/Linux, or Git Bash on Windows). On Windows PowerShell,
> setting an env var for one command is `$env:VAR='value'; command`
> instead - the npm scripts themselves are identical either way, only the
> env-var prefix differs. Each command below shows both.

## 0. Prerequisites (one-time)

```bash
npm install
npx playwright install chromium   # or set PW_CHANNEL=msedge/chrome if this fails - see troubleshooting.md
cp .env.example .env
```

PowerShell: same commands - `npx playwright install chromium` and
`cp .env.example .env` both work as-is (PowerShell aliases `cp`).

## 1. Point the framework at your environment

Config is layered; for anything you want committed and shared with your
team, use `config/environments/<name>.yaml` rather than your local `.env`
(see [configuration.md](./configuration.md)). This repo already has one set
up for this example:

```yaml
# config/environments/stage.yaml
application:
  baseUrl: 'https://stage.hyundai.com.au'

execution:
  headless: true
  retries: 0 # see note below
  timeout: 60000
```

**Why `retries: 0`:** Playwright's own retry re-runs a test from scratch on
failure. That's fine for a read-only test, but for any flow with a real
side effect - a form submission, a booking, a payment - a retry means
doing that side effect a second time. Set `retries: 0` for any environment/
project where tests submit real data, and instead make the test itself
robust (see step 4).

For your own project, copy this pattern: `config/environments/dev.yaml` /
`stage.yaml` / `prod.yaml`, each pointing `application.baseUrl` at that
environment's host. Select one with the `APP_ENV` env var (bash:
`APP_ENV=stage npm run ai:test`; PowerShell:
`$env:APP_ENV='stage'; npm run ai:test`), or pass `--env stage` directly to
the command instead if you don't want to deal with env-var syntax at all:
`npm run ai:test -- --env stage`.

## 2. Write the requirement

`requirements/book-a-test-drive.md`:

```md
# Book a Test Drive

Target URL: "https://stage.hyundai.com.au/au/en/book-a-test-drive"

## Description

A customer should be able to book a test drive for a specific model and
powertrain by providing their location and contact details.

## Acceptance Criteria

- Booking a KONA Hybrid test drive at postcode 2000 with valid contact
  details and a selected purchase timeframe submits successfully and shows
  a confirmation message.
```

Two things worth calling out:

- **`Target URL: "..."`** is optional metadata (see [requirements.md](./requirements.md)) that flows through generation into the scaffolded Page Object as a ready-to-use `TARGET_URL` constant - so the URL lives in the requirement, not buried in code you'd otherwise have to remember to write by hand.
- Acceptance criteria don't need to be granular - the framework's mock AI provider turns each one into a single Gherkin scenario. It cannot infer individual UI steps (selecting a model, filling a field) from prose; that's what step 4 is for.

## 3. Generate everything

These four commands are shown separately here just to explain what each
stage produces. In normal use you don't run them one by one - `npm run
ai:test` (see step 5) does all of this automatically, every time, as its
own first few stages. Run them individually only when you want to inspect
or debug one stage in isolation.

```bash
npm run requirements          # sanity check: confirms the framework sees it, prints title/target URL
npm run generate:features     # requirement -> features/book-a-test-drive.feature
npm run generate:steps        # feature -> steps/book-a-test-drive.steps.ts
                               #         -> src/pages/generated/BookATestDrivePage.ts (scaffold)
npm run generate:tests        # feature -> tests/generated/book-a-test-drive.spec.ts
```

At this point everything compiles, but running it will fail on purpose:

```bash
npm test
# NOT_IMPLEMENTED: "..." has no real implementation yet.
# Implement this method for your application. Target URL: https://stage.hyundai.com.au/au/en/book-a-test-drive
```

That's expected - the framework scaffolds structure, not business logic, and says so honestly instead of pretending to pass.

**`npm test` vs. `npm run ai:test` - which command to reach for:**

| Command | What it does |
| --- | --- |
| `npm test` | Playwright execution only. Assumes generation already happened. Good for a fast re-run once everything's already in place. |
| `npm run ai:test` | The full pipeline, one command: generate → validate → execute → analyze failures → attempt healing → targeted retry → regression → reports. This is the one to reach for normally - see step 5. |

## 4. Implement the Page Object (the one manual step)

Open `src/pages/generated/BookATestDrivePage.ts`. It has one stub method per
step pattern, each throwing `NOT_IMPLEMENTED`. Fill them in with real
Playwright code. This is what it looked like for the Hyundai example:

```ts
import { expect } from '@playwright/test';
import { BasePage } from '../BasePage';

const TEST_DRIVE_PATH = '/au/en/book-a-test-drive'; // relative - baseURL comes from config
const SUBMIT_ENDPOINT = '/content/api/au/hyundai/v3/form/booktestdrive';

export class BookATestDrivePage extends BasePage {
  async theRequirementIsReadyToBeTested(_arg1: string): Promise<void> {
    await this.page.goto(TEST_DRIVE_PATH, { waitUntil: 'domcontentloaded' });
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
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (res) => res.url().includes(SUBMIT_ENDPOINT) && res.request().method() === 'POST',
        { timeout: 30000 }
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
```

How to find the real locators/text for your own page: open it in a browser,
use your browser's DevTools inspector (or Playwright's own codegen -
`npx playwright codegen <url>` - to click through the flow and copy the
locators it records), and prefer `getByRole`/`getByLabel`/`getByText` over
CSS selectors (see [locator-discovery.md](./locator-discovery.md) for why).

**On waiting for outcomes:** always wait for something real - a network
response, specific text becoming visible - never a fixed `page.waitForTimeout()`.
That's what makes a test pass reliably on the first try instead of needing
a retry (which, per step 1, you don't want for side-effecting flows).

## 5. Run it

The simplest, shell-independent way (works identically in bash and
PowerShell, since it's an argument to the command, not an env var):

```bash
npm run ai:test -- --env stage
```

Or with the env var, if you prefer:

```bash
# bash / Git Bash
APP_ENV=stage npm run ai:test
```
```powershell
# PowerShell
$env:APP_ENV='stage'; npm run ai:test
```

This is the full pipeline in one command - it regenerates the feature/
steps/tests (all `UNCHANGED` this time, since nothing changed since step 3),
runs Playwright for real, and writes every report in step 6. Safe to run
repeatedly.

If you just want the Playwright run alone (e.g. you're iterating on the
Page Object and don't need the other stages every time) - note `npm test`
doesn't accept `--env` (that's our own CLI's flag, Playwright's own CLI
doesn't know it), so use the env var here:

```bash
# bash / Git Bash
APP_ENV=stage npm test
```
```powershell
# PowerShell
$env:APP_ENV='stage'; npm test
```

If Playwright's browser isn't installed (`npx playwright install chromium`
fails or the browser binary is missing), fall back to a system-installed
browser - add `PW_CHANNEL=msedge` (bash) or `$env:PW_CHANNEL='msedge'; `
(PowerShell) the same way, before any of the commands above. See
[troubleshooting.md](./troubleshooting.md).

## 6. Check the report

```bash
npm run report   # or just read reports/ after ai:test, which generates it as its last stage
```

`reports/json/test-run-report.json` has, per test: pass/fail, runtime, a
screenshot (even on pass), and every API request/response the page made
during the test - so for this example, the exact booking payload and the
lead ID the API returned are right there, no extra instrumentation needed.
See [reporting.md](./reporting.md).

## What happens when things change later

- **Requirement changes** (new/edited acceptance criteria): re-run
  `generate:features` → `generate:steps` → `generate:tests`. The feature
  file updates; the Page Object is never overwritten, but
  `generate:steps` will print which method names are new/missing so you
  know what to add.
- **The site's locators change**: edit `BookATestDrivePage.ts` by hand.
  Nothing regenerates it out from under you.
- **Nothing changed**: every generate command reports `UNCHANGED` and
  touches no files - safe to run as often as you like, e.g. in CI before
  `npm test`.
