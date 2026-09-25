const ACTION_VERBS = [
  'click',
  'clicks',
  'select',
  'selects',
  'check',
  'checks',
  'fill',
  'fills',
  'type into',
  'types into',
  'open',
  'opens',
];

const ACTION_REGEX = new RegExp(
  `^(?:the user |the user should )?(?:${ACTION_VERBS.join('|')})\\s+"?([^"]+?)"?$`,
  'i'
);

/** True when a step/action text looks like a concrete UI interaction, e.g. "Click Submit". */
export function isActionableText(text: string): boolean {
  return ACTION_REGEX.test(text.trim());
}

/**
 * Extracts the target element name from an actionable text, e.g.
 * "Click Delete Account" -> "Delete Account". Falls back to the whole text
 * when it doesn't match the known verb patterns.
 */
export function extractIntendedTargetName(text: string): string {
  const match = text.trim().match(ACTION_REGEX);
  return (match?.[1] ?? text).trim();
}
