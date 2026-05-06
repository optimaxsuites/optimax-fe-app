import { Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountingFormatService } from '../../../core/services/accounting-format.service';
import { AccountingService, LedgerEntryRaw } from '../../../core/services/accounting.service';
import {
  AccountingTransactionDTO,
  BalanceSheetReportDTO,
  CashFlowLineItemDTO,
  CashFlowReportDTO,
  FinancialLineItemDTO,
  IncomeStatementReportDTO,
  ReportContextDTO,
  ReportPeriodType,
  SavedReportSnapshotDTO,
} from '../reports/report.dto';

interface AnnualTaxRow {
  monthLabel: string;
  amount: number;
}

type FocusedReport = 'financial-statement' | 'balance-sheet' | 'annual-tax';

@Component({
  selector: 'app-accounting-reports',
  templateUrl: './accounting-reports.component.html',
  styleUrls: ['./accounting-reports.component.scss'],
})
export class AccountingReportsComponent implements OnInit, OnDestroy {
  readonly currentYear = new Date().getFullYear();
  readonly years = [this.currentYear - 1, this.currentYear, this.currentYear + 1];
  readonly quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  readonly months = Array.from({ length: 12 }, (_, month) => ({
    value: month,
    label: new Date(2025, month, 1).toLocaleString('en-US', { month: 'long' }),
  }));

  selectedPeriodType: ReportPeriodType = 'quarterly';
  selectedYear = this.currentYear;
  selectedQuarter = this.quarters[Math.floor(new Date().getMonth() / 3)];
  selectedMonth = new Date().getMonth();
  focusedReport: FocusedReport = 'financial-statement';

  loading = true;
  errorMessage = '';

  incomeStatementReport: IncomeStatementReportDTO | null = null;
  cashFlowReport: CashFlowReportDTO | null = null;
  balanceSheetReport: BalanceSheetReportDTO | null = null;
  annualTaxRows: AnnualTaxRow[] = [];
  annualTaxTotal = 0;
  transactions: AccountingTransactionDTO[] = [];
  savedBalanceSheetReports: SavedReportSnapshotDTO[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly accountingService: AccountingService,
    readonly fmt: AccountingFormatService,
  ) {}

  ngOnInit(): void {
    this.loadSavedBalanceSheetReports();
    this.accountingService.getAccountingTransactions()
      .pipe(takeUntil(this.destroy$))
      .subscribe((transactions: AccountingTransactionDTO[]) => {
        this.transactions = transactions;
      });
    this.loadReports();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get periodLabel(): string {
    if (this.selectedPeriodType === 'monthly') {
      return `${this.months[this.selectedMonth].label} ${this.selectedYear}`;
    }

    if (this.selectedPeriodType === 'quarterly') {
      return `${this.selectedQuarter} ${this.selectedYear}`;
    }

    return `${this.selectedYear}`;
  }

  get hasFinancialStatementData(): boolean {
    return this.incomeStatementRows.length > 0 || this.cashFlowRows.length > 0;
  }

  get totalIncomeAmount(): number {
    return this.sumActualAmounts(this.incomeStatementReport?.revenue);
  }

  get totalExpenseAmount(): number {
    if (!this.incomeStatementReport) {
      return 0;
    }

    return Math.abs(
      this.sumActualAmounts(this.incomeStatementReport.cogs) +
      this.sumActualAmounts(this.incomeStatementReport.administrativeExpenses) +
      this.sumActualAmounts(this.incomeStatementReport.salariesAndWages) +
      this.sumActualAmounts(this.incomeStatementReport.maintenance) +
      this.sumActualAmounts(this.incomeStatementReport.logisticsAndDistribution) +
      this.sumActualAmounts(this.incomeStatementReport.otherOperatingExpenses),
    );
  }

  get netProfitAmount(): number {
    return this.incomeStatementReport?.totals.netIncome.actualAmount ?? 0;
  }

  get netCashFlowAmount(): number {
    return this.cashFlowReport?.summary.netCashFlow ?? 0;
  }

  get incomeStatementRows(): Array<{ label: string; amount: number }> {
    if (!this.incomeStatementReport) {
      return [];
    }

    return [
      ...this.toStatementRows(this.incomeStatementReport.revenue, 'Revenue'),
      ...this.toStatementRows(this.incomeStatementReport.cogs, 'Cost of Sales'),
      ...this.toStatementRows(this.incomeStatementReport.administrativeExpenses, 'Administrative Expenses'),
      ...this.toStatementRows(this.incomeStatementReport.salariesAndWages, 'Salaries and Wages'),
      ...this.toStatementRows(this.incomeStatementReport.maintenance, 'Maintenance'),
      ...this.toStatementRows(this.incomeStatementReport.logisticsAndDistribution, 'Logistics and Distribution'),
      ...this.toStatementRows(this.incomeStatementReport.otherOperatingExpenses, 'Other Operating Expenses'),
      ...this.toStatementRows(this.incomeStatementReport.otherItems, 'Other Items'),
    ];
  }

  get cashFlowRows(): CashFlowLineItemDTO[] {
    if (!this.cashFlowReport) {
      return [];
    }

    return [
      ...this.cashFlowReport.operatingActivities,
      ...this.cashFlowReport.investingActivities,
      ...this.cashFlowReport.financingActivities,
    ];
  }

  get metadataSourceModulesLabel(): string {
    return this.currentMetadata?.sourceModules?.join(', ') ?? '';
  }

  get filteredMonthlyBalanceSheets(): SavedReportSnapshotDTO[] {
    return this.savedBalanceSheetReports.filter((snapshot) => {
      const reportDate = new Date(snapshot.periodEnd);
      return reportDate.getFullYear() === this.selectedYear &&
        reportDate.getMonth() === this.selectedMonth;
    });
  }

  get currentMetadata(): ReportContextDTO | null {
    if (this.focusedReport === 'annual-tax') {
      return null;
    }

    return this.incomeStatementReport?.reportContext ?? this.cashFlowReport?.reportContext ?? null;
  }

  get metadataTransactions(): AccountingTransactionDTO[] {
    const metadata = this.currentMetadata;
    if (!metadata) {
      return [];
    }

    const includedIds = new Set(metadata.includedTransactionIds.map((id) => String(id)));
    return this.transactions.filter((transaction) => includedIds.has(String(transaction.id)));
  }

  get reportCards(): Array<{
    key: FocusedReport;
    title: string;
    subtitle: string;
    primaryValue: string;
    state: 'ready' | 'empty';
  }> {
    return [
      {
        key: 'financial-statement',
        title: 'Financial Statement',
        subtitle: `Income statement and cash flow for ${this.periodLabel}`,
        primaryValue: this.hasFinancialStatementData
          ? this.fmt.formatCurrency(this.netProfitAmount)
          : 'No data',
        state: this.hasFinancialStatementData ? 'ready' : 'empty',
      },
      {
        key: 'balance-sheet',
        title: 'Monthly Balance Sheet',
        subtitle: `Statement of financial position for ${this.periodLabel}`,
        primaryValue: this.balanceSheetReport && this.hasBalanceSheetData(this.balanceSheetReport)
          ? this.fmt.formatCurrency(this.sumBalances(this.balanceSheetReport.assets))
          : 'No data',
        state: this.balanceSheetReport && this.hasBalanceSheetData(this.balanceSheetReport) ? 'ready' : 'empty',
      },
      {
        key: 'annual-tax',
        title: 'Annual Tax Report',
        subtitle: `Yearly aggregation for ${this.selectedYear}`,
        primaryValue: this.annualTaxTotal ? this.fmt.formatCurrency(this.annualTaxTotal) : 'No data',
        state: this.annualTaxTotal ? 'ready' : 'empty',
      },
    ];
  }

  changeFocusedReport(key: FocusedReport): void {
    this.focusedReport = key;
  }

  toDatePipeValue(value: string | number[]): string | Date {
    if (Array.isArray(value)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0, nanos = 0] = value;
      return new Date(year, month - 1, day, hour, minute, second, Math.floor(nanos / 1_000_000));
    }

    return value;
  }

  onFilterChange(): void {
    this.loadReports();
  }

  private loadReports(): void {
    this.loading = true;
    this.errorMessage = '';

    const { start, end } = this.getSelectedPeriodRange();
    this.accountingService.setPeriod(start);

    const request = {
      periodStart: this.toBackendLocalDateTime(start),
      periodEnd: this.toBackendLocalDateTime(end),
      reportPeriodType: this.selectedPeriodType,
    };

    combineLatest([
      this.accountingService.getIncomeStatementReport(request),
      this.accountingService.getCashFlowReport(request),
      this.accountingService.getBalanceSheetReport(request),
      this.accountingService.getAccountingTransactions(),
      this.accountingService.getLedgerEntries(),
      this.accountingService.getYearlyTaxSummary(this.selectedYear),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([incomeStatementReport, cashFlowReport, balanceSheetReport, transactions, ledgerEntries, yearlyTax]) => {
          this.transactions = transactions;
          this.incomeStatementReport = this.withDerivedIncomeStatement(incomeStatementReport, transactions);
          this.cashFlowReport = this.withDerivedCashFlow(cashFlowReport, ledgerEntries, request.periodStart, request.periodEnd);
          this.balanceSheetReport = balanceSheetReport;
          this.annualTaxRows = (yearlyTax.byMonth ?? []).map((entry: { month: number; amount: number }) => ({
            monthLabel: new Date(this.selectedYear, entry.month, 1).toLocaleString('en-US', { month: 'short' }),
            amount: entry.amount,
          }));
          this.annualTaxTotal = yearlyTax.total ?? 0;
          this.loading = false;
        },
        error: () => {
          this.errorMessage = 'Unable to load report data for the selected period.';
          this.loading = false;
        },
      });
  }

  private loadSavedBalanceSheetReports(): void {
    this.accountingService.getSavedReportSnapshots(1, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.savedBalanceSheetReports = result.content
          .filter((snapshot) => snapshot.reportType === 'balance-sheet');
      });
  }

  private sumActualAmounts(items: FinancialLineItemDTO[] | null | undefined): number {
    return items?.reduce((sum, item) => sum + item.actualAmount, 0) ?? 0;
  }

  private hasBalanceSheetData(report: BalanceSheetReportDTO): boolean {
    return report.assets.length > 0 ||
      report.liabilities.length > 0 ||
      report.equity.length > 0 ||
      report.reportContext.includedTransactionIds.length > 0;
  }

  private sumBalances(items: Array<{ balance: number }>): number {
    return items.reduce((sum, item) => sum + item.balance, 0);
  }

  private withDerivedIncomeStatement(
    report: IncomeStatementReportDTO,
    transactions: AccountingTransactionDTO[],
  ): IncomeStatementReportDTO {
    const hasBackendLines = [
      report.revenue,
      report.cogs,
      report.administrativeExpenses,
      report.salariesAndWages,
      report.maintenance,
      report.logisticsAndDistribution,
      report.otherOperatingExpenses,
      report.otherItems,
    ].some((items) => items.length > 0);

    if (hasBackendLines) {
      return report;
    }

    const includedIds = new Set(report.reportContext.includedTransactionIds.map((id) => String(id)));
    const includedTransactions = transactions.filter((transaction) => includedIds.has(String(transaction.id)));

    if (!includedTransactions.length) {
      return report;
    }

    const revenue = includedTransactions
      .map((transaction) => {
        const approvedAmount = this.numberFromMetadata(transaction, 'approvedAmount');
        const amount = Number(transaction.amount) || 0;
        const interestAmount = approvedAmount !== null ? Math.max(amount - approvedAmount, 0) : 0;
        return interestAmount > 0
          ? this.toFinancialLineItem(`Interest income - ${transaction.description || transaction.transactionReference || transaction.id}`, interestAmount)
          : null;
      })
      .filter((item): item is FinancialLineItemDTO => !!item);

    const otherItems = includedTransactions
      .map((transaction) => {
        const approvedAmount = this.numberFromMetadata(transaction, 'approvedAmount');
        const amount = Number(transaction.amount) || 0;
        const principalAmount = approvedAmount !== null ? approvedAmount : amount;
        return principalAmount > 0
          ? this.toFinancialLineItem(`Loan principal activity - ${transaction.description || transaction.transactionReference || transaction.id}`, -principalAmount)
          : null;
      })
      .filter((item): item is FinancialLineItemDTO => !!item);

    const revenueTotal = this.sumActualAmounts(revenue);
    const otherTotal = this.sumActualAmounts(otherItems);
    const totals = JSON.parse(JSON.stringify(report.totals)) as IncomeStatementReportDTO['totals'];
    totals.revenue.actualAmount = revenueTotal;
    totals.grossProfit.actualAmount = revenueTotal;
    totals.otherItems.actualAmount = otherTotal;
    totals.ebit.actualAmount = revenueTotal + otherTotal;
    totals.ebitda.actualAmount = revenueTotal + otherTotal;
    totals.nibt.actualAmount = revenueTotal + otherTotal;
    totals.netIncome.actualAmount = revenueTotal + otherTotal;

    return {
      ...report,
      revenue,
      otherItems,
      totals,
      monthlyTrend: {
        ...report.monthlyTrend,
        revenueAmounts: [revenueTotal],
        expenseAmounts: [Math.abs(otherTotal)],
        profitAmounts: [revenueTotal + otherTotal],
      },
    };
  }

  private withDerivedCashFlow(
    report: CashFlowReportDTO,
    ledgerEntries: LedgerEntryRaw[],
    periodStart: string,
    periodEnd: string,
  ): CashFlowReportDTO {
    if (report.operatingActivities.length || report.investingActivities.length || report.financingActivities.length) {
      return report;
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const operatingActivities = ledgerEntries
      .filter((entry) => this.isCashAccount(entry))
      .filter((entry) => {
        const entryDate = this.toDatePipeValue(entry.entryDate) as Date;
        return entryDate >= start && entryDate <= end;
      })
      .map((entry) => {
        const amount = Number(entry.debit || 0) - Number(entry.credit || 0);
        const line = entry.journalEntryLine as { description?: string } | null;
        return {
          description: line?.description || `${entry.account.accountName} ledger movement`,
          amount,
          category: 'operating' as CashFlowLineItemDTO['category'],
          flowDirection: amount >= 0 ? 'inflow' : 'outflow',
          indentLevel: 1,
          isSubtotal: false,
        };
      });

    if (!operatingActivities.length) {
      return report;
    }

    const operatingCashFlow = operatingActivities.reduce((sum, item) => sum + item.amount, 0);
    return {
      ...report,
      operatingActivities,
      summary: {
        ...report.summary,
        operatingCashFlow,
        netCashFlow: operatingCashFlow,
        freeCashFlow: operatingCashFlow,
        closingBalance: (report.summary.openingBalance ?? 0) + operatingCashFlow,
      },
    };
  }

  private toFinancialLineItem(name: string, actualAmount: number): FinancialLineItemDTO {
    return { name, actualAmount, previousAmount: 0, budgetAmount: 0, priorYearAmount: 0 };
  }

  private numberFromMetadata(transaction: AccountingTransactionDTO, key: string): number | null {
    const parsed = Number(transaction.metadata?.[key]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isCashAccount(entry: LedgerEntryRaw): boolean {
    const accountName = entry.account?.accountName?.toLowerCase() ?? '';
    const accountCode = String(entry.account?.accountCode ?? '');
    return accountName.includes('cash') || accountName.includes('bank') || accountCode.startsWith('10');
  }

  private toStatementRows(items: FinancialLineItemDTO[], section: string): Array<{ label: string; amount: number }> {
    return (items ?? []).map((item) => ({
      label: `${section} · ${item.name}`,
      amount: item.actualAmount,
    }));
  }

  private getSelectedPeriodRange(): { start: Date; end: Date } {
    if (this.selectedPeriodType === 'monthly') {
      return {
        start: new Date(this.selectedYear, this.selectedMonth, 1, 0, 0, 0, 0),
        end: new Date(this.selectedYear, this.selectedMonth + 1, 0, 23, 59, 59, 999),
      };
    }

    if (this.selectedPeriodType === 'quarterly') {
      const quarterIndex = this.quarters.indexOf(this.selectedQuarter);
      const startMonth = quarterIndex * 3;
      return {
        start: new Date(this.selectedYear, startMonth, 1, 0, 0, 0, 0),
        end: new Date(this.selectedYear, startMonth + 3, 0, 23, 59, 59, 999),
      };
    }

    return {
      start: new Date(this.selectedYear, 0, 1, 0, 0, 0, 0),
      end: new Date(this.selectedYear, 11, 31, 23, 59, 59, 999),
    };
  }

  private toBackendLocalDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
  }
}
