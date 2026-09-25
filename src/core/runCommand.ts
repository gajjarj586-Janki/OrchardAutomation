import path from 'node:path';
import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';

/**
 * Resolves a package's bin script by locating its package.json first, then
 * joining the bin's relative path onto that directory - some packages'
 * "exports" map does not expose bin/* for direct require.resolve(), even
 * though the file is a normal, always-present part of the package.
 */
export function resolvePackageBin(
  packageName: string,
  binRelativePath: string,
  roots: string[]
): string {
  const pkgJsonPath = require.resolve(`${packageName}/package.json`, { paths: roots });
  return path.join(path.dirname(pkgJsonPath), binRelativePath);
}

export interface RunCommandResult {
  success: boolean;
  exitCode: number;
}

/**
 * Generic "run a Node-resolvable CLI script as a subprocess" helper, used
 * for typecheck/lint during the pipeline's Code Validation stage. Resolving
 * the script path with require.resolve and invoking it via `node <script>`
 * avoids the Windows spawn(EINVAL) problems `.cmd` wrapper scripts hit -
 * see TestExecutor.ts for the same pattern applied to Playwright.
 */
export function runNodeScript(
  scriptPath: string,
  args: string[],
  options: { cwd: string; spawnFn?: typeof nodeSpawn }
): Promise<RunCommandResult> {
  const spawnFn = options.spawnFn ?? nodeSpawn;

  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawnFn(process.execPath, [scriptPath, ...args], {
      cwd: options.cwd,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => resolve({ success: code === 0, exitCode: code ?? 1 }));
  });
}
