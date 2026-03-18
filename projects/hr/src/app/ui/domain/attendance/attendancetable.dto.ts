export interface AttendanceTableRecord {
  id: string;
  employee: string;
  department: string;
  date: string | null;
  checkIn: string | null;
  checkOut?: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'OVERTIME';
  hours?: number;
  overrideOpen?: boolean;
  overrideReason?: string;
  overriddenBy?: {
    adminId: string;
    adminName: string;
  }
  // --- NEW: snapshot of the schedule that was active when this record was created ---
  appliedScheduleType?: 'office-hours' | 'shift';
  appliedScheduleId?: string;
  appliedExpectedStart?: string;
  appliedExpectedEnd?: string;
  appliedShiftName?: string;
}
