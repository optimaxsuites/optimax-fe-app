/**
 * UNIFIED CORRECTION TYPE - Backend & Frontend Match
 * Both sides use the same enum values from backend
 */

export type CorrectionType = 'MISSING_IN' | 'MISSING_OUT' | 'WRONG_TIME' | 'OTHER';

export type CorrectionStatus = 'PENDING' | 'UNDER_REVIEW' | 'SUBMITTED' | 'REJECTED';

// Issue type (for employee-facing form - maps to CorrectionType)
// MISSING_IN: Forgot to clock in
// MISSING_OUT: Forgot to clock out
// WRONG_TIME: Clock times are incorrect
// OTHER: Any other correction
export type IssueType = 'MISSING_IN' | 'MISSING_OUT' | 'WRONG_TIME' | 'OTHER';

/**
 * Employee form issue type → backend correction type (direct mapping)
 */
export const IssueToCorrectionType = (issueType: IssueType): CorrectionType => {
  return issueType; // Direct mapping: form uses same types as backend
};

export interface CorrectionRequestHistory {
  status: CorrectionStatus;
  actor: string;
  note?: string;
  createdAt: Date;
}

export interface CorrectionRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  department: string;
  date: Date;
  issueType: IssueType;
  correctionType: CorrectionType; // Backend enum value
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
