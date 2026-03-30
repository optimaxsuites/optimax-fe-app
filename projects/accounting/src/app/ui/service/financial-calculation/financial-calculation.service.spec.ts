import { TestBed } from '@angular/core/testing';
import { FinancialCalculationService, JournalEntry, JournalEntryLine } from './financial-calculation.service';

describe('FinancialCalculationService', () => {
  let service: FinancialCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FinancialCalculationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('GL Account Management', () => {
    it('should initialize standard chart of accounts', () => {
      const accounts = service.getGLAccounts();
      expect(accounts.length).toBeGreaterThan(0);
    });

    it('should retrieve account by code', () => {
      const cashAccount = service.getGLAccount('1010');
      expect(cashAccount).toBeDefined();
      expect(cashAccount?.name).toBe('Cash');
      expect(cashAccount?.type).toBe('Asset');
    });

    it('should return undefined for non-existent account', () => {
      const account = service.getGLAccount('9999');
      expect(account).toBeUndefined();
    });
  });

  describe('Journal Entry Posting', () => {
    it('should post a valid, balanced journal entry', () => {
      const entry: JournalEntry = {
        id: 'JE001',
        date: new Date(),
        description: 'Cash sale',
        lines: [
          {
            accountCode: '1010',
            accountName: 'Cash',
            description: 'Cash received',
            debitAmount: 1000,
            creditAmount: 0,
            timestamp: new Date()
          },
          {
            accountCode: '4010',
            accountName: 'Product Sales',
            description: 'Revenue recorded',
            debitAmount: 0,
            creditAmount: 1000,
            timestamp: new Date()
          }
        ],
        isPosted: false
      };

      const result = service.postJournalEntry(entry);
      expect(result.success).toBe(true);
      expect(service.getGLAccount('1010')!.balance).toBe(1000);
    });

    it('should reject unbalanced journal entry', () => {
      const entry: JournalEntry = {
        id: 'JE002',
        date: new Date(),
        description: 'Unbalanced entry',
        lines: [
          {
            accountCode: '1010',
            accountName: 'Cash',
            description: 'Debit',
            debitAmount: 1000,
            creditAmount: 0,
            timestamp: new Date()
          },
          {
            accountCode: '4010',
            accountName: 'Product Sales',
            description: 'Credit',
            debitAmount: 0,
            creditAmount: 900,  // ❌ Doesn't balance
            timestamp: new Date()
          }
        ],
        isPosted: false
      };

      const result = service.postJournalEntry(entry);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not balance');
    });

    it('should reject entry with non-existent account', () => {
      const entry: JournalEntry = {
        id: 'JE003',
        date: new Date(),
        description: 'Invalid account',
        lines: [
          {
            accountCode: '1010',
            accountName: 'Cash',
            description: 'Debit',
            debitAmount: 1000,
            creditAmount: 0,
            timestamp: new Date()
          },
          {
            accountCode: '9999',  // ❌ Doesn't exist
            accountName: 'Fake Account',
            description: 'Credit',
            debitAmount: 0,
            creditAmount: 1000,
            timestamp: new Date()
          }
        ],
        isPosted: false
      };

      const result = service.postJournalEntry(entry);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });

  describe('Trial Balance', () => {
    it('should generate a balanced trial balance with no entries', () => {
      service.resetAllData();
      const tb = service.generateTrialBalance('2025-01');
      expect(tb.isBalanced).toBe(true);
      expect(tb.balanceError).toBeLessThan(0.01);
    });

    it('should generate balanced trial balance after posting entries', () => {
      service.resetAllData();

      const entry1: JournalEntry = {
        id: 'JE001',
        date: new Date(),
        description: 'Cash sale',
        lines: [
          { accountCode: '1010', accountName: 'Cash', description: '', debitAmount: 5000, creditAmount: 0, timestamp: new Date() },
          { accountCode: '4010', accountName: 'Product Sales', description: '', debitAmount: 0, creditAmount: 5000, timestamp: new Date() }
        ],
        isPosted: false
      };

      service.postJournalEntry(entry1);
      const tb = service.generateTrialBalance('2025-01');
      expect(tb.isBalanced).toBe(true);
    });
  });

  describe('Accounting Equation Validation', () => {
    it('should validate Assets = Liabilities + Equity', () => {
      service.resetAllData();
      const validation = service.validateAccountingEquation();
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Financial Metrics Calculation', () => {
    beforeEach(() => {
      service.resetAllData();

      // Revenue entry
      const revenueEntry: JournalEntry = {
        id: 'JE001',
        date: new Date(),
        description: 'Sales revenue',
        lines: [
          { accountCode: '1010', accountName: 'Cash', description: '', debitAmount: 10000, creditAmount: 0, timestamp: new Date() },
          { accountCode: '4010', accountName: 'Product Sales', description: '', debitAmount: 0, creditAmount: 10000, timestamp: new Date() }
        ],
        isPosted: false
      };

      // Expense entry
      const expenseEntry: JournalEntry = {
        id: 'JE002',
        date: new Date(),
        description: 'Expense',
        lines: [
          { accountCode: '6010', accountName: 'Salaries & Wages', description: '', debitAmount: 3000, creditAmount: 0, timestamp: new Date() },
          { accountCode: '1010', accountName: 'Cash', description: '', debitAmount: 0, creditAmount: 3000, timestamp: new Date() }
        ],
        isPosted: false
      };

      service.postJournalEntry(revenueEntry);
      service.postJournalEntry(expenseEntry);
    });

    it('should calculate total revenue correctly', () => {
      const metrics = service.calculateFinancialMetrics('2025-01');
      expect(metrics.totalRevenue).toBe(10000);
    });

    it('should calculate total expenses correctly', () => {
      const metrics = service.calculateFinancialMetrics('2025-01');
      expect(metrics.totalExpenses).toBe(3000);
    });

    it('should calculate net income correctly', () => {
      const metrics = service.calculateFinancialMetrics('2025-01');
      expect(metrics.netIncome).toBe(7000); // 10000 - 3000
    });
  });

  describe('Account Filtering', () => {
    it('should get all revenue accounts', () => {
      const revenues = service.getRevenueAccounts();
      expect(revenues.length).toBeGreaterThan(0);
      revenues.forEach(a => expect(a.type).toBe('Revenue'));
    });

    it('should get all expense accounts', () => {
      const expenses = service.getExpenseAccounts();
      expect(expenses.length).toBeGreaterThan(0);
      expenses.forEach(a => expect(a.type).toBe('Expense'));
    });

    it('should get all asset accounts', () => {
      const assets = service.getAssetAccounts();
      expect(assets.length).toBeGreaterThan(0);
      assets.forEach(a => expect(a.type).toBe('Asset'));
    });
  });

  describe('Formatting Utilities', () => {
    it('should format currency in NGN', () => {
      const formatted = service.formatCurrency(1000, 'NGN');
      expect(formatted).toContain('₦');
      expect(formatted).toContain('1,000.00');
    });

    it('should format percentage', () => {
      const formatted = service.formatPercentage(12.5);
      expect(formatted).toContain('12.5%');
    });

    it('should round to monetary precision', () => {
      const rounded = service.roundToMonetary(123.456);
      expect(rounded).toBe(123.46);
    });
  });

  describe('Data Reset', () => {
    it('should reset all data', () => {
      service.resetAllData();
      const accounts = service.getGLAccounts();
      accounts.forEach(a => {
        expect(a.balance).toBe(0);
      });
    });
  });
});
