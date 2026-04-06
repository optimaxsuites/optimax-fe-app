// loan.types.ts
export type LoanStatus = 'PENDING' | 'AWAITING_INTEREST_ACCEPTANCE' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
export type LoanPaymentMode = 'MONTHLY' | 'ONE_OFF';

export interface LoanAuditUser {
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

export interface LoanApplication {
  id: number;
  loanCode: string;
  clientSubmissionKey?: string;
  localOnly?: boolean;
  employeeId: number;
  amount: number;
  purpose: string;
  repaymentTime: number;
  repaymentAmount: number;
  modeOfPayment: LoanPaymentMode;
  status: LoanStatus;
  requestDate: string;
  approvedDate?: string;
  approvedBy?: number | LoanAuditUser;
  disbursedDate?: string;
  disbursedBy?: number | LoanAuditUser;
  completedDate?: string;
  rejectedDate?: string;
  rejectedBy?: number | LoanAuditUser;
  adminComment: string;
  currentBalance: number;
  totalPaid: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  outstandingPrincipal: number;
  statusBeforeOverride?: LoanStatus;
  statusHistory: StatusChange[];
  repaymentSchedule: RepaymentScheduleItem[];
  paymentHistory: PaymentRecord[];
  fullName?: string;
  department?: string;
  acknowledgment?: boolean;
  interestRate?: number;
  supportingDocuments?: LoanSupportingDocument[];
  repaymentStartDate?: string;
  repaymentDay?: number;
}

export interface LoanSupportingDocument {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface StatusChange {
  id?: number;
  status: LoanStatus;
  changedAt: string;
  changedBy?: number | LoanAuditUser | string;
  notes?: string;
  overrideOpen?: boolean;
  overrideBy?: number | LoanAuditUser | string;
  overrideReason?: string;
  statusBeforeOverride?: LoanStatus;
  interestRate?: number;
}

export interface RepaymentScheduleItem {
  id?: number;
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

export interface PaymentRecord {
  id?: number;
  loanId?: number;
  paidAt: string;
  principalAmount: number;
  interestPaid: number;
  lateFeeAmount: number;
  totalAmount: number;
  remainingBalance: number;
  paymentMethod: string;
  referenceNumber: string;
  installmentNo: number;
  receiptNumber: string;
  receivedBy?: string;
  notes: string;
}


export interface LoanApplicationFormData {
  purpose: string;
  purposeCode?: string;
  otherPurpose?: string;
  amount: number;
  repaymentTime: number;
  repaymentStartDate: string;
  repaymentDay?: number;
  repaymentAmount: number;
  modeOfPayment: LoanPaymentMode;
  acknowledgment: boolean;
  supportingDocuments?: LoanSupportingDocument[];
  requestDate?: string;
  employeeId: number;
  employeeName?: string;
  department?: string;
  monthlySalary?: number;
}