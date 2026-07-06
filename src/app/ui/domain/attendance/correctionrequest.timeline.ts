export type CorrectionTimelineActorRole =
  | 'EMPLOYEE'
  | 'SUPERVISOR'
  | 'HR';

export type CorrectionTimelineEventType =
  | 'SUBMITTED'
  | 'APPROVED_BY_SUPERVISOR'
  | 'REJECTED_BY_SUPERVISOR'
  | 'OVERRIDDEN_BY_HR';

export interface CorrectionTimelineEvent {
  id: string;
  type: CorrectionTimelineEventType;
  actorRole: CorrectionTimelineActorRole;
  actorName?: string;
  at: string; // ISO datetime
  message?: string;
  metadata?: Record<string, unknown>;
}

