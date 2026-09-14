/**
 * ⚠️ UPDATED (2026-08-28) - Simplified: Removed fraud detection, using local time
 * Clock-in sources: BIOMETRIC (fingerprint scanner) or REMOTE (web button)
 * See EMPLOYEE_ID_PATTERNS.md for employee identification patterns
 */

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
  id?: number;
  createdAt?: Date;

  // Event source and type
  source: EventSource;
  eventType: EventType; // Check-in or check-out

  employeeId: string; // Database ID, not employeeCode
  employeeCode?: string; // For deduplication / lookup
  fraudFlags?: FraudFlagCode[];

  branchCode: string;
  isCrossBranch: boolean; // Whether check-in is at non-home branch
  homeBranchCode?: string;

  eventTime: Date; // When the check-in/out occurred

  // Device information (for BIOMETRIC source)
  deviceId?: string;
  rawTemplateHash?: string; // Biometric template hash for verification
  deviceIpAddress?: string;

  // Remote check-in data (for REMOTE source - web button)
  connectionIpAddress?: string;
  deviceFingerprint?: string;
  userAgent?: string; // Fraud/VPN detection
  networkType?: string; // e.g. 'wifi', 'cellular', 'vpn' — fraud/VPN detection
  vpnDetected?: boolean;

  gpsLatitude?: number;
  gpsLongitude?: number;
  geoAddress?: string; // Human-readable address
  accuracy?: number; // GPS accuracy in meters

  processed: boolean;
}

export interface AttendanceRecordDTO {
  id?: number;

  employeeId: string; // Database ID, not employeeCode
  branchCode: string;

  workDate: Date;
  shiftId?: number;

  // Strict contract: use checkIn/checkOut only
  checkIn?: Date | string;
  checkOut?: Date | string;

  // Required for geofence validation and location display
  checkInLocation?: { address: string; lat: number; lng: number } | null;
  checkOutLocation?: { address: string; lat: number; lng: number } | null;

  clockInSource?: EventSource;
  clockOutSource?: EventSource;

  totalHours?: number;
  overtimeHours?: number;
  undertimeHours?: number;

  isLate?: boolean;
  lateMinutes?: number;
  isAbsent?: boolean;

  // Backend MUST send this explicitly — frontend uses this, not isLate/isAbsent
  attendanceStatus?: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'OVERTIME';

  isCrossBranch?: boolean; // Whether work was at a different branch

  // Workflow state, not attendance presence
  recordStatus: RecordStatus;
  // Legacy alias for backward compatibility — use recordStatus instead
  status?: RecordStatus;
  approvedBy?: number;
  approvedAt?: Date;

  modifiedAt?: Date;
  modifiedBy?: number;
  modificationReason?: string;

  requiresApproval: boolean; // Whether record needs approval (correction or cross-branch)
  approvalStatus?: ApprovalStatus;
  flagType?: FlagType;
  approverNotes?: string;

  // Snapshot of the schedule active when this record was created (not in PDF)
  appliedScheduleType?: 'OFFICE_HOURS' | 'SHIFT';
  appliedScheduleId?: string;
  appliedExpectedStart?: string; // HH:mm
  appliedExpectedEnd?: string; // HH:mm
  appliedShiftName?: string;

  // No backend model currently — POST /attendance-records/{id}/override-open
  overrideOpen?: boolean;
  overrideReason?: string;
  overrideBy?: { hrEmployeeId: number; fullname: string };

  lockedAt?: Date; // Frozen for payroll

  createdAt?: Date;
  updatedAt?: Date;
}
