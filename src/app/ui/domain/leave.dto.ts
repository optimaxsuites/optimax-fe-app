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