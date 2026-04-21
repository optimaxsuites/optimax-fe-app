// Advance/Standard Loan DTOs
// advance-loan.dto.ts

export type AdvanceLoanStatus = 
  | 'PENDING' 
  | 'APPROVED' 
  | 'READY_FOR_DISBURSEMENT'
  | 'REJECTED' 
  | 'ACTIVE' 
  | 'COMPLETED'
  | 'SKIPPED'
  | 'OVERDUE'
  | 'DEFAULTED'
  | 'PAUSED';

export interface AdvanceLoan {
  id: number;
  loanCode: string;
  employee: AdvanceLoanEmployee;
  monthlySalary?: number;
  amount: number;
  approvedAmount?: number;
  purpose: string;
  purposeCode?: string;
  repaymentAmount: number;
  repaymentTime: number;
  repaymentPeriodMonths?: number;
  repaymentStartDate?: string;
  repaymentDay?: number;
  modeOfPayment: string;
  interestRate?: number;
  interestAgreement?: AdvanceLoanInterestAgreement;
  totalRepayable?: number;
  requestDate: string;
  approvedDate: string;
  approvedBy: number | AdvanceLoanUser;
  disbursementInitiatedAt?: string;
  disbursementInitiatedBy?: number | AdvanceLoanUser;
  disbursementInstructionReference?: string;
  disbursementConfirmedAt?: string;
  disbursementConfirmedBy?: number | AdvanceLoanUser;
  disbursementReference?: string;
  disbursedAmount?: number;
  disbursedDate: string;
  disbursedBy: number | AdvanceLoanUser;
  completedDate: string;
  rejectedDate: string;
  rejectedBy: number | AdvanceLoanUser;
  status: AdvanceLoanStatus;
  adminComment: string;
  currentBalance: number;
  totalPaid: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalLateFeesAccrued?: number;
  totalLateFeesPaid?: number;
  outstandingPrincipal: number;
  outstandingInterest?: number;
  outstandingBalance?: number;
  lateFeePercentage?: number;
  lateFeeGracePeriodDays?: number;
  lastPaymentReceived?: string;
  lastPaymentAmount?: number;
  nextPaymentDueDate?: string;
  skippedPaymentsCount?: number;
  overduePaymentsCount?: number;
  employeeBankName?: string;
  employeeAccountNumber?: string;
  statusBeforeOverride: string;
  repaymentSchedule: AdvanceLoanRepaymentSchedule[];
  paymentHistory: AdvanceLoanPaymentHistory[];
  statusHistory: AdvanceLoanStatusHistory[];
  // Grace period requests associated with this loan
  gracePeriodRequests?: AdvanceLoanGracePeriodRequest[];
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
  monthlySalary?: number;
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
  loan?: AdvanceLoanScheduleLoan;
  installmentNo: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'SKIPPED';
  paymentMethod?: string;
  receiptNumber?: string;
  reminderSentAt?: string;
  lateFeeAmount?: number;
  creditReportedAt?: string;
}

export interface AdvanceLoanScheduleLoan {
  id: number;
  loanCode: string;
  employee: AdvanceLoanEmployee;
  monthlySalary?: number;
  amount: number;
  approvedAmount?: number;
  purpose: string;
  repaymentAmount: number;
  repaymentTime: number;
  repaymentPeriodMonths?: number;
  repaymentStartDate?: string;
  repaymentDay?: number;
  modeOfPayment: string;
  interestRate?: number;
  interestAgreement?: AdvanceLoanInterestAgreement;
  totalRepayable?: number;
  requestDate: string;
  approvedDate: string;
  approvedBy: number | AdvanceLoanUser;
  disbursementInitiatedAt?: string;
  disbursementInitiatedBy?: number | AdvanceLoanUser;
  disbursementInstructionReference?: string;
  disbursementConfirmedAt?: string;
  disbursementConfirmedBy?: number | AdvanceLoanUser;
  disbursementReference?: string;
  disbursedAmount?: number;
  disbursedDate: string;
  disbursedBy: number | AdvanceLoanUser;
  completedDate: string;
  rejectedDate: string;
  rejectedBy: number | AdvanceLoanUser;
  status: AdvanceLoanStatus;
  adminComment: string;
  currentBalance: number;
  totalPaid: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalLateFeesAccrued?: number;
  totalLateFeesPaid?: number;
  outstandingPrincipal: number;
  outstandingInterest?: number;
  outstandingBalance?: number;
  lateFeePercentage?: number;
  lateFeeGracePeriodDays?: number;
  lastPaymentReceived?: string;
  lastPaymentAmount?: number;
  nextPaymentDueDate?: string;
  skippedPaymentsCount?: number;
  overduePaymentsCount?: number;
  employeeBankName?: string;
  employeeAccountNumber?: string;
  statusBeforeOverride: string;
  repaymentSchedule: string[];
  paymentHistory: string[];
  statusHistory: AdvanceLoanScheduleStatusHistory[];
  gracePeriodRequests?: AdvanceLoanGracePeriodRequest[];
}

export interface AdvanceLoanScheduleStatusHistory {
  id: number;
  loan: string;
  status: AdvanceLoanStatus;
  changedAt: string;
  changedBy: number | AdvanceLoanUser;
  notes: string;
  overrideOpen: boolean;
  overrideBy: number | AdvanceLoanUser;
  overrideReason: string;
  statusBeforeOverride: string;
  interestRate?: number;
}

export interface AdvanceLoanPaymentHistory {
  id: number;
  loanId: number;
  paymentType?: string;
  paidAt: string;
  amount?: number;
  principalApplied?: number;
  principalAmount: number;
  interestApplied?: number;
  interestPaid: number;
  lateFeeApplied?: number;
  lateFeeAmount: number;
  totalAmount: number;
  remainingBalance: number;
  paymentMethod?: string;
  modeofPayment?: string;
  paymentReference?: string;
  referenceNumber: string;
  paidIntoAccount?: string;
  paidFromAccount?: string;
  installmentNumber?: number;
  installmentNo: number;
  notes: string;
  receiptNumber: string;
  recordedBy?: number;
  recordedAt?: string;
  recordStatus?: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface AdvanceLoanStatusHistory {
  id: number;
  status: AdvanceLoanStatus;
  changedAt: string;
  changedBy: number | AdvanceLoanUser;
  notes: string;
  overrideOpen: boolean;
  overrideBy: number | AdvanceLoanUser;
  overrideReason: string;
  statusBeforeOverride: string;
  interestRate?: number;
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
  totalLoanAmount: number;
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

// New: Grace Period Request DTO
export interface AdvanceLoanGracePeriodRequest {
  id: number;
  loanId: number;
  employeeId: number;
  installmentNumber: number;
  paymentSubtype: 'PRINCIPAL_REPAYMENT' | 'INTEREST_ONLY' | 'LATE_FEE';
  amountPaid: number;
  remainingBalance: number;
  requestedAt: string;
  requestedDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  reviewedAt?: string;
  reviewedBy?: number | AdvanceLoanUser;
  reviewNote?: string;
  rejectionReason?: string;
  approvedGraceDays?: number;
  newDueDate?: string;
  paymentCompletedAt?: string;
}

// New: Interest Agreement DTO
export interface AdvanceLoanInterestAgreement {
  id: number;
  loanId: number;
  employeeId: number;
  proposedInterestRate: number;
  agreedInterestRate: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  agreedAt?: string;
  agreementMethod: 'EMAIL_LINK' | 'IN_PERSON' | 'DIGITAL_SIGNATURE' | 'ADMIN_OVERRIDE';
  ipAddress?: string;
  notes?: string;
}

// New: Loan Purpose DTO
export interface AdvanceLoanPurpose {
  id: number;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  maxLoanAmount: number;
  minLoanAmount: number;
  defaultInterestRate: number;
  requiresDocumentation: boolean;
  documentationTypes: string[];
}

// New: Disbursement Confirmation DTO
export interface AdvanceLoanDisbursementConfirmation {
  id: number;
  loanId: number;
  disbursedAmount: number;
  disbursementConfirmedAt: string;
  disbursementConfirmedBy: number;
  disbursementInstructionReference: string;
  disbursementReference: string;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'PAYROLL_DEDUCTION';
  notes?: string;
}