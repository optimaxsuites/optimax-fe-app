/*
 * An employee's regular monthly pay from their level's salary structure (GET /hr/salaries/getSalaryByLevel),
 * worked out one way for every screen that shows it: Employee Management, the employee profile, HR
 * letters and the employment letter.
 *
 *   Base     = the record's base salary
 *   Gross    = base + every allowance line
 *   Net      = gross − every deduction line on the structure
 *
 * Amounts are used exactly as stored. They are monthly naira figures, already worked out from the
 * percentages in settings, and the same figures payroll pays (a run's basePay is the record's
 * baseSalary). They are not converted here: not by the salary input mode, and not as percentages.
 *
 * Bonus and overtime lines on a salary structure are not part of regular monthly pay (bonuses are paid
 * when awarded; an overtime line is a rate, not an amount), so they are listed but never added.
 * Statutory items the structure doesn't list (PAYE) and one-offs (ad-hocs, fines, loans) are only known
 * once payroll runs: the payroll run's own figures are the employee's real take-home.
 */
import { pickSalaryRecordForLevel } from './loan/level-salary.util';

export interface SalaryLine {
  /** Allowance/deduction/bonus/overtime type id on the record, for looking up its name. */
  typeId: any;
  /** Monthly naira amount, as stored. */
  amount: number;
  raw: any;
}

export interface SalaryStructure {
  recordId?: number;
  baseSalary: number;
  allowances: SalaryLine[];
  allowanceTotal: number;
  grossPay: number;
  deductions: SalaryLine[];
  deductionTotal: number;
  netPay: number;
  /** Listed for information; not added to monthly pay. */
  bonuses: SalaryLine[];
  overtime: SalaryLine[];
}

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const money = (v: number) => Math.round(v * 100) / 100;

/**
 * The monthly structure from a level's salary records (or a single record). Of several records the
 * most complete, then newest, is used, the same choice loans make. Null when there is no record.
 */
export function resolveSalaryStructure(records: any): SalaryStructure | null {
  const record = Array.isArray(records) ? pickSalaryRecordForLevel(records) : records;
  if (!record || typeof record !== 'object') return null;

  const baseSalary = money(num(record.baseSalary));

  const lineOf = (item: any, typeKeys: string[], amountKeys: string[] = ['amount', 'value']): SalaryLine => ({
    typeId: typeKeys.map(k => item?.[k]).find(v => v !== undefined && v !== null),
    amount: money(num(amountKeys.map(k => item?.[k]).find(v => v !== undefined && v !== null))),
    raw: item,
  });
  const linesOf = (items: any, typeKeys: string[], amountKeys?: string[]) =>
    (Array.isArray(items) ? items : []).filter(i => i != null).map(i => lineOf(i, typeKeys, amountKeys));

  const allowances = linesOf(record.allowance ?? record.allowances, ['allowanceTypeId', 'typeId']);
  const deductions = linesOf(record.deductions ?? record.deduction, ['deductionsTypeId', 'deductionTypeId', 'typeId']);
  const bonuses = linesOf(record.bonus ?? record.bonuses, ['bonusTypeId', 'typeId']);
  const overtime = linesOf(record.overtime, ['overtimeTypeId', 'typeId'], ['amount', 'rate', 'value']);

  const allowanceTotal = money(allowances.reduce((t, l) => t + l.amount, 0));
  const deductionTotal = money(deductions.reduce((t, l) => t + l.amount, 0));
  const grossPay = money(baseSalary + allowanceTotal);

  return {
    recordId: record.id,
    baseSalary, allowances, allowanceTotal, grossPay,
    deductions, deductionTotal, netPay: money(grossPay - deductionTotal),
    bonuses, overtime,
  };
}

/** The employee id on a payroll run row. Rows nest the employee, so `row.id` is the row's own id. */
export function payrollRowEmployeeId(row: any): string {
  return String(row?.employee?.id ?? row?.employeeId ?? '');
}
