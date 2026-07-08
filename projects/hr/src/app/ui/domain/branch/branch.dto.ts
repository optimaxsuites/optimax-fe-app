export interface BranchDTO {
  id: number;
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  isHeadquarters: boolean;
  timezone: string;
  contactEmail: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BranchAssignmentDTO {
  branchId: number;
  isSecondary: boolean;
  assignedDate: string;
}

export interface EmployeeBranchAssignmentDTO {
  employeeId: number;
  primaryBranchId: number;
  assignedBranches: BranchAssignmentDTO[];
}

export interface BranchLocationDTO {
  latitude: number;
  longitude: number;
  address: string;
}
