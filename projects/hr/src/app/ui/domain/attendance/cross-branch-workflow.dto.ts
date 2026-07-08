export type CrossBranchStatus = 'PENDING_CROSS_BRANCH' | 'APPROVED' | 'REJECTED' | 'VOIDED';
export type CrossBranchApprovalAction = 'APPROVE' | 'REJECT' | 'ESCALATE_TO_HR';

export interface CrossBranchEventDTO {
  recordId: number;
  employeeId: number;
  employeeName?: string;
  homeBranchCode: string;
  homeBranchName?: string;
  detectedBranchCode: string;
  detectedBranchName?: string;
  eventTime: string; // ISO timestamp
  eventType: 'IN' | 'OUT';
  biometricDeviceId?: string;
  status: CrossBranchStatus;
  createdAt: string;
}

export interface CrossBranchApprovalDTO {
  recordId: number;
  homeBranchSupervisorId: number;
  supervisorName?: string;
  action: CrossBranchApprovalAction;
  notes?: string;
  rejectionReason?: string; // required if action = REJECT
  ipAddress?: string;
  userAgent?: string;
  approvedAt?: string;
}

export interface CrossBranchSLADTO {
  recordId: number;
  eventTime: string;
  slaDeadline: string; // 4 hours from event
  approvedAt?: string;
  isBreached: boolean;
  timeRemainingMs: number; // milliseconds until SLA breach
  breachNotificationSentAt?: string;
}

export interface CrossBranchNotificationDTO {
  id: string;
  recordId: number;
  employeeId: number;
  supervisorId: number;
  type: 'NEW_REQUEST' | 'SLA_BREACH' | 'ESCALATION';
  title: string;
  message: string;
  deepLink?: string; // link to approval queue
  sentAt: string;
  readAt?: string;
  priority: 'NORMAL' | 'URGENT'; // URGENT for SLA breaches
}

export interface CrossBranchStats {
  pendingApprovals: number;
  approvedToday: number;
  rejectedToday: number;
  slaBreach: number; // count of breached 4h SLAs
  averageApprovalTime: number; // minutes
}
