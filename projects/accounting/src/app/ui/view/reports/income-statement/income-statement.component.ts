import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
// import { jsPDF } from 'jspdf';
// import html2canvas from 'html2canvas';
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexStroke,
  ApexLegend,
  ApexTitleSubtitle,
  ApexPlotOptions,
  ApexFill
} from "ng-apexcharts";

// Define chart types
export type RevenueChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  title: ApexTitleSubtitle;
};

export type ExpenseChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  legend: ApexLegend;
  title: ApexTitleSubtitle;
};

interface FinancialItem {
  name: string;
  amount: number;
  prevAmount: number;
  budget?: number;
  category?: string;
}

interface Comment {
  id: number;
  author: string;
  text: string;
  timestamp: string;
}

@Component({
  selector: 'app-income-statement',
  templateUrl: './income-statement.component.html',
  styleUrls: ['./income-statement.component.scss']
})
export class IncomeStatementComponent implements OnInit {
  @ViewChild('statementContent') statementContent!: ElementRef;

  currentDate: Date = new Date(2023, 4, 1);
  showFilterModal: boolean = false;
  showCommentsModal: boolean = false;
  showShareModal: boolean = false;
  showArchivesModal: boolean = false;
  
  reportType: string = 'Actual';
  entity: string = 'All Locations';
  period: string = 'This Month';
  showPercentages: boolean = false;
  showVariance: boolean = false;
  includeForecasts: boolean = false;
  isSaved: boolean = false;
  Math = Math;

  comments: Comment[] = [
    {
      id: 1,
      author: 'Jane Smith',
      text: 'Gross profit margin is improving nicely',
      timestamp: '2023-05-28T14:25:00'
    },
    {
      id: 2,
      author: 'John Doe',
      text: 'We should look into the increased maintenance costs',
      timestamp: '2023-05-29T09:10:00'
    }
  ];

  // Financial Data with budget values added
  revenueData: FinancialItem[] = [
    { name: 'Product Sales', amount: 3125000, prevAmount: 2812500, budget: 3000000 },
    { name: 'Service Revenue', amount: 375000, prevAmount: 337500, budget: 360000 },
    { name: 'Subscription Income', amount: 345000, prevAmount: 310500, budget: 330000 },
    { name: 'Other Revenue', amount: 35000, prevAmount: 31500, budget: 34000 }
  ];

  cogsData: FinancialItem[] = [
    { name: 'Cost of Products Sold', amount: -262500, prevAmount: -236250, budget: -250000 },
    { name: 'Direct Labor', amount: -235000, prevAmount: -211500, budget: -225000 },
    { name: 'Manufacturing Overhead', amount: -215000, prevAmount: -193500, budget: -205000 }
  ];

  operatingExpenses: FinancialItem[] = [
    { name: 'Office Supply', amount: -262500, prevAmount: -236250, budget: -250000 },
    { name: 'Professional Services', amount: -235000, prevAmount: -211500, budget: -250000 },
    { name: 'Insurance', amount: -215000, prevAmount: -193500, budget: -250000 }
  ];

  SalariesWages: FinancialItem[] = [
    { name: 'Salaries & Wages', amount: -157600, prevAmount: -141840, budget: -250000 },
    { name: 'Benefits', amount: -157600, prevAmount: -141840, budget: -250000 },
    { name: 'Payroll Taxes', amount: -157600, prevAmount: -141840, budget: -250000 },
    { name: 'Training & Development', amount: -157600, prevAmount: -141840, budget: -250000 }
  ];

  Maintenance: FinancialItem[] = [
    { name: 'Building Maintenance', amount: -16000, prevAmount: -14400, budget: -250000 },
    { name: 'Repairs', amount: -16000, prevAmount: -14400, budget: -250000 },
    { name: 'Equipment Maintenance', amount: -16000, prevAmount: -14400, budget: -250000 }
  ];

  LogisticsDistribution: FinancialItem[] = [
    { name: 'Shipping & Freight', amount: -19000, prevAmount: -17100, budget: -250000 },
    { name: 'Distribution Costs', amount: -19000, prevAmount: -17100, budget: -250000 },
    { name: 'Travel and Entertainment', amount: -19000, prevAmount: -17100, budget: -250000 }
  ];

  otherOperatingExpenses: FinancialItem[] = [
    { name: 'Rent', amount: -214200, prevAmount: -192780, budget: -250000 },
    { name: 'Marketing & Advertising', amount: -131800, prevAmount: -118620, budget: -250000 },
    { name: 'Utilities', amount: -131800, prevAmount: -118620, budget: -250000 },
    { name: 'Depreciation & Amortization', amount: -131800, prevAmount: -118620, budget: -250000 }
  ];

  otherItems: FinancialItem[] = [
    { name: 'Interest Income', amount: 11500, prevAmount: 10350, budget: 10000 },
    { name: 'Interest Expense', amount: -13200, prevAmount: -11880, budget: -12000 },
    { name: 'Gain on Sale of Assets', amount: 12800, prevAmount: 11520, budget: 10000 }
  ];

  taxExpense: FinancialItem = { name: 'Income Tax Expense', amount: -19350, prevAmount: -17415, budget: -18000 };

  // Monthly data for charts
  monthlyData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    revenue: [230000, 235000, 240000, 245000, 248000, 250000],
    expenses: [195000, 198000, 200000, 203000, 205000, 207500],
    profit: [35000, 37000, 40000, 42000, 43000, 42500]
  };

  // Chart options
  revenueChartOptions: RevenueChartOptions = {} as RevenueChartOptions;
  expenseChartOptions: ExpenseChartOptions = {} as ExpenseChartOptions;

  constructor() {
    this.initRevenueChart();
    this.initExpenseChart();
  }

  ngOnInit(): void {
    this.updateMetrics();
    this.updateCharts();
  }

  // Navigation functions
  previousMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.updateAllData();
  }

  nextMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.updateAllData();
  }

  updateAllData(): void {
    this.updateMetrics();
    this.updateCharts();
  }

  // Metric calculations
  get totalRevenue(): number {
    return this.revenueData.reduce((sum, item) => sum + item.amount, 0);
  }

  get totalPrevRevenue(): number {
    return this.revenueData.reduce((sum, item) => sum + item.prevAmount, 0);
  }

  get totalCOGS(): number {
    return this.cogsData.reduce((sum, item) => sum + item.amount, 0);
  }

  get totalPrevCOGS(): number {
    return this.cogsData.reduce((sum, item) => sum + item.prevAmount, 0);
  }

  get grossProfit(): number {
    return this.totalRevenue + this.totalCOGS;
  }

  get prevGrossProfit(): number {
    return this.totalPrevRevenue + this.totalPrevCOGS;
  }

  // Category-specific totals
  get totalAdministrativeExpenses(): number {
    return this.operatingExpenses.reduce((sum, item) => sum + item.amount, 0);
  }

  get totalSalariesWages(): number {
    return this.SalariesWages.reduce((sum, item) => sum + item.amount, 0);
  }

  get totalMaintenance(): number {
    return this.Maintenance.reduce((sum, item) => sum + item.amount, 0);
  }

  get totalLogisticsDistribution(): number {
    return this.LogisticsDistribution.reduce((sum, item) => sum + item.amount, 0);
  }

  get totalOtherOperatingExpenses(): number {
    return this.otherOperatingExpenses.reduce((sum, item) => sum + item.amount, 0);
  }

  // Previous period totals
  get totalPrevAdministrativeExpenses(): number {
    return this.operatingExpenses.reduce((sum, item) => sum + item.prevAmount, 0);
  }

  get totalPrevSalariesWages(): number {
    return this.SalariesWages.reduce((sum, item) => sum + item.prevAmount, 0);
  }

  get totalPrevMaintenance(): number {
    return this.Maintenance.reduce((sum, item) => sum + item.prevAmount, 0);
  }

  get totalPrevLogisticsDistribution(): number {
    return this.LogisticsDistribution.reduce((sum, item) => sum + item.prevAmount, 0);
  }

  get totalPrevOtherOperatingExpenses(): number {
    return this.otherOperatingExpenses.reduce((sum, item) => sum + item.prevAmount, 0);
  }

  // Combined operating expenses
  get totalOperatingExpenses(): number {
    return (
      this.totalAdministrativeExpenses +
      this.totalSalariesWages +
      this.totalMaintenance +
      this.totalLogisticsDistribution +
      this.totalOtherOperatingExpenses
    );
  }

  get totalPrevOperatingExpenses(): number {
    return (
      this.totalPrevAdministrativeExpenses +
      this.totalPrevSalariesWages +
      this.totalPrevMaintenance +
      this.totalPrevLogisticsDistribution +
      this.totalPrevOtherOperatingExpenses
    );
  }

  get operatingIncome(): number {
    return this.grossProfit + this.totalOperatingExpenses;
  }

  get totalOtherItems(): number {
    return this.otherItems.reduce((sum, item) => sum + item.amount, 0);
  }

  get netIncomeBeforeTax(): number {
    return this.operatingIncome + this.totalOtherItems;
  }

  get netIncome(): number {
    return this.netIncomeBeforeTax + this.taxExpense.amount;
  }

  // Budget calculations
  get totalBudgetRevenue(): number {
    return this.revenueData.reduce((sum, item) => sum + (item.budget || 0), 0);
  }

  get totalBudgetCOGS(): number {
    return this.cogsData.reduce((sum, item) => sum + (item.budget || 0), 0);
  }



  get budgetGrossProfit(): number {
    return this.totalBudgetRevenue + this.totalBudgetCOGS;
  }

  get totalBudgetOperatingExpenses(): number {
    return (
      this.operatingExpenses.reduce((sum, item) => sum + (item.budget || 0), 0) +
      this.SalariesWages.reduce((sum, item) => sum + (item.budget || 0), 0) +
      this.Maintenance.reduce((sum, item) => sum + (item.budget || 0), 0) +
      this.LogisticsDistribution.reduce((sum, item) => sum + (item.budget || 0), 0) +
      this.otherOperatingExpenses.reduce((sum, item) => sum + (item.budget || 0), 0)
    );
  }

  get budgetOperatingIncome(): number {
    return this.budgetGrossProfit + this.totalBudgetOperatingExpenses;
  }

  // Variance calculations
  get revenueVariance(): number {
    return this.totalRevenue - this.totalBudgetRevenue;
  }

  get cogsVariance(): number {
    return this.totalCOGS - this.totalBudgetCOGS;
  }

  get operatingExpensesVariance(): number {
    return this.totalOperatingExpenses - this.totalBudgetOperatingExpenses;
  }

  // Percentage calculations
  get grossProfitMargin(): number {
    return this.totalRevenue !== 0 ? (this.grossProfit / this.totalRevenue) * 100 : 0;
  }

  get operatingMargin(): number {
    return this.totalRevenue !== 0 ? (this.operatingIncome / this.totalRevenue) * 100 : 0;
  }

  get netProfitMargin(): number {
    return this.totalRevenue !== 0 ? (this.netIncome / this.totalRevenue) * 100 : 0;
  }

  get revenueGrowth(): number {
    return this.totalPrevRevenue !== 0 ? 
      ((this.totalRevenue - this.totalPrevRevenue) / this.totalPrevRevenue) * 100 : 0;
  }

  get cogsGrowth(): number {
    return this.totalPrevCOGS !== 0 ? 
      ((this.totalCOGS - this.totalPrevCOGS) / Math.abs(this.totalPrevCOGS)) * 100 : 0;
  }

  get grossProfitGrowth(): number {
    return this.prevGrossProfit !== 0 ? 
      ((this.grossProfit - this.prevGrossProfit) / this.prevGrossProfit) * 100 : 0;
  }

  get operatingExpensesGrowth(): number {
    return this.totalPrevOperatingExpenses !== 0 ? 
      ((this.totalOperatingExpenses - this.totalPrevOperatingExpenses) / 
       Math.abs(this.totalPrevOperatingExpenses)) * 100 : 0;
  }

  // Chart initialization
  initRevenueChart(): void {
    this.revenueChartOptions = {
      series: [
        {
          name: "Revenue",
          data: this.monthlyData.revenue
        },
        {
          name: "Expenses",
          data: this.monthlyData.expenses
        },
        {
          name: "Profit",
          data: this.monthlyData.profit
        }
      ],
      chart: {
        height: 350,
        type: "histogram",
        toolbar: {
          show: false
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: "smooth",
        width: 2
      },
      xaxis: {
        categories: this.monthlyData.labels
      },
      tooltip: {
        x: {
          format: "MMM yyyy"
        }
      },
      legend: {
        position: "top"
      },
      title: {
        text: "Revenue & Expenses Trend",
        align: "left"
      }
    };
  }

  initExpenseChart(): void {
    this.expenseChartOptions = {
      series: [{
        name: 'Expenses',
        data: [
          Math.abs(this.totalAdministrativeExpenses),
          Math.abs(this.totalSalariesWages),
          Math.abs(this.totalMaintenance),
          Math.abs(this.totalLogisticsDistribution),
          Math.abs(this.totalOtherOperatingExpenses)
        ]
      }],
      chart: {
        type: "donut",
        height: 350
      },
      labels: [
        'Administrative',
        'Salaries & Wages',
        'Maintenance',
        'Logistics & Distribution',
        'Other Operating Expenses'
      ],
      plotOptions: {
        pie: {
          donut: {
            size: "65%"
          }
        }
      },
      fill: {
        type: "gradient"
      },
      legend: {
        position: "bottom"
      },
      title: {
        text: "Expense Distribution",
        align: "left"
      }
    };
  }

  // Update charts with current data
  updateCharts(): void {
    this.revenueChartOptions.series = [
      {
        name: "Revenue",
        data: this.monthlyData.revenue
      },
      {
        name: "Expenses",
        data: this.monthlyData.expenses
      },
      {
        name: "Profit",
        data: this.monthlyData.profit
      }
    ];

    this.expenseChartOptions.series = [{
      name: 'Expenses',
      data: [
        Math.abs(this.totalAdministrativeExpenses),
        Math.abs(this.totalSalariesWages),
        Math.abs(this.totalMaintenance),
        Math.abs(this.totalLogisticsDistribution),
        Math.abs(this.totalOtherOperatingExpenses)
      ]
    }];
  }

  // Update metrics cards
  updateMetrics(): void {

  }

  // Modal functions
  openFilterModal(): void {
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
  }

  toggleCommentsModal(): void {
    this.showCommentsModal = !this.showCommentsModal;
  }

  toggleShareModal(): void {
    this.showShareModal = !this.showShareModal;
  }

  toggleArchivesModal(): void {
    this.showArchivesModal = !this.showArchivesModal;
  }

  applyFilters(): void {
    this.closeFilterModal();
    this.updateAllData();
  }

  // Save and export functions
  saveStatement(): void {
    this.isSaved = true;
    const statementData = {
      period: this.period,
      reportType: this.reportType,
      entity: this.entity,
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
    alert('Income Statement saved successfully!');
  }

  addComment(text: string): void {
    const newComment: Comment = {
      id: this.comments.length + 1,
      author: 'Current User',
      text,
      timestamp: new Date().toISOString()
    };
    this.comments = [...this.comments, newComment];
  }

  async exportToPDF(): Promise<void> {
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
  }

  exportToCSV(): void {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Income Statement - ${this.getFormattedDate()}\n\n`;
    
    // Add Revenue section
    csvContent += 'Revenue\n';
    csvContent += 'Item,Amount,Budget,Variance\n';
    this.revenueData.forEach(item => {
      const budget = item.budget || 0;
      const variance = item.amount - budget;
      csvContent += `${item.name},${item.amount},${budget},${variance}\n`;
    });
    csvContent += `Total Revenue,${this.totalRevenue},${this.totalBudgetRevenue},${this.revenueVariance}\n\n`;
    
    //  COGS section
    csvContent += 'Cost of Goods Sold\n';
    csvContent += 'Item,Amount,Budget,Variance\n';
    this.cogsData.forEach(item => {
      const budget = item.budget || 0;
      const variance = item.amount - budget;
      csvContent += `${item.name},${item.amount},${budget},${variance}\n`;
    });
    csvContent += `Total COGS,${this.totalCOGS},${this.totalBudgetCOGS},${this.cogsVariance}\n\n`;
    
    // Operating Expenses section
    csvContent += 'Operating Expenses\n';
    csvContent += 'Category,Amount,Budget,Variance\n';
    csvContent += `Administrative,${this.totalAdministrativeExpenses},${this.operatingExpenses.reduce((sum, item) => sum + (item.budget || 0), 0)},${this.totalAdministrativeExpenses - this.operatingExpenses.reduce((sum, item) => sum + (item.budget || 0), 0)}\n`;
    csvContent += `Salaries & Wages,${this.totalSalariesWages},${this.SalariesWages.reduce((sum, item) => sum + (item.budget || 0), 0)},${this.totalSalariesWages - this.SalariesWages.reduce((sum, item) => sum + (item.budget || 0), 0)}\n`;
    csvContent += `Maintenance,${this.totalMaintenance},${this.Maintenance.reduce((sum, item) => sum + (item.budget || 0), 0)},${this.totalMaintenance - this.Maintenance.reduce((sum, item) => sum + (item.budget || 0), 0)}\n`;
    csvContent += `Logistics & Distribution,${this.totalLogisticsDistribution},${this.LogisticsDistribution.reduce((sum, item) => sum + (item.budget || 0), 0)},${this.totalLogisticsDistribution - this.LogisticsDistribution.reduce((sum, item) => sum + (item.budget || 0), 0)}\n`;
    csvContent += `Other Operating Expenses,${this.totalOtherOperatingExpenses},${this.otherOperatingExpenses.reduce((sum, item) => sum + (item.budget || 0), 0)},${this.totalOtherOperatingExpenses - this.otherOperatingExpenses.reduce((sum, item) => sum + (item.budget || 0), 0)}\n`;
    csvContent += `Total Operating Expenses,${this.totalOperatingExpenses},${this.totalBudgetOperatingExpenses},${this.operatingExpensesVariance}\n\n`;
    
    // Summary section
    csvContent += 'Summary\n';
    csvContent += `Gross Profit,${this.grossProfit}\n`;
    csvContent += `Operating Income,${this.operatingIncome}\n`;
    csvContent += `Net Income Before Tax,${this.netIncomeBeforeTax}\n`;
    csvContent += `Net Income,${this.netIncome}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Income_Statement_${this.getFormattedDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Print function
  printPage(): void {
    window.print();
  }

  // Helper functions
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

  // Generate insights based on current data
  get insights(): any[] {
    return [
      {
        title: `Revenue ${this.revenueGrowth >= 0 ? 'increased' : 'decreased'}`,
        description: `Revenue ${this.revenueGrowth >= 0 ? 'grew' : 'declined'} by ${this.formatPercentage(Math.abs(this.revenueGrowth))} compared to previous period`,
        trend: this.revenueGrowth >= 0 ? 'positive' : 'negative'
      },
      {
        title: `Gross profit margin ${this.grossProfitMargin >= (this.prevGrossProfit / this.totalPrevRevenue * 100) ? 'improved' : 'declined'}`,
        description: `Gross profit margin is ${this.grossProfitMargin.toFixed(1)}%, ${this.grossProfitMargin >= (this.prevGrossProfit / this.totalPrevRevenue * 100) ? 'up' : 'down'} from previous period`,
        trend: this.grossProfitMargin >= (this.prevGrossProfit / this.totalPrevRevenue * 100) ? 'positive' : 'negative'
      },
      {
        title: `Operating expenses ${this.operatingExpensesGrowth <= 0 ? 'decreased' : 'increased'}`,
        description: `Operating expenses ${this.operatingExpensesGrowth <= 0 ? 'decreased' : 'increased'} by ${this.formatPercentage(Math.abs(this.operatingExpensesGrowth))}`,
        trend: this.operatingExpensesGrowth <= 0 ? 'positive' : 'negative'
      },
      {
        title: `Revenue ${this.revenueVariance >= 0 ? 'exceeded' : 'fell short of'} budget`,
        description: `Revenue is ${this.formatCurrency(Math.abs(this.revenueVariance))} ${this.revenueVariance >= 0 ? 'above' : 'below'} budget`,
        trend: this.revenueVariance >= 0 ? 'positive' : 'negative'
      }
    ];
  }
}