# MCP adapters

One adapter ships: `PlaywrightMCPAdapter.ts`, driving Microsoft's official
`@playwright/mcp` server in-process (set `MCP_PROVIDER=playwright`). Any
other/no `MCP_PROVIDER` makes `MCPProviderFactory` return an unconfigured
`MCPClient`, and MCP-dependent pipeline stages are reported as
`SKIPPED - MCP NOT CONFIGURED`. This is intentional: the framework does not
assume, invent, or fabricate results from any specific MCP/live-browser-
inspection vendor beyond what's actually wired up.

To add another adapter:

1. Implement `MCPBrowserProvider` (`src/mcp/MCPBrowserProvider.ts`) against
   your MCP server/SDK, in a new file under this directory
   (e.g. `adapters/ExampleMCPAdapter.ts`).
2. Register it in `src/mcp/MCPProviderFactory.ts`'s `switch`/lookup, keyed
   by the `mcp.provider` config value that should select it.
3. Never make `connect()`/the other methods succeed silently against a
   connection that didn't actually work - throw, and let `MCPClient` turn
   that into a reported `ERROR` result.

See docs/mcp.md for the full contract and testing guidance.
