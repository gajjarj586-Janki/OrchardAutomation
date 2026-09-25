# BUILD A GENERIC AI-POWERED PLAYWRIGHT BDD SELF-HEALING FRAMEWORK

You are a senior automation architect, TypeScript engineer, Playwright engineer, AI integration engineer, and test-framework designer.

I want you to BUILD the framework in the current repository.

This is NOT an application-specific automation project.

The goal is to create a GENERIC, REUSABLE, MODULAR, PRODUCTION-EXTENSIBLE AI-powered Playwright automation framework that can later be configured for many different web applications.

I am using:

* VS Code
* Claude Code
* Node.js
* TypeScript
* Playwright
* Git

The framework should eventually allow this workflow:

```text
Requirement.md
      ↓
      AI
      ↓
Gherkin Feature
      ↓
MCP Live Browser
      ↓
Locator Discovery
      ↓
Locator Validation
      ↓
Step Definitions
      ↓
Page Objects / Components
      ↓
Playwright Execution
      ↓
Test Failure
      ↓
Failure Analysis
      ↓
Healing Engine
      ↓
MCP Live Inspection
      ↓
New Locator Candidates
      ↓
Candidate Validation
      ↓
Targeted Retry
      ↓
Relevant Regression
      ↓
HTML + JSON + AI + Healing Reports
```

The final developer experience should be:

```text
Add/edit requirement
        ↓
npm run ai:test
        ↓
complete pipeline
        ↓
reports/
```

The framework must be designed so that after initial project configuration, a user can add requirements and run the complete pipeline without manually performing every intermediate step.

---

# VERY IMPORTANT GOAL

Build the framework itself.

DO NOT build business/application-specific automation.

Do NOT create real:

* login tests
* checkout tests
* banking tests
* registration tests
* ecommerce tests
* payment tests
* application-specific Page Objects
* application-specific selectors
* application-specific credentials
* application-specific test data

You may create a very small generic example/mock implementation ONLY when technically required to prove that the framework works.

The framework must be reusable across Project A, Project B, Project C, etc.

---

# FINAL USER EXPERIENCE

After framework setup, I want to be able to do something like:

```bash
npm run ai:test
```

The framework should automatically perform:

```text
1. Validate configuration
2. Discover requirements
3. Generate/update Gherkin
4. Validate Gherkin
5. Generate/update step definitions
6. Discover/validate locators using MCP
7. Generate/update Page Objects/components
8. Validate generated TypeScript
9. Run Playwright
10. Collect failures
11. Analyze failures
12. Attempt self-healing
13. Validate healing candidates
14. Targeted retry
15. Relevant regression
16. Generate final reports
17. Store healing history
```

The pipeline must clearly report what happened at every stage.

---

# CORE PRINCIPLES

Follow these principles throughout the implementation.

## 1. Generic architecture

Framework core must be independent of any specific application.

Project-specific configuration belongs outside framework core.

---

## 2. AI is untrusted

Never blindly execute AI-generated output.

AI output must go through:

```text
AI response
↓
Schema validation
↓
Content validation
↓
Syntax validation
↓
TypeScript validation
↓
Lint
↓
Safe execution
```

If validation fails, reject the generated output.

Limit AI retries.

Default:

```yaml
ai:
  maxRetries: 3
```

Never create infinite retry loops.

---

## 3. MCP is abstracted

DO NOT invent or assume a specific MCP browser server.

Create an abstraction such as:

```ts
interface MCPBrowserProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  inspectPage(): Promise<PageInspection>;

  getPageStructure(): Promise<PageStructure>;

  getAccessibilitySnapshot(): Promise<AccessibilitySnapshot>;

  findElements(criteria: ElementSearchCriteria): Promise<ElementInfo[]>;

  getElementAttributes(element: ElementReference): Promise<ElementAttributes>;

  validateLocator(locator: LocatorDefinition): Promise<LocatorValidationResult>;
}
```

The actual MCP implementation must be pluggable.

If MCP is not configured:

* fail gracefully
* clearly report that MCP is unavailable
* do NOT fabricate live browser results
* do NOT claim locators were validated

---

# 4. Healing must be safe

The healer must NEVER silently modify the main codebase.

Default configuration:

```yaml
healing:
  enabled: true
  autoHeal: true
  autoPatch: false
  autoCommit: false
  autoMerge: false
  maxAttempts: 3
  targetedRetry: true
  regressionAfterHealing: true
```

Initially:

```text
failure
↓
candidate
↓
validation
↓
targeted retry
↓
regression
↓
report
```

Do NOT automatically patch source files unless explicitly enabled.

Do NOT commit automatically.

Do NOT push automatically.

Do NOT merge automatically.

---

# 5. Healing must not hide failures

Always preserve the original failure.

Reports must show something like:

```text
Original Test: FAILED

Healing:
Candidate Found

Candidate Validation: PASSED

Targeted Retry: PASSED

Relevant Regression: PASSED

Final Status: HEALED

Source Patch: NOT APPLIED
Approval: REQUIRED
```

Never simply convert the original failure into PASS without showing the healing event.

---

# 6. Locator strategy

Use this priority:

```text
1. getByRole()
2. getByLabel()
3. getByPlaceholder()
4. getByText()
5. getByTestId()
6. CSS
7. XPath
```

Prefer stable semantic locators.

Avoid brittle locators.

Examples of preferred locators:

```ts
page.getByRole('button', { name: 'Submit' })

page.getByLabel('Email')

page.getByPlaceholder('Enter email')

page.getByText('Continue')
```

Avoid unnecessary:

```ts
page.locator('div:nth-child(3) > span > button')
```

Avoid XPath unless there is a genuine reason.

---

# 7. Locator validation

Do not consider a locator valid merely because it exists.

Validation should consider:

* element exists
* element count
* expected role
* expected element type
* visibility
* enabled state where relevant
* actionability
* semantic match
* surrounding context
* intended action
* scenario continuation
* targeted retry result

For example:

If the expected action is:

```text
Click Delete Account
```

and a candidate finds:

```text
Save Account
```

the candidate must be rejected even if it is a valid button.

Existence != correctness.

---

# 8. Confidence scoring

Every healing candidate should contain structured information:

```ts
interface LocatorCandidate {
  locator: LocatorDefinition;
  strategy: LocatorStrategy;
  confidence: number;
  reason: string;
  evidence: Evidence[];
  validated: boolean;
  validationResult?: LocatorValidationResult;
}
```

Confidence should be based on evidence such as:

* semantic match
* role match
* accessible name
* label match
* test ID stability
* uniqueness
* DOM context
* MCP evidence
* successful targeted retry
* regression result

Do not treat confidence as proof.

Validation is required.

Make thresholds configurable.

Do not hardcode assumptions about what confidence score guarantees correctness.

---

# 9. Multiple healing strategies

The healer must support multiple strategies.

Examples:

```text
Role-based locator
Label-based locator
Placeholder-based locator
Text locator
Test ID locator
CSS locator
XPath fallback
AI-generated locator candidate
MCP-derived candidate
```

AI should be a candidate generator, not the final authority.

---

# 10. Healing history

Every healing attempt must be stored.

Store:

```text
project
application
environment
test
scenario
feature
page
original locator
candidate locator
strategy
confidence
reason
MCP evidence
validation result
targeted retry result
regression result
AI provider
AI model
timestamp
approval status
patch status
```

Initially JSON storage is acceptable.

Architect it so it can later move to:

```text
PostgreSQL
```

or another persistent database.

---

# 11. Auditability

Every important AI/MCP/healing action should produce a structured event.

Examples:

```text
REQUIREMENT_READ
FEATURE_GENERATED
FEATURE_VALIDATED
STEP_GENERATED
LOCATOR_DISCOVERED
LOCATOR_VALIDATED
TEST_EXECUTED
TEST_FAILED
FAILURE_ANALYZED
HEALING_STARTED
HEALING_CANDIDATE_FOUND
HEALING_CANDIDATE_VALIDATED
TARGETED_RETRY_STARTED
TARGETED_RETRY_PASSED
REGRESSION_STARTED
REGRESSION_PASSED
HEALING_COMPLETED
PATCH_REQUIRES_APPROVAL
```

This will allow future dashboards and enterprise reporting.

---

# PROJECT STRUCTURE

Create a clean architecture approximately like:

```text
generic-ai-playwright-framework/

├── src/
│   ├── ai/
│   │   ├── AIProvider.ts
│   │   ├── AIClient.ts
│   │   ├── prompts/
│   │   ├── schemas/
│   │   └── providers/
│   │
│   ├── mcp/
│   │   ├── MCPBrowserProvider.ts
│   │   ├── MCPClient.ts
│   │   ├── MCPModels.ts
│   │   └── adapters/
│   │
│   ├── healer/
│   │   ├── Healer.ts
│   │   ├── HealingEngine.ts
│   │   ├── LocatorCandidate.ts
│   │   ├── LocatorValidator.ts
│   │   ├── HealingHistory.ts
│   │   ├── HealingEvent.ts
│   │   └── strategies/
│   │
│   ├── locator/
│   │   ├── LocatorDefinition.ts
│   │   ├── LocatorDiscovery.ts
│   │   ├── LocatorRanking.ts
│   │   ├── LocatorStrategy.ts
│   │   └── LocatorValidator.ts
│   │
│   ├── bdd/
│   │   ├── RequirementParser.ts
│   │   ├── FeatureGenerator.ts
│   │   ├── FeatureParser.ts
│   │   ├── StepGenerator.ts
│   │   └── validators/
│   │
│   ├── execution/
│   │   ├── TestExecutor.ts
│   │   ├── FailureCollector.ts
│   │   ├── FailureAnalyzer.ts
│   │   ├── TargetedRetry.ts
│   │   └── RegressionRunner.ts
│   │
│   ├── reporting/
│   │   ├── ReportGenerator.ts
│   │   ├── AIReportGenerator.ts
│   │   ├── HealingReportGenerator.ts
│   │   └── ExecutionSummary.ts
│   │
│   ├── config/
│   ├── core/
│   ├── fixtures/
│   ├── pages/
│   ├── components/
│   ├── data/
│   ├── auth/
│   ├── logging/
│   ├── events/
│   └── utils/
│
├── requirements/
├── features/
├── steps/
├── test-data/
├── tests/
├── config/
├── reports/
│   ├── playwright/
│   ├── json/
│   ├── ai/
│   └── healing/
│
├── healing/
│   └── history/
│
├── docs/
├── scripts/
│
├── .github/
│   └── workflows/
│
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── eslint.config.js
└── .prettierrc
```

Adjust this structure when architecturally justified.

Do not create meaningless empty folders.

---

# PHASE 1 — FOUNDATION

Build:

* Node.js/npm project
* TypeScript
* strict TypeScript
* Playwright
* ESLint
* Prettier
* dotenv
* YAML configuration support
* structured logging
* configuration loader
* environment handling
* CLI foundation
* project structure
* Git configuration

Create:

```text
.env.example
```

Never store real secrets.

Configuration should support:

```yaml
project:
  name: generic-project

application:
  baseUrl: ""

execution:
  browser: chromium
  headless: true
  timeout: 30000
  navigationTimeout: 30000
  retries: 1
  workers: 1
  screenshot: only-on-failure
  trace: retain-on-failure
  video: retain-on-failure

ai:
  enabled: true
  provider: ""
  model: ""
  maxRetries: 3

mcp:
  enabled: true
  provider: ""

healing:
  enabled: true
  autoHeal: true
  autoPatch: false
  autoCommit: false
  autoMerge: false
  maxAttempts: 3
  targetedRetry: true
  regressionAfterHealing: true
  regressionScope: affected
```

Create scripts:

```bash
npm run test
npm run test:headed
npm run lint
npm run format
npm run format:check
npm run typecheck
npm run clean
```

Validate Phase 1 before continuing.

---

# PHASE 2 — REQUIREMENT → GHERKIN

Implement:

```text
requirements/*.md
        ↓
Requirement Parser
        ↓
AI Provider
        ↓
Structured AI Output
        ↓
Schema Validation
        ↓
Gherkin Generator
        ↓
features/*.feature
```

Example requirement format:

```md
# Example Requirement

## Description

The application should allow a user to perform an action.

## Acceptance Criteria

- Valid input should be accepted.
- Invalid input should show an error.
- Empty input should show validation.
```

Do not create application-specific logic.

Create:

```bash
npm run requirements
npm run generate:features
npm run validate:features
```

Requirements:

* Markdown parsing
* structured AI request
* structured AI response
* Zod or equivalent schema validation
* Gherkin validation
* deterministic generation where possible
* preserve generated artifacts
* do not unnecessarily overwrite unchanged files
* no secrets in feature files
* test data remains separate

Create a mock AI provider for local framework verification.

Clearly label it as a MOCK.

Never pretend mock AI is real AI.

Validate Phase 2.

---

# PHASE 3 — GHERKIN → STEPS → PAGE OBJECTS

Implement:

```text
Feature
 ↓
Step Definition Generator
 ↓
Step Definitions
 ↓
Page Object / Component abstraction
 ↓
Playwright
```

Step definitions MUST NOT contain raw application locators.

Bad:

```ts
When('the user clicks the button', async ({ page }) => {
  await page.locator('#button').click();
});
```

Preferred:

```ts
When('the user clicks the submit button', async ({ examplePage }) => {
  await examplePage.submit();
});
```

Page Objects own locators.

Use:

```ts
page.getByRole(...)
page.getByLabel(...)
page.getByPlaceholder(...)
```

where appropriate.

Do not create real application-specific Page Objects.

Create:

```bash
npm run generate:steps
npm run generate:tests
```

Generated code must be validated using:

```text
schema validation
↓
syntax validation
↓
TypeScript typecheck
↓
lint
```

Do not execute unvalidated AI-generated code.

Validate Phase 3.

---

# PHASE 4 — MCP LIVE BROWSER + LOCATOR DISCOVERY

Implement the MCP abstraction.

Create:

```text
MCPBrowserProvider
MCPClient
MCPModels
MCP adapters
```

Capabilities should conceptually support:

```text
connect
disconnect
inspectPage
getPageStructure
getAccessibilitySnapshot
findElements
inspectElement
getElementAttributes
getNearbyElements
validateLocator
```

DO NOT invent a specific MCP server.

DO NOT claim MCP works unless an actual provider is configured and tested.

Configuration:

```yaml
mcp:
  enabled: true
  provider: ""
```

If unavailable:

```text
MCP browser provider is not configured.
```

The pipeline should continue where possible, but MCP-dependent operations must be clearly marked:

```text
SKIPPED — MCP NOT CONFIGURED
```

Never fabricate locator evidence.

Create:

```bash
npm run discover:locators
```

Locator discovery should produce structured candidates:

```json
{
  "locator": "getByRole('button', { name: 'Submit' })",
  "strategy": "role",
  "confidence": 0.95,
  "validated": true,
  "reason": "Unique accessible button name",
  "evidence": []
}
```

The exact confidence value must be calculated by the framework and treated as a configurable heuristic, not proof.

Validate Phase 4.

---

# PHASE 5 — PLAYWRIGHT EXECUTION

Implement execution.

Responsibilities:

* discover generated tests
* execute Playwright
* collect failures
* capture screenshots
* capture traces
* capture video according to configuration
* capture URL
* capture test name
* capture scenario
* capture browser
* capture environment
* capture timestamp
* collect relevant console errors
* store artifacts predictably

Create:

```bash
npm test
```

Failure model:

```ts
interface TestFailure {
  testName: string;
  scenario?: string;
  feature?: string;
  error: string;
  url?: string;
  screenshot?: string;
  trace?: string;
  video?: string;
  timestamp: string;
  environment?: string;
}
```

Do not implement automatic healing until execution works.

Validate Phase 5.

---

# PHASE 6 — FAILURE ANALYSIS + SELF HEALING

Implement:

```text
Test Failure
    ↓
Failure Analyzer
    ↓
Identify failed action/locator
    ↓
MCP inspection
    ↓
Candidate generation
    ↓
Candidate ranking
    ↓
Candidate validation
```

Create:

```text
Healer
HealingEngine
LocatorCandidate
LocatorValidator
HealingHistory
HealingEvent
```

Healing flow:

```text
Failed test
 ↓
Capture failure context
 ↓
Identify locator/action
 ↓
Inspect live page
 ↓
Generate candidates
 ↓
Rank candidates
 ↓
Validate candidates
 ↓
Choose safe candidate
 ↓
Targeted retry
```

The healer must NOT blindly rewrite source code.

Default:

```yaml
autoPatch: false
```

Healing candidate should contain:

```text
original locator
candidate locator
strategy
confidence
reason
MCP evidence
validation result
```

Record every attempt under:

```text
healing/history/
```

Use structured JSON initially.

Maximum healing attempts:

```text
3
```

Never infinite retry.

Validate Phase 6.

---

# PHASE 7 — TARGETED RETRY + RELEVANT REGRESSION

Implement:

```text
Failed Scenario
      ↓
Healing Candidate
      ↓
Targeted Retry
      ↓
If successful
      ↓
Relevant Regression
```

Create:

```bash
npm run retry:failed
npm run regression
```

Targeted retry must execute only the affected test/scenario first.

If successful:

```text
run affected/relevant regression
```

Do not automatically run the entire repository unless configured.

Configuration:

```yaml
healing:
  targetedRetry: true
  regressionAfterHealing: true
  regressionScope: affected
```

Example report:

```text
Original Test: FAILED

Healing Candidate: FOUND

Candidate Validation: PASSED

Targeted Retry: PASSED

Relevant Regression: PASSED

Final Status: HEALED

Source Patch: NOT APPLIED

Human Approval: REQUIRED
```

If healing fails:

```text
Original Test: FAILED
Healing Candidate: NOT VALIDATED
Targeted Retry: FAILED
Regression: NOT RUN
Final Status: FAILED
```

Never hide the original failure.

Validate Phase 7.

---

# PHASE 8 — COMPLETE AI TEST PIPELINE

Create the master command:

```bash
npm run ai:test
```

This command must orchestrate the complete framework.

Pipeline:

```text
Validate Configuration
        ↓
Read Requirements
        ↓
Generate Gherkin
        ↓
Validate Gherkin
        ↓
Generate Step Definitions
        ↓
Generate/Update Page Objects where appropriate
        ↓
Discover Locators
        ↓
Validate Generated Code
        ↓
Run Playwright
        ↓
Collect Failures
        ↓
Analyze Failures
        ↓
Attempt Healing
        ↓
Validate Healing Candidates
        ↓
Targeted Retry
        ↓
Relevant Regression
        ↓
Generate Reports
        ↓
Store Healing History
```

The command should provide clear console output for every stage.

Example:

```text
[1/12] Configuration ............. PASS
[2/12] Requirements .............. PASS
[3/12] Gherkin Generation ........ PASS
[4/12] Gherkin Validation ........ PASS
[5/12] Step Generation ........... PASS
[6/12] Locator Discovery ......... PASS
[7/12] Code Validation ........... PASS
[8/12] Playwright Execution ...... FAIL
[9/12] Failure Analysis .......... PASS
[10/12] Healing .................. CANDIDATE FOUND
[11/12] Targeted Retry ........... PASS
[12/12] Regression ............... PASS

FINAL STATUS: HEALED

Reports:
reports/
```

If MCP or AI is unavailable, clearly show:

```text
AI: NOT CONFIGURED
MCP: NOT CONFIGURED
```

and explain what stage cannot execute.

Do not fake success.

---

# CLI COMMANDS

Create:

```bash
npm run requirements

npm run generate:features

npm run validate:features

npm run generate:steps

npm run discover:locators

npm run generate:tests

npm test

npm run analyze:failures

npm run heal

npm run retry:failed

npm run regression

npm run report

npm run ai:test
```

Support:

```bash
--dry-run
```

and where appropriate:

```bash
--force
```

The master command should be safe to run repeatedly.

Do not regenerate unchanged artifacts unnecessarily.

---

# TEST DATA ARCHITECTURE

Keep test data separate.

Example:

```text
test-data/
├── users.json
├── products.json
└── environments/
```

Create:

```ts
interface TestDataProvider {
  get<T>(key: string): Promise<T>;
}
```

Future providers should be possible:

```text
JSON
YAML
Faker
API
Database
```

Do not implement database integration now.

Requirements and features must not contain secrets.

---

# AUTHENTICATION ARCHITECTURE

Create a reusable authentication abstraction.

Support concepts such as:

```text
anonymous context
authenticated context
storage state
```

Do not implement real application login.

Secrets must come from:

```text
.env
CI secrets
secret management systems
```

Never hardcode credentials.

---

# PAGE OBJECT ARCHITECTURE

Page Objects own:

```text
locators
page interactions
page-level behavior
```

Step definitions own:

```text
business-language mapping
```

Avoid giant BasePage classes.

If BasePage is needed, keep it very small and generic.

---

# AI PROVIDER ARCHITECTURE

Create:

```ts
interface AIProvider {
  generate(request: AIRequest): Promise<AIResponse>;

  generateStructured<T>(
    request: StructuredAIRequest,
    schema: unknown
  ): Promise<T>;

  generateFeature(input: RequirementInput): Promise<GeneratedFeature>;

  generateStepDefinitions(
    feature: ParsedFeature
  ): Promise<GeneratedSteps>;

  suggestLocator(
    context: LocatorContext
  ): Promise<LocatorCandidate[]>;

  analyzeFailure(
    failure: TestFailure
  ): Promise<FailureAnalysis>;

  generateHealingSuggestion(
    context: HealingContext
  ): Promise<HealingSuggestion>;
}
```

Provider must be replaceable.

Support a mock provider.

Real AI provider must be configured through environment/configuration.

Example:

```env
AI_PROVIDER=
AI_API_KEY=
AI_MODEL=
```

Never hardcode secrets.

---

# MCP ARCHITECTURE

Create:

```ts
interface MCPBrowserProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  inspectPage(): Promise<PageInspection>;
  getPageStructure(): Promise<PageStructure>;
  getAccessibilitySnapshot(): Promise<AccessibilitySnapshot>;
  findElements(criteria: ElementSearchCriteria): Promise<ElementInfo[]>;
  getElementAttributes(
    element: ElementReference
  ): Promise<ElementAttributes>;
  validateLocator(
    locator: LocatorDefinition
  ): Promise<LocatorValidationResult>;
}
```

Actual adapters should implement this interface.

Do not couple the framework to one vendor.

---

# PRODUCTION-READY SELF-HEALING DESIGN

The framework must be architected so that future production hardening can be added without rewriting the core.

Future architecture:

```text
Locator Failure
      ↓
Failure Context
      ↓
MCP Inspection
      ↓
Candidate Generation
      ↓
Candidate Ranking
      ↓
Safety Gate
      ↓
Candidate Validation
      ↓
Targeted Retry
      ↓
Relevant Regression
      ↓
Healing Event
      ↓
Patch Candidate
      ↓
Git Branch
      ↓
Full Validation
      ↓
Pull Request
      ↓
Human Approval
      ↓
Merge
```

DO NOT implement automatic merge now.

Architecture must leave room for:

* confidence engine
* persistent healing database
* Git branch management
* patch generation
* PR generation
* approval workflow
* rollback
* audit trail
* metrics
* dashboards
* notifications
* CI/CD
* multi-project support
* multi-browser support
* parallel execution
* enterprise authentication

---

# PATCHING DESIGN

Eventually the framework may support:

```yaml
healing:
  autoPatch: true
```

But when implemented, patching must follow:

```text
Candidate validated
↓
Create Git branch
↓
Apply minimal patch
↓
Typecheck
↓
Lint
↓
Targeted test
↓
Relevant regression
↓
Full validation
↓
Create PR
↓
Human approval
```

Never:

```text
AI says locator changed
↓
Modify main
↓
Commit
↓
Push
```

---

# REPORTING

Generate:

```text
reports/
├── playwright/
├── json/
├── ai/
└── healing/
```

Reports must include:

## Execution report

```text
requirements processed
features generated
scenarios
tests executed
passed
failed
skipped
```

## AI report

```text
AI operations
generation results
failure analysis
suggestions
provider/model
errors
```

## Healing report

```text
original failure
original locator
candidate locators
candidate ranking
confidence
evidence
validation
targeted retry
regression
final status
approval status
patch status
```

Use clear statuses:

```text
PASS
FAIL
SKIPPED
HEALED
HEALING CANDIDATE
REQUIRES HUMAN APPROVAL
MCP NOT CONFIGURED
AI NOT CONFIGURED
```

---

# REPORT DATA MODEL

Use structured JSON for machine-readable reporting.

Example:

```json
{
  "test": "example scenario",
  "status": "HEALED",
  "originalResult": "FAILED",
  "healing": {
    "candidateFound": true,
    "candidateValidated": true,
    "targetedRetry": "PASSED",
    "regression": "PASSED",
    "patchApplied": false,
    "approval": "PENDING"
  }
}
```

Do not lose the original failure.

---

# GITHUB ACTIONS

Prepare CI support.

Create:

```text
.github/workflows/
```

CI should eventually support:

```bash
npm ci
npm run typecheck
npm run lint
npm run ai:test
```

Upload:

```text
Playwright reports
JSON reports
AI reports
Healing reports
screenshots
traces
videos
```

Do not assume MCP will automatically work in GitHub Actions.

Document required MCP infrastructure/configuration.

---

# FRAMEWORK TESTING

The framework itself must have unit tests.

Test at minimum:

```text
configuration loading
schema validation
Markdown requirement parsing
Gherkin validation
locator ranking
locator validation
AI response validation
failure parsing
healing decision logic
healing history
report generation
pipeline orchestration
```

Use mocks for:

```text
AI
MCP
external services
```

Framework tests must NOT require real AI or MCP.

---

# SECURITY

Never store:

* API keys
* passwords
* tokens
* cookies
* secrets

inside:

```text
requirements
features
source code
Git
reports
```

unless explicitly sanitized.

Use:

```text
.env
CI secrets
secret managers
```

Add `.env` to `.gitignore`.

Sanitize sensitive values from logs and reports where possible.

---

# OBSERVABILITY

Create structured logging.

Each pipeline execution should have an execution ID.

Example:

```text
executionId
timestamp
project
environment
stage
status
duration
error
```

This will support future dashboards.

---

# IDE / DEVELOPER EXPERIENCE

The framework should be easy to understand from VS Code.

README should explain:

```text
What is this framework?
How does the pipeline work?
How do I configure a project?
How do I add a requirement?
How do I run tests?
How does healing work?
How do I configure AI?
How do I configure MCP?
Where are reports?
Where is healing history?
How do I approve a healing patch?
How do I add a new AI provider?
How do I add a new MCP provider?
```

---

# DOCUMENTATION

Create:

```text
README.md

docs/
├── architecture.md
├── configuration.md
├── requirements.md
├── gherkin.md
├── ai.md
├── mcp.md
├── locator-discovery.md
├── healing.md
├── reporting.md
├── test-data.md
├── authentication.md
├── ci-cd.md
├── troubleshooting.md
├── contributing.md
└── production-hardening.md
```

Use Mermaid diagrams where useful.

---

# CODE QUALITY

Use:

* strict TypeScript
* meaningful interfaces
* small focused modules
* dependency injection where useful
* async/await
* clear error handling
* typed configuration
* Zod or equivalent schemas
* no circular dependencies
* no unnecessary singleton state
* no duplicated configuration
* no dead code
* no unused dependencies
* no giant classes
* no unnecessary abstractions

Prefer composition over inheritance.

---

# IDEMPOTENCY

The pipeline must be safe to run repeatedly.

For example:

```bash
npm run ai:test
npm run ai:test
npm run ai:test
```

should not create duplicate or corrupted artifacts.

Generated files should only be changed when necessary.

---

# DRY RUN

Support:

```bash
npm run ai:test -- --dry-run
```

Dry run should show:

```text
requirements detected
features that would be generated
steps that would be generated
locators that would be discovered
tests that would execute
healing actions that would be attempted
reports that would be produced
```

without destructive changes.

---

# ERROR HANDLING

Every stage must fail clearly.

Do not allow:

```text
silent failure
fake success
fake MCP validation
fake AI generation
hidden test failure
infinite retry
```

Errors should include:

```text
stage
error
possible cause
recommended action
```

---

# PHASE IMPLEMENTATION PROCESS

DO NOT attempt an uncontrolled giant implementation.

Implement sequentially:

```text
PHASE 1 — Foundation
PHASE 2 — Requirement → Gherkin
PHASE 3 — Gherkin → Steps → Page Objects
PHASE 4 — MCP + Locator Discovery
PHASE 5 — Playwright Execution
PHASE 6 — Healing
PHASE 7 — Targeted Retry + Regression
PHASE 8 — Full Pipeline + Reporting
```

After EACH phase:

1. Inspect files.
2. Run typecheck.
3. Run lint.
4. Run formatting check.
5. Run relevant unit tests.
6. Fix failures.
7. Review architecture.
8. Confirm phase functionality.
9. Document known limitations.
10. Only then continue.

Do not silently skip failed validation.

---

# FINAL COMMANDS

The project should support:

```bash
npm install

npm run typecheck

npm run lint

npm test

npm run requirements

npm run generate:features

npm run validate:features

npm run generate:steps

npm run discover:locators

npm run generate:tests

npm run analyze:failures

npm run heal

npm run retry:failed

npm run regression

npm run report

npm run ai:test
```

---

# FINAL ACCEPTANCE CRITERIA

The framework is considered successfully implemented when:

1. A new project can configure the framework without modifying framework core.
2. Markdown requirements can be parsed.
3. Requirements can be converted into Gherkin through the AI abstraction.
4. Generated Gherkin is schema/format validated.
5. Gherkin can generate step definitions.
6. Step definitions use Page Objects/components.
7. Page Objects own locators.
8. Locator discovery supports semantic locator strategies.
9. MCP can be plugged in through an adapter.
10. MCP can inspect live pages when configured.
11. Locator candidates can be validated.
12. Playwright can execute generated tests.
13. Failures generate structured diagnostics.
14. Failure analysis can identify locator-related failures.
15. Healing candidates can be generated.
16. Candidates can be ranked.
17. Candidates can be validated.
18. Targeted retry can execute the affected test.
19. Relevant regression can execute after successful healing.
20. Original failures remain visible.
21. Healing history is persisted.
22. HTML reports are generated.
23. JSON reports are generated.
24. AI reports are generated.
25. Healing reports are generated.
26. `npm run ai:test` orchestrates the complete pipeline.
27. AI output is validated before execution.
28. MCP results are never fabricated.
29. No secrets are committed.
30. Auto-patching is disabled by default.
31. Auto-commit is disabled by default.
32. Auto-merge is disabled by default.
33. Framework unit tests exist.
34. CI support exists.
35. Documentation exists.
36. The architecture supports future production-grade healing.
37. No business-specific application automation has been introduced.

---

# IMPORTANT FINAL RULE

Do not claim that something works if it has not actually been tested.

For external dependencies:

```text
AI provider unavailable
MCP provider unavailable
GitHub Actions unavailable
```

must be reported honestly.

Use mock providers only for framework testing and label them clearly.

Never fabricate:

* AI responses
* MCP browser inspection
* locator validation
* healing success
* regression success

---

# START NOW

First:

1. Inspect the current repository.
2. Determine whether an existing project exists.
3. Do not destroy existing work.
4. Explain the current repository state.
5. Create a short implementation plan.
6. Begin Phase 1.
7. Validate Phase 1.
8. Continue sequentially through all phases.

At the end of every phase, show:

```text
PHASE:
STATUS:

WHAT WAS BUILT:

FILES CREATED/CHANGED:

VALIDATION:
- typecheck:
- lint:
- formatting:
- tests:

KNOWN LIMITATIONS:

NEXT PHASE:
```

At the very end, show:

```text
FRAMEWORK STATUS:

CONFIGURATION REQUIRED:

COMMANDS:

QUICK START:

KNOWN LIMITATIONS:

PRODUCTION HARDENING REQUIRED:
```

The ultimate goal is:

```text
I add/edit a requirement
        ↓
npm run ai:test
        ↓
AI generates/updates test artifacts
        ↓
MCP discovers/validates live elements
        ↓
Playwright executes
        ↓
Failures are analyzed
        ↓
Healing is attempted safely
        ↓
Targeted retry
        ↓
Relevant regression
        ↓
Reports generated
        ↓
Healing history stored
```

Build the framework to make this workflow possible.

BEGIN WITH PHASE 1 NOW.
