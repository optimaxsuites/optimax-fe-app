/**
 * ⚠️ UPDATED (2026-08-28) - Simplified: Removed fraud detection, using local time
 * Uses employeeDTO directly for employee information (no separate employeeId fields)
 * Clock-in sources: BIOMETRIC (fingerprint scanner) or REMOTE (web button)
 * See EMPLOYEE_ID_PATTERNS.md for employee identification patterns
 */

import { employeeDTO } from '../employee.dto';

export type EventSource = 'BIOMETRIC' | 'REMOTE' | 'MANUAL';
export type EventType = 'IN' | 'OUT';
export type RecordStatus = 'DRAFT' | 'SUBMITTED' | 'IN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'LOCKED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type FlagType = 'CORRECTION' | 'CROSS_BRANCH_BIOMETRIC';
export type FraudFlagCode = 'DUPLICATE' | 'GEO_MISMATCH' | 'UNUSUAL_HOURS' | 'UNKNOWN_DEVICE';

export interface ProcessingResult {
  eventId: number;
  status: 'SUCCESS' | 'DUPLICATE' | 'REJECTED' | 'ERROR';
  message: string;
  fraudFlags: FraudFlagCode[];
}

export interface AttendanceEventDTO {
  // System-generated fields
  id?: number; // Unique event identifier
  createdAt?: Date; // Local datetime - Event creation timestamp

  // Event source and type
  source: EventSource; // Source of the attendance event (BIOMETRIC|REMOTE)
  eventType: EventType; // Check-in or Check-out event (IN|OUT)

  // Employee identification
  employeeId: number; // Employee unique identifier (database ID)
  employeeCode?: string; // Employee code for deduplication / lookup
  employee?: employeeDTO; // Employee information (name, email, department, branch, etc.)
  fraudFlags?: FraudFlagCode[];

  // Location information
  branchCode: string; // Branch where event occurred
  isCrossBranch: boolean; // Whether check-in is at non-home branch
  homeBranchCode?: string; // Employee's primary branch

  // Event details
  eventTime: Date; // Local datetime - When the check-in/out occurred

  // Device information (for BIOMETRIC source)
  deviceId?: string; // ID of biometric device used
  rawTemplateHash?: string; // Biometric template hash for verification
  deviceIpAddress?: string; // IP address of the biometric device

  // Remote check-in data (for REMOTE source - web button)
  connectionIpAddress?: string; // IP address of the user's browser
  deviceFingerprint?: string; // Browser fingerprint

  // Location tracking
  gpsLatitude?: number; // GPS latitude
  gpsLongitude?: number; // GPS longitude

  // Processing status
  processed: boolean; // Whether event has been processed into record
}

export interface AttendanceRecordDTO {
  // System-generated identifiers
  id?: number; // Unique attendance record identifier

  // Employee & branch information
  employeeId: number; // Employee unique identifier (database ID)
  employee: employeeDTO; // Employee information (name, email, department, branch, etc.)
  branchCode: string; // Branch where attendance is recorded

  // Date & shift information
  workDate: Date; // Date of attendance
  shiftId?: number; // Assigned shift for this date

  // Clock times (local time)
  clockInTime?: Date; // Check-in time
  clockOutTime?: Date; // Check-out time

  // Clock-in source
  clockInSource?: EventSource; // How they clocked in (BIOMETRIC|REMOTE)
  clockOutSource?: EventSource; // How they clocked out (BIOMETRIC|REMOTE)

  // Hours calculations
  totalHours?: number; // Total hours worked
  overtimeHours?: number; // Hours beyond shift
  undertimeHours?: number; // Hours short of shift

  // Late arrival tracking
  isLate?: boolean; // Whether employee clocked in after shift start
  lateMinutes?: number; // Minutes late

  // Absence tracking
  isAbsent?: boolean; // Whether employee did not show up

  // Multi-location tracking
  isCrossBranch?: boolean; // Whether work was at different branch

  // Approval workflow
  status: RecordStatus; // Record approval status (DRAFT|SUBMITTED|IN_APPROVAL|APPROVED|REJECTED|LOCKED)
  approvedBy?: number; // ID of approver
  approvedAt?: Date; // Approval timestamp

  // Modification tracking
  modifiedAt?: Date; // When record was last modified
  modifiedBy?: number; // User ID who modified the record
  modificationReason?: string; // Reason for modification (correction)

  // Approval for modifications and cross-branch
  requiresApproval: boolean; // Whether record needs approval (correction or cross-branch)
  approvalStatus?: ApprovalStatus; // Approval status (PENDING|APPROVED|REJECTED)
  flagType?: FlagType; // Type of flag (CORRECTION|CROSS_BRANCH_BIOMETRIC)
  approverNotes?: string; // HR/Manager notes during approval

  // Payroll locking
  lockedAt?: Date; // Lock date (frozen for payroll)

  // Timestamps
  createdAt?: Date; // Record creation timestamp
  updatedAt?: Date; // Last update timestamp
}
