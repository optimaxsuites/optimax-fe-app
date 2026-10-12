import { CooperativeLoan } from '../../../domain/loan/cooperative-loan.dto';

/**
 * Total a cooperative member repays on a loan. Prefers the figure stored on the loan (computed when
 * the application was submitted); otherwise uses the same formula as the application form: simple
 * interest at the group's annual rate over the repayment months.
 */
export function resolveCooperativeTotalRepayable(
  loan: Pick<CooperativeLoan, 'totalRepayable' | 'totalRepayment' | 'approvedAmount' | 'amount' | 'repaymentTime' | 'duration'>,
  annualInterestRate: number | null | undefined
): number {
  const stored = Number(loan.totalRepayable || loan.totalRepayment || 0);
  if (stored > 0) {
    return stored;
  }

  const principal = Number(loan.approvedAmount || loan.amount || 0);
  const months = Number(loan.repaymentTime || loan.duration || 0);
  const rate = Number(annualInterestRate || 0);
  const totalInterest = Math.round((principal * rate * months) / 1200);
  return principal + totalInterest;
}
