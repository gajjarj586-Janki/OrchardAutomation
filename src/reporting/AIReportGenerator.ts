import fs from 'node:fs';
import path from 'node:path';
import type { FrameworkConfig } from '../config/schema';
import type { FrameworkEvent } from '../events/EventTypes';

const AI_EVENT_NAMES = new Set([
  'FEATURE_GENERATED',
  'STEP_GENERATED',
  'LOCATOR_DISCOVERED',
  'LOCATOR_VALIDATED',
  'FAILURE_ANALYZED',
  'HEALING_CANDIDATE_FOUND',
]);

export interface AIReport {
  enabled: boolean;
  provider: string;
  model?: string;
  operations: Array<{ name: string; timestamp: string; payload: Record<string, unknown> }>;
}

/** Everything the AI provider did this execution, straight from the audit event log. */
export function buildAIReport(
  config: FrameworkConfig,
  events: readonly FrameworkEvent[]
): AIReport {
  return {
    enabled: config.ai.enabled,
    provider: config.ai.provider,
    model: config.ai.model || undefined,
    operations: events
      .filter((event) => AI_EVENT_NAMES.has(event.name))
      .map((event) => ({ name: event.name, timestamp: event.timestamp, payload: event.payload })),
  };
}

export function writeAIReport(report: AIReport, filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
}
