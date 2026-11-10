import { payslipFigures } from './payslip.util';

describe('payslipFigures', () => {
  // The November 2026 run row from the bug report: the row carries one ₦12,000 allowance, but gross is ₦288,000.
  const november = {
    basePay: 120000,
    allowances: { id: 1, amount: 12000 },
    bonuses: [{ amount: 120000 }],
    overtimePay: 0,
    grossPay: 288000,
    deductions: { tax: 0, pension: 28800, nhf: 17280, healthInsurance: 28800, advances: 218089.46, cooperatives: 0, other: 28200, details: [] },
    totalDeductions: 321169.46,
    netPayable: -33169.46,
  };

  it('shows the gross the lines leave out as unitemised earnings', () => {
    expect(payslipFigures(november).unitemisedEarnings).toBe(36000);
  });

  it('flags a payslip whose deductions exceed gross as not payable', () => {
    const f = payslipFigures(november);
    expect(f.notPayable).toBeTrue();
    expect(f.netPay).toBe(-33169.46);
    expect(f.unitemisedDeductions).toBe(0);
  });

  it('lists named deduction lines in place of "Other"', () => {
    const f = payslipFigures({ ...november, deductions: { ...november.deductions, details: [{ name: 'Late fine', amount: 28200 }] } });
    expect(f.deductionLines.map(l => l.label)).toContain('Late fine');
    expect(f.deductionLines.map(l => l.label)).not.toContain('Other');
  });

  it('keeps a server net of zero instead of recomputing it', () => {
    expect(payslipFigures({ basePay: 1000, grossPay: 1000, totalDeductions: 1000, netPayable: 0 }).notPayable).toBeTrue();
  });

  it('reports deductions the lines leave out', () => {
    expect(payslipFigures({ basePay: 1000, grossPay: 1000, deductions: { tax: 100 }, totalDeductions: 150, netPayable: 850 }).unitemisedDeductions).toBe(50);
  });
});
