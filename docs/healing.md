# Self-healing

## Safety defaults (never change these without understanding the consequences)

```yaml
healing:
  enabled: true
  autoHeal: true
  autoPatch: false # never rewrites source automatically
  autoCommit: false # never commits automatically
  autoMerge: false # never merges automatically
  maxAttempts: 3
  targetedRetry: true
  regressionAfterHealing: true
  regressionScope: affected
```

The healer never modifies your source files. Its output is a `HealingAttemptRecord` (see `src/healer/HealingHistory.ts`) persisted to `healing/history/history.json` and surfaced in `reports/healing/` - a human decides whether and how to apply a fix.

## Flow

```
Failed test (real Playwright failure)
  -> FailureAnalysis (parses the error text: which locator, which action verb)
  -> not locator-related?  -> finalStatus: NOT_APPLICABLE (nothing more happens)
  -> AI suggests candidate locator(s) (heuristic, e.g. strip a bad "-ed" suffix)
  -> rank candidates
  -> validate best candidate:
       - live page available (inline, during the failing test)  -> real Playwright validation
       - no live page, MCP configured                            -> MCP validateLocator()
       - neither                                                  -> finalStatus: CANDIDATE_FOUND (SKIPPED validation)
  -> validated? try the original action (click/check/...) with the candidate, on the SAME live page
       - passes -> finalStatus: HEALED
       - fails / unsupported action -> finalStatus: CANDIDATE_VALIDATED
```

Every attempt is recorded, including ones that conclude `NOT_APPLICABLE` or `FAILED` - the goal is a complete audit trail, not just the successes.

## Where healing runs

- **Inline**, automatically, during `npm test` / `npm run ai:test`: generated test files call `createHealer()` and pass it into `runScenario()`. When a step throws, `ScenarioRunner` calls `healer.heal(failure, page)` with the *same live page* before rethrowing the original error - **the original Playwright test result is never changed**; it still fails.
- **Offline**, via `npm run heal`: reads `reports/json/playwright-results.json` from the last run and re-attempts healing without a live page (so validation depends on MCP, or is SKIPPED). Useful when `autoHeal` was off during the run, or to inspect the decision separately.

## Reading a healing report

```
Original Test: FAILED (Clicking the stale confirm control ...)
Healing Candidate: FOUND
Candidate Validation: PASSED
Targeted Retry: PASSED
Regression: NOT_RUN
Final Status: HEALED
Source Patch: NOT APPLIED
Approval: REQUIRED
```

`Original Test: FAILED` is always shown - healing never converts a failure into a silent pass. `Source Patch: NOT APPLIED` + `Approval: REQUIRED` mean exactly that: nothing changed on disk, and a human needs to look at `candidateLocator` in the healing history and decide whether to apply it.

## Approving a healing patch

There is no automated patch application yet (`autoPatch: false` by default, and no patch-application code exists in this version of the framework - see [production-hardening.md](./production-hardening.md)). To act on a HEALED record today:

1. Open `healing/history/history.json` or `reports/healing/healing-report.json`, find the record.
2. Manually update the relevant Page Object method in `src/pages/generated/*Page.ts` to use `candidateLocator` instead of `originalLocator`.
3. Run `npm run retry:failed` to confirm the specific test now passes against your change, then `npm run regression` to check nothing else broke.
4. Commit the change yourself, through your normal review process.

## Why `npm run ai:test`'s "Targeted Retry"/"Regression" stages can show SKIPPED/NOT RUN

The meaningful targeted retry already happened *inline* (see above) - it replayed the failed action against the live page with the candidate locator. A second, separate Playwright subprocess run of the same *unpatched* source can never pass (it still calls the original, wrong locator), so the pipeline does not re-run it and report a confusing FAIL for something that isn't a new problem. Once you've applied a patch by hand (above), use the standalone `npm run retry:failed` / `npm run regression` commands, which are real subprocess re-runs meant for exactly that.
