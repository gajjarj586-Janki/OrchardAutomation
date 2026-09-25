import fs from 'node:fs';
import path from 'node:path';
import type { RequirementInput, GeneratedFeature } from './types';
import type { AIClient } from '../ai/AIClient';
import { GeneratedFeatureSchema } from '../ai/schemas/generatedFeatureSchema';
import { validateFeatureFile } from './validators/GherkinValidator';

export interface GenerateFeatureOptions {
  aiClient: AIClient;
  featuresDir: string;
  dryRun?: boolean;
}

export type FeatureGenerationStatus = 'CREATED' | 'UPDATED' | 'UNCHANGED' | 'DRY_RUN';

export interface FeatureGenerationResult {
  requirementId: string;
  featurePath: string;
  status: FeatureGenerationStatus;
  scenarioCount: number;
}

function featurePathForRequirement(input: RequirementInput, featuresDir: string): string {
  const baseName = path.basename(input.id, path.extname(input.id));
  return path.join(featuresDir, `${baseName}.feature`);
}

/**
 * Requirement -> AI -> validated Gherkin -> features/*.feature.
 *
 * The AI response goes through schema validation (GeneratedFeatureSchema)
 * then content/syntax validation (validateFeatureFile) inside
 * AIClient.withValidation, which retries up to ai.maxRetries times and
 * rejects the output entirely if it never passes. The file is only written
 * when its content actually changed, so re-running generation is idempotent.
 */
export async function generateFeatureForRequirement(
  input: RequirementInput,
  options: GenerateFeatureOptions
): Promise<FeatureGenerationResult> {
  const featurePath = featurePathForRequirement(input, options.featuresDir);

  const generated = await options.aiClient.withValidation<GeneratedFeature>({
    stage: 'FEATURE_GENERATION',
    operation: () => options.aiClient.provider.generateFeature(input),
    validate: (result) => {
      const schemaResult = GeneratedFeatureSchema.safeParse(result);
      if (!schemaResult.success) {
        return {
          valid: false,
          errors: schemaResult.error.issues.map(
            (issue) => `schema: ${issue.path.join('.') || '(root)'}: ${issue.message}`
          ),
        };
      }
      const contentResult = validateFeatureFile(schemaResult.data.content, input.sourcePath);
      return { valid: contentResult.valid, errors: contentResult.errors };
    },
  });

  const scenarioCount = validateFeatureFile(generated.content, featurePath).scenarioCount;

  if (options.dryRun) {
    return { requirementId: input.id, featurePath, status: 'DRY_RUN', scenarioCount };
  }

  const existing = fs.existsSync(featurePath) ? fs.readFileSync(featurePath, 'utf-8') : null;

  if (existing === generated.content) {
    return { requirementId: input.id, featurePath, status: 'UNCHANGED', scenarioCount };
  }

  fs.mkdirSync(options.featuresDir, { recursive: true });
  fs.writeFileSync(featurePath, generated.content, 'utf-8');

  return {
    requirementId: input.id,
    featurePath,
    status: existing === null ? 'CREATED' : 'UPDATED',
    scenarioCount,
  };
}
