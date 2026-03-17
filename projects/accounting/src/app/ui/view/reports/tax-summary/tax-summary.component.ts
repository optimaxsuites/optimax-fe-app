import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy,
  Input, Output, EventEmitter,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  TaxService,
  TaxType,
  TaxLine,
  TaxSummary,
  TaxComplianceStatus,
  CITEstimate,
  GL_ACCOUNTS,
  FILING_DEADLINES,
  LATE_PENALTIES,
  NIGERIAN_VAT_RATE,
} from '../../../service/tax/tax.service';
import { AccountingFormatService } from '../../../service/accounting-format/accounting-format.service';
import { FinancialCalculationService } from '../../../service/financial-calculation/financial-calculation.service';

interface TaxSummaryDisplay {
  period: string;
  type: TaxType;
  grossInputTax: string;
  grossOutputTax: string;
  netLiability: string;
  complianceScore: number;
  filingRequired: boolean;
  paymentDue: string;
}

@Component({
  selector: 'app-tax-summary',
  templateUrl: './tax-summary.component.html',
  styleUrls: ['./tax-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class TaxSummaryComponent implements OnInit, OnDestroy {

  @Input() period: string = new Date().toISOString().split('T')[0].substring(0, 7);
  @Input() currentPeriod: string = new Date().toISOString().split('T')[0].substring(0, 7);
  @Output() taxEntryCreated         = new EventEmitter<TaxLine>();
  @Output() complianceStatusChanged = new EventEmitter<TaxComplianceStatus>();


  taxEntryForm!: FormGroup;
  vatFilterForm!: FormGroup;


  taxLines: TaxLine[]                          = [];
  taxSummaries = new Map<string, TaxSummaryDisplay>();
  complianceStatus: TaxComplianceStatus | null = null;

  vatSummary:          TaxSummary  | null = null;
  whtSummary:          TaxSummary  | null = null;

  citEstimate:         CITEstimate | null = null;

  corporateTaxSummary: TaxSummary  | null = null;


  selectedTaxType:    TaxType                    = TaxType.VAT;
  selectedReportType: 'summary' | 'vat' | 'wht' = 'summary';
  showTaxBreakdown    = false;

  readonly TaxType          = TaxType;
  readonly GL_ACCOUNTS      = GL_ACCOUNTS;
  readonly FILING_DEADLINES = FILING_DEADLINES;
  readonly LATE_PENALTIES   = LATE_PENALTIES;
  readonly NIGERIAN_VAT_RATE = NIGERIAN_VAT_RATE;

  taxTypes = [TaxType.VAT, TaxType.WHT, TaxType.CORPORATE_TAX];

  vatDirections = [
    { label: 'Sales (Output)',    value: 'output' },
    { label: 'Purchases (Input)', value: 'input'  },
  ];

  whtRateCodes = [
    { label: 'Services — 5%',                    value: 'WHT-050' },
    { label: 'Contractors — 10%',                value: 'WHT-100' },
    { label: 'Corporate Dividends — 2.5%',       value: 'WHT-025' },
    { label: "Non-Resident Directors' — 15%",    value: 'WHT-150' },
  ];

  expandedTaxLines = new Set<string>();
  selectedTaxLine: TaxLine | null = null;

  currentDate: Date   = new Date();
  currentYear: number = new Date().getFullYear();

  private destroy$ = new Subject<void>();

  constructor(
    private fb:                          FormBuilder,
    private taxService:                  TaxService,
    private formatService:               AccountingFormatService,
    private financialCalculationService: FinancialCalculationService,
  ) {}


  ngOnInit(): void {
    const effective   = this.currentPeriod || this.period;
    this.currentPeriod = effective;
    this.period        = effective;
    this.currentYear   = new Date().getFullYear();
    this.currentDate   = new Date();

    this.initializeForms();
    this.loadTaxData();
    this.loadReportData();
    this.subscribeToTaxChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  private initializeForms(): void {
    this.taxEntryForm = this.fb.group({
      type:        [TaxType.VAT, Validators.required],
      amount:      [0,           [Validators.required, Validators.min(0.01)]],
      rateCode:    ['VAT-075',   Validators.required],
      description: ['',          Validators.required],
      direction:   ['output'],
      vendorName:  [''],
    });

    this.vatFilterForm = this.fb.group({
      period:         [this.currentPeriod, Validators.required],
      direction:      ['all'],
      minAmount:      [0],
      showReconciled: [false],
    });
  }


  private loadTaxData(): void {
    this.taxLines = this.taxService.getTaxLinesByPeriod(this.currentPeriod);

    for (const type of this.taxTypes) {
      const s = this.taxService.generateTaxSummary(this.currentPeriod, type);
      if (s) this.displayTaxSummary(s);
    }

    this.complianceStatus = this.taxService.getComplianceStatus(
      this.currentPeriod, this.selectedTaxType,
    );
  }

  private loadReportData(): void {
    this.vatSummary          = this.taxService.generateTaxSummary(this.currentPeriod, TaxType.VAT);
    this.whtSummary          = this.taxService.generateTaxSummary(this.currentPeriod, TaxType.WHT);
    this.corporateTaxSummary = this.taxService.generateTaxSummary(this.currentPeriod, TaxType.CORPORATE_TAX);


    this.citEstimate = this.taxService.calculateCIT(160_000_000, 16_000_000);
  }

  private subscribeToTaxChanges(): void {
    this.taxService.taxSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe((summaries: Map<string, TaxSummary> | null) => {
        if (summaries) {
          for (const [, s] of summaries) this.displayTaxSummary(s);
        }
      });
  }

  private displayTaxSummary(summary: TaxSummary): void {
    this.taxSummaries.set(`${summary.period}-${summary.taxType}`, {
      period:          summary.period,
      type:            summary.taxType,
      grossInputTax:   this.fmt(summary.grossInputTax),
      grossOutputTax:  this.fmt(summary.grossOutputTax),
      netLiability:    this.fmt(summary.netTaxLiability),
      complianceScore: 0,
      filingRequired:  summary.isFilingDue,
      paymentDue:      this.fmt(summary.amountPayableToFIRS ?? summary.netTaxLiability),
    });
  }


  submitVATEntry(): void {
    if (!this.taxEntryForm.valid) return;
    const v = this.taxEntryForm.value;
    const line = this.taxService.calculateVAT(v.amount, v.rateCode ?? 'VAT-075', v.direction ?? 'output');
    if (line) {
      this.taxLines.push(line);
      this.taxEntryCreated.emit(line);
      this.taxEntryForm.reset({ type: TaxType.VAT, rateCode: 'VAT-075', direction: 'output', amount: 0 });
      this.loadTaxData();
    }
  }

  submitWHTEntry(): void {
    if (!this.taxEntryForm.valid) return;
    const v = this.taxEntryForm.value;
    const line = this.taxService.calculateWHT(v.amount, v.rateCode ?? 'WHT-050', v.vendorName ?? '', 'output');
    if (line) {
      this.taxLines.push(line);
      this.taxEntryCreated.emit(line);
      this.taxEntryForm.reset({ type: TaxType.WHT, rateCode: 'WHT-050', amount: 0 });
      this.loadTaxData();
    }
  }

  validateTaxCalculations(): void {
    const r = this.taxService.validateTaxCalculations(this.currentPeriod);
    r.isValid
      ? console.log('✓ All tax calculations validated successfully')
      : console.warn('✗ Validation errors:', r.errors);
  }

  reconcileTaxes(): void {
    const r = this.taxService.reconcileTaxForPeriod(this.currentPeriod, this.selectedTaxType);
    console.log('Tax Reconciliation:', r);
  }

  checkComplianceStatus(): void {
    this.complianceStatus = this.taxService.getComplianceStatus(
      this.currentPeriod, this.selectedTaxType,
    );
    this.complianceStatusChanged.emit(this.complianceStatus);
  }

  changePeriod(newPeriod: string): void {
    this.currentPeriod = newPeriod;
    this.period        = newPeriod;
    this.loadTaxData();
    this.loadReportData();
  }

  changeTaxType(type: TaxType): void {
    this.selectedTaxType  = type;
    this.complianceStatus = this.taxService.getComplianceStatus(this.currentPeriod, type);
  }

  expandTaxLine(id: string): void {
    this.expandedTaxLines.has(id)
      ? this.expandedTaxLines.delete(id)
      : this.expandedTaxLines.add(id);
  }


  get currentTaxSummary(): TaxSummaryDisplay | undefined {
    return this.taxSummaries.get(`${this.currentPeriod}-${this.selectedTaxType}`);
  }


  get vatReturnData() {
    if (!this.vatSummary) return null;
    const v = this.vatSummary;
    const creditBalance = v.vatCreditCarryForward ?? 0;
    return {
      totalSales:       this.fmt(v.grossOutputTax / NIGERIAN_VAT_RATE),
      salesVAT:         this.fmt(v.grossOutputTax),
      totalPurchases:   this.fmt(v.grossInputTax  / NIGERIAN_VAT_RATE),
      purchasesVAT:     this.fmt(v.grossInputTax),
      payable:          this.fmt(v.grossOutputTax),
      recoverable:      this.fmt(v.grossInputTax),
      vatCreditBalance: this.fmt(creditBalance),
      hasCreditBalance: creditBalance > 0,
      netVATPayable:    this.fmt(v.netTaxLiability),
      amountToFIRS:     this.fmt(v.amountPayableToFIRS ?? v.netTaxLiability),
    };
  }


  get whtReportData() {
    if (!this.whtSummary) return null;
    return {
      totalWHTWithheld: this.fmt(this.whtSummary.netTaxLiability),
      breakdownByRate: this.whtSummary.byRate.map(r => ({
        rate:        `${(r.rate * 100).toFixed(r.rate < 0.10 ? 1 : 0)}%`,
        rateCode:    this.rateToCode(r.rate),
        description: this.taxService.getWHTRateDescription(this.rateToCode(r.rate)),
        input:       this.fmt(r.input),
        output:      this.fmt(r.output),
        amount:      this.fmt(r.net),
        count:       this.whtSummary!.taxLines.filter(l => l.rate === r.rate).length,
      })),
    };
  }

  get totalTaxPayable(): number {
    return (this.vatSummary?.netTaxLiability ?? 0) + (this.whtSummary?.netTaxLiability ?? 0);
  }

  get totalTaxRecoverable(): number {
    return this.vatSummary?.grossInputTax ?? 0;
  }

  get netTaxPosition(): number {
    return this.totalTaxPayable - this.totalTaxRecoverable;
  }


  formatCurrency(amount: number): string {
    return this.fmt(amount);
  }

  formatTaxAmount(amount: number): string {
    return this.fmt(amount);
  }


  formatAccounting(amount: number): string {
    if (amount < 0) return `(${this.fmt(Math.abs(amount))})`;
    return this.fmt(amount);
  }

  getGLAccountLabel(code: string): string {
    return this.taxService.getGLAccountLabel(code);
  }


  getTaxClassificationBadge(line: TaxLine): { class: string; text: string } {
    const gl = this.taxService.classifyTaxForGL(line);
    return {
      class: gl.type === 'Liability' ? 'badge-warning' : 'badge-info',
      text:  gl.type,
    };
  }


  getComplianceScoreClass(score: number): string {
    if (score >= 90) return 'bg-emerald-100 text-emerald-700';
    if (score >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-600';
  }


  getIssueSeverityClass(severity: 'low' | 'medium' | 'high'): string {
    const map: Record<'low' | 'medium' | 'high', string> = {
      low:    'bg-blue-50 text-blue-800',
      medium: 'bg-amber-50 text-amber-800',
      high:   'bg-red-50 text-red-700',
    };
    return map[severity];
  }


  getComplianceScoreBreakdown(): { label: string; points: number; earned: boolean }[] {
    const s = this.complianceStatus;
    if (!s) return [];
    return [
      { label: 'VAT Filed',          points: 25, earned: s.filed },
      { label: 'VAT Paid',           points: 25, earned: s.paid  },
      { label: 'WHT Filed',          points: 20, earned: false    },
      { label: 'WHT Paid',           points: 15, earned: false    },
      { label: 'No Flagged Issues',  points: 15, earned: (s.flaggedIssues?.length ?? 0) === 0 },
    ];
  }

  getPeriodDateRange(period: string): string {
    if (!period) return '';
    const [y, m] = period.split('-').map(Number);
    const start  = new Date(y, m - 1, 1);
    const end    = new Date(y, m,     0);
    return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  }

  getPeriodDisplay(): string {
    if (!this.currentPeriod) return '';
    const [y, m] = this.currentPeriod.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  getWHTRateDescription(rateCode: string): string {
    return this.taxService.getWHTRateDescription(rateCode);
  }


  exportVATReport(): void {
    if (!this.vatSummary) return;
    this.download('vat-report', {
      reportType: 'VAT Return',
      period:     this.currentPeriod,
      summary: {
        grossOutputVAT:    this.vatSummary.grossOutputTax,
        grossInputVAT:     this.vatSummary.grossInputTax,
        netVATLiability:   this.vatSummary.netTaxLiability,
        vatCreditBalance:  this.vatSummary.vatCreditCarryForward,
        amountPayableToFIRS: this.vatSummary.amountPayableToFIRS,
      },
      entries: this.vatSummary.taxLines,
    });
  }

  exportWHTReport(): void {
    if (!this.whtSummary) return;
    this.download('wht-report', {
      reportType: 'Withholding Tax Schedule',
      period:     this.currentPeriod,
      summary: { totalWHTWithheld: this.whtSummary.netTaxLiability },
      entries:    this.whtSummary.taxLines,
    });
  }

  exportTaxReport(): void {
    this.download('tax-report', {
      period:      this.currentPeriod,
      generatedAt: new Date().toISOString(),
      vatSummary:  this.vatSummary,
      whtSummary:  this.whtSummary,
      citEstimate: this.citEstimate,
      compliance:  this.complianceStatus,
      taxLines:    this.taxLines,
    });
  }


  private fmt(amount: number): string {
    return this.formatService.formatCurrency(amount);
  }

  private download(filename: string, data: object): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `${filename}-${this.currentPeriod}.json`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Reverse-lookup WHT rate code from numeric rate */
  private rateToCode(rate: number): string {
    const map: Record<number, string> = {
      0.05:  'WHT-050',
      0.10:  'WHT-100',
      0.025: 'WHT-025',
      0.15:  'WHT-150',
    };
    return map[rate] ?? 'WHT-050';
  }
}