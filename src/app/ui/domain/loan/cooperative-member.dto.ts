import { CooperativeLoan } from './cooperative-loan.dto';

export interface CooperativeMember {
  id: number;
  employeeId: number;
  status: string;
  cooperativeGroup: any[]; // Use CooperativeGroup from cooperative-group.dto.ts
  contributionHistory: ContributionHistory[];
  loanHistory: CooperativeLoan[];
}

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  dob: string;
  email: string;
  workEmail: string;
  phone: string;
  address: string;
  jobTitle: string;
  supervisor: string;
  bankName: string;
  accountNumber: string;
  nin: string;
  bvn: string;
  employeeStatus: string;
  employementStartDate: string;
  employmentEndDate: string;
  onProbation: boolean;
  probationStartDate: string;
  probationEndDate: string;
  appraisalDueDate: string;
  jobType: JobType;
  gender: Gender;
  relationship: Relationship;
  religion: Religion;
  maritalStatus: MaritalStatus;
  department: Department;
  employeeMedia: EmployeeMedia;
  level: Level;
  userId: number;
}

export interface JobType {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface Gender {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface Relationship {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface Religion {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface MaritalStatus {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface EmployeeMedia {
  id: number;
  name: string;
  url: string;
  mediaNo: string;
}

export interface Level {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface ContributionHistory {
  id: number;
  member: string;
  amount: number;
  date: string;
}
