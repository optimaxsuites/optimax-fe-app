// loan.types.ts
export type LoanStatus =
  | 'PENDING'
  | 'AWAITING_INTEREST_ACCEPTANCE'
  | 'APPROVED'
  | 'READY_FOR_DISBURSEMENT'
  | 'REJECTED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'OVERDUE'
  | 'DEFAULTED'
  | 'PAUSED';
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
  purposeCode?: string;
  repaymentTime: number;
  repaymentAmount: number;
  modeOfPayment: LoanPaymentMode;
  status: LoanStatus;
  requestDate: string;
  /** Approved amount when it differs from the originally requested amount. */
  approvedAmount?: number;
  /** Proposed/agreed interest record returned by the backend. */
  interestAgreement?: {
    id?: number;
    loanId: number;
    employeeId: number;
    proposedInterestRate: number;
    agreedInterestRate: number;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    agreedAt?: string;
    agreementMethod?: string;
    ipAddress?: string;
    notes?: string;
  };
  approvedDate?: string;
  approvedBy?: number | LoanAuditUser;
  /** Actual amount disbursed to the employee. */
  disbursedAmount?: number;
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
  /** Total amount charged across principal, interest, and late fees. */
  outstandingBalance?: number;
  /** Remaining unpaid interest component of the loan balance. */
  outstandingInterest?: number;
  outstandingPrincipal: number;
  /** Next scheduled repayment due date. */
  nextPaymentDueDate?: string;
  /** Number of repayments currently marked as skipped. */
  skippedPaymentsCount?: number;
  /** Number of repayments currently overdue. */
  overduePaymentsCount?: number;
  statusBeforeOverride?: LoanStatus;
  statusHistory: StatusChange[];
  repaymentSchedule: RepaymentScheduleItem[];
  paymentHistory: PaymentRecord[];
  fullName?: string;
  department?: string;
  acknowledgment?: boolean;
  interestRate?: number;
  defaultInterestRate?: number;
  supportingDocuments?: LoanSupportingDocument[];
  repaymentStartDate?: string;
  repaymentDay?: number;
  /** When disbursement was initiated and handed off for processing. */
  disbursementInitiatedAt?: string;
  /** User or actor that initiated the disbursement request. */
  disbursementInitiatedBy?: number | LoanAuditUser | string;
  /** Reference generated for the accounting handoff. */
  disbursementInstructionReference?: string;
  /** When disbursement was confirmed as completed. */
  disbursementConfirmedAt?: string;
  /** User or actor that confirmed the disbursement. */
  disbursementConfirmedBy?: number | LoanAuditUser | string;
  /** External bank or transfer reference for the disbursement. */
  disbursementReference?: string;
  /** Backend bank name fields preserved for employee/admin detail views. */
  employeeBankName?: string;
  /** Backend bank account fields preserved for employee/admin detail views. */
  employeeAccountNumber?: string;
  /** Bank name supplied for member disbursement. */
  memberBankName?: string;
  /** Bank account number supplied for member disbursement. */
  memberAccountNumber?: string;
  /** Total late fees charged across the life of the loan. */
  totalLateFeesAccrued?: number;
  /** Total late fees already paid. */
  totalLateFeesPaid?: number;
  /** Fixed late fee percentage charged once per overdue installment. */
  lateFeePercentage?: number;
  /** Number of days after due date before the late fee is applied. */
  lateFeeGracePeriodDays?: number;
  /** Date of the most recent payment received. */
  lastPaymentReceived?: string;
  /** Amount of the most recent payment received. */
  lastPaymentAmount?: number;
  /** Grace-period requests returned as part of the loan payload. */
  gracePeriodRequests?: Array<{
    id?: number;
    loanId: number;
    employeeId: number;
    installmentNumber: number;
    paymentSubtype: string;
    amountPaid: number;
    remainingBalance: number;
    requestedAt: string;
    requestedDays: number;
    reason: string;
    status: string;
    reviewedAt?: string;
    reviewedBy?: number | LoanAuditUser;
    reviewNote?: string;
    rejectionReason?: string;
    approvedGraceDays?: number;
    newDueDate?: string;
    paymentCompletedAt?: string;
  }>;
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

export interface LoanStatusUpdate extends StatusChange {
  lateFeePercentage?: number;
  lateFeeGracePeriodDays?: number;
  repaymentStartDate?: string;
  repaymentDay?: number;
  disbursementInitiatedAt?: string;
  disbursementInitiatedBy?: number | LoanAuditUser | string;
  disbursementInstructionReference?: string;
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
  notes?: string;  // For storing late fee application notes

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
  // Fixed/default interest fields for UI logic
  hasFixedInterest?: boolean;
  fixedInterestRate?: number;
  defaultInterestAcknowledged?: boolean;
}