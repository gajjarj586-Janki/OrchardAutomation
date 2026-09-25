import { MCPClient } from './MCPClient';
import { PlaywrightMCPAdapter } from './adapters/PlaywrightMCPAdapter';
import type { FrameworkConfig } from '../config/schema';
import type { Logger } from '../logging/Logger';

/**
 * Resolves the configured MCP provider. See src/mcp/adapters/README.md for
 * how to add another one; an unrecognized provider name (or none configured)
 * returns an unconfigured MCPClient and logs exactly why - callers must
 * report MCP-dependent stages as SKIPPED, never fabricate a result.
 */
export function createMCPClient(config: FrameworkConfig, logger: Logger): MCPClient {
  if (!config.mcp.enabled) {
    logger.warn('MCP is disabled in configuration (mcp.enabled: false).', {
      status: 'MCP NOT CONFIGURED',
    });
    return new MCPClient(null);
  }

  if (!config.mcp.provider) {
    logger.warn('No mcp.provider configured. MCP-dependent stages will be reported as SKIPPED.', {
      status: 'MCP NOT CONFIGURED',
    });
    return new MCPClient(null);
  }

  switch (config.mcp.provider.toLowerCase()) {
    case 'playwright':
      return new MCPClient(new PlaywrightMCPAdapter(config, logger));
    default:
      logger.warn(
        `MCP provider "${config.mcp.provider}" has no adapter implementation in this framework core. MCP-dependent stages will be reported as SKIPPED.`,
        { status: 'MCP NOT CONFIGURED', requestedProvider: config.mcp.provider }
      );
      return new MCPClient(null);
  }
}
