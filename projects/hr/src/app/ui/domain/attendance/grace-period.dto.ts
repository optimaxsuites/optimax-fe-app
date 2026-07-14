/**
 * ⚠️ NEW FILE (2026-07-14) - Grace period request DTOs
 * Used for managing late arrival grace period requests
 */

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface GracePeriodRequestDTO {
  // System-generated fields
  id?: number; // Unique grace period request ID
  createdAt: string; // ISO timestamp - Request creation timestamp

  // Employee & attendance reference
  employeeId: number; // Employee requesting grace
  attendanceRecordId: number; // Associated attendance record

  // Request details
  requestedMinutes: number; // Minutes of grace requested (e.g., 15 minutes)
  reason: string; // Reason for grace request

  // Evidence
  evidenceDocuments?: string[]; // Supporting document URLs

  // Approval status
  approvalStatus: ApprovalStatus; // Approval status (PENDING|APPROVED|REJECTED)
  approvedBy?: number; // Approving supervisor ID
  approvedAt?: string; // ISO timestamp - Approval timestamp
  approvedMinutes?: number; // Actually approved minutes (may be less than requested)
  rejectionReason?: string; // Reason for rejection
}

export interface GracePeriodApprovalRequest {
  // Request to approve grace period
  requestId: number; // Grace period request ID to approve
  approvedBy: number; // Supervisor approving
  approvedMinutes: number; // Minutes to approve
  notes?: string; // Approval notes/comments
}

export interface GracePeriodRejectionRequest {
  // Request to reject grace period
  requestId: number; // Grace period request ID to reject
  rejectedBy: number; // Supervisor rejecting
  rejectionReason: string; // Reason for rejection
}

export interface GracePeriodStats {
  // Grace period statistics
  totalRequests: number; // Total grace period requests
  pending: number; // Pending requests
  approved: number; // Approved requests
  rejected: number; // Rejected requests
  averageApprovedMinutes: number; // Average minutes approved
  totalMinutesGranted: number; // Total minutes granted this month
}

export interface EmployeeGracePeriodHistory {
  // History of grace periods for an employee
  employeeId: number; // Employee ID
  requests: GracePeriodRequestDTO[]; // All grace period requests
  totalApprovedMinutes: number; // Total minutes approved (all time)
  monthlyApprovedMinutes: number; // Minutes approved this month
  pendingRequests: number; // Pending requests count
}
