import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject, combineLatest, Observable } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import {
  ApexNonAxisChartSeries, ApexResponsive, ApexChart, ApexLegend,
  ApexDataLabels, ApexFill, ApexTooltip, ApexAxisChartSeries,
  ApexXAxis, ApexYAxis, ApexPlotOptions, ApexStroke, ApexMarkers
} from 'ng-apexcharts';

import {
  AccountingService,
  DashboardMetrics,
  IncomeStatementData,
  BalanceSheetData,
  CashFlowData,
  TaxSummaryData,
  FinancialLineItem
} from '../../../core/services/accounting.service';
import { AccountingFormatService } from '../../../core/services/accounting-format.service';

// ── Chart Options Interfaces
export type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  fill: ApexFill;
  tooltip: ApexTooltip;
  responsive: ApexResponsive[];
  plotOptions?: ApexPlotOptions;
};

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  fill: ApexFill;
  plotOptions?: ApexPlotOptions;
  responsive?: ApexResponsive[];
  colors?: string[];
  grid?: any;
};

export type LineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  markers: ApexMarkers;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  fill: ApexFill;
  colors?: string[];
  responsive?: ApexResponsive[];
};

// UI Interfaces
interface BreakdownItem {
  label: string;
  amount: number;
  source: string;
  type: 'add' | 'subtract' | 'equals';
}

interface SummaryCardData {
  title: string;
  value: number;
  change: number;
  definition: string;
  formula: string;
  breakdown: BreakdownItem[];
  sourceTab: 'income' | 'balance' | 'cashflow' | 'tax';
  accentVar: string;
}

interface StatementPreviewRow {
  label: string;
  amount?: number;  // ← made optional for text-only rows
  isTotal?: boolean;
  indent?: boolean;
}

interface StatementPreviewSection {
  heading: string;
  rows: StatementPreviewRow[];
}

interface StatementPreviewData {
  title: string;
  description: string;
  sections: StatementPreviewSection[];
  sourceTab?: string;
}

interface Report {
  title: string;
  description: string;
  updated: string;
  status: 'Published' | 'Draft';
  icon: string;
  canAutoGenerate?: boolean;
  data?: any;
}

interface GeneratedReport {
  id: number;
  name: string;
  date: string;
  generatedBy: string;
  type: string;
  status: 'Pending' | 'Completed' | 'Failed';
  data?: any;
}

@Component({
  selector: 'app-accounting-reports',
  templateUrl: './accounting-reports.component.html',
  styleUrls: ['./accounting-reports.component.scss'],
  animations: [
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(40px)' }),
        animate('250ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(.4,0,.2,1)', style({ opacity: 0, transform: 'translateY(40px)' }))
      ])
    ])
  ]
})
export class AccountingReportsComponent implements OnInit, OnDestroy {
  // UI State 
  reportType = '';
  dateRange = '';
  fromDate = '';
  toDate = '';
  generatedBy = 'Admin';
  newReportModalOpen = false;
  modalExpanded = false;
  reportsPerPage = 7;
  currentReportPage = 1;
  today = new Date().toISOString().split('T')[0];

  // Modal State 
  selectedCard: SummaryCardData | null = null;
  cardModalOpen = false;
  selectedStatement: StatementPreviewData | null = null;
  statementModalOpen = false;
  modalOpen = false;
  selectedReport: GeneratedReport | null = null;

  // Data from Service 
  metrics: DashboardMetrics | null = null;
  incomeStatement: IncomeStatementData | null = null;
  balanceSheet: BalanceSheetData | null = null;
  cashFlow: CashFlowData | null = null;
  taxSummary: TaxSummaryData | null = null;

  // UI Data Structures 
  summaryCards: SummaryCardData[] = [];
  allReports: Report[] = [];
  filteredReports: Report[] = [];
  generatedReports: GeneratedReport[] = [];
  savedReportsList = [
    {
      title: 'Q2 Financial Statement',
      date: 'Jun 01, 2025',
      icon: 'ri-file-chart-2-line',
      iconBg: 'bg-blue-light',
      iconColor: 'text-blue-dark'
    },
    {
      title: 'Monthly Balance Sheet',
      date: 'May 31, 2025',
      icon: 'ri-file-list-3-line',
      iconBg: 'bg-green-light',
      iconColor: 'text-green-dark'
    },
    {
      title: 'Annual Tax Report',
      date: 'Jan 15, 2025',
      icon: 'ri-government-line',
      iconBg: 'bg-purple-light',
      iconColor: 'text-purple-dark'
    },
  ];

  //─ Comparative Analysis
  periodModalOpen = false;
  availablePeriods = ['2025', '2024', '2023', '2022'];
  selectedPeriod1 = '2025';
  selectedPeriod2 = '2024';
  comparativeData: { [period: string]: { [metric: string]: number } } = {};

  //─ Chart Options───────
  donutChartOptions!: DonutChartOptions;
  barChartOptions!: BarChartOptions;
  lineChartOptions!: LineChartOptions;

  private destroy$ = new Subject<void>();

  constructor(
    private accountingService: AccountingService,
    readonly fmt: AccountingFormatService
  ) {}

  ngOnInit(): void {
    // Subscribe to all data streams
    combineLatest([
      this.accountingService.getDashboardMetrics(),
      this.accountingService.getIncomeStatement(),
      this.accountingService.getBalanceSheet(),
      this.accountingService.getCashFlow(),
      this.accountingService.getTaxSummary()
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([metrics, is, bs, cf, tax]) => {
        this.metrics = metrics;
        this.incomeStatement = is;
        this.balanceSheet = bs;
        this.cashFlow = cf;
        this.taxSummary = tax;

        this.buildSummaryCards(metrics, is, bs, cf);
        this.buildComparativeData(is, bs, cf);
        this.buildCharts(is, cf);
      });

    this.buildStatementList();
    this.buildStatementPreviews();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isTextOnlyRow(row: StatementPreviewRow): boolean {
    return row.amount === undefined || row.amount === null;
  }

  //─ Summary Card Builder
  private buildSummaryCards(
    m: DashboardMetrics,
    is: IncomeStatementData,
    bs: BalanceSheetData,
    cf: CashFlowData
  ): void {
    this.summaryCards = [
      {
        title: 'Total Revenue',
        value: m.totalRevenue,
        change: m.revenueGrowth,
        definition: 'Total income generated from all business activities including product sales, services, and subscriptions.',
        formula: 'Product Sales + Service Revenue + Subscription Income + Other Revenue',
        accentVar: '--card-revenue',
        sourceTab: 'income',
        breakdown: [
          ...is.revenue.map(i => ({
            label: i.name,
            amount: i.amount,
            source: 'Income Statement',
            type: 'add' as const
          })),
          { label: 'Total Revenue', amount: m.totalRevenue, source: 'Income Statement', type: 'equals' }
        ]
      },
      {
        title: 'Total Assets',
        value: m.totalAssets,
        change: 0, // Would need previous period data
        definition: 'Total resources owned or controlled by the company that are expected to generate future economic benefits.',
        formula: 'Current Assets + Non-Current Assets',
        accentVar: '--card-asset',
        sourceTab: 'balance',
        breakdown: [
          { label: 'Current Assets', amount: bs.assets.current.total, source: 'Balance Sheet', type: 'add' },
          { label: 'Non-Current Assets', amount: bs.assets.nonCurrent.total, source: 'Balance Sheet', type: 'add' },
          { label: 'Total Assets', amount: m.totalAssets, source: 'Balance Sheet', type: 'equals' }
        ]
      },
      {
        title: 'Gross Profit',
        value: m.grossProfit,
        change: is.ratios.grossProfitGrowth,
        definition: 'Revenue minus direct costs of delivering goods and services (Cost of Goods Sold).',
        formula: 'Revenue − Cost of Goods Sold',
        accentVar: '--card-profit',
        sourceTab: 'income',
        breakdown: [
          { label: 'Total Revenue', amount: m.totalRevenue, source: 'Income Statement', type: 'add' },
          { label: 'Cost of Goods Sold', amount: is.totals.cogs.actual, source: 'Income Statement', type: 'subtract' },
          { label: 'Gross Profit', amount: m.grossProfit, source: 'Income Statement', type: 'equals' }
        ]
      },
      {
        title: 'Net Income',
        value: m.netIncome,
        change: 0, // Would need previous period
        definition: 'Bottom-line profit after all expenses, other income/costs, and Nigerian income taxes.',
        formula: 'NIBT − (CIT + Education Tax + NASENI)',
        accentVar: '--card-profit',
        sourceTab: 'income',
        breakdown: [
          { label: 'NIBT (Profit Before Tax)', amount: is.totals.nibt.actual, source: 'Income Statement', type: 'add' },
          { label: 'Company Income Tax', amount: is.totals.cit.actual, source: 'Tax Summary', type: 'subtract' },
          { label: 'Education Tax', amount: is.totals.educationTax.actual, source: 'Tax Summary', type: 'subtract' },
          { label: 'NASENI Levy', amount: is.totals.naseniLevy.actual, source: 'Tax Summary', type: 'subtract' },
          { label: 'Net Income', amount: m.netIncome, source: 'Income Statement', type: 'equals' }
        ]
      },
      {
        title: 'Accounts Receivable',
        value: m.accountsReceivable,
        change: -3.8, // Would need previous period
        definition: 'Net amounts owed by customers for goods or services delivered but not yet paid.',
        formula: 'Outstanding Customer Invoices − Allowance for Doubtful Accounts',
        accentVar: '--card-receivable',
        sourceTab: 'balance',
        breakdown: [
          { label: 'Accounts Receivable (Net)', amount: m.accountsReceivable, source: 'Balance Sheet', type: 'equals' }
        ]
      },
      {
        title: 'Operating Cash Flow',
        value: m.operatingCashFlow,
        change: 7.1, // Would need previous period
        definition: 'Cash generated from core business operations.',
        formula: 'Cash receipts from customers − Cash payments to suppliers & employees − Tax payments',
        accentVar: '--card-cashflow',
        sourceTab: 'cashflow',
        breakdown: [
          { label: 'Operating Cash Flow', amount: m.operatingCashFlow, source: 'Cash Flow Statement', type: 'equals' }
        ]
      }
    ];
  }

  //─ Comparative Data Builder───────────────────────────────────────────
  private buildComparativeData(
    is: IncomeStatementData,
    bs: BalanceSheetData,
    cf: CashFlowData
  ): void {
    // Build comparative data for current period
    this.comparativeData['2025'] = {
      'Total Revenue': is.totals.revenue.actual / 1000000, // In millions for display
      'Gross Profit': is.totals.grossProfit.actual / 1000000,
      'Net Income': is.totals.netIncome.actual / 1000000,
      'Total Assets': bs.assets.total / 1000000,
      'Operating Cash Flow': cf.summaryTotals.operatingCashFlow / 1000000,
      'Working Capital': bs.analytics.workingCapital / 1000000
    };

    // For previous periods, we would need actual historical data
    // Using scaled-down versions for demonstration
    this.comparativeData['2024'] = {
      'Total Revenue': (is.totals.revenue.prev / 1000000) || 78,
      'Gross Profit': (is.totals.grossProfit.prev / 1000000) || 42,
      'Net Income': (is.totals.netIncome.prev / 1000000) || 28,
      'Total Assets': 485, // Mock data - would come from historical BS
      'Operating Cash Flow': 52,
      'Working Capital': 185
    };
  }

  //─ Chart Builders──────
  private buildCharts(is: IncomeStatementData, cf: CashFlowData): void {
    this.buildDonutChart(is);
    this.buildBarChart();
    this.buildLineChart(is);
  }

  private buildDonutChart(is: IncomeStatementData): void {
    const expenseData = [
      { category: 'Administrative', value: Math.abs(is.totals.adminExpenses.actual) / 1000000 },
      { category: 'Salaries & Wages', value: Math.abs(is.totals.salariesWages.actual) / 1000000 },
      { category: 'Maintenance', value: Math.abs(is.totals.maintenance.actual) / 1000000 },
      { category: 'Logistics', value: Math.abs(is.totals.logistics.actual) / 1000000 },
      { category: 'Other OpEx', value: Math.abs(is.totals.otherOpEx.actual) / 1000000 }
    ];

    const total = expenseData.reduce((s, i) => s + i.value, 0);

    this.donutChartOptions = {
      series: expenseData.map(i => i.value),
      chart: { type: 'donut', width: '100%', height: 350 },
      labels: expenseData.map(i => i.category),
      legend: {
        position: 'bottom',
        fontSize: '14px',
        markers: { width: 12, height: 12, radius: 6 }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: any) => (+val).toFixed(1) + '%'
      },
      fill: { type: 'solid' },
      tooltip: {
        y: {
          formatter: (val: number) => `₦${(val * 1000000).toLocaleString()} (${((val / total) * 100).toFixed(1)}%)`
        }
      },
      responsive: [
        { breakpoint: 480, options: { chart: { width: 300 }, legend: { position: 'bottom' } } }
      ],
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                formatter: () => `₦${(total * 1000000).toLocaleString()}`
              }
            }
          }
        }
      }
    };
  }

  private buildBarChart(): void {
    const currentData = this.comparativeData[this.selectedPeriod1] || {};
    const previousData = this.comparativeData[this.selectedPeriod2] || {};

    this.barChartOptions = {
      series: [
        { name: this.selectedPeriod1, data: Object.values(currentData) },
        { name: this.selectedPeriod2, data: Object.values(previousData).map(v => -v) }
      ],
      chart: { type: 'bar', height: 400, toolbar: { show: false } },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '80%',
          borderRadius: 4
        }
      },
      colors: ['#2471A3', '#F39C12'],
      dataLabels: {
        enabled: true,
        formatter: (val: any) => Math.abs(+val).toFixed(1) + 'M',
        style: { fontSize: '12px' }
      },
      xaxis: {
        categories: Object.keys(currentData),
        labels: {
          formatter: (val: any) => Math.abs(+val).toFixed(1) + 'M'
        },
        min: -100,
        max: 100
      },
      yaxis: {
        labels: { formatter: (val: any) => String(val) }
      },
      tooltip: {
        custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
          const metric = w.config.xaxis.categories[dataPointIndex];
          const period = seriesIndex === 0 ? this.selectedPeriod1 : this.selectedPeriod2;
          const value = Math.abs(series[seriesIndex][dataPointIndex]);
          return `<div class="p-2">
            <div class="font-bold">${metric}</div>
            <div>${period}: ₦${(value * 1000000).toLocaleString()}</div>
          </div>`;
        }
      },
      legend: { position: 'top', horizontalAlign: 'center' },
      fill: { type: 'solid' },
      grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: false } } }
    };
  }

  private buildLineChart(is: IncomeStatementData): void {
    this.lineChartOptions = {
      series: [
        { name: 'Revenue', data: is.monthlyTrend.revenue.map(v => v / 1000) },
        { name: 'Expenses', data: is.monthlyTrend.expenses.map(v => v / 1000) },
        { name: 'Profit', data: is.monthlyTrend.profit.map(v => v / 1000) }
      ],
      chart: { type: 'line', height: 350, toolbar: { show: false } },
      colors: ['#4F8CFF', '#FF6B6B', '#6FE7C1'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      markers: {
        size: 5,
        colors: ['#fff'],
        strokeColors: ['#4F8CFF', '#FF6B6B', '#6FE7C1'],
        strokeWidth: 3
      },
      xaxis: {
        categories: is.monthlyTrend.labels,
        labels: { style: { fontSize: '12px' } }
      },
      yaxis: {
        labels: {
          formatter: (v: number) => `₦${v}K`
        }
      },
      tooltip: {
        shared: true,
        y: {
          formatter: (v: number) => `₦${(v * 1000).toLocaleString()}`
        }
      },
      legend: { position: 'bottom' },
      fill: { type: 'solid' }
    };
  }

  //─ Statement List Builder─────────────────────────────────────────────
  private buildStatementList(): void {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    this.allReports = [
      {
        title: 'Income Statement',
        description: 'Revenue, expenses, and profit for the period.',
        updated: formattedDate,
        status: 'Published',
        icon: 'income',
        canAutoGenerate: true
      },
      {
        title: 'Balance Sheet',
        description: 'Assets, liabilities, and equity position.',
        updated: formattedDate,
        status: 'Published',
        icon: 'balance',
        canAutoGenerate: true
      },
      {
        title: 'Cash Flow Statement',
        description: 'Operating, investing, and financing cash flows.',
        updated: formattedDate,
        status: 'Published',
        icon: 'cashflow',
        canAutoGenerate: true
      },
      {
        title: 'Tax Summary',
        description: 'VAT, WHT, CIT, and other tax obligations.',
        updated: formattedDate,
        status: 'Published',
        icon: 'tax',
        canAutoGenerate: true
      },
      {
        title: 'Trial Balance',
        description: 'All ledger account balances before adjustments.',
        updated: formattedDate,
        status: 'Draft',
        icon: 'balance',
        canAutoGenerate: true
      },
      {
        title: 'General Ledger',
        description: 'All transactions grouped by account.',
        updated: formattedDate,
        status: 'Draft',
        icon: 'cashflow',
        canAutoGenerate: true
      },
      {
        title: 'Notes to the Accounts',
        description: 'Additional information and disclosures.',
        updated: formattedDate,
        status: 'Draft',
        icon: 'notes',
        canAutoGenerate: false
      }
    ];

    this.filteredReports = [...this.allReports];
  }

  // ─── Statement Previews Builder ───────────────────────────────────────────
  private buildStatementPreviews(): void {
    // These will be populated with real data when the modal is opened
    // The actual data comes from the service subscriptions
  }

  // ─── Preview Handlers────
  previewStatement(report: Report): void {
    if (!this.incomeStatement || !this.balanceSheet || !this.cashFlow || !this.taxSummary) {
      return;
    }

    let preview: StatementPreviewData | null = null;

    switch (report.title) {
      case 'Income Statement':
        preview = this.buildIncomeStatementPreview();
        break;
      case 'Balance Sheet':
        preview = this.buildBalanceSheetPreview();
        break;
      case 'Cash Flow Statement':
        preview = this.buildCashFlowPreview();
        break;
      case 'Tax Summary':
        preview = this.buildTaxSummaryPreview();
        break;
      case 'Trial Balance':
        preview = this.buildTrialBalancePreview();
        break;
      case 'General Ledger':
        preview = this.buildGeneralLedgerPreview();
        break;
      case 'Notes to the Accounts':
        preview = this.buildNotesPreview();
        break;
      default:
        // Fallback to generated report modal
        this.openGeneratedReport(report);
        return;
    }

    if (preview) {
      this.selectedStatement = preview;
      this.statementModalOpen = true;
    }
  }

  private buildIncomeStatementPreview(): StatementPreviewData {
    const is = this.incomeStatement!;
    return {
      title: 'Income Statement',
      description: 'Financial performance for the period ending ' + is.period.toLocaleDateString(),
      sections: [
        {
          heading: 'Revenue',
          rows: [
            ...is.revenue.map(i => ({ label: i.name, amount: i.amount })),
            { label: 'Total Revenue', amount: is.totals.revenue.actual, isTotal: true }
          ]
        },
        {
          heading: 'Cost of Goods Sold',
          rows: [
            ...is.cogs.map(i => ({ label: i.name, amount: i.amount })),
            { label: 'Total COGS', amount: is.totals.cogs.actual, isTotal: true }
          ]
        },
        {
          heading: 'Gross Profit',
          rows: [
            { label: 'Gross Profit', amount: is.totals.grossProfit.actual, isTotal: true }
          ]
        },
        {
          heading: 'Operating Expenses',
          rows: [
            ...is.administrativeExpenses.map(i => ({ label: i.name, amount: i.amount, indent: true })),
            { label: 'Subtotal - Admin', amount: is.totals.adminExpenses.actual, isTotal: true },
            ...is.salariesWages.map(i => ({ label: i.name, amount: i.amount, indent: true })),
            { label: 'Subtotal - Salaries', amount: is.totals.salariesWages.actual, isTotal: true },
            ...is.maintenance.map(i => ({ label: i.name, amount: i.amount, indent: true })),
            { label: 'Subtotal - Maintenance', amount: is.totals.maintenance.actual, isTotal: true },
            ...is.logisticsDistribution.map(i => ({ label: i.name, amount: i.amount, indent: true })),
            { label: 'Subtotal - Logistics', amount: is.totals.logistics.actual, isTotal: true },
            ...is.otherOperatingExpenses.map(i => ({ label: i.name, amount: i.amount, indent: true })),
            { label: 'Total Operating Expenses', amount: is.totals.totalOpEx.actual, isTotal: true }
          ]
        },
        {
          heading: 'Operating Income (EBIT)',
          rows: [
            { label: 'EBIT', amount: is.totals.ebit.actual, isTotal: true }
          ]
        },
        {
          heading: 'Other Income/Expenses',
          rows: [
            ...is.otherItems.map(i => ({ label: i.name, amount: i.amount })),
            { label: 'Total Other Items', amount: is.totals.otherItems.actual, isTotal: true }
          ]
        },
        {
          heading: 'Profit Before Tax',
          rows: [
            { label: 'NIBT', amount: is.totals.nibt.actual, isTotal: true }
          ]
        },
        {
          heading: 'Taxation',
          rows: [
            { label: 'Company Income Tax', amount: is.totals.cit.actual },
            { label: 'Education Tax', amount: is.totals.educationTax.actual },
            { label: 'NASENI Levy', amount: is.totals.naseniLevy.actual },
            { label: 'Total Tax', amount: is.totals.totalTax.actual, isTotal: true }
          ]
        },
        {
          heading: 'Net Income',
          rows: [
            { label: 'Net Income After Tax', amount: is.totals.netIncome.actual, isTotal: true }
          ]
        }
      ]
    };
  }

  private buildBalanceSheetPreview(): StatementPreviewData {
    const bs = this.balanceSheet!;
    return {
      title: 'Balance Sheet',
      description: 'Financial position as of ' + bs.asOfDate.toLocaleDateString(),
      sections: [
        {
          heading: 'ASSETS',
          rows: []
        },
        {
          heading: 'Current Assets',
          rows: [
            { label: 'Cash', amount: bs.assets.current.cash },
            { label: '  Cash on Hand', amount: bs.assets.current.cashOnHand, indent: true },
            { label: '  Regular Checking', amount: bs.assets.current.regularCheckingAccount, indent: true },
            { label: '  Payroll Checking', amount: bs.assets.current.payrollCheckingAccount, indent: true },
            { label: '  Savings Account', amount: bs.assets.current.savingsAccount, indent: true },
            { label: 'Accounts Receivable', amount: bs.assets.current.accountsReceivable },
            { label: 'Inventory', amount: bs.assets.current.inventory },
            { label: 'Prepaid Expenses', amount: bs.assets.current.prepaidExpenses },
            { label: 'Total Current Assets', amount: bs.assets.current.total, isTotal: true }
          ]
        },
        {
          heading: 'Non-Current Assets',
          rows: [
            { label: 'Property', amount: bs.assets.nonCurrent.property },
            { label: 'Equipment', amount: bs.assets.nonCurrent.equipment },
            { label: 'Investments', amount: bs.assets.nonCurrent.investments },
            { label: 'Intangible Assets', amount: bs.assets.nonCurrent.intangibleAssets },
            { label: 'Total Non-Current Assets', amount: bs.assets.nonCurrent.total, isTotal: true }
          ]
        },
        {
          heading: 'TOTAL ASSETS',
          rows: [
            { label: 'Total Assets', amount: bs.assets.total, isTotal: true }
          ]
        },
        {
          heading: 'LIABILITIES',
          rows: []
        },
        {
          heading: 'Current Liabilities',
          rows: [
            { label: 'Accounts Payable', amount: bs.liabilities.current.accountsPayable },
            { label: 'Short-Term Debt', amount: bs.liabilities.current.shortTermDebt },
            { label: 'Accrued Expenses', amount: bs.liabilities.current.accruedExpenses },
            { label: 'VAT Payable', amount: bs.liabilities.current.vatPayable },
            { label: 'WHT Payable', amount: bs.liabilities.current.whtPayable },
            { label: 'PAYE Tax Payable', amount: bs.liabilities.current.payeTaxPayable },
            { label: 'Total Current Liabilities', amount: bs.liabilities.current.total, isTotal: true }
          ]
        },
        {
          heading: 'Non-Current Liabilities',
          rows: [
            { label: 'Long-Term Debt', amount: bs.liabilities.nonCurrent.longTermDebt },
            { label: 'Deferred Tax', amount: bs.liabilities.nonCurrent.deferredTax },
            { label: 'Lease Obligations', amount: bs.liabilities.nonCurrent.leaseObligations },
            { label: 'Total Non-Current Liabilities', amount: bs.liabilities.nonCurrent.total, isTotal: true }
          ]
        },
        {
          heading: 'TOTAL LIABILITIES',
          rows: [
            { label: 'Total Liabilities', amount: bs.liabilities.total, isTotal: true }
          ]
        },
        {
          heading: 'EQUITY',
          rows: [
            { label: 'Common Stock', amount: bs.equity.commonStock },
            { label: 'Retained Earnings', amount: bs.equity.retainedEarnings },
            { label: 'Other Comprehensive Income', amount: bs.equity.otherComprehensiveIncome },
            { label: 'Total Equity', amount: bs.equity.total, isTotal: true }
          ]
        },
        {
          heading: 'TOTAL LIABILITIES & EQUITY',
          rows: [
            { label: 'Total Liabilities & Equity', amount: bs.liabilities.total + bs.equity.total, isTotal: true }
          ]
        }
      ]
    };
  }

  private buildCashFlowPreview(): StatementPreviewData {
    const cf = this.cashFlow!;
    return {
      title: 'Cash Flow Statement',
      description: 'Cash flows for the period ending ' + cf.period.toLocaleDateString(),
      sections: [
        {
          heading: 'Operating Activities',
          rows: [
            ...cf.operatingActivities
              .filter(item => !item.isTotal)
              .map(item => ({
                label: item.description,
                amount: item.type === 'outflow' ? -Math.abs(item.amount) : item.amount,
                indent: item.indentLevel > 0
              })),
            {
              label: 'Net Cash from Operating Activities',
              amount: cf.summaryTotals.operatingCashFlow,
              isTotal: true
            }
          ]
        },
        {
          heading: 'Investing Activities',
          rows: [
            ...cf.investingActivities
              .filter(item => !item.isTotal)
              .map(item => ({
                label: item.description,
                amount: item.type === 'outflow' ? -Math.abs(item.amount) : item.amount,
                indent: item.indentLevel > 0
              })),
            {
              label: 'Net Cash from Investing Activities',
              amount: cf.summaryTotals.investingCashFlow,
              isTotal: true
            }
          ]
        },
        {
          heading: 'Financing Activities',
          rows: [
            ...cf.financingActivities
              .filter(item => !item.isTotal)
              .map(item => ({
                label: item.description,
                amount: item.type === 'outflow' ? -Math.abs(item.amount) : item.amount,
                indent: item.indentLevel > 0
              })),
            {
              label: 'Net Cash from Financing Activities',
              amount: cf.summaryTotals.financingCashFlow,
              isTotal: true
            }
          ]
        },
        {
          heading: 'Net Cash Flow',
          rows: [
            { label: 'Net Cash Flow', amount: cf.summaryTotals.netCashFlow, isTotal: true },
            { label: 'Opening Cash Balance', amount: cf.summaryTotals.openingBalance },
            { label: 'Closing Cash Balance', amount: cf.summaryTotals.closingBalance, isTotal: true },
            { label: 'Free Cash Flow', amount: cf.summaryTotals.freeCashFlow, isTotal: true }
          ]
        }
      ]
    };
  }

  private buildTaxSummaryPreview(): StatementPreviewData {
    const tax = this.taxSummary!;
    return {
      title: 'Tax Summary',
      description: 'Tax obligations for period ' + tax.period,
      sections: [
        {
          heading: 'VAT (7.5%)',
          rows: [
            { label: 'Output VAT', amount: tax.vat.outputVAT },
            { label: 'Input VAT', amount: -tax.vat.inputVAT },
            { label: 'Net VAT Payable', amount: tax.vat.netVATPayable, isTotal: true },
            { label: 'Total Sales (VAT exclusive)', amount: tax.vat.totalSales },
            { label: 'Total Purchases (VAT exclusive)', amount: tax.vat.totalPurchases }
          ]
        },
        {
          heading: 'Withholding Tax (WHT)',
          rows: [
            { label: 'WHT at 5%', amount: tax.wht.at5pct },
            { label: 'WHT at 10%', amount: tax.wht.at10pct },
            { label: 'Total WHT Withheld', amount: tax.wht.totalWithheld, isTotal: true }
          ]
        },
        {
          heading: 'Company Income Tax (CIT)',
          rows: [
            { label: 'Turnover', amount: tax.cit.turnover },
            { label: 'Assessable Profit', amount: tax.cit.assessableProfit },
            { label: `CIT Charge (${tax.cit.rate * 100}%)`, amount: tax.cit.citCharge },
            { label: `Education Tax (${EDUCATION_TAX_RATE * 100}%)`, amount: tax.cit.educationTax },
            { label: `NASENI Levy (${NASENI_RATE * 100}%)`, amount: tax.cit.naseniLevy },
            { label: 'Total CIT Liability', amount: tax.cit.totalLiability, isTotal: true }
          ]
        },
        {
          heading: 'Compliance',
          rows: [
            { label: 'Compliance Score', amount: tax.complianceScore }
          ]
        },
        {
          heading: 'Deferred Tax',
          rows: [
            { label: 'Deductible Temporary Differences', amount: tax.deferredTax.deductibleDifferences },
            { label: 'Taxable Temporary Differences', amount: tax.deferredTax.taxableDifferences },
            { label: 'Net DTA', amount: tax.deferredTax.netDTA },
            { label: 'Net DTL', amount: -tax.deferredTax.netDTL },
            { label: 'Net Deferred Tax Position', amount: tax.deferredTax.netPosition, isTotal: true }
          ]
        }
      ]
    };
  }

  private buildTrialBalancePreview(): StatementPreviewData {
    const bs = this.balanceSheet!;
    const is = this.incomeStatement!;

    // Simplified trial balance using available data
    return {
      title: 'Trial Balance',
      description: 'All ledger account balances as of ' + bs.asOfDate.toLocaleDateString(),
      sections: [
        {
          heading: 'Debit Balances',
          rows: [
            { label: 'Cash & Bank', amount: bs.assets.current.cash },
            { label: 'Accounts Receivable', amount: bs.assets.current.accountsReceivable },
            { label: 'Inventory', amount: bs.assets.current.inventory },
            { label: 'Prepaid Expenses', amount: bs.assets.current.prepaidExpenses },
            { label: 'Property & Equipment', amount: bs.assets.nonCurrent.property + bs.assets.nonCurrent.equipment },
            { label: 'Investments', amount: bs.assets.nonCurrent.investments },
            { label: 'Intangible Assets', amount: bs.assets.nonCurrent.intangibleAssets },
            { label: 'Cost of Goods Sold', amount: Math.abs(is.totals.cogs.actual) },
            { label: 'Operating Expenses', amount: Math.abs(is.totals.totalOpEx.actual) },
            { label: 'Total Debits', amount: 0, isTotal: true } // Will be calculated
          ]
        },
        {
          heading: 'Credit Balances',
          rows: [
            { label: 'Accounts Payable', amount: bs.liabilities.current.accountsPayable },
            { label: 'Short-Term Debt', amount: bs.liabilities.current.shortTermDebt },
            { label: 'Accrued Expenses', amount: bs.liabilities.current.accruedExpenses },
            { label: 'Tax Payables', amount: bs.liabilities.current.vatPayable + bs.liabilities.current.whtPayable + bs.liabilities.current.payeTaxPayable },
            { label: 'Long-Term Debt', amount: bs.liabilities.nonCurrent.longTermDebt },
            { label: 'Deferred Tax', amount: bs.liabilities.nonCurrent.deferredTax },
            { label: 'Lease Obligations', amount: bs.liabilities.nonCurrent.leaseObligations },
            { label: 'Common Stock', amount: bs.equity.commonStock },
            { label: 'Retained Earnings', amount: bs.equity.retainedEarnings },
            { label: 'Other Comprehensive Income', amount: bs.equity.otherComprehensiveIncome },
            { label: 'Revenue', amount: is.totals.revenue.actual },
            { label: 'Other Income', amount: Math.max(0, is.totals.otherItems.actual) },
            { label: 'Total Credits', amount: 0, isTotal: true } // Will be calculated
          ]
        }
      ]
    };
  }

  private buildGeneralLedgerPreview(): StatementPreviewData {
    const is = this.incomeStatement!;
    return {
      title: 'General Ledger',
      description: 'All transactions grouped by account',
      sections: [
        {
          heading: 'Revenue Accounts (4000-4999)',
          rows: is.revenue.map(i => ({ label: i.name, amount: i.amount }))
        },
        {
          heading: 'Cost of Goods Sold (5000-5999)',
          rows: is.cogs.map(i => ({ label: i.name, amount: i.amount }))
        },
        {
          heading: 'Operating Expenses (6000-6999)',
          rows: [
            ...is.administrativeExpenses.map(i => ({ label: i.name, amount: i.amount })),
            ...is.salariesWages.map(i => ({ label: i.name, amount: i.amount })),
            ...is.maintenance.map(i => ({ label: i.name, amount: i.amount })),
            ...is.logisticsDistribution.map(i => ({ label: i.name, amount: i.amount })),
            ...is.otherOperatingExpenses.map(i => ({ label: i.name, amount: i.amount }))
          ]
        },
        {
          heading: 'Other Income/Expenses (7000-7999)',
          rows: is.otherItems.map(i => ({ label: i.name, amount: i.amount }))
        }
      ]
    };
  }

  private buildNotesPreview(): StatementPreviewData {
    const is = this.incomeStatement!;
    const bs = this.balanceSheet!;
    const tax = this.taxSummary!;

    return {
      title: 'Notes to the Accounts',
      description: 'Additional information and disclosures',
      sections: [
        {
          heading: 'Note 1 — Accounting Policies',
          rows: [
            { label: 'Basis of Preparation: IFRS / NGAAP (accrual basis)', amount: 0 },
            { label: 'Revenue Recognition: IFRS 15 — performance obligation method', amount: 0 },
            { label: 'Depreciation Method: Straight-line over useful life', amount: 0 },
            { label: 'VAT: 7.5% per FIRS regulations on taxable supplies', amount: 0 }
          ]
        },
        {
          heading: 'Note 2 — Revenue Breakdown',
          rows: [
            ...is.revenue.map(i => ({ label: i.name, amount: i.amount })),
            { label: 'Total Revenue', amount: is.totals.revenue.actual, isTotal: true }
          ]
        },
        {
          heading: 'Note 3 — Property, Plant & Equipment',
          rows: [
            { label: 'Property', amount: bs.assets.nonCurrent.property },
            { label: 'Equipment', amount: bs.assets.nonCurrent.equipment },
            { label: 'Total NBV', amount: bs.assets.nonCurrent.property + bs.assets.nonCurrent.equipment, isTotal: true }
          ]
        },
        {
          heading: 'Note 4 — Tax Obligations',
          rows: [
            { label: 'VAT Payable', amount: tax.vat.netVATPayable },
            { label: 'WHT Payable', amount: tax.wht.totalWithheld },
            { label: 'CIT Payable', amount: tax.cit.totalLiability },
            { label: 'Total Tax Obligations', amount: tax.vat.netVATPayable + tax.wht.totalWithheld + tax.cit.totalLiability, isTotal: true }
          ]
        },
        {
          heading: 'Note 5 — Key Ratios',
          rows: [
            { label: 'Gross Profit Margin', amount: is.ratios.grossProfitMargin },
            { label: 'EBITDA Margin', amount: is.ratios.ebitdaMargin },
            { label: 'Net Profit Margin', amount: is.ratios.netProfitMargin }
          ]
        }
      ]
    };
  }

  private openGeneratedReport(report: Report): void {
    if (!this.incomeStatement || !this.balanceSheet || !this.cashFlow) return;

    let data: any = {};

    // Generate appropriate data based on report type
    switch (report.title) {
      case 'Trial Balance':
        data = { message: 'Trial Balance data would be shown here' };
        break;
      case 'General Ledger':
        data = { message: 'General Ledger data would be shown here' };
        break;
      default:
        data = { message: 'Report data would be shown here' };
    }

    this.selectedReport = {
      id: Date.now(),
      name: report.title,
      date: new Date().toLocaleDateString(),
      generatedBy: this.generatedBy,
      type: report.title,
      status: 'Completed',
      data
    };
    this.modalOpen = true;
  }

  // ─── Period Comparison───
  applyPeriodComparison(): void {
    if (!this.comparativeData[this.selectedPeriod1] || !this.comparativeData[this.selectedPeriod2]) {
      return;
    }

    this.barChartOptions = {
      ...this.barChartOptions,
      series: [
        {
          name: this.selectedPeriod1,
          data: Object.values(this.comparativeData[this.selectedPeriod1])
        },
        {
          name: this.selectedPeriod2,
          data: Object.values(this.comparativeData[this.selectedPeriod2]).map(v => -v)
        }
      ],
      xaxis: {
        ...this.barChartOptions.xaxis,
        categories: Object.keys(this.comparativeData[this.selectedPeriod1])
      }
    };
    this.periodModalOpen = false;
  }

  // ─── Report Generation───
  onGenerateReport(): void {
    if (!this.reportType || !this.dateRange ||
      (this.dateRange === 'Custom Range' && (!this.fromDate || !this.toDate))) {
      alert('Please fill all required fields.');
      return;
    }

    const newReport: GeneratedReport = {
      id: Date.now(),
      name: this.reportType,
      date: new Date().toLocaleDateString(),
      generatedBy: this.generatedBy,
      type: this.reportType,
      status: 'Pending'
    };

    this.generatedReports.unshift(newReport);
    this.currentReportPage = 1;

    // Simulate report generation
    setTimeout(() => {
      const idx = this.generatedReports.findIndex(r => r.id === newReport.id);
      if (idx > -1) {
        this.generatedReports[idx].status = 'Completed';
        this.generatedReports[idx].data = this.generateReportData(this.reportType);
        this.generatedReports = [...this.generatedReports];
      }
    }, 2000);
  }

  private generateReportData(type: string): any {
    if (!this.incomeStatement || !this.balanceSheet || !this.cashFlow) return null;

    const reportDataMap: Record<string, any> = {
      'Fixed Asset Movement': this.generateFixedAssetMovement(),
      'AR Aging Report': this.generateARAging(),
      'AP Aging Report': this.generateAPAging(),
      'Budget vs Actual': this.generateBudgetVsActual(),
      'Segment/Department Report': this.generateSegmentReport(),
      'Inventory Valuation Report': this.generateInventoryValuation(),
      'KPI/Ratio Report': this.generateKPIRatioReport(),
      'Deferred Revenue & Prepaids': this.generateDeferredRevenue(),
      'Bank Reconciliation Report': { message: 'Bank reconciliation data' },
      'Trial Balance': { message: 'Trial balance data' },
      'General Ledger': { message: 'General ledger data' },
      'Notes to the Accounts': { message: 'Notes to accounts' },
      'Statement of Changes in Equity': this.generateEquityStatement(),
      'Management Report': this.generateManagementReport()
    };

    return reportDataMap[type] || { message: 'Report data' };
  }

  private generateFixedAssetMovement(): any[] {
    return [
      {
        assetId: 'FA001',
        assetName: 'Office Building',
        type: 'Property',
        movementType: 'Addition',
        from: '-',
        to: 'Head Office',
        date: new Date().toISOString().split('T')[0],
        handledBy: 'Admin',
        notes: 'New acquisition'
      },
      {
        assetId: 'FA002',
        assetName: 'Forklift',
        type: 'Equipment',
        movementType: 'Transfer',
        from: 'Warehouse A',
        to: 'Warehouse B',
        date: new Date().toISOString().split('T')[0],
        handledBy: 'Operations',
        notes: 'Reallocation'
      }
    ];
  }

  private generateARAging(): any[] {
    return [
      {
        customer: 'ABC Ltd',
        invoiceNumber: 'INV-001',
        invoiceDate: '2025-04-15',
        dueDate: '2025-05-15',
        totalAmount: 1500000,
        current: 500000,
        '1-30Days': 1000000,
        '31-60Days': 0,
        '61-90Days': 0,
        '>90Days': 0
      },
      {
        customer: 'XYZ Corp',
        invoiceNumber: 'INV-002',
        invoiceDate: '2025-03-01',
        dueDate: '2025-03-31',
        totalAmount: 2500000,
        current: 0,
        '1-30Days': 0,
        '31-60Days': 1500000,
        '61-90Days': 1000000,
        '>90Days': 0
      }
    ];
  }

  private generateAPAging(): any[] {
    return [
      {
        vendor: 'Office Supplies Ltd',
        invoiceNumber: 'AP-001',
        invoiceDate: '2025-04-20',
        dueDate: '2025-05-20',
        totalAmount: 800000,
        current: 300000,
        '1-30Days': 500000,
        '31-60Days': 0,
        '61-90Days': 0,
        '>90Days': 0
      }
    ];
  }

  private generateBudgetVsActual(): any[] {
    const is = this.incomeStatement!;
    return [
      {
        department: 'Revenue',
        budgetedAmount: is.totals.revenue.budget,
        actualAmount: is.totals.revenue.actual,
        variance: is.totals.revenue.actual - is.totals.revenue.budget,
        variancePercent: ((is.totals.revenue.actual - is.totals.revenue.budget) / Math.abs(is.totals.revenue.budget) * 100).toFixed(1) + '%'
      },
      {
        department: 'Operating Expenses',
        budgetedAmount: Math.abs(is.totals.totalOpEx.budget),
        actualAmount: Math.abs(is.totals.totalOpEx.actual),
        variance: Math.abs(is.totals.totalOpEx.budget) - Math.abs(is.totals.totalOpEx.actual),
        variancePercent: ((Math.abs(is.totals.totalOpEx.budget) - Math.abs(is.totals.totalOpEx.actual)) / Math.abs(is.totals.totalOpEx.budget) * 100).toFixed(1) + '%'
      }
    ];
  }

  private generateSegmentReport(): any[] {
    return [
      { segment: 'Retail', revenue: 2000000, expenses: 1500000, profit: 500000 },
      { segment: 'Wholesale', revenue: 3500000, expenses: 2800000, profit: 700000 },
      { segment: 'Services', revenue: 1500000, expenses: 900000, profit: 600000 }
    ];
  }

  private generateInventoryValuation(): any[] {
    return [
      { item: 'Product A', category: 'Electronics', quantityOnHand: 100, unitCost: 50000, totalValue: 5000000 },
      { item: 'Product B', category: 'Furniture', quantityOnHand: 50, unitCost: 75000, totalValue: 3750000 },
      { item: 'Product C', category: 'Office Supplies', quantityOnHand: 200, unitCost: 5000, totalValue: 1000000 }
    ];
  }

  private generateKPIRatioReport(): any[] {
    const m = this.metrics!;
    const is = this.incomeStatement!;
    return [
      { metric: 'Current Ratio', value: m.currentRatio.toFixed(2), benchmark: '1.5 - 2.0', status: m.currentRatio >= 1.5 ? 'Healthy' : 'Caution' },
      { metric: 'Gross Profit Margin', value: m.grossProfitMargin.toFixed(1) + '%', benchmark: '> 30%', status: m.grossProfitMargin > 30 ? 'Healthy' : 'Review' },
      { metric: 'Net Profit Margin', value: m.netProfitMargin.toFixed(1) + '%', benchmark: '> 10%', status: m.netProfitMargin > 10 ? 'Healthy' : 'Review' },
      { metric: 'Debt to Equity', value: (m.totalLiabilities / m.totalEquity).toFixed(2), benchmark: '< 1.5', status: (m.totalLiabilities / m.totalEquity) < 1.5 ? 'Healthy' : 'Caution' }
    ];
  }

  private generateDeferredRevenue(): any[] {
    return [
      {
        customer: 'Client A',
        invoiceNumber: 'INV-1001',
        amount: 500000,
        revenueRecognized: 250000,
        deferredRevenue: 250000,
        recognitionPeriod: 'Jan 2025 - Jun 2025'
      },
      {
        vendor: 'Vendor B',
        prepaidAmount: 180000,
        expenseRecognized: 90000,
        prepaidBalance: 90000,
        coveragePeriod: 'Apr 2025 - Sep 2025'
      }
    ];
  }

  private generateEquityStatement(): any {
    const bs = this.balanceSheet!;
    const is = this.incomeStatement!;
    return {
      openingEquity: bs.equity.total - is.totals.netIncome.actual,
      netIncome: is.totals.netIncome.actual,
      contributions: 0,
      dividends: 0,
      closingEquity: bs.equity.total
    };
  }

  private generateManagementReport(): any {
    const m = this.metrics!;
    const is = this.incomeStatement!;
    return {
      revenueTrends: is.monthlyTrend.revenue,
      expenseBreakdown: [
        { category: 'COGS', amount: Math.abs(is.totals.cogs.actual), percentOfRevenue: ((Math.abs(is.totals.cogs.actual) / m.totalRevenue) * 100).toFixed(1) },
        { category: 'Operating Expenses', amount: Math.abs(is.totals.totalOpEx.actual), percentOfRevenue: ((Math.abs(is.totals.totalOpEx.actual) / m.totalRevenue) * 100).toFixed(1) }
      ],
      grossProfitMargin: m.grossProfitMargin.toFixed(1),
      netProfitMargin: m.netProfitMargin.toFixed(1),
      ceoCommentary: 'Performance is in line with expectations. Revenue growth remains strong.',
      strategyUpdates: 'Focus on expanding service revenue and optimizing operational efficiency.'
    };
  }

  // ─── Modal Handlers──────
  openCardModal(card: SummaryCardData): void {
    this.selectedCard = card;
    this.cardModalOpen = true;
  }

  closeCardModal(): void {
    this.cardModalOpen = false;
    this.selectedCard = null;
  }

  closeStatementModal(): void {
    this.statementModalOpen = false;
    this.selectedStatement = null;
  }

  toggleModalSize(): void {
    this.modalExpanded = !this.modalExpanded;
  }

  openNewReportModal(): void {
    this.newReportModalOpen = true;
    this.resetReportForm();
  }

  closeNewReportModal(): void {
    this.newReportModalOpen = false;
    this.modalExpanded = false;
  }

  openReport(report: GeneratedReport): void {
    if (report.status === 'Completed') {
      this.selectedReport = report;
      this.modalOpen = true;
    }
  }

  closeModal(): void {
    this.modalOpen = false;
    this.selectedReport = null;
  }

  private resetReportForm(): void {
    this.reportType = '';
    this.dateRange = '';
    this.fromDate = '';
    this.toDate = '';
  }

  // ─── Pagination──────────
  get paginatedReports(): GeneratedReport[] {
    const start = (this.currentReportPage - 1) * this.reportsPerPage;
    return this.generatedReports.slice(start, start + this.reportsPerPage);
  }

  get totalReportPages(): number {
    return Math.max(1, Math.ceil(this.generatedReports.length / this.reportsPerPage));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalReportPages }, (_, i) => i + 1);
  }

  goToReportPage(page: number): void {
    if (page >= 1 && page <= this.totalReportPages) {
      this.currentReportPage = page;
    }
  }

  // ─── Search / Filter─────
  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredReports = this.allReports.filter(r =>
      r.title.toLowerCase().includes(query)
    );
  }

  onFilterStatus(event: Event): void {
    const status = (event.target as HTMLSelectElement).value;
    this.filteredReports = status
      ? this.allReports.filter(r => r.status === status)
      : [...this.allReports];
  }

  onViewAll(): void {
    this.filteredReports = [...this.allReports];
  }

  // ─── Export──────────────
  onExport(): void {
    if (!this.metrics || !this.incomeStatement) return;

    const lines = [
      'Accounting Reports — Export',
      `Generated: ${new Date().toLocaleDateString('en-NG')}`,
      '',
      `Total Revenue,₦${this.metrics.totalRevenue.toLocaleString()}`,
      `Total Assets,₦${this.metrics.totalAssets.toLocaleString()}`,
      `Gross Profit,₦${this.metrics.grossProfit.toLocaleString()}`,
      `Net Income,₦${this.metrics.netIncome.toLocaleString()}`,
      `Accounts Receivable,₦${this.metrics.accountsReceivable.toLocaleString()}`,
      `Operating Cash Flow,₦${this.metrics.operatingCashFlow.toLocaleString()}`,
      `Working Capital,₦${this.metrics.workingCapital.toLocaleString()}`,
      `Current Ratio,${this.metrics.currentRatio.toFixed(2)}`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounting-reports-${this.today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Constants needed for tax calculations
const EDUCATION_TAX_RATE = 0.025;
const NASENI_RATE = 0.0025;