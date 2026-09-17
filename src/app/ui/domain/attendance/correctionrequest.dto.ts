import { EmployeeDetailDTO, PagedResponse } from './attendance-event.dto';

export type { PagedResponse };

export type CorrectionType = 'MISSING_IN' | 'MISSING_OUT' | 'WRONG_TIME' | 'OTHER';

export type CorrectionStatus = 'PENDING' | 'UNDER_REVIEW' | 'SUBMITTED' | 'REJECTED';

/**
 * Issue type is a separate backend enum from CorrectionType (confirmed example: issueType
 * 'MISSED_CLOCK' vs correctionType 'MISSING_IN') — no full crosswalk is confirmed yet, so this
 * stays a loose string rather than a guessed union.
 */
export type IssueType = string;

/** Best-effort placeholder until the backend's issueType <-> correctionType crosswalk is confirmed. */
export const IssueToCorrectionType = (issueType: IssueType): CorrectionType => {
  return issueType as CorrectionType;
};

export interface CorrectionRequestHistory {
  status: CorrectionStatus;
  actor: string;
  note?: string;
  createdAt: Date;
}

/** UI-facing model used throughout the attendance module (employee/department are display-only helpers). */
export interface CorrectionRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  department: string;
  date: Date;
  issueType: IssueType;
  correctionType: CorrectionType;
  requestedClockIn?: Date;
  requestedClockOut?: Date;
  description?: string;
  evidence?: string;
  status: CorrectionStatus;
  locked: boolean;
  rejectionReason?: string;
  latestNotification?: string;
  history: CorrectionRequestHistory[];
  createdAt: Date;
  updatedAt?: Date;
}

/* ------------------------------- Raw API shapes ------------------------------- */

export interface CorrectionHistoryEntryDTO {
  status: CorrectionStatus;
  actor: number;
  comments?: string;
  createdAt: string;
}

/** GET /correction-requests, GET /correction-requests/{id} — response shape (employee is embedded) */
export interface CorrectionRequestApiDTO {
  id: number;
  employeeId: EmployeeDetailDTO;
  attendanceDate: string;
  issueType: IssueType;
  correctionType: CorrectionType;
  requestedClockIn?: string;
  requestedClockOut?: string;
  description?: string;
  evidence?: string;
  status: CorrectionStatus;
  locked: boolean;
  rejectionReason?: string;
  latestNotification?: string;
  history: CorrectionHistoryEntryDTO[];
  createdAt: string;
  updatedAt?: string;
}

/** POST /correction-requests — request body (employeeId is the raw FK) */
export interface CreateCorrectionRequestBody {
  employeeId: number;
  attendanceDate: string;
  issueType: IssueType;
  correctionType: CorrectionType;
  requestedClockIn?: string;
  requestedClockOut?: string;
  description?: string;
  evidence?: string;
  status?: CorrectionStatus;
  locked?: boolean;
  rejectionReason?: string;
  latestNotification?: string;
}

/** PUT /correction-requests/{id}/status */
export interface UpdateCorrectionStatusRequest {
  newStatus: CorrectionStatus;
  actorUserId: number;
  comments?: string;
}
