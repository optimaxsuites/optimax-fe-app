/**
 * income-statement.component.ts
 * ───────────────
 * REFACTORED to use AccountingService as the single source of truth.
 *
 * CHANGES:
 *  • Removed all hardcoded financial data arrays (revenueData, cogsData, etc.)
 *  • All data flows from AccountingService.getIncomeStatement()
 *  • All calculations removed (now come pre-computed from service)
 *  • Display helpers adapted to work with service data structures
 *  • Filter logic preserved but now operates on service-provided data
 *  • Comments and UI state remain local
 */

import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  AccountingService,
  IncomeStatementData,
  FinancialLineItem
} from '../../../../core/services/accounting.service';
import { AccountingFormatService } from '../../../../core/services/accounting-format.service';

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

@Component({
  selector: 'app-income-statement',
  templateUrl: './income-statement.component.html',
  styleUrls: ['./income-statement.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomeStatementComponent implements OnInit, OnDestroy {

  @ViewChild('statementContent') statementContent!: ElementRef;

  // ── UI state 
  isSaved = false;
  showCommentsModal = false;
  showShareModal = false;
  showArchivesModal = false;
  Math = Math;

  // ── Filters ─
  activeFilters: FilterOptions = {
    reportType: 'Actual',
    entity: 'All Locations',
    period: 'This Month',
    showPercentages: false,
    showVariance: false,
    includeForecasts: false
  };

  // ── Data (populated by subscription) ──────────────────────────────────────
  data: IncomeStatementData | null = null;

  // ── Comments (kept local — not financial data) ───────────────────────────
  comments: Comment[] = [
    { id: 1, author: 'Jane Smith', text: 'Gross profit margin is improving nicely', timestamp: '2025-05-28T14:25:00' },
    { id: 2, author: 'John Doe', text: 'We should look into the increased maintenance costs', timestamp: '2025-05-29T09:10:00' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private accountingService: AccountingService,
    readonly fmt: AccountingFormatService, // exposed to template
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.accountingService.getIncomeStatement()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: IncomeStatementData) => {
        this.data = data;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Period navigation ─────────────────────────────────────────────────────
  previousMonth(): void {
    const current = this.data?.period ?? new Date();
    this.accountingService.setPeriod(
      new Date(current.getFullYear(), current.getMonth() - 1, 1)
    );
  }

  nextMonth(): void {
    const current = this.data?.period ?? new Date();
    this.accountingService.setPeriod(
      new Date(current.getFullYear(), current.getMonth() + 1, 1)
    );
  }

  // ── Filter handler ───────────────────────────────────────────────────────
  onFiltersApplied(filters: FilterOptions): void {
    this.activeFilters = { ...filters };
    this.cdr.markForCheck();
  }

  // ── Display helpers (filter-aware) ───────────────────────────────────────
  /**
   * Returns the amount to display for a line item based on the active filter.
   */
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
    const c = this.getComparisonAmount(item);
    return c !== null ? this.getDisplayAmount(item) - c : null;
  }

  getVariancePercentage(item: FinancialLineItem): number | null {
    const c = this.getComparisonAmount(item);
    return c !== null && c !== 0
      ? ((this.getDisplayAmount(item) - c) / Math.abs(c)) * 100
      : null;
  }

  /**
   * Pick the correct four-way total for the active filter.
   */
  getTotal(totals: { actual: number; prev: number; budget: number; prevYear: number }): number {
    switch (this.activeFilters.reportType) {
      case 'Budget':
        return totals.budget;
      case 'Actual vs Previous Year':
        return totals.actual; // display actual, compare prevYear
      default:
        return totals.actual;
    }
  }

  getComparisonTotal(totals: { actual: number; prev: number; budget: number; prevYear: number }): number | null {
    switch (this.activeFilters.reportType) {
      case 'Actual vs Budget':
        return totals.budget;
      case 'Actual vs Previous Year':
        return totals.prevYear;
      default:
        return null;
    }
  }

  getTotalVariance(totals: { actual: number; prev: number; budget: number; prevYear: number }): number | null {
    const c = this.getComparisonTotal(totals);
    return c !== null ? this.getTotal(totals) - c : null;
  }

  getTotalVariancePct(totals: { actual: number; prev: number; budget: number; prevYear: number }): number | null {
    const c = this.getComparisonTotal(totals);
    const v = this.getTotal(totals);
    return c !== null && c !== 0 ? ((v - c) / Math.abs(c)) * 100 : null;
  }

  // ─── Growth helpers ───────────────────────────────────────────────────────
  get revenueGrowth(): number {
    return this.data?.ratios.revenueGrowthMoM ?? 0;
  }

  get grossProfitGrowth(): number {
    return this.data?.ratios.grossProfitGrowth ?? 0;
  }

  get cogsGrowth(): number {
    if (!this.data) return 0;
    const prev = this.data.totals.cogs.prev;
    const current = this.data.totals.cogs.actual;
    return prev !== 0 ? ((current - prev) / Math.abs(prev)) * 100 : 0;
  }

  get operatingExpensesGrowth(): number {
    if (!this.data) return 0;
    const prev = this.data.totals.totalOpEx.prev;
    const current = this.data.totals.totalOpEx.actual;
    return prev !== 0 ? ((current - prev) / Math.abs(prev)) * 100 : 0;
  }

  get revenueVariance(): number {
    if (!this.data) return 0;
    return this.data.totals.revenue.actual - this.data.totals.revenue.budget;
  }

  get cogsVariance(): number {
    if (!this.data) return 0;
    return this.data.totals.cogs.actual - this.data.totals.cogs.budget;
  }

  get revenueYearOverYearGrowth(): number {
    if (!this.data) return 0;
    const prevYear = this.data.totals.revenue.prevYear;
    const current = this.data.totals.revenue.actual;
    return prevYear !== 0 ? ((current - prevYear) / Math.abs(prevYear)) * 100 : 0;
  }

  // ─── Margin helpers ───────────────────────────────────────────────────────
  get grossProfitMargin(): number {
    return this.data?.ratios.grossProfitMargin ?? 0;
  }

  get operatingMargin(): number {
    if (!this.data) return 0;
    return (this.data.totals.ebit.actual / this.data.totals.revenue.actual) * 100;
  }

  get netProfitMargin(): number {
    return this.data?.ratios.netProfitMargin ?? 0;
  }

  get ebitdaMargin(): number {
    return this.data?.ratios.ebitdaMargin ?? 0;
  }

  get effectiveTaxRate(): number {
    if (!this.data) return 0;
    const nibt = this.data.totals.nibt.actual;
    const totalTax = Math.abs(this.data.totals.totalTax.actual);
    return nibt > 0 ? (totalTax / nibt) * 100 : 0;
  }

  // ─── Data accessors with null safety ──────────────────────────────────────
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

  get monthlyData() {
    return this.data?.monthlyTrend ?? {
      labels: [],
      revenue: [],
      expenses: [],
      profit: []
    };
  }

  get expenseDistribution() {
    return this.data?.expenseDistribution ?? {
      administrative: 0,
      salariesAndWages: 0,
      maintenance: 0,
      logisticsAndDistribution: 0,
      otherOperatingExpenses: 0
    };
  }

  // ─── Key insights ─────────────────────────────────────────────────────────
  get insights(): any[] {
    if (!this.data) return [];

    const insights: any[] = [];
    const revGrowth = this.revenueGrowth;

    insights.push({
      title: `Revenue ${revGrowth >= 0 ? 'increased' : 'decreased'}`,
      description: `Revenue ${revGrowth >= 0 ? 'grew' : 'declined'} by ${this.fmt.formatPercentage(Math.abs(revGrowth))} vs prior period`,
      trend: revGrowth >= 0 ? 'positive' : 'negative'
    });

    if (this.activeFilters.reportType.includes('Budget')) {
      const revVar = this.revenueVariance;
      insights.push({
        title: `Revenue ${revVar >= 0 ? 'exceeded' : 'missed'} budget`,
        description: `Revenue is ${this.fmt.formatCurrency(Math.abs(revVar))} ${revVar >= 0 ? 'above' : 'below'} budget`,
        trend: revVar >= 0 ? 'positive' : 'negative'
      });
    }

    insights.push({
      title: `Gross margin ${this.grossProfitMargin >= this.data.ratios.grossProfitMargin ? 'improved' : 'declined'}`,
      description: `Gross margin at ${this.grossProfitMargin.toFixed(1)}% — EBITDA margin ${this.ebitdaMargin.toFixed(1)}%`,
      trend: this.grossProfitMargin >= this.data.ratios.grossProfitMargin ? 'positive' : 'negative'
    });

    insights.push({
      title: `Operating expenses ${this.operatingExpensesGrowth <= 0 ? 'decreased' : 'increased'}`,
      description: `OpEx changed by ${this.fmt.formatPercentage(Math.abs(this.operatingExpensesGrowth))} — Tax rate: ${this.effectiveTaxRate.toFixed(1)}%`,
      trend: this.operatingExpensesGrowth <= 0 ? 'positive' : 'negative'
    });

    return insights;
  }

  // ─── Export ─
  async exportToPDF(): Promise<void> {
    console.warn('PDF export: install jsPDF and html2canvas, then uncomment the implementation.');
  }

  exportToCSV(): void {
    if (!this.data) return;

    try {
      const d = this.data;
      const rows: string[][] = [];

      // Header
      rows.push(['Income Statement Export']);
      rows.push(['Period', d.period.toLocaleDateString()]);
      rows.push([]);

      // Revenue
      rows.push(['REVENUE']);
      d.revenue.forEach((item: FinancialLineItem) => {
        rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
      });
      rows.push(['Total Revenue', this.fmt.formatCurrency(d.totals.revenue.actual)]);
      rows.push([]);

      // COGS
      rows.push(['COST OF GOODS SOLD']);
      d.cogs.forEach((item: FinancialLineItem) => {
        rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
      });
      rows.push(['Total COGS', this.fmt.formatCurrency(d.totals.cogs.actual)]);
      rows.push([]);

      // Gross Profit
      rows.push(['Gross Profit', this.fmt.formatCurrency(d.totals.grossProfit.actual)]);
      rows.push([]);

      // Operating Expenses
      rows.push(['OPERATING EXPENSES']);
      d.administrativeExpenses.forEach((item: FinancialLineItem) => {
        rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
      });
      d.salariesWages.forEach((item: FinancialLineItem) => {
        rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
      });
      d.maintenance.forEach((item: FinancialLineItem) => {
        rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
      });
      d.logisticsDistribution.forEach((item: FinancialLineItem) => {
        rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
      });
      d.otherOperatingExpenses.forEach((item: FinancialLineItem) => {
        rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
      });
      rows.push(['Total Operating Expenses', this.fmt.formatCurrency(d.totals.totalOpEx.actual)]);
      rows.push([]);

      // EBIT
      rows.push(['EBIT', this.fmt.formatCurrency(d.totals.ebit.actual)]);
      rows.push(['EBITDA', this.fmt.formatCurrency(d.totals.ebitda.actual)]);
      rows.push([]);

      // Other Items
      rows.push(['OTHER INCOME/EXPENSES']);
      d.otherItems.forEach((item: FinancialLineItem) => {
        rows.push([item.name, this.fmt.formatCurrency(item.amount)]);
      });
      rows.push(['Total Other Items', this.fmt.formatCurrency(d.totals.otherItems.actual)]);
      rows.push([]);

      // NIBT
      rows.push(['Net Income Before Tax', this.fmt.formatCurrency(d.totals.nibt.actual)]);
      rows.push([]);

      // Tax
      rows.push(['TAX EXPENSE']);
      rows.push(['CIT (30%)', this.fmt.formatCurrency(d.totals.cit.actual)]);
      rows.push(['Education Tax (2.5%)', this.fmt.formatCurrency(d.totals.educationTax.actual)]);
      rows.push(['NASENI Levy (0.25%)', this.fmt.formatCurrency(d.totals.naseniLevy.actual)]);
      rows.push(['Total Tax', this.fmt.formatCurrency(d.totals.totalTax.actual)]);
      rows.push([]);

      // Net Income
      rows.push(['Net Income After Tax', this.fmt.formatCurrency(d.totals.netIncome.actual)]);
      rows.push(['Net Profit Margin', `${d.ratios.netProfitMargin.toFixed(1)}%`]);

      const csv = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `income-statement-${d.period.toISOString().slice(0, 7)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export error:', e);
    }
  }

  printPage(): void {
    window.print();
  }

  // ─── Save ───
  saveStatement(): void {
    if (!this.data) return;

    try {
      this.isSaved = true;
      const data = {
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
        sessionStorage.setItem('savedIncomeStatement', JSON.stringify(data));
      } catch (_) { /* SSR / sandboxed — in-memory only */ }

      console.log('[IncomeStatement] Saved:', data);
      this.cdr.markForCheck();
    } catch (e) {
      console.error('Save error:', e);
    }
  }

  // ─── Comments ─────────────────────────────────────────────────────────────
  addComment(text: string): void {
    if (!text.trim()) return;
    this.comments = [...this.comments, {
      id: this.comments.length + 1,
      author: 'Current User',
      text,
      timestamp: new Date().toISOString()
    }];
    this.cdr.markForCheck();
  }

  // ─── Modal toggles ───────────────────────────────────────────────────────
  toggleCommentsModal(): void {
    this.showCommentsModal = !this.showCommentsModal;
  }

  toggleShareModal(): void {
    this.showShareModal = !this.showShareModal;
  }

  toggleArchivesModal(): void {
    this.showArchivesModal = !this.showArchivesModal;
  }

  // ─── Utility 
  getFormattedDate(): string {
    if (!this.data) return '';
    const d = this.data.period;
    const m = d.toLocaleString('default', { month: 'short' });
    return `${m}_${d.getFullYear()}`;
  }
}