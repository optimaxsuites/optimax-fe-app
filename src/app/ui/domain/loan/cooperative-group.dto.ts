// Cooperative Group DTOs

export interface CooperativeGroupContributionHistory {
  id: number;
  member: string;
  amount: number;
  date: string;
}

export interface CooperativeGroupLoanStatusHistory {
  id: number;
  cooperativeLoan: string;
  status: string;
  changedAt: string;
  changedBy: number;
  notes: string;
  overrideOpen: boolean;
  overrideBy: number;
  overrideReason: string;
  statusBeforeOverride: string;
}

export interface CooperativeGroupEmployeeMedia {
  id: number;
  name: string;
  url: string;
  mediaNo: string;
}

export interface CooperativeGroupEmployeeSubType {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface CooperativeGroupEmployee {
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
  jobType: CooperativeGroupEmployeeSubType;
  gender: CooperativeGroupEmployeeSubType;
  relationship: CooperativeGroupEmployeeSubType;
  religion: CooperativeGroupEmployeeSubType;
  maritalStatus: CooperativeGroupEmployeeSubType;
  department: CooperativeGroupEmployeeSubType;
  employeeMedia: CooperativeGroupEmployeeMedia;
  level: CooperativeGroupEmployeeSubType;
  userId: number;
}

export interface CooperativeGroupGuarantorMedia {
  id: number;
  name: string;
  mediaNo: string;
}

export interface CooperativeGroupGuarantor {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  relationshipId: number;
  dob: string;
  idNumber: string;
  yearsKnown: number;
  signature: string;
  passportPhoto: string;
  idCard: string;
  employee: CooperativeGroupEmployee;
  guarantorMedia: CooperativeGroupGuarantorMedia;
  guarantorPhoto: CooperativeGroupGuarantorMedia;
  guarantorSignature: CooperativeGroupGuarantorMedia;
}

export interface CooperativeGroupLoanHistory {
  id: number;
  loanCode: string;
  cooperativeMemberId: string;
  cooperativeGroupId: string;
  amount: number;
  purpose: string;
  repaymentAmount: number;
  repaymentTime: number;
  modeOfPayment: string;
  requestDate: string;
  approvedDate: string;
  disbursedDate: string;
  completedDate: string;
  rejectedDate: string;
  status: string;
  adminComment: string;
  applicationStage: string;
  guarantors: CooperativeGroupGuarantor;
  guarantorApproval: boolean;
  totalPaid: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  outstandingPrincipal: number;
  paymentHistory: string[];
  statusHistory: CooperativeGroupLoanStatusHistory[];
}

export interface CooperativeGroup {
  id: number;
  code: string;
  name: string;
  monthlyAmount: number;
  memberIds: number[];
  memberLimit: number;
  withdrawCap: number;
  interestRate: number;
  currentBalance: number;
  contributionHistory: CooperativeGroupContributionHistory[];
  loanHistory: CooperativeGroupLoanHistory[];
  status: string;
  description: string;
  patronageRate: number;
  patronageAmount: number;
}
