/**
 * Admin "today" dashboard endpoints.
 * GET /x/api/v2/hr/attendance/stats/today, GET /x/api/v2/hr/attendance/late/today,
 * GET /x/api/v2/hr/attendance/absent/today, POST /x/api/v2/hr/attendance/mark
 */
export interface DepartmentAttendanceDTO {
  departmentId: number;
  departmentName: string;
  presentCount: number;
  absentCount: number;
  totalEmployees: number;
  attendancePercentage: number;
}

export interface AttendanceSummaryDTO {
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  total: number;
  departmentBreakdown?: DepartmentAttendanceDTO[];
}

export interface LateArrivalDTO {
  id: number;
  employeeName: string;
  checkIn: string;
  department: string;
  lateMinutes: number;
}

export interface AbsentEmployeeDTO {
  employeeId: string;
  employeeName: string;
  department: string;
}

export interface MarkAttendanceResponseDTO {
  success: boolean;
  message: string;
  count: number;
}
