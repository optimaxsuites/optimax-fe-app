/**
 * Admin "today" dashboard endpoints — PDF has AttendanceSummaryDTO but no endpoint spec.
 * GET /attendance-records/stats/today, GET /attendance-records/late/today,
 * GET /attendance-records/absent/today, POST /attendance-records/mark
 */
export interface AttendanceSummaryDTO {
  presentCount: number; // PDF field name — do NOT read as `present`
  absentCount: number; // PDF field name — do NOT read as `absent`
  lateCount: number; // PDF field name — do NOT read as `late`
  onLeaveCount?: number;
  totalCount?: number;
}

export interface LateArrivalDTO {
  employeeId: string;
  employeeName: string;
  checkIn: string;
  lateMinutes?: number;
}

export interface AbsentEmployeeDTO {
  employeeId: string;
  employeeName: string;
  department?: string;
}

export interface MarkAttendanceResponseDTO {
  success: boolean;
  message?: string;
}
