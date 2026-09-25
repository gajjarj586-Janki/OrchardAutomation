import type { LocatorCandidate } from '../healer/LocatorCandidate';
import { LOCATOR_STRATEGY_PRIORITY } from './LocatorDefinition';

/**
 * Orders candidates highest-confidence first, breaking ties by the
 * framework's preferred strategy order (role > label > placeholder > text
 * > testId > css > xpath). Ranking is a heuristic ordering aid only - it
 * never substitutes for validation.
 */
export function rankCandidates(candidates: readonly LocatorCandidate[]): LocatorCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    return (
      LOCATOR_STRATEGY_PRIORITY.indexOf(a.strategy) - LOCATOR_STRATEGY_PRIORITY.indexOf(b.strategy)
    );
  });
}
