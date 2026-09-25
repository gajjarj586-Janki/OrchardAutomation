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
      // onResponse is async (it awaits response.text()) but 'response' event
      // listeners aren't awaited by Playwright, so a response arriving right
      // before the test ends could still be mid-capture when teardown runs.
      // Tracking each call's promise here lets teardown await them all
      // before attaching, instead of silently dropping late-arriving calls.
      const pending: Promise<void>[] = [];

      const onRequest = (request: Request) => {
        requestStartedAt.set(`${request.method()} ${request.url()}`, Date.now());
      };

      const captureResponse = async (response: Response) => {
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

      const onResponse = (response: Response) => {
        pending.push(captureResponse(response));
      };

      page.on('request', onRequest);
      page.on('response', onResponse);

      await use(calls);

      page.off('request', onRequest);
      page.off('response', onResponse);
      await Promise.allSettled(pending);

      try {
        await testInfo.attach('api-calls', {
          body: JSON.stringify(calls, null, 2),
          contentType: 'application/json',
        });
      } catch {
        // attaching must never crash the test
      }

      // Bakes any mutating, first-party API call's JSON payload into the
      // page before the final screenshot below, so reports/playwright shows
      // what was actually sent - not just a confirmation banner - for every
      // test, without each Page Object needing its own copy of this.
      // "Valid JSON body" alone isn't a strict enough filter: some
      // third-party trackers (observed: Snapchat's pixel, adsrvr.org's
      // conversion beacon) also POST JSON. Restricting to the page's own
      // hostname is what actually isolates the app's own form-submission
      // calls from the hundreds of third-party analytics/tracking requests
      // a real page fires - no per-page allowlist needed.
      let pageHostname: string | null = null;
      try {
        pageHostname = new URL(page.url()).hostname;
      } catch {
        // page may be closed/navigated away - fall through with no filter
      }

      const payloadCalls = calls
        .filter((c) => ['POST', 'PUT', 'PATCH'].includes(c.method) && c.requestBody)
        .filter((c) => {
          if (!pageHostname) return true;
          try {
            return new URL(c.url).hostname === pageHostname;
          } catch {
            return false;
          }
        })
        .map((c) => {
          try {
            return { method: c.method, url: c.url, status: c.status, payload: JSON.parse(c.requestBody!) };
          } catch {
            return null;
          }
        })
        .filter(
          (c): c is { method: string; url: string; status: number | undefined; payload: unknown } =>
            c !== null
        );

      if (payloadCalls.length > 0) {
        try {
          if (!page.isClosed()) {
            await page.evaluate((callsJson: string) => {
              const doc = (globalThis as unknown as { document: any }).document;
              const calls = JSON.parse(callsJson) as Array<{
                method: string;
                url: string;
                status?: number;
                payload: Record<string, unknown>;
              }>;

              const valueColor = (v: unknown) =>
                v === null
                  ? '#8e8e8e'
                  : typeof v === 'boolean' || typeof v === 'number'
                    ? '#1a01cc'
                    : '#c41a16';
              const formatValue = (v: unknown) => (v === null ? 'null' : JSON.stringify(v));

              const panel = doc.createElement('div');
              panel.id = 'framework-captured-payloads-panel';
              Object.assign(panel.style, {
                margin: '0',
                padding: '16px 20px',
                background: '#f8f9fa',
                color: '#202124',
                fontFamily: 'Menlo, Consolas, "Roboto Mono", monospace',
                fontSize: '12px',
                lineHeight: '1.6',
                borderTop: '3px solid #1a73e8',
              });

              for (const call of calls) {
                const heading = doc.createElement('div');
                heading.textContent = `Captured Payload — ${call.method} ${call.status ?? ''} ${call.url}`;
                Object.assign(heading.style, {
                  fontWeight: '700',
                  fontSize: '13px',
                  margin: '12px 0 8px',
                  color: '#1a73e8',
                });
                panel.appendChild(heading);

                const entries = Object.entries(call.payload ?? {}).sort(([a], [b]) => a.localeCompare(b));
                for (const [key, value] of entries) {
                  const row = doc.createElement('div');
                  const keySpan = doc.createElement('span');
                  keySpan.textContent = key + ': ';
                  keySpan.style.color = '#881391';
                  const valueSpan = doc.createElement('span');
                  valueSpan.textContent = formatValue(value);
                  valueSpan.style.color = valueColor(value);
                  row.appendChild(keySpan);
                  row.appendChild(valueSpan);
                  panel.appendChild(row);
                }
              }

              doc.body.appendChild(panel);
            }, JSON.stringify(payloadCalls));
          }
        } catch {
          // best-effort visual aid only - must never fail the test
        }
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
