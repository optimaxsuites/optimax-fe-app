export interface CooperativeMember {
  id: string;
  employeeId?: string;
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

export interface CooperativeLoanGroup {
  id: string;
  name: string;
  description: string;
  minEligibleSalary?: number;
  monthlyContributionAmount: number;
  maxBorrowingPercentage: number;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  minDuration: number;
  maxDuration: number;
  minMemberTenureMonths?: number;
  requiresShares: boolean;
  requiresGuarantors?: boolean;
  minimumGuarantors?: number;
  quickDisbursement?: boolean;
  patronageEligible: boolean;
  patronageRate: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CooperativeGroupMembership {
  id: string;
  memberId: string;
  groupId: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  monthlyContributionAmount: number;
  totalContribution: number;
  joinedAt: string;
  requestedAt?: string;
  reviewedAt?: string;
  reviewNote?: string;
  rejectionReason?: string;
  lastContributionDate?: string;
}

export interface CooperativeContributionEntry {
  id: string;
  membershipId: string;
  memberId: string;
  groupId: string;
  amount: number;
  contributionMonth: string;
  contributedAt: string;
  status: 'POSTED';
}

export interface CooperativeGroupInviteHistoryEntry {
  id: string;
  groupId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  rank: CooperativeStaffRank;
  tenureMonths: number;
  sentAt: string;
  subject: string;
  message: string;
}

export type CooperativeGuarantorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface CooperativeLoanGuarantor {
  memberId: string;
  guaranteedAmount: number;
  status: CooperativeGuarantorStatus;
  requestedAt: string;
  decidedAt?: string;
  note?: string;
}

export type CooperativeLoanApplicationStage =
  | 'PENDING_GUARANTOR_APPROVAL'
  | 'READY_FOR_ADMIN_REVIEW'
  | 'UNDER_ADMIN_REVIEW'
  | 'INFO_REQUESTED';


export interface CooperativeNotification {
  id: string;
  type:
    | 'LOAN_PENDING_APPROVAL'
    | 'GROUP_JOIN_REQUEST'
    | 'GROUP_JOIN_STATUS_UPDATE'
    | 'LOAN_STATUS_UPDATE'
    | 'LOAN_CHANGE_REQUESTED'
    | 'LOAN_REPAYMENT_REMINDER'
    | 'LOAN_DEFAULTED'
    | 'GUARANTOR_REQUEST'
    | 'GUARANTOR_STATUS_UPDATE'
    | 'LOAN_INFO_REQUESTED';
  recipient: 'ADMIN' | 'MEMBER';
  title: string;
  message: string;
  loanId: string | number;
  memberId: string;
  createdAt: string;
  read: boolean;
}

// export interface CooperativeRepayment {
//   id: string;
//   loanId: string | number;
//   amount: number;
//   dueDate: string;
//   paidDate?: string;
//   receiptNumber?: string;
//   principalComponent?: number;
//   interestComponent?: number;
//   lateFeeAmount?: number;
//   reminderSentAt?: string;
//   creditReportedAt?: string;
//   modeofPayment?: 'BANK_TRANSFER' | 'CASH' | 'PAYROLL_DEDUCTION' | 'MOBILE_MONEY' | 'OTHER';
//   status: 'PENDING' | 'PAID' | 'OVERDUE';
// }

// In cooperative.types.ts
export interface CooperativeRepayment {
  id: string;
  loanId: string | number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  receiptNumber?: string;
  principalComponent?: number;
  interestComponent?: number;
  lateFeeAmount?: number;
  reminderSentAt?: string;
  creditReportedAt?: string;
  modeofPayment?: 'BANK_TRANSFER' | 'CASH' | 'PAYROLL_DEDUCTION' | 'MOBILE_MONEY' | 'OTHER';
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  notes?: string;  // Add this line
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

export type CooperativeStaffRank = 'JUNIOR' | 'MID' | 'SENIOR' | 'EXEC';

export type CooperativeEmploymentType = 'PERMANENT' | 'CONTRACT' | 'INTERN';

export type CooperativeMembershipTier = 'STANDARD' | 'GOLD' | 'EXECUTIVE';

export interface CooperativeEmployeeProfile {
  employeeId: string;
  fullName: string;
  email: string;
  monthlySalary?: number;
  phone?: string;
  department?: string;
  rank: CooperativeStaffRank;
  employmentType: CooperativeEmploymentType;
  employmentStartDate: string;
  onProbation?: boolean;
  probationEndDate?: string;
  hasActiveDisciplinaryIssue?: boolean;
  managerId?: string;
}

export interface CooperativeMembershipTierPolicy {
  tier: CooperativeMembershipTier;
  maxLoan: number;
  minShares: number;
  votingRights: 'FULL' | 'LIMITED' | 'NONE';
}

export interface CooperativeMembershipEligibility {
  canApply: boolean;
  canBeInvited: boolean;
  requiresInvite: boolean;
  requiresManagerApproval: boolean;
  autoApprove: boolean;
  isOnHold: boolean;
  isBlocked: boolean;
  rank: CooperativeStaffRank;
  tenureMonths: number;
  probationCompleted: boolean;
  policy: CooperativeMembershipTierPolicy;
  message: string;
}

export type CooperativeMembershipRequestSource = 'SELF' | 'ADMIN_INVITE';

export interface CooperativeMembershipApplication {
  employee: CooperativeEmployeeProfile;
  source: CooperativeMembershipRequestSource;
  requestedTier?: CooperativeMembershipTier;
  note?: string;
}

export interface CooperativeMembershipActionResult {
  success: boolean;
  status:
    | 'AUTO_APPROVED'
    | 'PENDING_MANAGER_APPROVAL'
    | 'INVITE_REQUIRED'
    | 'ON_HOLD'
    | 'REJECTED';
  message: string;
  eligibility: CooperativeMembershipEligibility;
  member?: CooperativeMember;
}