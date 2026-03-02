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
  approvedDate?: string;
  disbursementDate?: string;
  completionDate?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CooperativeRepayment {
  id: string;
  loanId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
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