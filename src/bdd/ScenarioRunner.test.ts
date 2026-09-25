import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from '@playwright/test';
import { createStepRegistry, type StepWorld } from './StepRegistry';
import { runScenario } from './ScenarioRunner';
import { FrameworkError } from '../core/FrameworkError';

const fakeWorld: StepWorld = { page: {} as unknown as Page };

test('runScenario dispatches each step to its matching handler with extracted args', async () => {
  const { registry, defineStep } = createStepRegistry();
  const calls: Array<{ step: string; args: string[] }> = [];

  defineStep('a precondition {string}', async (_world, arg1) => {
    calls.push({ step: 'precondition', args: [arg1] });
  });
  defineStep('an outcome', async () => {
    calls.push({ step: 'outcome', args: [] });
  });

  await runScenario(fakeWorld, ['a precondition "value"', 'an outcome'], {
    testName: 'test',
    registry,
  });

  assert.deepEqual(calls, [
    { step: 'precondition', args: ['value'] },
    { step: 'outcome', args: [] },
  ]);
});

test('runScenario throws a FrameworkError when no step definition matches', async () => {
  const { registry, defineStep } = createStepRegistry();
  defineStep('a known step', async () => {});

  await assert.rejects(
    () => runScenario(fakeWorld, ['an unknown step'], { testName: 'test', registry }),
    FrameworkError
  );
});
