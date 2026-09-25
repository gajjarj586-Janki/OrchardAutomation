# Reporting

```
reports/
├── playwright/          # Playwright's own HTML report (npx playwright show-report reports/playwright)
├── screenshots/         # one PNG per test, pass or fail - see "Per-test detail" below
├── json/
│   ├── playwright-results.json   # Playwright's own JSON reporter output
│   ├── execution-summary.json    # requirements/features/scenarios/pass/fail/skip tallies
│   └── test-run-report.json      # per-test: status, runtime, screenshots, API payloads
├── ai/
│   └── ai-report.json            # every AI-related audit event this run (generation, discovery, analysis)
└── healing/
    ├── healing-report.json       # every HealingAttemptRecord from healing/history/ within this run
    └── healing-report.txt        # the same, human-readable (see docs/healing.md)
```

`npm run report` (re)generates the `json`/`ai`/`healing` reports from whatever is currently in `reports/json/playwright-results.json` and `healing/history/history.json` - useful to regenerate reports without re-running tests. `npm run ai:test` generates all of them as its final stage.

## Per-test detail: status, runtime, screenshots, API payloads

`reports/json/test-run-report.json` (built by `src/reporting/TestRunReport.ts`) has one entry per test, **regardless of pass/fail**:

```json
{
  "testName": "Clicking the confirm control updates the status text",
  "feature": "generated/framework-selfcheck.spec.ts",
  "scenario": "Clicking the confirm control updates the status text",
  "environment": "chromium",
  "status": "passed",
  "durationMs": 1229,
  "screenshot": null,
  "finalScreenshot": "reports/screenshots/....-final.png",
  "video": null,
  "trace": null,
  "apiCalls": []
}
```

- **`durationMs`** - the test's actual runtime, straight from Playwright.
- **`finalScreenshot`** - captured automatically for *every* test by an auto-fixture in `src/fixtures/frameworkTest.ts`, independent of `execution.screenshot` in config (which only controls Playwright's own *on-failure* capture, surfaced here as `screenshot` when present). This is what makes screenshots available for passing tests too, not just failures.
- **`apiCalls`** - every request/response the page made during the test, captured by the same fixture: method, URL, HTTP status, request body, response body (when the response's `content-type` is JSON/text), and how long the call took. Empty for tests that make no network calls (e.g. this framework's own generic self-check fixture, which only manipulates local page content) - a project whose Page Objects call real APIs will see them populated here automatically, with no extra code needed in step definitions or Page Objects.
- **`video`/`trace`** - present when `execution.video`/`execution.trace` capture them (see [configuration.md](./configuration.md)).

This is separate from `execution-summary.json`, which stays a pure aggregate (counts only) - `test-run-report.json` is where you look for what happened in *one specific* test.

## Statuses used throughout

```
PASS
FAIL
SKIPPED
HEALED
CANDIDATE FOUND / CANDIDATE_FOUND / CANDIDATE_VALIDATED
REQUIRES HUMAN APPROVAL
MCP NOT CONFIGURED
AI NOT CONFIGURED
```

## Execution IDs

Every `ExecutionContext` (one per CLI invocation) gets a random `executionId`, attached to every log line and audit event it produces - see `src/core/ExecutionContext.ts`. This is what a future dashboard would group by.
