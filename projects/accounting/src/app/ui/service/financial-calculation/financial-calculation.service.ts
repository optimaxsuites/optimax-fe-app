import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface GLAccount {
  code: string;              
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' | 'GainLoss';
  normalBalance: 'Debit' | 'Credit';  // Debit for Assets, Credit for Liabilities
  balance: number;           // Net balance after all transactions
  openingBalance: number;    // Starting balance for period
}


export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  description: string;
  debitAmount: number;       // Amount if debited (0 if credited)
  creditAmount: number;      // Amount if credited (0 if debited)
  timestamp: Date;
}


export interface JournalEntry {
  id: string;
  date: Date;
  description: string;
  lines: JournalEntryLine[];
  isPosted: boolean;
  postedBy?: string;
  postedDate?: Date;
}

export interface TrialBalance {
  period: string;
  accounts: {
    code: string;
    name: string;
    type: string;
    debitBalance: number;
    creditBalance: number;
  }[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  balanceError: number;
}


export interface FinancialMetrics {
  // Income Statement metrics
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  
  // Balance Sheet metrics
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  
  // Ratios
  currentRatio: number;
  debtToEquity: number;
  netProfitMargin: number;
}

@Injectable({
  providedIn: 'root'
})
export class FinancialCalculationService {

  // Store all GL accounts
  private glAccounts = new Map<string, GLAccount>();
  
  // Store all journal entries
  private journalEntries: JournalEntry[] = [];
  
  // Observable for metrics changes
  private metricsSubject = new BehaviorSubject<FinancialMetrics | null>(null);
  public metrics$: Observable<FinancialMetrics | null> = this.metricsSubject.asObservable();
  
  // Calculation cache
  private cache = new Map<string, { value: any; timestamp: number }>();
  private cacheTimeout = 60000; // 1 minute

  constructor() {
    this.initializeStandardChartOfAccounts();
  }

  private initializeStandardChartOfAccounts(): void {
    // ASSETS (1000-1999) - Debit normal balance
    this.addAccount('1010', 'Cash', 'Asset', 'Debit');
    this.addAccount('1020', 'Bank Account', 'Asset', 'Debit');
    this.addAccount('1030', 'Accounts Receivable', 'Asset', 'Debit');
    this.addAccount('1040', 'Inventory', 'Asset', 'Debit');
    this.addAccount('1050', 'Prepaid Expenses', 'Asset', 'Debit');
    this.addAccount('1100', 'Property, Plant & Equipment', 'Asset', 'Debit');
    this.addAccount('1110', 'Accumulated Depreciation', 'Asset', 'Credit'); // Contra-asset
    this.addAccount('1200', 'Intangible Assets', 'Asset', 'Debit');
    this.addAccount('1210', 'Goodwill', 'Asset', 'Debit');

    // LIABILITIES (2000-2999) - Credit normal balance
    this.addAccount('2010', 'Accounts Payable', 'Liability', 'Credit');
    this.addAccount('2020', 'Short-term Debt', 'Liability', 'Credit');
    this.addAccount('2030', 'Accrued Expenses', 'Liability', 'Credit');
    this.addAccount('2040', 'Current Tax Payable', 'Liability', 'Credit');
    this.addAccount('2100', 'Long-term Debt', 'Liability', 'Credit');
    this.addAccount('2110', 'Deferred Tax Liability', 'Liability', 'Credit');

    // EQUITY (3000-3999) - Credit normal balance
    this.addAccount('3010', 'Common Stock', 'Equity', 'Credit');
    this.addAccount('3020', 'Retained Earnings', 'Equity', 'Credit');
    this.addAccount('3030', 'Capital Contributions', 'Equity', 'Credit');
    this.addAccount('3040', 'Dividends Paid', 'Equity', 'Debit'); // Contra-equity

    // REVENUE (4000-4999) - Credit normal balance
    this.addAccount('4010', 'Product Sales', 'Revenue', 'Credit');
    this.addAccount('4020', 'Service Revenue', 'Revenue', 'Credit');
    this.addAccount('4030', 'Subscription Income', 'Revenue', 'Credit');
    this.addAccount('4040', 'Other Revenue', 'Revenue', 'Credit');

    // COST OF GOODS SOLD (5000-5999) - Debit normal balance
    this.addAccount('5010', 'Cost of Goods Sold', 'Expense', 'Debit');
    this.addAccount('5020', 'Direct Labor', 'Expense', 'Debit');
    this.addAccount('5030', 'Manufacturing Overhead', 'Expense', 'Debit');

    // OPERATING EXPENSES (6000-6999) - Debit normal balance
    this.addAccount('6010', 'Salaries & Wages', 'Expense', 'Debit');
    this.addAccount('6020', 'Rent', 'Expense', 'Debit');
    this.addAccount('6030', 'Utilities', 'Expense', 'Debit');
    this.addAccount('6040', 'Office Supplies', 'Expense', 'Debit');
    this.addAccount('6050', 'Depreciation Expense', 'Expense', 'Debit');
    this.addAccount('6060', 'Insurance', 'Expense', 'Debit');
    this.addAccount('6070', 'Professional Services', 'Expense', 'Debit');
    this.addAccount('6080', 'Marketing & Advertising', 'Expense', 'Debit');
    this.addAccount('6090', 'Travel & Entertainment', 'Expense', 'Debit');

    // INTEREST & OTHER (7000-7999)
    this.addAccount('7010', 'Interest Income', 'GainLoss', 'Credit');
    this.addAccount('7020', 'Interest Expense', 'Expense', 'Debit');
    this.addAccount('7030', 'Gain on Asset Sale', 'GainLoss', 'Credit');
    this.addAccount('7040', 'Loss on Asset Sale', 'Expense', 'Debit');

    // TAXES (8000-8999)
    this.addAccount('8010', 'Income Tax Expense', 'Expense', 'Debit');
  }

  /**
   * Add or update a GL account
   */
  private addAccount(code: string, name: string, type: GLAccount['type'], normalBalance: 'Debit' | 'Credit'): void {
    this.glAccounts.set(code, {
      code,
      name,
      type,
      normalBalance,
      balance: 0,
      openingBalance: 0
    });
  }

  /**
   * Get all GL accounts
   */
  getGLAccounts(): GLAccount[] {
    return Array.from(this.glAccounts.values());
  }

  getGLAccount(code: string): GLAccount | undefined {
    return this.glAccounts.get(code);
  }

  postJournalEntry(entry: JournalEntry): { success: boolean; error?: string } {
    // Validate entry totals balance
    let totalDebits = 0;
    let totalCredits = 0;

    for (const line of entry.lines) {
      totalDebits += line.debitAmount;
      totalCredits += line.creditAmount;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) { // Allow 1 penny rounding difference
      return {
        success: false,
        error: `Journal entry does not balance. Debits: ₦${totalDebits}, Credits: ₦${totalCredits}`
      };
    }

    // Verify all accounts exist
    for (const line of entry.lines) {
      if (!this.glAccounts.has(line.accountCode)) {
        return {
          success: false,
          error: `Account ${line.accountCode} does not exist in chart of accounts`
        };
      }
    }

    // Update GL account balances
    for (const line of entry.lines) {
      const account = this.glAccounts.get(line.accountCode)!;
      
      // Update balance based on account type and entry direction
      if (line.debitAmount > 0) {
        account.balance += line.debitAmount;
      } else {
        account.balance -= line.creditAmount;
      }
    }

    // Mark entry as posted and add to journal
    entry.isPosted = true;
    entry.postedDate = new Date();
    this.journalEntries.push(entry);

    // Invalidate cache
    this.clearCache();

    // Notify observers
    this.notifyMetricsChange();

    return { success: true };
  }

  generateTrialBalance(period: string): TrialBalance {
    return this.getCachedOrCalculate(`trialBalance_${period}`, () => {
      const accounts: TrialBalance['accounts'] = [];
      let totalDebits = 0;
      let totalCredits = 0;

      for (const [_, account] of this.glAccounts) {
        const debitBalance = account.normalBalance === 'Debit' ? Math.max(account.balance, 0) : Math.max(-account.balance, 0);
        const creditBalance = account.normalBalance === 'Credit' ? Math.max(account.balance, 0) : Math.max(-account.balance, 0);

        accounts.push({
          code: account.code,
          name: account.name,
          type: account.type,
          debitBalance,
          creditBalance
        });

        totalDebits += debitBalance;
        totalCredits += creditBalance;
      }

      const balanceError = Math.abs(totalDebits - totalCredits);
      const isBalanced = balanceError < 0.01; // Allow 1 penny

      return {
        period,
        accounts,
        totalDebits,
        totalCredits,
        isBalanced,
        balanceError
      };
    });
  }

  calculateFinancialMetrics(period: string): FinancialMetrics {
    return this.getCachedOrCalculate(`metrics_${period}`, () => {
      // Income Statement Calculations
      const revenues = this.sumAccountsByType('Revenue');
      const expenses = this.sumAccountsByType('Expense');
      const gainLosses = this.sumAccountsByType('GainLoss');

      const totalRevenue = Math.abs(revenues);
      const totalExpenses = Math.abs(expenses);
      const grossProfit = totalRevenue - totalExpenses;
      const operatingIncome = grossProfit + gainLosses;
      
      // Get tax expense
      const taxAccount = this.glAccounts.get('8010');
      const taxExpense = taxAccount ? Math.abs(taxAccount.balance) : 0;
      
      const netIncome = operatingIncome - taxExpense;

      // Balance Sheet Calculations
      const totalAssets = this.sumAccountsByType('Asset');
      const totalLiabilities = this.sumAccountsByType('Liability');
      const totalEquity = this.sumAccountsByType('Equity');

      // Calculate Ratios
      const currentRatio = totalLiabilities !== 0 ? totalAssets / totalLiabilities : 0;
      const debtToEquity = totalEquity !== 0 ? totalLiabilities / totalEquity : 0;
      const netProfitMargin = totalRevenue !== 0 ? (netIncome / totalRevenue) * 100 : 0;

      return {
        totalRevenue,
        totalExpenses,
        grossProfit,
        operatingIncome,
        netIncome,
        totalAssets,
        totalLiabilities,
        totalEquity,
        currentRatio,
        debtToEquity,
        netProfitMargin
      };
    });
  }

  validateAccountingEquation(): { isValid: boolean; difference: number; message: string } {
    const trialBalance = this.generateTrialBalance(new Date().toISOString());
    
    if (!trialBalance.isBalanced) {
      return {
        isValid: false,
        difference: trialBalance.balanceError,
        message: `Trial balance is unbalanced by ₦${trialBalance.balanceError.toFixed(2)}`
      };
    }

    return {
      isValid: true,
      difference: 0,
      message: 'Accounting equation is balanced'
    };
  }

  getAccountBalance(accountCode: string, useNormalSign: boolean = false): number {
    const account = this.glAccounts.get(accountCode);
    if (!account) return 0;

    if (useNormalSign) {
      // Return balance using normal convention (assets/expenses positive, liabilities/equity/revenue negative)
      if (['Asset', 'Expense'].includes(account.type)) {
        return account.balance;
      } else {
        return -account.balance;
      }
    }

    return account.balance;
  }

  private sumAccountsByType(type: GLAccount['type']): number {
    let sum = 0;
    for (const [_, account] of this.glAccounts) {
      if (account.type === type) {
        // For revenue, return as negative (credit balance)
        if (type === 'Revenue') {
          sum += -Math.abs(account.balance);
        } else if (type === 'GainLoss') {
          sum += account.balance;
        } else {
          sum += account.balance;
        }
      }
    }
    return sum;
  }


  getRevenueAccounts(): GLAccount[] {
    return Array.from(this.glAccounts.values()).filter(a => a.type === 'Revenue');
  }

  getExpenseAccounts(): GLAccount[] {
    return Array.from(this.glAccounts.values()).filter(a => a.type === 'Expense');
  }

  getAssetAccounts(): GLAccount[] {
    return Array.from(this.glAccounts.values()).filter(a => a.type === 'Asset');
  }

  getLiabilityAccounts(): GLAccount[] {
    return Array.from(this.glAccounts.values()).filter(a => a.type === 'Liability');
  }

  getEquityAccounts(): GLAccount[] {
    return Array.from(this.glAccounts.values()).filter(a => a.type === 'Equity');
  }

  private getCachedOrCalculate<T>(key: string, calculation: () => T): T {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.value as T;
    }

    const result = calculation();
    this.cache.set(key, { value: result, timestamp: now });
    return result;
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private notifyMetricsChange(): void {
    const metrics = this.calculateFinancialMetrics(new Date().toISOString());
    this.metricsSubject.next(metrics);
  }

  formatCurrency(value: number, currency: string = 'NGN'): string {
    const locale = currency === 'NGN' ? 'en-NG' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }


  formatPercentage(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }

  roundToMonetary(value: number): number {
    return Math.round(value * 100) / 100;
  }

  resetAllData(): void {
    this.journalEntries = [];
    this.cache.clear();
    for (const [_, account] of this.glAccounts) {
      account.balance = 0;
      account.openingBalance = 0;
    }
    this.metricsSubject.next(null);
  }
}
