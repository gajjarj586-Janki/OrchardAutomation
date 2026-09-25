# Authentication

The framework core ships an *abstraction* only - no real login flow, because that is inherently application-specific.

```ts
type AuthContextType = 'anonymous' | 'authenticated';

interface AuthContext {
  type: AuthContextType;
  storageStatePath?: string;
}
```

`anonymousContext()` / `authenticatedContext(storageStatePath)` (`src/auth/AuthContext.ts`) describe which browsing context a scenario needs; `storageStatePath` maps directly onto Playwright's own `storageState` option.

```ts
interface AuthProvider {
  authenticate(credentials: { username: string; password: string }): Promise<string>;
}
```

To add real login for a project:

1. Implement `AuthProvider` once, performing whatever your application's real login flow is, and have it save/return a Playwright storage-state file path (`page.context().storageState({ path })`).
2. Read credentials from `.env` (`AUTH_USERNAME` / `AUTH_PASSWORD`, see `.env.example`) or a secret manager - **never hardcode them**, and never let them reach a requirement, feature file, or committed test-data file.
3. Pass the resulting `storageStatePath` into `authenticatedContext()` and use that in whichever Page Objects need an authenticated session.

No credentials, cookies, or tokens should ever appear in `requirements/`, `features/`, or Git history - see [Security] in the root README.
