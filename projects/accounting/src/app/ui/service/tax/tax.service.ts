import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// ─────────────────────────────────────────────────────────────────────────────
// §3F  Nigerian Tax Constants  (Finance Act 2020 + subsequent amendments)
// ─────────────────────────────────────────────────────────────────────────────

export const NIGERIAN_VAT_RATE = 0.075; // 7.5%

/** WHT rate codes per §2B — keyed by rate-code string */
export const WHT_RATES: Record<string, number> = {
  'WHT-050': 0.05,   // Professional services / consultancy / management fees
  'WHT-100': 0.10,   // Building / construction / contract of supply
  'WHT-025': 0.025,  // Dividends to corporate shareholders
  'WHT-150': 0.15,   // Directors' fees (non-resident)
};

/** CIT tier lookup — rate determined by TURNOVER, tax calculated on PROFIT */
export const CIT_TIERS: ReadonlyArray<{ label: string; maxTurnover: number; rate: number }> = [
  { label: 'Small Company',  maxTurnover: 25_000_000,  rate: 0.00 },
  { label: 'Medium Company', maxTurnover: 100_000_000, rate: 0.20 },
  { label: 'Large Company',  maxTurnover: Infinity,    rate: 0.30 },
];

export const EDUCATION_TAX_RATE = 0.025;  // 2.5% of assessable profit
export const NASENI_LEVY_RATE   = 0.0025; // 0.25% of PBT (turnover > ₦100M only)

export const FILING_DEADLINES: Record<string, string> = {
  VAT:  'Monthly — 21st of the following month',
  WHT:  'Monthly — 21st of the following month',
  CIT:  'Annual — 6 months after financial year end',
  EDT:  'Annual — Same deadline as CIT',
  PAYE: 'Monthly — 10th of the following month',
};

export const LATE_PENALTIES: Record<string, string> = {
  VAT: '₦5,000 first month + ₦25,000 each subsequent month',
  WHT: '10% penalty + interest at CBN MPR',
  CIT: '₦25,000 first month + ₦5,000 per day thereafter',
};

/** GL accounts — §3F. Every tax direction has both an asset and a liability account */
export const GL_ACCOUNTS = {
  VAT_INPUT:       { code: '1050', label: 'VAT Recoverable (Asset)' },
  VAT_OUTPUT:      { code: '2140', label: 'VAT Payable (Liability)' },
  WHT_INPUT:       { code: '1060', label: 'WHT Receivable (Asset)' },
  WHT_OUTPUT:      { code: '2150', label: 'WHT Payable (Liability)' },
  CIT_PREPAYMENT:  { code: '1070', label: 'CIT Prepayment (Asset)' },
  CIT_PAYABLE:     { code: '2160', label: 'Income Tax Payable (Liability)' },
  EDT_PREPAYMENT:  { code: '1080', label: 'EDT Prepayment (Asset)' },
  EDT_PAYABLE:     { code: '2170', label: 'Education Tax Payable (Liability)' },
  PAYE_INPUT:      { code: '1090', label: 'PAYE Recoverable (Asset)' },
  PAYE_OUTPUT:     { code: '2180', label: 'PAYE Payable (Liability)' },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Enums & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export enum TaxType {
  VAT           = 'VAT',
  WHT           = 'WHT',
  CORPORATE_TAX = 'CORPORATE',
  EDT           = 'EDT',
  NASENI        = 'NASENI',
  PAYE          = 'PAYE',
  OTHER         = 'OTHER',
}

/**
 * direction — per §2B and §3C data model:
 *   'input'  → asset / recoverable (VAT paid on purchases; WHT deducted FROM you)
 *   'output' → liability / payable  (VAT collected on sales; WHT deducted BY you)
 */
export interface TaxLine {
  id: string;
  period: string;              // 'YYYY-MM'
  type: TaxType;
  direction: 'input' | 'output';
  rateCode: string;
  rate: number;                // e.g. 0.075
  baseAmount: number;          // Pre-tax amount
  taxAmount: number;           // Calculated tax
  glAccount: string;           // GL code e.g. '2140'
  description: string;
  isRecoverable: boolean;
  vendorName: string;          // For WHT — vendor who received payment
  source: string;              // Source module e.g. 'Sales Module', 'Procurement'
  timestamp: Date;
  relatedDocumentId?: string;
}

export interface TaxRateBreakdown {
  rate: number;
  input: number;
  output: number;
  net: number;
}

export interface TaxSummary {
  period: string;
  taxType: TaxType;
  grossInputTax: number;          // Total recoverable/asset tax
  grossOutputTax: number;         // Total payable/liability tax
  netTaxLiability: number;        // Output − Input
  netTaxRecoverable: number;
  vatCreditCarryForward?: number; // VAT only — credit carried from prior months
  amountPayableToFIRS?: number;   // VAT only — after applying carry-forward credit
  byRate: TaxRateBreakdown[];
  taxLines: TaxLine[];
  isFilingDue: boolean;
  filingDeadline?: Date;
  status: 'open' | 'in-review' | 'filed' | 'paid';
}

/** Per §2F and §3C — CITEstimate is separate from TaxSummary */
export interface CITEstimate {
  turnover: number;
  assessableProfit: number;
  tier: string;
  citRate: number;
  citAmount: number;
  educationTax: number;
  naseniLevy: number;
  totalAnnualTaxLiability: number;
  nextDueQuarter: string;
}

/** §2E §4a — ComplianceIssue severity MUST be 'low' | 'medium' | 'high' */
export interface ComplianceIssue {
  severity: 'low' | 'medium' | 'high';
  message: string;
}

/** §3C interface spec */
export interface TaxComplianceStatus {
  period: string;
  taxType: TaxType;
  filed: boolean;
  paid: boolean;
  complianceScore: number; // 0–100, formula in §3E point 10
  paymentDue: number;
  filingDeadline: Date;
  flaggedIssues: ComplianceIssue[];
}

export interface TaxReconciliation {
  period: string;
  taxType: TaxType;
  systemCalculation: number;
  auditTrail: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class TaxService {

  private taxLines: TaxLine[] = [];

  /**
   * VAT credit carry-forward balance (§2D carry-forward behaviour).
   * Negative net (Input > Output) adds to this balance.
   * Positive net consumes it before remitting to FIRS.
   */
  private vatCreditBalance = 0;

  private taxSummarySubject = new BehaviorSubject<Map<string, TaxSummary> | null>(null);
  public taxSummary$: Observable<Map<string, TaxSummary> | null> =
    this.taxSummarySubject.asObservable();

  constructor() {
    this.seedMockData();
  }

  // ── Seed ────────────────────────────────────────────────────────────────────

  /** Realistic Nigerian business mock data — remove once backend is connected */
  private seedMockData(): void {
    const now    = new Date();
    const year   = now.getFullYear();
    const month  = now.getMonth(); // 0-indexed
    const period = `${year}-${String(month + 1).padStart(2, '0')}`;

    const raw: Omit<TaxLine, 'id'>[] = [
      // VAT Output — sales invoices (GL 2140)
      {
        period, type: TaxType.VAT, direction: 'output',
        rateCode: 'VAT-075', rate: NIGERIAN_VAT_RATE,
        baseAmount: 2_500_000, taxAmount: 187_500,
        glAccount: GL_ACCOUNTS.VAT_OUTPUT.code,
        description: 'Sales Invoice INV-2025-0145',
        isRecoverable: false, vendorName: '',
        source: 'Sales Module', timestamp: new Date(year, month, 5),
      },
      {
        period, type: TaxType.VAT, direction: 'output',
        rateCode: 'VAT-075', rate: NIGERIAN_VAT_RATE,
        baseAmount: 800_000, taxAmount: 60_000,
        glAccount: GL_ACCOUNTS.VAT_OUTPUT.code,
        description: 'Service Invoice SRV-2025-033',
        isRecoverable: false, vendorName: '',
        source: 'Sales Module', timestamp: new Date(year, month, 12),
      },
      // VAT Input — purchases (GL 1050)
      {
        period, type: TaxType.VAT, direction: 'input',
        rateCode: 'VAT-075', rate: NIGERIAN_VAT_RATE,
        baseAmount: 1_200_000, taxAmount: 90_000,
        glAccount: GL_ACCOUNTS.VAT_INPUT.code,
        description: 'Purchase Order PO-2025-0089',
        isRecoverable: true, vendorName: '',
        source: 'Procurement', timestamp: new Date(year, month, 8),
      },
      {
        period, type: TaxType.VAT, direction: 'input',
        rateCode: 'VAT-075', rate: NIGERIAN_VAT_RATE,
        baseAmount: 350_000, taxAmount: 26_250,
        glAccount: GL_ACCOUNTS.VAT_INPUT.code,
        description: 'Office Supplies — Vendor Receipt',
        isRecoverable: true, vendorName: '',
        source: 'Procurement', timestamp: new Date(year, month, 18),
      },
      // WHT Output — deducted from vendor payments (GL 2150)
      {
        period, type: TaxType.WHT, direction: 'output',
        rateCode: 'WHT-050', rate: 0.05,
        baseAmount: 500_000, taxAmount: 25_000,
        glAccount: GL_ACCOUNTS.WHT_OUTPUT.code,
        description: 'Consulting Payment — ABC Ltd',
        isRecoverable: false, vendorName: 'ABC Consulting Ltd',
        source: 'Accounts Payable', timestamp: new Date(year, month, 10),
      },
      {
        period, type: TaxType.WHT, direction: 'output',
        rateCode: 'WHT-100', rate: 0.10,
        baseAmount: 3_000_000, taxAmount: 300_000,
        glAccount: GL_ACCOUNTS.WHT_OUTPUT.code,
        description: 'Contract Payment — XYZ Builders',
        isRecoverable: false, vendorName: 'XYZ Builders Nig. Ltd',
        source: 'Accounts Payable', timestamp: new Date(year, month, 15),
      },
    ];

    this.taxLines = raw.map((l, i) => ({
      ...l,
      id: `TL${String(i + 1).padStart(3, '0')}`,
    }));

    this.notifyTaxChange();
  }

  // ── GL Classification ────────────────────────────────────────────────────────

  /** Every tax transaction maps to a debit + credit GL — §2F, §3C */
  classifyTaxForGL(line: TaxLine): { code: string; label: string; type: 'Liability' | 'Asset' } {
    switch (line.type) {
      case TaxType.VAT:
        return line.isRecoverable
          ? { ...GL_ACCOUNTS.VAT_INPUT,  type: 'Asset'     }
          : { ...GL_ACCOUNTS.VAT_OUTPUT, type: 'Liability' };
      case TaxType.WHT:
        return line.isRecoverable
          ? { ...GL_ACCOUNTS.WHT_INPUT,  type: 'Asset'     }
          : { ...GL_ACCOUNTS.WHT_OUTPUT, type: 'Liability' };
      case TaxType.CORPORATE_TAX:
        return { ...GL_ACCOUNTS.CIT_PAYABLE,  type: 'Liability' };
      case TaxType.EDT:
        return { ...GL_ACCOUNTS.EDT_PAYABLE,  type: 'Liability' };
      case TaxType.PAYE:
        return { ...GL_ACCOUNTS.PAYE_OUTPUT,  type: 'Liability' };
      default:
        return { code: '2999', label: 'Other Tax Payable', type: 'Liability' };
    }
  }

  getGLAccountLabel(code: string): string {
    const entry = Object.values(GL_ACCOUNTS).find(a => a.code === code);
    return entry?.label ?? 'Tax Account';
  }

  // ── Tax Calculations ─────────────────────────────────────────────────────────

  /**
   * §2C VAT calculation — direction determines GL and recoverability.
   * 'output' → liability (GL 2140), 'input' → asset (GL 1050).
   */
  calculateVAT(
    baseAmount: number,
    rateCode = 'VAT-075',
    direction: 'input' | 'output' = 'output',
  ): TaxLine | null {
    const rate = NIGERIAN_VAT_RATE; // Only one VAT rate in Nigeria (for now)
    const taxAmount  = this.round(baseAmount * rate);
    const isRecoverable = direction === 'input';
    const now = new Date();

    const line: TaxLine = {
      id: this.genId(),
      period: this.toPeriod(now),
      type: TaxType.VAT,
      direction,
      rateCode,
      rate,
      baseAmount,
      taxAmount,
      glAccount: isRecoverable ? GL_ACCOUNTS.VAT_INPUT.code : GL_ACCOUNTS.VAT_OUTPUT.code,
      description: `${direction === 'output' ? 'Sales' : 'Purchase'} VAT @ 7.5%`,
      isRecoverable,
      vendorName: '',
      source: 'Manual Entry',
      timestamp: now,
    };

    this.taxLines.push(line);
    this.notifyTaxChange();
    return line;
  }

  /**
   * §2C WHT calculation — almost always 'output' (you deducted it from a vendor).
   * 'input' = WHT deducted FROM you by a customer (rare; treated as asset).
   */
  calculateWHT(
    grossAmount: number,
    rateCode = 'WHT-050',
    vendorName = '',
    direction: 'input' | 'output' = 'output',
  ): TaxLine | null {
    const rate = WHT_RATES[rateCode];
    if (rate === undefined) { console.error(`Unknown WHT rate code: ${rateCode}`); return null; }

    const taxAmount     = this.round(grossAmount * rate);
    const isRecoverable = direction === 'input';
    const now = new Date();

    const line: TaxLine = {
      id: this.genId(),
      period: this.toPeriod(now),
      type: TaxType.WHT,
      direction,
      rateCode,
      rate,
      baseAmount: grossAmount,
      taxAmount,
      glAccount: isRecoverable ? GL_ACCOUNTS.WHT_INPUT.code : GL_ACCOUNTS.WHT_OUTPUT.code,
      description: `WHT (${(rate * 100).toFixed(0)}%) — ${vendorName || 'Vendor'}`,
      isRecoverable,
      vendorName,
      source: 'Manual Entry',
      timestamp: now,
    };

    this.taxLines.push(line);
    this.notifyTaxChange();
    return line;
  }

  /**
   * §2C CIT calculation — IMPORTANT: rate from TURNOVER, tax on ASSESSABLE PROFIT.
   * Common pitfall (§3E): never apply rate to turnover.
   */
  calculateCIT(turnover: number, assessableProfit: number): CITEstimate {
    const tier       = CIT_TIERS.find(t => turnover <= t.maxTurnover) ?? CIT_TIERS[2];
    const citAmount  = this.round(assessableProfit * tier.rate);
    const educationTax = this.round(assessableProfit * EDUCATION_TAX_RATE); // §2C EDT
    const naseniLevy   = turnover > 100_000_000                             // §2C NASENI
      ? this.round(assessableProfit * NASENI_LEVY_RATE)
      : 0;

    return {
      turnover,
      assessableProfit,
      tier: tier.label,
      citRate: tier.rate,
      citAmount,
      educationTax,
      naseniLevy,
      totalAnnualTaxLiability: citAmount + educationTax + naseniLevy,
      nextDueQuarter: `Q4 ${new Date().getFullYear()}`,
    };
  }

  // ── Summary Generation ───────────────────────────────────────────────────────

  /**
   * §2C computeVATSummary + §2D carry-forward logic.
   * Splits lines by direction, applies credit balance, returns amountPayableToFIRS.
   */
  generateTaxSummary(period: string, taxType?: TaxType): TaxSummary | null {
    const lines = this.taxLines.filter(l => {
      const lp = this.toPeriod(new Date(l.timestamp));
      return lp === period && (!taxType || l.type === taxType);
    });

    if (!lines.length) return null;

    const type = taxType ?? lines[0].type;
    const byRateMap = new Map<number, { input: number; output: number }>();
    let grossInput = 0;
    let grossOutput = 0;

    for (const l of lines) {
      const entry = byRateMap.get(l.rate) ?? { input: 0, output: 0 };
      if (l.isRecoverable) {
        entry.input  += l.taxAmount;
        grossInput   += l.taxAmount;
      } else {
        entry.output += l.taxAmount;
        grossOutput  += l.taxAmount;
      }
      byRateMap.set(l.rate, entry);
    }

    const byRate: TaxRateBreakdown[] = Array.from(byRateMap.entries()).map(([rate, d]) => ({
      rate, input: d.input, output: d.output, net: d.output - d.input,
    }));

    const netLiability = grossOutput - grossInput;

    // §2D VAT carry-forward
    let vatCreditCarryForward: number | undefined;
    let amountPayableToFIRS: number | undefined;

    if (type === TaxType.VAT) {
      if (netLiability < 0) {
        // Net credit — carry it forward, nothing payable this period
        this.vatCreditBalance += Math.abs(netLiability);
        vatCreditCarryForward = this.vatCreditBalance;
        amountPayableToFIRS   = 0;
      } else if (this.vatCreditBalance > 0) {
        // Offset against existing credit balance
        amountPayableToFIRS   = Math.max(0, netLiability - this.vatCreditBalance);
        this.vatCreditBalance = Math.max(0, this.vatCreditBalance - netLiability);
        vatCreditCarryForward = this.vatCreditBalance;
      } else {
        amountPayableToFIRS   = netLiability;
        vatCreditCarryForward = 0;
      }
    }

    return {
      period,
      taxType: type,
      grossInputTax:       grossInput,
      grossOutputTax:      grossOutput,
      netTaxLiability:     netLiability,
      netTaxRecoverable:   grossInput,
      vatCreditCarryForward,
      amountPayableToFIRS,
      byRate,
      taxLines: lines,
      isFilingDue:    this.isFilingDue(period),
      filingDeadline: this.filingDeadline(period),
      status: 'open',
    };
  }


  getComplianceStatus(period: string, taxType: TaxType): TaxComplianceStatus {
    const validation = this.validateTaxCalculations(period);


    const vatFiled = false;
    const vatPaid  = false;
    const whtFiled = false;
    const whtPaid  = false;

    const baseIssues: ComplianceIssue[] = [
      { severity: 'high',   message: 'VAT return for current period not yet filed' },
      { severity: 'medium', message: '2 WHT certificates pending issuance to vendors' },
    ];

    const validationIssues: ComplianceIssue[] = validation.errors.map(e => ({
      severity: 'high' as const, message: e,
    }));

    const allIssues = [...baseIssues, ...validationIssues];


    let score = 0;
    if (vatFiled)              score += 25;
    if (vatPaid)               score += 25;
    if (whtFiled)              score += 20;
    if (whtPaid)               score += 15;
    if (allIssues.length === 0) score += 15;

    const summary = this.generateTaxSummary(period, taxType);

    return {
      period,
      taxType,
      filed: vatFiled,
      paid:  vatPaid,
      complianceScore: score,
      paymentDue: summary?.amountPayableToFIRS ?? summary?.netTaxLiability ?? 0,
      filingDeadline: this.filingDeadline(period),
      flaggedIssues: allIssues,
    };
  }


  validateTaxCalculations(period: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = this.getTaxLinesByPeriod(period);

    for (const l of lines) {
      if (l.taxAmount  < 0) errors.push(`Negative tax amount on: ${l.description}`);
      if (l.baseAmount < 0) errors.push(`Negative base amount on: ${l.description}`);
    }

    const seen = new Set<string>();
    for (const l of lines) {
      if (seen.has(l.id)) errors.push(`Duplicate entry: ${l.id}`);
      seen.add(l.id);
    }

    // §2D cross-period assertion: VAT net must equal sum of individual lines
    const vatLines = lines.filter(l => l.type === TaxType.VAT);
    const sumOutput = vatLines.filter(l => !l.isRecoverable).reduce((s, l) => s + l.taxAmount, 0);
    const sumInput  = vatLines.filter(l =>  l.isRecoverable).reduce((s, l) => s + l.taxAmount, 0);
    const summary   = this.generateTaxSummary(period, TaxType.VAT);
    if (summary) {
      const tolerance = 1000; // §3E point 8 — allow ₦1,000 rounding tolerance
      if (Math.abs(summary.netTaxLiability - (sumOutput - sumInput)) > tolerance) {
        errors.push(`VAT reconciliation mismatch: computed ₦${(sumOutput - sumInput).toLocaleString()} vs summary ₦${summary.netTaxLiability.toLocaleString()}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  reconcileTaxForPeriod(period: string, taxType: TaxType): TaxReconciliation {
    const summary    = this.generateTaxSummary(period, taxType);
    const validation = this.validateTaxCalculations(period);

    const auditTrail = [
      `Reconciliation — ${period} / ${taxType}`,
      `Gross Input:   ₦${(summary?.grossInputTax ?? 0).toLocaleString()}`,
      `Gross Output:  ₦${(summary?.grossOutputTax ?? 0).toLocaleString()}`,
      `Net Liability: ₦${(summary?.netTaxLiability ?? 0).toLocaleString()}`,
      `Status: ${validation.isValid ? 'PASSED ✓' : 'FAILED ✗'}`,
    ].join('\n');

    return {
      period, taxType,
      systemCalculation: summary?.netTaxLiability ?? 0,
      auditTrail,
      discrepancies: validation.errors.map(e => ({
        type: 'incorrect_amount' as const, description: e, amount: 0, affectedEntries: [],
      })),
      isReconciled:   validation.isValid,
      reconciledBy:   'System',
      reconciledDate: new Date(),
    };
  }

  getWHTRateDescription(rateCode: string): string {
    const map: Record<string, string> = {
      'WHT-050': 'Services (Standard)',
      'WHT-100': 'Contractors & Professionals',
      'WHT-025': 'Corporate Dividends',
      'WHT-150': "Non-Resident Directors' Fees",
    };
    return map[rateCode] ?? 'Other';
  }


  getTaxLinesByPeriod(period: string): TaxLine[] {
    return this.taxLines.filter(
      l => this.toPeriod(new Date(l.timestamp)) === period,
    );
  }

  resetAllData(): void {
    this.taxLines = [];
    this.vatCreditBalance = 0;
    this.taxSummarySubject.next(null);
  }


  private toPeriod(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private genId(): string {
    return `TAX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  private round(v: number): number {
    return Math.round(v * 100) / 100;
  }

  private isFilingDue(period: string): boolean {
    const [y, m] = period.split('-').map(Number);
    const deadline = new Date(y, m, 21); // 21st of following month
    return new Date() <= deadline;
  }

  private filingDeadline(period: string): Date {
    const [y, m] = period.split('-').map(Number);
    return new Date(y, m, 21);
  }

  private notifyTaxChange(): void {
    const summaries = new Map<string, TaxSummary>();
    const periods = new Set(this.taxLines.map(l => this.toPeriod(new Date(l.timestamp))));
    for (const p of periods) {
      const s = this.generateTaxSummary(p);
      if (s) summaries.set(p, s);
    }
    this.taxSummarySubject.next(summaries);
  }
}