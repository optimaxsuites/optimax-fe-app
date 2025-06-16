import { Component } from '@angular/core';
import { GeneratedReport } from './report.model';

// Add 'data' and 'canAutoGenerate' to the Report interface
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
export class AccountingReportsComponent {
  // Form fields
  reportType = '';
  dateRange = '';
  fromDate = '';
  toDate = '';
  generatedBy = 'Admin';
  

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
    // Bank charge missing
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
      canAutoGenerate: false // Partially auto
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
      canAutoGenerate: false // Partially auto
    }
  ];

  filteredReports: Report[] = [];

  constructor() {
    this.filteredReports = [...this.allReports];
    this.autoGenerateStatements();
  }

  // --- Auto-generation logic for each statement ---
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
    // Implement download logic
  }

  shareReport(report: Report): void {
    // Implement share logic
  }

  editReport(report: Report): void {
    // Implement edit logic
  }

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
        // Attach data for modal view based on report type
        const reportMap: { [key: string]: any } = {
          'Fixed Asset Movement': this.fixedAssetMovements,
          'AR Aging Report': this.arAgingReport,
          'AP Aging Report': this.apAgingReport,
          'Budget vs Actual': this.budgetVsActual,
          'Segment/Department Report': this.segmentDepartmentReport,
          'Inventory Valuation Report': this.inventoryValuationReport,
          'KPI/Ratio Report': this.kpiRatioReport,
          'Deferred Revenue & Prepaids': this.deferredRevenuePrepaids,
          // Add auto-generated statements
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

  // Open report modal
  openReport(report: GeneratedReport) {
    if (report.status === 'Completed') {
      this.selectedReport = report;
      this.modalOpen = true;
    }
  }

  // Close modal
  closeModal() {
    this.modalOpen = false;
    this.selectedReport = null;
  }
}