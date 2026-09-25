# Configuration

Configuration is layered, in increasing precedence:

1. `config/default.yaml` - ships with the framework core, stays generic. Never edit this to point at a specific application.
2. `config/environments/<env>.yaml` - optional, one file per environment (`dev`, `stage`, `prod` ship as examples). Selected by `--env <name>` or the `APP_ENV`/`NODE_ENV` environment variable - see "Environments" below.
3. `config/local.yaml` - optional, git-ignored, per-machine overrides.
4. an explicit file passed via `--config <path>` to any CLI command.
5. environment variables, loaded from `.env` (see `.env.example`): `AI_PROVIDER`, `AI_MODEL`, `MCP_PROVIDER`, `APP_BASE_URL`.

The merged result is validated against a Zod schema (`src/config/schema.ts`) before any pipeline stage runs - `loadConfig()` throws a `FrameworkError` naming exactly which field is invalid if it doesn't.

## Fields

```yaml
project:
  name: generic-project

application:
  baseUrl: ''

execution:
  browser: chromium # chromium | firefox | webkit
  headless: true
  timeout: 30000
  navigationTimeout: 30000
  retries: 1
  workers: 1
  screenshot: only-on-failure
  trace: retain-on-failure
  video: retain-on-failure

ai:
  enabled: true
  provider: mock # only "mock" is implemented in framework core
  model: ''
  maxRetries: 3

mcp:
  enabled: true
  provider: '' # no adapter ships - see docs/mcp.md

healing:
  enabled: true
  autoHeal: true
  autoPatch: false # never true by default - see docs/healing.md
  autoCommit: false
  autoMerge: false
  maxAttempts: 3
  targetedRetry: true
  regressionAfterHealing: true
  regressionScope: affected # affected | full
```

## Environments

```
config/environments/
├── dev.yaml     # headless: false, retries: 0 - fast local iteration
├── stage.yaml   # headless: true, retries: 1
└── prod.yaml    # headless: true, retries: 2, video off - lighter artifacts
```

Pick one with either:

```bash
APP_ENV=stage npm run ai:test
# or
npm run ai:test -- --env stage
npm run cli -- validate-config --env stage
```

Resolution order: an explicit `--env` wins; otherwise `APP_ENV`, then `NODE_ENV`, is used. A missing file is only an error when `--env` was passed explicitly - an ambient `NODE_ENV` (e.g. `test`, set by test tooling) with no matching `config/environments/test.yaml` is silently ignored, so unit tests and other tooling never need one.

Each shipped environment file only overrides `application.baseUrl` (empty - fill in per environment) and a few `execution` fields; add whatever else your project needs (e.g. different `healing` settings per environment) the same way. To add a new environment, create `config/environments/<name>.yaml` - nothing else needs to change.

Precedence-wise, `config/local.yaml` (per-machine, git-ignored) still wins over the environment file, so a developer can always override an environment's settings locally without touching version control.

## Adding a new project

1. Copy `.env.example` to `.env` and fill in `APP_BASE_URL` (and `AI_PROVIDER`/`AI_API_KEY`/`AI_MODEL` once you have a real AI provider - see [ai.md](./ai.md)).
2. Create `config/local.yaml` for anything else you want to override (browser, timeouts, healing scope). Do not edit `config/default.yaml`.
3. Inspect what's resolved: `npm run cli -- validate-config`.

## `playwright.config.ts`

Playwright's own settings (browser, timeouts, screenshot/trace/video, `baseURL`) are read from the same resolved config via `loadConfig()` - there is nothing Playwright-specific to configure separately. `PW_CHANNEL` (an env var, not part of `config/*.yaml`) optionally selects a system-installed browser channel (`msedge`, `chrome`) instead of Playwright's bundled binaries - useful on machines/CI runners without internet access to download them.
