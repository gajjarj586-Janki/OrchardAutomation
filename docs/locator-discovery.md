# Locator discovery & validation

## Strategy priority

```
1. getByRole()
2. getByLabel()
3. getByPlaceholder()
4. getByText()
5. getByTestId()
6. CSS
7. XPath
```

`LOCATOR_STRATEGY_PRIORITY` in `src/locator/LocatorDefinition.ts` is the single source of truth for this order; `LocatorRanking.rankCandidates()` uses it as a tie-breaker when two candidates have equal confidence.

## `npm run discover:locators`

Scans every `features/*.feature` for **actionable steps** - step text that names a concrete UI interaction (`isActionableText()` in `src/locator/actionText.ts`, e.g. "Click Submit", "the user clicks \"Delete Account\""). For each one, it asks the AI provider for candidate locators (`suggestLocator()`), then, if MCP is configured, validates each candidate via MCP; otherwise the candidates come back `validated: false` and the command reports `MCP: SKIPPED`.

Note: the framework's own `MockAIProvider`-generated Gherkin (from `generate:features`) is intentionally abstract ("the following condition is evaluated: ...") and has no actionable steps of this shape - `discover:locators` will correctly report "nothing to discover" against it. This command is exercised end-to-end by unit tests (`src/locator/LocatorDiscovery.test.ts`) against synthetic actionable steps, and is meant for projects whose generated/hand-written Gherkin actually describes UI interactions.

## Validation: existence is not correctness

A locator that resolves to exactly one visible, enabled element is not automatically "correct" - see `src/locator/LocatorValidator.ts`'s `semanticNameMatches()`. If the intended action is "Click Delete Account" and a candidate resolves to a real, unique, visible button named "Save Account", it is still rejected: `semanticMatch: false` on the `LocatorValidationResult`. Every candidate's `LocatorValidationResult` records `exists`, `count`, `visible`, `enabled`, `roleMatches`, and `semanticMatch` separately so a report can show exactly which check failed.

## Confidence

Every candidate carries a `confidence` in `[0, 1]` and a human-readable `reason`. Confidence is a ranking heuristic, never proof - a candidate is only ever treated as usable after `validated: true` on a real `LocatorValidationResult`.
