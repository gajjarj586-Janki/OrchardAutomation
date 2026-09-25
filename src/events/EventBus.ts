import type { Logger } from '../logging/Logger';
import type { FrameworkEvent, FrameworkEventName } from './EventTypes';

/**
 * Records every structured audit event for one execution (in-memory) and
 * forwards it to the logger. The buffer is what reporting (Phase 8) reads
 * to build the AI/healing reports, so nothing important should happen in
 * the pipeline without going through here.
 */
export class EventBus {
  private readonly events: FrameworkEvent[] = [];

  constructor(
    private readonly executionId: string,
    private readonly logger: Logger
  ) {}

  emit<TPayload extends Record<string, unknown>>(
    name: FrameworkEventName,
    payload: TPayload
  ): void {
    const event: FrameworkEvent<TPayload> = {
      name,
      executionId: this.executionId,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.events.push(event as FrameworkEvent);
    this.logger.info(name, { ...payload });
  }

  getEvents(): readonly FrameworkEvent[] {
    return this.events;
  }
}
