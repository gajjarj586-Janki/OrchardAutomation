# Production hardening (not implemented yet)

This framework is built so the following can be layered on **without rewriting core**, but none of it exists yet:

```
Locator Failure -> Failure Context -> MCP Inspection -> Candidate Generation -> Candidate Ranking
  -> Safety Gate -> Candidate Validation -> Targeted Retry -> Relevant Regression -> Healing Event
  -> Patch Candidate -> Git Branch -> Full Validation -> Pull Request -> Human Approval -> Merge
```

Concretely, still to build:

- **Confidence engine** - today, confidence is a per-strategy heuristic set by whichever `AIProvider` proposed a candidate (see `MockAIProvider`'s suffix-stripping heuristic). A real engine would combine multiple signals (semantic match, DOM context, historical success rate from `healing/history/`) into a calibrated score.
- **Persistent healing database** - `HealingHistory` is a single JSON file today (`healing/history/history.json`). Its record shape (`HealingAttemptRecord`) is already flat and storage-agnostic specifically so it can move to Postgres (or similar) later without changing any caller.
- **Git branch management + patch generation** - there is no code that edits a Page Object file, creates a branch, or opens a PR. `healing.autoPatch` staying `false` reflects that this does not exist, not just that it's disabled.
- **Approval workflow** - `HealingAttemptRecord.approvalStatus` exists as a field (`REQUIRED`/`APPROVED`/`REJECTED`/`NOT_APPLICABLE`) but nothing sets it to `APPROVED`/`REJECTED` yet - there is no UI or CLI command for a human to record a decision.
- **Rollback** - not applicable until patching exists.
- **Audit trail** - the closest thing today is `EventBus`/`FrameworkEvent` (see `src/events/`) plus `HealingHistory`. A real audit trail would persist events durably (not just for one process's in-memory buffer) and expose them queryable.
- **Metrics/dashboards** - `ExecutionContext.executionId` and structured JSON logging exist as the hook point; nothing aggregates across runs yet.
- **Notifications** - not implemented.
- **Multi-project support** - `config/local.yaml` supports per-checkout overrides, but there is no concept of multiple named projects sharing one framework installation.
- **Multi-browser / parallel execution** - `execution.browser` picks exactly one Playwright project at a time (see `playwright.config.ts`); `execution.workers` is passed through to Playwright but no framework-level sharding logic exists beyond that.
- **Enterprise authentication** - see [authentication.md](./authentication.md); only the abstraction exists.

If you build one of these, keep it behind the same "never fake success, never patch/commit/merge without an explicit opt-in" principles the rest of the framework follows.
