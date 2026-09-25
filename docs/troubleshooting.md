# Troubleshooting

**`APP_ENV=stage npm run ai:test` fails with "is not recognized as the name of a cmdlet..."** - that's bash syntax for setting an env var inline; PowerShell needs `$env:APP_ENV='stage'; npm run ai:test` instead (semicolon, not `&&`). Simplest fix that works in either shell: pass it as a CLI flag instead of an env var - `npm run ai:test -- --env stage` (also works for `npm run cli -- validate-config --env stage`). Plain `npm test` doesn't accept `--env` though (Playwright's own CLI doesn't know that flag) - use the env var for that one.

**"Configuration failed schema validation"** - `loadConfig()` prints exactly which field failed and why. Check `config/default.yaml`, `config/local.yaml`, and any `AI_*`/`MCP_*`/`APP_BASE_URL` environment variables.

**"AI provider ... is not configured/implemented"** - `ai.provider` is set to something other than `mock` and no adapter for it exists in `AIProviderFactory`. Set it back to `mock`, or implement the provider - see [ai.md](./ai.md).

**MCP-dependent stages always show SKIPPED** - expected; no MCP adapter ships with the framework core. See [mcp.md](./mcp.md).

**`npx playwright install` fails / times out** - if the runner/machine has no internet access to Playwright's CDN, use a system-installed browser instead: set `PW_CHANNEL=msedge` (or `chrome`) before running `npm test` / `npm run ai:test`. This is exactly how this framework's own generated tests were verified in its build sandbox.

**A generated file (`steps/*.steps.ts`, `tests/generated/*.spec.ts`) shows as changed every time you run `npm run format`** - known, cosmetic limitation: the generators don't run their output through Prettier before writing it, so Prettier's canonical formatting differs slightly from the generator's own. Re-running `generate:steps`/`generate:tests` without an intervening `format` is still fully idempotent (byte-identical output, reported `UNCHANGED`).

**A Page Object method throws `NOT_IMPLEMENTED: ...`** - expected for any step whose Page Object method hasn't been filled in yet. The generator only ever scaffolds a method signature; you (or your team) implement the real interaction. This is not a framework bug - it is the framework refusing to fabricate application logic it cannot know.

**`retry:failed`/`regression` seem to fail against a HEALED test** - see the "Why targeted retry/regression can show SKIPPED/NOT RUN" section of [healing.md](./healing.md). Without `healing.autoPatch: true` (and real patch-application code, which does not exist yet), a subprocess re-run of unpatched source will always reproduce the same known failure.

**Unit tests (`npm run test:unit`) never touch a real browser, AI provider, or MCP server** - by design; see "Framework Testing" in the requirements this was built from. If you need to verify real browser behavior, run `npm test` / `npm run ai:test` instead.
