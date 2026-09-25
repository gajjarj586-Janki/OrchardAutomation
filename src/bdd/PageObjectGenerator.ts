import fs from 'node:fs';
import path from 'node:path';
import type { ParsedFeature } from './types';
import { templateStep, type StepTemplate } from './stepTemplate';
import { toPascalCase } from './naming';

export interface PageObjectGenerationOptions {
  pagesDir: string;
  dryRun?: boolean;
}

export type PageObjectGenerationStatus = 'CREATED' | 'EXISTS' | 'DRY_RUN';

export interface PageObjectGenerationResult {
  className: string;
  filePath: string;
  status: PageObjectGenerationStatus;
  /** Step methods the feature now needs that the existing file does not define. */
  missingMethods: string[];
}

export function uniqueStepTemplates(feature: ParsedFeature): StepTemplate[] {
  const byPattern = new Map<string, StepTemplate>();
  for (const scenario of feature.scenarios) {
    for (const stepText of scenario.steps) {
      const template = templateStep(stepText);
      byPattern.set(template.pattern, template);
    }
  }
  return [...byPattern.values()];
}

function stubMethodSource(template: StepTemplate, hasTargetUrl: boolean): string {
  // Leading underscore: these are unused until a human implements the method.
  const params = Array.from({ length: template.paramCount }, (_, i) => `_arg${i + 1}: string`).join(
    ', '
  );
  const message = hasTargetUrl
    ? `\`NOT_IMPLEMENTED: "${template.pattern}" has no real implementation yet. Implement this method for your application. Target URL: \${TARGET_URL}\``
    : `'NOT_IMPLEMENTED: "${template.pattern}" has no real implementation yet. Implement this method for your application.'`;
  return [
    `  async ${template.methodName}(${params}): Promise<void> {`,
    `    throw new Error(`,
    `      ${message}`,
    `    );`,
    `  }`,
  ].join('\n');
}

export function pageObjectClassNameForFeature(feature: ParsedFeature): string {
  const baseName = path.basename(feature.sourcePath, path.extname(feature.sourcePath));
  return `${toPascalCase(baseName)}Page`;
}

/**
 * Scaffolds (never overwrites) a Page Object for a feature: one stub method
 * per unique step pattern, each throwing NOT_IMPLEMENTED until a human
 * fills it in. If the file already exists, this only reports which of the
 * feature's current steps have no matching method - it never edits an
 * existing Page Object, so hand-written implementations are always safe.
 */
export function generatePageObjectForFeature(
  feature: ParsedFeature,
  options: PageObjectGenerationOptions
): PageObjectGenerationResult {
  const className = pageObjectClassNameForFeature(feature);
  const filePath = path.join(options.pagesDir, `${className}.ts`);
  const templates = uniqueStepTemplates(feature);

  if (fs.existsSync(filePath)) {
    const existingContent = fs.readFileSync(filePath, 'utf-8');
    const missingMethods = templates
      .map((t) => t.methodName)
      .filter((name) => !new RegExp(`\\b${name}\\s*\\(`).test(existingContent));
    return { className, filePath, status: 'EXISTS', missingMethods };
  }

  if (options.dryRun) {
    return {
      className,
      filePath,
      status: 'DRY_RUN',
      missingMethods: templates.map((t) => t.methodName),
    };
  }

  const content =
    [
      `import { BasePage } from '../BasePage';`,
      '',
      ...(feature.targetUrl
        ? [
            `// Target URL from the requirement ("Target URL: ..." metadata line) -`,
            `// use this in whichever step method navigates to the page.`,
            `const TARGET_URL = ${JSON.stringify(feature.targetUrl)};`,
            '',
          ]
        : []),
      `/**`,
      ` * Generated scaffold for feature "${feature.title}" (${path.basename(feature.sourcePath)}).`,
      ` * Regeneration never overwrites this file once it exists - fill in each`,
      ` * method with the real interaction for your application. Re-running`,
      ` * \`generate:steps\` will report new steps whose methods are missing`,
      ` * here, but will not touch existing methods.`,
      ` */`,
      `export class ${className} extends BasePage {`,
      templates.map((t) => stubMethodSource(t, Boolean(feature.targetUrl))).join('\n\n'),
      `}`,
    ].join('\n') + '\n';

  fs.mkdirSync(options.pagesDir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');

  return { className, filePath, status: 'CREATED', missingMethods: [] };
}
