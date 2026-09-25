# Generic AI-Powered Playwright BDD Self-Healing Framework

A generic, reusable, application-agnostic Playwright + BDD automation
framework core. It is designed to be configured for any web application; it
intentionally contains no business-specific tests itself - only a tiny,
clearly-labeled self-check fixture used to prove the pipeline works.

> Built against the requirements in `read.md`. See `docs/` for the full
> documentation set and [docs/architecture.md](docs/architecture.md) for the
> design rationale.

## Pipeline

```text
requirements/*.md -> AI -> features/*.feature -> steps/*.steps.ts + Page Objects
  -> tests/generated/*.spec.ts -> Playwright execution -> failure analysis
  -> healing engine (validated locator candidates, never a source patch by
     default) -> targeted retry -> regression -> reports/
```

Developer experience:

```bash
# 1. Add or edit a requirement under requirements/
# 2. Run the full pipeline
npm run ai:test
# 3. Read reports/
```

## Requirements

- Node.js >= 18.18
- npm

## Getting started

```bash
npm install
cp .env.example .env   # fill in values locally; never commit .env
npx playwright install chromium   # or set PW_CHANNEL=msedge - see docs/troubleshooting.md

npm run typecheck
npm run lint
npm run format:check
npm run test:unit

npm run cli -- validate-config
npm run ai:test
```

## Commands

| Script | Purpose |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over the whole repo |
| `npm run format` / `format:check` | Prettier write / check |
| `npm run test:unit` | Framework unit tests (Node's built-in test runner; no real AI/MCP/browser) |
| `npm run clean` | Remove `dist/`, `reports/`, Playwright output dirs |
| `npm run cli -- <cmd>` | Direct access to any CLI command below, plus `validate-config` |
| `npm run requirements` | List/parse `requirements/*.md` |
| `npm run generate:features` | Requirement -> AI -> validated Gherkin (`features/*.feature`) |
| `npm run validate:features` | Re-validate `features/*.feature` (Gherkin syntax + no-secrets check) |
| `npm run generate:steps` | Feature -> `steps/*.steps.ts` + scaffold `src/pages/generated/*Page.ts` |
| `npm run generate:tests` | Feature -> `tests/generated/*.spec.ts` |
| `npm run discover:locators` | AI-suggested (MCP-validated when configured) locator candidates for actionable steps |
| `npm test` | Run Playwright (inline self-healing runs automatically for any failure) |
| `npm run analyze:failures` | Classify failures from the last `npm test` run as locator-related or not |
| `npm run heal` | Offline healing attempt over the last run's failures (no live page) |
| `npm run retry:failed` | Real Playwright subprocess re-run of just the tests that failed |
| `npm run regression` | Re-run the regression suite (`healing.regressionScope: affected\|full`) |
| `npm run report` | (Re)generate `reports/` from the last run + healing history |
| `npm run ai:test [-- --dry-run]` | The full 12-stage pipeline, start to finish |

Every generation/pipeline command supports `--dry-run` (shows what would happen, writes nothing).

## Configuration

Layered, in increasing precedence: `config/default.yaml` -> `config/local.yaml` (git-ignored) -> an explicit `--config <file>` -> environment variables from `.env`. Validated with Zod (`src/config/schema.ts`) before anything runs. See [docs/configuration.md](docs/configuration.md).

## What's real vs. what's honestly stubbed

- **AI**: only `MockAIProvider` ships (deterministic, offline, every artifact it writes says so). Configuring any other `ai.provider` fails clearly rather than silently using the mock. See [docs/ai.md](docs/ai.md).
- **MCP**: no adapter ships. MCP-dependent stages report `SKIPPED - MCP NOT CONFIGURED`, never a fabricated result. See [docs/mcp.md](docs/mcp.md).
- **Healing**: fully real - AI proposes a candidate, the framework validates it against a live Playwright page (or MCP), and retries the actual failed action on that same page. `healing.autoPatch`/`autoCommit`/`autoMerge` are `false` by default and there is no code to apply a patch yet - see [docs/healing.md](docs/healing.md) for how to act on a healed candidate today.
- **The example requirements** (`requirements/example-generic-action.md`, `requirements/framework-selfcheck.md`) are framework self-checks, not business tests. The first proves requirement -> Gherkin generation; the second (with its own tiny local HTML fixture, `tests/fixtures/self-check.html`) proves the full generate -> execute -> heal loop with a real, reproducible Playwright failure and a real healed outcome.
- **Reporting**: every test - pass or fail - gets a real screenshot (`reports/screenshots/`) and, if it makes any network calls, its full request/response payloads, all indexed with status and runtime in `reports/json/test-run-report.json`. See [docs/reporting.md](docs/reporting.md).

## Documentation

Start here: **[a full worked example, step by step](docs/example-walkthrough.md)** - write a requirement, generate everything, implement the one manual step, run it, read the report.

The rest, in [`docs/`](docs/): [architecture](docs/architecture.md), [configuration](docs/configuration.md), [requirements](docs/requirements.md), [gherkin](docs/gherkin.md), [ai](docs/ai.md), [mcp](docs/mcp.md), [locator discovery](docs/locator-discovery.md), [healing](docs/healing.md), [reporting](docs/reporting.md), [test data](docs/test-data.md), [authentication](docs/authentication.md), [CI/CD](docs/ci-cd.md), [troubleshooting](docs/troubleshooting.md), [contributing](docs/contributing.md), [production hardening](docs/production-hardening.md).

## Security

Never commit `.env` or real secrets. `.env.example` documents the variables the framework reads; only placeholder/empty values belong in it. Requirements, features, and test data must never contain credentials, tokens, or cookies - `validate:features` scans for obvious ones.
