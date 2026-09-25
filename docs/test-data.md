# Test data

Test data is kept separate from requirements/features/steps - neither should ever contain real values, especially secrets.

```
test-data/
├── users.json
├── products.json
└── environments/
    └── local.json
```

```ts
interface TestDataProvider {
  get<T>(key: string): Promise<T>;
}
```

`JsonTestDataProvider` (`src/data/JsonTestDataProvider.ts`) is the only implementation shipped: `get('users')` reads `test-data/users.json`; `get('users.standardUser')` reads that file and drills into `.standardUser`. It throws a `FrameworkError` (not a raw exception) when the file or path segment doesn't exist.

Future providers (not implemented yet) can add YAML, [Faker](https://fakerjs.dev/)-generated data, an API-backed provider, or a database-backed one - each just needs to implement the same `TestDataProvider` interface.

**Never commit real user data, credentials, or production-derived values here.** Use obviously-generic placeholders, as the shipped examples do.
