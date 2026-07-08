export type ApprovalType = 'PRE_APPROVAL' | 'RETROSPECTIVE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AuditAction = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'OVERRIDDEN' | 'CHECKED_IN';

export interface AuditLogEntryDTO {
  id: string;
  actor: {
    id: number;
    name: string;
    role: string;
  };
  action: AuditAction;
  timestamp: string;
  details: string;
  ipAddress: string;
  userAgent: string;
}

export interface CrossBranchCheckInRequest {
  id: string;
  employeeId: number;
  employeeName?: string;
  requestDate: string;
  requestedBranchId: number;
  requestedBranchName?: string;
  homeBranchId: number;
  homeBranchName?: string;
  approvalRequired: boolean;
  approvalType: ApprovalType;
  supervisorId?: number;
  supervisorName?: string;
  supervisorApprovalStatus: ApprovalStatus;
  supervisorNote?: string;
  approvalTimestamp?: string;
  auditLog: AuditLogEntryDTO[];
  createdAt: string;
  updatedAt?: string;
}

export interface CrossBranchApprovalRequest {
  requestId: string;
  supervisorId: number;
  action: 'APPROVE' | 'REJECT';
  note?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CrossBranchAdminOverride {
  requestId: string;
  adminId: number;
  action: string;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CrossBranchAuditQuery {
  employeeId?: number;
  startDate?: string;
  endDate?: string;
  branchId?: number;
  action?: AuditAction;
  actorId?: number;
}
