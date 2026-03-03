export interface Employee {
  id: string;
  name: string;
  leaveUsed: number;
  leaveTypes: EmployeeLeaveTypeWithAllocation[];
}
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
export interface LeaveSettings {
  totalLeaveDaysAllowed: number;
  automaticApproval: boolean;
  leaveTypes: LeaveTypeWithAllocation[];
}

export interface LeaveRequest {
  AppliedOn: string;
  ApprovalComment: string;
  Attachment: null;
  Date: string;
  EmployeeId: string;
  Id: string;
  LeaveType: string;
  NetLeaveBalance: number;
  RequestComment: string;
  RequestedDuration: string;
  Status: string;
}
export type LeaveRequests = LeaveRequest[];
// export interface PlannedLeave {
//   id: string;
//   employeeId: string;
//   startDate: string;
//   endDate: string;
//   leaveType: string;
//   workingDays: number;
//   notes: string;
//   status: 'Planned' | 'Pending' | 'Approved';
//   createdOn: string;
// }
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
  employeeName?: string;
  department?: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  workingDays: number;
  notes: string;
  status: 'Planned' | 'Pending' | 'Approved' | 'Rejected';
  createdOn: string;
  approvedOn?: string;
  month: string; // Format: 'YYYY-MM'
}

export interface MonthlyPlanSummary {
  month: string;
  daysPlanned: number;
  maxDays: number;
  remaining: number;
}
export interface EmployeeLevel {
  id: string;
  name: string; // Intern, Junior, Mid-Level, Senior, Manager
  order: number; // For hierarchy (0 = lowest, higher numbers = more senior)
  description: string;
  isActive: boolean;
}

export interface LevelLeaveAllocation {
  levelId: string;
  leaveTypeId: string;
  allocatedDays: number;
}

export interface LeaveAllocationMatrix {
  levels: EmployeeLevel[];
  allocations: LevelLeaveAllocation[]; // Matrix of level x leave type
}

// Update Employee interface
export interface Employee {
  id: string;
  name: string;
  levelId: string; // NEW
  levelName: string; // NEW
  leaveUsed: number;
  leaveTypes: EmployeeLeaveTypeWithAllocation[];
  promotionDate?: string; // NEW - track when level changed
  levelHistory?: LevelChange[]; // NEW - track level changes
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

// Update LeaveSettings
export interface LeaveSettings {
  totalLeaveDaysAllowed: number;
  automaticApproval: boolean;
  leaveTypes: LeaveTypeWithAllocation[];
  useLevelBasedAllocation: boolean; // NEW - toggle for level-based system
}