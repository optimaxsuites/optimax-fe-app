export interface employeeDTO {
    firstName?: string;
    lastName?: string;
    email?: string;
    workEmail?: string;
    dob?: Date;
    gender?: string;
    phone?: string;
    maritalStatus?: string;
    religion?: string;
    address?: string;
    jobTitle?: string;
    department?: string;
    level?: string;
    employmentType?: string;
    supervisor?: string;
    bankName?: string;
    accountNumber?: string;
    nin?: string;
    bvn?: string;
    employmentStatus?: number;
    employementStartDate?: Date;
    employementEndDate?: Date;
    onProbation?: boolean;
    probationStartDate?: Date;
    probationEndDate?: Date;
    appraisalDueDate?: Date;
    nextOfKin?: NextOfKinDTO[];
    guarantor?: GuarantorDTO[];
    access?: AccessDTO;
    leave?: LeaveDTO[];
    profileImage?: File;
}

export interface NextOfKinDTO {
    employeeId: number; 
    fullName: string;
    email: string;
    phone: string;
    address: string;
    relationship: string;
    DOB: Date;
    emergencyContact?: boolean;
  }

export interface GuarantorDTO {
    employeeId: number; 
    fullName: string;
    email: string;
    phone: string;
    address: string;
    relationship: string;
    DOB: Date;
    yearsKnown: string;
    signature: File;
    passportPhoto: File;
    idCard: File;
  }

export interface LeaveDTO {
  employeeId: number; 
  leaveType: LeaveTypeDTO;
  balance: number; 
  usedDays: number; 
}

export interface AccessDTO {
  employeeId: number; 
  roles?: string[];
  permissions: string[];
}

export interface LeaveTypeDTO {
  id: number; 
  name: string; 
  defaultDays: number;
  description?: string;
}

export interface LevelDTO {
  id?: number,
 name: string;
 code: string;
 description: string;
}