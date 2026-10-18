import { LoanApplication } from './loan.types';
import { LoanPurposeData } from './loan-purpose.service';

/**
 * Where a loan's interest rate comes from at approval:
 * - `fixed`:   the purpose is defined in Loan Purpose Management with a rate. That rate is applied
 *              and admins can't change it (only Loan Purpose Management can).
 * - `missing`: the purpose is defined but has no rate yet. Approval is blocked until one is set.
 * - `custom`:  "Other", or a purpose that isn't defined in Loan Purpose Management (the employee
 *              typed their own, or it was removed later). The approving admin enters the rate.
 */
export type PurposeRateResolution =
  | { kind: 'fixed'; rate: number; purposeName: string }
  | { kind: 'missing'; purposeName: string }
  | { kind: 'custom'; purposeName: string };

/** Custom rates entered at approval must be above 0% and at most 100%, like purpose rates. */
export function isValidCustomInterestRate(rate: unknown): boolean {
  if (rate === null || rate === undefined || String(rate).trim() === '') {
    return false;
  }
  const value = Number(rate);
  return Number.isFinite(value) && value > 0 && value <= 100;
}

/**
 * Resolves a loan's rate source against the full purpose list (include inactive purposes: a purpose
 * deactivated after the employee applied still fixes the rate). Matches by code, then by name.
 */
export function resolvePurposeInterestRate(
  application: Pick<LoanApplication, 'purposeCode' | 'purpose'>,
  purposes: LoanPurposeData[]
): PurposeRateResolution {
  const code = String(application.purposeCode || '').trim().toLowerCase();
  const name = String(application.purpose || '').trim().toLowerCase();
  const purposeName = String(application.purpose || application.purposeCode || 'Other').trim();

  const purpose = (code && code !== 'n/a'
    ? purposes.find((p) => String(p.code || '').trim().toLowerCase() === code)
    : undefined)
    || (name ? purposes.find((p) => String(p.name || '').trim().toLowerCase() === name) : undefined);

  if (!purpose) {
    return { kind: 'custom', purposeName };
  }

  const rate = Number(purpose.defaultInterestRate ?? 0);
  return rate > 0
    ? { kind: 'fixed', rate, purposeName: purpose.name || purposeName }
    : { kind: 'missing', purposeName: purpose.name || purposeName };
}
