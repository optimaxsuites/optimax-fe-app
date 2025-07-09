import { Component, OnInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';


interface FinancialItem {
  name: string;
  amount: number;
  prevAmount: number;
  budget?: number;
  prevYearAmount?: number;
  category?: string;
}

interface Comment {
  id: number;
  author: string;
  text: string;
  timestamp: string;
}

interface FilterOptions {
  reportType: 'Actual' | 'Budget' | 'Actual vs Budget' | 'Actual vs Previous Year';
  entity: string;
  period: string;
  showPercentages: boolean;
  showVariance: boolean;
  includeForecasts: boolean;
}

@Component({
  selector: 'app-income-statement',
  templateUrl: './income-statement.component.html',
  styleUrls: ['./income-statement.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomeStatementComponent implements OnInit {
  @ViewChild('statementContent') statementContent!: ElementRef;

  isSaved: boolean = false;

  currentDate: Date = new Date(2025, 4, 1);
  showCommentsModal: boolean = false;
  showShareModal: boolean = false;
  showArchivesModal: boolean = false;
  Math = Math;
  
  activeFilters: FilterOptions = {
    reportType: 'Actual',
    entity: 'All Locations',
    period: 'This Month',
    showPercentages: false,
    showVariance: false,
    includeForecasts: false
  };

  totalBudgetOtherItems: number = 0;



  private calculationCache = new Map<string, any>();

  comments: Comment[] = [
    { id: 1, author: 'Jane Smith', text: 'Gross profit margin is improving nicely', timestamp: '2023-05-28T14:25:00' },
    { id: 2, author: 'John Doe', text: 'We should look into the increased maintenance costs', timestamp: '2023-05-29T09:10:00' }
  ];

  // Financial Data with all comparison values
  revenueData: FinancialItem[] = [
    { name: 'Product Sales', amount: 3125000, prevAmount: 2812500, budget: 3000000, prevYearAmount: 2500000 },
    { name: 'Service Revenue', amount: 375000, prevAmount: 337500, budget: 360000, prevYearAmount: 300000 },
    { name: 'Subscription Income', amount: 345000, prevAmount: 310500, budget: 330000, prevYearAmount: 275000 },
    { name: 'Other Revenue', amount: 35000, prevAmount: 31500, budget: 34000, prevYearAmount: 28000 }
  ];

  cogsData: FinancialItem[] = [
    { name: 'Cost of Products Sold', amount: -262500, prevAmount: -236250, budget: -250000, prevYearAmount: -210000 },
    { name: 'Direct Labor', amount: -235000, prevAmount: -211500, budget: -225000, prevYearAmount: -190000 },
    { name: 'Manufacturing Overhead', amount: -215000, prevAmount: -193500, budget: -205000, prevYearAmount: -180000 }
  ];

  operatingExpenses: FinancialItem[] = [
    { name: 'Office Supply', amount: -262500, prevAmount: -236250, budget: -250000, prevYearAmount: -210000 },
    { name: 'Professional Services', amount: -235000, prevAmount: -211500, budget: -250000, prevYearAmount: -200000 },
    { name: 'Insurance', amount: -215000, prevAmount: -193500, budget: -250000, prevYearAmount: -180000 }
  ];

  SalariesWages: FinancialItem[] = [
    { name: 'Salaries & Wages', amount: -157600, prevAmount: -141840, budget: -150000, prevYearAmount: -130000 },
    { name: 'Benefits', amount: -157600, prevAmount: -141840, budget: -150000, prevYearAmount: -130000 },
    { name: 'Payroll Taxes', amount: -157600, prevAmount: -141840, budget: -150000, prevYearAmount: -130000 },
    { name: 'Training & Development', amount: -157600, prevAmount: -141840, budget: -150000, prevYearAmount: -130000 }
  ];

  Maintenance: FinancialItem[] = [
    { name: 'Building Maintenance', amount: -16000, prevAmount: -14400, budget: -15000, prevYearAmount: -12000 },
    { name: 'Repairs', amount: -16000, prevAmount: -14400, budget: -15000, prevYearAmount: -12000 },
    { name: 'Equipment Maintenance', amount: -16000, prevAmount: -14400, budget: -15000, prevYearAmount: -12000 }
  ];

  LogisticsDistribution: FinancialItem[] = [
    { name: 'Shipping & Freight', amount: -19000, prevAmount: -17100, budget: -18000, prevYearAmount: -15000 },
    { name: 'Distribution Costs', amount: -19000, prevAmount: -17100, budget: -18000, prevYearAmount: -15000 },
    { name: 'Travel and Entertainment', amount: -19000, prevAmount: -17100, budget: -18000, prevYearAmount: -15000 }
  ];

  otherOperatingExpenses: FinancialItem[] = [
    { name: 'Rent', amount: -214200, prevAmount: -192780, budget: -200000, prevYearAmount: -180000 },
    { name: 'Marketing & Advertising', amount: -131800, prevAmount: -118620, budget: -120000, prevYearAmount: -100000 },
    { name: 'Utilities', amount: -131800, prevAmount: -118620, budget: -120000, prevYearAmount: -100000 },
    { name: 'Depreciation & Amortization', amount: -131800, prevAmount: -118620, budget: -120000, prevYearAmount: -100000 }
  ];

  otherItems: FinancialItem[] = [
    { name: 'Interest Income', amount: 11500, prevAmount: 10350, budget: 10000, prevYearAmount: 8000 },
    { name: 'Interest Expense', amount: -13200, prevAmount: -11880, budget: -12000, prevYearAmount: -10000 },
    { name: 'Gain on Sale of Assets', amount: 12800, prevAmount: 11520, budget: 10000, prevYearAmount: 8000 }
  ];

  taxExpense: FinancialItem = { 
    name: 'Income Tax Expense', 
    amount: -19350, 
    prevAmount: -17415, 
    budget: -18000, 
    prevYearAmount: -15000 
  };

  monthlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    revenue: [230000, 235000, 240000, 245000, 248000, 250000],
    expenses: [195000, 198000, 200000, 203000, 205000, 207500],
    profit: [35000, 37000, 40000, 42000, 43000, 42500]
  };


  ngOnInit(): void {
    this.updateMetrics();
    
  }

  previousMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.clearCache();
    this.updateAllData();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.clearCache();
    this.updateAllData();
  }

  updateAllData(): void {
    this.updateMetrics();
  }

  onFiltersApplied(filters: FilterOptions): void {
    this.activeFilters = { ...filters };
    this.clearCache();
    this.updateAllData();
  }

  private memoize<T>(key: string, calculation: () => T): T {
    if (this.calculationCache.has(key)) {
      return this.calculationCache.get(key);
    }
    const result = calculation();
    this.calculationCache.set(key, result);
    return result;
  }

  private clearCache(): void {
    this.calculationCache.clear();
  }

  // Display value getters
  getDisplayAmount(item: FinancialItem): number {
    switch (this.activeFilters.reportType) {
      case 'Budget': return item.budget || 0;
      default: return item.amount;
    }
  }

  getBudgetTotal(items: any[]): number {
  return items.reduce((sum, i) => sum + (i.budget || 0), 0);
}

getExpenseVariance(total: number, comparison: number): number {
  return total - comparison;
}

getExpenseVariancePercentage(total: number, comparison: number): number {
  return comparison !== 0 ? ((total - comparison) / Math.abs(comparison)) * 100 : 0;
}


totalBudgetMaintenance: number = this.getBudgetTotal(this.Maintenance);
totalBudgetLogisticsDistribution: number = this.getBudgetTotal(this.LogisticsDistribution);
totalBudgetOtherOperatingExpenses: number = this.getBudgetTotal(this.otherOperatingExpenses);






  getComparisonAmount(item: FinancialItem): number | null {
    switch (this.activeFilters.reportType) {
      case 'Actual vs Budget': return item.budget || null;
      case 'Actual vs Previous Year': return item.prevYearAmount || null;
      default: return null;
    }
  }

  getVariance(item: FinancialItem): number | null {
    const comparison = this.getComparisonAmount(item);
    return comparison !== null ? this.getDisplayAmount(item) - comparison : null;
  }

  getVariancePercentage(item: FinancialItem): number | null {
    const comparison = this.getComparisonAmount(item);
    return comparison !== null && comparison !== 0 
      ? ((this.getDisplayAmount(item) - comparison) / Math.abs(comparison)) * 100 
      : null;
  }

    // metric calculations
    get totalBudgetSalariesWages(): number {
  return this.memoize('totalBudgetSalariesWages', () =>
    this.SalariesWages.reduce((sum, item) => sum + (item.budget || 0), 0)
  );
}

  get totalRevenue(): number {
    return this.memoize('totalRevenue', () => 
      this.revenueData.reduce((sum, item) => sum + this.getDisplayAmount(item), 0)
    );
  }
  
  get totalPrevRevenue(): number {
    return this.memoize('totalPrevRevenue', () => 
      this.revenueData.reduce((sum, item) => sum + item.prevAmount, 0)
    );
  }
  
  get totalPrevYearRevenue(): number {
    return this.memoize('totalPrevYearRevenue', () => 
      this.revenueData.reduce((sum, item) => sum + (item.prevYearAmount || 0), 0)
    );
  }
  
  get totalCOGS(): number {
    return this.memoize('totalCOGS', () => 
      this.cogsData.reduce((sum, item) => sum + this.getDisplayAmount(item), 0)
    );
  }
  get totalBudgetAdministrativeExpenses(): number {
    return this.memoize('totalBudgetAdministrativeExpenses', () =>
      this.operatingExpenses.reduce((sum, item) => sum + (item.budget || 0), 0)
    );
  }
  
  get totalPrevCOGS(): number {
    return this.memoize('totalPrevCOGS', () => 
      this.cogsData.reduce((sum, item) => sum + item.prevAmount, 0)
    );
  }
  
  get totalPrevYearCOGS(): number {
    return this.memoize('totalPrevYearCOGS', () => 
      this.cogsData.reduce((sum, item) => sum + (item.prevYearAmount || 0), 0)
    );
  }
  
  get grossProfit(): number {
    return this.memoize('grossProfit', () => 
      this.totalRevenue - this.totalCOGS
    );
  }
  
  get prevGrossProfit(): number {
    return this.memoize('prevGrossProfit', () => 
      this.totalPrevRevenue - this.totalPrevCOGS
    );
  }
  
  get prevYearGrossProfit(): number {
    return this.memoize('prevYearGrossProfit', () => 
      this.totalPrevYearRevenue - this.totalPrevYearCOGS
    );
  }

   // Operating Expenses Calculations
  get totalAdministrativeExpenses(): number {
    return this.memoize('totalAdministrativeExpenses', () => 
      this.operatingExpenses.reduce((sum, item) => sum + this.getDisplayAmount(item), 0)
    );
  }

  get totalPrevAdministrativeExpenses(): number {
    return this.memoize('totalPrevAdministrativeExpenses', () => 
      this.operatingExpenses.reduce((sum, item) => sum + item.prevAmount, 0)
    );
  }

  get totalPrevYearAdministrativeExpenses(): number {
    return this.memoize('totalPrevYearAdministrativeExpenses', () => 
      this.operatingExpenses.reduce((sum, item) => sum + (item.prevYearAmount || 0), 0)
    );
  }

  get totalSalariesWages(): number {
    return this.memoize('totalSalariesWages', () => 
      this.SalariesWages.reduce((sum, item) => sum + this.getDisplayAmount(item), 0)
    );
  }

  get totalPrevSalariesWages(): number {
    return this.memoize('totalPrevSalariesWages', () => 
      this.SalariesWages.reduce((sum, item) => sum + item.prevAmount, 0)
    );
  }

  get totalPrevYearSalariesWages(): number {
    return this.memoize('totalPrevYearSalariesWages', () => 
      this.SalariesWages.reduce((sum, item) => sum + (item.prevYearAmount || 0), 0)
    );
  }

  get totalMaintenance(): number {
    return this.memoize('totalMaintenance', () => 
      this.Maintenance.reduce((sum, item) => sum + this.getDisplayAmount(item), 0)
    );
  }

  get totalPrevMaintenance(): number {
    return this.memoize('totalPrevMaintenance', () => 
      this.Maintenance.reduce((sum, item) => sum + item.prevAmount, 0)
    );
  }

  get totalPrevYearMaintenance(): number {
    return this.memoize('totalPrevYearMaintenance', () => 
      this.Maintenance.reduce((sum, item) => sum + (item.prevYearAmount || 0), 0)
    );
  }

  get totalLogisticsDistribution(): number {
    return this.memoize('totalLogisticsDistribution', () => 
      this.LogisticsDistribution.reduce((sum, item) => sum + this.getDisplayAmount(item), 0)
    );
  }

  get totalPrevLogisticsDistribution(): number {
    return this.memoize('totalPrevLogisticsDistribution', () => 
      this.LogisticsDistribution.reduce((sum, item) => sum + item.prevAmount, 0)
    );
  }

  get totalPrevYearLogisticsDistribution(): number {
    return this.memoize('totalPrevYearLogisticsDistribution', () => 
      this.LogisticsDistribution.reduce((sum, item) => sum + (item.prevYearAmount || 0), 0)
    );
  }

  get totalOtherOperatingExpenses(): number {
    return this.memoize('totalOtherOperatingExpenses', () => 
      this.otherOperatingExpenses.reduce((sum, item) => sum + this.getDisplayAmount(item), 0)
    );
  }

  get totalPrevOtherOperatingExpenses(): number {
    return this.memoize('totalPrevOtherOperatingExpenses', () => 
      this.otherOperatingExpenses.reduce((sum, item) => sum + item.prevAmount, 0)
    );
  }

  get totalPrevYearOtherOperatingExpenses(): number {
    return this.memoize('totalPrevYearOtherOperatingExpenses', () => 
      this.otherOperatingExpenses.reduce((sum, item) => sum + (item.prevYearAmount || 0), 0)
    );
  }

  // Combined operating expenses
  get totalOperatingExpenses(): number {
    return this.memoize('totalOperatingExpenses', () => (
      this.totalAdministrativeExpenses +
      this.totalSalariesWages +
      this.totalMaintenance +
      this.totalLogisticsDistribution +
      this.totalOtherOperatingExpenses
    ));
  }

  get totalPrevOperatingExpenses(): number {
    return this.memoize('totalPrevOperatingExpenses', () => (
      this.totalPrevAdministrativeExpenses +
      this.totalPrevSalariesWages +
      this.totalPrevMaintenance +
      this.totalPrevLogisticsDistribution +
      this.totalPrevOtherOperatingExpenses
    ));
  }

  get totalPrevYearOperatingExpenses(): number {
    return this.memoize('totalPrevYearOperatingExpenses', () => (
      this.totalPrevYearAdministrativeExpenses +
      this.totalPrevYearSalariesWages +
      this.totalPrevYearMaintenance +
      this.totalPrevYearLogisticsDistribution +
      this.totalPrevYearOtherOperatingExpenses
    ));
  }

  // Income calculations
  get operatingIncome(): number {
    return this.memoize('operatingIncome', () => 
      this.grossProfit + this.totalOperatingExpenses
    );
  }

  get prevOperatingIncome(): number {
    return this.memoize('prevOperatingIncome', () => 
      this.prevGrossProfit + this.totalPrevOperatingExpenses
    );
  }

  get prevYearOperatingIncome(): number {
    return this.memoize('prevYearOperatingIncome', () => 
      this.prevYearGrossProfit + this.totalPrevYearOperatingExpenses
    );
  }

  // Other items calculations
  get totalOtherItems(): number {
    return this.memoize('totalOtherItems', () => 
      this.otherItems.reduce((sum, item) => sum + this.getDisplayAmount(item), 0)
    );
  }

  get totalPrevOtherItems(): number {
    return this.memoize('totalPrevOtherItems', () => 
      this.otherItems.reduce((sum, item) => sum + item.prevAmount, 0)
    );
  }

  get totalPrevYearOtherItems(): number {
    return this.memoize('totalPrevYearOtherItems', () => 
      this.otherItems.reduce((sum, item) => sum + (item.prevYearAmount || 0), 0)
    );
  }

  // Tax calculations
  get currentTaxExpense(): number {
    return this.memoize('currentTaxExpense', () => 
      this.getDisplayAmount(this.taxExpense)
    );
  }

  get prevTaxExpense(): number {
    return this.memoize('prevTaxExpense', () => 
      this.taxExpense.prevAmount
    );
  }

  get prevYearTaxExpense(): number {
    return this.memoize('prevYearTaxExpense', () => 
      this.taxExpense.prevYearAmount || 0
    );
  }

  // Net income calculations
  get netIncomeBeforeTax(): number {
    return this.memoize('netIncomeBeforeTax', () => 
      this.operatingIncome + this.totalOtherItems
    );
  }

  get prevNetIncomeBeforeTax(): number {
    return this.memoize('prevNetIncomeBeforeTax', () => 
      this.prevOperatingIncome + this.totalPrevOtherItems
    );
  }

  get prevYearNetIncomeBeforeTax(): number {
    return this.memoize('prevYearNetIncomeBeforeTax', () => 
      this.prevYearOperatingIncome + this.totalPrevYearOtherItems
    );
  }

  get netIncome(): number {
    return this.memoize('netIncome', () => 
      this.netIncomeBeforeTax + this.currentTaxExpense
    );
  }

  get prevNetIncome(): number {
    return this.memoize('prevNetIncome', () => 
      this.prevNetIncomeBeforeTax + this.prevTaxExpense
    );
  }

  get prevYearNetIncome(): number {
    return this.memoize('prevYearNetIncome', () => 
      this.prevYearNetIncomeBeforeTax + this.prevYearTaxExpense
    );
  }

  // Budget calculations
  get totalBudgetRevenue(): number {
    return this.memoize('totalBudgetRevenue', () => 
      this.revenueData.reduce((sum, item) => sum + (item.budget || 0), 0)
    );
  }

  get totalBudgetCOGS(): number {
    return this.memoize('totalBudgetCOGS', () => 
      this.cogsData.reduce((sum, item) => sum + (item.budget || 0), 0)
    );
  }

  get budgetGrossProfit(): number {
    return this.memoize('budgetGrossProfit', () => 
      this.totalBudgetRevenue + this.totalBudgetCOGS
    );
  }

  get totalBudgetOperatingExpenses(): number {
    return this.memoize('totalBudgetOperatingExpenses', () => (
      this.operatingExpenses.reduce((sum, item) => sum + (item.budget || 0), 0) +
      this.SalariesWages.reduce((sum, item) => sum + (item.budget || 0), 0) +
      this.Maintenance.reduce((sum, item) => sum + (item.budget || 0), 0) +
      this.LogisticsDistribution.reduce((sum, item) => sum + (item.budget || 0), 0) +
      this.otherOperatingExpenses.reduce((sum, item) => sum + (item.budget || 0), 0)
    ));
  }

  get budgetOperatingIncome(): number {
    return this.memoize('budgetOperatingIncome', () => 
      this.budgetGrossProfit + this.totalBudgetOperatingExpenses
    );
  }

  // Variance calculations
  get revenueVariance(): number {
    return this.memoize('revenueVariance', () => 
      this.totalRevenue - this.totalBudgetRevenue
    );
  }

  get cogsVariance(): number {
    return this.memoize('cogsVariance', () => 
      this.totalCOGS - this.totalBudgetCOGS
    );
  }

  get operatingExpensesVariance(): number {
    return this.memoize('operatingExpensesVariance', () => 
      this.totalOperatingExpenses - this.totalBudgetOperatingExpenses
    );
  }

  // Percentage calculations
  get grossProfitMargin(): number {
    return this.memoize('grossProfitMargin', () => 
      this.totalRevenue !== 0 ? (this.grossProfit / this.totalRevenue) * 100 : 0
    );
  }

  get prevGrossProfitMargin(): number {
    return this.memoize('prevGrossProfitMargin', () => 
      this.totalPrevRevenue !== 0 ? (this.prevGrossProfit / this.totalPrevRevenue) * 100 : 0
    );
  }

  get operatingMargin(): number {
    return this.memoize('operatingMargin', () => 
      this.totalRevenue !== 0 ? (this.operatingIncome / this.totalRevenue) * 100 : 0
    );
  }

  get netProfitMargin(): number {
    return this.memoize('netProfitMargin', () => 
      this.totalRevenue !== 0 ? (this.netIncome / this.totalRevenue) * 100 : 0
    );
  }

  get revenueGrowth(): number {
    return this.memoize('revenueGrowth', () => 
      this.totalPrevRevenue !== 0 ? 
        ((this.totalRevenue - this.totalPrevRevenue) / this.totalPrevRevenue) * 100 : 0
    );
  }

  get revenueYearOverYearGrowth(): number {
    return this.memoize('revenueYearOverYearGrowth', () => 
      this.totalPrevYearRevenue !== 0 ? 
        ((this.totalRevenue - this.totalPrevYearRevenue) / this.totalPrevYearRevenue) * 100 : 0
    );
  }

  get cogsGrowth(): number {
    return this.memoize('cogsGrowth', () => 
      this.totalPrevCOGS !== 0 ? 
        ((this.totalCOGS - this.totalPrevCOGS) / Math.abs(this.totalPrevCOGS)) * 100 : 0
    );
  }

  get grossProfitGrowth(): number {
    return this.memoize('grossProfitGrowth', () => 
      this.prevGrossProfit !== 0 ? 
        ((this.grossProfit - this.prevGrossProfit) / this.prevGrossProfit) * 100 : 0
    );
  }

  get operatingExpensesGrowth(): number {
    return this.memoize('operatingExpensesGrowth', () => 
      this.totalPrevOperatingExpenses !== 0 ? 
        ((this.totalOperatingExpenses - this.totalPrevOperatingExpenses) / 
         Math.abs(this.totalPrevOperatingExpenses)) * 100 : 0
    );
  }

  updateMetrics(): void {
    this.clearCache();
  }


  // UI Helper Methods
  toggleCommentsModal(): void {
    this.showCommentsModal = !this.showCommentsModal;
  }

  toggleShareModal(): void {
    this.showShareModal = !this.showShareModal;
  }

  toggleArchivesModal(): void {
    this.showArchivesModal = !this.showArchivesModal;
  }

  // Data Export Methods
  async exportToPDF(): Promise<void> {
    try {
      // if (this.statementContent) {
      //   const canvas = await html2canvas(this.statementContent.nativeElement);
      //   const imgData = canvas.toDataURL('image/png');
      //   const pdf = new jsPDF({
      //     orientation: 'portrait',
      //     unit: 'mm',
      //     format: 'a4'
      //   });
      //   const imgWidth = 210;
      //   const imgHeight = (canvas.height * imgWidth) / canvas.width;
      //   pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      //   pdf.save(`Income_Statement_${this.getFormattedDate()}.pdf`);
      // }
      console.warn('PDF export requires jsPDF and html2canvas dependencies');
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  }

  exportToCSV(): void {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += `Income Statement - ${this.getFormattedDate()}\n\n`;
      
      // Add headers based on active filters
      const headers = ['Item', 'Amount'];
      if (this.activeFilters.reportType.includes('vs')) {
        headers.push(this.activeFilters.reportType.split('vs ')[1]);
        headers.push('Variance');
        if (this.activeFilters.showPercentages) {
          headers.push('Variance %');
        }
      }
      csvContent += headers.join(',') + '\n';

      // Add data rows
      const addSectionToCSV = (sectionName: string, items: FinancialItem[]) => {
        csvContent += `${sectionName}\n`;
        items.forEach(item => {
          const row = [item.name, this.formatCurrency(this.getDisplayAmount(item))];
          
          if (this.activeFilters.reportType.includes('vs')) {
            const comparison = this.getComparisonAmount(item);
            row.push(comparison !== null ? this.formatCurrency(comparison) : '');
            
            const variance = this.getVariance(item);
            row.push(variance !== null ? this.formatCurrency(variance) : '');
            
            if (this.activeFilters.showPercentages) {
              const variancePct = this.getVariancePercentage(item);
              row.push(variancePct !== null ? this.formatPercentage(variancePct) : '');
            }
          }
          csvContent += row.join(',') + '\n';
        });
        csvContent += '\n';
      };

      // Add all sections
      addSectionToCSV('Revenue', this.revenueData);
      addSectionToCSV('Cost of Goods Sold', this.cogsData);
      addSectionToCSV('Operating Expenses', [
        ...this.operatingExpenses,
        ...this.SalariesWages,
        ...this.Maintenance,
        ...this.LogisticsDistribution,
        ...this.otherOperatingExpenses
      ]);
      addSectionToCSV('Other Items', this.otherItems);
      addSectionToCSV('Tax', [this.taxExpense]);

      // Add summary section
      csvContent += 'Summary\n';
      csvContent += `Total Revenue,${this.formatCurrency(this.totalRevenue)}\n`;
      csvContent += `Total COGS,${this.formatCurrency(this.totalCOGS)}\n`;
      csvContent += `Gross Profit,${this.formatCurrency(this.grossProfit)}\n`;
      csvContent += `Total Operating Expenses,${this.formatCurrency(this.totalOperatingExpenses)}\n`;
      csvContent += `Operating Income,${this.formatCurrency(this.operatingIncome)}\n`;
      csvContent += `Net Income Before Tax,${this.formatCurrency(this.netIncomeBeforeTax)}\n`;
      csvContent += `Net Income,${this.formatCurrency(this.netIncome)}\n`;

      // Trigger download
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Income_Statement_${this.getFormattedDate()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating CSV:', error);
    }
  }

  printPage(): void {
    window.print();
  }

  // Data Management Methods
  saveStatement(): void {
    try {
      this.isSaved = true;
      const statementData = {
        period: this.activeFilters.period,
        reportType: this.activeFilters.reportType,
        entity: this.activeFilters.entity,
        dateRange: this.getFormattedDate(),
        totalRevenue: this.totalRevenue,
        totalCOGS: this.totalCOGS,
        grossProfit: this.grossProfit,
        totalOperatingExpenses: this.totalOperatingExpenses,
        operatingIncome: this.operatingIncome,
        netIncome: this.netIncome,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('savedIncomeStatement', JSON.stringify(statementData));
      console.log('Income Statement saved successfully:', statementData);
    } catch (error) {
      console.error('Error saving statement:', error);
    }
  }

  addComment(text: string): void {
    try {
      const newComment: Comment = {
        id: this.comments.length + 1,
        author: 'Current User',
        text,
        timestamp: new Date().toISOString()
      };
      this.comments = [...this.comments, newComment];
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  }

  // Helper Methods
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
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

  getFormattedDate(): string {
    const month = this.currentDate.toLocaleString('default', { month: 'short' });
    const year = this.currentDate.getFullYear();
    return `${month}_${year}`;
  }

  // Insight Generation
  get insights(): any[] {
    const insights = [];

    // Revenue insight
    insights.push({
      title: `Revenue ${this.revenueGrowth >= 0 ? 'increased' : 'decreased'}`,
      description: `Revenue ${this.revenueGrowth >= 0 ? 'grew' : 'declined'} by ${this.formatPercentage(Math.abs(this.revenueGrowth))} compared to previous period`,
      trend: this.revenueGrowth >= 0 ? 'positive' : 'negative'
    });

    // Budget variance insight
    if (this.activeFilters.reportType.includes('Budget')) {
      insights.push({
        title: `Revenue ${this.revenueVariance >= 0 ? 'exceeded' : 'fell short of'} budget`,
        description: `Revenue is ${this.formatCurrency(Math.abs(this.revenueVariance))} ${this.revenueVariance >= 0 ? 'above' : 'below'} budget`,
        trend: this.revenueVariance >= 0 ? 'positive' : 'negative'
      });
    }

    // Gross profit margin insight
    insights.push({
      title: `Gross profit margin ${this.grossProfitMargin >= (this.prevGrossProfit / this.totalPrevRevenue * 100) ? 'improved' : 'declined'}`,
      description: `Gross profit margin is ${this.grossProfitMargin.toFixed(1)}%, ${this.grossProfitMargin >= (this.prevGrossProfit / this.totalPrevRevenue * 100) ? 'up' : 'down'} from previous period`,
      trend: this.grossProfitMargin >= (this.prevGrossProfit / this.totalPrevRevenue * 100) ? 'positive' : 'negative'
    });

    // Operating expenses insight
    insights.push({
      title: `Operating expenses ${this.operatingExpensesGrowth <= 0 ? 'decreased' : 'increased'}`,
      description: `Operating expenses ${this.operatingExpensesGrowth <= 0 ? 'decreased' : 'increased'} by ${this.formatPercentage(Math.abs(this.operatingExpensesGrowth))}`,
      trend: this.operatingExpensesGrowth <= 0 ? 'positive' : 'negative'
    });

    return insights;
  }
}
