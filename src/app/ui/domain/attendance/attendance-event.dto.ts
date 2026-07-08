export type EventSource = 'BIOMETRIC' | 'REMOTE' | 'MANUAL';
export type EventType = 'IN' | 'OUT';
export type RecordStatus = 'DRAFT' | 'SUBMITTED' | 'IN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'LOCKED';
export type FraudFlagCode = 'SUSPICIOUS_LOCATION' | 'VPN_DETECTED' | 'RAPID_LOCATION_CHANGE' | 'NEW_DEVICE';

export interface AttendanceEventDTO {
  id?: number;
  source: EventSource;
  employeeCode: string;
  employeeId: number;
  branchCode: string;
  deviceId?: string;
  eventTime: string; // ISO timestamp
  eventType: EventType;
  rawTemplateHash?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  gpsLat?: number;
  gpsLng?: number;
  fraudFlags?: FraudFlagCode[];
  isCrossBranch: boolean;
  homeBranchCode?: string;
  processed: boolean;
  createdAt?: string;
}

export interface AttendanceRecordDTO {
  id?: number;
  employeeId: number;
  branchCode: string;
  workDate: string; // ISO date
  shiftId?: number;
  clockInTime?: string; // ISO timestamp
  clockOutTime?: string; // ISO timestamp
  totalHours?: number;
  overtimeHours?: number;
  undertimeHours?: number;
  isLate?: boolean;
  lateMinutes?: number;
  isAbsent?: boolean;
  isCrossBranch?: boolean;
  status: RecordStatus;
  fraudFlags?: FraudFlagCode[];
  correctionReason?: string;
  approvedBy?: number;
  approvedAt?: string;
  lockedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftDTO {
  id?: number;
  name: string;
  branchCode?: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isOvernight?: boolean;
  graceMinutes?: number;
  otThresholdMinutes?: number;
  daysOfWeek: number[]; // 1=Mon, 7=Sun
  active?: boolean;
  createdAt?: string;
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
