1. Sanity-check the requirement is recognized:


npm run requirements -- --env stage
Should print the title and target URL instead of "No requirement files found".

2. Generate the Gherkin feature:


npm run generate:features -- --env stage
Creates features/BATD.feature (or similar, named from the requirement).

3. Generate steps + Page Object scaffold:


npm run generate:steps -- --env stage
Creates steps/BATD.steps.ts and src/pages/generated/BookATestDrivePage.ts (stub methods, NOT_IMPLEMENTED).

4. Generate the Playwright test:


npm run generate:tests -- --env stage
Creates tests/generated/BATD.spec.ts.

5. Run it once, expecting the deliberate failure:


$env:APP_ENV='stage'; npm test
This will fail with NOT_IMPLEMENTED — expected, since the AI scaffolds structure but not business logic (real selectors, form-fill steps).

6. Implement the Page Object — open src/pages/generated/BookATestDrivePage.ts and fill in the stub methods with real Playwright interactions for Hyundai's actual test-drive form (selectors, fills, clicks, the submit-response wait). docs/example-walkthrough.md:118-174 has a fully worked version of this exact page if you want a reference to adapt.

7. Run the full pipeline:


npm run ai:test -- --env stage
8. Check the report:


npm run report
then look in reports/.


//To run generated script
$env:APP_ENV='stage'; npx playwright test tests/generated/Ownership.spec.ts
