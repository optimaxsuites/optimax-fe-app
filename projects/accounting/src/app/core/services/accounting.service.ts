/**
 * accounting.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all accounting report data.
 *
 * Architecture:
 *   This service owns the selected period (BehaviorSubject), fetches raw data
 *   from the backend API (or seed data in dev), assembles DTOs, and exposes
 *   typed Observables consumed by report components.
 *
 * Data flow:
 *   Backend API → Raw API Response → buildXxx() → Typed DTO → Component
 *
 * Rules enforced here:
 *   1. Components NEVER build their own financial data.
 *   2. No hardcoded values live in components — all seed/mock data lives here
 *      and is replaced by HttpClient calls when the backend is ready.
 *   3. Every public method returns an Observable<TDto> so components stay
 *      reactive and automatically refresh when the period changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import {
  // Enums
  AccountType,
  CashFlowCategory,
  FilingStatus,
  JournalEntryStatus,
  ReconciliationStatus,
  SourceModule,
  TaxType,
  TransactionReviewStatus,

  // Primitive DTOs
  AccountDTO,
  AccountingTransactionDTO,
  BankReconciliationDTO,
  BankTransactionDTO,
  JournalEntryDTO,
  JournalEntryLineDTO,

  // Report DTOs
  AccountBalanceDTO,
  BalanceSheetReportDTO,
  CashFlowLineItemDTO,
  CashFlowReconciliationDTO,
  CashFlowReportDTO,
  CashFlowSummaryDTO,
  CitSummaryDTO,
  DashboardMetricsDTO,
  DeferredTaxDTO,
  ExpenseDistributionDTO,
  FilingRecordDTO,
  FinancialLineItemDTO,
  IncomeStatementReportDTO,
  IncomeStatementTotalsDTO,
  InputVatRecoverabilityDTO,
  MonthlyTaxTrendDTO,
  MonthlyTrendDTO,
  PayeEmployeeDTO,
  PeriodComparisonDTO,
  PitTaxBandDTO,
  ReportContextDTO,
  ReportPeriodType,
  SavedReportSnapshotDTO,
  TaxComplianceCheckDTO,
  TaxLineItemDTO,
  TaxSummaryReportDTO,
  VatSummaryDTO,
  WhtSummaryDTO,
  WorkingCapitalChangeDTO,
  PeriodComparisonSummaryDTO,
  TaxCashFlowBreakdownDTO,
} from '../dtos/report.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Nigerian tax rate constants (FIRS / TETFUND / NASENI)
// ─────────────────────────────────────────────────────────────────────────────
const VAT_RATE         = 0.075;   // VATA 2019 (as amended by Finance Act 2020)
const CIT_RATE_LARGE   = 0.30;    // CITA — large company (turnover ≥ ₦100M)
const EDUCATION_TAX    = 0.025;   // TETFund Act 2011
const NASENI_LEVY      = 0.0025;  // Finance Act 2023

// ─────────────────────────────────────────────────────────────────────────────
// Seed Data — replace with HttpClient calls when backend is ready
// ─────────────────────────────────────────────────────────────────────────────
// All monetary amounts in NGN (Naira).
// Tuple shape: [name, actual, previous, budget, priorYear]
type LineItemTuple = [string, number, number, number, number];

const RAW_REVENUE: LineItemTuple[] = [
  ['Product Sales',       3_125_000, 2_812_500, 3_000_000, 2_500_000],
  ['Service Revenue',       375_000,   337_500,   360_000,   300_000],
  ['Subscription Income',   345_000,   310_500,   330_000,   275_000],
  ['Other Revenue',          35_000,    31_500,    34_000,    28_000],
];
const RAW_COGS: LineItemTuple[] = [
  ['Cost of Products Sold',  -262_500, -236_250, -250_000, -210_000],
  ['Direct Labor',           -235_000, -211_500, -225_000, -190_000],
  ['Manufacturing Overhead', -215_000, -193_500, -205_000, -180_000],
];
const RAW_ADMIN: LineItemTuple[] = [
  ['Office Supplies',        -262_500, -236_250, -250_000, -210_000],
  ['Professional Services',  -235_000, -211_500, -250_000, -200_000],
  ['Insurance',              -215_000, -193_500, -250_000, -180_000],
];
const RAW_SALARIES: LineItemTuple[] = [
  ['Salaries & Wages',       -157_600, -141_840, -150_000, -130_000],
  ['Employee Benefits',      -157_600, -141_840, -150_000, -130_000],
  ['Payroll Taxes',          -157_600, -141_840, -150_000, -130_000],
  ['Training & Development', -157_600, -141_840, -150_000, -130_000],
];
const RAW_MAINTENANCE: LineItemTuple[] = [
  ['Building Maintenance',  -16_000, -14_400, -15_000, -12_000],
  ['Repairs',               -16_000, -14_400, -15_000, -12_000],
  ['Equipment Maintenance', -16_000, -14_400, -15_000, -12_000],
];
const RAW_LOGISTICS: LineItemTuple[] = [
  ['Shipping & Freight',     -19_000, -17_100, -18_000, -15_000],
  ['Distribution Costs',     -19_000, -17_100, -18_000, -15_000],
  ['Travel & Entertainment', -19_000, -17_100, -18_000, -15_000],
];
const RAW_OTHER_OPEX: LineItemTuple[] = [
  ['Rent',                        -214_200, -192_780, -200_000, -180_000],
  ['Marketing & Advertising',     -131_800, -118_620, -120_000, -100_000],
  ['Utilities',                   -131_800, -118_620, -120_000, -100_000],
  ['Depreciation & Amortisation', -131_800, -118_620, -120_000, -100_000], // D&A row
];
const RAW_OTHER_ITEMS: LineItemTuple[] = [
  ['Interest Income',         11_500,  10_350,  10_000,   8_000],
  ['Interest Expense',       -13_200, -11_880, -12_000, -10_000],
  ['Gain on Sale of Assets',  12_800,  11_520,  10_000,   8_000],
];

// D&A is embedded in RAW_OTHER_OPEX[3] — store separately for EBITDA add-back
const DA_AMOUNTS = { actual: 131_800, previous: 118_620, budget: 120_000, priorYear: 100_000 };

const MONTHLY_TREND: MonthlyTrendDTO = {
  periodLabels:   ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  revenueAmounts: [230_000, 235_000, 240_000, 245_000, 248_000, 250_000],
  expenseAmounts: [195_000, 198_000, 200_000, 203_000, 205_000, 207_500],
  profitAmounts:  [ 35_000,  37_000,  40_000,  42_000,  43_000,  42_500],
};

// Balance Sheet seed figures
const RAW_BS_CURRENT_ASSETS = {
  cash: 45_000_000, cashOnHand: 20_000_000,
  regularCheckingAccount: 50_000_000, payrollCheckingAccount: 25_000_000,
  savingsAccount: 35_000_000, accountsReceivable: 75_000_000,
  inventory: 30_000_000, prepaidExpenses: 15_000_000,
};
const RAW_BS_NONCURRENT_ASSETS = {
  property: 120_000_000, equipment: 45_000_000,
  investments: 30_000_000, intangibleAssets: 18_000_000,
};
const RAW_BS_CURRENT_LIAB = {
  accountsPayable: 40_000_000, shortTermDebt: 25_000_000,
  accruedExpenses: 15_000_000, vatPayable: 6_375_000,
  whtPayable: 3_500_000, payeTaxPayable: 4_200_000,
};
const RAW_BS_NONCURRENT_LIAB = {
  longTermDebt: 80_000_000, deferredTax: 12_000_000,
  leaseObligations: 18_000_000,
};
const RAW_BS_EQUITY_BASE = { commonStock: 200_000_000, otherComprehensiveIncome: 18_000_000 };

// Cash Flow seed figures
const RAW_CF = {
  grossCustomerReceipts:       17_630_000,
  supplierAndEmployeePayments:-12_200_000,
  inputVatRecoverable:            380_000,
  whtRemitted:                   -400_000,
  citPaid:                     -1_200_000,
  educationTaxPaid:              -250_000,
  capitalExpenditure:          -1_500_000,
  assetDisposalProceeds:          250_000,
  longTermInvestments:           -450_000,
  loanRepayment:                 -500_000,
  dividendsPaid:                 -150_000,
  newBorrowings:                  550_000,
  openingCashBalance:           5_000_000,
  depreciation:                   850_000,
  gainOnDisposal:                       0,
  workingCapitalChanges:         -250_000,
};

// Tax seed figures
const RAW_TAX = {
  vat: { outputVAT: 247_500, inputVAT: 116_250, totalSales: 3_300_000, totalPurchases: 1_550_000 },
  wht: { atFivePercent: 25_000, atTenPercent: 300_000 },
  cit: { annualTurnover: 160_000_000 },
  complianceScore: 78,
  deferredTax: { deductibleDifferences: 5_000_000, taxableDifferences: 8_000_000 },
  inputVatRecoverability: { totalInputVat: 116_250, recoverableInputVat: 93_750, nonRecoverableInputVat: 22_500 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions (pure, no side-effects)
// ─────────────────────────────────────────────────────────────────────────────

function toLineItems(raw: LineItemTuple[]): FinancialLineItemDTO[] {
  return raw.map(([name, actualAmount, previousAmount, budgetAmount, priorYearAmount]) =>
    ({ name, actualAmount, previousAmount, budgetAmount, priorYearAmount }));
}

function sumField(
  items: FinancialLineItemDTO[],
  field: keyof Omit<FinancialLineItemDTO, 'name'>,
): number {
  return items.reduce((acc, item) => acc + item[field], 0);
}

function toPeriodComparison(items: FinancialLineItemDTO[]): PeriodComparisonDTO {
  return {
    actualAmount:   sumField(items, 'actualAmount'),
    previousAmount: sumField(items, 'previousAmount'),
    budgetAmount:   sumField(items, 'budgetAmount'),
    priorYearAmount:sumField(items, 'priorYearAmount'),
  };
}

function addComparisons(
  a: PeriodComparisonDTO,
  b: PeriodComparisonDTO,
): PeriodComparisonDTO {
  return {
    actualAmount:    a.actualAmount    + b.actualAmount,
    previousAmount:  a.previousAmount  + b.previousAmount,
    budgetAmount:    a.budgetAmount    + b.budgetAmount,
    priorYearAmount: a.priorYearAmount + b.priorYearAmount,
  };
}

function pctOf(numerator: number, denominator: number): number {
  return denominator !== 0 ? (numerator / denominator) * 100 : 0;
}

function growthPct(current: number, prior: number): number {
  return prior !== 0 ? ((current - prior) / Math.abs(prior)) * 100 : 0;
}

function floorAtZero(v: number): number { return Math.max(v, 0); }

function buildPeriodComparisonSummary(
  current: number,
  prior: number,
): PeriodComparisonSummaryDTO {
  const changeAmount     = current - prior;
  const changePercentage = prior !== 0 ? (changeAmount / Math.abs(prior)) * 100 : 0;
  return { currentPeriodAmount: current, priorPeriodAmount: prior, changeAmount, changePercentage };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart of Accounts (static mock – replace with API call)
// ─────────────────────────────────────────────────────────────────────────────

const CHART_OF_ACCOUNTS: AccountDTO[] = [
  { id: 'acc-cash',              code: '1010', name: 'Cash and Cash Equivalents',     type: AccountType.ASSET,     sourceModule: SourceModule.BANK,        normalBalance: 'DEBIT'  },
  { id: 'acc-ar',                code: '1100', name: 'Accounts Receivable',           type: AccountType.ASSET,     sourceModule: SourceModule.POS,         normalBalance: 'DEBIT'  },
  { id: 'acc-inventory',         code: '1200', name: 'Inventory',                     type: AccountType.ASSET,     sourceModule: SourceModule.PROCUREMENT, normalBalance: 'DEBIT'  },
  { id: 'acc-ppe',               code: '1500', name: 'Property, Plant & Equipment',   type: AccountType.ASSET,     sourceModule: SourceModule.ACCOUNTING,  normalBalance: 'DEBIT'  },
  { id: 'acc-ap',                code: '2000', name: 'Accounts Payable',              type: AccountType.LIABILITY, sourceModule: SourceModule.PROCUREMENT, normalBalance: 'CREDIT' },
  { id: 'acc-tax-payable',       code: '2100', name: 'Tax Payables',                  type: AccountType.LIABILITY, sourceModule: SourceModule.ACCOUNTING,  normalBalance: 'CREDIT' },
  { id: 'acc-loan',              code: '2200', name: 'Bank Loan',                     type: AccountType.LIABILITY, sourceModule: SourceModule.BANK,        normalBalance: 'CREDIT' },
  { id: 'acc-share-capital',     code: '3000', name: 'Share Capital',                 type: AccountType.EQUITY,    sourceModule: SourceModule.ACCOUNTING,  normalBalance: 'CREDIT' },
  { id: 'acc-retained-earnings', code: '3100', name: 'Retained Earnings',             type: AccountType.EQUITY,    sourceModule: SourceModule.ACCOUNTING,  normalBalance: 'CREDIT' },
  { id: 'acc-sales',             code: '4000', name: 'Product Sales',                 type: AccountType.INCOME,    sourceModule: SourceModule.POS,         normalBalance: 'CREDIT' },
  { id: 'acc-service-income',    code: '4100', name: 'Service Revenue',               type: AccountType.INCOME,    sourceModule: SourceModule.ACCOUNTING,  normalBalance: 'CREDIT' },
  { id: 'acc-cogs',              code: '5000', name: 'Cost of Goods Sold',            type: AccountType.EXPENSE,   sourceModule: SourceModule.PROCUREMENT, normalBalance: 'DEBIT'  },
  { id: 'acc-payroll',           code: '6100', name: 'Payroll Expense',               type: AccountType.EXPENSE,   sourceModule: SourceModule.HR,          normalBalance: 'DEBIT'  },
  { id: 'acc-rent',              code: '6200', name: 'Rent and Utilities',            type: AccountType.EXPENSE,   sourceModule: SourceModule.ACCOUNTING,  normalBalance: 'DEBIT'  },
  { id: 'acc-tax-expense',       code: '6300', name: 'Income Tax Expense',            type: AccountType.EXPENSE,   sourceModule: SourceModule.ACCOUNTING,  normalBalance: 'DEBIT'  },
];

const ACCOUNTING_TRANSACTIONS: AccountingTransactionDTO[] = [
  {
    id: 'txn-001',
    reference: 'INV-2025-0145',
    sourceModule: SourceModule.POS,
    transactionDate: new Date(2025, 4, 5).toISOString(),
    description: 'Product sales invoice posted',
    amount: 2_687_500,
    reviewStatus: TransactionReviewStatus.APPROVED,
    journalEntryId: 'je-001',
  },
  {
    id: 'txn-002',
    reference: 'PO-2025-0089',
    sourceModule: SourceModule.PROCUREMENT,
    transactionDate: new Date(2025, 4, 8).toISOString(),
    description: 'Inventory purchase recorded',
    amount: 1_290_000,
    reviewStatus: TransactionReviewStatus.APPROVED,
    journalEntryId: 'je-002',
  },
  {
    id: 'txn-003',
    reference: 'PAY-2025-0021',
    sourceModule: SourceModule.HR,
    transactionDate: new Date(2025, 4, 25).toISOString(),
    description: 'Payroll accrual for May',
    amount: 630_400,
    reviewStatus: TransactionReviewStatus.APPROVED,
    journalEntryId: 'je-003',
  },
];

const JOURNAL_ENTRIES: JournalEntryDTO[] = [
  {
    id: 'je-001',
    transactionId: 'txn-001',
    entryDate: new Date(2025, 4, 5).toISOString(),
    description: 'Revenue posting',
    status: JournalEntryStatus.POSTED,
  },
  {
    id: 'je-002',
    transactionId: 'txn-002',
    entryDate: new Date(2025, 4, 8).toISOString(),
    description: 'Inventory purchase posting',
    status: JournalEntryStatus.POSTED,
  },
  {
    id: 'je-003',
    transactionId: 'txn-003',
    entryDate: new Date(2025, 4, 25).toISOString(),
    description: 'Payroll posting',
    status: JournalEntryStatus.POSTED,
  },
];

const JOURNAL_ENTRY_LINES: JournalEntryLineDTO[] = [
  {
    id: 'jel-001',
    journalEntryId: 'je-001',
    accountId: 'acc-ar',
    description: 'Accounts receivable debit',
    debitAmount: 2_687_500,
    creditAmount: 0,
  },
  {
    id: 'jel-002',
    journalEntryId: 'je-001',
    accountId: 'acc-sales',
    description: 'Sales revenue credit',
    debitAmount: 0,
    creditAmount: 2_687_500,
  },
  {
    id: 'jel-003',
    journalEntryId: 'je-002',
    accountId: 'acc-inventory',
    description: 'Inventory debit',
    debitAmount: 1_290_000,
    creditAmount: 0,
  },
  {
    id: 'jel-004',
    journalEntryId: 'je-002',
    accountId: 'acc-ap',
    description: 'Accounts payable credit',
    debitAmount: 0,
    creditAmount: 1_290_000,
  },
  {
    id: 'jel-005',
    journalEntryId: 'je-003',
    accountId: 'acc-payroll',
    description: 'Payroll expense debit',
    debitAmount: 630_400,
    creditAmount: 0,
  },
  {
    id: 'jel-006',
    journalEntryId: 'je-003',
    accountId: 'acc-ap',
    description: 'Accrued payroll credit',
    debitAmount: 0,
    creditAmount: 630_400,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AccountingService {

  // ── Period state — all reports react to this single observable ───────────
  private readonly selectedPeriod$ = new BehaviorSubject<Date>(new Date(2025, 4, 1));

  get period$(): Observable<Date> {
    return this.selectedPeriod$.asObservable();
  }

  setPeriod(date: Date): void {
    this.selectedPeriod$.next(date);
  }

  // ── Public report Observables ─────────────────────────────────────────────

  /** Full Income Statement including line items, totals, ratios, chart data. */
  getIncomeStatementReport(): Observable<IncomeStatementReportDTO> {
    return this.selectedPeriod$.pipe(
      map(period => this.buildIncomeStatement(period)),
      shareReplay(1),
    );
  }

  /** Balance Sheet as of the last day of the selected period's month. */
  getBalanceSheetReport(): Observable<BalanceSheetReportDTO> {
    return this.selectedPeriod$.pipe(
      map(period => this.buildBalanceSheetReport(period)),
      shareReplay(1),
    );
  }

  /** Cash Flow Statement for the selected period. */
  getCashFlowReport(): Observable<CashFlowReportDTO> {
    return this.selectedPeriod$.pipe(
      map(period => this.buildCashFlowReport(period)),
      shareReplay(1),
    );
  }

  /** Full Tax Summary for the selected period's month. */
  getTaxSummaryReport(): Observable<TaxSummaryReportDTO> {
    return this.selectedPeriod$.pipe(
      map(period => this.buildTaxSummaryReport(period)),
      shareReplay(1),
    );
  }

  /** Cross-report KPI aggregates for the dashboard. */
  getDashboardMetrics(): Observable<DashboardMetricsDTO> {
    return this.selectedPeriod$.pipe(
      map(period => {
        const is = this.buildIncomeStatement(period);
        const bs = this.buildBalanceSheetReport(period);
        const cf = this.buildCashFlowReport(period);
        return this.assembleDashboardMetrics(is, bs, cf);
      }),
      shareReplay(1),
    );
  }

  /** Saved report snapshots (persisted to session/local storage or backend). */
  getSavedReportSnapshots(): Observable<SavedReportSnapshotDTO[]> {
    return of([]); // Replace with localStorage read or HttpClient GET
  }

  // ── Raw reference data (used by balance sheet metadata panel) ────────────

  getChartOfAccounts(): Observable<AccountDTO[]> {
    return of(CHART_OF_ACCOUNTS);
  }

  getReportAccounts(): Observable<AccountDTO[]> {
    return this.getChartOfAccounts();
  }

  getAccountingTransactions(): Observable<AccountingTransactionDTO[]> {
    return of(ACCOUNTING_TRANSACTIONS);
  }

  getJournalEntries(): Observable<JournalEntryDTO[]> {
    return of(JOURNAL_ENTRIES);
  }

  getJournalEntryLines(): Observable<JournalEntryLineDTO[]> {
    return of(JOURNAL_ENTRY_LINES);
  }

  getYearlyTaxSummary(year: number): Observable<{ byMonth: Array<{ month: number; amount: number }>; total: number }> {
    const byMonth = Array.from({ length: 12 }, (_, month) => ({
      month,
      amount: month < 6 ? [118_500, 198_000, 145_000, 105_200, 180_000, 221_250][month] ?? 0 : 0,
    }));

    const total = byMonth.reduce((sum, entry) => sum + entry.amount, 0);

    return of({ byMonth, total });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private builders
  // ─────────────────────────────────────────────────────────────────────────

  private buildReportContext(
    period: Date,
    periodType: ReportPeriodType = 'monthly',
  ): ReportContextDTO {
    const periodStart = new Date(period.getFullYear(), period.getMonth(), 1);
    const periodEnd   = new Date(period.getFullYear(), period.getMonth() + 1, 0);
    return {
      generatedAt:            new Date().toISOString(),
      generatedBy:            'System',
      periodStart:            periodStart.toISOString(),
      periodEnd:              periodEnd.toISOString(),
      reportPeriodType:       periodType,
      sourceModules:          [SourceModule.POS, SourceModule.HR, SourceModule.BANK, SourceModule.PROCUREMENT, SourceModule.ACCOUNTING],
      includedTransactionIds: [], // populated when real transactions exist
      entityName:             'Acme Corporation Ltd.',
      currencyCode:           'NGN',
      reportVersion:          '1.0',
      complianceFramework:    'IFRS / CAMA 2020',
    };
  }

  private buildIncomeStatement(period: Date): IncomeStatementReportDTO {
    const revenue                  = toLineItems(RAW_REVENUE);
    const cogs                     = toLineItems(RAW_COGS);
    const administrativeExpenses   = toLineItems(RAW_ADMIN);
    const salariesAndWages         = toLineItems(RAW_SALARIES);
    const maintenance              = toLineItems(RAW_MAINTENANCE);
    const logisticsAndDistribution = toLineItems(RAW_LOGISTICS);
    const otherOperatingExpenses   = toLineItems(RAW_OTHER_OPEX);
    const otherItems               = toLineItems(RAW_OTHER_ITEMS);

    const tRevenue   = toPeriodComparison(revenue);
    const tCogs      = toPeriodComparison(cogs);
    const tAdmin     = toPeriodComparison(administrativeExpenses);
    const tSalaries  = toPeriodComparison(salariesAndWages);
    const tMaint     = toPeriodComparison(maintenance);
    const tLogistics = toPeriodComparison(logisticsAndDistribution);
    const tOtherOpEx = toPeriodComparison(otherOperatingExpenses);
    const tOther     = toPeriodComparison(otherItems);

    const tGrossProfit = addComparisons(tRevenue, tCogs);
    const tTotalOpEx   = addComparisons(
      addComparisons(addComparisons(tAdmin, tSalaries), addComparisons(tMaint, tLogistics)),
      tOtherOpEx,
    );
    const tEbit = addComparisons(tGrossProfit, tTotalOpEx);
    const tDA: PeriodComparisonDTO = {
      actualAmount:    DA_AMOUNTS.actual,
      previousAmount:  DA_AMOUNTS.previous,
      budgetAmount:    DA_AMOUNTS.budget,
      priorYearAmount: DA_AMOUNTS.priorYear,
    };
    const tEbitda = addComparisons(tEbit, tDA);
    const tNibt   = addComparisons(tEbit, tOther);

    const calcTax = (nibt: number) => {
      const base = floorAtZero(nibt);
      return {
        cit:   -(base * CIT_RATE_LARGE),
        edu:   -(base * EDUCATION_TAX),
        nas:   -(base * NASENI_LEVY),
        total: -(base * (CIT_RATE_LARGE + EDUCATION_TAX + NASENI_LEVY)),
      };
    };

    const taxA  = calcTax(tNibt.actualAmount);
    const taxP  = calcTax(tNibt.previousAmount);
    const taxB  = calcTax(tNibt.budgetAmount);
    const taxPY = calcTax(tNibt.priorYearAmount);

    const tCit:  PeriodComparisonDTO = { actualAmount: taxA.cit,   previousAmount: taxP.cit,   budgetAmount: taxB.cit,   priorYearAmount: taxPY.cit   };
    const tEdu:  PeriodComparisonDTO = { actualAmount: taxA.edu,   previousAmount: taxP.edu,   budgetAmount: taxB.edu,   priorYearAmount: taxPY.edu   };
    const tNas:  PeriodComparisonDTO = { actualAmount: taxA.nas,   previousAmount: taxP.nas,   budgetAmount: taxB.nas,   priorYearAmount: taxPY.nas   };
    const tTax:  PeriodComparisonDTO = { actualAmount: taxA.total, previousAmount: taxP.total, budgetAmount: taxB.total, priorYearAmount: taxPY.total };
    const tNet   = addComparisons(tNibt, tTax);

    const totals: IncomeStatementTotalsDTO = {
      revenue: tRevenue, cogs: tCogs, grossProfit: tGrossProfit,
      adminExpenses: tAdmin, salariesWages: tSalaries, maintenance: tMaint,
      logistics: tLogistics, otherOpEx: tOtherOpEx, totalOpEx: tTotalOpEx,
      ebit: tEbit, ebitda: tEbitda, otherItems: tOther, nibt: tNibt,
      cit: tCit, educationTax: tEdu, naseniLevy: tNas, totalTax: tTax,
      netIncome: tNet,
    };

    const expenseDistribution: ExpenseDistributionDTO = {
      administrative:           Math.abs(tAdmin.actualAmount),
      salariesAndWages:         Math.abs(tSalaries.actualAmount),
      maintenance:              Math.abs(tMaint.actualAmount),
      logisticsAndDistribution: Math.abs(tLogistics.actualAmount),
      otherOperatingExpenses:   Math.abs(tOtherOpEx.actualAmount),
    };

    return {
      reportPeriod:              period,
      revenue, cogs, administrativeExpenses, salariesAndWages,
      maintenance, logisticsAndDistribution, otherOperatingExpenses, otherItems,
      totals,
      ratios: {
        grossProfitMarginPct: pctOf(tGrossProfit.actualAmount, tRevenue.actualAmount),
        ebitdaMarginPct:      pctOf(tEbitda.actualAmount,      tRevenue.actualAmount),
        netProfitMarginPct:   pctOf(tNet.actualAmount,         tRevenue.actualAmount),
        revenueGrowthMoMPct:  growthPct(tRevenue.actualAmount, tRevenue.previousAmount),
        grossProfitGrowthPct: growthPct(tGrossProfit.actualAmount, tGrossProfit.previousAmount),
      },
      monthlyTrend: MONTHLY_TREND,
      expenseDistribution,
      depreciationAndAmortization: DA_AMOUNTS.actual,
      reportContext: this.buildReportContext(period),
    };
  }

  private buildBalanceSheetReport(period: Date): BalanceSheetReportDTO {
    const periodEnd = new Date(period.getFullYear(), period.getMonth() + 1, 0);

    const ca  = RAW_BS_CURRENT_ASSETS;
    const nca = RAW_BS_NONCURRENT_ASSETS;
    const cl  = RAW_BS_CURRENT_LIAB;
    const ncl = RAW_BS_NONCURRENT_LIAB;

    const caTotal  = Object.values(ca).reduce((s, v) => s + v, 0);
    const ncaTotal = Object.values(nca).reduce((s, v) => s + v, 0);
    const clTotal  = Object.values(cl).reduce((s, v) => s + v, 0);
    const nclTotal = Object.values(ncl).reduce((s, v) => s + v, 0);

    const totalAssets      = caTotal + ncaTotal;
    const totalLiabilities = clTotal + nclTotal;
    const knownEquity      = RAW_BS_EQUITY_BASE.commonStock + RAW_BS_EQUITY_BASE.otherComprehensiveIncome;
    const retainedEarnings = totalAssets - totalLiabilities - knownEquity;
    const totalEquity      = knownEquity + retainedEarnings;

    const assets: AccountBalanceDTO[] = [
      { accountId: 'acc-cash',      accountCode: '1010', accountName: 'Cash and Cash Equivalents', accountType: AccountType.ASSET,     balance: ca.cash + ca.cashOnHand + ca.regularCheckingAccount + ca.payrollCheckingAccount + ca.savingsAccount },
      { accountId: 'acc-ar',        accountCode: '1100', accountName: 'Accounts Receivable',       accountType: AccountType.ASSET,     balance: ca.accountsReceivable   },
      { accountId: 'acc-inventory', accountCode: '1200', accountName: 'Inventory',                  accountType: AccountType.ASSET,     balance: ca.inventory            },
      { accountId: 'acc-prepaid',   accountCode: '1300', accountName: 'Prepaid Expenses',           accountType: AccountType.ASSET,     balance: ca.prepaidExpenses      },
      { accountId: 'acc-ppe',       accountCode: '1500', accountName: 'Property, Plant & Equipment',accountType: AccountType.ASSET,     balance: nca.property + nca.equipment },
      { accountId: 'acc-invest',    accountCode: '1600', accountName: 'Long-term Investments',      accountType: AccountType.ASSET,     balance: nca.investments         },
      { accountId: 'acc-intangible',accountCode: '1700', accountName: 'Intangible Assets',          accountType: AccountType.ASSET,     balance: nca.intangibleAssets    },
    ];

    const liabilities: AccountBalanceDTO[] = [
      { accountId: 'acc-ap',          accountCode: '2000', accountName: 'Accounts Payable',    accountType: AccountType.LIABILITY, balance: cl.accountsPayable  },
      { accountId: 'acc-short-debt',  accountCode: '2010', accountName: 'Short-term Debt',     accountType: AccountType.LIABILITY, balance: cl.shortTermDebt    },
      { accountId: 'acc-accrued',     accountCode: '2020', accountName: 'Accrued Expenses',    accountType: AccountType.LIABILITY, balance: cl.accruedExpenses  },
      { accountId: 'acc-vat-pay',     accountCode: '2030', accountName: 'VAT Payable',         accountType: AccountType.LIABILITY, balance: cl.vatPayable       },
      { accountId: 'acc-wht-pay',     accountCode: '2040', accountName: 'WHT Payable',         accountType: AccountType.LIABILITY, balance: cl.whtPayable       },
      { accountId: 'acc-paye-pay',    accountCode: '2050', accountName: 'PAYE Tax Payable',    accountType: AccountType.LIABILITY, balance: cl.payeTaxPayable   },
      { accountId: 'acc-long-debt',   accountCode: '2100', accountName: 'Long-term Debt',      accountType: AccountType.LIABILITY, balance: ncl.longTermDebt    },
      { accountId: 'acc-def-tax',     accountCode: '2110', accountName: 'Deferred Tax Liability',accountType: AccountType.LIABILITY,balance: ncl.deferredTax    },
      { accountId: 'acc-lease',       accountCode: '2120', accountName: 'Lease Obligations',   accountType: AccountType.LIABILITY, balance: ncl.leaseObligations},
    ];

    const equity: AccountBalanceDTO[] = [
      { accountId: 'acc-share-capital',       accountCode: '3000', accountName: 'Share Capital',                  accountType: AccountType.EQUITY, balance: RAW_BS_EQUITY_BASE.commonStock             },
      { accountId: 'acc-retained-earnings',   accountCode: '3100', accountName: 'Retained Earnings',              accountType: AccountType.EQUITY, balance: retainedEarnings                           },
      { accountId: 'acc-oci',                 accountCode: '3200', accountName: 'Other Comprehensive Income',     accountType: AccountType.EQUITY, balance: RAW_BS_EQUITY_BASE.otherComprehensiveIncome },
    ];

    return {
      reportDate:       periodEnd.toISOString(),
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      isBalanced:       Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      reportContext:    this.buildReportContext(period),
    };
  }

  private buildCashFlowReport(period: Date): CashFlowReportDTO {
    const is = this.buildIncomeStatement(period);

    const outputVat      = Math.round(RAW_CF.grossCustomerReceipts * (VAT_RATE / (1 + VAT_RATE)));
    const netReceipts    = RAW_CF.grossCustomerReceipts - outputVat;
    const netVatRemitted = -(outputVat - RAW_CF.inputVatRecoverable);

    const operating: CashFlowLineItemDTO[] = [
      { description: 'Customer Receipts (net of VAT)',      amount: netReceipts,                        category: CashFlowCategory.OPERATING, flowDirection: 'inflow',  indentLevel: 1, isSubtotal: false },
      { description: 'Payments to Suppliers & Employees',   amount: RAW_CF.supplierAndEmployeePayments, category: CashFlowCategory.OPERATING, flowDirection: 'outflow', indentLevel: 1, isSubtotal: false },
      { description: 'Net VAT Remittance to FIRS',          amount: netVatRemitted,                     category: CashFlowCategory.OPERATING, flowDirection: 'outflow', indentLevel: 1, isSubtotal: false },
      { description: 'WHT Remitted to FIRS',                amount: RAW_CF.whtRemitted,                 category: CashFlowCategory.OPERATING, flowDirection: 'outflow', indentLevel: 1, isSubtotal: false },
      { description: 'Companies Income Tax Paid',           amount: RAW_CF.citPaid,                     category: CashFlowCategory.OPERATING, flowDirection: 'outflow', indentLevel: 1, isSubtotal: false },
      { description: 'Education Tax (TETFund) Paid',        amount: RAW_CF.educationTaxPaid,            category: CashFlowCategory.OPERATING, flowDirection: 'outflow', indentLevel: 1, isSubtotal: false },
    ];
    const operatingTotal = operating.reduce((s, i) => s + i.amount, 0);
    operating.push({ description: 'Net Cash from Operating Activities', amount: operatingTotal, category: CashFlowCategory.OPERATING, flowDirection: operatingTotal >= 0 ? 'inflow' : 'outflow', indentLevel: 0, isSubtotal: true });

    const investing: CashFlowLineItemDTO[] = [
      { description: 'Capital Expenditure',             amount: RAW_CF.capitalExpenditure,    category: CashFlowCategory.INVESTING, flowDirection: 'outflow', indentLevel: 1, isSubtotal: false },
      { description: 'Proceeds from Asset Disposals',   amount: RAW_CF.assetDisposalProceeds, category: CashFlowCategory.INVESTING, flowDirection: 'inflow',  indentLevel: 1, isSubtotal: false },
      { description: 'Long-term Investments (net)',      amount: RAW_CF.longTermInvestments,   category: CashFlowCategory.INVESTING, flowDirection: 'outflow', indentLevel: 1, isSubtotal: false },
    ];
    const investingTotal = investing.reduce((s, i) => s + i.amount, 0);
    investing.push({ description: 'Net Cash from Investing Activities', amount: investingTotal, category: CashFlowCategory.INVESTING, flowDirection: investingTotal >= 0 ? 'inflow' : 'outflow', indentLevel: 0, isSubtotal: true });

    const financing: CashFlowLineItemDTO[] = [
      { description: 'Loan Repayments', amount: RAW_CF.loanRepayment, category: CashFlowCategory.FINANCING, flowDirection: 'outflow', indentLevel: 1, isSubtotal: false },
      { description: 'Dividends Paid',  amount: RAW_CF.dividendsPaid, category: CashFlowCategory.FINANCING, flowDirection: 'outflow', indentLevel: 1, isSubtotal: false },
      { description: 'New Borrowings',  amount: RAW_CF.newBorrowings, category: CashFlowCategory.FINANCING, flowDirection: 'inflow',  indentLevel: 1, isSubtotal: false },
    ];
    const financingTotal = financing.reduce((s, i) => s + i.amount, 0);
    financing.push({ description: 'Net Cash from Financing Activities', amount: financingTotal, category: CashFlowCategory.FINANCING, flowDirection: financingTotal >= 0 ? 'inflow' : 'outflow', indentLevel: 0, isSubtotal: true });

    const netCashFlow    = operatingTotal + investingTotal + financingTotal;
    const openingBalance = RAW_CF.openingCashBalance;
    const closingBalance = openingBalance + netCashFlow;
    const freeCashFlow   = operatingTotal + RAW_CF.capitalExpenditure;

    const summary: CashFlowSummaryDTO = {
      operatingCashFlow: operatingTotal,
      investingCashFlow: investingTotal,
      financingCashFlow: financingTotal,
      netCashFlow,
      openingBalance,
      closingBalance,
      freeCashFlow,
    };

    const reconciliation: CashFlowReconciliationDTO = {
      netIncome:               is.totals.netIncome.actualAmount,
      addBackDepreciation:     RAW_CF.depreciation,
      addBackAmortization:     0,
      deductGainOnDisposal:    RAW_CF.gainOnDisposal,
      changesInWorkingCapital: RAW_CF.workingCapitalChanges,
      calculatedOperatingCash: is.totals.netIncome.actualAmount + RAW_CF.depreciation + RAW_CF.gainOnDisposal + RAW_CF.workingCapitalChanges,
    };

    const workingCapitalChanges: WorkingCapitalChangeDTO[] = [
      { accountName: 'Accounts Receivable', accountCode: '1100', changeAmount: -450_000, effectType: 'use'    },
      { accountName: 'Inventory',           accountCode: '1200', changeAmount: -300_000, effectType: 'use'    },
      { accountName: 'Accounts Payable',    accountCode: '2000', changeAmount:  250_000, effectType: 'source' },
      { accountName: 'Accrued Expenses',    accountCode: '2020', changeAmount:  250_000, effectType: 'source' },
    ];

    const taxCashFlowBreakdown: TaxCashFlowBreakdownDTO = {
      companiesIncomeTax: Math.abs(RAW_CF.citPaid),
      valueAddedTax:      Math.abs(netVatRemitted),
      withholdingTax:     Math.abs(RAW_CF.whtRemitted),
      educationTax:       Math.abs(RAW_CF.educationTaxPaid),
      naseniLevy:         0,
      totalTaxPaid:       Math.abs(RAW_CF.citPaid) + Math.abs(netVatRemitted) + Math.abs(RAW_CF.whtRemitted) + Math.abs(RAW_CF.educationTaxPaid),
    };

    const prevOperating = Math.round(operatingTotal * 0.93);
    const prevInvesting = Math.round(investingTotal * 0.87);
    const prevFinancing = Math.round(financingTotal * 3.6);
    const prevNet       = prevOperating + prevInvesting + prevFinancing;

    return {
      reportPeriod: period,
      operatingActivities: operating,
      investingActivities: investing,
      financingActivities: financing,
      summary,
      indirectReconciliation: reconciliation,
      workingCapitalChanges,
      taxCashFlowBreakdown,
      vatOutputAmount:      outputVat,
      vatInputRecoverable:  RAW_CF.inputVatRecoverable,
      periodComparisons: {
        netCashFlow:       buildPeriodComparisonSummary(netCashFlow,    prevNet),
        operatingCashFlow: buildPeriodComparisonSummary(operatingTotal, prevOperating),
        investingCashFlow: buildPeriodComparisonSummary(investingTotal, prevInvesting),
        financingCashFlow: buildPeriodComparisonSummary(financingTotal, prevFinancing),
      },
      reportContext: this.buildReportContext(period),
    };
  }

  private buildTaxSummaryReport(period: Date): TaxSummaryReportDTO {
    const is              = this.buildIncomeStatement(period);
    const nibt            = is.totals.nibt.actualAmount;
    const citCharge       = floorAtZero(nibt) * CIT_RATE_LARGE;
    const educationTaxLevy= floorAtZero(nibt) * EDUCATION_TAX;
    const naseniLevy      = floorAtZero(nibt) * NASENI_LEVY;
    const totalCitLiab    = citCharge + educationTaxLevy + naseniLevy;

    const vat: VatSummaryDTO = {
      outputVAT:           RAW_TAX.vat.outputVAT,
      inputVAT:            RAW_TAX.vat.inputVAT,
      netVatPayable:       RAW_TAX.vat.outputVAT - RAW_TAX.vat.inputVAT,
      totalVatableSales:   RAW_TAX.vat.totalSales,
      totalVatablePurchases:RAW_TAX.vat.totalPurchases,
      effectiveRate:       VAT_RATE,
    };

    const wht: WhtSummaryDTO = {
      totalWithheld:  RAW_TAX.wht.atFivePercent + RAW_TAX.wht.atTenPercent,
      atFivePercent:  RAW_TAX.wht.atFivePercent,
      atTenPercent:   RAW_TAX.wht.atTenPercent,
      rateBreakdown: [
        { rate: '5%',  description: 'Professional Services / Consultancy', transactionCount: 2, totalAmount: RAW_TAX.wht.atFivePercent  },
        { rate: '10%', description: 'Building / Construction / Contracts', transactionCount: 2, totalAmount: RAW_TAX.wht.atTenPercent   },
      ],
    };

    const cit: CitSummaryDTO = {
      annualTurnover:     RAW_TAX.cit.annualTurnover,
      assessableProfit:   nibt,
      applicableRate:     CIT_RATE_LARGE,
      companiesIncomeTax: citCharge,
      educationTaxLevy,
      naseniLevy,
      totalCitLiability:  totalCitLiab,
    };

    const deferredTax: DeferredTaxDTO = {
      deductibleTemporaryDifferences: RAW_TAX.deferredTax.deductibleDifferences,
      taxableTemporaryDifferences:    RAW_TAX.deferredTax.taxableDifferences,
      applicableCitRate:              CIT_RATE_LARGE,
      deferredTaxAsset:               RAW_TAX.deferredTax.deductibleDifferences * CIT_RATE_LARGE,
      deferredTaxLiability:           RAW_TAX.deferredTax.taxableDifferences    * CIT_RATE_LARGE,
      netDeferredTaxPosition:         (RAW_TAX.deferredTax.deductibleDifferences - RAW_TAX.deferredTax.taxableDifferences) * CIT_RATE_LARGE,
    };

    const inputVatRecoverability: InputVatRecoverabilityDTO = {
      totalInputVat:           RAW_TAX.inputVatRecoverability.totalInputVat,
      recoverableInputVat:     RAW_TAX.inputVatRecoverability.recoverableInputVat,
      nonRecoverableInputVat:  RAW_TAX.inputVatRecoverability.nonRecoverableInputVat,
      recoverabilityRate:      RAW_TAX.inputVatRecoverability.totalInputVat !== 0
        ? RAW_TAX.inputVatRecoverability.recoverableInputVat / RAW_TAX.inputVatRecoverability.totalInputVat
        : 1,
    };

    const payeEmployees: PayeEmployeeDTO[] = [
      { employeeName: 'Adewale Okonkwo', grossSalary: 850_000,   pensionDeduction: 68_000,  nhfDeduction: 21_250, taxableIncome: 720_000,   payeDeducted: 108_000, netSalary: 652_750 },
      { employeeName: 'Funke Adeyemi',   grossSalary: 650_000,   pensionDeduction: 52_000,  nhfDeduction: 16_250, taxableIncome: 552_500,   payeDeducted: 69_063,  netSalary: 512_688 },
      { employeeName: 'Chidi Nwankwo',   grossSalary: 1_200_000, pensionDeduction: 96_000,  nhfDeduction: 30_000, taxableIncome: 1_020_000, payeDeducted: 204_000, netSalary: 870_000 },
      { employeeName: 'Amina Mohammed',  grossSalary: 550_000,   pensionDeduction: 44_000,  nhfDeduction: 13_750, taxableIncome: 467_500,   payeDeducted: 46_750,  netSalary: 445_500 },
      { employeeName: 'Emeka Eze',       grossSalary: 750_000,   pensionDeduction: 60_000,  nhfDeduction: 18_750, taxableIncome: 637_500,   payeDeducted: 85_313,  netSalary: 585_938 },
      { employeeName: 'Ngozi Obi',       grossSalary: 920_000,   pensionDeduction: 73_600,  nhfDeduction: 23_000, taxableIncome: 782_000,   payeDeducted: 132_540, netSalary: 690_860 },
    ];
    const totalPayeDeducted = payeEmployees.reduce((s, e) => s + e.payeDeducted, 0);

    const taxBands: PitTaxBandDTO[] = [
      { bandLabel: 'Band 1', incomeRange: 'First ₦300,000',   taxRate: '7%',  legalBasis: 'PITA §3' },
      { bandLabel: 'Band 2', incomeRange: 'Next ₦300,000',    taxRate: '11%', legalBasis: 'PITA §3' },
      { bandLabel: 'Band 3', incomeRange: 'Next ₦500,000',    taxRate: '15%', legalBasis: 'PITA §3' },
      { bandLabel: 'Band 4', incomeRange: 'Next ₦500,000',    taxRate: '19%', legalBasis: 'PITA §3' },
      { bandLabel: 'Band 5', incomeRange: 'Next ₦1,600,000',  taxRate: '21%', legalBasis: 'PITA §3' },
      { bandLabel: 'Band 6', incomeRange: 'Above ₦3,200,000', taxRate: '24%', legalBasis: 'PITA §3' },
    ];

    const taxLineItems: TaxLineItemDTO[] = [
      { id: 'TL001', taxType: TaxType.VAT, description: 'Sales Invoice INV-2025-0145',    baseAmount: 2_500_000, taxAmount: 187_500, effectiveRate: 0.075, direction: 'output', glAccountCode: '2140', sourceModule: SourceModule.POS,         transactionDate: new Date(2025, 5,  5).toISOString(), reportingPeriod: period.toISOString().slice(0,7) },
      { id: 'TL002', taxType: TaxType.VAT, description: 'Purchase Order PO-2025-0089',    baseAmount: 1_200_000, taxAmount:  90_000, effectiveRate: 0.075, direction: 'input',  glAccountCode: '1050', sourceModule: SourceModule.PROCUREMENT, transactionDate: new Date(2025, 5,  8).toISOString(), reportingPeriod: period.toISOString().slice(0,7) },
      { id: 'TL003', taxType: TaxType.VAT, description: 'Service Invoice SRV-2025-033',   baseAmount:   800_000, taxAmount:  60_000, effectiveRate: 0.075, direction: 'output', glAccountCode: '2140', sourceModule: SourceModule.POS,         transactionDate: new Date(2025, 5, 12).toISOString(), reportingPeriod: period.toISOString().slice(0,7) },
      { id: 'TL007', taxType: TaxType.WHT, description: 'Consulting Payment - ABC Ltd',   baseAmount:   500_000, taxAmount:  25_000, effectiveRate: 0.05,  direction: 'output', glAccountCode: '2150', sourceModule: SourceModule.ACCOUNTING,  transactionDate: new Date(2025, 5, 10).toISOString(), reportingPeriod: period.toISOString().slice(0,7), vendorName: 'ABC Consulting Ltd'        },
      { id: 'TL008', taxType: TaxType.WHT, description: 'Contract Payment - XYZ Builders',baseAmount: 3_000_000, taxAmount: 300_000, effectiveRate: 0.10,  direction: 'output', glAccountCode: '2150', sourceModule: SourceModule.ACCOUNTING,  transactionDate: new Date(2025, 5, 15).toISOString(), reportingPeriod: period.toISOString().slice(0,7), vendorName: 'XYZ Builders Nig. Ltd'     },
      { id: 'TL011', taxType: TaxType.CIT, description: 'Companies Income Tax Provision', baseAmount: nibt,      taxAmount: citCharge, effectiveRate: CIT_RATE_LARGE, direction: 'output', glAccountCode: '2160', sourceModule: SourceModule.TAX, transactionDate: new Date(2025, 5, 30).toISOString(), reportingPeriod: period.toISOString().slice(0,7) },
      { id: 'TL012', taxType: TaxType.EDT, description: 'Education Tax Provision',         baseAmount: nibt,      taxAmount: educationTaxLevy, effectiveRate: EDUCATION_TAX, direction: 'output', glAccountCode: '2170', sourceModule: SourceModule.TAX, transactionDate: new Date(2025, 5, 30).toISOString(), reportingPeriod: period.toISOString().slice(0,7) },
    ];

    const filingHistory: FilingRecordDTO[] = [
      { taxType: TaxType.VAT, reportingPeriod: '2025-05', filingStatus: FilingStatus.FILED, filedDate: '2025-06-18', taxAmountDue: 118_500,   firsReference: 'FIRS-VAT-2025-05-001' },
      { taxType: TaxType.WHT, reportingPeriod: '2025-05', filingStatus: FilingStatus.FILED, filedDate: '2025-06-15', taxAmountDue: 285_000,   firsReference: 'FIRS-WHT-2025-05-001' },
      { taxType: TaxType.VAT, reportingPeriod: '2025-04', filingStatus: FilingStatus.FILED, filedDate: '2025-05-19', taxAmountDue: 105_200,   firsReference: 'FIRS-VAT-2025-04-001' },
      { taxType: TaxType.CIT, reportingPeriod: '2025-Q2', filingStatus: FilingStatus.FILED, filedDate: '2025-06-30', taxAmountDue: 1_200_000, firsReference: 'FIRS-CIT-2025-Q2-001' },
      { taxType: TaxType.VAT, reportingPeriod: '2025-06', filingStatus: FilingStatus.PENDING, taxAmountDue: vat.netVatPayable, firsReference: 'FIRS-VAT-2025-06-PENDING' },
    ];

    const monthlyTaxTrend: MonthlyTaxTrendDTO[] = [
      { periodLabel: 'Jan', vatAmount: 118_500, whtAmount: 285_000, payeAmount: 645_666 },
      { periodLabel: 'Feb', vatAmount: 198_000, whtAmount: 310_000, payeAmount: 645_666 },
      { periodLabel: 'Mar', vatAmount: 145_000, whtAmount: 270_000, payeAmount: 645_666 },
      { periodLabel: 'Apr', vatAmount: 105_200, whtAmount: 192_000, payeAmount: 542_000 },
      { periodLabel: 'May', vatAmount: 180_000, whtAmount: 340_000, payeAmount: 645_666 },
      { periodLabel: 'Jun', vatAmount: 221_250, whtAmount: 582_500, payeAmount: 645_666 },
    ];

    const complianceChecks: TaxComplianceCheckDTO[] = [
      { checkLabel: 'VAT Return Filed',            isPassed: false, severity: 'warning', detail: `VAT return for ${period.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })} not yet filed` },
      { checkLabel: 'WHT Remittance Current',      isPassed: true,  severity: 'info',    detail: 'All WHT deductions remitted to FIRS within 21 days'    },
      { checkLabel: 'CIT Estimated Tax Paid',      isPassed: true,  severity: 'info',    detail: 'Q2 estimated CIT payment submitted'                     },
      { checkLabel: 'PAYE Monthly Return',         isPassed: true,  severity: 'info',    detail: 'All employee PAYE deductions remitted'                  },
      { checkLabel: 'Transfer Pricing Disclosure', isPassed: false, severity: 'error',   detail: 'TP disclosure form not submitted for related-party transactions' },
    ];

    return {
      reportingPeriod: period.toISOString().slice(0, 7),
      vat,
      wht,
      cit,
      paye: { employees: payeEmployees, totalPayeDeducted, taxBands },
      complianceScore:  RAW_TAX.complianceScore,
      complianceChecks,
      taxLineItems,
      filingHistory,
      monthlyTaxTrend,
      deferredTax,
      inputVatRecoverability,
      reportContext: this.buildReportContext(period),
    };
  }

  private assembleDashboardMetrics(
    is: IncomeStatementReportDTO,
    bs: BalanceSheetReportDTO,
    cf: CashFlowReportDTO,
  ): DashboardMetricsDTO {
    return {
      totalRevenue:         is.totals.revenue.actualAmount,
      revenueGrowthMoMPct:  is.ratios.revenueGrowthMoMPct,
      grossProfit:          is.totals.grossProfit.actualAmount,
      grossProfitMarginPct: is.ratios.grossProfitMarginPct,
      ebitda:               is.totals.ebitda.actualAmount,
      ebitdaMarginPct:      is.ratios.ebitdaMarginPct,
      netIncome:            is.totals.netIncome.actualAmount,
      netProfitMarginPct:   is.ratios.netProfitMarginPct,
      totalAssets:          bs.totalAssets,
      totalLiabilities:     bs.totalLiabilities,
      totalEquity:          bs.totalEquity,
      operatingCashFlow:    cf.summary.operatingCashFlow,
      freeCashFlow:         cf.summary.freeCashFlow,
      accountsReceivable:   RAW_BS_CURRENT_ASSETS.accountsReceivable,
      workingCapital:       Object.values(RAW_BS_CURRENT_ASSETS).reduce((s, v) => s + v, 0) - Object.values(RAW_BS_CURRENT_LIAB).reduce((s, v) => s + v, 0),
      currentRatio:         Object.values(RAW_BS_CURRENT_ASSETS).reduce((s, v) => s + v, 0) / Object.values(RAW_BS_CURRENT_LIAB).reduce((s, v) => s + v, 0),
    };
  }
}
