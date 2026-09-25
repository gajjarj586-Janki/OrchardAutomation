import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankCandidates } from './LocatorRanking';
import type { LocatorCandidate } from '../healer/LocatorCandidate';

function candidate(strategy: LocatorCandidate['strategy'], confidence: number): LocatorCandidate {
  return {
    locator: { strategy, value: 'x' },
    strategy,
    confidence,
    reason: 'test',
    evidence: [],
    validated: false,
  };
}

test('rankCandidates sorts by confidence descending', () => {
  const ranked = rankCandidates([candidate('css', 0.3), candidate('role', 0.9)]);
  assert.equal(ranked[0]?.strategy, 'role');
  assert.equal(ranked[1]?.strategy, 'css');
});

test('rankCandidates breaks confidence ties by strategy priority', () => {
  const ranked = rankCandidates([candidate('css', 0.5), candidate('role', 0.5)]);
  assert.equal(ranked[0]?.strategy, 'role');
  assert.equal(ranked[1]?.strategy, 'css');
});
