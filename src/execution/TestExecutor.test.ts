import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { runPlaywrightTests } from './TestExecutor';

function fakeSpawn(exitCode: number | null) {
  return () => {
    const child = new EventEmitter() as unknown as ChildProcess;
    setImmediate(() => child.emit('close', exitCode));
    return child;
  };
}

test('runPlaywrightTests resolves success:true on exit code 0', async () => {
  const result = await runPlaywrightTests({ spawnFn: fakeSpawn(0) as never });
  assert.equal(result.success, true);
  assert.equal(result.exitCode, 0);
});

test('runPlaywrightTests resolves success:false on a non-zero exit code', async () => {
  const result = await runPlaywrightTests({ spawnFn: fakeSpawn(1) as never });
  assert.equal(result.success, false);
  assert.equal(result.exitCode, 1);
});

test('runPlaywrightTests rejects when the subprocess itself errors', async () => {
  const spawnFn = () => {
    const child = new EventEmitter() as unknown as ChildProcess;
    setImmediate(() => child.emit('error', new Error('spawn ENOENT')));
    return child;
  };
  await assert.rejects(() => runPlaywrightTests({ spawnFn: spawnFn as never }));
});
