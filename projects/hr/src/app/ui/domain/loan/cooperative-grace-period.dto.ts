// This is a stub for the cooperative grace period request model, matching the API payload
export interface CooperativeGracePeriodRequest {
  id?: number;
  loanId: number;
  memberId: number;
  installmentNumber: number;
  paymentSubtype: 'CONTRIBUTION' | 'PRINCIPAL_REPAYMENT' | 'INTEREST_PAYMENT' | 'LATE_FEE';
  amountPaid: number;
  remainingBalance: number;
  requestedAt: string;
  requestedDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  reviewedAt?: string;
  reviewedBy?: any;
  reviewNote?: string;
  rejectionReason?: string;
  approvedGraceDays?: number;
  newDueDate?: string;
  paymentCompletedAt?: string;
}
