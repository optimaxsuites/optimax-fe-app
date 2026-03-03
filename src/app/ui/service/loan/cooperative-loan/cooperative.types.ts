export interface CooperativeMember {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  shareCapital: number;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CooperativeLoanProduct {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  minDuration: number;
  maxDuration: number;
  requiresShares: boolean;
  patronageEligible: boolean;
  patronageRate: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CooperativeLoan {
  id: string;
  loanId: string;
  memberId: string;
  productId: string;
  amount: number;
  purpose: string;
  duration: number;
  interestRate: number;
  monthlyRepayment: number;
  totalRepayment: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'DEFAULTED';
  applicationDate: string;
  useSharesAsCollateral?: boolean;
  pledgedSharesAmount?: number;
  fundsReserved?: boolean;
  adminRequestNote?: string;
  approvedDate?: string;
  disbursementDate?: string;
  completionDate?: string;
  defaultedDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CooperativeNotification {
  id: string;
  type: 'LOAN_PENDING_APPROVAL' | 'LOAN_STATUS_UPDATE' | 'LOAN_CHANGE_REQUESTED' | 'LOAN_REPAYMENT_REMINDER' | 'LOAN_DEFAULTED';
  recipient: 'ADMIN' | 'MEMBER';
  title: string;
  message: string;
  loanId: string;
  memberId: string;
  createdAt: string;
  read: boolean;
}

export interface CooperativeRepayment {
  id: string;
  loanId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: 'BANK_TRANSFER' | 'CASH' | 'PAYROLL_DEDUCTION' | 'MOBILE_MONEY' | 'OTHER';
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface CooperativeStats {
  totalMembers: number;
  activeMembers: number;
  totalLoans: number;
  activeLoans: number;
  pendingLoans: number;
  totalFund: number;
  loanPortfolio: number;
}