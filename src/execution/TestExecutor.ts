import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';

export interface RunPlaywrightOptions {
  /** Extra argv passed to `playwright test`, e.g. a spec path or --grep. */
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Injection seam for tests - defaults to node:child_process.spawn. */
  spawnFn?: typeof nodeSpawn;
}

export interface RunPlaywrightResult {
  success: boolean;
  exitCode: number;
}

function resolvePlaywrightCli(cwd: string): string {
  // Resolve straight to Playwright's own JS entry point rather than shelling
  // out through `npx`/`npx.cmd` - avoids Windows' well-known spawn(EINVAL)
  // problems with .cmd wrapper scripts, and is faster (no npx resolution).
  // __dirname is a fallback resolution root so this still works when `cwd`
  // is a directory without its own node_modules (e.g. in tests).
  return require.resolve('@playwright/test/cli', { paths: [cwd, __dirname] });
}

/**
 * Runs `playwright test [...args]` as a subprocess (via node + Playwright's
 * own CLI entry point) and resolves once it exits, rather than importing
 * Playwright's runner in-process - this keeps the framework's own process
 * free to read the JSON/HTML reports Playwright writes afterward regardless
 * of how the run went.
 */
export function runPlaywrightTests(
  options: RunPlaywrightOptions = {}
): Promise<RunPlaywrightResult> {
  const spawnFn = options.spawnFn ?? nodeSpawn;
  const cwd = options.cwd ?? process.cwd();
  const cliPath = resolvePlaywrightCli(cwd);

  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawnFn(
      process.execPath,
      [cliPath, 'test', ...(options.args ?? [])],
      {
        cwd,
        stdio: 'inherit',
        env: options.env ?? process.env,
      }
    );

    child.on('error', reject);
    child.on('close', (code) => resolve({ success: code === 0, exitCode: code ?? 1 }));
  });
}
