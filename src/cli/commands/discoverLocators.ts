import fs from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { bootstrapCli, reportFrameworkError } from '../bootstrap';
import { FrameworkError } from '../../core/FrameworkError';
import { parseFeatureFile } from '../../bdd/FeatureParser';
import { discoverLocatorsForFeature } from '../../locator/LocatorDiscovery';
import { createAIClient } from '../../ai/createAIClient';
import { createMCPClient } from '../../mcp/MCPProviderFactory';

export function registerDiscoverLocatorsCommand(program: Command): void {
  program
    .command('discover:locators')
    .description(
      'Discover locator candidates for actionable steps in features/*.feature (AI-suggested, MCP-validated when configured).'
    )
    .action(async () => {
      try {
        const { rootDir, ctx, events } = bootstrapCli();
        const featuresDir = path.join(rootDir, 'features');
        const aiClient = createAIClient(ctx.config, ctx.logger);
        const mcpClient = createMCPClient(ctx.config, ctx.logger);

        if (!fs.existsSync(featuresDir)) {
          console.log(
            `No features directory found at ${featuresDir}. Run generate:features first.`
          );
          return;
        }

        const files = fs
          .readdirSync(featuresDir)
          .filter((name) => name.endsWith('.feature'))
          .sort();

        if (files.length === 0) {
          console.log(`No .feature files found in ${featuresDir}.`);
          return;
        }

        for (const name of files) {
          const feature = parseFeatureFile(path.join(featuresDir, name));
          const result = await discoverLocatorsForFeature(feature, aiClient, mcpClient);

          console.log(`\n${name}: ${result.actionableStepCount} actionable step(s)`);

          if (result.actionableStepCount === 0) {
            console.log('  (no steps look like a concrete UI interaction - nothing to discover)');
            continue;
          }

          if (result.mcpStatus !== 'OK') {
            console.log(`  MCP: SKIPPED (${result.mcpNote ?? 'not configured'})`);
          }

          for (const candidate of result.candidates) {
            events.emit('LOCATOR_DISCOVERED', {
              feature: name,
              strategy: candidate.strategy,
              confidence: candidate.confidence,
              validated: candidate.validated,
            });
            console.log(
              `  [${candidate.strategy}] confidence=${candidate.confidence.toFixed(2)} validated=${candidate.validated} - ${candidate.reason}`
            );
            if (candidate.validated) {
              events.emit('LOCATOR_VALIDATED', {
                feature: name,
                strategy: candidate.strategy,
                valid: candidate.validationResult?.valid,
              });
            }
          }
        }
      } catch (error) {
        if (error instanceof FrameworkError) {
          reportFrameworkError(error);
          return;
        }
        throw error;
      }
    });
}
