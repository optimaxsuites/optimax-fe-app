import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountingService } from '../../../../core/services/accounting.service';
import { AccountingFormatService } from '../../../../core/services/accounting-format.service';
import {
  CashFlowLineItemDTO,
  CashFlowReportDTO,
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
    this.accountingService
      .getCashFlowReport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.report = report;
          this.operatingActivities = [...report.operatingActivities];
          this.investingActivities = [...report.investingActivities];
          this.financingActivities = [...report.financingActivities];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Unable to load cash flow statement for this period.';
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Period navigation ─────────────────────────────────────────────────────
  previousMonth(): void {
    const p = this.report?.reportPeriod ?? new Date();
    this.accountingService.setPeriod(new Date(p.getFullYear(), p.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const p = this.report?.reportPeriod ?? new Date();
    this.accountingService.setPeriod(new Date(p.getFullYear(), p.getMonth() + 1, 1));
  }

  // ── Derived view values (all from DTO) ───────────────────────────────────
  get periodLabel(): string {
    if (!this.report) return 'Period Not Set';
    return this.report.reportPeriod.toLocaleDateString('en-NG', {
      month: 'long',
      year: 'numeric',
    });
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
}
