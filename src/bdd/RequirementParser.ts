import fs from 'node:fs';
import path from 'node:path';
import type { RequirementInput } from './types';
import { FrameworkError } from '../core/FrameworkError';

function extractSection(lines: string[], heading: string): string[] {
  const startIndex = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase()
  );
  if (startIndex === -1) {
    return [];
  }
  const rest = lines.slice(startIndex + 1);
  const endIndex = rest.findIndex((line) => line.trim().startsWith('## '));
  return endIndex === -1 ? rest : rest.slice(0, endIndex);
}

const TARGET_URL_PATTERN = /^target[\s_-]*url\s*:\s*(.+)$/i;

/**
 * Looks for a "Target URL: <url>" metadata line (accepts "Target-URL",
 * "Target_URL", any casing) anywhere before the first "## " heading -
 * i.e. right under the title, alongside the free-text description.
 */
function extractTargetUrl(lines: string[]): string | undefined {
  const firstHeadingIndex = lines.findIndex((line) => line.trim().startsWith('## '));
  const preamble = firstHeadingIndex === -1 ? lines : lines.slice(0, firstHeadingIndex);

  for (const line of preamble) {
    const match = line.trim().match(TARGET_URL_PATTERN);
    if (match?.[1]) {
      return match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}

/**
 * Parses the framework's requirement Markdown format:
 *
 * ```md
 * # Title
 * ## Description
 * free text...
 * ## Acceptance Criteria
 * - item
 * - item
 * ```
 *
 * Deterministic and dependency-free by design: requirement structure is
 * simple enough that a full Markdown AST is unnecessary.
 */
export function parseRequirementMarkdown(sourcePath: string, raw: string): RequirementInput {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');

  const titleLine = lines.find((line) => line.trim().startsWith('# '));
  if (!titleLine) {
    throw new FrameworkError({
      stage: 'REQUIREMENT_PARSING',
      message: `Requirement is missing a top-level "# Title" heading: ${sourcePath}`,
      recommendedAction: 'Add a "# <Title>" heading as the first line of the requirement.',
    });
  }
  const title = titleLine.replace(/^#\s+/, '').trim();

  const description = extractSection(lines, 'Description').join('\n').trim();

  const acceptanceCriteria = extractSection(lines, 'Acceptance Criteria')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-') || line.startsWith('*'))
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter((line) => line.length > 0);

  const targetUrl = extractTargetUrl(lines);

  return {
    id: path.basename(sourcePath),
    sourcePath,
    title,
    description,
    acceptanceCriteria,
    ...(targetUrl ? { targetUrl } : {}),
  };
}

export function parseRequirementFile(filePath: string): RequirementInput {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parseRequirementMarkdown(filePath, raw);
}

export function discoverRequirementFiles(requirementsDir: string): string[] {
  if (!fs.existsSync(requirementsDir)) {
    return [];
  }
  return fs
    .readdirSync(requirementsDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => path.join(requirementsDir, name));
}
