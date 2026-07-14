/**
 * ⚠️ NEW FILE (2026-07-14) - Audit logging DTOs
 * Tracks all changes to attendance records for compliance and audit purposes
 */

export type AuditRecordType = 'ATTENDANCE_RECORD' | 'CORRECTION_REQUEST' | 'GRACE_PERIOD' | 'DEVICE';
export type AuditAction = 'CREATED' | 'UPDATED' | 'APPROVED' | 'REJECTED' | 'LOCKED';

export interface AttendanceAuditLogDTO {
  // System-generated fields
  id?: number; // Unique audit log ID

  // Record being audited
  recordType: AuditRecordType; // Type of record audited
  recordId: number; // ID of the record being audited

  // Employee reference
  employeeId: number; // Employee affected

  // Action details
  action: AuditAction; // Action performed
  changedBy: number; // User ID who made the change
  changedAt: string; // ISO timestamp - When change occurred

  // Change tracking
  previousValue?: string; // JSON string of previous state
  newValue?: string; // JSON string of new state

  // Additional context
  reason?: string; // Why the change was made
  ipAddress?: string; // Source IP address
  userAgent?: string; // Browser/app user agent (optional)
}

export interface AuditLogQuery {
  // Query criteria for audit log search
  recordType?: AuditRecordType; // Filter by record type
  action?: AuditAction; // Filter by action
  employeeId?: number; // Filter by employee
  changedBy?: number; // Filter by user who made change
  startDate?: string; // ISO date - Start date range
  endDate?: string; // ISO date - End date range
  recordId?: number; // Filter by specific record ID
}

export interface AuditTrail {
  // Complete audit trail for a record
  recordId: number; // Record ID
  recordType: AuditRecordType; // Type of record
  events: AttendanceAuditLogDTO[]; // Chronological list of changes
  currentState: any; // Current data state
  createdAt: string; // ISO timestamp - When record was created
  lastModifiedAt: string; // ISO timestamp - When last modified
  lastModifiedBy: number; // User ID of last modifier
  modificationCount: number; // Total modifications
}

export interface AuditReport {
  // Audit report for a time period
  period: string; // YYYY-MM - Report period
  totalChanges: number; // Total changes logged

  // Breakdown by action
  byAction: {
    CREATED: number; // Records created
    UPDATED: number; // Records updated
    APPROVED: number; // Records approved
    REJECTED: number; // Records rejected
    LOCKED: number; // Records locked
  };

  // Breakdown by record type
  byRecordType: {
    ATTENDANCE_RECORD: number; // Attendance record changes
    CORRECTION_REQUEST: number; // Correction request changes
    GRACE_PERIOD: number; // Grace period changes
    DEVICE: number; // Device changes
  };

  // Top changed records
  topChangedRecords: Array<{
    recordType: AuditRecordType; // Record type
    recordId: number; // Record ID
    changeCount: number; // Number of changes
    lastChanged: string; // ISO timestamp - Last change
  }>;

  // Top users making changes
  topUsers: Array<{
    userId: number; // User ID
    userName: string; // User name
    changeCount: number; // Number of changes made
    lastChange: string; // ISO timestamp - Last change
  }>;
}

export interface AuditExportRequest {
  // Request to export audit log
  startDate: string; // ISO date - Start date
  endDate: string; // ISO date - End date
  recordType?: AuditRecordType; // Optional filter
  format: 'CSV' | 'JSON' | 'PDF'; // Export format
}

export interface AuditExportResponse {
  // Response with export data
  fileName: string; // Generated filename
  fileUrl: string; // URL to download file
  recordCount: number; // Number of records exported
  generatedAt: string; // ISO timestamp - When generated
  expiresAt: string; // ISO timestamp - When file expires
}

export interface AuditComplianceReport {
  // Compliance-focused audit report
  period: string; // YYYY-MM - Report period
  totalRecords: number; // Total records audited
  untracked: number; // Records with no audit trail
  fullyTracked: number; // Records with complete audit trail
  complianceScore: number; // 0-100 compliance percentage
  issues: string[]; // Compliance issues found
  recommendations: string[]; // Recommendations
}
