import { createConnection } from '@playwright/mcp';

// `Config` isn't a named export of `@playwright/mcp` - derive its type from
// `createConnection`'s own parameter instead of duplicating/guessing its shape.
type PlaywrightMCPConfig = NonNullable<Parameters<typeof createConnection>[0]>;
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { MCPBrowserProvider } from '../MCPBrowserProvider';
import type {
  PageInspection,
  PageStructure,
  AccessibilitySnapshot,
  ElementSearchCriteria,
  ElementInfo,
  ElementReference,
  ElementAttributes,
} from '../MCPModels';
import type { LocatorDefinition, LocatorValidationResult } from '../../locator/LocatorDefinition';
import { FrameworkError } from '../../core/FrameworkError';
import type { FrameworkConfig } from '../../config/schema';
import type { Logger } from '../../logging/Logger';

export interface SnapshotNode {
  indent: number;
  role: string;
  name?: string;
  level?: number;
  ref?: string;
  text?: string;
}

// One line of `@playwright/mcp`'s YAML-ish snapshot, e.g.
// `  - button "Confirm" [ref=e4]` or `- generic [active] [ref=e1]:`. Bracket
// annotations ([active], [expanded], [level=N], [ref=xN], ...) can appear in
// any combination/order, so they're extracted separately below rather than
// pinned to fixed positions in one big regex.
const LINE_HEAD_PATTERN = /^(\s*)-\s+([a-zA-Z][\w-]*)(?:\s+"([^"]*)")?/;
const BRACKET_PATTERN = /\[([^\]]*)\]/g;

export function parseSnapshotText(text: string): SnapshotNode[] {
  const nodes: SnapshotNode[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const head = LINE_HEAD_PATTERN.exec(line);
    if (!head) continue;
    const [, indent, role, name] = head;
    const rest = line.slice(head[0].length);

    let level: number | undefined;
    let ref: string | undefined;
    for (const bracket of rest.matchAll(BRACKET_PATTERN)) {
      const content = bracket[1] ?? '';
      const levelMatch = /^level=(\d+)$/.exec(content);
      const refMatch = /^ref=([\w-]+)$/.exec(content);
      if (levelMatch) level = Number(levelMatch[1]);
      if (refMatch) ref = refMatch[1];
    }

    const trailingText = /:\s*(.*)$/.exec(rest.replace(BRACKET_PATTERN, ''));

    nodes.push({
      indent: (indent ?? '').length,
      role: role ?? '',
      name: name || undefined,
      level,
      ref,
      text: trailingText?.[1] ? trailingText[1].replace(/^"|"$/g, '') : undefined,
    });
  }
  return nodes;
}

function toolTextContent(result: { content: Array<{ type: string; text?: string }>; isError?: boolean }): string {
  const text = result.content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n');
  if (result.isError) {
    throw new FrameworkError({
      stage: 'MCP_TOOL_CALL',
      message: `Playwright MCP tool call failed: ${text || '(no error text returned)'}`,
    });
  }
  return text;
}

/** The "\`\`\`yaml ... \`\`\`" block a browser_snapshot/browser_find response wraps its tree in. */
export function extractYamlBlock(text: string): string {
  const match = /```yaml\n([\s\S]*?)```/.exec(text);
  return match?.[1] ?? text;
}

/**
 * Pure decision logic for validateLocator, split out so it's testable
 * without a live browser/MCP session - see PlaywrightMCPAdapter.test.ts.
 */
export function resolveLocatorAgainstNodes(
  locator: LocatorDefinition,
  nodes: SnapshotNode[]
): LocatorValidationResult {
  if (locator.strategy === 'css' || locator.strategy === 'xpath' || locator.strategy === 'testId') {
    return {
      valid: false,
      exists: false,
      count: 0,
      reason: `PlaywrightMCPAdapter cannot validate "${locator.strategy}" locators - @playwright/mcp only exposes the accessibility tree (role/name/text), which has no notion of CSS selectors, XPath, or test-id attributes.`,
    };
  }

  const matches =
    locator.strategy === 'role'
      ? nodes.filter(
          (n) =>
            n.role.toLowerCase() === locator.value.toLowerCase() &&
            (!locator.name || n.name?.toLowerCase() === locator.name.toLowerCase())
        )
      : nodes.filter((n) => {
          const haystack = (n.name ?? n.text ?? '').toLowerCase();
          const needle = (locator.name ?? locator.value).toLowerCase();
          return haystack.includes(needle);
        });

  if (matches.length === 0) {
    return { valid: false, exists: false, count: 0, reason: 'Locator matched 0 elements in the accessibility snapshot.' };
  }
  if (matches.length > 1) {
    return {
      valid: false,
      exists: true,
      count: matches.length,
      reason: `Locator matched ${matches.length} elements in the accessibility snapshot - not unique.`,
    };
  }

  return {
    valid: true,
    exists: true,
    count: 1,
    visible: true, // @playwright/mcp's default accessibility snapshot only includes exposed/visible nodes.
    roleMatches: locator.strategy === 'role',
    reason: 'Locator resolved to exactly one element in the accessibility snapshot.',
  };
}

/**
 * Drives Microsoft's official Playwright MCP server (`@playwright/mcp`)
 * in-process, over an in-memory MCP transport - no subprocess, no extra
 * network hop. This is a standalone browser session, separate from whatever
 * Playwright browser a live test run may have open (see docs/mcp.md: MCP is
 * for discovery when there is no live page yet, not for inspecting a
 * specific already-running test's page).
 *
 * Only strategies this adapter can actually check against an accessibility
 * snapshot (role, text, label) are ever reported `valid`; `css`/`xpath`/
 * `testId` are honestly reported as unsupported rather than guessed at -
 * see docs/mcp.md's "never make... methods succeed silently" contract.
 */
export class PlaywrightMCPAdapter implements MCPBrowserProvider {
  readonly name = 'playwright';

  private server: Server | undefined;
  private client: Client | undefined;
  private currentUrl: string | undefined;

  constructor(
    private readonly config: FrameworkConfig,
    private readonly logger: Logger
  ) {}

  private mcpConfig(): PlaywrightMCPConfig {
    // Mirror this project's own PW_CHANNEL override (see playwright.config.ts)
    // so this adapter launches the same already-installed browser instead of
    // requiring its own separate `npx playwright install` download.
    const channel = process.env.PW_CHANNEL || undefined;
    return {
      browser: {
        browserName: 'chromium',
        isolated: true,
        launchOptions: {
          headless: this.config.execution.headless,
          ...(channel ? { channel } : {}),
        },
      },
    };
  }

  private async ensureClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    this.server = await createConnection(this.mcpConfig());
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await this.server.connect(serverTransport);

    const client = new Client({ name: 'ai-playwright-framework', version: '1.0.0' });
    await client.connect(clientTransport);
    this.client = client;
    return client;
  }

  private async callTool(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<{ content: Array<{ type: string; text?: string }>; isError?: boolean }> {
    const client = await this.ensureClient();
    const result = await client.callTool({ name, arguments: args });
    return result as { content: Array<{ type: string; text?: string }>; isError?: boolean };
  }

  async connect(url?: string): Promise<void> {
    await this.ensureClient();
    if (!url || url === this.currentUrl) {
      return;
    }
    const text = toolTextContent(await this.callTool('browser_navigate', { url }));
    this.logger.info('PlaywrightMCPAdapter navigated', { status: 'MCP_NAVIGATED', url });
    this.currentUrl = url;
    void text;
  }

  async disconnect(): Promise<void> {
    await this.client?.close().catch(() => undefined);
    await this.server?.close().catch(() => undefined);
    this.client = undefined;
    this.server = undefined;
    this.currentUrl = undefined;
  }

  private async snapshotNodes(): Promise<SnapshotNode[]> {
    const text = toolTextContent(await this.callTool('browser_snapshot', {}));
    return parseSnapshotText(extractYamlBlock(text));
  }

  async inspectPage(): Promise<PageInspection> {
    const text = toolTextContent(await this.callTool('browser_snapshot', {}));
    const urlMatch = /Page URL:\s*(\S+)/.exec(text);
    const titleMatch = /Page Title:\s*(.+)/.exec(text);
    return {
      url: urlMatch?.[1] ?? this.currentUrl ?? '',
      title: titleMatch?.[1]?.trim() ?? '',
      timestamp: new Date().toISOString(),
    };
  }

  async getPageStructure(): Promise<PageStructure> {
    const nodes = await this.snapshotNodes();
    return {
      summary: nodes
        .map((n) => `${'  '.repeat(n.indent)}${n.role}${n.name ? ` "${n.name}"` : ''}`)
        .join('\n'),
      landmarks: [...new Set(nodes.map((n) => n.role))],
    };
  }

  async getAccessibilitySnapshot(): Promise<AccessibilitySnapshot> {
    return { tree: await this.snapshotNodes() };
  }

  async findElements(criteria: ElementSearchCriteria): Promise<ElementInfo[]> {
    const nodes = await this.snapshotNodes();
    return nodes
      .filter((n) => {
        if (criteria.role && n.role.toLowerCase() !== criteria.role.toLowerCase()) return false;
        if (criteria.name && n.name?.toLowerCase() !== criteria.name.toLowerCase()) return false;
        if (criteria.text && !(n.text ?? n.name ?? '').toLowerCase().includes(criteria.text.toLowerCase()))
          return false;
        return true;
      })
      .map((n) => ({
        role: n.role,
        name: n.name,
        attributes: n.ref ? { 'data-mcp-ref': n.ref } : undefined,
      }));
  }

  async getElementAttributes(_element: ElementReference): Promise<ElementAttributes> {
    // @playwright/mcp's tool surface exposes an accessibility snapshot, not
    // raw DOM attributes for an arbitrary element - never fabricate this.
    throw new FrameworkError({
      stage: 'MCP_GET_ELEMENT_ATTRIBUTES',
      message: 'PlaywrightMCPAdapter cannot resolve raw DOM attributes for an element.',
      possibleCause:
        "@playwright/mcp's tool set is accessibility-snapshot based (role/name/ref), with no tool that returns arbitrary DOM attributes.",
      recommendedAction:
        'Use getAccessibilitySnapshot()/findElements() for role/name-based inspection instead.',
    });
  }

  async validateLocator(locator: LocatorDefinition): Promise<LocatorValidationResult> {
    if (locator.strategy === 'css' || locator.strategy === 'xpath' || locator.strategy === 'testId') {
      return resolveLocatorAgainstNodes(locator, []);
    }
    return resolveLocatorAgainstNodes(locator, await this.snapshotNodes());
  }
}
