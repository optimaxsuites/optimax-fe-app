export type CorrectionStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED';
export type CorrectionType = 'MISSING_IN' | 'MISSING_OUT' | 'WRONG_TIME' | 'OTHER';

export interface CorrectionRequestDTO {
  id: string;
  attendanceRecordId: number;
  employeeId: number;
  employeeName?: string;
  requestedBy: number;
  correctionType: CorrectionType;
  originalTime?: string; // ISO timestamp
  requestedTime?: string; // ISO timestamp
  reason: string;
  supportingDocs?: string[]; // file URLs
  status: CorrectionStatus;
  reviewedBy?: number;
  reviewerName?: string;
  reviewedAt?: string; // ISO timestamp
  reviewerNotes?: string;
  rejectionReason?: string;
  escalatedAt?: string; // SLA escalation timestamp
  isEscalated?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CorrectionApprovalDTO {
  requestId: string;
  approvedBy: number;
  approverName: string;
  action: 'APPROVE' | 'REJECT';
  reviewerNotes?: string;
  rejectionReason?: string; // required if action = REJECT
  ipAddress?: string;
  userAgent?: string;
  approvedAt?: string;
}

export interface CorrectionSLADTO {
  requestId: string;
  createdAt: string;
  slaDeadline: string; // 24 hours from creation
  escalatedAt?: string; // if missed SLA
  isEscalated: boolean;
  timeRemainingMs: number; // milliseconds until SLA breach
}

export interface CorrectionsStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  averageResolutionTime: number; // hours
  slaBreach: number; // count of breached SLAs
}
