/**
 * report.dto.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all report-related data transfer objects.
 *
 * Architecture principle:
 *   Backend API → These DTOs → AccountingService → Components → UI
 *
 * Naming conventions:
 *   - *DTO      = raw data contract with backend API
 *   - *ViewModel = UI-ready shape assembled by the service layer
 *   - *Summary   = compact aggregate used in header cards / dashboards
 *
 * Every field name follows domain-driven naming:
 *   - No generic names like "data", "item", "value" without context
 *   - Monetary fields are plain `number` (currency is always NGN unless noted)
 *   - Dates are ISO-8601 strings on the wire; components receive Date objects
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Shared Enumerations ──────────────────────────────────────────────────────

export enum AccountType {
  ASSET     = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY    = 'EQUITY',
  INCOME    = 'INCOME',
  EXPENSE   = 'EXPENSE',
}

export enum JournalEntryStatus {
  DRAFT    = 'DRAFT',
  POSTED   = 'POSTED',
  REVERSED = 'REVERSED',
}

export enum TransactionReviewStatus {
  PENDING  = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ReconciliationStatus {
  PENDING    = 'PENDING',
  MATCHED    = 'MATCHED',
  RECONCILED = 'RECONCILED',
}

export enum SourceModule {
  POS         = 'POS',
  HR          = 'HR',
  BANK        = 'BANK',
  PROCUREMENT = 'PROCUREMENT',
  ACCOUNTING  = 'ACCOUNTING',
  TAX         = 'TAX',
}

export enum CashFlowCategory {
  OPERATING = 'operating',
  INVESTING  = 'investing',
  FINANCING  = 'financing',
}

export enum TaxType {
  VAT  = 'VAT',
  WHT  = 'WHT',
  CIT  = 'CIT',
  EDT  = 'EDT',   // Education Tax
  PAYE = 'PAYE',
  NASENI = 'NASENI',
}

export enum FilingStatus {
  FILED   = 'filed',
  PENDING = 'pending',
  OVERDUE = 'overdue',
}

export type ReportPeriodType = 'monthly' | 'quarterly' | 'yearly';

// ─── Primitive Building Blocks ────────────────────────────────────────────────

/** A single GL account as returned by the chart-of-accounts endpoint. */
export interface AccountDTO {
  id:           string;
  code:         string;
  name:         string;
  type:         AccountType;
  sourceModule: SourceModule;
  normalBalance: 'DEBIT' | 'CREDIT';
}

/** A posted or unposted accounting transaction header. */
export interface AccountingTransactionDTO {
  id:              string;
  reference:       string;
  sourceModule:    SourceModule;
  transactionDate: string;         // ISO-8601
  description:     string;
  amount:          number;
  reviewStatus:    TransactionReviewStatus;
  journalEntryId:  string;
}

/** Journal entry header (one per accounting transaction). */
export interface JournalEntryDTO {
  id:            string;
  transactionId: string;
  entryDate:     string;           // ISO-8601
  description:   string;
  status:        JournalEntryStatus;
}

/** A single debit/credit line within a journal entry. */
export interface JournalEntryLineDTO {
  id:             string;
  journalEntryId: string;
  accountId:      string;
  description:    string;
  debitAmount:    number;
  creditAmount:   number;
}

/** Bank transaction linked to an accounting transaction. */
export interface BankTransactionDTO {
  id:              string;
  transactionId:   string;
  bankAccountName: string;
  transactionDate: string;         // ISO-8601
  description:     string;
  amount:          number;
}

/** Bank reconciliation record for a bank transaction. */
export interface BankReconciliationDTO {
  id:                   string;
  bankTransactionId:    string;
  reconciliationDate:   string;    // ISO-8601
  status:               ReconciliationStatus;
  statementReference:   string;
}

// ─── Report Metadata ──────────────────────────────────────────────────────────

/**
 * ReportContextDTO
 * Describes the conditions under which a financial statement was generated.
 * Replaces the vague "metadata" concept with an explicit domain name.
 * Every report page derives its "Report Details" section from this DTO.
 */
export interface ReportContextDTO {
  generatedAt:              string;    // ISO-8601
  generatedBy:              string;    // user ID or "System"
  periodStart:              string;    // ISO-8601 — first day of period
  periodEnd:                string;    // ISO-8601 — last day of period
  reportPeriodType:         ReportPeriodType;
  sourceModules:            SourceModule[];
  includedTransactionIds:   string[];
  entityName:               string;
  currencyCode:             string;    // e.g. "NGN"
  reportVersion:            string;    // e.g. "1.0"
  complianceFramework:      string;    // e.g. "IFRS / CAMA 2020"
}

// ─── Account Balance (used across Balance Sheet + Income Statement) ───────────

export interface AccountBalanceDTO {
  accountId:    string;
  accountCode:  string;
  accountName:  string;
  accountType:  AccountType;
  balance:      number;
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export interface BalanceSheetReportDTO {
  reportDate:       string;              // ISO-8601 — as-of date
  assets:           AccountBalanceDTO[];
  liabilities:      AccountBalanceDTO[];
  equity:           AccountBalanceDTO[];
  totalAssets:      number;
  totalLiabilities: number;
  totalEquity:      number;
  isBalanced:       boolean;             // Assets ≈ L + E (within ₦0.01)
  reportContext:    ReportContextDTO;
}

// ─── Income Statement ─────────────────────────────────────────────────────────

/**
 * A financial line item with four comparison columns.
 * Used for every row in the income statement table.
 */
export interface FinancialLineItemDTO {
  name:           string;
  actualAmount:   number;
  previousAmount: number;
  budgetAmount:   number;
  priorYearAmount:number;
}

/**
 * Four-column aggregate used for every subtotal / total row.
 * Keeps the pattern consistent: always actual / previous / budget / priorYear.
 */
export interface PeriodComparisonDTO {
  actualAmount:   number;
  previousAmount: number;
  budgetAmount:   number;
  priorYearAmount:number;
}

export interface IncomeStatementTotalsDTO {
  revenue:       PeriodComparisonDTO;
  cogs:          PeriodComparisonDTO;
  grossProfit:   PeriodComparisonDTO;
  adminExpenses: PeriodComparisonDTO;
  salariesWages: PeriodComparisonDTO;
  maintenance:   PeriodComparisonDTO;
  logistics:     PeriodComparisonDTO;
  otherOpEx:     PeriodComparisonDTO;
  totalOpEx:     PeriodComparisonDTO;
  ebit:          PeriodComparisonDTO;
  ebitda:        PeriodComparisonDTO;
  otherItems:    PeriodComparisonDTO;
  nibt:          PeriodComparisonDTO;   // Net Income Before Tax
  cit:           PeriodComparisonDTO;
  educationTax:  PeriodComparisonDTO;
  naseniLevy:    PeriodComparisonDTO;
  totalTax:      PeriodComparisonDTO;
  netIncome:     PeriodComparisonDTO;
}

export interface IncomeStatementRatiosDTO {
  grossProfitMarginPct:  number;
  ebitdaMarginPct:       number;
  netProfitMarginPct:    number;
  revenueGrowthMoMPct:   number;
  grossProfitGrowthPct:  number;
}

/** Chart data bundled inside the income statement DTO — avoids second API call. */
export interface MonthlyTrendDTO {
  periodLabels:   string[];   // e.g. ["Jan", "Feb", …]
  revenueAmounts: number[];
  expenseAmounts: number[];
  profitAmounts:  number[];
}

export interface ExpenseDistributionDTO {
  administrative:           number;
  salariesAndWages:         number;
  maintenance:              number;
  logisticsAndDistribution: number;
  otherOperatingExpenses:   number;
}

export interface IncomeStatementReportDTO {
  reportPeriod:                  Date;
  revenue:                       FinancialLineItemDTO[];
  cogs:                          FinancialLineItemDTO[];
  administrativeExpenses:        FinancialLineItemDTO[];
  salariesAndWages:              FinancialLineItemDTO[];
  maintenance:                   FinancialLineItemDTO[];
  logisticsAndDistribution:      FinancialLineItemDTO[];
  otherOperatingExpenses:        FinancialLineItemDTO[];
  otherItems:                    FinancialLineItemDTO[];
  totals:                        IncomeStatementTotalsDTO;
  ratios:                        IncomeStatementRatiosDTO;
  monthlyTrend:                  MonthlyTrendDTO;
  expenseDistribution:           ExpenseDistributionDTO;
  depreciationAndAmortization:   number;
  reportContext:                 ReportContextDTO;
}

// ─── Cash Flow ────────────────────────────────────────────────────────────────

export interface CashFlowLineItemDTO {
  description:  string;
  amount:       number;
  category:     CashFlowCategory;
  flowDirection: 'inflow' | 'outflow';
  indentLevel:  number;       // 0 = section total, 1 = line item, 2 = sub-item
  isSubtotal:   boolean;
  sourceModule?: SourceModule;
}

export interface CashFlowSummaryDTO {
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow:       number;
  openingBalance:    number;
  closingBalance:    number;
  freeCashFlow:      number;
}

export interface CashFlowReconciliationDTO {
  netIncome:               number;
  addBackDepreciation:     number;
  addBackAmortization:     number;
  deductGainOnDisposal:    number;
  changesInWorkingCapital: number;
  calculatedOperatingCash: number;
}

export interface WorkingCapitalChangeDTO {
  accountName:      string;
  accountCode:      string;
  changeAmount:     number;
  effectType:       'source' | 'use';   // source = cash inflow effect
}

export interface TaxCashFlowBreakdownDTO {
  companiesIncomeTax:  number;
  valueAddedTax:       number;
  withholdingTax:      number;
  educationTax:        number;
  naseniLevy:          number;
  totalTaxPaid:        number;
}

export interface PeriodComparisonSummaryDTO {
  currentPeriodAmount:  number;
  priorPeriodAmount:    number;
  changeAmount:         number;
  changePercentage:     number;
}

export interface CashFlowReportDTO {
  reportPeriod:          Date;
  operatingActivities:   CashFlowLineItemDTO[];
  investingActivities:   CashFlowLineItemDTO[];
  financingActivities:   CashFlowLineItemDTO[];
  summary:               CashFlowSummaryDTO;
  indirectReconciliation:CashFlowReconciliationDTO;
  workingCapitalChanges: WorkingCapitalChangeDTO[];
  taxCashFlowBreakdown:  TaxCashFlowBreakdownDTO;
  vatOutputAmount:       number;    // Gross output VAT collected
  vatInputRecoverable:   number;    // Input VAT credit offset
  periodComparisons:     {
    netCashFlow:       PeriodComparisonSummaryDTO;
    operatingCashFlow: PeriodComparisonSummaryDTO;
    investingCashFlow: PeriodComparisonSummaryDTO;
    financingCashFlow: PeriodComparisonSummaryDTO;
  };
  reportContext:         ReportContextDTO;
}

// ─── Tax Summary ──────────────────────────────────────────────────────────────

/** A single transaction-level tax line, linked to source documents. */
export interface TaxLineItemDTO {
  id:             string;
  taxType:        TaxType;
  description:    string;
  baseAmount:     number;
  taxAmount:      number;
  effectiveRate:  number;       // decimal e.g. 0.075
  direction:      'input' | 'output';
  glAccountCode:  string;
  sourceModule:   SourceModule;
  transactionDate:string;       // ISO-8601
  reportingPeriod:string;       // "YYYY-MM"
  vendorName?:    string;
  referenceNumber?:string;
}

export interface VatSummaryDTO {
  outputVAT:      number;
  inputVAT:       number;
  netVatPayable:  number;
  totalVatableSales:    number;
  totalVatablePurchases:number;
  effectiveRate:  number;
}

export interface WhtSummaryDTO {
  totalWithheld:   number;
  atFivePercent:   number;   // renamed from at5pct — domain-readable
  atTenPercent:    number;   // renamed from at10pct
  rateBreakdown: {
    rate:         string;
    description:  string;
    transactionCount: number;
    totalAmount:  number;
  }[];
}

export interface CitSummaryDTO {
  annualTurnover:       number;
  assessableProfit:     number;
  applicableRate:       number;   // e.g. 0.30
  companiesIncomeTax:   number;
  educationTaxLevy:     number;   // renamed from educationTax
  naseniLevy:           number;
  totalCitLiability:    number;
}

export interface PayeEmployeeDTO {
  employeeName:        string;
  grossSalary:         number;
  pensionDeduction:    number;
  nhfDeduction:        number;
  taxableIncome:       number;
  payeDeducted:        number;
  netSalary:           number;
}

export interface PitTaxBandDTO {
  bandLabel:    string;
  incomeRange:  string;
  taxRate:      string;
  legalBasis:   string;
}

export interface FilingRecordDTO {
  taxType:        TaxType;
  reportingPeriod:string;       // "YYYY-MM" or "YYYY-QN"
  filingStatus:   FilingStatus;
  filedDate?:     string;       // ISO-8601, present when filed
  taxAmountDue:   number;
  firsReference:  string;
}

export interface TaxComplianceCheckDTO {
  checkLabel:   string;
  isPassed:     boolean;
  severity:     'info' | 'warning' | 'error';
  detail:       string;
}

export interface DeferredTaxDTO {
  deductibleTemporaryDifferences: number;
  taxableTemporaryDifferences:    number;
  applicableCitRate:              number;
  deferredTaxAsset:               number;    // renamed from netDTA
  deferredTaxLiability:           number;    // renamed from netDTL
  netDeferredTaxPosition:         number;
}

export interface InputVatRecoverabilityDTO {
  totalInputVat:          number;
  recoverableInputVat:    number;
  nonRecoverableInputVat: number;
  recoverabilityRate:     number;   // decimal 0–1
}

export interface MonthlyTaxTrendDTO {
  periodLabel:  string;
  vatAmount:    number;
  whtAmount:    number;
  payeAmount:   number;
}

export interface TaxSummaryReportDTO {
  reportingPeriod:        string;       // "YYYY-MM"
  vat:                    VatSummaryDTO;
  wht:                    WhtSummaryDTO;
  cit:                    CitSummaryDTO;
  paye: {
    employees:            PayeEmployeeDTO[];
    totalPayeDeducted:    number;
    taxBands:             PitTaxBandDTO[];
  };
  complianceScore:        number;       // 0–100
  complianceChecks:       TaxComplianceCheckDTO[];
  taxLineItems:           TaxLineItemDTO[];
  filingHistory:          FilingRecordDTO[];
  monthlyTaxTrend:        MonthlyTaxTrendDTO[];
  deferredTax:            DeferredTaxDTO;
  inputVatRecoverability: InputVatRecoverabilityDTO;
  reportContext:          ReportContextDTO;
}

// ─── Dashboard / Cross-Report Aggregates ─────────────────────────────────────

export interface DashboardMetricsDTO {
  totalRevenue:          number;
  revenueGrowthMoMPct:   number;
  grossProfit:           number;
  grossProfitMarginPct:  number;
  ebitda:                number;
  ebitdaMarginPct:       number;
  netIncome:             number;
  netProfitMarginPct:    number;
  totalAssets:           number;
  totalLiabilities:      number;
  totalEquity:           number;
  operatingCashFlow:     number;
  freeCashFlow:          number;
  accountsReceivable:    number;
  workingCapital:        number;
  currentRatio:          number;
}

export interface SavedReportSnapshotDTO {
  id:           string;
  reportLabel:  string;
  reportType:   'income-statement' | 'balance-sheet' | 'cash-flow' | 'tax-summary';
  periodType:   ReportPeriodType;
  periodLabel:  string;
  periodStart:  string;
  periodEnd:    string;
  savedAt:      string;
  summaryTotal: number;
}