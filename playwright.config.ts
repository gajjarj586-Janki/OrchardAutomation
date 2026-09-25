import { defineConfig, devices } from '@playwright/test';
import { loadConfig } from './src/config/ConfigLoader';

const config = loadConfig();
const { execution, application } = config;

/**
 * Playwright execution settings are driven entirely by config/default.yaml
 * (+ config/local.yaml + env overrides), not hardcoded here, so a new
 * project can change browser/timeouts/artifacts without touching framework
 * core. See docs/configuration.md.
 */
export default defineConfig({
  testDir: './tests',
  timeout: execution.timeout,
  retries: execution.retries,
  workers: execution.workers,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
    ['json', { outputFile: 'reports/json/playwright-results.json' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: application.baseUrl || undefined,
    headless: execution.headless,
    navigationTimeout: execution.navigationTimeout,
    screenshot: execution.screenshot,
    trace: execution.trace,
    video: execution.video,
    // Optional: use a system-installed browser (e.g. "msedge", "chrome")
    // instead of Playwright's bundled binaries - useful on machines/CI
    // runners without internet access to download them. See docs/ci-cd.md.
    channel: process.env.PW_CHANNEL || undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ].filter((project) => project.name === execution.browser || execution.browser === undefined),
});
