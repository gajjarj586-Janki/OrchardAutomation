# CI/CD

`.github/workflows/ci.yml` runs, on every push/PR:

```
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npx playwright install --with-deps chromium
npm run ai:test        # continue-on-error: true, see below
```

and uploads `reports/` and `test-results/` as build artifacts regardless of outcome.

## Why `ai:test` has `continue-on-error: true`

This repository's own example requirement (`requirements/example-generic-action.md`) intentionally scaffolds a Page Object whose methods are never filled in (`NOT_IMPLEMENTED`, by design - see [Phase 3 in the root README's status]). A fresh clone of the framework will therefore always have real, expected test failures until a project fills in its own Page Objects. Once your project's generated Page Objects are actually implemented, remove `continue-on-error` so CI genuinely gates on `ai:test`'s result.

## What CI does *not* assume

- **MCP.** No MCP adapter ships (see [mcp.md](./mcp.md)); CI runs with MCP-dependent stages reported as SKIPPED. If you add a real MCP adapter, you are responsible for provisioning whatever infrastructure it needs in CI (a running browser-inspection service, credentials, network access) and documenting it here.
- **A real AI provider.** CI runs against `MockAIProvider` unless you configure `AI_PROVIDER`/`AI_API_KEY` as repository secrets and update `AIProviderFactory` to use them (see [ai.md](./ai.md)).
- **A target application.** `application.baseUrl` is empty by default; CI cannot exercise real login/checkout/etc. flows because the framework core intentionally contains none.

## Browsers in CI/offline environments

Playwright's own `npx playwright install` downloads browser binaries from the network. On a runner without internet access to that CDN, set `PW_CHANNEL=msedge` (or `chrome`) to use a system-installed browser instead - see `playwright.config.ts` and [configuration.md](./configuration.md).
