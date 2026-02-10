import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Mock Service Imports - Ensure these exist in your project structure
import { TaxService, TaxType, TaxLine, TaxSummary, TaxComplianceStatus } from '../../../service/tax/tax.service';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule]
})
export class TaxSummaryComponent implements OnInit, OnDestroy {

  @Input() period: string = new Date().toISOString().split('T')[0].substring(0, 7);
  @Input() currentPeriod: string = new Date().toISOString().split('T')[0].substring(0, 7);
  @Output() taxEntryCreated = new EventEmitter<TaxLine>();
  @Output() complianceStatusChanged = new EventEmitter<TaxComplianceStatus>();

  // Forms
  taxEntryForm!: FormGroup;
  vatFilterForm!: FormGroup;

  // Data
  taxLines: TaxLine[] = [];
  taxSummaries = new Map<string, TaxSummaryDisplay>();
  complianceStatus: TaxComplianceStatus | null = null;
  
  // Report data
  vatSummary: TaxSummary | null = null;
  whtSummary: TaxSummary | null = null;
  corporateTaxSummary: TaxSummary | null = null;
  
  // UI state
  selectedTaxType: TaxType = TaxType.VAT;
  selectedReportType: 'summary' | 'vat' | 'wht' = 'summary';
  showTaxBreakdown = false;
  
  // Tax types for UI
  readonly TaxType = TaxType;
  taxTypes = [TaxType.VAT, TaxType.WHT, TaxType.CORPORATE_TAX];
  
  // VAT directions
  vatDirections = [
    { label: 'Sales (Output)', value: 'output' },
    { label: 'Purchases (Input)', value: 'input' }
  ];
  
  // WHT rate codes
  whtRateCodes = [
    { label: 'Services (5%)', value: 'WHT-050' },
    { label: 'Contractors (10%)', value: 'WHT-100' }
  ];

  // For drilling down to tax entries
  selectedTaxLine: TaxLine | null = null;
  expandedTaxLines = new Set<string>();

  private destroy$ = new Subject<void>();
new: any;
currentYear: any;
  currentDate!: string | number | Date;

  constructor(
    private fb: FormBuilder,
    private taxService: TaxService,
    private formatService: AccountingFormatService,
    private financialCalculationService: FinancialCalculationService
  ) {}

  ngOnInit(): void {
    const effectivePeriod = this.currentPeriod || this.period;
    this.period = effectivePeriod;
    this.currentPeriod = effectivePeriod;
    
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
      type: [TaxType.VAT, Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      rateCode: ['VAT-075', Validators.required],
      description: ['', Validators.required],
      direction: ['output'],
      vendorName: ['']
    });

    this.vatFilterForm = this.fb.group({
      period: [this.currentPeriod, Validators.required],
      direction: ['all'],
      minAmount: [0],
      showReconciled: [false]
    });
  }

  private loadTaxData(): void {
    this.taxLines = this.taxService.getTaxLinesByPeriod(this.currentPeriod);
    
    for (const type of this.taxTypes) {
      const summary = this.taxService.generateTaxSummary(this.currentPeriod, type);
      if (summary) {
        this.displayTaxSummary(summary);
      }
    }

    this.complianceStatus = this.taxService.getComplianceStatus(this.currentPeriod, this.selectedTaxType);
  }

  private loadReportData(): void {
    this.vatSummary = this.taxService.generateTaxSummary(this.currentPeriod, TaxType.VAT);
    this.whtSummary = this.taxService.generateTaxSummary(this.currentPeriod, TaxType.WHT);
    this.corporateTaxSummary = this.taxService.generateTaxSummary(this.currentPeriod, TaxType.CORPORATE_TAX);
  }

  private subscribeToTaxChanges(): void {
    this.taxService.taxSummary$
      .pipe(takeUntil(this.destroy$))
      .subscribe((summaries: Map<string, TaxSummary> | null) => {
        if (summaries) {
          for (const [, summary] of summaries) {
            this.displayTaxSummary(summary);
          }
        }
      });
  }

  private displayTaxSummary(summary: TaxSummary): void {
    const displaySummary: TaxSummaryDisplay = {
      period: summary.period,
      type: summary.taxType,
      grossInputTax: this.formatService.formatCurrency(summary.grossInputTax),
      grossOutputTax: this.formatService.formatCurrency(summary.grossOutputTax),
      netLiability: this.formatService.formatCurrency(summary.netTaxLiability),
      complianceScore: 100, // This should come from a service logic
      filingRequired: summary.isFilingDue,
      paymentDue: this.formatService.formatCurrency(summary.netTaxLiability)
    };

    this.taxSummaries.set(`${summary.period}-${summary.taxType}`, displaySummary);
  }

  submitVATEntry(): void {
    if (!this.taxEntryForm.valid) return;
    const formValue = this.taxEntryForm.value;
    
    const taxLine = this.taxService.calculateVAT(
      formValue.amount,
      formValue.rateCode,
      formValue.direction || 'output'
    );

    if (taxLine) {
      this.taxLines.push(taxLine);
      this.taxEntryCreated.emit(taxLine);
      this.taxEntryForm.reset({ type: TaxType.VAT, rateCode: 'VAT-075', direction: 'output' });
      this.loadTaxData(); // Refresh summary
    }
  }

  submitWHTEntry(): void {
    if (!this.taxEntryForm.valid) return;
    const formValue = this.taxEntryForm.value;
    
    const taxLine = this.taxService.calculateWHT(
      formValue.amount,
      formValue.rateCode,
      formValue.vendorName || 'Unknown Vendor'
    );

    if (taxLine) {
      this.taxLines.push(taxLine);
      this.taxEntryCreated.emit(taxLine);
      this.taxEntryForm.reset({ type: TaxType.WHT, rateCode: 'WHT-050' });
      this.loadTaxData(); // Refresh summary
    }
  }

  validateTaxCalculations(): void {
    const validation = this.taxService.validateTaxCalculations(this.currentPeriod);
    if (validation.isValid) {
      console.log('✓ All tax calculations validated successfully');
    } else {
      console.warn('✗ Tax validation errors found:', validation.errors);
    }
  }

  reconcileTaxes(): void {
    const reconciliation = this.taxService.reconcileTaxForPeriod(this.currentPeriod, this.selectedTaxType);
    console.log('Tax Reconciliation:', reconciliation);
  }

  checkComplianceStatus(): void {
    this.complianceStatus = this.taxService.getComplianceStatus(this.currentPeriod, this.selectedTaxType);
    this.complianceStatusChanged.emit(this.complianceStatus);
  }

  changePeriod(newPeriod: string): void {
    this.currentPeriod = newPeriod;
    this.period = newPeriod;
    this.loadTaxData();
    this.loadReportData();
  }

  changeTaxType(type: TaxType): void {
    this.selectedTaxType = type;
    this.complianceStatus = this.taxService.getComplianceStatus(this.currentPeriod, type);
  }

  expandTaxLine(taxLineId: string): void {
    if (this.expandedTaxLines.has(taxLineId)) {
      this.expandedTaxLines.delete(taxLineId);
    } else {
      this.expandedTaxLines.add(taxLineId);
    }
  }

  // --- Getters ---

  get currentTaxSummary(): TaxSummaryDisplay | undefined {
    return this.taxSummaries.get(`${this.currentPeriod}-${this.selectedTaxType}`);
  }

  get vatReturnData() {
    if (!this.vatSummary) return null;
    return {
      period: this.currentPeriod,
      totalSales: this.formatService.formatCurrency(this.vatSummary.grossOutputTax / 0.075),
      salesVAT: this.formatService.formatCurrency(this.vatSummary.grossOutputTax),
      totalPurchases: this.formatService.formatCurrency(this.vatSummary.grossInputTax / 0.075),
      purchasesVAT: this.formatService.formatCurrency(this.vatSummary.grossInputTax),
      netVATPayable: this.formatService.formatCurrency(this.vatSummary.netTaxLiability),
      recoverable: this.formatService.formatCurrency(this.vatSummary.grossInputTax),
      payable: this.formatService.formatCurrency(this.vatSummary.grossOutputTax)
    };
  }

  get whtReportData() {
    if (!this.whtSummary) return null;
    return {
      period: this.currentPeriod,
      totalWHTWithheld: this.formatService.formatCurrency(this.whtSummary.netTaxLiability),
      breakdownByRate: this.whtSummary.byRate.map((rate: any) => ({
        rate: `${(rate.rate * 100).toFixed(0)}%`,
        amount: this.formatService.formatCurrency(rate.net),
        count: this.whtSummary!.taxLines.filter((l: TaxLine) => l.rate === rate.rate).length
      }))
    };
  }



  formatTaxAmount(amount: number): string {
    return this.formatService.formatCurrency(amount);
  }

  formatCurrency(amount: number): string {
    return this.formatService.formatCurrency(amount);
  }

  getGLAccountLabel(accountCode: string): string {
    const labels: { [key: string]: string } = {
      '1050': 'VAT Recoverable (Asset)',
      '2140': 'VAT Payable (Liability)',
      '2150': 'WHT Payable (Liability)',
      '2160': 'Income Tax Payable (Liability)',
      '2170': 'Other Taxes Payable (Liability)'
    };
    return labels[accountCode] || 'Tax Account';
  }

  getTaxClassificationBadge(taxLine: TaxLine): { class: string; text: string } {
    const classification = this.taxService.classifyTaxForGL(taxLine);
    return {
      class: classification.type === 'Liability' ? 'badge-warning' : 'badge-info',
      text: classification.type === 'Liability' ? 'Liability' : 'Asset'
    };
  }

  getComplianceScoreClass(score: number): string {
    if (score >= 90) return 'score-excellent';
    if (score >= 75) return 'score-good';
    if (score >= 60) return 'score-fair';
    return 'score-poor';
  }

  getPeriodDateRange(period: string): string {
    if (!period) return '';
    const [year, month] = period.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }

  getPeriodDisplay(): string {
    if (!this.currentPeriod) return '';
    const [year, month] = this.currentPeriod.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // --- Export Functions ---

  exportVATReport(): void {
    if (!this.vatSummary) return;
    const data = this.generateVATReportData();
    this.downloadReport('vat-report', data);
  }

  exportWHTReport(): void {
    if (!this.whtSummary) return;
    const data = this.generateWHTReportData();
    this.downloadReport('wht-report', data);
  }

  exportTaxReport(): void {
    const data = {
      period: this.currentPeriod,
      generatedAt: new Date().toISOString(),
      summary: this.currentTaxSummary,
      taxLines: this.taxLines,
      compliance: this.complianceStatus
    };
    this.downloadReport('tax-report', data);
  }

  private generateVATReportData(): object {
    if (!this.vatSummary) return {};
    return {
      reportType: 'VAT Return',
      period: this.currentPeriod,
      summary: {
        netVATPayable: this.vatSummary.netTaxLiability
      },
      entries: this.vatSummary.taxLines
    };
  }

  private generateWHTReportData(): object {
    if (!this.whtSummary) return {};
    return {
      reportType: 'Withholding Tax Report',
      period: this.currentPeriod,
      summary: { totalWHTWithheld: this.whtSummary.netTaxLiability },
      entries: this.whtSummary.taxLines
    };
  }

  private downloadReport(filename: string, data: object): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${this.currentPeriod}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}