/*
 * Monthly statutory schedules built from a payroll run: PAYE (state tax office), pension (each PFA) and
 * NHF (Federal Mortgage Bank). They list what was deducted per employee, ready to send with the
 * remittance. Filing itself stays manual.
 *
 * The employee record has no TIN, RSA PIN, PFA or NHF number yet. Those columns are read from the record
 * when present (under the names below) and are blank otherwise, for HR to fill before sending.
 */

export type ScheduleKind = 'paye' | 'pension' | 'nhf';

export interface Schedule {
  kind: ScheduleKind;
  title: string;
  headers: string[];
  rows: (string | number)[][];
  /** Number of employees on the schedule. */
  count: number;
  /** Amount to remit, in naira. */
  total: number;
  /** Employees with a deduction but no statutory ID on their record. */
  missingIds: number;
}

/**
 * Employer pension as a share of the employee's: the standard 10% employer against 8% employee.
 * No pension rate settings are wired into the app, so this is fixed.
 */
const EMPLOYER_PENSION_RATE = 10;
const EMPLOYEE_PENSION_RATE = 8;

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (v: number) => Math.round(v * 100) / 100;
const firstOf = (record: any, keys: string[]) => {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return '';
};
const nameOf = (v: any) => (v && typeof v === 'object' ? v.name : v) || '';

interface Line { staffId: string; name: string; employee: any; row: any; }

/** The run's rows with each employee's full record (for names and statutory IDs). */
function linesOf(run: any, employeesById: Map<string, any>): Line[] {
  return (run?.employees ?? []).map((row: any) => {
    const id = String(row?.employee?.id ?? row?.employeeId ?? '');
    const employee = { ...(row?.employee || {}), ...(employeesById.get(id) || {}) };
    const name = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || employee.name || `#${id}`;
    return { staffId: id, name, employee, row };
  });
}

export function buildSchedule(kind: ScheduleKind, run: any, employeesById: Map<string, any>): Schedule {
  const lines = linesOf(run, employeesById);

  if (kind === 'paye') {
    const items = lines.filter(l => num(l.row?.deductions?.tax) > 0).sort((a, b) => a.name.localeCompare(b.name));
    const tins = items.map(l => firstOf(l.employee, ['tin', 'taxId', 'taxIdentificationNumber', 'taxNumber']));
    const rows = items.map((l, i) => [
      i + 1, l.staffId, l.name, tins[i],
      money(num(l.row?.grossPay)), money(num(l.row.deductions.tax)),
    ]);
    const total = money(items.reduce((t, l) => t + num(l.row.deductions.tax), 0));
    return {
      kind, title: 'PAYE Schedule',
      headers: ['S/N', 'Staff ID', 'Employee Name', 'TIN', 'Gross Pay (NGN)', 'PAYE Deducted (NGN)'],
      rows: [...rows, ['', '', 'TOTAL', '', money(items.reduce((t, l) => t + num(l.row?.grossPay), 0)), total]],
      count: items.length, total, missingIds: tins.filter(t => !t).length,
    };
  }

  if (kind === 'pension') {
    const items = lines
      .filter(l => num(l.row?.deductions?.pension) > 0)
      .map(l => ({
        ...l,
        rsaPin: firstOf(l.employee, ['rsaPin', 'pensionPin', 'rsaNumber']),
        pfa: firstOf(l.employee, ['pfa', 'pfaName', 'pensionFundAdministrator']) || nameOf(l.employee.pensionFundAdministrator),
      }))
      // Grouped by PFA: each administrator gets its own remittance.
      .sort((a, b) => a.pfa.localeCompare(b.pfa) || a.name.localeCompare(b.name));
    let employeeTotal = 0, employerTotal = 0;
    const rows = items.map((l, i) => {
      const employeeShare = money(num(l.row.deductions.pension));
      const employerShare = money(employeeShare * EMPLOYER_PENSION_RATE / EMPLOYEE_PENSION_RATE);
      employeeTotal += employeeShare; employerTotal += employerShare;
      return [i + 1, l.staffId, l.name, l.rsaPin, l.pfa, employeeShare, employerShare, money(employeeShare + employerShare)];
    });
    const total = money(employeeTotal + employerTotal);
    return {
      kind, title: 'Pension Schedule',
      headers: ['S/N', 'Staff ID', 'Employee Name', 'RSA PIN', 'PFA',
        `Employee Contribution ${EMPLOYEE_PENSION_RATE}% (NGN)`, `Employer Contribution ${EMPLOYER_PENSION_RATE}% (NGN)`, 'Total (NGN)'],
      rows: [...rows, ['', '', 'TOTAL', '', '', money(employeeTotal), money(employerTotal), total]],
      count: items.length, total, missingIds: items.filter(l => !l.rsaPin || !l.pfa).length,
    };
  }

  const items = lines.filter(l => num(l.row?.deductions?.nhf) > 0).sort((a, b) => a.name.localeCompare(b.name));
  const nhfNumbers = items.map(l => firstOf(l.employee, ['nhfNumber', 'nhfNo', 'nhfId']));
  const rows = items.map((l, i) => [
    i + 1, l.staffId, l.name, nhfNumbers[i], money(num(l.row?.basePay)), money(num(l.row.deductions.nhf)),
  ]);
  const total = money(items.reduce((t, l) => t + num(l.row.deductions.nhf), 0));
  return {
    kind, title: 'NHF Schedule',
    headers: ['S/N', 'Staff ID', 'Employee Name', 'NHF Number', 'Basic Pay (NGN)', 'NHF Deducted (NGN)'],
    rows: [...rows, ['', '', 'TOTAL', '', money(items.reduce((t, l) => t + num(l.row?.basePay), 0)), total]],
    count: items.length, total, missingIds: nhfNumbers.filter(n => !n).length,
  };
}

/** CSV text, with every cell quoted so names and PFAs containing commas stay in one column. */
export function scheduleToCsv(schedule: Schedule): string {
  const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [schedule.headers, ...schedule.rows].map(r => r.map(cell).join(',')).join('\r\n');
}
