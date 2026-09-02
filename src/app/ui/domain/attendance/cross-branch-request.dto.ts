/**
 * ⚠️ UPDATED (2026-08-31) - Simplified to RETROSPECTIVE only
 * Cross-branch requests are AUTO-CREATED when employee checks in at non-home branch
 * Supervisor/admin approves after the fact
 * Uses employeeDTO for employee information (see EMPLOYEE_ID_PATTERNS.md)
 */

import { employeeDTO } from '../employee.dto';

export type ApprovalType = 'RETROSPECTIVE'; // Auto-created after check-in (removed PRE_APPROVAL)
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AuditAction = 'AUTO_CREATED' | 'APPROVED' | 'REJECTED' | 'OVERRIDDEN';

export interface AuditLogEntryDTO {
  id: string; // Unique log entry ID
  actor: {
    id: number; // User ID
    name: string; // User name
    role: string; // User role
  };
  action: AuditAction; // Action performed
  timestamp: Date; // When action occurred
  details: string; // Action details
  ipAddress: string; // Source IP address
  userAgent: string; // Browser/app user agent
}

export interface CrossBranchCheckInRequest {
  // System-generated fields
  id: string; // Unique request identifier
  createdAt: Date; // Request creation timestamp
  updatedAt?: Date; // Last update timestamp

  // Employee information
  employeeId: number; // Employee unique identifier (database ID)
  employee: employeeDTO; // Employee information (name, email, department, primaryBranchId, etc.)

  // Branch information
  requestedBranchId: number; // Branch where work will occur
  requestedBranchName?: string; // Requested branch name (optional)

  // Request timing
  requestDate: Date; // When check-in occurred (auto-created)
  workDate: Date; // When work at other branch occurred

  // Request details
  reason: string; // Auto-populated: "Employee checked in at different branch"

  // Approval information
  approvalRequired: boolean; // Always true for cross-branch
  approvalType: ApprovalType; // Always RETROSPECTIVE (auto-created after check-in)
  supervisorId?: number; // Supervisor ID
  supervisorName?: string; // Supervisor name (optional)
  supervisorApprovalStatus: ApprovalStatus; // Supervisor approval status
  supervisorNote?: string; // Supervisor comments
  approvalTimestamp?: Date; // When approved

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
