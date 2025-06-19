import { Component, AfterViewInit } from '@angular/core';
import Chart from 'chart.js/auto';
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

@Component({
  selector: 'app-accounting-reports',
  templateUrl: './accounting-reports.component.html',
  styleUrls: ['./accounting-reports.component.scss']
})
export class AccountingReportsComponent implements AfterViewInit {
  // Form fields
  reportType = '';
  dateRange = '';
  fromDate = '';
  toDate = '';
  generatedBy = 'Admin';

  modalExpanded = false;

  toggleModalSize() {
    this.modalExpanded = !this.modalExpanded;
  }

onExport(){
  alert('downloading content');
  alert('processing your request');
  alert('completed');
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
    // Bank charge  ill include it soon 
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

  // Example data for Fixed Asset Movement
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

  // Financial Statement Section Data
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

  comparativeChart: any;

  comparativeData: { [period: string]: { [metric: string]: number } } = {
    '2023': {
      'Total Revenue': 85,
      'Net Profit': 95,
      'Total Loss': 81,
      'Total Expenses': 65,
      'Operating Cash Flow': 50,
      'POS Module': 80,
      'HR ': 60
    },
    '2022': {
      'Total Revenue': 82,
      'Net Profit': 49,
      'Total Loss': 70,
      'Total Expenses': 83,
      'Operating Cash Flow': 40,
       'POS Module': 74,
      'HR': 100
    }
  };

  // --- Donut Chart Data and Options ---
  categoryData = [
    { category: 'Electronics', value: 45 },
    { category: 'Clothing', value: 28 },
    { category: 'Food & Beverages', value: 15 },
    { category: 'Home & Garden', value: 10 },
    { category: 'Others', value: 2 }
  ];

  donutChart: any;

  constructor() {
    this.filteredReports = [...this.allReports];
    this.autoGenerateStatements();
  }

  ngAfterViewInit() {
    // Revenue vs Expenses Line Chart
    const revenueCtx = document.getElementById('revenueChart') as HTMLCanvasElement;
    if (revenueCtx) {
      new Chart(revenueCtx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            {
              label: 'Revenue',
              data: [100000, 20000, 30000, 50000, 80000, 100000],
              borderColor: '#4F8CFF',
              backgroundColor: 'rgba(79,140,255,0.08)',
              tension: 0.4,
              pointBackgroundColor: '#4F8CFF',
              fill: true
            },
            {
              label: 'Expenses',
              data: [60000, 52000, 39000, 28000, 60000, 70000],
              borderColor: '#FF8C4F',
              backgroundColor: 'rgba(255,140,79,0.08)',
              tension: 0.4,
              pointBackgroundColor: '#FF8C4F',
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              onClick: (e, legendItem, legend) => {
                const ci = legend.chart;
                const index = legendItem.datasetIndex;
                if (typeof index !== 'number') return;
                const meta = ci.getDatasetMeta(index);
                meta.hidden = !meta.hidden;
                ci.update();
              }
            },
            tooltip: {
              enabled: true,
              callbacks: {
                label: function(context) {
                  return ` ${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
                }
              }
            }
          },
          interaction: {
            mode: 'nearest',
            intersect: false
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    // --- Donut Chart for Category Distribution ---
    this.renderCategoryDonutChart();

    // Expense Breakdown Doughnut Chart
    const expenseCtx = document.getElementById('expenseChart') as HTMLCanvasElement;
    if (expenseCtx) {
      new Chart(expenseCtx, {
        type: 'doughnut',
        data: {
          labels: ['Payroll', 'HR', 'POS', 'Marketing'],
          datasets: [{
            data: [35000, 25000, 12000, 18000],
            backgroundColor: [
              '#4F8CFF', // Payroll
              '#6FE7C1', // HR
              '#FFC36F', // POS
              '#FF8C4F'  // Marketing
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          cutout: '70%',
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              onClick: (e, legendItem, legend) => {
                const ci = legend.chart;
                const index = legendItem.datasetIndex;
                if (typeof index !== 'number') return;
                const meta = ci.getDatasetMeta(index);
                meta.hidden = !meta.hidden;
                ci.update();
              }
            },
            tooltip: {
              enabled: true,
              callbacks: {
                label: function(context) {
                  return ` ${context.label}: ${context.parsed.toLocaleString()}`;
                }
              }
            }
          }
        }
      });
    }

    this.renderComparativeChart();
  }

   renderCategoryDonutChart() {
    const ctx = document.getElementById('categoryDonutChart') as HTMLCanvasElement | null;
    if (!ctx) return;
    if (this.donutChart) {
      this.donutChart.destroy();
    }
    const total = this.categoryData.reduce((sum, item) => sum + item.value, 0);
    this.donutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.categoryData.map(item => item.category),
        datasets: [{
          data: this.categoryData.map(item => item.value),
          backgroundColor: ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        cutout: '70%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              font: {
                size: 14,
                weight: 'bold'
              },
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const percent = ((value / total) * 100).toFixed(1);
                return ` ${context.label}: ${percent}% (${value})`;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'centerText',
        beforeDraw: (chart: any) => {
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const total = chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
          const centerX = (chartArea.left + chartArea.right) / 2;
          const centerY = (chartArea.top + chartArea.bottom) / 2;
          ctx.save();
          ctx.font = 'bold 18px Inter, sans-serif';
          ctx.fillStyle = '#222';
          ctx.textAlign = 'center';
          ctx.fillText('Total', centerX, centerY - 10);
          ctx.font = 'bold 28px Inter, sans-serif';
          ctx.fillText(total.toString(), centerX, centerY + 20);
          ctx.restore();
        }
      }]
    });
  }

  renderComparativeChart() {
    const ctx = document.getElementById('comparativeChart') as HTMLCanvasElement | null;
    if (!ctx) return;
    if (this.comparativeChart) {
      this.comparativeChart.destroy();
    }

    // Naira amounts data (replace with your actual values)
    const nairaAmounts: { [period: string]: { [metric: string]: number } } = {
      '2023': {
        'Total Revenue': 8500000,
        'Net Profit': 9500000,
        'Total Loss': 8100000,
        'Total Expenses': 6500000,
        'Operating Cash Flow': 5000000,
        'POS module': 8000000,
        'HR': 6000000
      },
      '2022': {
        'Total Revenue': 8200000,
        'Net Profit': 4900000,
        'Total Loss': 7000000,
        'Total Expenses': 8300000,
        'Operating Cash Flow': 4000000,
        'POS Module': 7400000,
        'HR': 5000000
      }
    };

    const period1 = this.selectedPeriod1;
    const period2 = this.selectedPeriod2;
    const labels = Object.keys(this.comparativeData[period1]);
    const data1 = Object.values(this.comparativeData[period1]);
    const data2 = Object.values(this.comparativeData[period2]);

    this.comparativeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: period1,
            data: data1,
            backgroundColor: '#2471A3',
            borderColor: '#2471A3',
            borderWidth: 1
          },
          {
            label: period2,
            data: data2,
            backgroundColor: '#F39C12',
            borderColor: '#F39C12',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            onClick: (e, legendItem, legend) => {
              const ci = legend.chart;
              const index = legendItem.datasetIndex;
              if (typeof index !== 'number') return;
              const meta = ci.getDatasetMeta(index);
              meta.hidden = !meta.hidden;
              ci.update();
            }
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (context: any) => {
                const datasetLabel = context.dataset.label || '';
                const period = datasetLabel === period1 ? period1 : period2;
                const nairaValue = nairaAmounts[period][context.label as string] ?? 0;
                return [
                  `${context.dataset.label}: ${context.parsed.y}%`,
                  `Amount: ₦${nairaValue.toLocaleString()}`
                ];
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value: string | number) => {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  applyPeriodComparison() {
    this.periodModalOpen = false;
    setTimeout(() => this.renderComparativeChart(), 100); // Ensure modal closes before re-render
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

  downloadReport(report: Report): void {
    
  }

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