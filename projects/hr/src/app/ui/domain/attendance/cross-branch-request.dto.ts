/**
 * Cross-Branch Request Resource: /x/api/v2/hr/cross-branch-requests
 * Cross-branch requests are AUTO-CREATED when an employee checks in at a non-home branch;
 * a supervisor/admin approves after the fact (RETROSPECTIVE only).
 */
import { EmployeeDetailDTO, PagedResponse } from './attendance-event.dto';

export type ApprovalType = 'RETROSPECTIVE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AuditAction = 'AUTO_CREATED' | 'APPROVED' | 'REJECTED' | 'OVERRIDDEN';

export interface AuditLogEntryDTO {
  actor: number;
  action: AuditAction;
  timestamp: string;
  details: string;
  ipAddress: string;
  userAgent: string;
}

/** GET /cross-branch-requests, GET /cross-branch-requests/{id}, GET .../pending, GET .../employee/{id} */
export interface CrossBranchCheckInRequest {
  id: number;
  employeeId: EmployeeDetailDTO;

  homeBranchCode: string;
  homeBranchName?: string;
  requestedBranchCode: string;
  requestedBranchName?: string;

  requestDate: string; // when check-in occurred (auto-created)
  workDate: string; // when work at the other branch occurred

  reason: string;

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

/** POST /cross-branch-requests — request body (FK ids, not embedded objects) */
export interface CreateCrossBranchRequestBody {
  employeeId: number;
  homeBranchCode: string;
  homeBranchName?: string;
  requestedBranchCode: string;
  requestedBranchName?: string;
  requestDate: string;
  workDate: string;
  reason: string;
  approvalRequired?: boolean;
  approvalType?: ApprovalType;
}

/** PUT /cross-branch-requests/{id}/approve, PUT /cross-branch-requests/{id}/override */
export interface CrossBranchApprovalRequest {
  supervisorId: number;
  action: 'APPROVE' | 'REJECT';
  note?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** POST /cross-branch-requests/{id}/override */
export interface CrossBranchAdminOverride {
  adminId: number;
  action: string;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}

export type { PagedResponse };
