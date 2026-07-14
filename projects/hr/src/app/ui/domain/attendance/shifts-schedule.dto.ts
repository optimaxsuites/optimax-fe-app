/**
 * ⚠️ NEW FILE (2026-07-14) - Consolidates ShiftDTO and ScheduleDTO
 * Replaces split implementation across office-hours.dto.ts and working-window.dto.ts
 */

export interface ShiftDTO {
  // System-generated fields
  id?: number; // Unique shift identifier
  createdAt?: string; // ISO timestamp - Creation timestamp

  // Shift identification
  name: string; // Shift name (e.g., "Morning Shift", "Night Shift")
  branchCode?: string; // Branch this shift applies to (null = all branches)

  // Time configuration
  startTime: string; // HH:mm format - Shift start time
  endTime: string; // HH:mm format - Shift end time
  isOvernight?: boolean; // Whether shift spans midnight

  // Policy configuration
  graceMinutes?: number; // Grace period for late arrivals in minutes
  otThresholdMinutes?: number; // Overtime threshold in minutes

  // Schedule configuration
  daysOfWeek: number[]; // Days shift applies: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun

  // Status
  active?: boolean; // Whether shift is active
}

export interface ScheduleDTO {
  // System-generated fields
  id?: number; // Unique schedule identifier
  createdAt?: string; // ISO timestamp - Creation timestamp
  createdBy?: number; // Admin who created this schedule

  // Employee assignment
  employeeId: number; // Employee assigned to this schedule

  // Shift assignment
  shiftId: number; // Shift template to use

  // Schedule period
  startDate: string; // ISO date - Schedule start date (YYYY-MM-DD)
  endDate?: string; // ISO date - Schedule end date (null = open-ended)

  // Notes
  notes?: string; // Notes about this schedule
}

export interface ShiftAssignmentResponse {
  // Response data after creating/updating assignment
  scheduleId: number; // Created/updated schedule ID
  employeeId: number; // Employee ID
  shiftName: string; // Name of assigned shift
  startDate: string; // When assignment starts
  endDate?: string; // When assignment ends
  status: 'ACTIVE' | 'EXPIRED' | 'FUTURE'; // Current status of assignment
}

export interface ShiftStats {
  // Statistics about shifts
  totalShifts: number; // Total shifts defined
  activeShifts: number; // Active shifts
  byBranch: Record<string, number>; // Shift count by branch
  employeesPerShift: Record<string, number>; // Shift name -> employee count
}
