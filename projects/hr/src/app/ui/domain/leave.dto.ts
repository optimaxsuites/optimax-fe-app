// ==================== LEAVE TYPES ====================

export interface LeaveType {
  id: string;
  typeName: string;
  isActive: boolean;
}

export interface LeaveTypeWithAllocation {
  id: string;
  typeName: string;
  allocatedDays: number;
  isActive: boolean;
}

export interface EmployeeLeaveTypeWithAllocation {
  id: string;
  typeName: string;
  allocatedDays: number;
  daysUsed: number;
  isActive: boolean;
}

// ==================== EMPLOYEE ====================

export interface EmployeeLevel {
  id: string;
  name: string; // Intern, Junior, Mid-Level, Senior, Manager
  order: number; // For hierarchy (0 = lowest, higher numbers = more senior)
  description: string;
  isActive: boolean;
}

export interface LevelChange {
  fromLevelId: string;
  fromLevelName: string;
  toLevelId: string;
  toLevelName: string;
  changedOn: string;
  changedBy: string;
  reason?: string;
}

export interface Employee {
  id: string;
  name: string;
  department: string; // NEW - Employee's department (Engineering, Sales, etc.)
  levelId: string;
  levelName: string;
  leaveUsed: number;
  leaveTypes: EmployeeLeaveTypeWithAllocation[];
  promotionDate?: string;
  levelHistory?: LevelChange[];
}

// ==================== LEAVE ALLOCATION MATRIX ====================

export interface LevelLeaveAllocation {
  levelId: string;
  leaveTypeId: string;
  allocatedDays: number;
}

export interface LeaveAllocationMatrix {
  levels: EmployeeLevel[];
  allocations: LevelLeaveAllocation[];
}

// ==================== LEAVE SETTINGS ====================

export interface LeaveSettings {
  totalLeaveDaysAllowed: number;
  automaticApproval: boolean;
  leaveTypes: LeaveTypeWithAllocation[];
  useLevelBasedAllocation: boolean;
}

// ==================== LEAVE REQUESTS ====================

export interface LeaveRequest {
  AppliedOn: string;
  ApprovalComment: string;
  Attachment: any;
  Date: string;
  Employee: string;
  EmployeeId: string;
  Id: string;
  LeaveType: string;
  NetLeaveBalance: number;
  RequestComment: string;
  RequestedDuration: string;
  Status: string;
}

export type LeaveRequests = LeaveRequest[];

// ==================== LEAVE PLANNING ====================

export interface LeavePlanningPolicy {
  maxDaysPerMonth: number;
  maxPlanningMonths: number;
  totalAllowedPlannedDays: number;
  emergencyLeaveDaysAllowed: number;
  planningWindowDays: number;
  allowPlanEditing: boolean;
}

export interface PlannedLeave {
  id: string;
  employeeId: string;
  employeeName?: string; // Employee name for display
  department?: string; // Department for filtering/analytics
  startDate: string;
  endDate: string;
  month: string; // Format: 'YYYY-MM'
  leaveType: string;
  workingDays: number;
  notes: string;
  status: 'Planned' | 'Pending' | 'Approved' | 'Rejected';
  createdOn: string;
  approvedOn?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

export interface MonthlyPlanSummary {
  month: string;
  daysPlanned: number;
  maxDays: number;
  remaining: number;
}