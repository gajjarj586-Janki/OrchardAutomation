export interface RequirementInput {
  /** File name/id of the source requirement, e.g. "example-generic-action.md". */
  id: string;
  /** Absolute path the requirement was read from. */
  sourcePath: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  /** Optional "Target URL: <url>" metadata line - see RequirementParser.ts. */
  targetUrl?: string;
}

export interface GeneratedFeature {
  /** Suggested Gherkin feature title. */
  title: string;
  /** Full .feature file content (Gherkin text). */
  content: string;
}

export interface ParsedFeature {
  title: string;
  scenarios: Array<{
    name: string;
    steps: string[];
  }>;
  sourcePath: string;
  /** Carried through from the requirement via a comment in the .feature file, if present. */
  targetUrl?: string;
}

export interface GeneratedSteps {
  /** Full step-definition TypeScript file content. */
  content: string;
  /** Business-language step texts covered by this generated file. */
  coveredSteps: string[];
}
