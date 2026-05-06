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

import { AccountingService, LedgerEntryRaw } from '../../../../core/services/accounting.service';
import { AccountingFormatService } from '../../../../core/services/accounting-format.service';
import {
  AccountingTransactionDTO,
  CashFlowLineItemDTO,
  CashFlowReportDTO,
  ReportPeriodType,
  WorkingCapitalChangeDTO,
} from '../report.dto';

export type CashFlowViewMode = 'direct' | 'indirect';

@Component({
  selector: 'app-cash-flow',
  templateUrl: './cash-flow.component.html',
  styleUrls: ['./cash-flow.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashFlowComponent implements OnInit, OnDestroy {
  @ViewChild('reportContent', { static: false }) reportContent!: ElementRef;

  // ── Service data
  report: CashFlowReportDTO | null = null;
  loading = true;
  errorMessage = '';
  fromDate = '';
  toDate = '';
  allTimeLabel = '';

  // ── UI state────
  viewMode: CashFlowViewMode = 'direct';
  today = new Date();
  searchTerm = '';

  // Cached filtered lists (reset when report changes)
  operatingActivities: CashFlowLineItemDTO[] = [];
  investingActivities: CashFlowLineItemDTO[] = [];
  financingActivities: CashFlowLineItemDTO[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private readonly accountingService: AccountingService,
    readonly fmt: AccountingFormatService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeDateRange();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Period navigation ─────────────────────────────────────────────────────
  applyDateFilter(): void {
    if (!this.fromDate || !this.toDate) {
      this.errorMessage = 'Choose both a start date and an end date for the cash flow report.';
      this.cdr.markForCheck();
      return;
    }

    if (this.fromDate > this.toDate) {
      this.errorMessage = 'The cash flow start date cannot be after the end date.';
      this.cdr.markForCheck();
      return;
    }

    this.loadReport();
  }

  resetToAllTime(): void {
    if (!this.allTimeLabel) {
      return;
    }

    const [startLabel, endLabel] = this.allTimeLabel.split(' -> ');
    if (startLabel && endLabel) {
      this.fromDate = startLabel;
      this.toDate = endLabel;
      this.loadReport();
    }
  }

  // ── Derived view values (all from DTO) ───────────────────────────────────
  get periodLabel(): string {
    if (this.fromDate && this.toDate) {
      if (this.fromDate === this.toDate) {
        return this.formatInputDate(this.fromDate);
      }

      return `${this.formatInputDate(this.fromDate)} - ${this.formatInputDate(this.toDate)}`;
    }

    if (this.report) {
      return this.parseApiDate(this.report.reportPeriod).toLocaleDateString('en-NG', {
        month: 'long',
        year: 'numeric',
      });
    }

    return 'All Time';
  }

  get summary() {
    return this.report?.summary ?? null;
  }

  get taxBreakdown() {
    return this.report?.taxCashFlowBreakdown ?? null;
  }

  get workingCapitalChanges(): WorkingCapitalChangeDTO[] {
    return this.report?.workingCapitalChanges ?? [];
  }

  get workingCapitalTotal(): number {
    return this.workingCapitalChanges.reduce((s, i) => s + i.changeAmount, 0);
  }

  get indirectReconciliation() {
    return this.report?.indirectReconciliation ?? null;
  }

  get periodComparisons() {
    return this.report?.periodComparisons ?? null;
  }

  get displayedOperatingActivities(): CashFlowLineItemDTO[] {
    return this.filterActivities(this.operatingActivities);
  }

  get displayedInvestingActivities(): CashFlowLineItemDTO[] {
    return this.filterActivities(this.investingActivities);
  }

  get displayedFinancingActivities(): CashFlowLineItemDTO[] {
    return this.filterActivities(this.financingActivities);
  }

  get allVisibleActivities(): CashFlowLineItemDTO[] {
    return [
      ...this.displayedOperatingActivities,
      ...this.displayedInvestingActivities,
      ...this.displayedFinancingActivities,
    ];
  }

  /** True when the direct reconciliation check is within ₦1,000. */
  get reconciliationIsValid(): boolean {
    if (!this.indirectReconciliation || !this.summary) return false;
    const r = this.indirectReconciliation;
    const expected =
      r.netIncome + r.addBackDepreciation - r.deductGainOnDisposal + r.changesInWorkingCapital;
    return Math.abs(expected - this.summary.operatingCashFlow) < 1_000;
  }

  // ── Row helpers─
  isBoldRow(item: CashFlowLineItemDTO): boolean {
    return item.isSubtotal || item.indentLevel === 0;
  }

  getAmountClass(item: CashFlowLineItemDTO): string {
    if (item.isSubtotal) return item.amount >= 0 ? 'text-success' : 'text-danger';
    return item.flowDirection === 'inflow' ? 'text-inflow' : 'text-outflow';
  }

  getCategoryBadgeClass(category: string): string {
    const map: Record<string, string> = {
      operating: 'badge-operating',
      investing: 'badge-investing',
      financing: 'badge-financing',
    };
    return map[category] ?? 'badge-operating';
  }

  getComparisonArrow(pct: number): string {
    return pct > 0 ? '↑' : pct < 0 ? '↓' : '→';
  }

  getComparisonClass(pct: number): string {
    return pct > 0 ? 'text-success' : pct < 0 ? 'text-danger' : 'text-muted';
  }

  // ── Export──────
  exportToCSV(): void {
    if (!this.report) return;
    const rows: string[][] = [];
    const add = (...cells: string[]) => rows.push(cells);

    add('CASH FLOW STATEMENT', '', '');
    add('Period:', this.periodLabel, '');
    add('Generated:', new Date().toISOString().split('T')[0], '');
    add('');

    const section = (title: string, items: CashFlowLineItemDTO[]) => {
      add(title, 'Amount (NGN)', 'Direction');
      items.forEach((i) =>
        add('  '.repeat(i.indentLevel) + i.description, String(i.amount), i.flowDirection)
      );
      add('');
    };

    section('OPERATING ACTIVITIES', this.operatingActivities);
    section('INVESTING ACTIVITIES', this.investingActivities);
    section('FINANCING ACTIVITIES', this.financingActivities);

    if (this.summary) {
      add('SUMMARY', '');
      add('Net Cash Flow', String(this.summary.netCashFlow));
      add('Opening Balance', String(this.summary.openingBalance));
      add('Closing Balance', String(this.summary.closingBalance));
      add('Free Cash Flow', String(this.summary.freeCashFlow));
    }

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CashFlow_${this.periodLabel.replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private filterActivities(items: CashFlowLineItemDTO[]): CashFlowLineItemDTO[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) =>
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }

  private initializeDateRange(): void {
    this.accountingService.getAccountingTransactions()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (transactions) => {
          const range = this.resolveAllTimeRange(transactions);
          this.fromDate = range.start;
          this.toDate = range.end;
          this.allTimeLabel = `${range.start} -> ${range.end}`;
          this.loadReport();
        },
        error: () => {
          const today = this.toDateInput(new Date());
          this.fromDate = `${new Date().getFullYear()}-01-01`;
          this.toDate = today;
          this.allTimeLabel = `${this.fromDate} -> ${this.toDate}`;
          this.loadReport();
        },
      });
  }

  private loadReport(): void {
    this.loading = true;
    this.errorMessage = '';
    this.report = null;
    this.operatingActivities = [];
    this.investingActivities = [];
    this.financingActivities = [];
    this.cdr.markForCheck();

    const request = this.buildRequestOverrides();

    forkJoin([
      this.accountingService.getCashFlowReport(request).pipe(take(1)),
      this.accountingService.getLedgerEntries().pipe(take(1)),
    ])
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: ([report, ledgerEntries]) => {
          const hydratedReport = this.withDerivedCashFlow(report, ledgerEntries, request.periodStart, request.periodEnd);
          this.report = hydratedReport;
          this.operatingActivities = [...hydratedReport.operatingActivities];
          this.investingActivities = [...hydratedReport.investingActivities];
          this.financingActivities = [...hydratedReport.financingActivities];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Unable to load the cash flow statement for the selected date range.';
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private buildRequestOverrides(): { periodStart: string; periodEnd: string; reportPeriodType: ReportPeriodType } {
    const startDate = new Date(`${this.fromDate}T00:00:00`);
    const endDate = new Date(`${this.toDate}T23:59:59.999`);
    const daySpan = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000));

    let reportPeriodType: ReportPeriodType = 'monthly';
    if (daySpan > 365) {
      reportPeriodType = 'yearly';
    } else if (daySpan > 92) {
      reportPeriodType = 'quarterly';
    }

    this.accountingService.setPeriod(startDate);

    return {
      periodStart: this.toBackendLocalDateTime(startDate),
      periodEnd: this.toBackendLocalDateTime(endDate),
      reportPeriodType,
    };
  }

  private resolveAllTimeRange(transactions: AccountingTransactionDTO[]): { start: string; end: string } {
    const parsedDates = transactions
      .map((transaction) => this.parseApiDate(transaction.transactionDate))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((left, right) => left.getTime() - right.getTime());

    if (!parsedDates.length) {
      const today = this.toDateInput(new Date());
      return { start: `${new Date().getFullYear()}-01-01`, end: today };
    }

    return {
      start: this.toDateInput(parsedDates[0]),
      end: this.toDateInput(parsedDates[parsedDates.length - 1]),
    };
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatInputDate(value: string): string {
    return new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  private parseApiDate(value: string | number[]): Date {
    if (Array.isArray(value)) {
      const [year, month = 1, day = 1, hour = 0, minute = 0, second = 0, nanos = 0] = value;
      return new Date(year, month - 1, day, hour, minute, second, Math.floor(nanos / 1_000_000));
    }

    return new Date(value);
  }

  private withDerivedCashFlow(
    report: CashFlowReportDTO,
    ledgerEntries: LedgerEntryRaw[],
    periodStart: string,
    periodEnd: string,
  ): CashFlowReportDTO {
    const hasBackendActivities = report.operatingActivities.length > 0 ||
      report.investingActivities.length > 0 ||
      report.financingActivities.length > 0;

    if (hasBackendActivities) {
      return report;
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const cashEntries = ledgerEntries
      .filter((entry) => this.isCashAccount(entry))
      .filter((entry) => {
        const entryDate = this.parseApiDate(entry.entryDate);
        return entryDate >= start && entryDate <= end;
      });

    if (!cashEntries.length) {
      return report;
    }

    const operatingActivities = cashEntries.map((entry) => {
      const amount = Number(entry.debit || 0) - Number(entry.credit || 0);
      return {
        description: this.describeLedgerEntry(entry),
        amount,
        category: 'operating' as CashFlowLineItemDTO['category'],
        flowDirection: amount >= 0 ? 'inflow' : 'outflow',
        indentLevel: 1,
        isSubtotal: false,
        sourceModule: undefined,
      };
    });

    const operatingCashFlow = operatingActivities.reduce((sum, item) => sum + item.amount, 0);

    return {
      ...report,
      operatingActivities,
      investingActivities: [],
      financingActivities: [],
      summary: {
        ...report.summary,
        operatingCashFlow,
        investingCashFlow: 0,
        financingCashFlow: 0,
        netCashFlow: operatingCashFlow,
        freeCashFlow: operatingCashFlow,
        closingBalance: (report.summary.openingBalance ?? 0) + operatingCashFlow,
      },
      indirectReconciliation: {
        ...report.indirectReconciliation,
        calculatedOperatingCash: operatingCashFlow,
      },
    };
  }

  private isCashAccount(entry: LedgerEntryRaw): boolean {
    const accountName = entry.account?.accountName?.toLowerCase() ?? '';
    const accountCode = String(entry.account?.accountCode ?? '');
    return accountName.includes('cash') || accountName.includes('bank') || accountCode.startsWith('10');
  }

  private describeLedgerEntry(entry: LedgerEntryRaw): string {
    const line = entry.journalEntryLine as { description?: string } | null;
    return line?.description || `${entry.account.accountName} ledger movement`;
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
