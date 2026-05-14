export interface AttendanceTableRecord {
  id: number; //attendance record id from backend
  employeeId: number;
  employee: string;
  attendanceRecordId?: string;
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
}
