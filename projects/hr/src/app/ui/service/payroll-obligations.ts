/*
 * What payroll takes from each employee's salary for loans and cooperatives in a given month:
 * advance loan repayments, cooperative loan repayments and cooperative group contributions.
 *
 * Plain functions with no Angular or HTTP, so the payroll screen and the local dev mock work the
 * amounts out the same way. The backend's payroll generation should follow the same rules:
 *
 *  Loans (advance and cooperative), only once disbursed and still being repaid:
 *   1. With a repayment schedule: the unpaid part of the installment(s) due in the payroll month.
 *      The schedule already starts at the repayment start date the employee chose.
 *   2. Without one: nothing before the repayment start date's month (e.g. borrowed in May, chose
 *      August: nothing until August); from then on the monthly repayment, never more than what is
 *      still owed, until the total repayable is paid.
 *  Cooperative contributions: each ACTIVE group membership's monthly contribution, from the month
 *  the membership became active.
 */

export type ObligationKind = 'ADVANCE_LOAN' | 'COOPERATIVE_LOAN' | 'COOPERATIVE_CONTRIBUTION';
/**
 * DEDUCT: taken this month · NOT_STARTED: repayment starts later · REPAID: nothing left to pay ·
 * TERM_ENDED: the repayment period is over but the loan still shows a balance (repayments probably
 * weren't recorded against it): nothing is taken automatically, HR should check the loan.
 */
export type ObligationStatus = 'DEDUCT' | 'NOT_STARTED' | 'REPAID' | 'TERM_ENDED';

export interface PayrollObligation {
  kind: ObligationKind;
  /** Loan code, or the cooperative group's name for a contribution. */
  reference: string;
  /** Cooperative group the loan or contribution belongs to. */
  groupName?: string;
  /** Loans: amount borrowed plus interest. */
  totalRepayable?: number;
  /** Loans: what is still owed before this month's deduction. */
  outstanding?: number;
  /** The regular monthly amount. */
  monthlyAmount: number;
  /** What comes off salary in the payroll month. */
  thisMonth: number;
  /** First month of deductions, yyyy-MM-dd. */
  startsOn?: string;
  status: ObligationStatus;
}

export interface EmployeeObligations {
  employeeId: string;
  items: PayrollObligation[];
  /** Advance loan repayments this month. */
  advances: number;
  /** Cooperative loan repayments plus contributions this month. */
  cooperatives: number;
  total: number;
}

export interface ObligationSources {
  advanceLoans: any[];
  cooperativeLoans: any[];
  cooperativeMembers: any[];
  cooperativeMemberships: any[];
  cooperativeGroups: any[];
}

/** Loans in these states are being repaid; anything else (pending, rejected, completed…) is not. */
const REPAYING_STATUSES = ['ACTIVE', 'DISBURSED', 'OVERDUE', 'SKIPPED'];

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (v: number) => Math.round(v * 100) / 100;

/** Month index (year * 12 + month0) of a date-like value, or null. Handles [y, m, d] arrays from the API. */
function monthIndex(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const date = Array.isArray(value) ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1) : new Date(value);
  return isNaN(date.getTime()) ? null : date.getFullYear() * 12 + date.getMonth();
}

function isoDay(value: any): string | undefined {
  if (!value) return undefined;
  const date = Array.isArray(value) ? new Date(value[0], (value[1] || 1) - 1, value[2] || 1) : new Date(value);
  if (isNaN(date.getTime())) return undefined;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Amounts for one loan in the payroll month. */
function loanObligation(loan: any, kind: ObligationKind, payrollMonth: number, groupName?: string): PayrollObligation | null {
  if (!REPAYING_STATUSES.includes(String(loan?.status || '').toUpperCase())) return null;

  const totalRepayable = num(loan.totalRepayable ?? loan.totalRepayment)
    || num(loan.repaymentAmount) * num(loan.repaymentTime ?? loan.repaymentPeriodMonths ?? loan.duration);
  const outstanding = Math.max(0, num(loan.outstandingBalance ?? loan.currentBalance) || (totalRepayable - num(loan.totalPaid)));
  const monthlyAmount = num(loan.repaymentAmount)
    || (totalRepayable && num(loan.repaymentTime) ? totalRepayable / num(loan.repaymentTime) : 0);
  const schedule: any[] = Array.isArray(loan.repaymentSchedule) ? loan.repaymentSchedule : [];
  const firstDue = schedule.map(s => s?.dueDate).filter(Boolean).sort()[0];
  const startsOn = isoDay(loan.repaymentStartDate ?? firstDue ?? loan.nextPaymentDueDate);
  const base = {
    kind, reference: String(loan.loanCode || `#${loan.id}`), groupName,
    totalRepayable: money(totalRepayable), outstanding: money(outstanding), monthlyAmount: money(monthlyAmount), startsOn,
  };

  if (outstanding <= 0) return { ...base, thisMonth: 0, status: 'REPAID' };

  const start = monthIndex(startsOn);
  if (start !== null && payrollMonth < start) return { ...base, thisMonth: 0, status: 'NOT_STARTED' };

  let thisMonth: number;
  if (schedule.length) {
    thisMonth = schedule
      .filter(s => monthIndex(s?.dueDate) === payrollMonth && String(s?.status || '').toUpperCase() !== 'PAID')
      .reduce((sum, s) => sum + Math.max(0, num(s.totalAmount) - num(s.paidAmount)), 0);
    const lastDue = Math.max(...schedule.map(s => monthIndex(s?.dueDate) ?? -Infinity));
    if (thisMonth <= 0 && payrollMonth > lastDue) return { ...base, thisMonth: 0, status: 'TERM_ENDED' };
  } else {
    // No schedule: one repayment a month for the repayment period, counted from the start month.
    const term = num(loan.repaymentTime ?? loan.repaymentPeriodMonths ?? loan.duration);
    if (start !== null && term > 0 && payrollMonth >= start + term) return { ...base, thisMonth: 0, status: 'TERM_ENDED' };
    thisMonth = monthlyAmount;
  }
  thisMonth = money(Math.min(thisMonth, outstanding));
  return { ...base, thisMonth, status: thisMonth > 0 ? 'DEDUCT' : 'REPAID' };
}

/**
 * Everything payroll should take from each employee in a month (1–12), keyed by employee id.
 * Employees with nothing to pay are left out.
 */
export function computePayrollObligations(sources: ObligationSources, month: number, year: number): Map<string, EmployeeObligations> {
  const payrollMonth = year * 12 + (month - 1);
  const result = new Map<string, EmployeeObligations>();
  const add = (employeeId: any, item: PayrollObligation | null) => {
    if (!item || employeeId === undefined || employeeId === null || employeeId === '') return;
    const key = String(employeeId);
    const entry = result.get(key) ?? { employeeId: key, items: [], advances: 0, cooperatives: 0, total: 0 };
    entry.items.push(item);
    if (item.kind === 'ADVANCE_LOAN') entry.advances = money(entry.advances + item.thisMonth);
    else entry.cooperatives = money(entry.cooperatives + item.thisMonth);
    entry.total = money(entry.advances + entry.cooperatives);
    result.set(key, entry);
  };

  // A cooperative member has its own id; loans and memberships point at that, not at the employee.
  const employeeIdByMember = new Map<string, string>();
  for (const member of sources.cooperativeMembers || []) {
    const employeeId = member?.employeeId ?? member?.employee?.id;
    if (employeeId === undefined || employeeId === null) continue;
    for (const id of [member.id, member.memberId]) {
      if (id !== undefined && id !== null) employeeIdByMember.set(String(id), String(employeeId));
    }
  }
  const groupName = (groupId: any) =>
    (sources.cooperativeGroups || []).find(g => String(g?.id) === String(groupId))?.name;
  const groupOf = (groupId: any) => (sources.cooperativeGroups || []).find(g => String(g?.id) === String(groupId));

  for (const loan of sources.advanceLoans || []) {
    add(loan?.employee?.id ?? loan?.employeeId, loanObligation(loan, 'ADVANCE_LOAN', payrollMonth));
  }

  for (const loan of sources.cooperativeLoans || []) {
    const memberId = loan?.cooperativeMemberId ?? loan?.memberId;
    const groupId = loan?.cooperativeGroupId ?? loan?.groupId;
    add(employeeIdByMember.get(String(memberId)), loanObligation(loan, 'COOPERATIVE_LOAN', payrollMonth, groupName(groupId)));
  }

  for (const membership of sources.cooperativeMemberships || []) {
    if (String(membership?.status || '').toUpperCase() !== 'ACTIVE') continue;
    const groupId = membership.groupId ?? membership.cooperativeGroupId;
    const group = groupOf(groupId);
    const monthlyAmount = money(num(membership.monthlyContributionAmount) || num(group?.monthlyContributionAmount ?? group?.monthlyAmount));
    if (monthlyAmount <= 0) continue;
    const startsOn = isoDay(membership.activatedAt ?? membership.approvedAt ?? membership.joinedAt);
    const start = monthIndex(startsOn);
    const started = start === null || payrollMonth >= start;
    add(employeeIdByMember.get(String(membership.memberId ?? membership.cooperativeMemberId)), {
      kind: 'COOPERATIVE_CONTRIBUTION',
      reference: group?.name || `Group #${groupId}`,
      groupName: group?.name,
      monthlyAmount,
      thisMonth: started ? monthlyAmount : 0,
      startsOn,
      status: started ? 'DEDUCT' : 'NOT_STARTED',
    });
  }

  return result;
}

export const OBLIGATION_KIND_LABEL: Record<ObligationKind, string> = {
  ADVANCE_LOAN: 'Advance loan',
  COOPERATIVE_LOAN: 'Cooperative loan',
  COOPERATIVE_CONTRIBUTION: 'Cooperative contribution',
};
