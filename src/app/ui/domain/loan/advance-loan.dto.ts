// Advance/Standard Loan DTOs

export interface AdvanceLoan {
  id: number;
  loanCode: string;
  employee: AdvanceLoanEmployee;
  amount: number;
  purpose: string;
  repaymentAmount: number;
  repaymentTime: number;
  modeOfPayment: string;
  requestDate: string;
  approvedDate: string;
  approvedBy: AdvanceLoanUser;
  disbursedDate: string;
  disbursedBy: AdvanceLoanUser;
  completedDate: string;
  rejectedDate: string;
  rejectedBy: AdvanceLoanUser;
  status: string;
  adminComment: string;
  currentBalance: number;
  totalPaid: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  outstandingPrincipal: number;
  statusBeforeOverride: string;
  repaymentSchedule: AdvanceLoanRepaymentSchedule[];
  paymentHistory: AdvanceLoanPaymentHistory[];
  statusHistory: AdvanceLoanStatusHistory[];
}

export interface AdvanceLoanEmployee {
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
  jobType: AdvanceLoanSubType;
  gender: AdvanceLoanSubType;
  relationship: AdvanceLoanSubType;
  religion: AdvanceLoanSubType;
  maritalStatus: AdvanceLoanSubType;
  department: AdvanceLoanSubType;
  employeeMedia: AdvanceLoanEmployeeMedia;
  level: AdvanceLoanSubType;
  userId: number;
}

export interface AdvanceLoanSubType {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface AdvanceLoanEmployeeMedia {
  id: number;
  name: string;
  url: string;
  mediaNo: string;
}

export interface AdvanceLoanUser {
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

export interface AdvanceLoanRepaymentSchedule {
  id: number;
  loan: AdvanceLoanScheduleLoan;
  installmentNo: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  status: string;
}

export interface AdvanceLoanScheduleLoan {
  id: number;
  loanCode: string;
  employee: AdvanceLoanEmployee;
  amount: number;
  purpose: string;
  repaymentAmount: number;
  repaymentTime: number;
  modeOfPayment: string;
  requestDate: string;
  approvedDate: string;
  approvedBy: number | AdvanceLoanUser;
  disbursedDate: string;
  disbursedBy: number | AdvanceLoanUser;
  completedDate: string;
  rejectedDate: string;
  rejectedBy: number | AdvanceLoanUser;
  status: string;
  adminComment: string;
  currentBalance: number;
  totalPaid: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  outstandingPrincipal: number;
  statusBeforeOverride: string;
  repaymentSchedule: string[];
  paymentHistory: string[];
  statusHistory: AdvanceLoanScheduleStatusHistory[];
}

export interface AdvanceLoanScheduleStatusHistory {
  id: number;
  loan: string;
  status: string;
  changedAt: string;
  changedBy: number | AdvanceLoanUser;
  notes: string;
  overrideOpen: boolean;
  overrideBy: number | AdvanceLoanUser;
  overrideReason: string;
  statusBeforeOverride: string;
}

export interface AdvanceLoanPaymentHistory {
  id: number;
  loanId: AdvanceLoanScheduleLoan | number;
  paidAt: string;
  principalAmount: number;
  interestPaid: number;
  lateFeeAmount: number;
  totalAmount: number;
  remainingBalance: number;
  modeofPayment: string;
  referenceNumber: string;
  installmentNo: number;
  notes: string;
  receiptNumber: string;
}

export interface AdvanceLoanStatusHistory {
  id: number;
  status: string;
  changedAt: string;
  changedBy: AdvanceLoanUser;
  notes: string;
  overrideOpen: boolean;
  overrideBy: AdvanceLoanUser;
  overrideReason: string;
  statusBeforeOverride: string;
}

export interface AdvanceLoanStats {
  totalRecord: number;
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalActive: number;
  totalCompleted: number;
  totalDefaulted: number;
  totalOverdueInstallments: number;
  totalCreditReported: number;
  totalOverride: number;
  totalamount: number;
  totalOutstanding: number;
  totalPaid: number;
  avgInterestRate: number;
  advanceLoans: AdvanceLoan[];
}

export interface UserDTO {
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