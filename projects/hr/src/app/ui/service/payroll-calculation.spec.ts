import { resolveSalaryStructure } from './payroll-calculation';

describe('resolveSalaryStructure', () => {
  const record = {
    id: 7,
    baseSalary: 120000,
    allowance: [
      { allowanceTypeId: 1, amount: 12000 }, { allowanceTypeId: 2, amount: 18000 },
      { allowanceTypeId: 3, amount: 6000 }, { allowanceTypeId: 4, amount: 2400 }, { allowanceTypeId: 5, amount: 6000 },
    ],
    deductions: [
      { deductionsTypeId: 1, amount: 9600 }, { deductionsTypeId: 2, amount: 3000 },
      { deductionsTypeId: 3, amount: 1200 }, { deductionsTypeId: 4, amount: 14400 },
    ],
    bonus: [{ bonusTypeId: 1, amount: 50000 }],
    overtime: [{ overtimeTypeId: 1, rate: 1500 }],
  };

  it('gross is base + allowances; net is gross − deductions; bonus and overtime are not monthly pay', () => {
    const s = resolveSalaryStructure([record])!;
    expect(s.baseSalary).toBe(120000);
    expect(s.allowanceTotal).toBe(44400);
    expect(s.grossPay).toBe(164400);
    expect(s.deductionTotal).toBe(28200);
    expect(s.netPay).toBe(136200);
    expect(s.bonuses.length).toBe(1);
    expect(s.overtime[0].amount).toBe(1500);
  });

  it('takes a percentage deduction as a share of base salary', () => {
    const s = resolveSalaryStructure({ baseSalary: 100000, allowance: [], deductions: [{ amount: 8, calculationType: 'PERCENTAGE' }] })!;
    expect(s.deductions[0].amount).toBe(8000);
    expect(s.deductions[0].percent).toBe(8);
    expect(s.netPay).toBe(92000);
  });

  it('divides yearly records by 12', () => {
    const s = resolveSalaryStructure({ baseSalary: 1200000, allowance: [{ amount: 120000 }], deductions: [{ amount: 12000 }] }, 'yearly')!;
    expect(s.baseSalary).toBe(100000);
    expect(s.grossPay).toBe(110000);
    expect(s.netPay).toBe(109000);
  });

  it('uses the most complete record of a level, like loans do', () => {
    const sparse = { id: 9, baseSalary: 999, allowance: [], deductions: [] };
    expect(resolveSalaryStructure([sparse, record])!.recordId).toBe(7);
  });

  it('is null when the level has no record', () => {
    expect(resolveSalaryStructure([])).toBeNull();
    expect(resolveSalaryStructure(undefined)).toBeNull();
  });
});
