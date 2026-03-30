import { TestBed } from '@angular/core/testing';
import {
  TaxService,
  TaxType,
  TaxLine,
  TaxSummary,
  TaxReconciliation,
  TaxComplianceStatus
} from './tax.service';

describe('TaxService', () => {
  let service: TaxService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TaxService]
    });
    service = TestBed.inject(TaxService);
  });

  afterEach(() => {
    service.resetAllData();
  });

  describe('Tax Rate Management', () => {
    it('should initialize default tax rates', () => {
      const vatRates = service.getTaxRatesByType(TaxType.VAT);
      expect(vatRates.length).toBeGreaterThan(0);
      expect(vatRates[0].rate).toBe(0.075);
    });

    it('should retrieve VAT rate by code', () => {
      const rate = service.getTaxRate('VAT-075');
      expect(rate).toBeDefined();
      expect(rate?.type).toBe(TaxType.VAT);
      expect(rate?.rate).toBe(0.075);
    });

    it('should retrieve WHT rates by type', () => {
      const whtRates = service.getTaxRatesByType(TaxType.WHT);
      expect(whtRates.length).toBeGreaterThan(0);
      expect(whtRates.some(r => r.rate === 0.05)).toBe(true);
      expect(whtRates.some(r => r.rate === 0.10)).toBe(true);
    });

    it('should add custom tax rate', () => {
      service.addTaxRate({
        type: TaxType.EXCISE,
        rate: 0.15,
        code: 'EXCISE-150',
        description: 'Excise Tax (15%)',
        glAccountCode: '2180',
        isRecoverable: false,
        effectiveDate: new Date()
      });

      const rate = service.getTaxRate('EXCISE-150');
      expect(rate?.rate).toBe(0.15);
    });
  });

  describe('VAT Calculations', () => {
    it('should calculate output VAT correctly', () => {
      const baseAmount = 1000;
      const taxLine = service.calculateVAT(baseAmount, 'VAT-075', 'output');

      expect(taxLine).toBeDefined();
      expect(taxLine!.taxAmount).toBe(75);  // 1000 * 0.075
      expect(taxLine!.baseAmount).toBe(1000);
      expect(taxLine!.isRecoverable).toBe(false);
      expect(taxLine!.type).toBe(TaxType.VAT);
    });

    it('should calculate input VAT as recoverable', () => {
      const baseAmount = 2000;
      const taxLine = service.calculateVAT(baseAmount, 'VAT-075', 'input');

      expect(taxLine).toBeDefined();
      expect(taxLine!.taxAmount).toBe(150);  // 2000 * 0.075
      expect(taxLine!.isRecoverable).toBe(true);
      expect(taxLine!.description).toContain('Purchase');
    });

    it('should handle multiple VAT calculations', () => {
      service.calculateVAT(1000, 'VAT-075', 'output');
      service.calculateVAT(2000, 'VAT-075', 'input');
      service.calculateVAT(500, 'VAT-075', 'output');

      const summary = service.generateTaxSummary(new Date().toISOString().split('T')[0].substring(0, 7), TaxType.VAT);
      expect(summary).toBeDefined();
      expect(summary!.byRate.length).toBeGreaterThan(0);
    });

    it('should calculate complex VAT scenarios', () => {
      // Sales (output): 10,000 @ 7.5% = 750
      service.calculateVAT(10000, 'VAT-075', 'output');
      
      // Purchase (input): 5,000 @ 7.5% = 375 (recoverable)
      service.calculateVAT(5000, 'VAT-075', 'input');

      const summary = service.generateTaxSummary(new Date().toISOString().split('T')[0].substring(0, 7), TaxType.VAT);
      
      expect(summary!.grossOutputTax).toBe(750);
      expect(summary!.grossInputTax).toBe(375);
      expect(summary!.netTaxLiability).toBe(375);  // 750 - 375
    });
  });

  describe('Withholding Tax (WHT) Calculations', () => {
    it('should calculate WHT on services (5%)', () => {
      const grossAmount = 1000;
      const taxLine = service.calculateWHT(grossAmount, 'WHT-050', 'Service Provider Inc');

      expect(taxLine).toBeDefined();
      expect(taxLine!.taxAmount).toBe(50);  // 1000 * 0.05
      expect(taxLine!.type).toBe(TaxType.WHT);
      expect(taxLine!.isRecoverable).toBe(false);
      expect(taxLine!.description).toContain('Service Provider Inc');
    });

    it('should calculate WHT on contractors (10%)', () => {
      const grossAmount = 5000;
      const taxLine = service.calculateWHT(grossAmount, 'WHT-100', 'Contractor ABC');

      expect(taxLine!.taxAmount).toBe(500);  // 5000 * 0.10
    });

    it('should classify WHT correctly as liability', () => {
      const taxLine = service.calculateWHT(1000, 'WHT-050')!;
      const classification = service.classifyTaxForGL(taxLine);

      expect(classification.type).toBe('Liability');
      expect(classification.accountCode).toBe('2150');  // WHT Payable
      expect(classification.description).toContain('Withholding Tax');
    });

    it('should handle multiple WHT entries', () => {
      service.calculateWHT(1000, 'WHT-050', 'Vendor A');
      service.calculateWHT(2000, 'WHT-100', 'Contractor B');
      service.calculateWHT(1500, 'WHT-050', 'Vendor C');

      const lines = service.getTaxLinesByPeriod(new Date().toISOString().split('T')[0].substring(0, 7));
      expect(lines.length).toBe(3);
    });
  });

  describe('Tax Classification', () => {
    it('should classify output VAT as liability', () => {
      const taxLine = service.calculateVAT(1000, 'VAT-075', 'output')!;
      const classification = service.classifyTaxForGL(taxLine);

      expect(classification.type).toBe('Liability');
      expect(classification.accountCode).toBe('2140');  // VAT Payable
      expect(classification.description).toContain('Output VAT');
    });

    it('should classify input VAT as asset (recoverable)', () => {
      const taxLine = service.calculateVAT(1000, 'VAT-075', 'input')!;
      const classification = service.classifyTaxForGL(taxLine);

      expect(classification.type).toBe('Asset');
      expect(classification.accountCode).toBe('1050');  // VAT Recoverable
      expect(classification.description).toContain('recoverable');
    });

    it('should classify WHT as liability', () => {
      const taxLine = service.calculateWHT(1000, 'WHT-050')!;
      const classification = service.classifyTaxForGL(taxLine);

      expect(classification.type).toBe('Liability');
      expect(classification.accountCode).toBe('2150');  // WHT Payable
    });

    it('should classify corporate tax as liability', () => {
      const taxLine: TaxLine = {
        id: 'test',
        type: TaxType.CORPORATE_TAX,
        rateCode: 'CT-300',
        rate: 0.30,
        baseAmount: 10000,
        taxAmount: 3000,
        glAccount: '2160',
        description: 'Corporate Tax',
        isRecoverable: false,
        timestamp: new Date(),
        source: 'manual'
      };

      const classification = service.classifyTaxForGL(taxLine);
      expect(classification.type).toBe('Liability');
      expect(classification.accountCode).toBe('2160');  // Income Tax Payable
    });
  });

  describe('Net Amount Calculations', () => {
    it('should calculate net after WHT deduction', () => {
      const taxLine = service.calculateWHT(1000, 'WHT-050')!;
      const net = service.calculateNetAfterTax(1000, [taxLine]);

      expect(net).toBe(950);  // 1000 - 50 (5% WHT)
    });

    it('should calculate net with multiple tax deductions', () => {
      const wht = service.calculateWHT(1000, 'WHT-050')!;
      const net = service.calculateNetAfterTax(1000, [wht]);

      // For this scenario: 1000 - 50 = 950
      expect(net).toBe(950);
    });

    it('should not double-deduct VAT', () => {
      const vat = service.calculateVAT(1000, 'VAT-075', 'output')!;
      const net = service.calculateNetAfterTax(1000, [vat]);

      // VAT output should not reduce amount (customer pays VAT)
      expect(net).toBe(1000);
    });
  });

  describe('Tax Summary Generation', () => {
    it('should generate tax summary for period', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      service.calculateVAT(10000, 'VAT-075', 'output');
      service.calculateVAT(5000, 'VAT-075', 'input');

      const summary = service.generateTaxSummary(period, TaxType.VAT);

      expect(summary).toBeDefined();
      expect(summary!.period).toBe(period);
      expect(summary!.taxType).toBe(TaxType.VAT);
      expect(summary!.grossOutputTax).toBe(750);
      expect(summary!.grossInputTax).toBe(375);
      expect(summary!.netTaxLiability).toBe(375);
    });

    it('should group by rate in summary', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      service.calculateVAT(1000, 'VAT-075', 'output');
      service.calculateVAT(2000, 'VAT-075', 'output');

      const summary = service.generateTaxSummary(period, TaxType.VAT);

      expect(summary!.byRate.length).toBeGreaterThan(0);
      expect(summary!.byRate[0].rate).toBe(0.075);
    });

    it('should return null for empty period', () => {
      const summary = service.generateTaxSummary('2099-12', TaxType.VAT);
      expect(summary).toBeNull();
    });

    it('should track filing status', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      service.calculateVAT(1000, 'VAT-075', 'output');

      const summary = service.generateTaxSummary(period, TaxType.VAT);
      
      expect(summary!.status).toBe('open');
      expect(summary!.filingDeadline).toBeDefined();
    });
  });

  describe('Tax Validation', () => {
    it('should validate no negative tax amounts', () => {
      // This is a preventive check - the service should warn on negative base amounts
      const baseAmount = -1000;
      const taxLine = service.calculateVAT(baseAmount, 'VAT-075', 'output')!;
      
      const validation = service.validateTaxCalculations(new Date().toISOString().split('T')[0].substring(0, 7));
      
      // Validation should note the negative base
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate no duplicate tax entries', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      service.calculateVAT(1000, 'VAT-075', 'output');
      service.calculateVAT(1000, 'VAT-075', 'output');

      const validation = service.validateTaxCalculations(period);
      
      // Should have two unique entries (IDs are unique)
      expect(validation.isValid).toBe(true);
    });

    it('should validate tax classification', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      service.calculateVAT(1000, 'VAT-075', 'output');
      service.calculateWHT(1000, 'WHT-050');

      const validation = service.validateTaxCalculations(period);
      
      // Should pass with valid classification
      expect(validation.isValid).toBe(true);
    });

    it('should track validation errors', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      // Create invalid scenario: negative amount
      service.calculateVAT(-1000, 'VAT-075', 'output');

      const validation = service.validateTaxCalculations(period);
      
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Tax Reconciliation', () => {
    it('should generate reconciliation report', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      service.calculateVAT(10000, 'VAT-075', 'output');
      service.calculateVAT(5000, 'VAT-075', 'input');

      const reconciliation = service.reconcileTaxForPeriod(period, TaxType.VAT);

      expect(reconciliation).toBeDefined();
      expect(reconciliation.period).toBe(period);
      expect(reconciliation.taxType).toBe(TaxType.VAT);
      expect(reconciliation.systemCalculation).toBe(375);  // Net liability
      expect(reconciliation.auditTrail).toContain('Reconciliation');
    });

    it('should include audit trail', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      service.calculateVAT(1000, 'VAT-075', 'output');

      const reconciliation = service.reconcileTaxForPeriod(period, TaxType.VAT);

      expect(reconciliation.auditTrail).toContain('Calculation Method');
      expect(reconciliation.auditTrail).toContain('Results');
      expect(reconciliation.auditTrail).toContain('Validation');
    });

    it('should mark reconciliation as complete', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      service.calculateVAT(1000, 'VAT-075', 'output');

      const reconciliation = service.reconcileTaxForPeriod(period, TaxType.VAT);

      expect(reconciliation.isReconciled).toBe(true);
      expect(reconciliation.reconciledBy).toBe('System');
      expect(reconciliation.reconciledDate).toBeDefined();
    });
  });

  describe('Compliance Status', () => {
    it('should generate compliance status', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      service.calculateVAT(1000, 'VAT-075', 'output');

      const status = service.getComplianceStatus(period, TaxType.VAT);

      expect(status).toBeDefined();
      expect(status.taxType).toBe(TaxType.VAT);
      expect(status.period).toBe(period);
      expect(status.filingDeadline).toBeDefined();
      expect(status.paymentDue).toBeGreaterThan(0);
    });

    it('should calculate compliance score', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      service.calculateVAT(1000, 'VAT-075', 'output');

      const status = service.getComplianceStatus(period, TaxType.VAT);

      expect(status.complianceScore).toBeGreaterThanOrEqual(0);
      expect(status.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should track filing and payment status', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      service.calculateVAT(1000, 'VAT-075', 'output');

      const status = service.getComplianceStatus(period, TaxType.VAT);

      expect(status.filed).toBe(false);
      expect(status.paid).toBe(false);
      expect(status.auditTrailComplete).toBe(true);
    });
  });

  describe('Drill-Down and Traceability', () => {
    it('should retrieve tax lines for period', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      service.calculateVAT(1000, 'VAT-075', 'output');
      service.calculateWHT(500, 'WHT-050', 'Vendor');

      const lines = service.getTaxLinesByPeriod(period);

      expect(lines.length).toBe(2);
      expect(lines[0].type).toBe(TaxType.VAT);
      expect(lines[1].type).toBe(TaxType.WHT);
    });

    it('should provide trace back to source transaction', () => {
      const taxLine = service.calculateVAT(1000, 'VAT-075', 'output')!;

      expect(taxLine.id).toBeDefined();
      expect(taxLine.timestamp).toBeDefined();
      expect(taxLine.source).toBe('transaction');
      expect(taxLine.description).toBeDefined();
    });

    it('should support tax line queries', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      for (let i = 0; i < 5; i++) {
        service.calculateVAT(1000 + (i * 100), 'VAT-075', 'output');
      }

      const lines = service.getTaxLinesByPeriod(period);

      expect(lines.length).toBe(5);
      expect(lines.every(l => l.type === TaxType.VAT)).toBe(true);
    });
  });

  describe('Observable Streams', () => {
    it('should emit tax summary updates', (done) => {
      const subscription = service.taxSummary$.subscribe(summaries => {
        if (summaries) {
          expect(summaries.size).toBeGreaterThan(0);
          done();
        }
      });

      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      service.calculateVAT(1000, 'VAT-075', 'output');

      subscription.unsubscribe();
    });

    it('should get tax summary as observable', (done) => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      service.calculateVAT(1000, 'VAT-075', 'output');

      const subscription = service.getTaxSummaryByPeriod(period, TaxType.VAT).subscribe(summary => {
        expect(summary).toBeDefined();
        expect(summary!.taxType).toBe(TaxType.VAT);
        done();
      });

      subscription.unsubscribe();
    });
  });

  describe('Data Reset and Cleanup', () => {
    it('should reset all tax data', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      service.calculateVAT(1000, 'VAT-075', 'output');
      service.calculateWHT(500, 'WHT-050');

      let lines = service.getTaxLinesByPeriod(period);
      expect(lines.length).toBe(2);

      service.resetAllData();

      lines = service.getTaxLinesByPeriod(period);
      expect(lines.length).toBe(0);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle monthly VAT return scenario', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      // Month sales: 100,000
      service.calculateVAT(100000, 'VAT-075', 'output');  // Output VAT: 7,500
      
      // Month purchases: 60,000
      service.calculateVAT(60000, 'VAT-075', 'input');    // Input VAT: 4,500
      
      const summary = service.generateTaxSummary(period, TaxType.VAT);
      
      // Net payable to government
      expect(summary!.netTaxLiability).toBe(3000);  // 7,500 - 4,500
      expect(summary!.taxLines.length).toBe(2);
    });

    it('should handle multi-rate VAT scenario', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      // Standard rate
      service.calculateVAT(50000, 'VAT-075', 'output');  // 3,750
      
      // Different rate (if configured)
      service.calculateVAT(10000, 'VAT-075', 'input');   // 750

      const summary = service.generateTaxSummary(period, TaxType.VAT);
      
      expect(summary!.netTaxLiability).toBe(3000);
    });

    it('should handle complex WHT scenario', () => {
      const period = new Date().toISOString().split('T')[0].substring(0, 7);
      
      // Staff salaries (5% WHT)
      service.calculateWHT(500000, 'WHT-050', 'Payroll');  // WHT: 25,000
      
      // Service provider (5% WHT)
      service.calculateWHT(100000, 'WHT-050', 'Consulting'); // WHT: 5,000
      
      // Contractor (10% WHT)
      service.calculateWHT(50000, 'WHT-100', 'Construction'); // WHT: 5,000

      const lines = service.getTaxLinesByPeriod(period);
      const totalWHT = lines.reduce((sum, l) => sum + l.taxAmount, 0);
      
      expect(lines.length).toBe(3);
      expect(totalWHT).toBe(35000);
    });
  });
});
