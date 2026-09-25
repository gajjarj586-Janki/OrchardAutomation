import { z } from 'zod';
import { LOCATOR_STRATEGY_PRIORITY } from '../../locator/LocatorDefinition';

export const LocatorDefinitionSchema = z.object({
  strategy: z.enum(LOCATOR_STRATEGY_PRIORITY),
  value: z.string().min(1),
  name: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

export const AISuggestedLocatorSchema = z.object({
  locator: LocatorDefinitionSchema,
  strategy: z.enum(LOCATOR_STRATEGY_PRIORITY),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

export const AISuggestedLocatorListSchema = z.array(AISuggestedLocatorSchema);
