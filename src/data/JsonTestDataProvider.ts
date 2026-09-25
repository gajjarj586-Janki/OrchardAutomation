import fs from 'node:fs';
import path from 'node:path';
import type { TestDataProvider } from './TestDataProvider';
import { FrameworkError } from '../core/FrameworkError';

/**
 * Reads test-data/<file>.json, optionally drilling into a dot-path, e.g.
 * `get('users.standardUser')` reads test-data/users.json then `.standardUser`.
 * Test data stays separate from requirements/features by design - see
 * docs/test-data.md. Future providers (YAML, Faker, API, database) should
 * implement the same TestDataProvider interface.
 */
export class JsonTestDataProvider implements TestDataProvider {
  constructor(private readonly dataDir: string) {}

  async get<T>(key: string): Promise<T> {
    const [fileName, ...pathParts] = key.split('.');
    const filePath = path.join(this.dataDir, `${fileName}.json`);

    if (!fs.existsSync(filePath)) {
      throw new FrameworkError({
        stage: 'TEST_DATA',
        message: `Test data file not found: ${filePath}`,
        recommendedAction: `Create test-data/${fileName}.json, or check the key "${key}".`,
      });
    }

    let value: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const part of pathParts) {
      if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[part];
      } else {
        throw new FrameworkError({
          stage: 'TEST_DATA',
          message: `Key "${key}" not found in ${filePath}`,
        });
      }
    }

    return value as T;
  }
}
