import { z } from 'zod';

/**
 * Canonical shape of framework configuration. This schema is the single
 * source of truth - anything reading config must go through it so invalid
 * or incomplete configuration is rejected before any pipeline stage runs.
 */
export const ConfigSchema = z.object({
  project: z.object({
    name: z.string().min(1, 'project.name is required'),
  }),

  application: z.object({
    baseUrl: z.string().default(''),
  }),

  execution: z.object({
    browser: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
    headless: z.boolean().default(true),
    timeout: z.number().int().positive().default(30000),
    navigationTimeout: z.number().int().positive().default(30000),
    retries: z.number().int().min(0).default(1),
    workers: z.number().int().positive().default(1),
    screenshot: z.enum(['off', 'on', 'only-on-failure']).default('only-on-failure'),
    trace: z
      .enum(['off', 'on', 'retain-on-failure', 'on-first-retry'])
      .default('retain-on-failure'),
    video: z
      .enum(['off', 'on', 'retain-on-failure', 'on-first-retry'])
      .default('retain-on-failure'),
  }),

  ai: z.object({
    enabled: z.boolean().default(true),
    provider: z.string().default('mock'),
    model: z.string().default(''),
    maxRetries: z.number().int().min(0).max(10).default(3),
  }),

  mcp: z.object({
    enabled: z.boolean().default(true),
    provider: z.string().default(''),
  }),

  healing: z.object({
    enabled: z.boolean().default(true),
    autoHeal: z.boolean().default(true),
    autoPatch: z.boolean().default(false),
    autoCommit: z.boolean().default(false),
    autoMerge: z.boolean().default(false),
    maxAttempts: z.number().int().min(1).max(10).default(3),
    targetedRetry: z.boolean().default(true),
    regressionAfterHealing: z.boolean().default(true),
    regressionScope: z.enum(['affected', 'full']).default('affected'),
  }),
});

export type FrameworkConfig = z.infer<typeof ConfigSchema>;
