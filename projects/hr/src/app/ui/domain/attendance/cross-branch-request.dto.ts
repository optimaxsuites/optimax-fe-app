/**
 * ⚠️ UPDATED (2026-08-31) - Simplified to RETROSPECTIVE only
 * Cross-branch requests are AUTO-CREATED when employee checks in at non-home branch
 * Supervisor/admin approves after the fact
 */

export type ApprovalType = 'RETROSPECTIVE'; // Auto-created after check-in (removed PRE_APPROVAL)
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AuditAction = 'AUTO_CREATED' | 'APPROVED' | 'REJECTED' | 'OVERRIDDEN';

export interface AuditLogEntryDTO {
  id: string;
  actor: {
    id: number;
    name: string;
    role: string;
  };
  action: AuditAction;
  timestamp: Date;
  details: string;
  ipAddress: string;
  userAgent: string;
}

export interface CrossBranchCheckInRequest {
  id: string;
  createdAt: Date;
  updatedAt?: Date;

  employeeId: string; // Database ID

  // Branch information (backend contract uses branch codes, not numeric IDs)
  homeBranchCode: string;
  homeBranchName?: string;
  requestedBranchCode: string;
  requestedBranchName?: string;

  requestDate: Date; // When check-in occurred (auto-created)
  workDate: Date; // When work at other branch occurred

  reason: string; // Auto-populated: "Employee checked in at different branch"

  approvalRequired: boolean; // Always true for cross-branch
  approvalType: ApprovalType; // Always RETROSPECTIVE (auto-created after check-in)
  supervisorId?: number;
  supervisorName?: string;
  supervisorApprovalStatus: ApprovalStatus;
  supervisorNote?: string;
  approvalTimestamp?: Date;

  auditLog: AuditLogEntryDTO[];
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
