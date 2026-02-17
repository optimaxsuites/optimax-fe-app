// loan.types.ts
export interface LoanApplication {
  approvedDate?: string;
  startDate?: string;
  endDate?: string;
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
  statusHistory: StatusChange[];
  repaymentSchedule: RepaymentScheduleItem[];
  paymentHistory: PaymentRecord[];
}

export interface StatusChange {
  id?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED';
  date: string;
  changedBy?: string;
  notes?: string;
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
}

export interface PaymentRecord {
  id?: string;
  date: string;
  amount: number;
  paymentMethod: string;
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
  submissionDate?: string;
}