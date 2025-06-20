import { Component } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import {
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexChart,
  ApexLegend,
  ApexDataLabels,
  ApexFill,
  ApexTooltip,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexPlotOptions,
  ApexStroke,
  ApexMarkers
} from "ng-apexcharts";
import { GeneratedReport } from './report.model';

interface Report {
  title: string;
  description: string;
  updated: string;
  status: 'Published' | 'Draft';
  icon: string;
  canAutoGenerate?: boolean;
  data?: any;
}

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
export class AccountingReportsComponent {
  // Form fields
  reportType = '';
  dateRange = '';
  fromDate = '';
  toDate = '';
  generatedBy = 'Admin';
  newReportModalOpen = false;

  modalExpanded = false;

  toggleModalSize() {
    this.modalExpanded = !this.modalExpanded;
  }

  onExport() {
    alert('downloading content');
    alert('processing your request');
    alert('completed');
  }


openNewReportModal() {
    this.newReportModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeNewReportModal() {
    this.newReportModalOpen = false;
    document.body.style.overflow = '';
  }
  // List of generated reports
  reports: GeneratedReport[] = [];

  // For modal popup
  modalOpen = false;
  selectedReport: GeneratedReport | null = null;

  // Dummy data for auto-generation logic
  cashLedger = [
    { date: '2025-06-01', description: 'Deposit', amount: 100000, type: 'debit' },
    { date: '2025-06-02', description: 'Cheque #123', amount: 20000, type: 'credit' },
    { date: '2025-06-03', description: 'Bank Charge', amount: 500, type: 'credit' }
  ];
  bankStatement = [
    { date: '2025-06-01', description: 'Deposit', amount: 100000, type: 'credit' },
    { date: '2025-06-02', description: 'Cheque #123', amount: 20000, type: 'debit' }
  ];
  generalLedger = [
    { date: '2025-06-01', account: 'Cash', debit: 100000, credit: 0, description: 'Opening balance' },
    { date: '2025-06-02', account: 'Sales', debit: 0, credit: 50000, description: 'Product sale' },
    { date: '2025-06-03', account: 'Expenses', debit: 10000, credit: 0, description: 'Office supplies' }
  ];
  openingBalances = [
    { account: 'Cash', debit: 100000, credit: 0 },
    { account: 'Sales', debit: 0, credit: 0 },
    { account: 'Expenses', debit: 0, credit: 0 }
  ];
  dividendLedger = [
    { date: '2025-06-10', description: 'Dividend paid', amount: 20000 }
  ];
  capitalChanges = [
    { date: '2025-06-05', description: 'Shareholder contribution', amount: 50000 }
  ];
  incomeStatement = {
    netIncome: 80000,
    retainedEarnings: 120000
  };
  kpiRatios = [
    { metric: 'Debt-to-Equity', value: 0.8 },
    { metric: 'Current Ratio', value: 2.1 }
  ];

  fixedAssetMovements = [
    {
      assetId: 'FA1023',
      assetName: 'HP Printer',
      type: 'IT Equipment',
      movementType: 'Transfer',
      from: 'IT Dept',
      to: 'Admin Dept',
      date: '2025-06-01',
      handledBy: 'Jane Doe',
      notes: 'Internal use'
    },
    {
      assetId: 'FA0089',
      assetName: 'Office Desk',
      type: 'Furniture',
      movementType: 'Disposal',
      from: 'HR Office',
      to: '—',
      date: '2025-05-27',
      handledBy: 'Mark Smith',
      notes: 'Damaged'
    }
  ];

  arAgingReport = [
    {
      customer: 'ABC Ltd',
      invoiceNumber: 'INV-1001',
      invoiceDate: '2025-04-10',
      dueDate: '2025-05-10',
      totalAmount: 150000,
      current: 0,
      '1-30Days': 50000,
      '31-60Days': 100000,
      '61-90Days': 0,
      '>90Days': 0
    },
    {
      customer: 'XYZ Corp',
      invoiceNumber: 'INV-1020',
      invoiceDate: '2025-03-01',
      dueDate: '2025-03-31',
      totalAmount: 200000,
      current: 0,
      '1-30Days': 0,
      '31-60Days': 0,
      '61-90Days': 0,
      '>90Days': 200000
    }
  ];

  apAgingReport = [
    {
      vendor: 'Office Supplies Ltd',
      invoiceNumber: 'AP-2001',
      invoiceDate: '2025-04-05',
      dueDate: '2025-05-05',
      totalAmount: 80000,
      current: 0,
      '1-30Days': 30000,
      '31-60Days': 50000,
      '61-90Days': 0,
      '>90Days': 0
    }
  ];

  deferredRevenuePrepaids = [
    {
      customer: 'NextGen Inc.',
      invoiceNumber: 'INV-1001',
      amount: 500000,
      revenueRecognized: 250000,
      deferredRevenue: 250000,
      recognitionPeriod: 'Jan 2025 - Jun 2025'
    },
    {
      vendor: 'HostingProvider Ltd.',
      prepaidAmount: 180000,
      expenseRecognized: 90000,
      prepaidBalance: 90000,
      coveragePeriod: 'Apr 2025 - Sep 2025'
    }
  ];

  kpiRatioReport = [
    {
      metric: 'Current Ratio',
      value: 2.1,
      benchmark: 1.5,
      status: 'Healthy'
    },
    {
      metric: 'Debt to Equity Ratio',
      value: 0.8,
      benchmark: 1.2,
      status: 'Healthy'
    },
    {
      metric: 'Net Profit Margin',
      value: '12%',
      benchmark: '10%',
      status: 'Above Average'
    }
  ];

  inventoryValuationReport = [
    {
      item: 'Laptop - Dell XPS 13',
      category: 'Electronics',
      quantityOnHand: 20,
      unitCost: 350000,
      totalValue: 7000000
    },
    {
      item: 'Office Chair',
      category: 'Furniture',
      quantityOnHand: 50,
      unitCost: 25000,
      totalValue: 1250000
    }
  ];

  segmentDepartmentReport = [
    {
      segment: 'Retail',
      revenue: 2000000,
      expenses: 1500000,
      profit: 500000
    },
    {
      segment: 'Wholesale',
      revenue: 3500000,
      expenses: 2800000,
      profit: 700000
    }
  ];

  budgetVsActual = [
    {
      department: 'Marketing',
      budgetedAmount: 500000,
      actualAmount: 450000,
      variance: 50000,
      variancePercent: '10%'
    },
    {
      department: 'Operations',
      budgetedAmount: 1200000,
      actualAmount: 1350000,
      variance: -150000,
      variancePercent: '-12.5%'
    },
    {
      department: 'HR',
      budgetedAmount: 300000,
      actualAmount: 280000,
      variance: 20000,
      variancePercent: '6.67%'
    }
  ];

  allReports: Report[] = [
    {
      title: 'Bank Reconciliation Report',
      description: 'Differences between bank statement and company records.',
      updated: 'Jun 1, 2025',
      status: 'Published',
      icon: 'balance',
      canAutoGenerate: true
    },
    {
      title: 'Trial Balance',
      description: 'All ledger account balances before preparing financial statements',
      updated: 'May 1, 2025',
      status: 'Published',
      icon: 'income',
      canAutoGenerate: true
    },
    {
      title: 'General Ledger',
      description: 'All accounting transactions, grouped by account.',
      updated: 'Jun 1, 2025',
      status: 'Published',
      icon: 'cashflow',
      canAutoGenerate: true
    },
    {
      title: 'Notes to the Accounts',
      description: 'Additional information and disclosures supporting the financial statements',
      updated: 'Jun 5, 2025',
      status: 'Published',
      icon: 'notes',
      canAutoGenerate: false
    },
    {
      title: 'Statement of Changes in Equity',
      description: 'Changes in company equity over the reporting period',
      updated: 'Jun 3, 2025',
      status: 'Published',
      icon: 'equity',
      canAutoGenerate: true
    },
    {
      title: 'Management Report',
      description: 'Executive summary and analysis of financial performance',
      updated: 'Jun 10, 2025',
      status: 'Draft',
      icon: 'summary',
      canAutoGenerate: false
    }
  ];

  filteredReports: Report[] = [];

  periodModalOpen = false;
  availablePeriods = ['2023', '2022', '2021', '2020', 'Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023'];
  selectedPeriod1 = '2023';
  selectedPeriod2 = '2022';

  comparativeData: { [period: string]: { [metric: string]: number } } = {
    '2023': {
      'Total Revenue': 85,
      'Net Profit': 95,
      'Total Loss': 81,
      'Total Expenses': 65,
      'Operating Cash Flow': 60,
      'POS Module': 55,
      'Office productivity': 59,
      'Human Resource': 40,
      'Data Logic': 69
    },
    '2022': {
      'Total Revenue': 82,
      'Information Science': 75,
      'Total Loss': 79,
      'Total Expenses': 55,
      'Operating Cash Flow': 43,
      'POS Module': 49,
      'Office productivity': 20,
      'Human Resource': 60,
      'Data Logic': 35
    }
  };

  // --- Donut Chart Data and Options ---
  categoryData = [
    { category: 'Payroll', value: 45 },
    { category: 'HR', value: 28 },
    { category: 'POS', value: 15 },
    { category: 'Equipment and maintance', value: 10 },
    { category: 'Others', value: 2 }
  ];

  // ApexCharts Donut Chart Options
  public donutChartOptions: DonutChartOptions;

  // ApexCharts Bar Chart Options (Comparative)
  public barChartOptions: BarChartOptions;

  // ApexCharts Line Chart Options (Revenue vs Expenses)
  public lineChartOptions: LineChartOptions;

  constructor() {
    this.filteredReports = [...this.allReports];
    this.autoGenerateStatements();

    // Donut Chart
    const total = this.categoryData.reduce((sum, item) => sum + item.value, 0);
    this.donutChartOptions = {
      series: this.categoryData.map(item => item.value),
      chart: {
        type: "donut",
        width: 600
      },
      labels: this.categoryData.map(item => item.category),
      legend: {
        position: "bottom",
        fontSize: "16px",
        fontWeight: 600,
        markers: { width: 16, height: 16, radius: 8 }
      },
      dataLabels: {
        enabled: true,
        formatter: (val, opts) => {
          const num = Array.isArray(val) ? 0 : Number(val);
          return num.toFixed(1) + "%";
        }
      },
      fill: {
        type: "solid"
      },
      tooltip: {
        y: {
          formatter: (val) => `${val} (${((val / total) * 100).toFixed(1)}%)`
        }
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: { width: 300 },
            legend: { position: "bottom" }
          }
        }
      ],
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                formatter: () => total.toString()
              }
            }
          }
        }
      }
    };

    //  bar chart configuration
    this.barChartOptions = {
      series: [
        {
          name: this.selectedPeriod1,
          data: Object.values(this.comparativeData[this.selectedPeriod1])
        },
        {
          name: this.selectedPeriod2,
          data: Object.values(this.comparativeData[this.selectedPeriod2]).map(val => -val) 
        }
      ],
      chart: {
        type: 'bar',
        height: 400,
        width: '100%',
        stacked: true,
        toolbar: { show: false }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '80%',
          borderRadius: 4,
          dataLabels: {
            position: 'center' 
          }
        }
      },
      colors: ['#2471A3', '#F39C12'],
      dataLabels: {
        enabled: true,
        offsetX: 0,
        style: {
          fontSize: '14px',
          fontWeight: '20',
          colors: ['#eaf2f8', '#ffffff'] 
        },
        formatter: function(val) {
          return Math.abs(Number(val)) + '%'; // Show absolute value
        }
      },
      xaxis: {
        categories: Object.keys(this.comparativeData[this.selectedPeriod1]),
        labels: {
          style: { fontSize: '13px' },
          formatter: function(val) {
            return Math.abs(Number(val)) + '%'; 
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        min: -100, 
        max: 100
      },
      yaxis: {
        labels: {
          style: { fontSize: '13px' },
          formatter: function(val) {
            return String(val); 
          }
        }
      },
      tooltip: {
        shared: false,
        intersect: true,
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
          const metricName = w.config.xaxis.categories[dataPointIndex];
          const period = seriesIndex === 0 ? this.selectedPeriod1 : this.selectedPeriod2;
          const percentage = Math.abs(series[seriesIndex][dataPointIndex]);

          // Get the actual amount from your data (you'll need to add this)
          const actualAmount = this.getActualAmount(period, metricName);

          return `
            <div class="apexcharts-tooltip-title">${metricName}: ${percentage}%</div>
            <div class="apexcharts-tooltip-series-group">
              <span class="apexcharts-tooltip-marker" style="background-color: ${seriesIndex === 0 ? '#2471A3' : '#F39C12'}"></span>
              <div class="apexcharts-tooltip-text">
                <div class="apexcharts-tooltip-y-group">
                  <span class="apexcharts-tooltip-text-label">${period}:</span>
                  <span class="apexcharts-tooltip-text-value">${percentage}%</span>
                </div>
                <div class="apexcharts-tooltip-y-group">
                  <span class="apexcharts-tooltip-text-label">Amount:</span>
                  <span class="apexcharts-tooltip-text-value">₦${actualAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          `;
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'center',
        fontSize: '15px'
      },
      fill: { type: 'solid' },
      grid: {
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: false } },
        padding: { left: 0, right: 0 }
      }
    };

    // Line Chart (Revenue vs Expenses)
    this.lineChartOptions = {
      series: [
        {
          name: 'Revenue',
          data: [35000, 40000, 35000, 50000, 60000, 85000]
        },
        {
          name: 'Expenses',
          data: [20000, 25000, 20000, 30000, 40000, 60000]
        }
      ],
      chart: {
        type: 'line',
        height: 400,
        toolbar: { show: false }
      },
      colors: ['#4F8CFF', '#6FE7C1'],
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      markers: {
        size: 5,
        colors: ['#fff'],
        strokeColors: ['#4F8CFF', '#6FE7C1'],
        strokeWidth: 3,
        hover: { size: 7 }
      },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        labels: { style: { fontSize: '13px' } }
      },
      yaxis: {
        min: 0,
        max: 100000,
        tickAmount: 5,
        labels: {
          formatter: (val) => val.toLocaleString()
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        x: { show: true },
        y: {
          formatter: (val) => val.toLocaleString()
        }
      },
      legend: {
        position: 'bottom',
        fontSize: '15px'
      },
      fill: { type: 'solid' }
    };
  }

  // Add this method to your component class
  getActualAmount(period: string, metricName: string): number {
    
    const amountMap: { [period: string]: { [metric: string]: number } } = {
      '2023': {
        'Total Revenue': 8500000,
        'Net Profit': 9500000,
        'Total Loss': 8100000,
        'Total Expenses': 6500000,
        'Operating Cash Flow': 6000000,
        'POS Module': 5500000,
        'Office Productivity': 5900000,
        'Human Resource': 4000000,
        'Data Logic': 6900000
      },
      '2022': {
        'Total Revenue': 7600000,
        'Net Profit': 7500000,
        'Total Loss': 7900000,
        'Total Expenses': 5500000,
        'Operating Cash Flow': 4300000,
        'POS Module': 4900000,
        'Office Productivity': 2000000,
        'Human Resource': 6000000,
        'Data Logic': 3500000
      }
    };

    return amountMap[period]?.[metricName] || 0;
  }

  applyPeriodComparison() {
    // Update bar chart data when periods change
    this.barChartOptions = {
      ...this.barChartOptions,
      series: [
        {
          name: this.selectedPeriod1,
          data: Object.values(this.comparativeData[this.selectedPeriod1])
        },
        {
          name: this.selectedPeriod2,
          data: Object.values(this.comparativeData[this.selectedPeriod2]).map(val => -val)
        }
      ],
      xaxis: {
        ...this.barChartOptions.xaxis,
        categories: Object.keys(this.comparativeData[this.selectedPeriod1])
      }
    };
    this.periodModalOpen = false;
  }

  autoGenerateStatements() {
    // 1. Bank Reconciliation Report
    const outstandingCheques = this.cashLedger.filter(
      entry => entry.type === 'credit' && !this.bankStatement.find(b => b.description === entry.description)
    );
    const depositsInTransit = this.cashLedger.filter(
      entry => entry.type === 'debit' && !this.bankStatement.find(b => b.description === entry.description)
    );
    const bankChargesMissing = this.bankStatement.filter(
      entry => entry.type === 'debit' && !this.cashLedger.find(c => c.description === entry.description)
    );
    this.allReports[0].data = {
      outstandingCheques,
      depositsInTransit,
      bankChargesMissing
    };

    // 2. Trial Balance
    const trialBalanceAccounts: { [key: string]: { debit: number; credit: number } } = {};
    for (const entry of this.generalLedger) {
      if (!trialBalanceAccounts[entry.account]) {
        trialBalanceAccounts[entry.account] = { debit: 0, credit: 0 };
      }
      trialBalanceAccounts[entry.account].debit += entry.debit;
      trialBalanceAccounts[entry.account].credit += entry.credit;
    }
    const trialBalance = Object.entries(trialBalanceAccounts).map(([account, vals]) => ({
      account,
      debit: vals.debit,
      credit: vals.credit
    }));
    const totalDebits = trialBalance.reduce((sum, acc) => sum + acc.debit, 0);
    const totalCredits = trialBalance.reduce((sum, acc) => sum + acc.credit, 0);
    this.allReports[1].data = {
      trialBalance,
      totalDebits,
      totalCredits
    };

    // 3. General Ledger
    const ledgerByAccount: { [key: string]: any[] } = {};
    for (const entry of this.generalLedger) {
      if (!ledgerByAccount[entry.account]) ledgerByAccount[entry.account] = [];
      ledgerByAccount[entry.account].push(entry);
    }
    this.allReports[2].data = ledgerByAccount;

    // 4. Notes to the Accounts (partial)
    this.allReports[3].data = {
      depreciationSchedule: [
        { asset: 'HP Printer', method: 'Straight Line', rate: '20%', year: 2025, depreciation: 20000 }
      ],
      policies: 'See attached accounting policies.',
      ratios: this.kpiRatios,
      manualNotes: 'Add legal disclosures and risk notes here.'
    };

    // 5. Statement of Changes in Equity
    const openingEquity = 200000;
    const netIncome = this.incomeStatement.netIncome;
    const contributions = this.capitalChanges.reduce((sum, c) => sum + c.amount, 0);
    const dividends = this.dividendLedger.reduce((sum, d) => sum + d.amount, 0);
    const closingEquity = openingEquity + netIncome + contributions - dividends;
    this.allReports[4].data = {
      openingEquity,
      netIncome,
      contributions,
      dividends,
      closingEquity
    };

    // 6. Management Report (partial)
    this.allReports[5].data = {
      revenueTrends: [100000, 120000, 110000, 130000, 125000],
      expenseBreakdown: [
        { category: 'Salaries', amount: 50000 },
        { category: 'Office', amount: 15000 },
        { category: 'IT', amount: 10000 }
      ],
      profitMargins: '12%',
      ceoCommentary: 'To be provided by management.',
      strategyUpdates: 'To be provided by management.'
    };
  }

  // --- UI/Filter/Modal logic ---
  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredReports = this.allReports.filter((report) =>
      report.title.toLowerCase().includes(value)
    );
  }

  onFilterStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filteredReports = value
      ? this.allReports.filter((r) => r.status === value)
      : [...this.allReports];
  }

  onViewAll(): void {
    this.filteredReports = [...this.allReports];
  }

  previewReport(report: Report): void {
    this.selectedReport = {
      id: Date.now(),
      name: report.title,
      date: new Date().toLocaleDateString(),
      generatedBy: this.generatedBy,
      type: report.title,
      status: 'Completed',
      data: report.data
    };
    this.modalOpen = true;
  }

  downloadReport(report: Report): void {}

  shareReport(report: Report): void {}

  editReport(report: Report): void {}

  deleteReport(report: Report): void {
    const confirmDelete = confirm(`Delete ${report.title}?`);
    if (confirmDelete) {
      this.allReports = this.allReports.filter((r) => r !== report);
      this.filteredReports = [...this.allReports];
    }
  }

  onGenerateReport() {
    if (!this.reportType || !this.dateRange || !this.fromDate || !this.toDate) {
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

    this.reports.unshift(newReport);

    // Simulate async report generation
    setTimeout(() => {
      const idx = this.reports.findIndex(r => r.id === newReport.id);
      if (idx > -1) {
        this.reports[idx].status = 'Completed';
        const reportMap: { [key: string]: any } = {
          'Fixed Asset Movement': this.fixedAssetMovements,
          'AR Aging Report': this.arAgingReport,
          'AP Aging Report': this.apAgingReport,
          'Budget vs Actual': this.budgetVsActual,
          'Segment/Department Report': this.segmentDepartmentReport,
          'Inventory Valuation Report': this.inventoryValuationReport,
          'KPI/Ratio Report': this.kpiRatioReport,
          'Deferred Revenue & Prepaids': this.deferredRevenuePrepaids,
          'Bank Reconciliation Report': this.allReports[0].data,
          'Trial Balance': this.allReports[1].data,
          'General Ledger': this.allReports[2].data,
          'Notes to the Accounts': this.allReports[3].data,
          'Statement of Changes in Equity': this.allReports[4].data,
          'Management Report': this.allReports[5].data
        };

        if (reportMap[this.reportType]) {
          this.reports[idx].data = reportMap[this.reportType];
        }
      }
    }, 2000);
  }

  openReport(report: GeneratedReport) {
    if (report.status === 'Completed') {
      this.selectedReport = report;
      this.modalOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

 
 closeModal() {
    this.modalOpen = false;
    this.selectedReport = null;
    document.body.style.overflow = '';
  }
}