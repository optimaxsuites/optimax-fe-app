/**
 * ⚠️ UPDATED (2026-07-14) - Added missing fields: workDate, reason
 */

export type ApprovalType = 'PRE_APPROVAL' | 'RETROSPECTIVE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AuditAction = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'OVERRIDDEN' | 'CHECKED_IN';

export interface AuditLogEntryDTO {
  id: string; // Unique log entry ID
  actor: {
    id: number; // User ID
    name: string; // User name
    role: string; // User role
  };
  action: AuditAction; // Action performed
  timestamp: string; // ISO timestamp - When action occurred
  details: string; // Action details
  ipAddress: string; // Source IP address
  userAgent: string; // Browser/app user agent
}

export interface CrossBranchCheckInRequest {
  // System-generated fields
  id: string; // Unique request identifier
  createdAt: string; // ISO timestamp - Request creation timestamp
  updatedAt?: string; // ISO timestamp - Last update timestamp

  // Employee information
  employeeId: number; // Employee requesting cross-branch work
  employeeName?: string; // Employee name (optional)

  // Branch information
  homeBranchId: number; // Employee's primary branch
  homeBranchName?: string; // Home branch name (optional)
  requestedBranchId: number; // Branch where work will occur
  requestedBranchName?: string; // Requested branch name (optional)

  // Request timing (NEW FIELDS)
  requestDate: string; // ISO date - When request was submitted
  workDate: string; // ISO date - When work at other branch will occur

  // Request details (NEW FIELD)
  reason: string; // Reason for cross-branch work

  // Approval information
  approvalRequired: boolean; // Whether approval is required
  approvalType: ApprovalType; // Pre or retrospective approval
  supervisorId?: number; // Supervisor ID
  supervisorName?: string; // Supervisor name (optional)
  supervisorApprovalStatus: ApprovalStatus; // Supervisor approval status
  supervisorNote?: string; // Supervisor comments
  approvalTimestamp?: string; // ISO timestamp - When approved

  // Audit trail
  auditLog: AuditLogEntryDTO[]; // Complete action history
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
