import { ShiftTrackingMetrics } from './shift-tracking-metrics.dto';
import { RemoteAttendanceMetadata, CheckInSource, FraudDetectionFlags } from './remote-attendance.dto';

export interface AttendanceTableRecord {
  id: number; //attendance record id from backend
  employeeId?: number;
  employee: string;
  attendanceRecordId?: number;
  department: string;
  date: string | null;
  checkIn: string | null;
  checkOut?: string | null;
  checkInLocation: {
    address: string;
    lat: number;
    lng: number;
  } | null;
  checkOutLocation: {
    address: string;
    lat: number;
    lng: number;
  } | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'OVERTIME';
  hours?: number;
  lateMinutes?: number;
  overtime?: number;
  overrideOpen?: boolean;
  overrideReason?: string;
  overriddenBy?: {
    adminId: number;
    adminName: string;
  }
  apiRecordId?: number; //stores the backend record ID

  // --- NEW: snapshot of the schedule that was active when this record was created ---
  appliedScheduleType?: 'office-hours' | 'shift';
  appliedScheduleId?: number;
  appliedExpectedStart?: string;
  appliedExpectedEnd?: string;
  appliedShiftName?: string;
  shiftMetrics?: ShiftTrackingMetrics;

  // --- BIOMETRIC DEVICE INTEGRATION ---
  biometricDeviceId?: string;
  biometricEnrollmentId?: number;
  fingerprintMatched?: boolean;
  checkInSource?: CheckInSource;

  // --- REMOTE ATTENDANCE & FRAUD DETECTION ---
  remoteMetadata?: RemoteAttendanceMetadata;
  fraudFlags?: FraudDetectionFlags[];
  hasFraudFlags?: boolean;
  riskScore?: number;

  // --- CROSS-BRANCH ATTENDANCE ---
  checkedInBranchId?: number;
  homeBranchId?: number;
  crossBranchRequestId?: string;
  crossBranchApprovalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';

  // --- CORRECTION REQUESTS FROM EMPLOYEES ---
  correctionRequest?: {
    id?: number;
    type: 'TIME_CORRECTION' | 'STATUS_CORRECTION' | 'LOCATION_CORRECTION';
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: string;
    requestedBy?: string;
    approvedBy?: string;
    approvalNotes?: string;
    rejectionReason?: string;
  };
}
