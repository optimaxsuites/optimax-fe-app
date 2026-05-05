import { Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountingFormatService } from '../../../core/services/accounting-format.service';
import { AccountingService } from '../../../core/services/accounting.service';
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
  fallbackNotices: string[] = [];

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
    return !!this.incomeStatementReport || !!this.cashFlowReport;
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
    isFallback?: boolean;
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
        subtitle: 'Saved monthly snapshots from the Balance Sheet module only',
        primaryValue: this.filteredMonthlyBalanceSheets.length
          ? `${this.filteredMonthlyBalanceSheets.length} snapshot${this.filteredMonthlyBalanceSheets.length > 1 ? 's' : ''}`
          : 'No snapshot',
        state: this.filteredMonthlyBalanceSheets.length ? 'ready' : 'empty',
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

  onFilterChange(): void {
    this.loadReports();
  }

  private loadReports(): void {
    this.loading = true;
    this.errorMessage = '';

    const { start, end } = this.getSelectedPeriodRange();
    this.accountingService.setPeriod(start);

    const request = {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      reportPeriodType: this.selectedPeriodType,
    };

    combineLatest([
      this.accountingService.getIncomeStatementReport(request),
      this.accountingService.getCashFlowReport(request),
      this.accountingService.getBalanceSheetReport(request),
      this.accountingService.getYearlyTaxSummary(this.selectedYear),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ([incomeStatementReport, cashFlowReport, balanceSheetReport, yearlyTax]) => {
          this.incomeStatementReport = incomeStatementReport;
          this.cashFlowReport = cashFlowReport;
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

  private toStatementRows(items: FinancialLineItemDTO[], section: string): Array<{ label: string; amount: number }> {
    return (items ?? []).map((item) => ({
      label: `${section} · ${item.name}`,
      amount: item.actualAmount,
    }));
  }

  private getSelectedPeriodRange(): { start: Date; end: Date } {
    if (this.selectedPeriodType === 'monthly') {
      return {
        start: new Date(this.selectedYear, this.selectedMonth, 1),
        end: new Date(this.selectedYear, this.selectedMonth + 1, 0),
      };
    }

    if (this.selectedPeriodType === 'quarterly') {
      const quarterIndex = this.quarters.indexOf(this.selectedQuarter);
      const startMonth = quarterIndex * 3;
      return {
        start: new Date(this.selectedYear, startMonth, 1),
        end: new Date(this.selectedYear, startMonth + 3, 0),
      };
    }

    return {
      start: new Date(this.selectedYear, 0, 1),
      end: new Date(this.selectedYear, 11, 31),
    };
  }
}
