import { LoanSupportingDocument } from '../../service/loan/loan.types';
import { Employee } from './cooperative-member.dto';

export interface CooperativeLoanAuditUser {
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

export interface CooperativeLoanGuarantorEntry {
  id?: number;
  loanId?: number;
  guarantorMemberId?: number;
  memberId: number;
  guaranteedAmount: number;
  status: string;
  requestedAt: string;
  respondedAt?: string;
  responseNote?: string;
  decidedAt?: string;
  note?: string;
}

export interface CooperativeLoan {
  id: number;
  loanCode: string;
  cooperativeMemberId: number;
  cooperativeGroupId: number;
  membershipId?: number;
  amount: number;
  purpose: string;
  approvedAmount?: number;
  repaymentAmount: number;
  repaymentTime: number;
  repaymentStartDate?: string;
  repaymentDay?: number;
  modeOfPayment: string;
  requestDate: string;
  approvedDate: string;
  approvedBy?: number | CooperativeLoanAuditUser;
  disbursedDate: string;
  disbursementInitiatedAt?: string;
  disbursementInitiatedBy?: number | CooperativeLoanAuditUser;
  disbursementInstructionLoanReference?: string;
  disbursementConfirmedAt?: string;
  disbursementConfirmedBy?: number | CooperativeLoanAuditUser;
  disbursementReference?: string;
  disbursedAmount?: number;
  completedDate: string;
  rejectedDate: string;
  rejectedBy?: number | CooperativeLoanAuditUser;
  status: string;
  adminComment: string;
  applicationStage?: string;
  guarantorsId?: number;
  guarantors: CooperativeLoanGuarantorEntry[];
  guarantorApproval?: boolean;
  guarantorApprovalStatus?: string;
  totalRepayable?: number;
  totalPaid: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  totalLateFeesAccrued?: number;
  totalLateFeesPaid?: number;
  outstandingPrincipal: number;
  outstandingInterest?: number;
  outstandingBalance?: number;
  lastPaymentReceived?: string;
  lastPaymentAmount?: number;
  nextPaymentDueDate?: string;
  skippedPaymentsCount?: number;
  overduePaymentsCount?: number;
  memberBankName?: string;
  memberAccountNumber?: string;
  principalBankName?: string;
  principalCollectionAccount?: string;
  interestBankName?: string;
  interestCollectionAccount?: string;
  lateFeeBankName?: string;
  lateFeeCollectionAccount?: string;
  accountingEmail?: string;
  accountingWebhookUrl?: string;
  gracePeriodRequests?: CooperativeLoanGracePeriodRequest[];
  paymentHistory: PaymentHistory[];
  statusHistory: StatusHistory[];
  supportingDocuments?: LoanSupportingDocument[];
  loanId?: number;
  memberId?: number;
  groupId?: number;
  duration?: number;
  interestRate?: number;
  lateFeePercentage?: number;
  lateFeeGraceDays?: number;
  totalRepayment?: number;
  applicationDate?: string;
  completionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  adminRequestNote?: string;
  rejectionReason?: string;
  infoRequestedDate?: string;
  defaultedDate?: string;
  fundsReserved?: boolean;
  legacyGuarantor?: Guarantor;
}

export interface CooperativeLoanGracePeriodRequest {
  id: number;
  loanId: number;
  memberId: number;
  installmentNumber: number;
  paymentSubtype: string;
  amountPaid: number;
  remainingBalance: number;
  requestedAt: string;
  requestedDays: number;
  reason: string;
  status: string;
  reviewedAt?: string;
  reviewedBy?: number | CooperativeLoanAuditUser;
  reviewNote?: string;
  rejectionReason?: string;
  approvedGraceDays?: number;
  newDueDate?: string;
  paymentCompletedAt?: string;
}

export interface Guarantor {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  relationshipId: number;
  dob: string;
  idNumber: string;
  yearsKnown: number;
  signature: string;
  passportPhoto: string;
  idCard: string;
  employee: Employee;
  guarantorMedia: GuarantorMedia;
  guarantorPhoto: GuarantorPhoto;
  guarantorSignature: GuarantorSignature;
}

export interface GuarantorMedia {
  id: number;
  name: string;
  mediaNo: string;
}

export interface GuarantorPhoto {
  id: number;
  name: string;
  mediaNo: string;
}

export interface GuarantorSignature {
  id: number;
  name: string;
  mediaNo: string;
}

export interface PaymentHistory {
  id: number;
  paymentType?: string;
  membershipId?: number;
  loanId?: number;
  groupId?: number;
  cooperativeLoan?: CooperativeLoan | string;
  installmentNumber?: number;
  installmentNo: number;
  paidAt: string;
  amount: number;
  principalApplied?: number;
  principalAmount?: number;
  interestApplied?: number;
  referenceNumber: string;
  interest: number;
  lateFeeApplied?: number;
  remainingBalance: number;
  paymentMethod?: string;
  paymentReference?: string;
  paidIntoAccount?: string;
  paidFromAccount?: string;
  recordedBy?: number;
  recordedAt?: string;
  recordStatus?: string;
  modeofPayment: string;
  status: string;
  lateFeeAmount: number;
  totalPayment: number;
  notes: string;
  receiptNumber: string;
}

export interface StatusHistory {
  id: number;
  status: string;
  changedAt: string;
  changedBy: ChangedBy | number;
  notes: string;
  overrideOpen: boolean;
  overrideBy: ChangedBy | number;
  overrideReason: string;
  statusBeforeOverride: string;
}

export interface ChangedBy {
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
