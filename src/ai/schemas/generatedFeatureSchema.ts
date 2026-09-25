import { z } from 'zod';

/**
 * Schema for the structured response an AIProvider must return from
 * generateFeature. This is the first gate an AI response passes through
 * (schema validation) before content/syntax validation runs on `content`.
 */
export const GeneratedFeatureSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export type GeneratedFeatureShape = z.infer<typeof GeneratedFeatureSchema>;
