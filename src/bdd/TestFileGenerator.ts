import fs from 'node:fs';
import path from 'node:path';
import type { ParsedFeature } from './types';

export interface TestGenerationOptions {
  testsDir: string;
  dryRun?: boolean;
}

export type TestGenerationStatus = 'CREATED' | 'UPDATED' | 'UNCHANGED' | 'DRY_RUN';

export interface TestGenerationResult {
  filePath: string;
  status: TestGenerationStatus;
  scenarioCount: number;
}

/**
 * Generates `tests/generated/<feature>.spec.ts`: one Playwright `test()`
 * per Scenario, whose body replays the scenario's raw step texts through
 * ScenarioRunner against whatever step definitions the matching
 * `steps/<feature>.steps.ts` file registered. Nothing here is
 * application-specific - it is pure Feature -> Playwright wiring.
 */
export function generateTestFileForFeature(
  feature: ParsedFeature,
  options: TestGenerationOptions
): TestGenerationResult {
  const baseName = path.basename(feature.sourcePath, path.extname(feature.sourcePath));
  const filePath = path.join(options.testsDir, `${baseName}.spec.ts`);

  const testBlocks = feature.scenarios.map((scenario) => {
    const stepsLiteral = scenario.steps.map((step) => `    ${JSON.stringify(step)},`).join('\n');
    return [
      `  test(${JSON.stringify(scenario.name)}, async ({ page }) => {`,
      `    await runScenario({ page }, [`,
      stepsLiteral,
      `    ], {`,
      `      testName: ${JSON.stringify(scenario.name)},`,
      `      scenario: ${JSON.stringify(scenario.name)},`,
      `      feature: ${JSON.stringify(feature.title)},`,
      `      registry: stepRegistry,`,
      `      healer: createHealer(),`,
      `    });`,
      `  });`,
    ].join('\n');
  });

  const content =
    [
      `// Generated from features/${path.basename(feature.sourcePath)} - do not edit by hand.`,
      `// Re-run \`npm run generate:tests\` after the feature changes.`,
      `import { test } from '../../src/fixtures/frameworkTest';`,
      `import { runScenario } from '../../src/bdd/ScenarioRunner';`,
      `import { createHealer } from '../../src/healer/createHealer';`,
      `import { stepRegistry } from '../../steps/${baseName}.steps';`,
      '',
      `test.describe(${JSON.stringify(feature.title)}, () => {`,
      testBlocks.length > 0 ? testBlocks.join('\n\n') : '  // No scenarios in this feature yet.',
      `});`,
    ].join('\n') + '\n';

  if (options.dryRun) {
    return { filePath, status: 'DRY_RUN', scenarioCount: feature.scenarios.length };
  }

  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
  if (existing === content) {
    return { filePath, status: 'UNCHANGED', scenarioCount: feature.scenarios.length };
  }

  fs.mkdirSync(options.testsDir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    filePath,
    status: existing === null ? 'CREATED' : 'UPDATED',
    scenarioCount: feature.scenarios.length,
  };
}
