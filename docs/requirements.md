# Requirements

Requirements live under `requirements/*.md` in a fixed, simple Markdown format:

```md
# <Title>

## Description

Free text.

## Acceptance Criteria

- Criterion one.
- Criterion two.
```

- The `# Title` heading is required; everything else is optional (a title-only requirement is valid - it just produces zero acceptance-criteria-derived scenarios).
- Acceptance criteria become one Gherkin `Scenario` each - see [gherkin.md](./gherkin.md).
- **Never put secrets, credentials, or real environment URLs in a requirement.** They are meant to be committed to version control.

`src/bdd/RequirementParser.ts` parses this format deterministically (no AI involved in parsing - only in *generating* Gherkin from the parsed result). See `npm run requirements` to list what the framework currently discovers under `requirements/`.
