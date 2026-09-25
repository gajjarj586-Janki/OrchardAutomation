import fs from 'node:fs';
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import type { ParsedFeature } from './types';
import { FrameworkError } from '../core/FrameworkError';

const TARGET_URL_COMMENT_PATTERN = /^#\s*target[\s_-]*url\s*:\s*(.+)$/i;

/** Reads the "# Target-URL: <url>" comment MockAIProvider embeds, if present. */
function extractTargetUrl(comments: readonly { text: string }[]): string | undefined {
  for (const comment of comments) {
    const match = comment.text.trim().match(TARGET_URL_COMMENT_PATTERN);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function stepKeywordAndText(rawKeyword: string, rawText: string): string {
  const keyword = rawKeyword.trim().toLowerCase();
  // "And"/"But" inherit the previous step's grammatical role but carry no
  // semantic meaning of their own, so callers match on `text` alone anyway.
  if (keyword === 'and' || keyword === 'but' || keyword === '*') {
    return rawText.trim();
  }
  return rawText.trim();
}

/**
 * Parses a .feature file's Gherkin text into the framework's own
 * ParsedFeature shape (title + scenarios + step text), which is all the
 * StepGenerator and ScenarioRunner need. Assumes the content already passed
 * validateGherkinSyntax - this throws on genuinely malformed input rather
 * than trying to recover from it.
 */
export function parseFeatureContent(content: string, sourcePath: string): ParsedFeature {
  const builder = new AstBuilder(IdGenerator.uuid());
  const matcher = new GherkinClassicTokenMatcher();
  const parser = new Parser(builder, matcher);

  let document;
  try {
    document = parser.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new FrameworkError({
      stage: 'FEATURE_PARSING',
      message: `Failed to parse feature file ${sourcePath}:\n${message}`,
      recommendedAction: 'Run `npm run validate:features` first and fix reported syntax errors.',
    });
  }

  const feature = document.feature;
  if (!feature) {
    throw new FrameworkError({
      stage: 'FEATURE_PARSING',
      message: `${sourcePath} has no Feature.`,
    });
  }

  const scenarios = feature.children
    .filter((child) => child.scenario)
    .map((child) => {
      const scenario = child.scenario!;
      return {
        name: scenario.name,
        steps: scenario.steps.map((step) => stepKeywordAndText(step.keyword, step.text)),
      };
    });

  const targetUrl = extractTargetUrl(document.comments ?? []);

  return { title: feature.name, scenarios, sourcePath, ...(targetUrl ? { targetUrl } : {}) };
}

export function parseFeatureFile(filePath: string): ParsedFeature {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseFeatureContent(content, filePath);
}
