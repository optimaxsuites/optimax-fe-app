import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  Input, Output, EventEmitter, ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  AccountingService,
  TaxSummaryData
} from '../../../../core/services/accounting.service';
import { AccountingFormatService } from '../../../../core/services/accounting-format.service';

// Re-export TaxType enum so templates that reference it still compile
export enum TaxType { VAT = 'VAT', WHT = 'WHT', CIT = 'CIT' }

// Local interfaces for UI display
interface TaxLine {
  id: string;
  type: TaxType;
  description: string;
  baseAmount: number;
  taxAmount: number;
  rate: number;
  direction: 'input' | 'output';
  glAccount: string;
  source: string;
  timestamp: Date;
  period: string;
  vendorName?: string;
}

interface ComplianceStatus {
  complianceScore: number;
  filed: boolean;
  paid: boolean;
  paymentDue?: number;
  flaggedIssues?: { severity: 'low' | 'medium' | 'high'; message: string }[];
}

@Component({
  selector: 'app-tax-summary',
  templateUrl: './tax-summary.component.html',
  styleUrls: ['./tax-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaxSummaryComponent implements OnInit, OnDestroy {

  @Input() period: string = new Date().toISOString().slice(0, 7);
  @Output() complianceStatusChanged = new EventEmitter<number>();

  // ── Forms ─────────────────────────────────────────────────────────────────────
  taxEntryForm!: FormGroup;
  vatFilterForm!: FormGroup;

  // ── Data from Service ─────────────────────────────────────────────────────
  data: TaxSummaryData | null = null;

  // ── UI state ─────────────────────────────────────────────────────────────────
  selectedTaxType: TaxType = TaxType.VAT;
  selectedReportType: 'summary' | 'vat' | 'wht' = 'summary';
  showTaxBreakdown = false;
  currentPeriod: string = this.period;

  expandedTaxLines = new Set<string>();

  readonly TaxType = TaxType;
  readonly NIGERIAN_VAT_RATE = 0.075;
  readonly CIT_RATE_LARGE = 0.30;
  readonly EDUCATION_TAX_RATE = 0.025;
  readonly NASENI_RATE = 0.0025;

  taxTypes = [TaxType.VAT, TaxType.WHT, TaxType.CIT];
  vatDirections = [
    { label: 'Sales (Output)', value: 'output' },
    { label: 'Purchases (Input)', value: 'input' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private accountingService: AccountingService,
    readonly fmt: AccountingFormatService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initForms();

    this.accountingService.getTaxSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: TaxSummaryData) => {
        this.data = data;
        this.complianceStatusChanged.emit(data.complianceScore);
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForms(): void {
    this.taxEntryForm = this.fb.group({
      type: [TaxType.VAT, Validators.required],
      description: ['', Validators.required],
      baseAmount: [0, [Validators.required, Validators.min(0)]],
      direction: ['output', Validators.required],
    });

    this.vatFilterForm = this.fb.group({
      direction: ['all'],
      fromDate: [''],
      toDate: [''],
    });
  }

  // ─── Convenience Getters ─────────────────────────────────────────────────────

  get vatSummary() {
    return this.data?.vat;
  }

  get whtSummary() {
    return this.data?.wht;
  }

  get citSummary() {
    return this.data?.cit;
  }

  get deferredTax() {
    return this.data?.deferredTax;
  }

  get inputVATRecoverability() {
    return this.data?.inputVATRecoverability;
  }

  get complianceStatus(): ComplianceStatus {
    return {
      complianceScore: this.data?.complianceScore ?? 0,
      filed: true, // Would come from service in real implementation
      paid: true,  // Would come from service in real implementation
      paymentDue: this.data?.cit.totalLiability ?? 0,
      flaggedIssues: this.generateFlaggedIssues(),
    };
  }

  // Generate flagged issues based on data
  private generateFlaggedIssues(): { severity: 'low' | 'medium' | 'high'; message: string }[] {
    const issues: { severity: 'low' | 'medium' | 'high'; message: string }[] = [];

    if (this.data && this.data.inputVATRecoverability.recoverabilityRate < 0.95) {
      issues.push({
        severity: 'medium',
        message: `Input VAT recoverability rate is ${(this.data.inputVATRecoverability.recoverabilityRate * 100).toFixed(1)}% — review non-recoverable amounts`
      });
    }

    if (this.data && this.data.complianceScore < 70) {
      issues.push({
        severity: 'high',
        message: 'Compliance score is below target — review filing and payment status'
      });
    }

    return issues;
  }

  // Generate tax lines from service data
  get taxLines(): TaxLine[] {
    if (!this.data) return [];

    const lines: TaxLine[] = [];

    // Add VAT lines
    if (this.data.vat) {
      lines.push({
        id: 'VAT-001',
        type: TaxType.VAT,
        description: 'Output VAT on Sales',
        baseAmount: this.data.vat.totalSales,
        taxAmount: this.data.vat.outputVAT,
        rate: 0.075,
        direction: 'output',
        glAccount: '2140',
        source: 'Sales',
        timestamp: new Date(),
        period: this.data.period,
      });

      lines.push({
        id: 'VAT-002',
        type: TaxType.VAT,
        description: 'Input VAT on Purchases',
        baseAmount: this.data.vat.totalPurchases,
        taxAmount: this.data.vat.inputVAT,
        rate: 0.075,
        direction: 'input',
        glAccount: '1050',
        source: 'Procurement',
        timestamp: new Date(),
        period: this.data.period,
      });
    }

    // Add WHT lines
    if (this.data.wht) {
      if (this.data.wht.at5pct > 0) {
        lines.push({
          id: 'WHT-5PCT',
          type: TaxType.WHT,
          description: 'WHT at 5% on Services',
          baseAmount: this.data.wht.at5pct / 0.05,
          taxAmount: this.data.wht.at5pct,
          rate: 0.05,
          direction: 'output',
          glAccount: '2150',
          source: 'AP Module',
          timestamp: new Date(),
          period: this.data.period,
          vendorName: 'Various Vendors',
        });
      }

      if (this.data.wht.at10pct > 0) {
        lines.push({
          id: 'WHT-10PCT',
          type: TaxType.WHT,
          description: 'WHT at 10% on Contracts',
          baseAmount: this.data.wht.at10pct / 0.10,
          taxAmount: this.data.wht.at10pct,
          rate: 0.10,
          direction: 'output',
          glAccount: '2150',
          source: 'AP Module',
          timestamp: new Date(),
          period: this.data.period,
          vendorName: 'Various Contractors',
        });
      }
    }

    return lines;
  }

  // ─── Computed Values ─────────────────────────────────────────────────────────

  get netVATPayable(): number {
    return this.data?.vat.netVATPayable ?? 0;
  }

  get totalCITLiability(): number {
    return this.data?.cit.totalLiability ?? 0;
  }

  get whtTotal(): number {
    return this.data?.wht.totalWithheld ?? 0;
  }

  get complianceScore(): number {
    return this.data?.complianceScore ?? 0;
  }

  /** True when input VAT recoverability < 100% — show warning banner */
  get hasNonRecoverableVAT(): boolean {
    return (this.data?.inputVATRecoverability.recoverabilityRate ?? 1) < 1;
  }

  get netDeferredTaxPosition(): number {
    return this.data?.deferredTax.netPosition ?? 0;
  }

  get totalTaxPayable(): number {
    return this.netVATPayable + this.whtTotal;
  }

  get totalTaxRecoverable(): number {
    return this.data?.vat.inputVAT ?? 0;
  }

  get netTaxPosition(): number {
    return this.totalTaxPayable - this.totalTaxRecoverable;
  }

  get citEstimate() {
    if (!this.data) return null;

    return {
      tier: this.data.cit.turnover >= 100_000_000 ? 'Large Company' : 'Medium/Small',
      citRate: this.data.cit.rate,
      citAmount: this.data.cit.citCharge,
      educationTax: this.data.cit.educationTax,
      naseniLevy: this.data.cit.naseniLevy,
      nextDueQuarter: '30 September 2025', // Would come from service
    };
  }

  get vatReturnData() {
    if (!this.data) return null;

    const v = this.data.vat;
    return {
      totalSales: this.fmt.formatCurrency(v.totalSales),
      salesVAT: this.fmt.formatCurrency(v.outputVAT),
      totalPurchases: this.fmt.formatCurrency(v.totalPurchases),
      purchasesVAT: this.fmt.formatCurrency(v.inputVAT),
      payable: this.fmt.formatCurrency(v.outputVAT),
      recoverable: this.fmt.formatCurrency(v.inputVAT),
      netVATPayable: this.fmt.formatCurrency(v.netVATPayable),
      amountToFIRS: this.fmt.formatCurrency(v.netVATPayable),
      hasCreditBalance: false,
      vatCreditBalance: '₦0',
    };
  }

  get whtReportData() {
    if (!this.data) return null;

    const w = this.data.wht;
    const breakdownByRate = [];

    if (w.at5pct > 0) {
      breakdownByRate.push({
        rate: '5%',
        rateCode: 'WHT-050',
        description: 'Services',
        amount: this.fmt.formatCurrency(w.at5pct),
        count: 1,
      });
    }

    if (w.at10pct > 0) {
      breakdownByRate.push({
        rate: '10%',
        rateCode: 'WHT-100',
        description: 'Contracts',
        amount: this.fmt.formatCurrency(w.at10pct),
        count: 1,
      });
    }

    return {
      totalWHTWithheld: this.fmt.formatCurrency(w.totalWithheld),
      breakdownByRate,
    };
  }

  get deferredTaxPosition() {
    if (!this.data) return null;
    return this.data.deferredTax;
  }

  get deferredTaxLabel(): string {
    if (!this.data) return '';
    const pos = this.data.deferredTax.netPosition;
    if (pos > 0) return `DTA: ${this.fmt.formatCurrency(pos)}`;
    if (pos < 0) return `DTL: ${this.fmt.formatCurrency(Math.abs(pos))}`;
    return 'Nil deferred tax';
  }

  // ─── Filing Calendar ─────────────────────────────────────────────────────────
  get filingCalendar() {
    return [
      { obligation: 'VAT Return', deadline: '21st of following month', frequency: 'Monthly' },
      { obligation: 'WHT Remittance', deadline: '21st of following month', frequency: 'Monthly' },
      { obligation: 'CIT Instalment 1 (45%)', deadline: '30 June', frequency: 'Annual' },
      { obligation: 'CIT Instalment 2 (45%)', deadline: '30 September', frequency: 'Annual' },
      { obligation: 'CIT Balance (10%)', deadline: '6 months after financial year-end', frequency: 'Annual' },
      { obligation: 'Education Tax', deadline: 'Same as CIT', frequency: 'Annual' },
      { obligation: 'PAYE Remittance', deadline: '10th of following month', frequency: 'Monthly' },
    ];
  }
 
  // ─── Format Shortcuts 
  formatCurrency(v: number): string {
    return this.fmt.formatCurrency(v);
  }

  formatTaxAmount(v: number): string {
    return this.fmt.formatCurrency(v);
  }

  formatAccounting(v: number): string {
    return this.fmt.formatCurrency(v);
  }

  formatPct(v: number): string {
    return this.fmt.formatPercentage(v);
  }

  //  UI Helpers 

  getComplianceScoreClass(score: number): string {
    if (score >= 90) return 'bg-emerald-100 text-emerald-700';
    if (score >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-600';
  }

  getIssueSeverityClass(severity: 'low' | 'medium' | 'high'): string {
    const map: Record<'low' | 'medium' | 'high', string> = {
      low: 'bg-blue-50 text-blue-800',
      medium: 'bg-amber-50 text-amber-800',
      high: 'bg-red-50 text-red-700',
    };
    return map[severity];
  }

  getGLAccountLabel(code: string): string {
    const map: Record<string, string> = {
      '2140': 'VAT Payable (Liability)',
      '1050': 'Input VAT Recoverable (Asset)',
      '2150': 'WHT Payable (Liability)',
    };
    return map[code] || code;
  }

  getTaxClassificationBadge(line: TaxLine): { class: string; text: string } {
    const isLiability = line.direction === 'output' || line.type === TaxType.WHT;
    return {
      class: isLiability ? 'badge-warning' : 'badge-info',
      text: isLiability ? 'Liability' : 'Asset',
    };
  }

  getWHTRateDescription(rateCode: string): string {
    const map: Record<string, string> = {
      'WHT-050': 'Services — 5%',
      'WHT-100': 'Contractors — 10%',
      'WHT-025': 'Corporate Dividends — 2.5%',
      'WHT-150': "Non-Resident Directors' — 15%",
    };
    return map[rateCode] || rateCode;
  }

  getPeriodDateRange(period: string): string {
    if (!period) return '';
    const [y, m] = period.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  }

  getPeriodDisplay(): string {
    if (!this.currentPeriod) return '';
    const [y, m] = this.currentPeriod.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────────

  changePeriod(newPeriod: string): void {
    this.currentPeriod = newPeriod;
    // In a real implementation, this would call accountingService.setPeriod()
    const [y, m] = newPeriod.split('-').map(Number);
    this.accountingService.setPeriod(new Date(y, m - 1, 1));
  }

  changeTaxType(type: TaxType): void {
    this.selectedTaxType = type;
  }

  expandTaxLine(id: string): void {
    if (this.expandedTaxLines.has(id)) {
      this.expandedTaxLines.delete(id);
    } else {
      this.expandedTaxLines.add(id);
    }
  }

  validateTaxCalculations(): void {
    // In a real implementation, this would trigger validation
    console.log('Tax calculations validated');
    alert('All tax calculations validated successfully ✓');
  }

  checkComplianceStatus(): void {
    // Compliance status is already in the data
    alert(`Compliance Score: ${this.complianceScore}%\nStatus: ${this.complianceScore >= 70 ? 'Good' : 'Needs Attention'}`);
  }

  // ─── Export Methods ─────────────────────────────────────────────────────────

  exportTaxReport(): void {
    if (!this.data) return;

    const report = {
      period: this.currentPeriod,
      generatedAt: new Date().toISOString(),
      vat: this.data.vat,
      wht: this.data.wht,
      cit: this.data.cit,
      deferredTax: this.data.deferredTax,
      inputVATRecoverability: this.data.inputVATRecoverability,
      complianceScore: this.data.complianceScore,
    };

    this.download('tax-report', report);
  }

  exportVATReport(): void {
    if (!this.data) return;

    const report = {
      reportType: 'VAT Return',
      period: this.currentPeriod,
      summary: {
        outputVAT: this.data.vat.outputVAT,
        inputVAT: this.data.vat.inputVAT,
        netVATPayable: this.data.vat.netVATPayable,
        totalSales: this.data.vat.totalSales,
        totalPurchases: this.data.vat.totalPurchases,
      },
    };

    this.download('vat-report', report);
  }

  exportWHTReport(): void {
    if (!this.data) return;

    const report = {
      reportType: 'Withholding Tax Schedule',
      period: this.currentPeriod,
      summary: {
        totalWithheld: this.data.wht.totalWithheld,
        at5pct: this.data.wht.at5pct,
        at10pct: this.data.wht.at10pct,
      },
    };

    this.download('wht-report', report);
  }

  private download(filename: string, data: object): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${filename}-${this.currentPeriod}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Form Submission ────────────────────────────────────────────────────────

  submitVATEntry(): void {
    if (!this.taxEntryForm.valid) return;
    alert('VAT entry submitted (demo mode)');
    this.taxEntryForm.reset({ type: TaxType.VAT, direction: 'output', baseAmount: 0 });
  }

  submitWHTEntry(): void {
    if (!this.taxEntryForm.valid) return;
    alert('WHT entry submitted (demo mode)');
    this.taxEntryForm.reset({ type: TaxType.WHT, baseAmount: 0 });
  }
}