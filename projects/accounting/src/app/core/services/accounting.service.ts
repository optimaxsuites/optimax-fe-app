import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
export interface FinancialLineItem {
  name: string;
  amount: number;         
  prevAmount: number;     
  budget: number;         
  prevYearAmount: number; 
}

export interface IncomeStatementData {
  period: Date;

  // Line items
  revenue:                  FinancialLineItem[];
  cogs:                     FinancialLineItem[];
  administrativeExpenses:   FinancialLineItem[];
  salariesWages:            FinancialLineItem[];
  maintenance:              FinancialLineItem[];
  logisticsDistribution:    FinancialLineItem[];
  otherOperatingExpenses:   FinancialLineItem[];
  otherItems:               FinancialLineItem[];

  // Computed totals — actual / prev / budget / prevYear
  totals: {
    revenue:            { actual: number; prev: number; budget: number; prevYear: number };
    cogs:               { actual: number; prev: number; budget: number; prevYear: number };
    grossProfit:        { actual: number; prev: number; budget: number; prevYear: number };
    adminExpenses:      { actual: number; prev: number; budget: number; prevYear: number };
    salariesWages:      { actual: number; prev: number; budget: number; prevYear: number };
    maintenance:        { actual: number; prev: number; budget: number; prevYear: number };
    logistics:          { actual: number; prev: number; budget: number; prevYear: number };
    otherOpEx:          { actual: number; prev: number; budget: number; prevYear: number };
    totalOpEx:          { actual: number; prev: number; budget: number; prevYear: number };
    ebit:               { actual: number; prev: number; budget: number; prevYear: number };
    ebitda:             { actual: number; prev: number; budget: number; prevYear: number };
    otherItems:         { actual: number; prev: number; budget: number; prevYear: number };
    nibt:               { actual: number; prev: number; budget: number; prevYear: number };
    cit:                { actual: number; prev: number; budget: number; prevYear: number };
    educationTax:       { actual: number; prev: number; budget: number; prevYear: number };
    naseniLevy:         { actual: number; prev: number; budget: number; prevYear: number };
    totalTax:           { actual: number; prev: number; budget: number; prevYear: number };
    netIncome:          { actual: number; prev: number; budget: number; prevYear: number };
  };

  // Ratios (actual only)
  ratios: {
    grossProfitMargin:  number; // %
    ebitdaMargin:       number; // %
    netProfitMargin:    number; // %
    revenueGrowthMoM:   number; // % vs prev period
    grossProfitGrowth:  number; // % vs prev period
  };

  // Chart data
  monthlyTrend: {
    labels:   string[];
    revenue:  number[];
    expenses: number[];
    profit:   number[];
  };

  expenseDistribution: {
    administrative:          number;
    salariesAndWages:        number;
    maintenance:             number;
    logisticsAndDistribution:number;
    otherOperatingExpenses:  number;
  };

  depreciationAndAmortization: number;
}

// Balance Sheet 

export interface BalanceSheetData {
  asOfDate: Date;
  entityName: string;

  assets: {
    current: {
      cash:                     number;
      cashOnHand:               number;
      regularCheckingAccount:   number;
      payrollCheckingAccount:   number;
      savingsAccount:           number;
      accountsReceivable:       number;
      inventory:                number;
      prepaidExpenses:          number;
      total:                    number;
    };
    nonCurrent: {
      property:         number;
      equipment:        number;
      investments:      number;
      intangibleAssets: number;
      total:            number;
    };
    total: number;
  };

  liabilities: {
    current: {
      accountsPayable:  number;
      shortTermDebt:    number;
      accruedExpenses:  number;
      vatPayable:       number;
      whtPayable:       number;
      payeTaxPayable:   number;
      total:            number;
    };
    nonCurrent: {
      longTermDebt:     number;
      deferredTax:      number;
      leaseObligations: number;
      total:            number;
    };
    total: number;
  };

  equity: {
    commonStock:               number;
    retainedEarnings:          number; // plug: Assets − L − knownEquity
    otherComprehensiveIncome:  number;
    total:                     number;
  };

  balanceDiscrepancy: number;

  analytics: {
    workingCapital:  number;
    currentRatio:    number;
    quickRatio:      number;
    debtToEquity:    number;
    totalAssets:     number;
    totalLiabilities:number;
    totalEquity:     number;
  };
}

// ── Cash Flow

export interface CashFlowItem {
  description:  string;
  amount:       number;
  category:     'operating' | 'investing' | 'financing' | 'tax' | 'forex';
  type:         'inflow' | 'outflow';
  indentLevel:  number;
  isTotal?:     boolean;
}

export interface CashFlowData {
  period: Date;
  operatingActivities:  CashFlowItem[];
  investingActivities:  CashFlowItem[];
  financingActivities:  CashFlowItem[];

  summaryTotals: {
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    netCashFlow:       number;
    openingBalance:    number;
    closingBalance:    number;
    freeCashFlow:      number;
  };

  reconciliation: {
    netIncome:               number;
    depreciation:            number;
    amortization:            number;
    gainOnDisposal:          number;
    changesInWorkingCapital: number;
    calculatedOperatingCash: number;
  };

  taxBreakdown: {
    cit:          number;
    vat:          number;
    wht:          number;
    educationTax: number;
    naseniLevy:   number;
    total:        number;
  };
}

// ── Tax Summary 

export interface TaxSummaryData {
  period: string;

  vat: {
    outputVAT:     number;
    inputVAT:      number;
    netVATPayable: number;
    totalSales:    number;
    totalPurchases:number;
  };

  wht: {
    totalWithheld: number;
    at5pct:        number;
    at10pct:       number;
  };

  cit: {
    turnover:         number;
    assessableProfit: number;
    rate:             number;
    citCharge:        number;
    educationTax:     number;
    naseniLevy:       number;
    totalLiability:   number;
  };

  complianceScore: number;

  deferredTax: {
    deductibleDifferences: number;
    taxableDifferences:    number;
    citRate:               number;
    netDTA:                number;
    netDTL:                number;
    netPosition:           number;
  };

  inputVATRecoverability: {
    totalInputVAT:         number;
    recoverableInputVAT:   number;
    nonRecoverableInputVAT:number;
    recoverabilityRate:    number;
  };
}

// ── Dashboard

export interface DashboardMetrics {
  totalRevenue:       number;
  revenueGrowth:      number; // % MoM
  grossProfit:        number;
  grossProfitMargin:  number;
  ebitda:             number;
  ebitdaMargin:       number;
  netIncome:          number;
  netProfitMargin:    number;
  totalAssets:        number;
  totalLiabilities:   number;
  totalEquity:        number;
  operatingCashFlow:  number;
  freeCashFlow:       number;
  accountsReceivable: number;
  workingCapital:     number;
  currentRatio:       number;
}



// ── Nigerian tax rates 
const VAT_RATE            = 0.075;   // VATA 2019 as amended
const CIT_RATE_LARGE      = 0.30;    // CITA — large company (turnover ≥ ₦100M)
const EDUCATION_TAX_RATE  = 0.025;   // TETFUND Act 2011
const NASENI_RATE         = 0.0025;  // Finance Act 2023

//  Income Statement raw line items 
//    All expense amounts are NEGATIVE (standard accounting sign convention).
//    Fields: [name, actual, prevPeriod, budget, prevYear]

const RAW_REVENUE: [string, number, number, number, number][] = [
  ['Product Sales',       3_125_000, 2_812_500, 3_000_000, 2_500_000],
  ['Service Revenue',       375_000,   337_500,   360_000,   300_000],
  ['Subscription Income',   345_000,   310_500,   330_000,   275_000],
  ['Other Revenue',          35_000,    31_500,    34_000,    28_000],
];

const RAW_COGS: [string, number, number, number, number][] = [
  ['Cost of Products Sold',  -262_500, -236_250, -250_000, -210_000],
  ['Direct Labor',           -235_000, -211_500, -225_000, -190_000],
  ['Manufacturing Overhead', -215_000, -193_500, -205_000, -180_000],
];

const RAW_ADMIN: [string, number, number, number, number][] = [
  ['Office Supply',          -262_500, -236_250, -250_000, -210_000],
  ['Professional Services',  -235_000, -211_500, -250_000, -200_000],
  ['Insurance',              -215_000, -193_500, -250_000, -180_000],
];

const RAW_SALARIES: [string, number, number, number, number][] = [
  ['Salaries & Wages',       -157_600, -141_840, -150_000, -130_000],
  ['Benefits',               -157_600, -141_840, -150_000, -130_000],
  ['Payroll Taxes',          -157_600, -141_840, -150_000, -130_000],
  ['Training & Development', -157_600, -141_840, -150_000, -130_000],
];

const RAW_MAINTENANCE: [string, number, number, number, number][] = [
  ['Building Maintenance',  -16_000, -14_400, -15_000, -12_000],
  ['Repairs',               -16_000, -14_400, -15_000, -12_000],
  ['Equipment Maintenance', -16_000, -14_400, -15_000, -12_000],
];

const RAW_LOGISTICS: [string, number, number, number, number][] = [
  ['Shipping & Freight',     -19_000, -17_100, -18_000, -15_000],
  ['Distribution Costs',     -19_000, -17_100, -18_000, -15_000],
  ['Travel & Entertainment', -19_000, -17_100, -18_000, -15_000],
];

const RAW_OTHER_OPEX: [string, number, number, number, number][] = [
  ['Rent',                        -214_200, -192_780, -200_000, -180_000],
  ['Marketing & Advertising',     -131_800, -118_620, -120_000, -100_000],
  ['Utilities',                   -131_800, -118_620, -120_000, -100_000],
  ['Depreciation & Amortization', -131_800, -118_620, -120_000, -100_000],
];

const RAW_OTHER_ITEMS: [string, number, number, number, number][] = [
  ['Interest Income',        11_500,  10_350,  10_000,   8_000],
  ['Interest Expense',      -13_200, -11_880, -12_000, -10_000],
  ['Gain on Sale of Assets', 12_800,  11_520,  10_000,   8_000],
];

// D&A is embedded in RAW_OTHER_OPEX row [3] — store the amount for EBITDA add-back
const DA_AMOUNT_ACTUAL     = 131_800;
const DA_AMOUNT_PREV        =  118_620;
const DA_AMOUNT_BUDGET      =  120_000;
const DA_AMOUNT_PREV_YEAR   =  100_000;

// ── Monthly trend data (chart only) 
const MONTHLY_TREND = {
  labels:   ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  revenue:  [230_000, 235_000, 240_000, 245_000, 248_000, 250_000],
  expenses: [195_000, 198_000, 200_000, 203_000, 205_000, 207_500],
  profit:   [ 35_000,  37_000,  40_000,  42_000,  43_000,  42_500],
};

// ── Balance Sheet raw figures 
const RAW_BS = {
  assets: {
    current: {
      cash:                   45_000_000,
      cashOnHand:             20_000_000,
      regularCheckingAccount: 50_000_000,
      payrollCheckingAccount: 25_000_000,
      savingsAccount:         35_000_000,
      accountsReceivable:     75_000_000,
      inventory:              30_000_000,
      prepaidExpenses:        15_000_000,
    },
    nonCurrent: {
      property:         120_000_000,
      equipment:         45_000_000,
      investments:       30_000_000,
      intangibleAssets:  18_000_000,
    },
  },
  liabilities: {
    current: {
      accountsPayable:  40_000_000,
      shortTermDebt:    25_000_000,
      accruedExpenses:  15_000_000,
      vatPayable:        6_375_000,
      whtPayable:        3_500_000,
      payeTaxPayable:    4_200_000,
    },
    nonCurrent: {
      longTermDebt:     80_000_000,
      deferredTax:      12_000_000,
      leaseObligations: 18_000_000,
    },
  },
  equity: {
    commonStock:              200_000_000,
    otherComprehensiveIncome:  18_000_000,
    // retainedEarnings is computed as plug (see buildBalanceSheet)
  },
};

// ── Cash Flow raw figures 
const RAW_CF = {
  grossCustomerReceipts:        17_630_000,
  supplierAndEmployeePayments: -12_200_000,
  inputVATAmount:                  380_000,
  whtRemitted:                    -400_000,
  citPaid:                      -1_200_000,
  educationTaxPaid:               -250_000,
  capitalExpenditure:           -1_500_000,
  assetDisposalProceeds:           250_000,
  longTermInvestments:            -450_000, // net purchase
  loanRepayment:                  -500_000,
  dividendsPaid:                  -150_000,
  newBorrowings:                   550_000,
  openingCashBalance:            5_000_000,
  depreciation:                    850_000,
  gainOnDisposal:                       0,
  workingCapitalChanges:          -250_000,
};

// ── Tax Summary raw figures 
const RAW_TAX = {
  vat: {
    outputVAT:      247_500,
    inputVAT:       116_250,
    totalSales:   3_300_000,
    totalPurchases:1_550_000,
  },
  wht: {
    at5pct:   25_000,
    at10pct: 300_000,
  },
  cit: {
    turnover:         160_000_000,
    assessableProfit:  16_000_000,
  },
  complianceScore: 78,
  deferredTax: {
    deductibleDifferences:  5_000_000,
    taxableDifferences:     8_000_000,
  },
  inputVATRecoverability: {
    totalInputVAT:         116_250,
    recoverableInputVAT:    93_750,
    nonRecoverableInputVAT: 22_500,
  },
};


function toItems(raw: [string, number, number, number, number][]): FinancialLineItem[] {
  return raw.map(([name, amount, prevAmount, budget, prevYearAmount]) => ({
    name, amount, prevAmount, budget, prevYearAmount,
  }));
}

function sumField(
  items: FinancialLineItem[],
  field: keyof Pick<FinancialLineItem, 'amount' | 'prevAmount' | 'budget' | 'prevYearAmount'>,
): number {
  return items.reduce((s, i) => s + i[field], 0);
}

function fourWay(
  items: FinancialLineItem[],
): { actual: number; prev: number; budget: number; prevYear: number } {
  return {
    actual:   sumField(items, 'amount'),
    prev:     sumField(items, 'prevAmount'),
    budget:   sumField(items, 'budget'),
    prevYear: sumField(items, 'prevYearAmount'),
  };
}

function add4(
  a: { actual: number; prev: number; budget: number; prevYear: number },
  b: { actual: number; prev: number; budget: number; prevYear: number },
): { actual: number; prev: number; budget: number; prevYear: number } {
  return {
    actual:   a.actual   + b.actual,
    prev:     a.prev     + b.prev,
    budget:   a.budget   + b.budget,
    prevYear: a.prevYear + b.prevYear,
  };
}

function negate4(
  v: { actual: number; prev: number; budget: number; prevYear: number },
): { actual: number; prev: number; budget: number; prevYear: number } {
  return { actual: -v.actual, prev: -v.prev, budget: -v.budget, prevYear: -v.prevYear };
}

function pctOf(numerator: number, denominator: number): number {
  return denominator !== 0 ? (numerator / denominator) * 100 : 0;
}

function growthPct(current: number, prior: number): number {
  return prior !== 0 ? ((current - prior) / Math.abs(prior)) * 100 : 0;
}

function maxZero(v: number): number { return Math.max(v, 0); }

// SERVICE

@Injectable({ providedIn: 'root' })
export class AccountingService {

  // ── Internal period state
  private _period$ = new BehaviorSubject<Date>(new Date(2025, 4, 1)); // May 2025

  get period$(): Observable<Date> { return this._period$.asObservable(); }

  setPeriod(date: Date): void { this._period$.next(date); }

  // PUBLIC API


  getIncomeStatement(): Observable<IncomeStatementData> {
    return this._period$.pipe(
      map(period => this.buildIncomeStatement(period)),
      shareReplay(1),
    );
  }

  getBalanceSheet(): Observable<BalanceSheetData> {
    return this._period$.pipe(
      map(period => this.buildBalanceSheet(period)),
      shareReplay(1),
    );
  }

  getCashFlow(): Observable<CashFlowData> {
    return this._period$.pipe(
      map(period => this.buildCashFlow(period)),
      shareReplay(1),
    );
  }

  getTaxSummary(): Observable<TaxSummaryData> {
    return this._period$.pipe(
      map(period => this.buildTaxSummary(period)),
      shareReplay(1),
    );
  }


  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this._period$.pipe(
      map(period => {
        const is = this.buildIncomeStatement(period);
        const bs = this.buildBalanceSheet(period);
        const cf = this.buildCashFlow(period);

        return {
          totalRevenue:      is.totals.revenue.actual,
          revenueGrowth:     is.ratios.revenueGrowthMoM,
          grossProfit:       is.totals.grossProfit.actual,
          grossProfitMargin: is.ratios.grossProfitMargin,
          ebitda:            is.totals.ebitda.actual,
          ebitdaMargin:      is.ratios.ebitdaMargin,
          netIncome:         is.totals.netIncome.actual,
          netProfitMargin:   is.ratios.netProfitMargin,
          totalAssets:       bs.assets.total,
          totalLiabilities:  bs.liabilities.total,
          totalEquity:       bs.equity.total,
          operatingCashFlow: cf.summaryTotals.operatingCashFlow,
          freeCashFlow:      cf.summaryTotals.freeCashFlow,
          accountsReceivable:bs.assets.current.accountsReceivable,
          workingCapital:    bs.analytics.workingCapital,
          currentRatio:      bs.analytics.currentRatio,
        } as DashboardMetrics;
      }),
      shareReplay(1),
    );
  }

  // PRIVATE BUILDERS

  private buildIncomeStatement(period: Date): IncomeStatementData {

    // ── 1  Line item arrays
    const revenue               = toItems(RAW_REVENUE);
    const cogs                  = toItems(RAW_COGS);
    const administrativeExpenses= toItems(RAW_ADMIN);
    const salariesWages         = toItems(RAW_SALARIES);
    const maintenance           = toItems(RAW_MAINTENANCE);
    const logisticsDistribution = toItems(RAW_LOGISTICS);
    const otherOperatingExpenses= toItems(RAW_OTHER_OPEX);
    const otherItems            = toItems(RAW_OTHER_ITEMS);

    //  Four-way totals per group
    const tRevenue  = fourWay(revenue);
    const tCOGS     = fourWay(cogs);     // negative values
    const tAdmin    = fourWay(administrativeExpenses);
    const tSal      = fourWay(salariesWages);
    const tMaint    = fourWay(maintenance);
    const tLog      = fourWay(logisticsDistribution);
    const tOtherOp  = fourWay(otherOperatingExpenses);
    const tOther    = fourWay(otherItems);

    //   Derived totals 

    // COGS is negative; grossProfit = revenue + cogs (negative adds correctly)
    const tGrossProfit = add4(tRevenue, tCOGS);

    // All opex groups are already negative
    const tTotalOpEx = add4(add4(add4(tAdmin, tSal), add4(tMaint, tLog)), tOtherOp);

    // EBIT = GrossProfit + OpEx (both sides already signed)
    const tEBIT = add4(tGrossProfit, tTotalOpEx);

    // D&A four-way (for EBITDA add-back)
    const tDA = {
      actual:   DA_AMOUNT_ACTUAL,
      prev:     DA_AMOUNT_PREV,
      budget:   DA_AMOUNT_BUDGET,
      prevYear: DA_AMOUNT_PREV_YEAR,
    };

    // EBITDA = EBIT + D&A (D&A is a positive add-back because EBIT already includes it as a negative)
    const tEBITDA = add4(tEBIT, tDA);

    // NIBT = EBIT + other non-operating items
    const tNIBT = add4(tEBIT, tOther);

    // Tax — computed on NIBT (before tax), floored at 0 (no tax on loss)
    const calcTax = (nibt: number) => ({
      cit:  -(maxZero(nibt) * CIT_RATE_LARGE),
      edu:  -(maxZero(nibt) * EDUCATION_TAX_RATE),
      nas:  -(maxZero(nibt) * NASENI_RATE),
      total: -(maxZero(nibt) * (CIT_RATE_LARGE + EDUCATION_TAX_RATE + NASENI_RATE)),
    });

    const taxActual   = calcTax(tNIBT.actual);
    const taxPrev     = calcTax(tNIBT.prev);
    const taxBudget   = calcTax(tNIBT.budget);
    const taxPrevYear = calcTax(tNIBT.prevYear);

    const tCIT        = { actual: taxActual.cit,   prev: taxPrev.cit,   budget: taxBudget.cit,   prevYear: taxPrevYear.cit   };
    const tEduTax     = { actual: taxActual.edu,   prev: taxPrev.edu,   budget: taxBudget.edu,   prevYear: taxPrevYear.edu   };
    const tNaseni     = { actual: taxActual.nas,   prev: taxPrev.nas,   budget: taxBudget.nas,   prevYear: taxPrevYear.nas   };
    const tTotalTax   = { actual: taxActual.total, prev: taxPrev.total, budget: taxBudget.total, prevYear: taxPrevYear.total };

    const tNetIncome  = add4(tNIBT, tTotalTax);

    //  Ratios 
    const ratios = {
      grossProfitMargin: pctOf(tGrossProfit.actual, tRevenue.actual),
      ebitdaMargin:      pctOf(tEBITDA.actual,      tRevenue.actual),
      netProfitMargin:   pctOf(tNetIncome.actual,   tRevenue.actual),
      revenueGrowthMoM:  growthPct(tRevenue.actual, tRevenue.prev),
      grossProfitGrowth: growthPct(tGrossProfit.actual, tGrossProfit.prev),
    };

    // Expense distribution (for donut chart, absolute values)
    const expenseDistribution = {
      administrative:           Math.abs(tAdmin.actual),
      salariesAndWages:         Math.abs(tSal.actual),
      maintenance:              Math.abs(tMaint.actual),
      logisticsAndDistribution: Math.abs(tLog.actual),
      otherOperatingExpenses:   Math.abs(tOtherOp.actual),
    };

    return {
      period,
      revenue,
      cogs,
      administrativeExpenses,
      salariesWages,
      maintenance,
      logisticsDistribution,
      otherOperatingExpenses,
      otherItems,
      totals: {
        revenue:      tRevenue,
        cogs:         tCOGS,
        grossProfit:  tGrossProfit,
        adminExpenses:tAdmin,
        salariesWages:tSal,
        maintenance:  tMaint,
        logistics:    tLog,
        otherOpEx:    tOtherOp,
        totalOpEx:    tTotalOpEx,
        ebit:         tEBIT,
        ebitda:       tEBITDA,
        otherItems:   tOther,
        nibt:         tNIBT,
        cit:          tCIT,
        educationTax: tEduTax,
        naseniLevy:   tNaseni,
        totalTax:     tTotalTax,
        netIncome:    tNetIncome,
      },
      ratios,
      monthlyTrend:             MONTHLY_TREND,
      expenseDistribution,
      depreciationAndAmortization: DA_AMOUNT_ACTUAL,
    };
  }

  private buildBalanceSheet(period: Date): BalanceSheetData {
    const is = this.buildIncomeStatement(period);
    const netIncome = is.totals.netIncome.actual;

    // Current assets
    const ca = RAW_BS.assets.current;
    const caTotal =
      ca.cash + ca.cashOnHand + ca.regularCheckingAccount +
      ca.payrollCheckingAccount + ca.savingsAccount +
      ca.accountsReceivable + ca.inventory + ca.prepaidExpenses;

    // Non-current assets
    const nca = RAW_BS.assets.nonCurrent;
    const ncaTotal = nca.property + nca.equipment + nca.investments + nca.intangibleAssets;

    const assetsTotal = caTotal + ncaTotal;

    // Current liabilities
    const cl = RAW_BS.liabilities.current;
    const clTotal =
      cl.accountsPayable + cl.shortTermDebt + cl.accruedExpenses +
      cl.vatPayable + cl.whtPayable + cl.payeTaxPayable;

    // Non-current liabilities
    const ncl = RAW_BS.liabilities.nonCurrent;
    const nclTotal = ncl.longTermDebt + ncl.deferredTax + ncl.leaseObligations;

    const liabTotal = clTotal + nclTotal;

    // Equity — retained earnings as balancing plug (IFRS approach)
    const knownEquity =
      RAW_BS.equity.commonStock + RAW_BS.equity.otherComprehensiveIncome;
    const retainedEarnings = assetsTotal - liabTotal - knownEquity;
    const equityTotal = knownEquity + retainedEarnings;

    const balanceDiscrepancy = assetsTotal - (liabTotal + equityTotal);

    // Analytics
    const workingCapital = caTotal - clTotal;
    const currentRatio   = clTotal !== 0 ? caTotal / clTotal : 0;
    const quickRatio     = clTotal !== 0 ? (caTotal - ca.inventory) / clTotal : 0;
    const debtToEquity   = equityTotal !== 0 ? liabTotal / equityTotal : 0;

    return {
      asOfDate: period,
      entityName: 'Acme Corporation Ltd.',
      assets: {
        current:    { ...ca, total: caTotal },
        nonCurrent: { ...nca, total: ncaTotal },
        total: assetsTotal,
      },
      liabilities: {
        current:    { ...cl, total: clTotal },
        nonCurrent: { ...ncl, total: nclTotal },
        total: liabTotal,
      },
      equity: {
        commonStock:              RAW_BS.equity.commonStock,
        retainedEarnings,
        otherComprehensiveIncome: RAW_BS.equity.otherComprehensiveIncome,
        total: equityTotal,
      },
      balanceDiscrepancy,
      analytics: {
        workingCapital,
        currentRatio,
        quickRatio,
        debtToEquity,
        totalAssets:      assetsTotal,
        totalLiabilities: liabTotal,
        totalEquity:      equityTotal,
      },
    };
  }

  private buildCashFlow(period: Date): CashFlowData {
    const is = this.buildIncomeStatement(period);

    // ── VAT mechanics 
    const outputVAT    = Math.round(RAW_CF.grossCustomerReceipts * (VAT_RATE / (1 + VAT_RATE)));
    const netReceipts  = RAW_CF.grossCustomerReceipts - outputVAT;
    const netVATPayable= -(outputVAT - RAW_CF.inputVATAmount);

    // ── Operating activities 
    const operating: CashFlowItem[] = [
      { description: 'Customer Receipts (net of VAT)',      amount: netReceipts,                        category: 'operating', type: 'inflow',  indentLevel: 1 },
      { description: 'Payments to Suppliers & Employees',   amount: RAW_CF.supplierAndEmployeePayments, category: 'operating', type: 'outflow', indentLevel: 1 },
      { description: 'Net VAT Remittance to FIRS',          amount: netVATPayable,                      category: 'operating', type: 'outflow', indentLevel: 1 },
      { description: 'WHT Remitted to FIRS',                amount: RAW_CF.whtRemitted,                 category: 'operating', type: 'outflow', indentLevel: 1 },
      { description: 'CIT Paid',                            amount: RAW_CF.citPaid,                     category: 'operating', type: 'outflow', indentLevel: 1 },
      { description: 'Education Tax Paid',                  amount: RAW_CF.educationTaxPaid,            category: 'operating', type: 'outflow', indentLevel: 1 },
    ];

    const operatingCashFlow = operating.reduce((s, i) => s + i.amount, 0);

    operating.push({ description: 'Net Cash from Operating Activities', amount: operatingCashFlow, category: 'operating', type: operatingCashFlow >= 0 ? 'inflow' : 'outflow', indentLevel: 0, isTotal: true });

    // ── Investing activities
    const investing: CashFlowItem[] = [
      { description: 'Capital Expenditure',              amount: RAW_CF.capitalExpenditure,   category: 'investing', type: 'outflow', indentLevel: 1 },
      { description: 'Proceeds from Asset Disposals',   amount: RAW_CF.assetDisposalProceeds, category: 'investing', type: 'inflow',  indentLevel: 1 },
      { description: 'Long-term Investments (net)',      amount: RAW_CF.longTermInvestments,   category: 'investing', type: 'outflow', indentLevel: 1 },
    ];

    const investingCashFlow = investing.reduce((s, i) => s + i.amount, 0);
    investing.push({ description: 'Net Cash from Investing Activities', amount: investingCashFlow, category: 'investing', type: investingCashFlow >= 0 ? 'inflow' : 'outflow', indentLevel: 0, isTotal: true });

    // ── Financing activities 
    const financing: CashFlowItem[] = [
      { description: 'Loan Repayments',   amount: RAW_CF.loanRepayment,    category: 'financing', type: 'outflow', indentLevel: 1 },
      { description: 'Dividends Paid',    amount: RAW_CF.dividendsPaid,    category: 'financing', type: 'outflow', indentLevel: 1 },
      { description: 'New Borrowings',    amount: RAW_CF.newBorrowings,    category: 'financing', type: 'inflow',  indentLevel: 1 },
    ];

    const financingCashFlow = financing.reduce((s, i) => s + i.amount, 0);
    financing.push({ description: 'Net Cash from Financing Activities', amount: financingCashFlow, category: 'financing', type: financingCashFlow >= 0 ? 'inflow' : 'outflow', indentLevel: 0, isTotal: true });

    // ── Summary 
    const netCashFlow     = operatingCashFlow + investingCashFlow + financingCashFlow;
    const openingBalance  = RAW_CF.openingCashBalance;
    const closingBalance  = openingBalance + netCashFlow;
    const freeCashFlow    = operatingCashFlow + RAW_CF.capitalExpenditure; // capex is already negative

    // ── Indirect reconciliation 
    const netIncome = is.totals.netIncome.actual;
    const calculatedOperatingCash =
      netIncome + RAW_CF.depreciation + RAW_CF.gainOnDisposal + RAW_CF.workingCapitalChanges;

    return {
      period,
      operatingActivities:  operating,
      investingActivities:  investing,
      financingActivities:  financing,
      summaryTotals: {
        operatingCashFlow,
        investingCashFlow,
        financingCashFlow,
        netCashFlow,
        openingBalance,
        closingBalance,
        freeCashFlow,
      },
      reconciliation: {
        netIncome,
        depreciation:            RAW_CF.depreciation,
        amortization:            0,
        gainOnDisposal:          RAW_CF.gainOnDisposal,
        changesInWorkingCapital: RAW_CF.workingCapitalChanges,
        calculatedOperatingCash,
      },
      taxBreakdown: {
        cit:          Math.abs(RAW_CF.citPaid),
        vat:          Math.abs(netVATPayable),
        wht:          Math.abs(RAW_CF.whtRemitted),
        educationTax: Math.abs(RAW_CF.educationTaxPaid),
        naseniLevy:   0,
        total: Math.abs(RAW_CF.citPaid) + Math.abs(netVATPayable) +
               Math.abs(RAW_CF.whtRemitted) + Math.abs(RAW_CF.educationTaxPaid),
      },
    };
  }

  private buildTaxSummary(period: Date): TaxSummaryData {
    const is = this.buildIncomeStatement(period);

    const { vat, wht, cit, complianceScore, deferredTax, inputVATRecoverability } = RAW_TAX;

    // CIT derives from IS net-income-before-tax — single source
    const nibt            = is.totals.nibt.actual;
    const citCharge       = maxZero(nibt) * CIT_RATE_LARGE;
    const educationTax    = maxZero(nibt) * EDUCATION_TAX_RATE;
    const naseniLevy      = maxZero(nibt) * NASENI_RATE;
    const totalCITLiab    = citCharge + educationTax + naseniLevy;

    // Deferred tax
    const citRate  = CIT_RATE_LARGE;
    const netDTA   = deferredTax.deductibleDifferences  * citRate;
    const netDTL   = deferredTax.taxableDifferences     * citRate;
    const netPos   = netDTA - netDTL;

    // Input VAT recoverability rate
    const recoverabilityRate =
      inputVATRecoverability.totalInputVAT !== 0
        ? inputVATRecoverability.recoverableInputVAT / inputVATRecoverability.totalInputVAT
        : 1;

    return {
      period: period.toISOString().slice(0, 7),
      vat: {
        outputVAT:     vat.outputVAT,
        inputVAT:      vat.inputVAT,
        netVATPayable: vat.outputVAT - vat.inputVAT,
        totalSales:    vat.totalSales,
        totalPurchases:vat.totalPurchases,
      },
      wht: {
        totalWithheld: wht.at5pct + wht.at10pct,
        at5pct:        wht.at5pct,
        at10pct:       wht.at10pct,
      },
      cit: {
        turnover:         cit.turnover,
        assessableProfit: nibt,          // ← IS value, not a separate hardcode
        rate:             CIT_RATE_LARGE,
        citCharge,
        educationTax,
        naseniLevy,
        totalLiability:   totalCITLiab,
      },
      complianceScore,
      deferredTax: {
        deductibleDifferences: deferredTax.deductibleDifferences,
        taxableDifferences:    deferredTax.taxableDifferences,
        citRate,
        netDTA,
        netDTL,
        netPosition: netPos,
      },
      inputVATRecoverability: {
        totalInputVAT:         inputVATRecoverability.totalInputVAT,
        recoverableInputVAT:   inputVATRecoverability.recoverableInputVAT,
        nonRecoverableInputVAT:inputVATRecoverability.nonRecoverableInputVAT,
        recoverabilityRate,
      },
    };
  }
}