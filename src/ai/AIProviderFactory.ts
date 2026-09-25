import type { AIProvider } from './AIProvider';
import { MockAIProvider } from './providers/MockAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { FrameworkError } from '../core/FrameworkError';
import type { FrameworkConfig } from '../config/schema';

/**
 * Resolves the configured AI provider. Any unrecognized provider name fails
 * clearly rather than silently falling back to the mock and fabricating
 * "AI-generated" output - see docs/ai.md.
 */
export function createAIProvider(config: FrameworkConfig): AIProvider {
  if (!config.ai.enabled) {
    throw new FrameworkError({
      stage: 'AI_PROVIDER',
      message: 'AI is disabled in configuration (ai.enabled: false).',
      recommendedAction: 'Set ai.enabled: true and configure ai.provider to run AI-backed stages.',
    });
  }

  const provider = (config.ai.provider || 'mock').toLowerCase();

  switch (provider) {
    case 'mock':
      return new MockAIProvider();
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    default:
      throw new FrameworkError({
        stage: 'AI_PROVIDER',
        message: `AI provider "${config.ai.provider}" is not configured/implemented.`,
        possibleCause:
          'Only "mock", "anthropic" and "openai" ship with the framework core; other real providers are pluggable but must be added and wired in AIProviderFactory.',
        recommendedAction:
          'Set ai.provider to "mock", "anthropic" or "openai", or implement and register another AIProvider. See docs/ai.md.',
      });
  }
}
