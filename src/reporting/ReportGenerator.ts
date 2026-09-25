import fs from 'node:fs';
import path from 'node:path';
import type { FrameworkConfig } from '../config/schema';
import type { FrameworkEvent } from '../events/EventTypes';
import type { HealingAttemptRecord } from '../healer/HealingHistory';
import { buildExecutionSummary, type ExecutionSummary } from './ExecutionSummary';
import { buildAIReport, writeAIReport, type AIReport } from './AIReportGenerator';
import {
  buildHealingReport,
  writeHealingReport,
  type HealingReport,
} from './HealingReportGenerator';
import { buildTestRunReport, writeTestRunReport, type DetailedTestResult } from './TestRunReport';

export interface GenerateReportsParams {
  rootDir: string;
  config: FrameworkConfig;
  requirementsProcessed: number;
  featuresGenerated: number;
  events: readonly FrameworkEvent[];
  healingRecords: HealingAttemptRecord[];
}

export interface GeneratedReports {
  execution: ExecutionSummary;
  ai: AIReport;
  healing: HealingReport;
  testRun: DetailedTestResult[];
  paths: {
    executionSummary: string;
    aiReport: string;
    healingReportJson: string;
    healingReportText: string;
    testRunReport: string;
  };
}

/**
 * Writes every machine- and human-readable report the pipeline produces:
 * reports/json/execution-summary.json (aggregate), reports/json/test-run-
 * report.json (per-test status/duration/screenshots/API payloads),
 * reports/ai/ai-report.json, reports/healing/healing-report.(json|txt).
 * Playwright's own HTML/JSON reporters (reports/playwright, reports/json/
 * playwright-results.json) are written directly by Playwright - see
 * playwright.config.ts.
 */
export function generateReports(params: GenerateReportsParams): GeneratedReports {
  const reportPath = path.join(params.rootDir, 'reports', 'json', 'playwright-results.json');
  const screenshotsDir = path.join(params.rootDir, 'reports', 'screenshots');

  const execution = buildExecutionSummary({
    requirementsProcessed: params.requirementsProcessed,
    featuresGenerated: params.featuresGenerated,
    reportPath,
  });
  const ai = buildAIReport(params.config, params.events);
  const healing = buildHealingReport(params.healingRecords);
  const testRun = fs.existsSync(reportPath) ? buildTestRunReport(reportPath, screenshotsDir) : [];

  const paths = {
    executionSummary: path.join(params.rootDir, 'reports', 'json', 'execution-summary.json'),
    aiReport: path.join(params.rootDir, 'reports', 'ai', 'ai-report.json'),
    healingReportJson: path.join(params.rootDir, 'reports', 'healing', 'healing-report.json'),
    healingReportText: path.join(params.rootDir, 'reports', 'healing', 'healing-report.txt'),
    testRunReport: path.join(params.rootDir, 'reports', 'json', 'test-run-report.json'),
  };

  fs.mkdirSync(path.dirname(paths.executionSummary), { recursive: true });
  fs.writeFileSync(paths.executionSummary, JSON.stringify(execution, null, 2), 'utf-8');
  writeAIReport(ai, paths.aiReport);
  writeHealingReport(healing, paths.healingReportJson, paths.healingReportText);
  writeTestRunReport(testRun, paths.testRunReport);

  return { execution, ai, healing, testRun, paths };
}
