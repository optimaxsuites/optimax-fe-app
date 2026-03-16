// loan.types.ts
export interface LoanApplication {
  backendId?: number;
  loanCode?: string;
  approvedDate?: string;
  disbursementDate?: string;
  startDate?: string;
  endDate?: string;
  submittedAt?: string;
  adminComment?: string;
  id: string;
  employeeId: string;
  fullName: string;
  department: string;
  loanAmount: number;
  paymentMode?: 'monthly' | 'one_off';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  dateSubmitted: string;
  purpose: string;
  repaymentPeriod: number;
  monthlyRepayment: number;
  acknowledgment: boolean;
  interestRate: number;
  currentBalance: number;
  totalPaid: number;
  totalPrincipalPaid?: number;
  totalInterestPaid?: number;
  outstandingPrincipal?: number;
  statusHistory: StatusChange[];
  repaymentSchedule: RepaymentScheduleItem[];
  paymentHistory: PaymentRecord[];
  supportingDocuments?: LoanSupportingDocument[];
}

export interface LoanSupportingDocument {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface StatusChange {
  id?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  date: string;
  changedBy?: string;
  notes?: string;
  interestRate?: number;
}

export interface RepaymentScheduleItem {
  id?: string;
  monthNumber: number;
  dueDate: string;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingBalance: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'SKIPPED';
  paymentDate?: string;
  paidAmount?: number;
  paymentMethod?: string;
  receiptNumber?: string;
  reminderSentAt?: string;
  lateFeeAmount?: number;
  creditReportedAt?: string;
}

export interface PaymentRecord {
  id?: string;
  date: string;
  amount: number;
  paymentMethod: string;
  principalAmount?: number;
  interestPaid?: number;
  lateFeeAmount?: number;
  remainingBalance?: number;
  installmentNo?: number;
  receiptNumber?: string;
  referenceNumber?: string;
  receivedBy?: string;
  notes?: string;
}

export interface LoanApplicationFormData {
  loanPurpose: string;
  otherPurpose?: string;
  loanAmount: number;
  repaymentPeriod: number;
  monthlyRepaymentAmount: number;
  paymentMode: 'monthly' | 'one_off';
  acknowledgment: boolean;
  supportingDocuments?: LoanSupportingDocument[];
  submissionDate?: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  employeeNumericId?: number;
}