1. Configure a new project

For each application, you provide project-specific configuration, for example:

config/project.config.yaml
project:
  name: my-application

application:
  baseUrl: "https://my-app.example"

execution:
  browser: chromium
  headless: true

You also configure your AI provider and MCP provider through environment/configuration.

2. Add a requirement

You create something like:

requirements/search.md

For example:

# Search

## Description
The user should be able to search for a product.

## Acceptance Criteria
- User can enter a search term.
- Search results are displayed.
- Empty search shows validation.

You don't manually write the Playwright code.

3. Run one command
npm run ai:test

The framework then does approximately:

requirements/search.md
        ↓
       AI
        ↓
features/search.feature
        ↓
step generation
        ↓
Page Object generation
        ↓
MCP opens/inspects application
        ↓
locator discovery
        ↓
locator validation
        ↓
Playwright test
        ↓
PASS / FAIL
4. If something breaks

Suppose the application changes:

Old:
button id = "searchBtn"

New:
button id = "search-submit"

The original test fails.

Instead of you immediately fixing the locator manually:

Test FAILED
     ↓
Failure Analyzer
     ↓
MCP inspects current page
     ↓
Find candidate
     ↓
Candidate validation
     ↓
Targeted retry

If the candidate is valid:

Original: FAILED
Healing: candidate found
Validation: PASSED
Retry: PASSED
Regression: PASSED

The framework records the healing event.

Because the default is:

autoPatch: false

it doesn't silently modify your source code.

5. Look at the reports

After execution you'll have something like:

reports/
├── playwright/
│   └── ...
├── json/
│   └── results.json
├── ai/
│   └── ai-report.html
└── healing/
    └── healing-report.html

You can see:

What requirements were processed
What scenarios were generated
What tests ran
What passed
What failed
Which failures were healed
Which locator candidates were found
Why a candidate was selected
Whether targeted retry passed
Whether regression passed
Which changes require human approval
Then you can reuse the framework

This is the important part.

Imagine you have:

Project A
Project B
Project C

You don't build three separate AI frameworks.

Instead:

             GENERIC FRAMEWORK
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
    Project A   Project B   Project C

Each project provides its own:

requirements/
config/
test-data/
application URL
AI configuration
MCP configuration

while the framework provides:

AI generation
BDD generation
locator discovery
Playwright execution
failure analysis
healing
retry
regression
reporting
Your normal future workflow

Once everything is configured, it can be as simple as:

# Add/change requirements
requirements/

# Run everything
npm run ai:test

And when a test fails:

FAIL
 ↓
AI + MCP analysis
 ↓
healing candidate
 ↓
validation
 ↓
targeted retry
 ↓
regression
 ↓
report

One caveat: the framework can automate the pipeline, but it cannot eliminate initial setup. Each real application still needs its URL, environment/auth configuration, AI provider, and a compatible MCP browser integration configured. After that, the goal is exactly what you're describing: requirement → npm run ai:test → tests + healing + reports.