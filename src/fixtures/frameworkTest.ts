import { test as base, expect, type Request, type Response } from '@playwright/test';

export interface ApiCallRecord {
  method: string;
  url: string;
  status?: number;
  requestBody?: string;
  responseBody?: string;
  timestamp: string;
  durationMs?: number;
}

/**
 * The framework's Playwright `test`/`expect` re-export. Generated spec
 * files import from here rather than `@playwright/test` directly, so
 * project-specific fixtures (authentication, test data providers, ...) can
 * be layered on in one place without touching generated files.
 *
 * Two things happen automatically for every test, pass or fail, regardless
 * of `execution.screenshot` in config (which only controls Playwright's
 * own on-failure capture):
 *   - every request/response the page makes is recorded and attached as
 *     "api-calls" (JSON) - see TestRunReport.ts for how this is surfaced
 *     in reports/json/test-run-report.json.
 *   - a final screenshot is attached as "final-screenshot", so reports
 *     always have a visual for passing tests too, not just failures.
 */
export const test = base.extend<{ apiCapture: ApiCallRecord[] }>({
  apiCapture: [
    async ({ page }, use, testInfo) => {
      const calls: ApiCallRecord[] = [];
      const requestStartedAt = new Map<string, number>();

      const onRequest = (request: Request) => {
        requestStartedAt.set(`${request.method()} ${request.url()}`, Date.now());
      };

      const onResponse = async (response: Response) => {
        const request = response.request();
        const key = `${request.method()} ${request.url()}`;
        const startedAt = requestStartedAt.get(key);

        let requestBody: string | undefined;
        let responseBody: string | undefined;
        try {
          requestBody = request.postData() ?? undefined;
        } catch {
          // best-effort only - never fail the test over capture issues
        }
        try {
          const contentType = response.headers()['content-type'] ?? '';
          if (contentType.includes('json') || contentType.includes('text')) {
            responseBody = await response.text();
          }
        } catch {
          // response body may not be readable (e.g. redirects) - skip it
        }

        calls.push({
          method: request.method(),
          url: request.url(),
          status: response.status(),
          requestBody,
          responseBody,
          timestamp: new Date().toISOString(),
          durationMs: startedAt ? Date.now() - startedAt : undefined,
        });
      };

      page.on('request', onRequest);
      page.on('response', onResponse);

      await use(calls);

      page.off('request', onRequest);
      page.off('response', onResponse);

      try {
        await testInfo.attach('api-calls', {
          body: JSON.stringify(calls, null, 2),
          contentType: 'application/json',
        });
      } catch {
        // attaching must never crash the test
      }

      try {
        if (!page.isClosed()) {
          const screenshot = await page.screenshot({ fullPage: true });
          await testInfo.attach('final-screenshot', { body: screenshot, contentType: 'image/png' });
        }
      } catch {
        // page may already be closed/crashed - screenshot is best-effort
      }
    },
    { auto: true },
  ],
});

export { expect };
