import { test } from 'node:test';
import assert from 'node:assert/strict';
import type OpenAI from 'openai';
import { OpenAIProvider } from './OpenAIProvider';
import { ConfigSchema, type FrameworkConfig } from '../../config/schema';
import { GeneratedFeatureSchema } from '../schemas/generatedFeatureSchema';
import { AISuggestedLocatorListSchema } from '../schemas/locatorSuggestionSchema';
import { validateFeatureFile } from '../../bdd/validators/GherkinValidator';
import { isActionableText } from '../../locator/actionText';
import type { RequirementInput } from '../../bdd/types';

function makeConfig(model = 'gpt-test-model'): FrameworkConfig {
  return ConfigSchema.parse({
    project: { name: 'test-project' },
    application: {},
    execution: {},
    ai: { provider: 'openai', model },
    mcp: {},
    healing: {},
  });
}

/** A fake OpenAI client whose `chat.completions.create` returns one canned text reply. */
function fakeClient(text: string): Pick<OpenAI, 'chat'> {
  return {
    chat: {
      completions: {
        create: (async () => ({
          choices: [{ message: { content: text } }],
        })) as unknown as OpenAI['chat']['completions']['create'],
      },
    } as OpenAI['chat'],
  };
}

test('constructor throws a FrameworkError when AI_API_KEY is missing and no client is injected', () => {
  const original = process.env.AI_API_KEY;
  delete process.env.AI_API_KEY;
  try {
    assert.throws(() => new OpenAIProvider(makeConfig()), /AI_API_KEY/);
  } finally {
    if (original !== undefined) process.env.AI_API_KEY = original;
  }
});

test('constructor throws a FrameworkError when AI_MODEL is empty', () => {
  assert.throws(
    () => new OpenAIProvider(makeConfig(''), fakeClient('irrelevant')),
    /AI_MODEL/
  );
});

test('generateFeature produces valid, actionable Gherkin', async () => {
  const gherkin = [
    'Feature: Book a Test Drive',
    '',
    '  Scenario: Booking succeeds',
    '    Given the user is on the "book a test drive" page',
    '    When the user selects "KONA"',
    '    And the user clicks "Submit request"',
    '    Then a confirmation message is shown',
    '',
  ].join('\n');

  const provider = new OpenAIProvider(makeConfig(), fakeClient(gherkin));
  const input: RequirementInput = {
    id: 'book-a-test-drive.md',
    sourcePath: '/tmp/book-a-test-drive.md',
    title: 'Book a Test Drive',
    description: 'A customer books a test drive.',
    acceptanceCriteria: ['Booking succeeds'],
  };

  const result = await provider.generateFeature(input);

  const schemaResult = GeneratedFeatureSchema.safeParse(result);
  assert.equal(schemaResult.success, true);

  const validation = validateFeatureFile(result.content, input.sourcePath);
  assert.equal(validation.valid, true, validation.errors.join('; '));

  const actionableLines = result.content
    .split('\n')
    .map((l) => l.replace(/^\s*(Given|When|Then|And|But)\s+/i, '').trim())
    .filter((l) => isActionableText(l));
  assert.ok(actionableLines.length > 0, 'expected at least one actionable step');
});

test('generateFeature strips a markdown code fence if the model adds one anyway', async () => {
  const gherkin = 'Feature: Demo\n\n  Scenario: A\n    Given a precondition\n    Then an outcome\n';
  const provider = new OpenAIProvider(makeConfig(), fakeClient('```gherkin\n' + gherkin + '```'));
  const input: RequirementInput = {
    id: 'demo.md',
    sourcePath: '/tmp/demo.md',
    title: 'Demo',
    description: 'Demo.',
    acceptanceCriteria: ['A'],
  };

  const result = await provider.generateFeature(input);
  assert.equal(validateFeatureFile(result.content, input.sourcePath).valid, true);
  assert.doesNotMatch(result.content, /```/);
});

test('suggestLocator produces output matching AISuggestedLocatorListSchema', async () => {
  const json = JSON.stringify([
    {
      locator: { strategy: 'role', value: 'button', name: 'Submit request' },
      strategy: 'role',
      confidence: 0.8,
      reason: 'Accessible name matches the intended action.',
    },
  ]);
  const provider = new OpenAIProvider(makeConfig(), fakeClient(json));

  const result = await provider.suggestLocator({ intendedAction: 'the user clicks "Submit request"' });
  const parsed = AISuggestedLocatorListSchema.safeParse(result);
  assert.equal(parsed.success, true, parsed.success ? '' : JSON.stringify(parsed.error.issues));
  assert.equal(result[0]?.locator.name, 'Submit request');
});

test('suggestLocator throws a clear FrameworkError when the model does not return JSON', async () => {
  const provider = new OpenAIProvider(makeConfig(), fakeClient('not json at all'));
  await assert.rejects(
    () => provider.suggestLocator({ intendedAction: 'the user clicks "X"' }),
    /not valid JSON/
  );
});

test('analyzeFailure falls back to the deterministic summary when the AI call fails', async () => {
  const throwingClient: Pick<OpenAI, 'chat'> = {
    chat: {
      completions: {
        create: (async () => {
          throw new Error('network down');
        }) as unknown as OpenAI['chat']['completions']['create'],
      },
    } as OpenAI['chat'],
  };
  const provider = new OpenAIProvider(makeConfig(), throwingClient);

  const result = await provider.analyzeFailure({
    testName: 'demo test',
    error: 'locator.click: Timeout 1000ms exceeded.\nwaiting for getByRole(\'button\', { name: \'Confirmed\' })',
    timestamp: new Date().toISOString(),
  });

  assert.equal(result.isLocatorFailure, true);
  assert.match(result.summary, /deterministic parsing/);
});
