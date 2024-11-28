export interface LeaveTypeDTO {
    id?: number; 
    name: string; 
    code: string;
    defaultDays: number;
    description?: string;
    payStatus: string;
    effectiveAfter: number;
    allowedInProbation: boolean;
    allowedInNoticePeriod: boolean;
}

export interface LeaveDTO {
    id?: number;
    employeeId: number; 
    leaveType: LeaveTypeDTO;
    balance: number; 
    usedDays: number; 
}