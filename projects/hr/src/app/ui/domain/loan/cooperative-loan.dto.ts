import { Employee } from './cooperative-member.dto';

export interface CooperativeLoanGuarantorEntry {
  memberId: string;
  guaranteedAmount: number;
  status: string;
  requestedAt: string;
  decidedAt?: string;
  note?: string;
}

export interface CooperativeLoan {
  id: string | number;
  loanCode: string;
  cooperativeMemberId: string | number;
  cooperativeGroupId: string | number;
  amount: number;
  purpose: string;
  repaymentAmount: number;
  repaymentTime: number;
  modeOfPayment: string;
  requestDate: string;
  approvedDate: string;
  disbursedDate: string;
  completedDate: string;
  rejectedDate: string;
  status: string;
  adminComment: string;
  applicationStage?: string;
  guarantors: CooperativeLoanGuarantorEntry[];
  guarantorApproval?: boolean;
  totalPaid: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  outstandingPrincipal: number;
  paymentHistory: PaymentHistory[];
  statusHistory: StatusHistory[];
  loanId?: string;
  memberId?: string;
  groupId?: string;
  duration?: number;
  interestRate?: number;
  monthlyRepayment?: number;
  totalRepayment?: number;
  applicationDate?: string;
  disbursementDate?: string;
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
  cooperativeLoan: CooperativeLoan;
  installmentNo: number;
  paidAt: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  interest: number;
  remainingBalance: number;
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
  changedBy: ChangedBy;
  notes: string;
  overrideOpen: boolean;
  overrideBy: ChangedBy;
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
