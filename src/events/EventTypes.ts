/**
 * Canonical audit event names emitted by pipeline stages. This is the full
 * set from the framework requirements; individual phases emit the subset
 * relevant to what they implement. Keeping the full union defined up front
 * means later phases never invent ad-hoc event names.
 */
export const FRAMEWORK_EVENT_NAMES = [
  'REQUIREMENT_READ',
  'FEATURE_GENERATED',
  'FEATURE_VALIDATED',
  'STEP_GENERATED',
  'LOCATOR_DISCOVERED',
  'LOCATOR_VALIDATED',
  'TEST_EXECUTED',
  'TEST_FAILED',
  'FAILURE_ANALYZED',
  'HEALING_STARTED',
  'HEALING_CANDIDATE_FOUND',
  'HEALING_CANDIDATE_VALIDATED',
  'TARGETED_RETRY_STARTED',
  'TARGETED_RETRY_PASSED',
  'REGRESSION_STARTED',
  'REGRESSION_PASSED',
  'HEALING_COMPLETED',
  'PATCH_REQUIRES_APPROVAL',
] as const;

export type FrameworkEventName = (typeof FRAMEWORK_EVENT_NAMES)[number];

export interface FrameworkEvent<TPayload = Record<string, unknown>> {
  name: FrameworkEventName;
  executionId: string;
  timestamp: string;
  payload: TPayload;
}
