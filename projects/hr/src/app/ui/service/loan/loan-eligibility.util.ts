import { hasOutstandingBalanceStatus } from './loan-format.util';

/** Applied for but not yet being repaid: these become debt if they go through. */
const PIPELINE_STATUSES = ['PENDING', 'AWAITING_INTEREST_ACCEPTANCE', 'APPROVED', 'READY_FOR_DISBURSEMENT'];

/** The fields the calculation needs; both advance loans and cooperative loans have them. */
export interface BorrowingLoanLike {
  status?: string;
  amount?: number;
  approvedAmount?: number;
  outstandingPrincipal?: number | null;
  totalPrincipalPaid?: number;
}

export interface BorrowingCommitment {
  /** Principal still owed on loans being repaid (active, overdue, skipped, paused, defaulted). */
  outstandingPrincipal: number;
  /** Full amount of loans applied for but not yet disbursed (pending, approved, disbursable). */
  pipelineAmount: number;
  total: number;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

/** Principal still owed on a loan in repayment. */
function outstandingPrincipalOf(loan: BorrowingLoanLike): number {
  const reported = Number(loan.outstandingPrincipal);
  if (Number.isFinite(reported) && reported >= 0 && loan.outstandingPrincipal !== undefined && loan.outstandingPrincipal !== null) {
    return reported;
  }
  const principal = Number(loan.approvedAmount || loan.amount || 0);
  return Math.max(principal - Number(loan.totalPrincipalPaid || 0), 0);
}

/**
 * What an employee is already committed to borrowing, for the one-third-of-salary limit. Counts loans
 * being repaid at their remaining principal and loans in the pipeline at their full amount (so several
 * pending applications can't get around the limit). Rejected and completed loans count as nothing.
 */
export function computeBorrowingCommitment(loans: BorrowingLoanLike[]): BorrowingCommitment {
  let outstandingPrincipal = 0;
  let pipelineAmount = 0;
  (loans || []).forEach((loan) => {
    const status = String(loan.status || '').toUpperCase();
    if (hasOutstandingBalanceStatus(status)) {
      outstandingPrincipal += outstandingPrincipalOf(loan);
    } else if (PIPELINE_STATUSES.includes(status)) {
      pipelineAmount += Number(loan.approvedAmount || loan.amount || 0);
    }
  });
  return {
    outstandingPrincipal: round(outstandingPrincipal),
    pipelineAmount: round(pipelineAmount),
    total: round(outstandingPrincipal + pipelineAmount)
  };
}
