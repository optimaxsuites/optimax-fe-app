import { CooperativeLoan } from "../../../domain/loan/cooperative-loan.dto";

export interface CooperativeMember {
  id: number;
  employeeId: number;
  memberId: number;
  fullName: string;
  email: string;
  phone: string;
  joinDate: string;
  monthlySalary?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  shareCapital: number;
  address?: string;
  cooperativeGroup?: any[];
  contributionHistory?: any[];
  loanHistory?: any[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt: string;
  updatedAt: string;
  memberAccountNumber?: string;  
  memberBankName?: string;       
  firstName?: string;            
  lastName?: string;            
}

export interface CooperativeLoanGroup {
  id: number;
  code?: string;
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
  patronageAmount?: number;
  memberLimit?: number;
  withdrawCap?: number;
  currentBalance?: number;
  contributionsBankName: string;
  contributionsAccount: string;
  principalBankName: string;
  principalCollectionAccount: string;
  interestBankName: string;
  interestCollectionAccount: string;
  lateFeePercentage?: number;
  lateFeeGraceDays?: number;
  lateFeeBankName: string;
  lateFeeCollectionAccount: string;
  accountingEmail?: string;
  accountingWebhookUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface GroupBorrowerRow {
  memberId: number;
  memberName: string;
  loanId: string;
  status: string;
  amount: number;
  totalPaid: number;
  outstanding: number;
  progressPercent: number;
  repaymentStatus: string;
  nextDueDate: string | null;
  hasOverdueRepayment: boolean;
  loan?: CooperativeLoan; // Add this line
}

export interface CooperativeGroupMembership {
  id: number;
  memberId: number;
  groupId: number;
  membershipId?: number;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
  monthlyContributionAmount: number;
  totalContribution: number;
  joinedAt: string;
  requestedAt?: string;
  approvedAt?: string;
  activatedAt?: string;
  rejectedAt?: string;
  inactiveAt?: string;
  reviewedAt?: string;
  reviewedBy?: number;
  reviewNote?: string;
  rejectionReason?: string;
  lastContributionAmount?: number;
  lastContributionDate?: string;
  expectedContributionDay?: number;
  membershipHistory?: CooperativeGroupMembershipHistory[];
}

export interface CooperativeGroupMembershipHistory {
  id: number;
  membershipId: number;
  groupId: number;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
  changedAt: string;
  changedBy?: number;
  notes?: string;
}

export type CooperativeContributionPaymentMethod =
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'CASH'
  | 'PAYROLL_DEDUCTION'
  | 'MOBILE_MONEY';

export type CooperativeContributionRequestStatus = 'PENDING_CONFIRMATION' | 'CONFIRMED';

export interface CooperativePendingContributionRequest {
  id: number;
  membershipId: number;
  memberId: number;
  groupId: number;
  amount: number;
  contributionMonth: string;
  requestedAt: string;
  paymentMethod: CooperativeContributionPaymentMethod;
  accountingEmail: string;
  contributionsBankName: string;
  contributionsAccount: string;
  status: CooperativeContributionRequestStatus;
  confirmedAt?: string;
}

export interface CooperativeContributionEntry {
  id: number;
  membershipId: number;
  memberId: number;
  groupId: number;
  amount: number;
  contributionMonth: string;
  contributedAt: string;
  status: 'POSTED';
  paymentMethod?: CooperativeContributionPaymentMethod;
  paymentRecordId?: number;
  postedBy?: number;
}

export interface CooperativeGroupInviteHistoryEntry {
  id: number;
  groupId: number;
  employeeId: number;
  employeeName: string;
  employeeEmail: string;
  department: string;
  rank: CooperativeStaffRank;
  level?: string;
  tenureMonths: number;
  sentAt: string;
  subject: string;
  message: string;
}


export type CooperativeGuarantorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface CooperativeLoanGuarantor {
  memberId: number;
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
  id: number;
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
  loanId: number;
  memberId: number;
  createdAt: string;
  read: boolean;
}

// export interface CooperativeRepayment {
//   id: string;
//   loanId: number;
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
  id: number;
  loanId: number;
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
  status: 'PENDING' | 'PAID' | 'SKIPPED' | 'OVERDUE';
  notes?: string;
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
  employeeId: number;
  fullName: string;
  email: string;
  workEmail?: string;
  monthlySalary?: number;
  phone?: string;
  department?: string;
  level?: string;
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
    | 'REJECTED'
    | 'ALREADY_MEMBER'
    | 'APPROVED'
    | 'ERROR';
  message: string;
  eligibility?: CooperativeMembershipEligibility;
  member?: CooperativeMember;
}