import { randomUUID } from 'node:crypto';
import type { FrameworkConfig } from '../config/schema';
import { Logger, rootLogger } from '../logging/Logger';

export interface StageResult {
  stage: string;
  status: 'PASS' | 'FAIL' | 'SKIPPED';
  detail?: string;
  durationMs: number;
}

/**
 * Carries the identity of a single `npm run ai:test` (or any single CLI
 * command) invocation through every stage: an executionId, the resolved
 * config, a context-bound logger, and the running list of stage results used
 * to build the final console summary and reports.
 */
export class ExecutionContext {
  public readonly executionId: string;
  public readonly startedAt: Date;
  public readonly config: FrameworkConfig;
  public readonly environmentName: string;
  public readonly logger: Logger;
  private readonly stageResults: StageResult[] = [];

  constructor(config: FrameworkConfig, environmentName?: string) {
    this.executionId = randomUUID();
    this.startedAt = new Date();
    this.config = config;
    this.environmentName =
      environmentName || process.env.APP_ENV || process.env.NODE_ENV || 'local';
    this.logger = rootLogger.child({
      executionId: this.executionId,
      project: config.project.name,
      environment: this.environmentName,
    });
  }

  recordStage(result: StageResult): void {
    this.stageResults.push(result);
  }

  getStageResults(): readonly StageResult[] {
    return this.stageResults;
  }

  toSummary(): {
    executionId: string;
    project: string;
    environment: string;
    startedAt: string;
    stages: StageResult[];
  } {
    return {
      executionId: this.executionId,
      project: this.config.project.name,
      environment: this.environmentName,
      startedAt: this.startedAt.toISOString(),
      stages: [...this.stageResults],
    };
  }
}
