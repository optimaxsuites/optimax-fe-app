import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { forkJoin, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import { AccountingFormatService } from '../../../../core/services/accounting-format.service';
import { AccountingService } from '../../../../core/services/accounting.service';
import {
  AccountingTransactionDTO,
  ExpenseDistributionDTO,
  FinancialLineItemDTO,
  IncomeStatementReportDTO,
  MonthlyTrendDTO,
  PeriodComparisonDTO,
} from '../report.dto';

export interface FilterOptions {
  reportType: 'Actual' | 'Budget' | 'Actual vs Budget' | 'Actual vs Previous Year';
  entity: string;
  period: string;
  showPercentages: boolean;
  showVariance: boolean;
  includeForecasts: boolean;
}

export interface Comment {
  id: number;
  author: string;
  text: string;
  timestamp: string;
}

interface FinancialLineItem {
  name: string;
  amount: number;
  prevAmount: number;
  budget: number;
  prevYearAmount: number;
}

interface MonthlyFinancialData {
  labels: string[];
  revenue: number[];
  expenses: number[];
  profit: number[];
}

interface ExpenseDistribution {
  administrative: number;
  salariesAndWages: number;
  maintenance: number;
  logisticsAndDistribution: number;
  otherOperatingExpenses: number;
}

interface IncomeStatementData {
  period: Date;
  revenue: FinancialLineItem[];
  cogs: FinancialLineItem[];
  administrativeExpenses: FinancialLineItem[];
  salariesWages: FinancialLineItem[];
  maintenance: FinancialLineItem[];
  logisticsDistribution: FinancialLineItem[];
  otherOperatingExpenses: FinancialLineItem[];
  otherItems: FinancialLineItem[];
  totals: {
    revenue: { actual: number; prev: number; budget: number; prevYear: number };
    cogs: { actual: number; prev: number; budget: number; prevYear: number };
    grossProfit: { actual: number; prev: number; budget: number; prevYear: number };
    adminExpenses: { actual: number; prev: number; budget: number; prevYear: number };
    salariesWages: { actual: number; prev: number; budget: number; prevYear: number };
    maintenance: { actual: number; prev: number; budget: number; prevYear: number };
    logistics: { actual: number; prev: number; budget: number; prevYear: number };
    otherOpEx: { actual: number; prev: number; budget: number; prevYear: number };
    totalOpEx: { actual: number; prev: number; budget: number; prevYear: number };
    ebit: { actual: number; prev: number; budget: number; prevYear: number };
    ebitda: { actual: number; prev: number; budget: number; prevYear: number };
    otherItems: { actual: number; prev: number; budget: number; prevYear: number };
    nibt: { actual: number; prev: number; budget: number; prevYear: number };
    cit: { actual: number; prev: number; budget: number; prevYear: number };
    educationTax: { actual: number; prev: number; budget: number; prevYear: number };
    naseniLevy: { actual: number; prev: number; budget: number; prevYear: number };
    totalTax: { actual: number; prev: number; budget: number; prevYear: number };
    netIncome: { actual: number; prev: number; budget: number; prevYear: number };
  };
  ratios: {
    revenueGrowthMoM: number;
    grossProfitGrowth: number;
    grossProfitMargin: number;
    ebitdaMargin: number;
    netProfitMargin: number;
  };
  monthlyTrend: MonthlyFinancialData;
  expenseDistribution: ExpenseDistribution;
}

@Component({
  selector: 'app-income-statement',
  templateUrl: './income-statement.component.html',
  styleUrls: ['./income-statement.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomeStatementComponent implements OnInit, OnDestroy {
  @ViewChild('statementContent') statementContent!: ElementRef;

  isSaved = false;
  showCommentsModal = false;
  showShareModal = false;
  showArchivesModal = false;
  Math = Math;

  activeFilters: FilterOptions = {
    reportType: 'Actual',
    entity: 'All Locations',
    period: 'This Month',
    showPercentages: false,
    showVariance: false,
    includeForecasts: false
  };

  data: IncomeStatementData | null = null;
  loading = true;
  errorMessage = '';

  comments: Comment[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly accountingService: AccountingService,
    readonly fmt: AccountingFormatService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  previousMonth(): void {
    const current = this.data?.period ?? new Date();
    this.requestPeriod(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const current = this.data?.period ?? new Date();
    this.requestPeriod(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  onFiltersApplied(filters: FilterOptions): void {
    this.activeFilters = { ...filters };
    this.cdr.markForCheck();
  }

  getDisplayAmount(item: FinancialLineItem): number {
    return this.activeFilters.reportType === 'Budget' ? item.budget : item.amount;
  }

  getComparisonAmount(item: FinancialLineItem): number | null {
    switch (this.activeFilters.reportType) {
      case 'Actual vs Budget':
        return item.budget;
      case 'Actual vs Previous Year':
        return item.prevYearAmount;
      default:
        return null;
    }
  }

  getVariance(item: FinancialLineItem): number | null {
    const comparison = this.getComparisonAmount(item);
    return comparison !== null ? this.getDisplayAmount(item) - comparison : null;
  }

  getVariancePercentage(item: FinancialLineItem): number | null {
    const comparison = this.getComparisonAmount(item);
    return comparison !== null && comparison !== 0
      ? ((this.getDisplayAmount(item) - comparison) / Math.abs(comparison)) * 100
      : null;
  }

  get revenueGrowth(): number {
    return this.data?.ratios.revenueGrowthMoM ?? 0;
  }

  get grossProfitGrowth(): number {
    return this.data?.ratios.grossProfitGrowth ?? 0;
  }

  get cogsGrowth(): number {
    if (!this.data) {
      return 0;
    }

    const previous = this.data.totals.cogs.prev;
    const current = this.data.totals.cogs.actual;
    return previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;
  }

  get operatingExpensesGrowth(): number {
    if (!this.data) {
      return 0;
    }

    const previous = this.data.totals.totalOpEx.prev;
    const current = this.data.totals.totalOpEx.actual;
    return previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0;
  }

  get revenueVariance(): number {
    return this.data ? this.data.totals.revenue.actual - this.data.totals.revenue.budget : 0;
  }

  get cogsVariance(): number {
    return this.data ? this.data.totals.cogs.actual - this.data.totals.cogs.budget : 0;
  }

  get revenueYearOverYearGrowth(): number {
    if (!this.data) {
      return 0;
    }

    const previousYear = this.data.totals.revenue.prevYear;
    const current = this.data.totals.revenue.actual;
    return previousYear !== 0 ? ((current - previousYear) / Math.abs(previousYear)) * 100 : 0;
  }

  get grossProfitMargin(): number {
    return this.data?.ratios.grossProfitMargin ?? 0;
  }

  get operatingMargin(): number {
    if (!this.data || this.data.totals.revenue.actual === 0) {
      return 0;
    }

    return (this.data.totals.ebit.actual / this.data.totals.revenue.actual) * 100;
  }

  get netProfitMargin(): number {
    return this.data?.ratios.netProfitMargin ?? 0;
  }

  get ebitdaMargin(): number {
    return this.data?.ratios.ebitdaMargin ?? 0;
  }

  get effectiveTaxRate(): number {
    if (!this.data) {
      return 0;
    }

    const nibt = this.data.totals.nibt.actual;
    const totalTax = Math.abs(this.data.totals.totalTax.actual);
    return nibt > 0 ? (totalTax / nibt) * 100 : 0;
  }

  get revenueData(): FinancialLineItem[] {
    return this.data?.revenue ?? [];
  }

  get cogsData(): FinancialLineItem[] {
    return this.data?.cogs ?? [];
  }

  get administrativeExpenses(): FinancialLineItem[] {
    return this.data?.administrativeExpenses ?? [];
  }

  get salariesWages(): FinancialLineItem[] {
    return this.data?.salariesWages ?? [];
  }

  get maintenance(): FinancialLineItem[] {
    return this.data?.maintenance ?? [];
  }

  get logisticsDistribution(): FinancialLineItem[] {
    return this.data?.logisticsDistribution ?? [];
  }

  get otherOperatingExpenses(): FinancialLineItem[] {
    return this.data?.otherOperatingExpenses ?? [];
  }

  get otherItems(): FinancialLineItem[] {
    return this.data?.otherItems ?? [];
  }

  get totalRevenue(): number {
    return this.data?.totals.revenue.actual ?? 0;
  }

  get totalBudgetRevenue(): number {
    return this.data?.totals.revenue.budget ?? 0;
  }

  get totalPrevRevenue(): number {
    return this.data?.totals.revenue.prev ?? 0;
  }

  get totalPrevYearRevenue(): number {
    return this.data?.totals.revenue.prevYear ?? 0;
  }

  get totalCOGS(): number {
    return this.data?.totals.cogs.actual ?? 0;
  }

  get totalBudgetCOGS(): number {
    return this.data?.totals.cogs.budget ?? 0;
  }

  get totalPrevCOGS(): number {
    return this.data?.totals.cogs.prev ?? 0;
  }

  get totalPrevYearCOGS(): number {
    return this.data?.totals.cogs.prevYear ?? 0;
  }

  get grossProfit(): number {
    return this.data?.totals.grossProfit.actual ?? 0;
  }

  get budgetGrossProfit(): number {
    return this.data?.totals.grossProfit.budget ?? 0;
  }

  get prevGrossProfit(): number {
    return this.data?.totals.grossProfit.prev ?? 0;
  }

  get prevYearGrossProfit(): number {
    return this.data?.totals.grossProfit.prevYear ?? 0;
  }

  get totalAdministrativeExpenses(): number {
    return this.data?.totals.adminExpenses.actual ?? 0;
  }

  get totalPrevAdministrativeExpenses(): number {
    return this.data?.totals.adminExpenses.prev ?? 0;
  }

  get totalPrevYearAdministrativeExpenses(): number {
    return this.data?.totals.adminExpenses.prevYear ?? 0;
  }

  get totalBudgetAdministrativeExpenses(): number {
    return this.data?.totals.adminExpenses.budget ?? 0;
  }

  get totalSalariesWages(): number {
    return this.data?.totals.salariesWages.actual ?? 0;
  }

  get totalPrevSalariesWages(): number {
    return this.data?.totals.salariesWages.prev ?? 0;
  }

  get totalPrevYearSalariesWages(): number {
    return this.data?.totals.salariesWages.prevYear ?? 0;
  }

  get totalBudgetSalariesWages(): number {
    return this.data?.totals.salariesWages.budget ?? 0;
  }

  get totalMaintenance(): number {
    return this.data?.totals.maintenance.actual ?? 0;
  }

  get totalPrevMaintenance(): number {
    return this.data?.totals.maintenance.prev ?? 0;
  }

  get totalPrevYearMaintenance(): number {
    return this.data?.totals.maintenance.prevYear ?? 0;
  }

  get totalBudgetMaintenance(): number {
    return this.data?.totals.maintenance.budget ?? 0;
  }

  get totalLogisticsDistribution(): number {
    return this.data?.totals.logistics.actual ?? 0;
  }

  get totalPrevLogisticsDistribution(): number {
    return this.data?.totals.logistics.prev ?? 0;
  }

  get totalPrevYearLogisticsDistribution(): number {
    return this.data?.totals.logistics.prevYear ?? 0;
  }

  get totalBudgetLogisticsDistribution(): number {
    return this.data?.totals.logistics.budget ?? 0;
  }

  get totalOtherOperatingExpenses(): number {
    return this.data?.totals.otherOpEx.actual ?? 0;
  }

  get totalPrevOtherOperatingExpenses(): number {
    return this.data?.totals.otherOpEx.prev ?? 0;
  }

  get totalPrevYearOtherOperatingExpenses(): number {
    return this.data?.totals.otherOpEx.prevYear ?? 0;
  }

  get totalBudgetOtherOperatingExpenses(): number {
    return this.data?.totals.otherOpEx.budget ?? 0;
  }

  get totalOperatingExpenses(): number {
    return this.data?.totals.totalOpEx.actual ?? 0;
  }

  get totalPrevOperatingExpenses(): number {
    return this.data?.totals.totalOpEx.prev ?? 0;
  }

  get totalPrevYearOperatingExpenses(): number {
    return this.data?.totals.totalOpEx.prevYear ?? 0;
  }

  get totalBudgetOperatingExpenses(): number {
    return this.data?.totals.totalOpEx.budget ?? 0;
  }

  get operatingIncome(): number {
    return this.data?.totals.ebit.actual ?? 0;
  }

  get prevOperatingIncome(): number {
    return this.data?.totals.ebit.prev ?? 0;
  }

  get prevYearOperatingIncome(): number {
    return this.data?.totals.ebit.prevYear ?? 0;
  }

  get budgetOperatingIncome(): number {
    return this.data?.totals.ebit.budget ?? 0;
  }

  get ebitda(): number {
    return this.data?.totals.ebitda.actual ?? 0;
  }

  get totalOtherItems(): number {
    return this.data?.totals.otherItems.actual ?? 0;
  }

  get netIncomeBeforeTax(): number {
    return this.data?.totals.nibt.actual ?? 0;
  }

  get prevNetIncomeBeforeTax(): number {
    return this.data?.totals.nibt.prev ?? 0;
  }

  get prevYearNetIncomeBeforeTax(): number {
    return this.data?.totals.nibt.prevYear ?? 0;
  }

  get citExpense(): number {
    return this.data?.totals.cit.actual ?? 0;
  }

  get educationTaxExpense(): number {
    return this.data?.totals.educationTax.actual ?? 0;
  }

  get naseniLevy(): number {
    return this.data?.totals.naseniLevy.actual ?? 0;
  }

  get totalTaxExpense(): number {
    return this.data?.totals.totalTax.actual ?? 0;
  }

  get netIncome(): number {
    return this.data?.totals.netIncome.actual ?? 0;
  }

  get monthlyData(): MonthlyFinancialData {
    return this.data?.monthlyTrend ?? {
      labels: [],
      revenue: [],
      expenses: [],
      profit: []
    };
  }

  get expenseDistribution(): ExpenseDistribution {
    return this.data?.expenseDistribution ?? {
      administrative: 0,
      salariesAndWages: 0,
      maintenance: 0,
      logisticsAndDistribution: 0,
      otherOperatingExpenses: 0
    };
  }

  get insights(): Array<{ title: string; description: string; trend: 'positive' | 'negative' }> {
    if (!this.data) {
      return [];
    }

    const insights: Array<{ title: string; description: string; trend: 'positive' | 'negative' }> = [];
    const revenueGrowth = this.revenueGrowth;

    insights.push({
      title: `Revenue ${revenueGrowth >= 0 ? 'increased' : 'decreased'}`,
      description: `Revenue ${revenueGrowth >= 0 ? 'grew' : 'declined'} by ${this.fmt.formatPercentage(Math.abs(revenueGrowth))} vs prior period`,
      trend: revenueGrowth >= 0 ? 'positive' : 'negative'
    });

    if (this.activeFilters.reportType.includes('Budget')) {
      const revenueVariance = this.revenueVariance;
      insights.push({
        title: `Revenue ${revenueVariance >= 0 ? 'exceeded' : 'missed'} budget`,
        description: `Revenue is ${this.fmt.formatCurrency(Math.abs(revenueVariance))} ${revenueVariance >= 0 ? 'above' : 'below'} budget`,
        trend: revenueVariance >= 0 ? 'positive' : 'negative'
      });
    }

    insights.push({
      title: `Gross margin ${this.grossProfitGrowth >= 0 ? 'improved' : 'declined'}`,
      description: `Gross margin at ${this.grossProfitMargin.toFixed(1)}% - EBITDA margin ${this.ebitdaMargin.toFixed(1)}%`,
      trend: this.grossProfitGrowth >= 0 ? 'positive' : 'negative'
    });

    insights.push({
      title: `Operating expenses ${this.operatingExpensesGrowth <= 0 ? 'decreased' : 'increased'}`,
      description: `OpEx changed by ${this.fmt.formatPercentage(Math.abs(this.operatingExpensesGrowth))} - Tax rate: ${this.effectiveTaxRate.toFixed(1)}%`,
      trend: this.operatingExpensesGrowth <= 0 ? 'positive' : 'negative'
    });

    return insights;
  }

  async exportToPDF(): Promise<void> {
    console.warn('PDF export: install jsPDF and html2canvas, then uncomment the implementation.');
  }

  exportToCSV(): void {
    if (!this.data) {
      return;
    }

    const rows: string[][] = [];

    rows.push(['Income Statement Export']);
    rows.push(['Period', this.data.period.toLocaleDateString()]);
    rows.push([]);

    rows.push(['REVENUE']);
    this.data.revenue.forEach((item: FinancialLineItem) => {
      rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
    });
    rows.push(['Total Revenue', this.fmt.formatCurrency(this.data.totals.revenue.actual)]);
    rows.push([]);

    rows.push(['COST OF GOODS SOLD']);
    this.data.cogs.forEach((item: FinancialLineItem) => {
      rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
    });
    rows.push(['Total COGS', this.fmt.formatCurrency(this.data.totals.cogs.actual)]);
    rows.push([]);

    rows.push(['Gross Profit', this.fmt.formatCurrency(this.data.totals.grossProfit.actual)]);
    rows.push([]);

    rows.push(['OPERATING EXPENSES']);
    this.data.administrativeExpenses.forEach((item: FinancialLineItem) => rows.push([item.name, this.fmt.formatCurrency(item.amount)]));
    this.data.salariesWages.forEach((item: FinancialLineItem) => rows.push([item.name, this.fmt.formatCurrency(item.amount)]));
    this.data.maintenance.forEach((item: FinancialLineItem) => rows.push([item.name, this.fmt.formatCurrency(item.amount)]));
    this.data.logisticsDistribution.forEach((item: FinancialLineItem) => rows.push([item.name, this.fmt.formatCurrency(item.amount)]));
    this.data.otherOperatingExpenses.forEach((item: FinancialLineItem) => rows.push([item.name, this.fmt.formatCurrency(item.amount)]));
    rows.push(['Total Operating Expenses', this.fmt.formatCurrency(this.data.totals.totalOpEx.actual)]);
    rows.push([]);

    rows.push(['EBIT', this.fmt.formatCurrency(this.data.totals.ebit.actual)]);
    rows.push(['EBITDA', this.fmt.formatCurrency(this.data.totals.ebitda.actual)]);
    rows.push([]);

    rows.push(['OTHER INCOME/EXPENSES']);
    this.data.otherItems.forEach((item: FinancialLineItem) => {
      rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
    });
    rows.push(['Total Other Items', this.fmt.formatCurrency(this.data.totals.otherItems.actual)]);
    rows.push([]);

    rows.push(['Net Income Before Tax', this.fmt.formatCurrency(this.data.totals.nibt.actual)]);
    rows.push([]);

    rows.push(['TAX EXPENSE']);
    rows.push(['CIT (30%)', this.fmt.formatCurrency(this.data.totals.cit.actual)]);
    rows.push(['Education Tax (2.5%)', this.fmt.formatCurrency(this.data.totals.educationTax.actual)]);
    rows.push(['NASENI Levy (0.25%)', this.fmt.formatCurrency(this.data.totals.naseniLevy.actual)]);
    rows.push(['Total Tax', this.fmt.formatCurrency(this.data.totals.totalTax.actual)]);
    rows.push([]);

    rows.push(['Net Income After Tax', this.fmt.formatCurrency(this.data.totals.netIncome.actual)]);
    rows.push(['Net Profit Margin', `${this.data.ratios.netProfitMargin.toFixed(1)}%`]);

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `income-statement-${this.data.period.toISOString().slice(0, 7)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  printPage(): void {
    window.print();
  }

  saveStatement(): void {
    if (!this.data) {
      return;
    }

    this.isSaved = true;
    const payload = {
      period: this.activeFilters.period,
      reportType: this.activeFilters.reportType,
      entity: this.activeFilters.entity,
      dateRange: this.data.period.toISOString(),
      totalRevenue: this.totalRevenue,
      totalCOGS: this.totalCOGS,
      grossProfit: this.grossProfit,
      grossMargin: this.grossProfitMargin,
      totalOperatingExpenses: this.totalOperatingExpenses,
      operatingIncome: this.operatingIncome,
      ebitda: this.ebitda,
      netIncomeBeforeTax: this.netIncomeBeforeTax,
      totalTaxExpense: this.totalTaxExpense,
      effectiveTaxRate: this.effectiveTaxRate,
      netIncome: this.netIncome,
      netMargin: this.netProfitMargin,
      savedAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem('savedIncomeStatement', JSON.stringify(payload));
    } catch {
      // Ignore storage issues and keep in-memory state.
    }

    this.cdr.markForCheck();
  }

  addComment(text: string): void {
    if (!text.trim()) {
      return;
    }

    this.comments = [...this.comments, {
      id: this.comments.length + 1,
      author: 'Current User',
      text,
      timestamp: new Date().toISOString()
    }];
    this.cdr.markForCheck();
  }

  toggleCommentsModal(): void {
    this.showCommentsModal = !this.showCommentsModal;
  }

  toggleShareModal(): void {
    this.showShareModal = !this.showShareModal;
  }

  toggleArchivesModal(): void {
    this.showArchivesModal = !this.showArchivesModal;
  }

  getFormattedDate(): string {
    if (!this.data) {
      return '';
    }

    const period = this.data.period;
    const month = period.toLocaleString('default', { month: 'short' });
    return `${month}_${period.getFullYear()}`;
  }

  private requestPeriod(period: Date): void {
    this.accountingService.setPeriod(period);
    this.loadReport();
  }

  private loadReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    forkJoin([
      this.accountingService.getIncomeStatementReport().pipe(take(1)),
      this.accountingService.getAccountingTransactions().pipe(take(1)),
    ])
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: ([report, transactions]) => {
          this.data = this.toIncomeStatementData(report, transactions);
          this.loading = false;
          this.errorMessage = '';
          this.cdr.markForCheck();
        },
        error: () => {
          this.data = null;
          this.loading = false;
          this.errorMessage = 'Unable to load the income statement for the selected period.';
          this.cdr.markForCheck();
        },
      });
  }

  private toIncomeStatementData(report: IncomeStatementReportDTO, transactions: AccountingTransactionDTO[] = []): IncomeStatementData {
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

    const derived = hasBackendLines
      ? null
      : this.deriveFromIncludedTransactions(report, transactions);
    const totals = derived?.totals ?? report.totals;

    return {
      period: this.toDateValue(report.reportPeriod),
      revenue: derived?.revenue ?? this.mapLineItems(report.revenue),
      cogs: derived?.cogs ?? this.mapLineItems(report.cogs),
      administrativeExpenses: this.mapLineItems(report.administrativeExpenses),
      salariesWages: this.mapLineItems(report.salariesAndWages),
      maintenance: this.mapLineItems(report.maintenance),
      logisticsDistribution: this.mapLineItems(report.logisticsAndDistribution),
      otherOperatingExpenses: this.mapLineItems(report.otherOperatingExpenses),
      otherItems: derived?.otherItems ?? this.mapLineItems(report.otherItems),
      totals: {
        revenue: this.mapComparison(totals.revenue),
        cogs: this.mapComparison(totals.cogs),
        grossProfit: this.mapComparison(totals.grossProfit),
        adminExpenses: this.mapComparison(totals.adminExpenses),
        salariesWages: this.mapComparison(totals.salariesWages),
        maintenance: this.mapComparison(totals.maintenance),
        logistics: this.mapComparison(totals.logistics),
        otherOpEx: this.mapComparison(totals.otherOpEx),
        totalOpEx: this.mapComparison(totals.totalOpEx),
        ebit: this.mapComparison(totals.ebit),
        ebitda: this.mapComparison(totals.ebitda),
        otherItems: this.mapComparison(totals.otherItems),
        nibt: this.mapComparison(totals.nibt),
        cit: this.mapComparison(totals.cit),
        educationTax: this.mapComparison(totals.educationTaxLevy),
        naseniLevy: this.mapComparison(totals.naseniLevy),
        totalTax: this.mapComparison(totals.totalTax),
        netIncome: this.mapComparison(totals.netIncome),
      },
      ratios: {
        revenueGrowthMoM: report.ratios.revenueGrowthMoMPct,
        grossProfitGrowth: report.ratios.grossProfitGrowthPct,
        grossProfitMargin: report.ratios.grossProfitMarginPct,
        ebitdaMargin: report.ratios.ebitdaMarginPct,
        netProfitMargin: report.ratios.netProfitMarginPct,
      },
      monthlyTrend: derived?.monthlyTrend ?? this.mapMonthlyTrend(report.monthlyTrend),
      expenseDistribution: this.mapExpenseDistribution(report.expenseDistribution),
    };
  }

  private deriveFromIncludedTransactions(
    report: IncomeStatementReportDTO,
    transactions: AccountingTransactionDTO[],
  ): {
    revenue: FinancialLineItem[];
    cogs: FinancialLineItem[];
    otherItems: FinancialLineItem[];
    totals: IncomeStatementReportDTO['totals'];
    monthlyTrend: MonthlyFinancialData;
  } | null {
    const includedIds = new Set(report.reportContext.includedTransactionIds.map((id) => String(id)));
    const includedTransactions = transactions.filter((transaction) => includedIds.has(String(transaction.id)));

    if (!includedTransactions.length) {
      return null;
    }

    const revenueRows: FinancialLineItem[] = [];
    const cogsRows: FinancialLineItem[] = [];
    const otherRows: FinancialLineItem[] = [];

    includedTransactions.forEach((transaction) => {
      const amount = Number(transaction.amount) || 0;
      const approvedAmount = this.numberFromMetadata(transaction, 'approvedAmount');
      const interestAmount = approvedAmount !== null ? Math.max(amount - approvedAmount, 0) : 0;
      const principalAmount = approvedAmount !== null ? approvedAmount : amount;
      const label = transaction.description || transaction.transactionReference || transaction.reference || `Transaction ${transaction.id}`;

      if (interestAmount > 0) {
        revenueRows.push(this.toFinancialLineItem(`Interest income - ${label}`, interestAmount));
      }

      if (principalAmount > 0) {
        otherRows.push(this.toFinancialLineItem(`Loan principal activity - ${label}`, -principalAmount));
      }
    });

    const revenueTotal = revenueRows.reduce((sum, item) => sum + item.amount, 0);
    const cogsTotal = cogsRows.reduce((sum, item) => sum + item.amount, 0);
    const otherTotal = otherRows.reduce((sum, item) => sum + item.amount, 0);
    const grossProfit = revenueTotal - Math.abs(cogsTotal);
    const ebit = grossProfit + otherTotal;
    const netIncome = ebit;
    const totals = this.cloneTotals(report.totals);

    totals.revenue.actualAmount = revenueTotal;
    totals.cogs.actualAmount = cogsTotal;
    totals.grossProfit.actualAmount = grossProfit;
    totals.otherItems.actualAmount = otherTotal;
    totals.ebit.actualAmount = ebit;
    totals.ebitda.actualAmount = ebit;
    totals.nibt.actualAmount = netIncome;
    totals.netIncome.actualAmount = netIncome;

    return {
      revenue: revenueRows,
      cogs: cogsRows,
      otherItems: otherRows,
      totals,
      monthlyTrend: {
        labels: report.monthlyTrend.periodLabels,
        revenue: [revenueTotal],
        expenses: [Math.abs(cogsTotal + otherTotal)],
        profit: [netIncome],
      },
    };
  }

  private toFinancialLineItem(name: string, amount: number): FinancialLineItem {
    return { name, amount, prevAmount: 0, budget: 0, prevYearAmount: 0 };
  }

  private numberFromMetadata(transaction: AccountingTransactionDTO, key: string): number | null {
    const value = transaction.metadata?.[key];
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private cloneTotals(totals: IncomeStatementReportDTO['totals']): IncomeStatementReportDTO['totals'] {
    return JSON.parse(JSON.stringify(totals));
  }

  private toDateValue(value: string | number[]): Date {
    if (Array.isArray(value)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0, nanos = 0] = value;
      return new Date(year, month - 1, day, hour, minute, second, Math.floor(nanos / 1_000_000));
    }

    return new Date(value);
  }

  private mapLineItems(items: FinancialLineItemDTO[]): FinancialLineItem[] {
    return items.map((item: FinancialLineItemDTO) => ({
      name: item.name,
      amount: item.actualAmount,
      prevAmount: item.previousAmount,
      budget: item.budgetAmount,
      prevYearAmount: item.priorYearAmount,
    }));
  }

  private mapComparison(comparison: PeriodComparisonDTO): { actual: number; prev: number; budget: number; prevYear: number } {
    return {
      actual: comparison.actualAmount,
      prev: comparison.previousAmount,
      budget: comparison.budgetAmount,
      prevYear: comparison.priorYearAmount,
    };
  }

  private mapMonthlyTrend(trend: MonthlyTrendDTO): MonthlyFinancialData {
    return {
      labels: trend.periodLabels,
      revenue: trend.revenueAmounts,
      expenses: trend.expenseAmounts,
      profit: trend.profitAmounts,
    };
  }

  private mapExpenseDistribution(distribution: ExpenseDistributionDTO): ExpenseDistribution {
    return {
      administrative: distribution.administrative,
      salariesAndWages: distribution.salariesAndWages,
      maintenance: distribution.maintenance,
      logisticsAndDistribution: distribution.logisticsAndDistribution,
      otherOperatingExpenses: distribution.otherOperatingExpenses,
    };
  }
}
