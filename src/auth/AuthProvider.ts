export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * Contract for project-specific login. The framework core ships no
 * implementation (login is inherently application-specific) - a project
 * implements this once, performing whatever real login flow its app needs,
 * and returns a Playwright storage-state file path other tests can reuse
 * via AuthContext.authenticatedContext(). Credentials must come from
 * environment variables (AUTH_USERNAME/AUTH_PASSWORD, see .env.example) or
 * a secret manager - never hardcoded. See docs/authentication.md.
 */
export interface AuthProvider {
  authenticate(credentials: AuthCredentials): Promise<string>;
}
