import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSnapshotText, extractYamlBlock, resolveLocatorAgainstNodes } from './PlaywrightMCPAdapter';

const SAMPLE_SNAPSHOT = [
  '- generic [active] [ref=e1]:',
  '  - heading "Framework Self-Check Panel" [level=1] [ref=e2]',
  '  - paragraph [ref=e3]: This page is a framework-owned test fixture.',
  '  - button "Confirm" [ref=e4]',
  '  - paragraph [ref=e5]: "Status: idle"',
].join('\n');

test('extractYamlBlock pulls the fenced yaml block out of a tool response', () => {
  const wrapped = '### Page\n- Page URL: https://example.com\n### Snapshot\n```yaml\n' + SAMPLE_SNAPSHOT + '\n```';
  assert.equal(extractYamlBlock(wrapped).trim(), SAMPLE_SNAPSHOT);
});

test('extractYamlBlock returns the input unchanged when there is no fence', () => {
  assert.equal(extractYamlBlock('plain text, no fence'), 'plain text, no fence');
});

test('parseSnapshotText extracts role, name, level, ref and text content', () => {
  const nodes = parseSnapshotText(SAMPLE_SNAPSHOT);

  assert.equal(nodes.length, 5);
  assert.deepEqual(
    nodes.map((n) => n.role),
    ['generic', 'heading', 'paragraph', 'button', 'paragraph']
  );

  const heading = nodes[1];
  assert.equal(heading?.name, 'Framework Self-Check Panel');
  assert.equal(heading?.level, 1);

  const button = nodes[3];
  assert.equal(button?.name, 'Confirm');
  assert.equal(button?.ref, 'e4');

  const idleStatus = nodes[4];
  assert.equal(idleStatus?.text, 'Status: idle');
});

test('resolveLocatorAgainstNodes: role+name resolves to exactly one visible element', () => {
  const nodes = parseSnapshotText(SAMPLE_SNAPSHOT);
  const result = resolveLocatorAgainstNodes(
    { strategy: 'role', value: 'button', name: 'Confirm' },
    nodes
  );
  assert.equal(result.valid, true);
  assert.equal(result.count, 1);
});

test('resolveLocatorAgainstNodes: role+name reports 0 matches for a locator that does not exist', () => {
  const nodes = parseSnapshotText(SAMPLE_SNAPSHOT);
  // Reproduces the framework's own healing demo: the real button is
  // "Confirm", not "Confirmed" - see requirements/framework-selfcheck.md.
  const result = resolveLocatorAgainstNodes(
    { strategy: 'role', value: 'button', name: 'Confirmed' },
    nodes
  );
  assert.equal(result.valid, false);
  assert.equal(result.exists, false);
  assert.equal(result.count, 0);
});

test('resolveLocatorAgainstNodes: reports not-unique when a role+name matches more than one element', () => {
  const nodes = parseSnapshotText(
    ['- button "Save" [ref=e1]', '- button "Save" [ref=e2]'].join('\n')
  );
  const result = resolveLocatorAgainstNodes({ strategy: 'role', value: 'button', name: 'Save' }, nodes);
  assert.equal(result.valid, false);
  assert.equal(result.exists, true);
  assert.equal(result.count, 2);
});

test('resolveLocatorAgainstNodes: text strategy matches against name or text content', () => {
  const nodes = parseSnapshotText(SAMPLE_SNAPSHOT);
  const result = resolveLocatorAgainstNodes({ strategy: 'text', value: 'Status: idle' }, nodes);
  assert.equal(result.valid, true);
});

test('resolveLocatorAgainstNodes: honestly reports css/xpath/testId as unsupported rather than guessing', () => {
  const nodes = parseSnapshotText(SAMPLE_SNAPSHOT);
  for (const strategy of ['css', 'xpath', 'testId'] as const) {
    const result = resolveLocatorAgainstNodes({ strategy, value: '#whatever' }, nodes);
    assert.equal(result.valid, false);
    assert.match(result.reason, /cannot validate/);
  }
});
