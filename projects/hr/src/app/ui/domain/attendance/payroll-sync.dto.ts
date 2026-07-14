/**
 * ⚠️ NEW FILE (2026-07-14) - Payroll integration and synchronization DTOs
 * Manages attendance to payroll sync and validation
 */

export type SyncStatus = 'PENDING' | 'SYNCED' | 'VALIDATED' | 'ERROR';

export interface AttendancePayrollSyncDTO {
  // System-generated fields
  id?: number; // Sync record ID
  syncedAt?: string; // ISO timestamp - When synced
  validatedAt?: string; // ISO timestamp - When validated

  // Employee & period reference
  employeeId: number; // Employee
  month: string; // YYYY-MM - Payroll month

  // Calendar information
  totalDays: number; // Total calendar days in month
  workingDays: number; // Expected working days

  // Attendance counts
  presentDays: number; // Days present
  absentDays: number; // Days absent
  lateArrivalDays: number; // Days with late arrival

  // Hours tracking
  totalHoursWorked: number; // Decimal - Total hours worked
  overtimeHours: number; // Overtime hours
  undertimeHours: number; // Undertime hours

  // Payroll calculation
  payableHours: number; // Hours used for payroll (after adjustments)

  // Status tracking
  syncStatus: SyncStatus; // Current sync status
  validatedBy?: number; // Validator user ID
  errors?: string[]; // Validation errors if any
}

export interface PayrollSyncRequest {
  // Request to sync attendance to payroll
  month: string; // YYYY-MM - Month to sync
  employeeIds?: number[]; // Specific employees (all if null)
  dryRun?: boolean; // Preview only without updating
}

export interface PayrollSyncResponse {
  // Response from sync request
  syncedCount: number; // Successfully synced
  failureCount: number; // Failed syncs
  errors?: Array<{
    employeeId: number; // Failed employee
    error: string; // Error message
  }>; // Details of failures
  startTime: string; // ISO timestamp - When sync started
  endTime: string; // ISO timestamp - When sync completed
}

export interface PayrollValidationResult {
  // Validation result for payroll data
  employeeId: number; // Employee validated
  isValid: boolean; // Whether data is valid
  errors: string[]; // Validation errors
  warnings: string[]; // Warnings (unusual but valid)
  adjustments?: {
    reason: string; // Reason for adjustment
    hoursAdjusted: number; // Hours adjusted
  }; // Optional adjustments
}

export interface PayrollReport {
  // Complete payroll report
  period: string; // YYYY-MM - Report period
  generatedAt: string; // ISO timestamp - Generation time

  // Summary counts
  totalEmployees: number; // Total employees
  syncedCount: number; // Successfully synced
  errorCount: number; // Errors encountered

  // Hours summary
  totalPayableHours: number; // Total payable hours
  totalOvertimeHours: number; // Total overtime
  totalUndertimeHours: number; // Total undertime

  // Details
  details: AttendancePayrollSyncDTO[]; // Per-employee details
}

export interface PayrollExportRequest {
  // Request to export payroll data
  month: string; // YYYY-MM - Month to export
  format: 'CSV' | 'EXCEL' | 'JSON'; // Export format
  includeErrors: boolean; // Include error details
}

export interface PayrollExportResponse {
  // Response with export
  fileName: string; // Generated file name
  downloadUrl: string; // URL to download
  recordCount: number; // Number of records exported
  errorCount: number; // Errors in export
  generatedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp - File expiration
}

export interface PayrollRollback {
  // Request to rollback sync
  month: string; // YYYY-MM - Month to rollback
  employeeIds?: number[]; // Specific employees (all if null)
  reason: string; // Reason for rollback
  initiatedBy: number; // User ID initiating rollback
}

export interface PayrollAuditTrail {
  // Audit trail of payroll changes
  employeeId: number; // Employee
  month: string; // YYYY-MM - Month
  originalData: AttendancePayrollSyncDTO; // Original sync data
  modifiedData: AttendancePayrollSyncDTO; // Modified data
  changedBy: number; // User ID who changed
  changedAt: string; // ISO timestamp - When changed
  reason: string; // Reason for change
}

export interface PayrollCalculationDetails {
  // Detailed calculation breakdown
  employeeId: number; // Employee
  month: string; // YYYY-MM - Month

  // Base calculation
  workingDays: number; // Expected working days
  presentDays: number; // Days present
  absentDays: number; // Days absent
  lateArrivalDays: number; // Days late

  // Hours calculation
  regularHours: number; // Regular hours worked
  overtimeHours: number; // Overtime hours
  undertimeHours: number; // Undertime hours

  // Adjustments
  gracePeriodMinutes: number; // Grace period minutes applied
  corrections: number; // Number of corrections applied
  adjustmentHours: number; // Total adjustment hours

  // Final
  payableHours: number; // Final payable hours
  remarks: string[]; // Calculation remarks
}

export interface PayrollStatus {
  // Status of payroll sync for a month
  month: string; // YYYY-MM
  status: SyncStatus; // Overall status
  totalEmployees: number; // Total employees to sync
  completedCount: number; // Completed syncs
  pendingCount: number; // Pending syncs
  errorCount: number; // Errors
  lastSyncTime?: string; // ISO timestamp - Last sync
  nextScheduledSync?: string; // ISO timestamp - Next scheduled sync
}
