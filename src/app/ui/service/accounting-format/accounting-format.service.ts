import { Injectable } from '@angular/core';
export interface FormatOptions {
  currency?: string;
  decimals?: number;
  includeSymbol?: boolean;
  locale?: string;
}

export interface FinancialFormatResult {
  formatted: string;
  value: number;
  display: string;  
}

@Injectable({
  providedIn: 'root'
})
export class AccountingFormatService {

  private readonly NGN_SYMBOL = '₦';
  private readonly DEFAULT_DECIMALS = 2;
  private readonly DEFAULT_LOCALE = 'en-NG';
  private readonly DEFAULT_CURRENCY = 'NGN';

  formatCurrency(value: number, options: FormatOptions = {}): string {
    const roundedValue = this.toMonetaryPrecision(value);
    const locale = options.locale || this.DEFAULT_LOCALE;
    const currency = options.currency || this.DEFAULT_CURRENCY;
    const decimals = options.decimals ?? this.DEFAULT_DECIMALS;

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(roundedValue);
    } catch (error) {
      // Fallback if Intl fails
      return `${currency} ${roundedValue.toFixed(decimals)}`;
    }
  }

  formatPercentage(value: number, decimals: number = 1): string {
    const roundedValue = this.toMonetaryPrecision(value);
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(roundedValue / 100);  // Convert to decimal form (0-1)
    } catch (error) {
      return `${roundedValue.toFixed(decimals)}%`;
    }
  }

  formatWithTrend(value: number, positive: string = '▲', negative: string = '▼'): string {
    return value >= 0 ? `${positive} ${this.formatCurrency(Math.abs(value))}` : `${negative} ${this.formatCurrency(Math.abs(value))}`;
  }


  formatVariance(actual: number, budget: number, showPercentage: boolean = true): { amount: string; percentage: string; trend: 'positive' | 'negative' | 'neutral' } {
    const variance = actual - budget;
    const percentageVariance = budget !== 0 ? (variance / Math.abs(budget)) * 100 : 0;

    let trend: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (variance > 0.01) trend = 'positive';
    if (variance < -0.01) trend = 'negative';

    return {
      amount: this.formatCurrency(variance),
      percentage: showPercentage ? this.formatPercentage(percentageVariance) : '',
      trend
    };
  }

  toMonetaryPrecision(value: number): number {
    return Math.round(value * 100) / 100;
  }

  formatDate(date: Date | string, format: 'short' | 'long' | 'full' = 'long'): string {
    const d = typeof date === 'string' ? new Date(date) : date;

    const options = ({
      short: { year: '2-digit', month: '2-digit', day: '2-digit' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
    } as const)[format] as Intl.DateTimeFormatOptions;

    try {
      return new Intl.DateTimeFormat(this.DEFAULT_LOCALE, options).format(d);
    } catch (error) {
      return d.toString();
    }
  }

  formatPeriod(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    return `${month} ${year}`;
  }


  formatNumber(value: number, decimals: number = 0): string {
    return new Intl.NumberFormat(this.DEFAULT_LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }


  parseCurrency(currencyString: string): number {
    // Remove currency symbol and whitespace
    let cleaned = currencyString.replace(/[₦\s,]/g, '');
    // Handle negative
    const isNegative = currencyString.includes('-');
    const value = parseFloat(cleaned);
    return isNegative ? -value : value;
  }

  getTrendClass(value: number): 'positive' | 'negative' | 'neutral' {
    if (value > 0.01) return 'positive';
    if (value < -0.01) return 'negative';
    return 'neutral';
  }

  getTrendIcon(value: number): string {
    if (value > 0.01) return '▲';
    if (value < -0.01) return '▼';
    return '→';
  }

  formatLineItem(name: string, level: number = 0, bold: boolean = false): string {
    const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level);
    const fontWeight = bold ? '<strong>' : '';
    const fontWeightEnd = bold ? '</strong>' : '';
    return `${fontWeight}${indent}${name}${fontWeightEnd}`;
  }

  formatGrowthRate(current: number, previous: number, decimals: number = 1): string {
    if (previous === 0) return 'N/A';

    const rate = ((current - previous) / Math.abs(previous)) * 100;
    return this.formatPercentage(rate, decimals);
  }

  formatBudgetVariance(
    actual: number,
    budget: number,
    type: 'revenue' | 'expense'
  ): { display: string; isFavorable: boolean } {
    const variance = actual - budget;

    if (type === 'revenue') {
      // For revenue: higher is better
      const isFavorable = variance >= 0;
      return {
        display: this.formatWithTrend(variance, '✓', '✗'),
        isFavorable
      };
    } else {
      // For expenses: lower is better (variance should be negative)
      const isFavorable = variance <= 0;
      return {
        display: this.formatWithTrend(-variance, '✓', '✗'),
        isFavorable
      };
    }
  }

  formatAccountBalance(
    balance: number,
    accountType: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
  ): string {
    const displayValue = Math.abs(balance);
    const formatted = this.formatCurrency(displayValue);

    // Add debit/credit notation
    const isDebit = balance >= 0;
    const notation = accountType === 'Asset' || accountType === 'Expense'
      ? (isDebit ? 'Dr' : 'Cr')
      : (isDebit ? 'Cr' : 'Dr');

    return `${formatted} ${notation}`;
  }

  formatIncomeStatementValue(value: number, itemType: 'revenue' | 'expense' | 'other'): string {
    let displayValue = value;

    if (itemType === 'expense') {
      displayValue = -Math.abs(value);  // Ensure negative
    }

    const formatted = this.formatCurrency(Math.abs(displayValue));
    return itemType === 'expense' ? `(${formatted})` : formatted;
  }

  getAccountTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'Asset': 'Asset',
      'Liability': 'Liability',
      'Equity': 'Shareholder Equity',
      'Revenue': 'Revenue',
      'Expense': 'Operating Expense',
      'GainLoss': 'Gain/Loss'
    };
    return labels[type] || type;
  }
}
