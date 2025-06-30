import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

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



@Component({
  selector: 'app-income-statement',
  templateUrl: './income-statement.component.html',
  styleUrl: './income-statement.component.scss'
})


export class IncomeStatementComponent implements OnInit {
  currentDate: Date = new Date(2023, 4, 1); // May 2023 as default
  showFilterModal: boolean = false;
  reportType: string = 'Actual';
  entity: string = 'All Locations';
  period: string = 'This Month';
  showPercentages: boolean = false;
  showVariance: boolean = false;
  includeForecasts: boolean = false;
  Math = Math;

  // Dummy data for the balance sheet
  revenueData = [
    { name: 'Product Sales', amount: 3125000, prevAmount: 2812500 },
    { name: 'Service Revenue', amount: 375000, prevAmount: 337500 },
    { name: 'Subscription Income', amount: 345000, prevAmount: 310500 },
    { name: 'Other Revenue', amount: 35000, prevAmount: 31500 }
  ];

  cogsData = [
    { name: 'Cost of Products Sold', amount: -262500, prevAmount: -236250 },
    { name: 'Direct Labor', amount: -235000, prevAmount: -211500 },
    { name: 'Manufacturing Overhead', amount: -215000, prevAmount: -193500 }
  ];

  operatingExpenses = [
    { category: 'Administrative', amount: -214200, prevAmount: -192780 },
    { category: 'Salaries & Wages', amount: -157600, prevAmount: -141840 },
    { category: 'Maintenance', amount: -16000, prevAmount: -14400 },
    { category: 'Logistics/Distribution', amount: -19000, prevAmount: -17100 },
    { category: 'Other', amount: -131800, prevAmount: -118620 }
  ];

  otherItems = [
    { name: 'Interest Income', amount: 11500, prevAmount: 10350 },
    { name: 'Interest Expense', amount: -13200, prevAmount: -11880 },
    { name: 'Gain on Sale of Assets', amount: 12800, prevAmount: 11520 }
  ];

  taxExpense = { name: 'Income Tax Expense', amount: -19350, prevAmount: -17415 };

  // Chart options
  revenueChartOptions: RevenueChartOptions = {} as RevenueChartOptions;
  expenseChartOptions: ExpenseChartOptions = {} as ExpenseChartOptions;


  constructor() {
    // Initialize charts
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
    // In a real app, you would fetch new data based on the selected month
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

  get totalOperatingExpenses(): number {
    return this.operatingExpenses.reduce((sum, item) => sum + item.amount, 0);
  }

  get totalPrevOperatingExpenses(): number {
    return this.operatingExpenses.reduce((sum, item) => sum + item.prevAmount, 0);
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

  // Percentage calculations
  get grossProfitMargin(): number {
    return (this.grossProfit / this.totalRevenue) * 100;
  }

  get operatingMargin(): number {
    return (this.operatingIncome / this.totalRevenue) * 100;
  }

  get netProfitMargin(): number {
    return (this.netIncome / this.totalRevenue) * 100;
  }

  get revenueGrowth(): number {
    return ((this.totalRevenue - this.totalPrevRevenue) / this.totalPrevRevenue) * 100;
  }

  get cogsGrowth(): number {
    return ((this.totalCOGS - this.totalPrevCOGS) / Math.abs(this.totalPrevCOGS)) * 100;
  }

  get grossProfitGrowth(): number {
    return ((this.grossProfit - this.prevGrossProfit) / this.prevGrossProfit) * 100;
  }

  get operatingExpensesGrowth(): number {
    return ((this.totalOperatingExpenses - this.totalPrevOperatingExpenses) / Math.abs(this.totalPrevOperatingExpenses)) * 100;
  }

  // Update metrics cards
  updateMetrics(): void {
    
  }

  // Chart initialization
  initRevenueChart(): void {
    this.revenueChartOptions = {
      series: [
        {
          name: "Revenue",
          data: []
        },
        {
          name: "Profit",
          data: []
        }
      ],
      chart: {
        height: 350,
        type: "area",
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
        categories: []
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
        text: "Revenue & Profit Trend",
        align: "left"
      }
    };
  }

  initExpenseChart(): void {
    this.expenseChartOptions = {
      series: [],
      chart: {
        type: "donut",
        height: 350
      },
      labels: [],
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
    // Generate monthly data for the selected year
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = this.currentDate.getFullYear();
    
    // Revenue chart data
    this.revenueChartOptions.series = [
      {
        name: "Revenue",
        data: months.map((_, i) => {
          // Simulate some variation in revenue
          const base = 2500000;
          const variation = Math.sin(i * 0.5) * 500000;
          return base + variation;
        })
      },
      {
        name: "Profit",
        data: months.map((_, i) => {
          // Simulate some variation in profit
          const base = 500000;
          const variation = Math.sin(i * 0.5 + 1) * 100000;
          return base + variation;
        })
      }
    ];
    
    this.revenueChartOptions.xaxis = {
      categories: months.map((m, i) => `${m} ${currentYear}`)
    };

    // Expense chart data
   this.expenseChartOptions.series = [
  {
    name: 'Expenses',
    data: this.operatingExpenses.map(e => Math.abs(e.amount))
  }
];

    this.expenseChartOptions.labels = this.operatingExpenses.map(e => e.category);
  }

  // Filter modal functions
  openFilterModal(): void {
    this.showFilterModal = true;
  }

  closeFilterModal(): void {
    this.showFilterModal = false;
  }

  applyFilters(): void {
    // In a real app, this would apply the selected filters and refresh data
    this.closeFilterModal();
    this.updateAllData();
  }

  // Print function
  printPage(): void {
    window.print();
  }

  // Export to Excel
  exportToExcel(): void {
    // Prepare data for export
    const data = [
      ['Income Statement', '', '', ''],
      ['', 'Current Period', 'Previous Period', 'Change'],
      ...this.revenueData.map(item => [
        item.name,
        this.formatCurrency(item.amount),
        this.formatCurrency(item.prevAmount),
        this.formatPercentage((item.amount - item.prevAmount) / item.prevAmount)
      ]),
      ['Total Revenue', this.formatCurrency(this.totalRevenue), this.formatCurrency(this.totalPrevRevenue), this.formatPercentage(this.revenueGrowth)],
      ['', '', '', ''],
      ...this.cogsData.map(item => [
        item.name,
        this.formatCurrency(item.amount),
        this.formatCurrency(item.prevAmount),
        this.formatPercentage((item.amount - item.prevAmount) / Math.abs(item.prevAmount))
      ]),
      ['Total COGS', this.formatCurrency(this.totalCOGS), this.formatCurrency(this.totalPrevCOGS), this.formatPercentage(this.cogsGrowth)],
      ['Gross Profit', this.formatCurrency(this.grossProfit), this.formatCurrency(this.prevGrossProfit), this.formatPercentage(this.grossProfitGrowth)],
      ['', '', '', ''],
      ...this.operatingExpenses.map(item => [
        item.category,
        this.formatCurrency(item.amount),
        this.formatCurrency(item.prevAmount),
        this.formatPercentage((item.amount - item.prevAmount) / Math.abs(item.prevAmount))
      ]),
      ['Total Operating Expenses', this.formatCurrency(this.totalOperatingExpenses), this.formatCurrency(this.totalPrevOperatingExpenses), this.formatPercentage(this.operatingExpensesGrowth)],
      ['Operating Income', this.formatCurrency(this.operatingIncome), '', ''],
      ['', '', '', ''],
      ...this.otherItems.map(item => [
        item.name,
        this.formatCurrency(item.amount),
        this.formatCurrency(item.prevAmount),
        this.formatPercentage((item.amount - item.prevAmount) / (item.prevAmount || 1))
      ]),
      ['Total Other Items', this.formatCurrency(this.totalOtherItems), '', ''],
      ['Net Income Before Tax', this.formatCurrency(this.netIncomeBeforeTax), '', ''],
      ['Income Tax Expense', this.formatCurrency(this.taxExpense.amount), this.formatCurrency(this.taxExpense.prevAmount), ''],
      ['Net Profit After Tax', this.formatCurrency(this.netIncome), '', this.formatPercentage(this.netProfitMargin)]
    ];

    // // Create workbook
    // const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(data);
    // const wb: XLSX.WorkBook = XLSX.utils.book_new();
    // XLSX.utils.book_append_sheet(wb, ws, 'Income Statement');

    // // Generate and download file
    // XLSX.writeFile(wb, `Income_Statement_${this.getFormattedDate()}.xlsx`);
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
      }
    ];
  }
}