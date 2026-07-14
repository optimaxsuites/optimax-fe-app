/**
 * ⚠️ NEW FILE (2026-07-14) - Attendance analytics and reporting DTOs
 * Provides summary statistics and analytics for attendance reports
 */

export interface AttendanceSummaryDTO {
  // System-generated fields
  id?: number; // Summary ID

  // Time period
  period: string; // YYYY-MM - Period covered

  // Employee counts
  totalEmployees: number; // Total employees in organization
  presentCount: number; // Employees present
  absentCount: number; // Employees absent
  lateCount: number; // Employees with late arrivals

  // Hours calculations
  overtimeHours: number; // Total overtime hours
  undertimeHours: number; // Total undertime hours

  // Percentages
  attendancePercentage: number; // Overall attendance % (0-100)
  onTimePercentage: number; // On-time arrival % (0-100)
}

export interface DepartmentAttendanceSummaryDTO {
  // System-generated fields
  id?: number; // Summary ID

  // Department identification
  departmentId: number; // Department ID
  departmentName: string; // Department name

  // Time period
  period: string; // YYYY-MM - Period covered

  // Employee counts
  totalEmployees: number; // Department employee count
  presentCount: number; // Present employees
  absentCount: number; // Absent employees

  // Hours calculations
  averageWorkHours: number; // Average hours worked per employee
  overtimeHours: number; // Total overtime hours

  // Percentages
  departmentAttendancePercentage: number; // Department attendance % (0-100)

  // Optional: Performance info
  topPerformers?: string[]; // Employee names with high attendance
  needsAttention?: string[]; // Employee names with low attendance
}

export interface LateArrivalDetail {
  // Details of a late arrival
  employeeId: number; // Employee ID
  employeeName: string; // Employee name
  date: string; // ISO date - Date of late arrival
  lateMinutes: number; // Minutes late
  department: string; // Department name
  shiftStartTime?: string; // Expected start time
  actualCheckInTime?: string; // Actual check-in time
}

export interface OvertimeDetail {
  // Details of overtime
  employeeId: number; // Employee ID
  employeeName: string; // Employee name
  month: string; // YYYY-MM - Month of overtime
  overtimeHours: number; // Hours of overtime
  department: string; // Department name
  reason?: string; // Reason for overtime (optional)
}

export interface AbsenteeDetail {
  // Details of absence
  employeeId: number; // Employee ID
  employeeName: string; // Employee name
  absentDays: number; // Number of absent days
  month: string; // YYYY-MM - Month of absence
  department: string; // Department name
  percentage: number; // % of working days absent
}

export interface AttendanceDashboardData {
  // Complete dashboard data
  summary: AttendanceSummaryDTO; // Overall summary
  departmentStats: DepartmentAttendanceSummaryDTO[]; // Per-department stats
  lateArrivals: LateArrivalDetail[]; // Late arrivals
  absentees: AbsenteeDetail[]; // Absent employees
  overtime: OvertimeDetail[]; // Overtime details
  generatedAt: string; // ISO timestamp - When generated
}

export interface AttendanceTrendData {
  // Attendance trends over time
  period: {
    startMonth: string; // YYYY-MM - Start period
    endMonth: string; // YYYY-MM - End period
  };
  data: Array<{
    month: string; // YYYY-MM - Month
    presentCount: number; // Employees present
    absentCount: number; // Employees absent
    lateCount: number; // Employees late
    attendancePercentage: number; // Attendance %
  }>;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING'; // Trend direction
}

export interface AttendanceComparison {
  // Compare attendance between periods/departments
  currentPeriod: AttendanceSummaryDTO; // Current period stats
  previousPeriod: AttendanceSummaryDTO; // Previous period stats
  change: {
    attendanceChange: number; // Percentage point change
    absentChange: number; // Absolute change in absent count
    lateChange: number; // Absolute change in late count
  };
}

export interface DepartmentComparison {
  // Compare departments
  departments: DepartmentAttendanceSummaryDTO[]; // All departments
  topDepartment: DepartmentAttendanceSummaryDTO; // Best performing department
  bottomDepartment: DepartmentAttendanceSummaryDTO; // Worst performing department
  averageAttendance: number; // Average across all departments
}

export interface AttendanceStats {
  // Basic statistics
  present: number; // Present count
  absent: number; // Absent count
  late: number; // Late count
  total: number; // Total employees
}
