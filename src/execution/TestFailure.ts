export interface TestFailure {
  testName: string;
  scenario?: string;
  feature?: string;
  error: string;
  url?: string;
  screenshot?: string;
  trace?: string;
  video?: string;
  timestamp: string;
  environment?: string;
}
