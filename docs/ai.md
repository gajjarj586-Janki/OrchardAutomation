# AI provider

## Interface

```ts
interface AIProvider {
  readonly name: string;
  generate(request: AIRequest): Promise<AIResponse>;
  generateStructured<T>(request: StructuredAIRequest, schema: unknown): Promise<T>;
  generateFeature(input: RequirementInput): Promise<GeneratedFeature>;
  generateStepDefinitions(feature: ParsedFeature): Promise<GeneratedSteps>;
  suggestLocator(context: LocatorContext): Promise<AISuggestedLocator[]>;
  analyzeFailure(failure: TestFailure): Promise<FailureAnalysis>;
  generateHealingSuggestion(context: HealingContext): Promise<HealingSuggestion>;
}
```

See `src/ai/AIProvider.ts` for the full types. `AIClient` wraps every call through `withValidation()`, which retries up to `ai.maxRetries` (config) times and rejects output that fails validation - the pipeline never executes unvalidated AI output.

## Configuring a provider

```env
AI_PROVIDER=mock
AI_API_KEY=
AI_MODEL=
```

Three providers ship today:

- **`mock`** (`src/ai/providers/MockAIProvider.ts`) - deterministic and offline, never presented as real AI output. Its `generateFeature()` always emits the same generic, non-actionable step phrasing regardless of the requirement - it exists to verify the pipeline's plumbing, not to produce usable Gherkin. This is the default.
- **`anthropic`** (`src/ai/providers/AnthropicProvider.ts`) - a real provider backed by Anthropic's Claude models via `@anthropic-ai/sdk`. Requires `AI_API_KEY` (a real Anthropic API key) and `AI_MODEL` (a Claude model id); the provider throws a clear `FrameworkError` at construction time if either is missing, rather than failing opaquely mid-pipeline. Its `generateFeature()` is prompted to produce Gherkin whose UI-interaction steps match the exact grammar `isActionableText()` (`src/locator/actionText.ts`) expects (`the user clicks "..."`, `the user fills "..."`, etc.) - this is what lets `discover:locators`/MCP actually find something to work with, unlike the mock's abstract phrasing. Its `analyzeFailure()` reuses the framework's own deterministic `parsePlaywrightError()` for the structural parse and only asks Claude for a better summary sentence, falling back to the deterministic summary if that call fails - an AI outage must never break a live healing attempt.
- **`openai`** (`src/ai/providers/OpenAIProvider.ts`) - the same shape as `anthropic`, backed by OpenAI's models via the `openai` SDK. Requires the same `AI_API_KEY`/`AI_MODEL` env vars (set to an OpenAI API key and an OpenAI model id, e.g. `gpt-4o-mini`) - only one real provider is configured at a time, so there's no need for provider-specific env var names. Same prompts, same JSON/Gherkin-grammar requirements, same defensive fallback in `analyzeFailure()`.

Setting `AI_PROVIDER` to anything else makes `AIProviderFactory.createAIProvider()` throw a clear `FrameworkError` rather than silently falling back to the mock - the framework never fabricates "AI-generated" output from an unconfigured provider.

## Adding another real provider

1. Implement `AIProvider` in a new file under `src/ai/providers/` (e.g. `OpenAIProvider.ts`), calling your provider's API for each method - `AnthropicProvider.ts` is a template for the shape (including an injectable-client constructor param for testing without a live network call).
2. Register it in `AIProviderFactory.createAIProvider()`'s switch, keyed by the `ai.provider` value that should select it.
3. Never skip schema/content validation for real-provider output - it needs it more than the mock does.
4. Test it manually against a project before trusting it in CI; this framework's own unit tests (`test:unit`) never call a real provider - see [troubleshooting.md](./troubleshooting.md).
