import type { LocatorDefinition, LocatorValidationResult } from '../locator/LocatorDefinition';
import type {
  PageInspection,
  PageStructure,
  AccessibilitySnapshot,
  ElementSearchCriteria,
  ElementInfo,
  ElementReference,
  ElementAttributes,
} from './MCPModels';

/**
 * Abstraction over a live browser inspection server (Model Context
 * Protocol or otherwise). The framework core never assumes a specific MCP
 * vendor/server - only this interface. No implementation ships by default;
 * see src/mcp/adapters/README.md for how to plug one in.
 */
export interface MCPBrowserProvider {
  readonly name: string;

  /**
   * Connects (lazily starting the underlying session on first call) and, when
   * `url` is given, navigates to it - re-navigating an already-connected
   * session rather than restarting it. `url` is required in practice: every
   * other method here (inspectPage, validateLocator, ...) operates against
   * "whatever page this session is currently on", and there is no other way
   * for a caller to tell the provider which page that should be.
   */
  connect(url?: string): Promise<void>;
  disconnect(): Promise<void>;

  inspectPage(): Promise<PageInspection>;
  getPageStructure(): Promise<PageStructure>;
  getAccessibilitySnapshot(): Promise<AccessibilitySnapshot>;
  findElements(criteria: ElementSearchCriteria): Promise<ElementInfo[]>;
  getElementAttributes(element: ElementReference): Promise<ElementAttributes>;
  validateLocator(locator: LocatorDefinition): Promise<LocatorValidationResult>;
}
