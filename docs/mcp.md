# MCP (live browser inspection)

## Status: one adapter ships - `playwright`

Set `MCP_PROVIDER=playwright` to use `src/mcp/adapters/PlaywrightMCPAdapter.ts`,
which drives Microsoft's official `@playwright/mcp` server **in-process**
(via `createConnection()` + an in-memory MCP transport - no subprocess, no
extra server to run/host). It honors this project's own `PW_CHANNEL`
override (see `playwright.config.ts`) so it launches the same
already-installed browser rather than needing its own separate
`npx playwright install`.

This adapter can only validate what an accessibility snapshot actually
exposes: `role`+`name`, `text`, and `label`-shaped locators. `css`/`xpath`/
`testId` locators are honestly reported as unsupported (`valid: false` with
a clear reason) rather than guessed at - `@playwright/mcp`'s tool surface is
accessibility-tree/ref based, with no arbitrary-selector evaluation tool.

Any other `MCP_PROVIDER` value (or none) makes `MCPProviderFactory.createMCPClient()` return an unconfigured `MCPClient`, and every MCP-dependent stage reports `SKIPPED - MCP NOT CONFIGURED` rather than fabricating a result. This is intentional - the framework requirements are explicit that MCP must never be assumed or invented.

## `connect(url)` - which page does MCP even look at?

`MCPBrowserProvider.connect(url?: string)` takes an optional URL: the very
first thing any real caller must do is tell the provider which page to
inspect (there's no other way for it to know). `discoverLocatorsForFeature()`
(`src/locator/LocatorDiscovery.ts`) calls this automatically with the
feature's `targetUrl` (round-tripped from the requirement's `Target URL:`
line) before validating that feature's candidates, and disconnects when done.
A feature with no `targetUrl` has nothing to connect to, so its candidates
come back unvalidated (`mcpStatus` stays whatever it already was).

## Interface

```ts
interface MCPBrowserProvider {
  readonly name: string;
  connect(url?: string): Promise<void>;
  disconnect(): Promise<void>;
  inspectPage(): Promise<PageInspection>;
  getPageStructure(): Promise<PageStructure>;
  getAccessibilitySnapshot(): Promise<AccessibilitySnapshot>;
  findElements(criteria: ElementSearchCriteria): Promise<ElementInfo[]>;
  getElementAttributes(element: ElementReference): Promise<ElementAttributes>;
  validateLocator(locator: LocatorDefinition): Promise<LocatorValidationResult>;
}
```

`MCPClient` (`src/mcp/MCPClient.ts`) wraps a provider so every call returns `{status: 'OK', data}` / `{status: 'SKIPPED', reason}` / `{status: 'ERROR', error}` - callers branch on `status`, never assume success.

## MCP vs. this framework's own LocatorValidator

MCP is for **discovery when there is no live page yet, or richer inspection** (accessibility tree, full page structure, "what elements exist near here"). `src/locator/LocatorValidator.ts` is a **separate**, always-available capability: given any live Playwright `page` the framework already has (e.g. during targeted retry inside a running test), it validates a specific candidate locator for real - existence, uniqueness, visibility, semantic name match - using Playwright's own API. Healing during a live test run uses the latter; standalone `discover:locators`/`heal` (run outside of a live test) use the former, and report SKIPPED without it.

## Adding another adapter

See `src/mcp/adapters/README.md`. In short: implement `MCPBrowserProvider` under `src/mcp/adapters/` (`PlaywrightMCPAdapter.ts` is a template), register it by name in `MCPProviderFactory`, and never let `connect()`/the other methods succeed silently against a connection that didn't actually work.

## CI

`MCP_PROVIDER=playwright` needs the same thing `npx playwright install` needs: a real browser it can launch (see `PW_CHANNEL` in [troubleshooting.md](./troubleshooting.md) for CI/offline environments without network access to Playwright's browser CDN). Don't assume any *other* `MCP_PROVIDER` will work in GitHub Actions or any CI runner without provisioning whatever infrastructure that adapter's server needs (a running browser-inspection service, network access to it, credentials) - document that infrastructure alongside the adapter.
