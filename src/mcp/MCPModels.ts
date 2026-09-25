import type { LocatorDefinition, LocatorValidationResult } from '../locator/LocatorDefinition';

export interface PageInspection {
  url: string;
  title: string;
  timestamp: string;
}

export interface PageStructure {
  /** Simplified DOM/landmark summary - shape is adapter-specific. */
  summary: string;
  landmarks?: string[];
}

export interface AccessibilitySnapshot {
  /** Raw accessibility tree as returned by the underlying MCP server. */
  tree: unknown;
}

export interface ElementSearchCriteria {
  role?: string;
  name?: string;
  text?: string;
  testId?: string;
}

export interface ElementInfo {
  role?: string;
  name?: string;
  tagName?: string;
  attributes?: Record<string, string>;
}

export interface ElementReference {
  /** Adapter-specific handle/id for a previously found element. */
  id: string;
}

export interface ElementAttributes {
  attributes: Record<string, string>;
}

export type { LocatorDefinition, LocatorValidationResult };
