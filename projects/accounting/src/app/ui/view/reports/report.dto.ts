export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

export enum TransactionReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ReconciliationStatus {
  PENDING = 'PENDING',
  MATCHED = 'MATCHED',
  RECONCILED = 'RECONCILED',
}

export enum SourceModule {
  POS = 'POS',
  HR = 'HR',
  BANK = 'BANK',
  PROCUREMENT = 'PROCUREMENT',
  ACCOUNTING = 'ACCOUNTING',
  TAX = 'TAX',
  MANUAL = 'MANUAL',
  EXPENSE = 'EXPENSE',
  HOSPITALITY = 'HOSPITALITY',
}

export enum CashFlowCategory {
  OPERATING = 'operating',
  INVESTING = 'investing',
  FINANCING = 'financing',
}

export enum TaxType {
  VAT = 'VAT',
  WHT = 'WHT',
  CIT = 'CIT',
  EDT = 'EDT',
  PAYE = 'PAYE',
  NASENI = 'NASENI',
}

export enum FilingStatus {
  FILED = 'FILED',
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE',
}

export type ReportPeriodType = 'monthly' | 'quarterly' | 'yearly';

export interface UserDTO {
  id: number;
  fullname: string;
  userId?: number;
  email?: string;
  phoneNumber?: string;
  username?: string;
  clientType?: string;
  gender?: string;
  accountId?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface AccountDTO {
  id: string | number;
  accountCode?: string | number;
  accountName?: string;
  accountType?: AccountType;
  parentAccountId?: number | null;
  description?: string;
  currency?: string;
  active?: boolean;
  createdBy?: UserDTO | number | null;
  createdAt?: string;
  code?: string;
  name?: string;
  type?: AccountType;
  sourceModule?: SourceModule;
  normalBalance?: 'DEBIT' | 'CREDIT';
}

export interface AccountingTransactionDTO {
  id: string | number;
  reference?: string;
  transactionReference?: string;
  sourceModule: SourceModule;
  transactionDate: string;
  description: string;
  amount: number;
  reviewStatus?: TransactionReviewStatus;
  status?: TransactionReviewStatus;
  journalEntryId?: string | number;
  currency?: string;
  externalReference?: string;
  accountId?: AccountDTO | string | number;
  createdBy?: UserDTO | number | null;
  createdAt?: string;
}

export interface JournalEntryDTO {
  id: string | number;
  transactionId: string | number | AccountingTransactionDTO;
  entryDate: string;
  description: string;
  status: JournalEntryStatus;
  entryNumber?: number;
  createdAt?: string;
}

export interface JournalEntryLineDTO {
  id: string | number;
  journalEntryId: string | number | JournalEntryDTO;
  accountId: string | number | AccountDTO;
  description: string;
  debitAmount: number;
  creditAmount: number;
  createdBy?: UserDTO | number | null;
}

export interface BankTransactionDTO {
  id: string | number;
  transactionId?: string | number;
  bankAccountName?: string;
  bankAccountId?: AccountDTO | string | number;
  externalReference?: string;
  transactionDate: string;
  description: string;
  amount: number;
  currencyCode?: string;
  transactionType?: 'DEBIT' | 'CREDIT';
  status?: ReconciliationStatus;
  source?: string;
  createdBy?: UserDTO | number | null;
  createdAt?: string;
}

export interface BankReconciliationDTO {
  id: string | number;
  bankTransactionId?: string | number;
  bankAccountId?: AccountDTO | string | number;
  reconciliationDate?: string;
  statementDate?: string;
  openingBalance?: number;
  closingBalance?: number;
  status: ReconciliationStatus;
  statementReference?: string;
  createdBy?: UserDTO | number | null;
  createdAt?: string;
}

export interface ReportRequestDTO {
  periodStart: string;
  periodEnd: string;
  reportPeriodType: ReportPeriodType;
  entityId?: string;
  sourceModules: SourceModule[];
  currencyCode?: string;
  includeTransactionIds?: boolean;
  includeDrilldown?: boolean;
}

export interface ReportContextDTO {
  generatedAt: string;
  generatedBy: UserDTO | string | number;
  periodStart: string;
  periodEnd: string;
  reportPeriodType: ReportPeriodType;
  sourceModules: SourceModule[];
  includedTransactionIds: Array<string | number>;
  entityName: string;
  currencyCode: string;
  reportVersion: string;
  complianceFramework: string;
}

export interface AccountBalanceDTO {
  account?: AccountDTO;
  accountId?: string | number;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  balance: number;
}

export interface BalanceSheetReportDTO {
  reportDate: string;
  assets: AccountBalanceDTO[];
  liabilities: AccountBalanceDTO[];
  equity: AccountBalanceDTO[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
  reportContext: ReportContextDTO;
}

export interface FinancialLineItemDTO {
  name: string;
  actualAmount: number;
  previousAmount: number;
  budgetAmount: number;
  priorYearAmount: number;
}

export interface PeriodComparisonDTO {
  actualAmount: number;
  previousAmount: number;
  budgetAmount: number;
  priorYearAmount: number;
}

export interface IncomeStatementTotalsDTO {
  revenue: PeriodComparisonDTO;
  cogs: PeriodComparisonDTO;
  grossProfit: PeriodComparisonDTO;
  adminExpenses: PeriodComparisonDTO;
  salariesWages: PeriodComparisonDTO;
  maintenance: PeriodComparisonDTO;
  logistics: PeriodComparisonDTO;
  otherOpEx: PeriodComparisonDTO;
  totalOpEx: PeriodComparisonDTO;
  ebit: PeriodComparisonDTO;
  ebitda: PeriodComparisonDTO;
  otherItems: PeriodComparisonDTO;
  nibt: PeriodComparisonDTO;
  cit: PeriodComparisonDTO;
  educationTaxLevy: PeriodComparisonDTO;
  naseniLevy: PeriodComparisonDTO;
  totalTax: PeriodComparisonDTO;
  netIncome: PeriodComparisonDTO;
}

export interface IncomeStatementRatiosDTO {
  grossProfitMarginPct: number;
  ebitdaMarginPct: number;
  netProfitMarginPct: number;
  revenueGrowthMoMPct: number;
  grossProfitGrowthPct: number;
}

export interface MonthlyTrendDTO {
  periodLabels: string[];
  revenueAmounts: number[];
  expenseAmounts: number[];
  profitAmounts: number[];
}

export interface ExpenseDistributionDTO {
  administrative: number;
  salariesAndWages: number;
  maintenance: number;
  logisticsAndDistribution: number;
  otherOperatingExpenses: number;
}

export interface IncomeStatementReportDTO {
  reportPeriod: string;
  revenue: FinancialLineItemDTO[];
  cogs: FinancialLineItemDTO[];
  administrativeExpenses: FinancialLineItemDTO[];
  salariesAndWages: FinancialLineItemDTO[];
  maintenance: FinancialLineItemDTO[];
  logisticsAndDistribution: FinancialLineItemDTO[];
  otherOperatingExpenses: FinancialLineItemDTO[];
  otherItems: FinancialLineItemDTO[];
  totals: IncomeStatementTotalsDTO;
  ratios: IncomeStatementRatiosDTO;
  monthlyTrend: MonthlyTrendDTO;
  expenseDistribution: ExpenseDistributionDTO;
  depreciationAndAmortization: number;
  reportContext: ReportContextDTO;
}

export interface CashFlowLineItemDTO {
  description: string;
  amount: number;
  category: CashFlowCategory;
  flowDirection: 'inflow' | 'outflow' | string;
  indentLevel: number;
  isSubtotal: boolean;
  sourceModule?: SourceModule;
}

export interface CashFlowSummaryDTO {
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  openingBalance: number;
  closingBalance: number;
  freeCashFlow: number;
}

export interface CashFlowReconciliationDTO {
  netIncome: number;
  addBackDepreciation: number;
  addBackAmortization: number;
  deductGainOnDisposal: number;
  changesInWorkingCapital: number;
  calculatedOperatingCash: number;
}

export interface WorkingCapitalChangeDTO {
  accountName: string;
  accountCode: string;
  changeAmount: number;
  effectType: 'source' | 'use' | string;
}

export interface TaxCashFlowBreakdownDTO {
  companiesIncomeTax: number;
  valueAddedTax: number;
  withholdingTax: number;
  educationTaxLevy: number;
  naseniLevy: number;
  totalTaxPaid: number;
}

export interface PeriodComparisonSummaryDTO {
  currentPeriodAmount: number;
  priorPeriodAmount: number;
  changeAmount: number;
  changePercentage: number;
}

export interface CashFlowPeriodComparisonsDTO {
  netCashFlow: PeriodComparisonSummaryDTO;
  operatingCashFlow: PeriodComparisonSummaryDTO;
  investingCashFlow: PeriodComparisonSummaryDTO;
  financingCashFlow: PeriodComparisonSummaryDTO;
}

export interface CashFlowReportDTO {
  reportPeriod: string;
  operatingActivities: CashFlowLineItemDTO[];
  investingActivities: CashFlowLineItemDTO[];
  financingActivities: CashFlowLineItemDTO[];
  summary: CashFlowSummaryDTO;
  indirectReconciliation: CashFlowReconciliationDTO;
  workingCapitalChanges: WorkingCapitalChangeDTO[];
  taxCashFlowBreakdown: TaxCashFlowBreakdownDTO;
  vatOutputAmount: number;
  vatInputRecoverable: number;
  periodComparisons: CashFlowPeriodComparisonsDTO;
  reportContext: ReportContextDTO;
}

export interface TaxLineItemDTO {
  id: string;
  taxType: TaxType;
  description: string;
  baseAmount: number;
  taxAmount: number;
  effectiveRate: number;
  direction: 'input' | 'output' | string;
  glAccountCode: string;
  sourceModule: SourceModule;
  transactionDate: string;
  reportingPeriod: string;
  vendorName?: string;
  referenceNumber?: string;
}

export interface VatSummaryDTO {
  outputVAT: number;
  inputVAT: number;
  netVatPayable: number;
  totalVatableSales: number;
  totalVatablePurchases: number;
  effectiveRate: number;
}

export interface WhtRateBreakdownDTO {
  rateLabel: string;
  amount: number;
  rate?: string;
  description?: string;
  transactionCount?: number;
  totalAmount?: number;
}

export interface WhtSummaryDTO {
  totalWithheld: number;
  atFivePercent: number;
  atTenPercent: number;
  rateBreakdown: WhtRateBreakdownDTO[];
}

export interface CitSummaryDTO {
  annualTurnover: number;
  assessableProfit: number;
  applicableRate: number;
  companiesIncomeTax: number;
  educationTaxLevy: number;
  naseniLevy: number;
  totalCitLiability: number;
}

export interface PayeEmployeeDTO {
  employeeName: string;
  grossSalary: number;
  pensionDeduction: number;
  nhfDeduction: number;
  taxableIncome: number;
  payeDeducted: number;
  netSalary: number;
}

export interface PitTaxBandDTO {
  bandLabel: string;
  incomeRange: string;
  taxRate: string;
  legalBasis: string;
}

export interface PayeSummaryDTO {
  employees: PayeEmployeeDTO[];
  totalGrossSalary: number;
  totalTaxableIncome: number;
  totalPayeDeducted: number;
  taxBands: PitTaxBandDTO[];
}

export interface FilingRecordDTO {
  taxType: TaxType;
  reportingPeriod: string;
  filingStatus: FilingStatus;
  filedDate?: string;
  taxAmountDue: number;
  firsReference: string;
}

export interface TaxComplianceCheckDTO {
  checkLabel: string;
  isPassed: boolean;
  severity: 'info' | 'warning' | 'error' | string;
  detail: string;
}

export interface DeferredTaxDTO {
  deductibleTemporaryDifferences: number;
  taxableTemporaryDifferences: number;
  applicableCitRate: number;
  deferredTaxAsset: number;
  deferredTaxLiability: number;
  netDeferredTaxPosition: number;
}

export interface InputVatRecoverabilityDTO {
  totalInputVat: number;
  recoverableInputVat: number;
  nonRecoverableInputVat: number;
  recoverabilityRate: number;
}

export interface MonthlyTaxTrendDTO {
  periodLabel: string;
  vatAmount: number;
  whtAmount: number;
  payeAmount: number;
}

export interface TaxSummaryReportDTO {
  reportingPeriod: string;
  vat: VatSummaryDTO;
  wht: WhtSummaryDTO;
  cit: CitSummaryDTO;
  paye: PayeSummaryDTO;
  complianceScore: number;
  complianceChecks: TaxComplianceCheckDTO[];
  taxLineItems: TaxLineItemDTO[];
  filingHistory: FilingRecordDTO[];
  monthlyTaxTrend: MonthlyTaxTrendDTO[];
  deferredTax: DeferredTaxDTO;
  inputVatRecoverability: InputVatRecoverabilityDTO;
  reportContext: ReportContextDTO;
}

export interface DashboardMetricsDTO {
  totalRevenue: number;
  revenueGrowthMoMPct: number;
  grossProfit: number;
  grossProfitMarginPct: number;
  ebitda: number;
  ebitdaMarginPct: number;
  netIncome: number;
  netProfitMarginPct: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  accountsReceivable: number;
  workingCapital: number;
  currentRatio: number;
}

export interface SavedReportSnapshotDTO {
  id: string;
  reportLabel: string;
  reportType: string;
  periodType: ReportPeriodType;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  savedAt: string;
  summaryTotal: number;
}

// LedgerEntryDTO — matches the /ledger-entries API response shape
export interface LedgerEntryDTO {
  id: number;
  account?: {
    id: number;
    accountCode: number;
    accountName: string;
    accountType: string;
  };
  journalEntryLine?: unknown | null;
  debit: number;
  credit: number;
  balanceAfter?: number | null;
  currencyCode?: string | null;
  entryDate?: number[];
  createdAt?: unknown | null;
}

export interface PaginationResultDTO<T> {
  content: T[];
  totalSize: number;
  page: number;
  size: number;
}
