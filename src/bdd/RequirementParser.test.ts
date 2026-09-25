import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRequirementMarkdown } from './RequirementParser';
import { FrameworkError } from '../core/FrameworkError';

const SAMPLE = `# Example Requirement

## Description

The application should allow a user to perform an action.

## Acceptance Criteria

- Valid input should be accepted.
- Invalid input should show an error.
- Empty input should show validation.
`;

test('parseRequirementMarkdown extracts title, description, and criteria', () => {
  const result = parseRequirementMarkdown('example.md', SAMPLE);
  assert.equal(result.title, 'Example Requirement');
  assert.equal(result.description, 'The application should allow a user to perform an action.');
  assert.deepEqual(result.acceptanceCriteria, [
    'Valid input should be accepted.',
    'Invalid input should show an error.',
    'Empty input should show validation.',
  ]);
});

test('parseRequirementMarkdown throws a FrameworkError when title is missing', () => {
  assert.throws(() => parseRequirementMarkdown('bad.md', '## Description\ntext\n'), FrameworkError);
});

test('parseRequirementMarkdown tolerates a missing Acceptance Criteria section', () => {
  const result = parseRequirementMarkdown('minimal.md', '# Title only\n');
  assert.deepEqual(result.acceptanceCriteria, []);
});

test('parseRequirementMarkdown extracts an optional Target URL metadata line', () => {
  const result = parseRequirementMarkdown(
    'with-url.md',
    '# Title\n\nTarget URL: "https://example.test/page"\n\n## Description\ntext\n'
  );
  assert.equal(result.targetUrl, 'https://example.test/page');
});

test('parseRequirementMarkdown accepts Target-URL/Target_URL spelling variants without quotes', () => {
  assert.equal(
    parseRequirementMarkdown('a.md', '# Title\n\nTarget-URL: https://example.test/a\n').targetUrl,
    'https://example.test/a'
  );
  assert.equal(
    parseRequirementMarkdown('b.md', '# Title\n\nTarget_URL: https://example.test/b\n').targetUrl,
    'https://example.test/b'
  );
});

test('parseRequirementMarkdown leaves targetUrl undefined when no metadata line is present', () => {
  const result = parseRequirementMarkdown('none.md', '# Title\n\n## Description\ntext\n');
  assert.equal(result.targetUrl, undefined);
});
