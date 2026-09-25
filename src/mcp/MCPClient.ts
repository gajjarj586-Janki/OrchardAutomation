import type { MCPBrowserProvider } from './MCPBrowserProvider';
import type {
  PageInspection,
  PageStructure,
  AccessibilitySnapshot,
  ElementSearchCriteria,
  ElementInfo,
  ElementReference,
  ElementAttributes,
} from './MCPModels';
import type { LocatorDefinition, LocatorValidationResult } from '../locator/LocatorDefinition';

export type MCPResult<T> =
  | { status: 'OK'; data: T }
  | { status: 'SKIPPED'; reason: string }
  | { status: 'ERROR'; error: string };

const NOT_CONFIGURED_REASON = 'MCP NOT CONFIGURED';

/**
 * Wraps an (optional) MCPBrowserProvider so every call site gets a typed
 * result instead of either a live value or an exception - "MCP not
 * configured" and "MCP call failed" are both facts the pipeline must be
 * able to report, never silently swallow or fabricate around.
 */
export class MCPClient {
  constructor(private readonly provider: MCPBrowserProvider | null) {}

  get isConfigured(): boolean {
    return this.provider !== null;
  }

  private async call<T>(
    operation: (provider: MCPBrowserProvider) => Promise<T>
  ): Promise<MCPResult<T>> {
    if (!this.provider) {
      return { status: 'SKIPPED', reason: NOT_CONFIGURED_REASON };
    }
    try {
      const data = await operation(this.provider);
      return { status: 'OK', data };
    } catch (error) {
      return { status: 'ERROR', error: error instanceof Error ? error.message : String(error) };
    }
  }

  connect(url?: string): Promise<MCPResult<void>> {
    return this.call((provider) => provider.connect(url));
  }

  disconnect(): Promise<MCPResult<void>> {
    return this.call((provider) => provider.disconnect());
  }

  inspectPage(): Promise<MCPResult<PageInspection>> {
    return this.call((provider) => provider.inspectPage());
  }

  getPageStructure(): Promise<MCPResult<PageStructure>> {
    return this.call((provider) => provider.getPageStructure());
  }

  getAccessibilitySnapshot(): Promise<MCPResult<AccessibilitySnapshot>> {
    return this.call((provider) => provider.getAccessibilitySnapshot());
  }

  findElements(criteria: ElementSearchCriteria): Promise<MCPResult<ElementInfo[]>> {
    return this.call((provider) => provider.findElements(criteria));
  }

  getElementAttributes(element: ElementReference): Promise<MCPResult<ElementAttributes>> {
    return this.call((provider) => provider.getElementAttributes(element));
  }

  validateLocator(locator: LocatorDefinition): Promise<MCPResult<LocatorValidationResult>> {
    return this.call((provider) => provider.validateLocator(locator));
  }
}
