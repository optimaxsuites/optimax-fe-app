import { ShiftTrackingMetrics } from './shift-tracking-metrics.dto';

export interface AttendanceTableRecord {
  id: number; //attendance record id from backend
  employeeId?: number;
  employee: string;
  attendanceRecordId?: number;
  department: string;
  date: Date | null;
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
  appliedScheduleId?: string;
  appliedExpectedStart?: string;
  appliedExpectedEnd?: string;
  appliedShiftName?: string;
  shiftMetrics?: ShiftTrackingMetrics;

  // --- CLOCK-IN SOURCE ---
  clockInSource?: 'BIOMETRIC' | 'REMOTE'; // Fingerprint scanner or web button
  clockOutSource?: 'BIOMETRIC' | 'REMOTE';
  
  // --- BIOMETRIC DEVICE INFO (when source is BIOMETRIC) ---
  biometricDeviceId?: string;
  biometricEnrollmentId?: number;
  fingerprintMatched?: boolean;

  // --- CROSS-BRANCH ATTENDANCE ---
  checkedInBranchId?: number;
  homeBranchId?: number;
  checkedInBranchName?: string;
  homeBranchName?: string;
  isCrossBranchAttendance?: boolean;
  crossBranchRequestId?: string;
  crossBranchApprovalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';

  // --- CORRECTION REQUESTS FROM EMPLOYEES ---
  correctionRequest?: {
    id?: number;
    type: 'TIME_CORRECTION' | 'STATUS_CORRECTION' | 'LOCATION_CORRECTION';
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requestedAt: Date;
    requestedBy?: string;
    approvedBy?: string;
    approvalNotes?: string;
    rejectionReason?: string;
  };
}
