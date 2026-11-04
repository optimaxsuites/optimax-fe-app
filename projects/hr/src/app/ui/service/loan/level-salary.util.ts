/** A salary record from GET /x/api/v2/hr/salaries (one per level; some levels have more than one). */
export interface LevelSalaryRecord {
  id?: number;
  baseSalary?: number;
  allowance?: Array<{ amount?: number }>;
  deductions?: Array<{ amount?: number; calculationType?: string }>;
  levelId?: number;
}

export type LevelSalaryResolution =
  | { status: 'ok'; monthlySalary: number; salaryRecordId?: number }
  /** No salary record exists for the level. */
  | { status: 'missing' }
  /** A record exists but the result isn't usable (e.g. deductions exceed pay). */
  | { status: 'invalid'; computedSalary: number; salaryRecordId?: number };

/** The level id on an employee from GET /x/api/v2/hr/employees/{id} (`level.id`), or 0. */
export function resolveEmployeeLevelId(employee: any): number {
  const levelId = Number(employee?.level?.id ?? employee?.levelId ?? 0);
  return Number.isFinite(levelId) && levelId > 0 ? levelId : 0;
}

function componentCount(record: LevelSalaryRecord): number {
  return (record.allowance?.length || 0) + (record.deductions?.length || 0);
}

/**
 * Of a level's records, the most complete (most allowance/deduction lines), then the newest.
 * Undefined when there are none. Anything showing a level's pay should use this so it matches loans.
 */
export function pickSalaryRecordForLevel<T extends LevelSalaryRecord>(records: T[]): T | undefined {
  return [...(records || [])].sort((a, b) =>
    componentCount(b) - componentCount(a) || Number(b.id || 0) - Number(a.id || 0)
  )[0];
}

/**
 * Base salary for a level (no allowances/deductions), using the same record choice as
 * resolveMonthlySalaryForLevel. Used where rules compare against base pay, e.g. a cooperative
 * group's minimum eligible salary. 0 when the level has no record.
 */
export function resolveBaseSalaryForLevel(levelId: number, salaries: LevelSalaryRecord[]): number {
  const candidates = (salaries || []).filter((record) => Number(record?.levelId) === Number(levelId));
  if (!levelId || candidates.length === 0) {
    return 0;
  }
  return Number(pickSalaryRecordForLevel(candidates)!.baseSalary || 0);
}

/**
 * Monthly take-home for a level: base salary + allowances − deductions (bonuses are not monthly pay,
 * so they're excluded). Percentage deductions are taken from the base salary.
 *
 * If a level has several records, the most complete one (most allowance/deduction lines) is used,
 * then the newest (highest id). A result of zero or less is reported as `invalid`, never guessed.
 */
export function resolveMonthlySalaryForLevel(levelId: number, salaries: LevelSalaryRecord[]): LevelSalaryResolution {
  const candidates = (salaries || []).filter((record) => Number(record?.levelId) === Number(levelId));
  if (!levelId || candidates.length === 0) {
    return { status: 'missing' };
  }

  const record = pickSalaryRecordForLevel(candidates)!;

  const base = Number(record.baseSalary || 0);
  const allowances = (record.allowance || []).reduce((sum, item) => sum + Number(item?.amount || 0), 0);
  const deductions = (record.deductions || []).reduce((sum, item) => {
    const amount = Number(item?.amount || 0);
    const isPercentage = String(item?.calculationType || '').toUpperCase().includes('PERCENT');
    return sum + (isPercentage ? (base * amount) / 100 : amount);
  }, 0);
  const monthlySalary = Number((base + allowances - deductions).toFixed(2));

  return monthlySalary > 0
    ? { status: 'ok', monthlySalary, salaryRecordId: record.id }
    : { status: 'invalid', computedSalary: monthlySalary, salaryRecordId: record.id };
}
