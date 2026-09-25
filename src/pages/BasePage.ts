import type { Page } from '@playwright/test';

/**
 * Deliberately tiny and generic - see docs/architecture.md's Page Object
 * guidance ("avoid giant BasePage classes"). Concrete Page Objects own
 * their own locators and interactions; this only holds the Playwright page.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}
}
