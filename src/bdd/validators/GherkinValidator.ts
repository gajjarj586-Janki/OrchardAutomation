import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';

export interface GherkinValidationResult {
  valid: boolean;
  errors: string[];
  scenarioCount: number;
}

const SECRET_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'password', pattern: /password\s*[:=]\s*\S+/i },
  { label: 'api key', pattern: /api[_-]?key\s*[:=]\s*\S+/i },
  { label: 'secret', pattern: /secret\s*[:=]\s*\S+/i },
  { label: 'bearer token', pattern: /bearer\s+[a-z0-9\-_.]{10,}/i },
  { label: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/ },
];

function parseGherkin(content: string) {
  const builder = new AstBuilder(IdGenerator.uuid());
  const matcher = new GherkinClassicTokenMatcher();
  return new Parser(builder, matcher).parse(content);
}

/**
 * Real Gherkin syntax validation (via @cucumber/gherkin) plus the minimal
 * structural rules the framework requires: a Feature, at least one
 * Scenario, every scenario named and non-empty.
 */
export function validateGherkinSyntax(
  content: string,
  sourcePath: string
): GherkinValidationResult {
  let document: ReturnType<typeof parseGherkin>;
  try {
    document = parseGherkin(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      errors: [`Gherkin syntax error in ${sourcePath}:\n${message}`],
      scenarioCount: 0,
    };
  }

  const errors: string[] = [];
  const feature = document.feature;

  if (!feature) {
    return { valid: false, errors: [`${sourcePath}: document has no Feature.`], scenarioCount: 0 };
  }

  const scenarioChildren = feature.children.filter((child) => child.scenario);

  if (scenarioChildren.length === 0) {
    errors.push(`${sourcePath}: Feature "${feature.name}" has no Scenario.`);
  }

  for (const child of scenarioChildren) {
    const scenario = child.scenario;
    if (!scenario) continue;
    if (!scenario.name || scenario.name.trim().length === 0) {
      errors.push(`${sourcePath}: a Scenario is missing a name.`);
    }
    if (scenario.steps.length === 0) {
      errors.push(`${sourcePath}: Scenario "${scenario.name}" has no steps.`);
    }
  }

  return { valid: errors.length === 0, errors, scenarioCount: scenarioChildren.length };
}

/**
 * Detects likely secrets/credentials so they never ship inside a committed
 * .feature file. Never a substitute for real secret scanning in CI, but
 * catches the obvious cases the framework itself must not introduce.
 */
export function validateGherkinContent(
  content: string,
  sourcePath: string
): GherkinValidationResult {
  const errors: string[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    for (const { label, pattern } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        errors.push(`${sourcePath}:${index + 1}: line looks like it contains a ${label}.`);
      }
    }
  });

  return { valid: errors.length === 0, errors, scenarioCount: 0 };
}

export function validateFeatureFile(content: string, sourcePath: string): GherkinValidationResult {
  const syntax = validateGherkinSyntax(content, sourcePath);
  const contentCheck = validateGherkinContent(content, sourcePath);
  return {
    valid: syntax.valid && contentCheck.valid,
    errors: [...syntax.errors, ...contentCheck.errors],
    scenarioCount: syntax.scenarioCount,
  };
}
