/**
 * ⚠️ UPDATED (2026-07-14) - Added missing fields: source, eventType, employeeCode, processed, homeBranchCode
 * This file has been completed with all required fields from specification
 */

export type EventSource = 'BIOMETRIC' | 'REMOTE' | 'MANUAL';
export type EventType = 'IN' | 'OUT';
export type RecordStatus = 'DRAFT' | 'SUBMITTED' | 'IN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'LOCKED';
export type FraudFlagCode = 'SUSPICIOUS_LOCATION' | 'VPN_DETECTED' | 'RAPID_LOCATION_CHANGE' | 'NEW_DEVICE' | 'DEVICE_CLONING' | 'LOCATION_SPOOFING';

export interface AttendanceEventDTO {
  // System-generated fields
  id?: number; // Unique event identifier
  createdAt?: string; // ISO timestamp - Event creation timestamp

  // Event source and type
  source: EventSource; // Source of the attendance event (BIOMETRIC|REMOTE|MANUAL)
  eventType: EventType; // Check-in or Check-out event (IN|OUT)

  // Employee identification
  employeeCode: string; // Employee code/ID (human-readable, e.g., EMP-001)
  employeeId: number; // Employee unique identifier (database ID)

  // Location information
  branchCode: string; // Branch where event occurred
  isCrossBranch: boolean; // Whether check-in is at non-home branch
  homeBranchCode?: string; // Employee's primary branch

  // Event details
  eventTime: string; // ISO timestamp - When the check-in/out occurred

  // Device information
  deviceId?: string; // ID of biometric device used
  rawTemplateHash?: string; // Biometric template hash for verification

  // Remote check-in data
  deviceIpAddress?: string; // IP address of the biometric device
  connectionIpAddress?: string; // IP address of the user/connection making the request
  deviceFingerprint?: string; // Device fingerprint for remote check-in

  // Location tracking
  gpsLatitude?: number; // GPS latitude for location verification
  gpsLongitude?: number; // GPS longitude for location verification

  // Fraud detection
  fraudFlags?: FraudFlagCode[]; // Fraud detection flags

  // Processing status
  processed: boolean; // Whether event has been processed into record
}

export interface AttendanceRecordDTO {
  // System-generated identifiers
  id?: number; // Unique attendance record identifier

  // Employee & branch information
  employeeId: number; // Employee unique identifier
  branchCode: string; // Branch where attendance is recorded

  // Date & shift information
  workDate: string; // ISO date - Date of attendance (YYYY-MM-DD)
  shiftId?: number; // Assigned shift for this date

  // Clock times
  clockInTime?: string; // ISO timestamp - Check-in timestamp
  clockOutTime?: string; // ISO timestamp - Check-out timestamp

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
  approvedAt?: string; // ISO timestamp - Approval timestamp

  // Correction tracking
  correctionReason?: string; // Reason if record was corrected

  // Fraud detection
  fraudFlags?: FraudFlagCode[]; // Detected fraud indicators

  // Payroll locking
  lockedAt?: string; // ISO timestamp - Lock timestamp (frozen for payroll)

  // Timestamps
  createdAt?: string; // ISO timestamp - Record creation timestamp
  updatedAt?: string; // ISO timestamp - Last update timestamp
}

export interface ShiftDTO {
  id?: number;
  name: string;
  description?: string;
  branchCode?: string;
  timezone?: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isOvernight?: boolean;
  graceMinutes?: number;
  otThresholdMinutes?: number;
  daysOfWeek: number[]; // 1=Monday, 7=Sunday (ISO 8601)
  active: boolean;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScheduleDTO {
  id?: number;
  employeeId: number;
  shiftId: number;
  startDate: string; // ISO date
  endDate?: string; // ISO date, null = open-ended
  notes?: string;
  createdBy?: number;
  createdAt?: string;
}

export interface BiometricDeviceDTO {
  id?: number;
  deviceId: string;
  name?: string;
  branchCode: string;
  model?: string;
  apiKeyHash: string;
  lastSyncAt?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  registeredAt?: string;
  registeredBy?: number;
}

export interface CorrectionRequestDTO {
  id?: number;
  attendanceRecordId: number;
  requestedBy: number;
  correctType?: 'MISSING_IN' | 'MISSING_OUT' | 'WRONG_TIME' | 'OTHER';
  originalTime?: string;
  requestedTime?: string;
  reason: string;
  supportingDocs?: string[];
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: number;
  reviewedAt?: string;
  reviewerNotes?: string;
  createdAt?: string;
}

export interface ProcessingResult {
  eventId: number;
  recordId?: number;
  status: 'PROCESSED' | 'DUPLICATE' | 'FRAUD_FLAGGED' | 'ERROR';
  message: string;
  fraudFlags?: FraudFlagCode[];
}
