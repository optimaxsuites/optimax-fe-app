/*
 * One payslip's figures and its email, shared by the payslip page, the employee's payslip list and the
 * payroll run's "email payslips" step, so the email always matches what the employee sees in the app.
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface PayslipFigures {
  basePay: number;
  allowanceTotal: number;
  overtimePay: number;
  bonusTotal: number;
  grossPay: number;
  /**
   * Gross pay minus the earnings lines above (base, allowances, overtime, bonuses). Not zero when the
   * run's gross includes earnings the row doesn't itemise, e.g. allowances beyond the one the row carries.
   */
  unitemisedEarnings: number;
  deductionLines: { label: string; amount: number }[];
  totalDeductions: number;
  /** Total deductions minus the deduction lines. Not zero when the run's total includes unlisted items. */
  unitemisedDeductions: number;
  netPay: number;
  /** Net pay is zero or negative: deductions exceed gross, so this payslip can't be paid as it stands. */
  notPayable: boolean;
}

const GAP_TOLERANCE = 0.5;

/** A run row's pay figures. Server totals win; parts are summed only when a total is missing. */
export function payslipFigures(slip: any): PayslipFigures {
  const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const a = slip?.allowances;
  const allowanceTotal = !a ? 0
    : typeof a.amount === 'number' ? a.amount
    : Object.values(a).reduce((t: number, v: any) => t + num(v), 0) as number;
  const bonusTotal = (slip?.bonuses || []).reduce((t: number, b: any) => t + num(b?.amount), 0);
  const overtimePay = num(slip?.overtimePay);
  const basePay = num(slip?.basePay);
  const grossPay = typeof slip?.grossPay === 'number' ? slip.grossPay : basePay + allowanceTotal + bonusTotal + overtimePay;

  const d = slip?.deductions || {};
  const fixed = [
    { label: 'Tax (PAYE)',       amount: num(d.tax) },
    { label: 'Pension',          amount: num(d.pension) },
    { label: 'NHF',              amount: num(d.nhf) },
    { label: 'Health Insurance', amount: num(d.healthInsurance) },
    { label: 'Loan / Advances',  amount: num(d.advances) },
    { label: 'Cooperatives',     amount: num(d.cooperatives) },
  ];
  // Named lines (ad-hocs, queries, fines…) itemise "Other", so when there are any they stand in for it.
  const details: any[] = Array.isArray(d.details) ? d.details.filter((x: any) => x != null) : [];
  const deductionLines = [
    ...fixed,
    ...(details.length
      ? details.map((x) => ({ label: x?.name || x?.description || 'Deduction', amount: num(x?.amount) }))
      : [{ label: 'Other', amount: num(d.other) }]),
  ].filter((l) => l.amount > 0);
  const lineSum = deductionLines.reduce((t, l) => t + l.amount, 0);
  const totalDeductions = typeof slip?.totalDeductions === 'number' ? slip.totalDeductions : lineSum;
  const netPay = typeof slip?.netPayable === 'number' ? slip.netPayable : grossPay - totalDeductions;

  const gap = (v: number) => (Math.abs(v) > GAP_TOLERANCE ? Math.round(v * 100) / 100 : 0);
  return {
    basePay, allowanceTotal, overtimePay, bonusTotal, grossPay,
    unitemisedEarnings: gap(grossPay - (basePay + allowanceTotal + overtimePay + bonusTotal)),
    deductionLines, totalDeductions,
    unitemisedDeductions: gap(totalDeductions - lineSum),
    netPay,
    notPayable: netPay <= 0,
  };
}

export function periodLabel(month: any, year: any): string {
  return `${MONTH_NAMES[(Number(month) || 1) - 1] || ''} ${year || ''}`.trim();
}

/**
 * A run row as the payslip page shows it: the row's figures plus the employee's name, department,
 * level and bank. `employee` is the full employee record when the caller has it; the row's own nested
 * employee is used otherwise.
 */
export function toPayslip(row: any, run: any, employee?: any): any {
  const e = employee || row?.employee || {};
  const nameOf = (v: any) => (v && typeof v === 'object' ? v.name : v) || undefined;
  return {
    ...row,
    empId: e.id ?? row?.employeeId,
    name: `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || e.name || row?.employeeName,
    department: nameOf(e.department),
    level: nameOf(e.level),
    type: nameOf(e.jobType),
    bank: e.bankName ?? e.bank,
    accountNumber: e.accountNumber,
    month: run?.month ?? row?.month,
    year: run?.year ?? row?.year,
    runStatus: String(run?.payrollApprovalInstance?.status || run?.status || row?.runStatus || 'COMPLETED').toUpperCase(),
  };
}

/** Where an employee's payslip email goes: work email first, as staff mail goes there. */
export function payslipEmailAddress(employee: any): string {
  return String(employee?.workEmail || employee?.email || '').trim();
}

const escapeHtml = (value: any) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const formatNaira = (value: number) =>
  `₦${(Number.isFinite(value) ? value : 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Shows only the last four digits of an account number in email. */
function maskAccount(accountNumber: any): string {
  const digits = String(accountNumber ?? '').replace(/\D/g, '');
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : digits;
}

/**
 * The payslip email body: inline styles and tables only, since mail clients drop stylesheets.
 * The full account number is left out; the email can be forwarded and sits in inboxes for years.
 */
export function buildPayslipEmailHtml(slip: any, companyName: string, payslipsUrl?: string): string {
  const f = payslipFigures(slip);
  const period = periodLabel(slip?.month, slip?.year);
  const firstName = escapeHtml(String(slip?.name || '').split(' ')[0] || 'there');
  const row = (label: string, amount: number, bold = false) => `
        <tr>
          <td style="padding:6px 0;color:#334155;${bold ? 'font-weight:700;' : ''}">${escapeHtml(label)}</td>
          <td style="padding:6px 0;text-align:right;color:#0f172a;${bold ? 'font-weight:700;' : ''}">${formatNaira(amount)}</td>
        </tr>`;
  const earnings = [
    row('Basic Pay', f.basePay),
    f.allowanceTotal ? row('Allowances', f.allowanceTotal) : '',
    f.overtimePay ? row('Overtime', f.overtimePay) : '',
    f.bonusTotal ? row('Bonuses', f.bonusTotal) : '',
    f.unitemisedEarnings ? row('Other earnings (not itemised)', f.unitemisedEarnings) : '',
    row('Gross Pay', f.grossPay, true),
  ].join('');
  const deductions = [
    ...f.deductionLines.map((l) => row(l.label, l.amount)),
    f.unitemisedDeductions ? row('Other deductions (not itemised)', f.unitemisedDeductions) : '',
    row('Total Deductions', f.totalDeductions, true),
  ].join('');
  const info = [
    ['Employee', slip?.name],
    ['Employee ID', slip?.empId ? `#${slip.empId}` : ''],
    ['Department', slip?.department],
    ['Level', slip?.level],
    ['Bank', [slip?.bank, maskAccount(slip?.accountNumber)].filter(Boolean).join(' · ')],
  ].filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:3px 0;color:#64748b;width:120px;">${k}</td><td style="padding:3px 0;color:#0f172a;">${escapeHtml(v)}</td></tr>`)
    .join('');
  const link = payslipsUrl
    ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(payslipsUrl)}" style="display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">View and download your payslip</a></p>`
    : '';

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:#1e3a8a;color:#ffffff;padding:20px 24px;">
      <div style="font-size:18px;font-weight:700;">${escapeHtml(companyName)}</div>
      <div style="opacity:.85;margin-top:4px;">Payslip · ${escapeHtml(period)}</div>
    </td></tr>
    <tr><td style="padding:24px;">
      <p style="margin:0 0 16px;color:#0f172a;">Hello ${firstName},</p>
      <p style="margin:0 0 20px;color:#334155;">Your payslip for ${escapeHtml(period)} is below.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;font-size:13px;">${info}</table>
      <div style="font-weight:700;color:#1e3a8a;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:4px;">Earnings</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">${earnings}</table>
      <div style="font-weight:700;color:#1e3a8a;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:4px;">Deductions</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">${deductions}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border-radius:6px;">
        <tr>
          <td style="padding:14px 16px;color:#065f46;font-weight:700;">Net Pay</td>
          <td style="padding:14px 16px;text-align:right;color:#065f46;font-size:18px;font-weight:700;">${formatNaira(f.netPay)}</td>
        </tr>
      </table>
      ${link}
      <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">This payslip is confidential. If anything looks wrong, contact HR. This is an automated message; please do not reply.</p>
    </td></tr>
  </table>
</body></html>`;
}
