import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export enum TaxType {
  VAT = 'VAT',                    // Value Added Tax
  WHT = 'WHT',                    // Withholding Tax
  CORPORATE_TAX = 'CORPORATE',    // Corporate Income Tax
  SALES_TAX = 'SALES',            // Sales Tax (where applicable)
  EXCISE = 'EXCISE',              // Excise Tax
  OTHER = 'OTHER'                 // Other taxes
}

export interface TaxRate {
  type: TaxType;
  rate: number;                   // As decimal (0.075 = 7.5%)
  code: string;                   // e.g., 'VAT-75', 'WHT-10'
  description: string;
  glAccountCode: string;          // Where to post (liability)
  isRecoverable: boolean;         // Can be recovered/credited
  effectiveDate: Date;
  expiryDate?: Date;
}


export interface TaxLine {
vendorName: any;
  id: string;
  type: TaxType;
  rateCode: string;
  rate: number;
  baseAmount: number;             // Amount tax is calculated on
  taxAmount: number;              // Calculated tax
  glAccount: string;              // Classification (liability)
  description: string;
  isRecoverable: boolean;
  timestamp: Date;
  source: 'transaction' | 'manual' | 'adjustment';
  relatedDocumentId?: string;     // GL entry, invoice, etc.
}


export interface TaxSummary {
  period: string;
  taxType: TaxType;
  
  // Gross amounts
  grossInputTax: number;          // Tax paid on purchases
  grossOutputTax: number;         // Tax collected on sales
  
  // Net amounts
  netTaxLiability: number;        // Output - Input (payable to gov)
  netTaxRecoverable: number;      // Recoverable amount
  
  // Breakdown by rate
  byRate: {
    rate: number;
    input: number;
    output: number;
    net: number;
  }[];
  
  taxLines: TaxLine[];
  
  // Compliance
  isFilingDue: boolean;
  filingDeadline?: Date;
  status: 'open' | 'in-review' | 'filed' | 'paid';
}

/**
 * Tax reconciliation result
 */
export interface TaxReconciliation {
  period: string;
  taxType: TaxType;
  
  systemCalculation: number;
  auditTrail: string;             // How it was calculated
  
  discrepancies: {
    type: 'missing' | 'duplicate' | 'incorrect_rate' | 'incorrect_amount' | 'wrong_classification';
    description: string;
    amount: number;
    affectedEntries: string[];
  }[];
  
  isReconciled: boolean;
  reconciledBy?: string;
  reconciledDate?: Date;
}

/**
 * Tax compliance status
 */
export interface TaxComplianceStatus {
  taxType: TaxType;
  period: string;
  
  // Filing status
  filingRequired: boolean;
  filingDeadline: Date;
  filed: boolean;
  filedDate?: Date;
  filedBy?: string;
  
  // Payment status
  paymentDue: number;
  paymentDueDate: Date;
  paid: boolean;
  paidAmount?: number;
  paidDate?: Date;
  
  // Audit status
  auditTrailComplete: boolean;
  allEntriesReconciled: boolean;
  complianceScore: number;        // 0-100
  
  flaggedIssues: {
    severity: 'info' | 'warning' | 'critical';
    message: string;
    affectedItems: string[];
  }[];
}


export interface TaxConfig {
  jurisdiction: string;           // e.g., 'NG' for Nigeria
  currency: string;
  
  // Applicable taxes
  taxRates: TaxRate[];
  
  // Thresholds
  vatRegistrationThreshold: number;
  whtThresholds: {
    employees: number;
    vendors: number;
    contractors: number;
  };
  
  // Compliance
  filingFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  filingDeadlineDay: number;      // E.g., 15 for 15th of month
  
  // Reporting
  includeInGrossProfit: boolean;
  taxInclusivePricing: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TaxService {

  private taxRates = new Map<string, TaxRate>();
  private taxLines: TaxLine[] = [];
  private taxConfigs = new Map<string, TaxConfig>();
  
  // Observable for tax summary changes
  private taxSummarySubject = new BehaviorSubject<Map<string, TaxSummary> | null>(null);
  public taxSummary$: Observable<Map<string, TaxSummary> | null> = this.taxSummarySubject.asObservable();
  
  // Observable for compliance status
  private complianceStatusSubject = new BehaviorSubject<Map<string, TaxComplianceStatus> | null>(null);
  public complianceStatus$: Observable<Map<string, TaxComplianceStatus> | null> = this.complianceStatusSubject.asObservable();

  constructor() {
    this.initializeDefaultTaxRates();
    this.initializeNigerianTaxConfig();
  }


  private initializeDefaultTaxRates(): void {
    // VAT rates
    this.addTaxRate({
      type: TaxType.VAT,
      rate: 0.075,                 // 7.5% VAT in Nigeria
      code: 'VAT-075',
      description: 'Value Added Tax (7.5%)',
      glAccountCode: '2140',       // VAT Payable
      isRecoverable: true,
      effectiveDate: new Date(2020, 0, 1)
    });

    // WHT rates
    this.addTaxRate({
      type: TaxType.WHT,
      rate: 0.05,                  // 5% WHT on services
      code: 'WHT-050',
      description: 'Withholding Tax - Services (5%)',
      glAccountCode: '2150',       // WHT Payable
      isRecoverable: false,
      effectiveDate: new Date(2020, 0, 1)
    });

    this.addTaxRate({
      type: TaxType.WHT,
      rate: 0.10,                  // 10% WHT on contractors
      code: 'WHT-100',
      description: 'Withholding Tax - Contractors (10%)',
      glAccountCode: '2150',
      isRecoverable: false,
      effectiveDate: new Date(2020, 0, 1)
    });

    // Corporate tax (simplified)
    this.addTaxRate({
      type: TaxType.CORPORATE_TAX,
      rate: 0.30,                  // 30% corporate tax
      code: 'CT-300',
      description: 'Corporate Income Tax (30%)',
      glAccountCode: '2160',       // Income Tax Payable
      isRecoverable: false,
      effectiveDate: new Date(2020, 0, 1)
    });
  }


  private initializeNigerianTaxConfig(): void {
    const config: TaxConfig = {
      jurisdiction: 'NG',
      currency: 'NGN',
      
      taxRates: Array.from(this.taxRates.values()),
      
      vatRegistrationThreshold: 25000000,  // ₦25M threshold
      whtThresholds: {
        employees: 0,              // WHT on all employee payments
        vendors: 0,                // WHT on all vendor payments
        contractors: 0
      },
      
      filingFrequency: 'monthly',
      filingDeadlineDay: 15,       // 15th of following month
      
      includeInGrossProfit: false, // Tax is separate from profit
      taxInclusivePricing: true    // Prices typically include tax
    };

    this.taxConfigs.set('NG', config);
  }


  addTaxRate(rate: Omit<TaxRate, 'id'>): void {
    const id = `${rate.type}-${rate.code}`;
    const fullRate: TaxRate = { ...rate } as TaxRate;
    this.taxRates.set(id, fullRate);
  }


  getTaxRate(code: string): TaxRate | undefined {
    return this.taxRates.get(code);
  }


  getTaxRatesByType(type: TaxType): TaxRate[] {
    return Array.from(this.taxRates.values()).filter(r => r.type === type);
  }


  calculateVAT(
    baseAmount: number,
    rateCode: string = 'VAT-075',
    direction: 'input' | 'output' = 'output'
  ): TaxLine | null {
    const rate = this.getTaxRate(rateCode);
    if (!rate || rate.type !== TaxType.VAT) {
      console.error(`Invalid VAT rate code: ${rateCode}`);
      return null;
    }

    const taxAmount = this.roundToMonetary(baseAmount * rate.rate);

    const taxLine: TaxLine = {
      vendorName: '',
      id: `TAX-${Date.now()}-${Math.random()}`,
      type: TaxType.VAT,
      rateCode,
      rate: rate.rate,
      baseAmount,
      taxAmount,
      glAccount: rate.glAccountCode,
      description: `${direction === 'output' ? 'Sales' : 'Purchase'} VAT @ ${(rate.rate * 100).toFixed(1)}%`,
      isRecoverable: rate.isRecoverable && direction === 'input',
      timestamp: new Date(),
      source: 'transaction'
    };

    // Only track if adds up to actual tax record
    this.taxLines.push(taxLine);
    this.notifyTaxChange();

    return taxLine;
  }


  calculateWHT(
    grossAmount: number,
    rateCode: string = 'WHT-050',
    vendorName: string = ''
  ): TaxLine | null {
    const rate = this.getTaxRate(rateCode);
    if (!rate || rate.type !== TaxType.WHT) {
      console.error(`Invalid WHT rate code: ${rateCode}`);
      return null;
    }

    // Validate: WHT should not be negative
    if (grossAmount < 0) {
      console.warn('WHT calculation on negative amount - this is unusual');
    }

    const taxAmount = this.roundToMonetary(grossAmount * rate.rate);

    const taxLine: TaxLine = {
      vendorName,
      id: `TAX-${Date.now()}-${Math.random()}`,
      type: TaxType.WHT,
      rateCode,
      rate: rate.rate,
      baseAmount: grossAmount,
      taxAmount,
      glAccount: rate.glAccountCode,
      description: `WHT (${(rate.rate * 100).toFixed(0)}%) - ${vendorName}`,
      isRecoverable: false,        // WHT typically not recoverable
      timestamp: new Date(),
      source: 'transaction'
    };

    this.taxLines.push(taxLine);
    this.notifyTaxChange();

    return taxLine;
  }


  calculateNetAfterTax(
    grossAmount: number,
    taxLines: TaxLine[]
  ): number {
    let deductions = 0;
    
    for (const tax of taxLines) {
      if (tax.type === TaxType.WHT) {
        // WHT reduces the net payment
        deductions += tax.taxAmount;
      } else if (tax.type === TaxType.VAT) {
        
      }
    }

    return grossAmount - deductions;
  }


  classifyTaxForGL(taxLine: TaxLine): { accountCode: string; type: 'Liability' | 'Asset'; description: string } {
    let accountCode = taxLine.glAccount;
    let type: 'Liability' | 'Asset' = 'Liability';
    let description = '';

    switch (taxLine.type) {
      case TaxType.VAT:
        if (taxLine.isRecoverable) {
          // Input VAT (recoverable)
          accountCode = '1050';      // VAT Recoverable (Asset)
          type = 'Asset';
          description = 'Input VAT - Recoverable from revenue';
        } else {
          // Output VAT (payable)
          accountCode = '2140';      // VAT Payable (Liability)
          type = 'Liability';
          description = 'Output VAT - Payable to government';
        }
        break;

      case TaxType.WHT:
        accountCode = '2150';        // WHT Payable (Liability)
        type = 'Liability';
        description = 'Withholding Tax - Payable to government';
        break;

      case TaxType.CORPORATE_TAX:
        accountCode = '2160';        // Income Tax Payable (Liability)
        type = 'Liability';
        description = 'Corporate Income Tax - Payable';
        break;

      default:
        accountCode = '2170';        // Other Taxes Payable
        type = 'Liability';
        description = 'Other Tax - Payable';
    }

    return { accountCode, type, description };
  }

  /**
   * GENERATE TAX SUMMARY FOR PERIOD
   * 
   * Aggregates all tax transactions for reporting
   */
  generateTaxSummary(period: string, taxType?: TaxType): TaxSummary | null {
    const relevantLines = this.taxLines.filter(line => {
      const lineDate = new Date(line.timestamp);
      const [year, month] = period.split('-');
      const lineMonth = `${lineDate.getFullYear()}-${String(lineDate.getMonth() + 1).padStart(2, '0')}`;
      
      return lineMonth === period && (!taxType || line.type === taxType);
    });

    if (relevantLines.length === 0) {
      return null;
    }

    const firstTax = relevantLines[0];
    const type = taxType || firstTax.type;

    // Group by rate
    const byRateMap = new Map<number, { input: number; output: number; count: number }>();

    let grossInputTax = 0;
    let grossOutputTax = 0;

    for (const line of relevantLines) {
      const existing = byRateMap.get(line.rate) || { input: 0, output: 0, count: 0 };

      if (line.isRecoverable) {
        existing.input += line.taxAmount;
      } else {
        existing.output += line.taxAmount;
      }
      existing.count++;

      byRateMap.set(line.rate, existing);
    }

    // Convert to array
    const byRate = Array.from(byRateMap.entries()).map(([rate, data]) => ({
      rate,
      input: data.input,
      output: data.output,
      net: data.output - data.input
    }));

    // Calculate totals
    for (const rate of byRate) {
      grossInputTax += rate.input;
      grossOutputTax += rate.output;
    }

    const netTaxLiability = grossOutputTax - grossInputTax;
    const netTaxRecoverable = grossInputTax;

    return {
      period,
      taxType: type,
      grossInputTax,
      grossOutputTax,
      netTaxLiability,
      netTaxRecoverable,
      byRate,
      taxLines: relevantLines,
      isFilingDue: this.isFilingDueForPeriod(period, type),
      filingDeadline: this.getFilingDeadline(period),
      status: 'open'
    };
  }

  validateTaxCalculations(period: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const periodLines = this.taxLines.filter(line => {
      const lineDate = new Date(line.timestamp);
      const lineMonth = `${lineDate.getFullYear()}-${String(lineDate.getMonth() + 1).padStart(2, '0')}`;
      return lineMonth === period;
    });

    // Check 1: No negative tax
    for (const line of periodLines) {
      if (line.taxAmount < 0) {
        errors.push(`Negative tax amount found: ${line.description} (${line.taxAmount})`);
      }
      if (line.baseAmount < 0) {
        errors.push(`Negative base amount for tax: ${line.description} (${line.baseAmount})`);
      }
    }

    // Check 2: No duplicate entries
    const seenIds = new Set<string>();
    for (const line of periodLines) {
      if (seenIds.has(line.id)) {
        errors.push(`Duplicate tax entry detected: ${line.id}`);
      }
      seenIds.add(line.id);
    }

    // Check 3: Classification validation
    for (const line of periodLines) {
      const classification = this.classifyTaxForGL(line);
      if (classification.type !== 'Liability' && line.type === TaxType.WHT) {
        errors.push(`WHT incorrectly classified as ${classification.type}: ${line.description}`);
      }
    }

    // Check 4: Recoverable VAT tracking
    const vatLines = periodLines.filter(l => l.type === TaxType.VAT);
    for (const vat of vatLines) {
      if (vat.isRecoverable && !vat.description.includes('Input')) {
        errors.push(`Recoverable VAT not properly marked as input: ${vat.description}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
  reconcileTaxForPeriod(period: string, taxType: TaxType): TaxReconciliation {
    const summary = this.generateTaxSummary(period, taxType);
    const validation = this.validateTaxCalculations(period);

    const auditTrail = `
      Tax Reconciliation - ${period}
      Type: ${taxType}
      
      Calculation Method:
      1. Identified all ${taxType} entries for period
      2. Grouped by rate and direction (input/output)
      3. Summed gross input tax
      4. Summed gross output tax
      5. Calculated net liability/recovery
      
      Results:
      - Gross Input Tax: ₦${summary?.grossInputTax.toLocaleString()}
      - Gross Output Tax: ₦${summary?.grossOutputTax.toLocaleString()}
      - Net Liability: ₦${summary?.netTaxLiability.toLocaleString()}
      
      Validation: ${validation.isValid ? 'PASSED' : 'FAILED'}
    `;

    return {
      period,
      taxType,
      systemCalculation: summary?.netTaxLiability || 0,
      auditTrail,
      discrepancies: validation.errors.map(err => ({
        type: 'incorrect_amount',
        description: err,
        amount: 0,
        affectedEntries: []
      })),
      isReconciled: validation.isValid,
      reconciledBy: 'System',
      reconciledDate: new Date()
    };
  }

  getComplianceStatus(period: string, taxType: TaxType): TaxComplianceStatus {
    const summary = this.generateTaxSummary(period, taxType);
    const validation = this.validateTaxCalculations(period);

    const complianceScore = validation.isValid ? 100 : Math.max(0, 100 - (validation.errors.length * 10));

    const flaggedIssues = validation.errors.map(err => ({
      severity: 'warning' as const,
      message: err,
      affectedItems: []
    }));

    return {
      taxType,
      period,
      filingRequired: summary?.isFilingDue || false,
      filingDeadline: summary?.filingDeadline || new Date(),
      filed: false,
      paymentDue: summary?.netTaxLiability || 0,
      paymentDueDate: this.getFilingDeadline(period),
      paid: false,
      auditTrailComplete: true,
      allEntriesReconciled: validation.isValid,
      complianceScore,
      flaggedIssues
    };
  }


  private isFilingDueForPeriod(period: string, taxType: TaxType): boolean {
    // Simplified: filing due 15 days after period end
    const [year, month] = period.split('-');
    const periodEnd = new Date(parseInt(year), parseInt(month), 0);
    const filingDeadline = new Date(parseInt(year), parseInt(month), 15);
    const now = new Date();

    return now >= periodEnd && now <= filingDeadline;
  }

  private getFilingDeadline(period: string): Date {
    const [year, month] = period.split('-');
    return new Date(parseInt(year), parseInt(month), 15);
  }


  private roundToMonetary(value: number): number {
    return Math.round(value * 100) / 100;
  }


  private notifyTaxChange(): void {
    const summaries = new Map<string, TaxSummary>();
    // Group by period
    const byPeriod = new Map<string, TaxLine[]>();

    for (const line of this.taxLines) {
      const lineDate = new Date(line.timestamp);
      const period = `${lineDate.getFullYear()}-${String(lineDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!byPeriod.has(period)) {
        byPeriod.set(period, []);
      }
      byPeriod.get(period)!.push(line);
    }

    // Generate summaries
    for (const [period] of byPeriod) {
      const summary = this.generateTaxSummary(period);
      if (summary) {
        summaries.set(period, summary);
      }
    }

    this.taxSummarySubject.next(summaries);
  }


  getTaxSummaryByPeriod(period: string, taxType?: TaxType): Observable<TaxSummary | null> {
    return new Observable(observer => {
      const summary = this.generateTaxSummary(period, taxType);
      observer.next(summary);
      observer.complete();
    });
  }
  getTaxLinesByPeriod(period: string): TaxLine[] {
    return this.taxLines.filter(line => {
      const lineDate = new Date(line.timestamp);
      const lineMonth = `${lineDate.getFullYear()}-${String(lineDate.getMonth() + 1).padStart(2, '0')}`;
      return lineMonth === period;
    });
  }

  resetAllData(): void {
    this.taxLines = [];
    this.taxSummarySubject.next(null);
    this.complianceStatusSubject.next(null);
  }
}
