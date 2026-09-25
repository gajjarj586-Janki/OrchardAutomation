import type {
  LocatorDefinition,
  LocatorStrategy,
  LocatorValidationResult,
} from '../locator/LocatorDefinition';
import type { Evidence } from '../ai/types';

export interface LocatorCandidate {
  locator: LocatorDefinition;
  strategy: LocatorStrategy;
  /** Heuristic score in [0, 1]. Never treated as proof - validation is still required. */
  confidence: number;
  reason: string;
  evidence: Evidence[];
  validated: boolean;
  validationResult?: LocatorValidationResult;
}
