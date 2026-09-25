export interface FrameworkErrorDetails {
  stage: string;
  message: string;
  possibleCause?: string;
  recommendedAction?: string;
  cause?: unknown;
}

/**
 * Every stage in the pipeline must fail with one of these instead of a bare
 * Error, so console/report output always answers: what stage, what broke,
 * why it probably broke, and what to do about it. See "ERROR HANDLING" in
 * the framework requirements.
 */
export class FrameworkError extends Error {
  public readonly stage: string;
  public readonly possibleCause?: string;
  public readonly recommendedAction?: string;

  constructor(details: FrameworkErrorDetails) {
    super(details.message);
    this.name = 'FrameworkError';
    this.stage = details.stage;
    this.possibleCause = details.possibleCause;
    this.recommendedAction = details.recommendedAction;
    if (details.cause !== undefined) {
      this.cause = details.cause;
    }
  }

  toStructured(): {
    stage: string;
    error: string;
    possibleCause?: string;
    recommendedAction?: string;
  } {
    return {
      stage: this.stage,
      error: this.message,
      possibleCause: this.possibleCause,
      recommendedAction: this.recommendedAction,
    };
  }
}
