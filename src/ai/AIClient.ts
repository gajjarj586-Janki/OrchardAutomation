import type { AIProvider } from './AIProvider';
import type { Logger } from '../logging/Logger';
import { FrameworkError } from '../core/FrameworkError';

export interface ValidationOutcome {
  valid: boolean;
  errors: string[];
}

export interface WithValidationParams<T> {
  /** Stage name used in errors/events, e.g. "FEATURE_GENERATION". */
  stage: string;
  operation: () => Promise<T>;
  validate: (result: T) => ValidationOutcome;
}

/**
 * Wraps AIProvider calls with the "AI is untrusted" contract: run the
 * operation, validate its output, and if validation fails regenerate up to
 * `maxRetries` total attempts before rejecting outright. Never retries
 * unboundedly - see ai.maxRetries in config/default.yaml.
 */
export class AIClient {
  constructor(
    public readonly provider: AIProvider,
    private readonly maxRetries: number,
    private readonly logger: Logger
  ) {}

  async withValidation<T>(params: WithValidationParams<T>): Promise<T> {
    const attempts = Math.max(1, this.maxRetries);
    let lastErrors: string[] = ['(no attempts were made)'];

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const result = await params.operation();
      const outcome = params.validate(result);

      if (outcome.valid) {
        if (attempt > 1) {
          this.logger.info(`AI output passed validation on retry ${attempt}/${attempts}`, {
            stage: params.stage,
          });
        }
        return result;
      }

      lastErrors = outcome.errors;
      this.logger.warn(`AI output failed validation (attempt ${attempt}/${attempts})`, {
        stage: params.stage,
        errors: outcome.errors,
      });
    }

    throw new FrameworkError({
      stage: params.stage,
      message: `AI output failed validation after ${attempts} attempt(s) via provider "${this.provider.name}":\n${lastErrors
        .map((e) => `  - ${e}`)
        .join('\n')}`,
      possibleCause:
        'The AI provider produced output that did not pass schema/content/syntax validation.',
      recommendedAction: `Review the input, or adjust ai.maxRetries (currently ${this.maxRetries}). Never remove validation to force success.`,
    });
  }
}
