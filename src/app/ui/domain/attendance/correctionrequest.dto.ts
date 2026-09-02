export type CorrectionStatus = 'PENDING' | 'UNDER_REVIEW' | 'SUBMITTED' | 'REJECTED';
export type IssueType = 'MISSED_CLOCK' | 'WRONG_TIME' | 'OTHER';

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
