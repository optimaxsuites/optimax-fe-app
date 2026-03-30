// Base User DTO from API
export interface ApiUser {
  id: number;
  fullname: string;
  userId: number;
  email: string;
  phoneNumber: string;
  username: string;
  clientType: string;
  gender: string;
  accountId: string;
  address: string;
  city: string;
  state: string;
  country: string;
}
// Employee Level DTO
export interface ApiEmployeeLevel {
    id: number;
    name: string;
    code: string;
    description: string
  }

// Leave Type from API
export interface ApiLeaveType {
  id: number;
  name: string;
  defaultDays: number;
  code: string;
  description: string;
  payStatus: 'PAID' | 'UNPAID';
  effectiveAfter: number;
  allowedInProbation: boolean;
  allowedInNoticePeriod: boolean;
}

// Leave Allocation from API
export interface ApiLeaveAllocation {
  id: number;
  allocatedDays: number;
  levelId: number;
  leaveTypeId: number;
}

// Leave Plan Policy from API
export interface ApiLeavePlanPolicy {
  id: number;
  createdAt: string;
  maxDaysPerMonth: number;
  maxMonthPerYear: number;
}

// Leave Plan Record from API
export interface ApiLeavePlanRecord {
  id: number;
  createdAt: string;
  createdBy: ApiUser;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  leaveType: ApiLeaveType;
  totalDays: number;
  planReason: string;
  attachment: string;
  adminComment: string;
  decisionBy: ApiUser | null;
  decisionOn: string | null;
}

// Leave Request Record from API
export interface ApiLeaveRequestRecord {
  id: number;
  createdAt: string;
  createdBy: ApiUser;
  leaveType: ApiLeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  leaveReason: string;
  attachment: string;
  adminComment: string;
  decisionBy: ApiUser | null;
  decisionOn: string | null;
  leavePlan: ApiLeavePlanRecord | null;
}

// Leave Balance from API
export interface ApiLeave {
  id: number;
  employeeId: string;
  balance: number;
  usedDays: number;
  leaveTypeId: number;
  employee: number;
}

// Error Response
export interface ApiErrorResponse {
  httpStatus: number;
  exception: string;
  message: string;
  fieldErrors: Array<{
    field: string;
    errorCode: string;
  }>;
}

// Request DTOs
export interface CreateLeavePlanRequest {
  startDate: string;
  endDate: string;
  leaveTypeId: number;
  totalDays: number;
  planReason: string;
  attachment?: string;
}

export interface CreateLeaveRequestDto {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  leaveReason: string;
  attachment?: string;
  leavePlanId?: number;
}

export interface UpdateLeaveStatusDto {
  status: 'APPROVED' | 'REJECTED';
  adminComment?: string;
}