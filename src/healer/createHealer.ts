import { loadConfig } from '../config/ConfigLoader';
import { rootLogger } from '../logging/Logger';
import { Healer } from './Healer';

let cached: Healer | undefined;

/**
 * Lazily builds one process-wide Healer from the ambient config, so
 * generated test files don't each have to assemble AI/MCP/history
 * dependencies themselves - they just call createHealer().
 */
export function createHealer(): Healer {
  if (!cached) {
    const config = loadConfig();
    cached = new Healer({ rootDir: process.cwd(), config, logger: rootLogger });
  }
  return cached;
}
