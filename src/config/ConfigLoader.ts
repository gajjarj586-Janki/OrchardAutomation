import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { parse as parseYaml } from 'yaml';
import { ConfigSchema, type FrameworkConfig } from './schema';
import { deepMerge, type PlainObject } from '../utils/deepMerge';
import { FrameworkError } from '../core/FrameworkError';

export interface LoadConfigOptions {
  /** Repository root. Defaults to process.cwd(). */
  rootDir?: string;
  /** Explicit config file to layer on top of config/default.yaml + config/local.yaml. */
  configFile?: string;
  /**
   * Environment name (e.g. "dev", "stage", "prod") whose
   * config/environments/<env>.yaml should be layered in. Defaults to
   * APP_ENV, then NODE_ENV, from the environment. An explicitly passed
   * `env` with no matching file is an error; one resolved ambiently from
   * APP_ENV/NODE_ENV is not (so e.g. NODE_ENV=test doesn't require a
   * config/environments/test.yaml to exist).
   */
  env?: string;
}

function readYamlFile(filePath: string): PlainObject {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(raw);
  if (parsed === null || parsed === undefined) {
    return {};
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new FrameworkError({
      stage: 'CONFIGURATION',
      message: `Config file did not parse to an object: ${filePath}`,
      possibleCause: 'The YAML file root must be a mapping (key: value pairs).',
      recommendedAction: `Check the structure of ${filePath}.`,
    });
  }
  return parsed as PlainObject;
}

function applyEnvOverrides(config: PlainObject): PlainObject {
  const env = process.env;
  const overrides: PlainObject = {};

  if (env.APP_BASE_URL) {
    overrides.application = { baseUrl: env.APP_BASE_URL };
  }
  if (env.AI_PROVIDER || env.AI_MODEL) {
    overrides.ai = {
      ...(env.AI_PROVIDER ? { provider: env.AI_PROVIDER } : {}),
      ...(env.AI_MODEL ? { model: env.AI_MODEL } : {}),
    };
  }
  if (env.MCP_PROVIDER) {
    overrides.mcp = { provider: env.MCP_PROVIDER };
  }

  return deepMerge(config, overrides);
}

/**
 * Loads framework configuration from (in increasing precedence):
 *   1. config/default.yaml                    - ships with the framework, generic
 *   2. config/environments/<env>.yaml          - optional, per-environment (dev/stage/prod/...)
 *   3. config/local.yaml                       - optional, git-ignored, per-machine
 *   4. an explicit --config file               - optional
 *   5. environment variables (.env)            - AI_PROVIDER, MCP_PROVIDER, APP_BASE_URL, ...
 * then validates the merged result against ConfigSchema. Throws a
 * FrameworkError describing exactly what is invalid rather than letting a
 * pipeline stage run against malformed configuration.
 */
export function loadConfig(options: LoadConfigOptions = {}): FrameworkConfig {
  const rootDir = options.rootDir ?? process.cwd();

  const envFile = path.join(rootDir, '.env');
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  }

  const defaultConfigPath = path.join(rootDir, 'config', 'default.yaml');
  if (!fs.existsSync(defaultConfigPath)) {
    throw new FrameworkError({
      stage: 'CONFIGURATION',
      message: `Missing required base configuration file: ${defaultConfigPath}`,
      possibleCause:
        'config/default.yaml was deleted or the framework is running from the wrong directory.',
      recommendedAction: 'Restore config/default.yaml from the framework repository.',
    });
  }

  let merged: PlainObject = readYamlFile(defaultConfigPath);

  const explicitEnv = options.env;
  const ambientEnv = process.env.APP_ENV || process.env.NODE_ENV;
  const envName = explicitEnv || ambientEnv;

  if (envName) {
    const envConfigPath = path.join(rootDir, 'config', 'environments', `${envName}.yaml`);
    if (fs.existsSync(envConfigPath)) {
      merged = deepMerge(merged, readYamlFile(envConfigPath));
    } else if (explicitEnv) {
      throw new FrameworkError({
        stage: 'CONFIGURATION',
        message: `No environment config found for "${explicitEnv}": ${envConfigPath}`,
        possibleCause: 'The environment name is misspelled, or the file was never created.',
        recommendedAction: `Create config/environments/${explicitEnv}.yaml, or check --env/APP_ENV.`,
      });
    }
    // else: an ambient APP_ENV/NODE_ENV (e.g. "test") with no matching file
    // is not an error - only an explicit --env is required to resolve.
  }

  const localConfigPath = path.join(rootDir, 'config', 'local.yaml');
  if (fs.existsSync(localConfigPath)) {
    merged = deepMerge(merged, readYamlFile(localConfigPath));
  }

  if (options.configFile) {
    const explicitPath = path.isAbsolute(options.configFile)
      ? options.configFile
      : path.join(rootDir, options.configFile);
    if (!fs.existsSync(explicitPath)) {
      throw new FrameworkError({
        stage: 'CONFIGURATION',
        message: `Config file not found: ${explicitPath}`,
        recommendedAction: 'Check the --config path passed to the CLI.',
      });
    }
    merged = deepMerge(merged, readYamlFile(explicitPath));
  }

  merged = applyEnvOverrides(merged);

  const result = ConfigSchema.safeParse(merged);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new FrameworkError({
      stage: 'CONFIGURATION',
      message: `Configuration failed schema validation:\n${issues}`,
      possibleCause:
        'config/default.yaml, config/local.yaml, or environment variables contain invalid values.',
      recommendedAction: 'Fix the reported fields and re-run. See docs/configuration.md.',
    });
  }

  return result.data;
}
