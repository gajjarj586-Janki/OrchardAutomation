import { createAIProvider } from './AIProviderFactory';
import { AIClient } from './AIClient';
import type { FrameworkConfig } from '../config/schema';
import type { Logger } from '../logging/Logger';

export function createAIClient(config: FrameworkConfig, logger: Logger): AIClient {
  const provider = createAIProvider(config);
  return new AIClient(provider, config.ai.maxRetries, logger);
}
