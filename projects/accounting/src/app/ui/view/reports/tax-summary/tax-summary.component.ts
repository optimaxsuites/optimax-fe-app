
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AccountingService } from '../../../../core/services/accounting.service';
import { AccountingFormatService } from '../../../../core/services/accounting-format.service';
import {
  FilingRecordDTO,
  FilingStatus,
  PayeEmployeeDTO,
  TaxComplianceCheckDTO,
  TaxLineItemDTO,
  TaxSummaryReportDTO,
  TaxType,
} from '../../../../core/dtos/report.dto';

export type TaxTab = 'summary' | 'vat' | 'wht' | 'cit' | 'paye' | 'history';

@Component({
  selector: 'app-tax-summary',
  templateUrl: './tax-summary.component.html',
  styleUrls: ['./tax-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxSummaryComponent implements OnInit, OnDestroy {
  // ── Service data ──────────────────────────────────────────────────────────
  report: TaxSummaryReportDTO | null = null;
  loading = true;
  errorMessage = '';

  // ── UI state (no financial data here) ────────────────────────────────────
  activeTab: TaxTab = 'summary';
  selectedTaxTypeFilter = 'All Types';
  taxLineSearchQuery = '';
  expandedLineIds = new Set<string>();
  showValidationModal = false;
  showComplianceModal = false;
  showExportModal = false;
  today = new Date();
  selectedTabIndex = 0;
  taxCompositionChartOptions: Partial<any> | null = null;
  monthlyTrendChartOptions: Partial<any> | null = null;

  // ── Enum references for templates ────────────────────────────────────────
  readonly TaxType = TaxType;
  readonly FilingStatus = FilingStatus;
  readonly taxTypeOptions = ['All Types', 'VAT', 'WHT', 'CIT', 'EDT', 'PAYE'];

  private destroy$ = new Subject<void>();

  constructor(
    private readonly accountingService: AccountingService,
    readonly fmt: AccountingFormatService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.accountingService
      .getTaxSummaryReport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (report) => {
          this.report = report;
          this.buildCharts(report);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Unable to load tax summary for this period.';
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
  changePeriod(isoMonth: string): void {
    const [y, m] = isoMonth.split('-').map(Number);
    this.accountingService.setPeriod(new Date(y, m - 1, 1));
  }

  // ── Derived view values (read‑only — all sourced from DTO) ────────────────
  get periodDisplayLabel(): string {
    if (!this.report) return '';
    const [y, m] = this.report.reportingPeriod.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-NG', {
      month: 'long',
      year: 'numeric',
    });
  }

  get periodDateRange(): string {
    if (!this.report) return '';
    const [y, m] = this.report.reportingPeriod.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const f = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return `${f(start)} – ${f(end)}`;
  }

  /** Tax lines filtered by the active type filter and search query. */
  get filteredTaxLines(): TaxLineItemDTO[] {
    if (!this.report) return [];
    return this.report.taxLineItems.filter((line) => {
      const matchesType =
        this.selectedTaxTypeFilter === 'All Types' ||
        line.taxType === this.selectedTaxTypeFilter;
      const matchesQuery =
        !this.taxLineSearchQuery ||
        line.description.toLowerCase().includes(this.taxLineSearchQuery.toLowerCase()) ||
        (line.vendorName ?? '').toLowerCase().includes(this.taxLineSearchQuery.toLowerCase());
      return matchesType && matchesQuery;
    });
  }

  /** PAYE employees from the DTO — used by the PAYE tab table. */
  get payeEmployees(): PayeEmployeeDTO[] {
    return this.report?.paye.employees ?? [];
  }

  /** Total PAYE from the DTO — no summing in the template. */
  get totalPayeDeducted(): number {
    return this.report?.paye.totalPayeDeducted ?? 0;
  }

  get totalGrossSalary(): number {
    return this.report?.paye.totalGrossSalary
      ?? this.payeEmployees.reduce((sum, employee) => sum + employee.grossSalary, 0);
  }

  get totalPensionDeduction(): number {
    return this.payeEmployees.reduce((sum, employee) => sum + employee.pensionDeduction, 0);
  }

  get totalNhfDeduction(): number {
    return this.payeEmployees.reduce((sum, employee) => sum + employee.nhfDeduction, 0);
  }

  get totalTaxableIncome(): number {
    return this.report?.paye.totalTaxableIncome
      ?? this.payeEmployees.reduce((sum, employee) => sum + employee.taxableIncome, 0);
  }

  get totalNetSalary(): number {
    return this.payeEmployees.reduce((sum, employee) => sum + employee.netSalary, 0);
  }

  /** Filing history from the DTO. */
  get filingHistory(): FilingRecordDTO[] {
    return this.report?.filingHistory ?? [];
  }

  /** Compliance checks from the DTO. */
  get complianceChecks(): TaxComplianceCheckDTO[] {
    return this.report?.complianceChecks ?? [];
  }

  get passedComplianceCount(): number {
    return this.complianceChecks.filter((c) => c.isPassed).length;
  }

  get totalTaxPosition(): number {
    if (!this.report) {
      return 0;
    }

    return this.report.vat.netVatPayable +
      this.report.wht.totalWithheld +
      this.report.cit.totalCitLiability +
      this.report.paye.totalPayeDeducted;
  }

  get recentTaxEntries(): TaxLineItemDTO[] {
    return this.filteredTaxLines.slice(0, 10);
  }

  get totalTaxTransactions(): number {
    return this.report?.taxLineItems.length ?? 0;
  }

  get activeComplianceIssues(): TaxComplianceCheckDTO[] {
    return this.complianceChecks.filter((check) => !check.isPassed);
  }

  /** Bar chart height — maps a tax amount onto 112px against 800K ceiling. */
  getBarHeight(amount: number, ceilAmount = 800_000): number {
    const BAR_PX = 112;
    return Math.round(Math.min(amount / ceilAmount, 1) * BAR_PX);
  }

  // ── Validation helpers ────────────────────────────────────────────────────
  get vatValidation(): {
    outputVAT: string;
    inputVAT: string;
    netVATPayable: string;
    netVATPayableCalc: string;
    isValid: boolean;
  } {
    if (!this.report)
      return {
        outputVAT: '—',
        inputVAT: '—',
        netVATPayable: '—',
        netVATPayableCalc: '—',
        isValid: false,
      };
    const { vat } = this.report;
    const calc = vat.outputVAT - vat.inputVAT;
    return {
      outputVAT: this.fmt.formatCurrency(vat.outputVAT),
      inputVAT: this.fmt.formatCurrency(vat.inputVAT),
      netVATPayable: this.fmt.formatCurrency(vat.netVatPayable),
      netVATPayableCalc: this.fmt.formatCurrency(calc),
      isValid: Math.abs(calc - vat.netVatPayable) < 1,
    };
  }

  get whtValidation(): {
    totalWithheld: string;
    breakdownByRate: { rate: string; description: string; count: number; amount: string }[];
    isValid: boolean;
  } {
    if (!this.report)
      return { totalWithheld: '—', breakdownByRate: [], isValid: false };
    const { wht } = this.report;
    const breakdownRows = this.whtBreakdownRows;
    const breakdownSum = breakdownRows.reduce((sum, row) => sum + row.amount, 0);
    return {
      totalWithheld: this.fmt.formatCurrency(wht.totalWithheld),
      breakdownByRate: breakdownRows.map((row) => ({
        rate: row.rate,
        description: row.description,
        count: row.transactionCount,
        amount: this.fmt.formatCurrency(row.amount),
      })),
      isValid: Math.abs(breakdownSum - wht.totalWithheld) < 1,
    };
  }

  // ── GL account label helper ───────────────────────────────────────────────
  get whtBreakdownRows(): Array<{
    rate: string;
    category: string;
    description: string;
    transactionCount: number;
    amount: number;
  }> {
    return (this.report?.wht.rateBreakdown ?? []).map((row) => ({
      rate: row.rate ?? row.rateLabel,
      category: row.description ?? row.rateLabel,
      description: row.description ?? row.rateLabel,
      transactionCount: row.transactionCount ?? 0,
      amount: row.totalAmount ?? row.amount,
    }));
  }

  getGLAccountLabel(code: string): string {
    const map: Record<string, string> = {
      '1050': 'VAT Recoverable (Asset)',
      '2140': 'VAT Payable (Liability)',
      '2150': 'WHT Payable (Liability)',
      '2160': 'Income Tax Payable (Liability)',
      '2170': 'Education Tax Payable (Liability)',
      '2180': 'PAYE Payable (Liability)',
    };
    return map[code] ?? code;
  }

  getComplianceScoreClass(score: number): string {
    if (score >= 90) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
  }

  getFilingStatusClass(status: FilingStatus): string {
    const map: Record<FilingStatus, string> = {
      [FilingStatus.FILED]: 'status-filed',
      [FilingStatus.PENDING]: 'status-pending',
      [FilingStatus.OVERDUE]: 'status-overdue',
    };
    return map[status] ?? 'status-pending';
  }

  // ── Row expand ────────────────────────────────────────────────────────────
  toggleLineExpand(id: string): void {
    if (this.expandedLineIds.has(id)) {
      this.expandedLineIds.delete(id);
    } else {
      this.expandedLineIds.add(id);
    }
  }

  isLineExpanded(id: string): boolean {
    return this.expandedLineIds.has(id);
  }

  // ── Tab navigation ────────────────────────────────────────────────────────
  setTab(tab: number | TaxTab): void {
    if (typeof tab === 'number') {
      const tabs: TaxTab[] = ['summary', 'vat', 'wht', 'cit', 'paye', 'history'];
      this.selectedTabIndex = tab;
      this.activeTab = tabs[tab] ?? 'summary';
      return;
    }

    this.activeTab = tab;
    this.selectedTabIndex = ['summary', 'vat', 'wht', 'cit', 'paye', 'history'].indexOf(tab);
  }

  // ── Modal open/close ──────────────────────────────────────────────────────
  openValidationModal(): void {
    this.showValidationModal = true;
  }
  closeValidationModal(): void {
    this.showValidationModal = false;
  }
  openComplianceModal(): void {
    this.showComplianceModal = true;
  }
  closeComplianceModal(): void {
    this.showComplianceModal = false;
  }
  openExportModal(): void {
    this.showExportModal = true;
  }
  closeExportModal(): void {
    this.showExportModal = false;
  }

  // ── Export ────────────────────────────────────────────────────────────────
  exportTaxReport(): void {
    if (!this.report) return;
    const payload = {
      period: this.report.reportingPeriod,
      generatedAt: new Date().toISOString(),
      vat: this.report.vat,
      wht: this.report.wht,
      cit: this.report.cit,
      complianceScore: this.report.complianceScore,
    };
    this.triggerDownload(`tax-report-${this.report.reportingPeriod}`, payload);
    this.showExportModal = false;
  }

  exportPayeSchedule(): void {
    if (!this.report) return;
    this.triggerDownload(`paye-schedule-${this.report.reportingPeriod}`, {
      reportType: 'PAYE Schedule',
      period: this.report.reportingPeriod,
      employees: this.report.paye.employees,
      total: this.report.paye.totalPayeDeducted,
    });
  }

  private triggerDownload(filename: string, data: object): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private buildCharts(report: TaxSummaryReportDTO): void {
    this.taxCompositionChartOptions = {
      series: [
        report.vat.netVatPayable,
        report.wht.totalWithheld,
        report.cit.totalCitLiability,
        report.paye.totalPayeDeducted,
        report.cit.educationTaxLevy,
      ],
      chart: {
        type: 'donut',
        height: 360,
      },
      labels: ['VAT', 'WHT', 'CIT', 'PAYE', 'EDT'],
      colors: ['#1f7a4d', '#f08a12', '#2f6fc2', '#6d47c9', '#e3342f'],
      legend: {
        position: 'bottom',
        fontSize: '13px',
      },
      dataLabels: {
        enabled: true,
        formatter: (value: number) => `${value.toFixed(0)}%`,
      },
      plotOptions: {
        pie: {
          donut: {
            size: '62%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                formatter: () => this.fmt.formatCurrency(this.totalTaxPosition),
              },
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (value: number) => this.fmt.formatCurrency(value),
        },
      },
    };

    this.monthlyTrendChartOptions = {
      series: [
        { name: 'VAT', data: report.monthlyTaxTrend.map((entry) => entry.vatAmount) },
        { name: 'WHT', data: report.monthlyTaxTrend.map((entry) => entry.whtAmount) },
        { name: 'PAYE', data: report.monthlyTaxTrend.map((entry) => entry.payeAmount) },
      ],
      chart: {
        type: 'bar',
        height: 360,
        stacked: false,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '46%',
        },
      },
      xaxis: {
        categories: report.monthlyTaxTrend.map((entry) => entry.periodLabel),
      },
      yaxis: {
        labels: {
          formatter: (value: number) => `₦${Math.round(value / 1000)}K`,
        },
      },
      colors: ['#1f7a4d', '#f08a12', '#6d47c9'],
      legend: {
        position: 'bottom',
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        y: {
          formatter: (value: number) => this.fmt.formatCurrency(value),
        },
      },
    };
  }
}
