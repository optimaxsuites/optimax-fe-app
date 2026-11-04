/** Repayment method shown in the loan payment modals. Only payroll deduction can be chosen for now. */
export interface RepaymentMethodOption {
  value: 'PAYROLL_DEDUCTION' | 'BANK_TRANSFER' | 'CARD' | 'CASH' | 'MOBILE_MONEY';
  label: string;
  icon: string;
  description: string;
  available: boolean;
}

export const PAYROLL_DEDUCTION = 'PAYROLL_DEDUCTION';

export const REPAYMENT_METHODS: RepaymentMethodOption[] = [
  { value: 'PAYROLL_DEDUCTION', label: 'Payroll Deduction', icon: 'fas fa-file-invoice-dollar', description: 'Taken from your salary', available: true },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: 'fas fa-university', description: 'Coming soon', available: false },
  { value: 'CARD', label: 'Card', icon: 'fas fa-credit-card', description: 'Coming soon', available: false },
  { value: 'CASH', label: 'Cash', icon: 'fas fa-money-bill', description: 'Coming soon', available: false },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: 'fas fa-mobile-alt', description: 'Coming soon', available: false },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * The payroll a deduction recorded on `date` falls into. Payroll picks up repayments dated within
 * its month, so a deduction recorded today comes out of this month's salary.
 */
export function payrollPeriodLabel(date: Date = new Date()): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** A reference for a payroll deduction, e.g. PAYROLL-LN0042-I3-202611. */
export function payrollDeductionReference(loanCode: string | number | undefined, installmentNo: number | undefined, date: Date = new Date()): string {
  const code = String(loanCode ?? 'LOAN').replace(/[^A-Za-z0-9]/g, '').slice(0, 10) || 'LOAN';
  const period = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `PAYROLL-${code}-I${installmentNo || 0}-${period}`;
}
