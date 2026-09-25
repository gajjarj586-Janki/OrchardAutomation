import path from 'node:path';
import type { Page } from '@playwright/test';
import { AIClient } from '../ai/AIClient';
import { createAIProvider } from '../ai/AIProviderFactory';
import { MCPClient } from '../mcp/MCPClient';
import { createMCPClient } from '../mcp/MCPProviderFactory';
import { HealingHistory, type HealingAttemptRecord } from './HealingHistory';
import { attemptHeal } from './HealingEngine';
import type { FrameworkConfig } from '../config/schema';
import type { Logger } from '../logging/Logger';
import type { EventBus } from '../events/EventBus';
import type { TestFailure } from '../execution/TestFailure';

export interface HealerOptions {
  rootDir: string;
  config: FrameworkConfig;
  logger: Logger;
  events?: EventBus;
}

/**
 * Small facade that wires up everything a healing attempt needs (AI, MCP,
 * history) once, so CLI commands and the Playwright fixture layer both
 * call the same `Healer.heal(...)` instead of re-assembling dependencies.
 */
export class Healer {
  private readonly aiClient: AIClient;
  private readonly mcpClient: MCPClient;
  private readonly history: HealingHistory;
  private readonly config: FrameworkConfig;
  private readonly events?: EventBus;

  constructor(options: HealerOptions) {
    this.config = options.config;
    this.aiClient = new AIClient(
      createAIProvider(options.config),
      options.config.ai.maxRetries,
      options.logger
    );
    this.mcpClient = createMCPClient(options.config, options.logger);
    this.history = new HealingHistory(
      path.join(options.rootDir, 'healing', 'history', 'history.json')
    );
    this.events = options.events;
  }

  heal(failure: TestFailure, page?: Page): Promise<HealingAttemptRecord> {
    return attemptHeal(
      { failure, page },
      {
        aiClient: this.aiClient,
        mcpClient: this.mcpClient,
        config: this.config,
        history: this.history,
        events: this.events,
      }
    );
  }

  getHistory(): HealingHistory {
    return this.history;
  }
}
