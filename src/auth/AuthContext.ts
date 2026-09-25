export type AuthContextType = 'anonymous' | 'authenticated';

/**
 * Describes which browsing context a scenario runs in, not how to log in
 * (that is inherently application-specific - see AuthProvider). Playwright
 * consumes `storageStatePath` directly as its `storageState` option.
 */
export interface AuthContext {
  type: AuthContextType;
  storageStatePath?: string;
}

export function anonymousContext(): AuthContext {
  return { type: 'anonymous' };
}

export function authenticatedContext(storageStatePath: string): AuthContext {
  return { type: 'authenticated', storageStatePath };
}
