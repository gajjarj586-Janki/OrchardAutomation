# Contributing

## Workflow

```bash
npm install
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
```

All four must pass before opening a PR. If you touched anything execution-related, also run `PW_CHANNEL=msedge npm run ai:test` (or plain `npm test` with browsers installed) locally and check `reports/`.

## Ground rules for framework core changes

- **Stay application-agnostic.** No business-specific Page Objects, selectors, credentials, or test data belong in framework core - only the tiny, clearly-labeled self-check fixture (`requirements/framework-selfcheck.md`, `tests/fixtures/self-check.html`) exists to prove the pipeline works end to end.
- **Never fabricate success.** If AI or MCP is unavailable, or a candidate can't be validated, say so explicitly (`SKIPPED`, `NOT CONFIGURED`, `CANDIDATE_FOUND` rather than `HEALED`) - do not round up.
- **Keep AI/MCP output untrusted.** Any new AI-backed capability must go through schema + content/syntax validation (`AIClient.withValidation`) with a bounded retry count.
- **Healing never touches source by default.** `autoPatch`/`autoCommit`/`autoMerge` must stay `false` unless a user explicitly asks for that to change, and even then, patch application needs the full flow in [production-hardening.md](./production-hardening.md), not a shortcut.
- **Unit tests never require a real browser, AI provider, or MCP server.** Mock what you need; keep `test:unit` fast and hermetic.

## Where things live

See [architecture.md](./architecture.md) for the layer-by-layer breakdown before adding a new module.
