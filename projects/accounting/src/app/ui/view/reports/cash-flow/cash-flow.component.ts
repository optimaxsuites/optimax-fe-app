import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// --- Interface Definitions ---
interface CashFlowItem {
  description: string;
  amount: number;
  category: 'operating' | 'investing' | 'financing' | 'tax' | 'forex';
  type: 'inflow' | 'outflow';
  indentLevel: number;
  isTotal?: boolean;
}

interface TaxBreakdown {
  cit: number;
  vat: number;
  wht: number;
  educationTax: number;
  total: number;
}

interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  percentage: number;
}

interface ReconciliationData {
  netIncome: number;
  depreciation: number;
  changesInWorkingCapital: number;
  nonCashItems: number;
  calculatedOperatingCash: number;
}

interface ComplianceData {
  frsCompliant: boolean;
  taxCompliant: boolean;
  lastSubmission: string;
  nextDeadline: string;
}

interface WorkingCapitalItem {
  account: string;
  change: number;
  effect: 'source' | 'use';
}

interface MetricDetail {
  title: string;
  definition: string;
  formula: string;
  breakdown: { label: string; value: number; type: 'add' | 'subtract' | 'equals' }[];
}

@Component({
  selector: 'app-cash-flow',
  templateUrl: './cash-flow.component.html',
  styleUrls: ['./cash-flow.component.scss']
})
export class CashFlowComponent implements OnInit {
  
  // Reference to the main content for PDF export
  @ViewChild('reportContent', { static: false }) reportContent!: ElementRef;

  // Make Math available in template
  get Math() { return Math; }

  // View Controls
  viewMode: 'direct' | 'indirect' = 'direct';
  activeModal: 'details' | 'definition' | null = null;
  selectedMetric: MetricDetail | null = null;
  periodFilter = '6M';
  chartType = 'bar';
  today: Date = new Date();
  
  // Max amount for trend bar calculation
  private maxCashFlowAmount = 0;

  // Form for filters
  filterForm: FormGroup;
  
  // Data Sources (Backups for filtering)
  private allOperatingActivities: CashFlowItem[] = [];
  private allInvestingActivities: CashFlowItem[] = [];
  private allFinancingActivities: CashFlowItem[] = [];

  // Display Data (Bound to HTML)
  operatingActivities: CashFlowItem[] = [];
  investingActivities: CashFlowItem[] = [];
  financingActivities: CashFlowItem[] = [];
  
  taxBreakdown: TaxBreakdown;
  forexImpact = { gainLoss: -150000, description: 'Exchange rate fluctuations' };
  
  // Reconciliation Data
  reconciliation: ReconciliationData = {
    netIncome: 3200000,
    depreciation: 850000,
    changesInWorkingCapital: -250000,
    nonCashItems: 0,
    calculatedOperatingCash: 3800000
  };
  
  // Metrics
  metrics = {
    netCashFlow: 2450000,
    operatingCashFlow: 3800000,
    investingCashFlow: -1250000,
    financingCashFlow: -100000,
    freeCashFlow: 2550000,
    cashConversionCycle: 45
  };
  
  // Period Comparisons
  comparisons: { [key: string]: PeriodComparison } = {
    netCashFlow: { current: 2450000, previous: 2175000, change: 275000, percentage: 12.6 },
    operating: { current: 3800000, previous: 3510000, change: 290000, percentage: 8.3 },
    investing: { current: -1250000, previous: -1084000, change: -166000, percentage: -15.3 },
    financing: { current: -100000, previous: -360000, change: 260000, percentage: 72.2 }
  };
  
  // Nigerian Compliance
  nigerianCompliance: ComplianceData = {
    frsCompliant: true,
    taxCompliant: true,
    lastSubmission: '2023-12-31',
    nextDeadline: '2024-03-31'
  };
  
  // Working Capital Changes
  workingCapitalChanges: WorkingCapitalItem[] = [
    { account: 'Accounts Receivable', change: -450000, effect: 'use' },
    { account: 'Inventory', change: -300000, effect: 'use' },
    { account: 'Accounts Payable', change: 250000, effect: 'source' },
    { account: 'Accrued Expenses', change: 250000, effect: 'source' }
  ];

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      startDate: ['2023-07-01'],
      endDate: ['2023-12-31'],
      department: ['finance'],
      includeTaxDetails: [true],
      includeForexDetails: [true]
    });
    
    this.taxBreakdown = {
      cit: 1200000,
      vat: 850000,
      wht: 400000,
      educationTax: 250000,
      total: 2700000
    };
  }

  ngOnInit(): void {
    this.initializeData();
    this.calculateMetrics();
    this.calculateMaxFlow();
  }

  private initializeData(): void {
    // Operating Activities (IFRS-compliant)
    this.allOperatingActivities = [
      { description: 'Cash Received from Customers', amount: 16400000, category: 'operating', type: 'inflow', indentLevel: 1 },
      { description: 'Cash Paid to Suppliers/Employees', amount: -12200000, category: 'operating', type: 'outflow', indentLevel: 1 },
      { description: 'Interest Received', amount: 180000, category: 'operating', type: 'inflow', indentLevel: 1 },
      { description: 'Dividends Received', amount: 120000, category: 'operating', type: 'inflow', indentLevel: 1 },
      { description: 'Interest Paid', amount: -450000, category: 'operating', type: 'outflow', indentLevel: 1 },
      { description: 'Tax Paid (Total)', amount: -2700000, category: 'tax', type: 'outflow', indentLevel: 1 },
      { description: 'Net Cash from Operating Activities', amount: 3800000, category: 'operating', type: 'inflow', indentLevel: 0, isTotal: true }
    ];

    // Investing Activities
    this.allInvestingActivities = [
      { description: 'Purchase of Equipment', amount: -1500000, category: 'investing', type: 'outflow', indentLevel: 1 },
      { description: 'Sale of Assets', amount: 250000, category: 'investing', type: 'inflow', indentLevel: 1 },
      { description: 'Purchase of Investments', amount: -500000, category: 'investing', type: 'outflow', indentLevel: 1 },
      { description: 'Net Cash from Investing Activities', amount: -1250000, category: 'investing', type: 'outflow', indentLevel: 0, isTotal: true }
    ];

    // Financing Activities
    this.allFinancingActivities = [
      { description: 'Loans Received', amount: 1000000, category: 'financing', type: 'inflow', indentLevel: 1 },
      { description: 'Loans Repaid', amount: -800000, category: 'financing', type: 'outflow', indentLevel: 1 },
      { description: 'Dividends Paid', amount: -300000, category: 'financing', type: 'outflow', indentLevel: 1 },
      { description: 'Net Cash from Financing Activities', amount: -100000, category: 'financing', type: 'outflow', indentLevel: 0, isTotal: true }
    ];

    // Initial assignment
    this.operatingActivities = [...this.allOperatingActivities];
    this.investingActivities = [...this.allInvestingActivities];
    this.financingActivities = [...this.allFinancingActivities];
  }

  private calculateMetrics(): void {
    // Calculate Free Cash Flow (Operating Cash - Capex)
    const capex = this.allInvestingActivities
      .filter(item => item.description.includes('Purchase') && item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
    this.metrics.freeCashFlow = this.metrics.operatingCashFlow - capex;
    
    // Recalculate Working Capital Change for reconciliation accuracy
    this.reconciliation.changesInWorkingCapital = this.workingCapitalChanges.reduce((sum, item) => {
      // Source adds cash, Use removes cash
      return item.effect === 'source' ? sum + item.change : sum - Math.abs(item.change);
    }, 0);
  }

  // Find the largest absolute value to scale the trend bars
  private calculateMaxFlow(): void {
    const allItems = [
      ...this.allOperatingActivities, 
      ...this.allInvestingActivities, 
      ...this.allFinancingActivities
    ];
    this.maxCashFlowAmount = Math.max(...allItems.map(i => Math.abs(i.amount)));
  }

  // --- 1. PDF DOWNLOAD (Full Page) ---
  public async exportToPDF(): Promise<void> {
    if (!this.reportContent) {
      alert('Report content not available. Please try again.');
      return;
    }
    
    const element = this.reportContent.nativeElement;
    
    // Show loading state
    document.body.style.cursor = 'wait';

    try {
      // Import html2canvas dynamically to avoid initial bundle size
      const html2canvas = await import('html2canvas');
      
      const canvas = await html2canvas.default(element, { 
        scale: 2, // Scale 2 for high quality
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Import jsPDF dynamically
      const { default: jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Add footer with FIRS compliance info
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`FIRS Compliant Report | Generated on ${new Date().toLocaleDateString()}`, pdfWidth / 2, pdfHeight + 10, { align: 'center' });
      
      pdf.save(`CashFlow_Report_${this.filterForm.get('endDate')?.value}.pdf`);
      
      console.log('PDF generated successfully with FIRS compliance format');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      document.body.style.cursor = 'default';
    }
  }

  // --- 2. NATIVE SHARE (WhatsApp, Mail, etc.) ---
  public shareReport(): void {
    const shareData = {
      title: 'Cash Flow Statement - Nigerian Operations',
      text: `Cash Flow Report (${this.filterForm.get('startDate')?.value} - ${this.filterForm.get('endDate')?.value}). Net Cash Flow: ${this.formatCurrency(this.metrics.netCashFlow)} | FIRS Status: ${this.nigerianCompliance.taxCompliant ? 'Compliant' : 'Non-Compliant'}`,
      url: window.location.href
    };

    if (navigator.share) {
      // This triggers the native OS share sheet (WhatsApp, Mail, Messages, etc.)
      navigator.share(shareData)
        .then(() => console.log('Shared successfully'))
        .catch((err) => console.log('Error sharing:', err));
    } else {
      // Fallback: Copy to clipboard and show alert
      const textToCopy = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert('Report link copied to clipboard!');
      });
    }
  }

  // --- 3. EXCEL EXPORT (Simulated File Download) ---
  exportToExcel(): void {
    // Create CSV content (in real app, use 'xlsx' library for proper Excel format)
    const csvRows = [];
    
    // Add headers
    csvRows.push(['Cash Flow Statement', '', '', '']);
    csvRows.push(['Period:', `${this.filterForm.get('startDate')?.value} to ${this.filterForm.get('endDate')?.value}`, '', '']);
    csvRows.push(['Generated:', new Date().toISOString().split('T')[0], '', '']);
    csvRows.push([]);
    
    // Add operating activities
    csvRows.push(['Operating Activities', 'Amount (NGN)', 'Category', 'Type']);
    this.operatingActivities.forEach(item => {
      csvRows.push([item.description, item.amount.toString(), item.category, item.type]);
    });
    csvRows.push([]);
    
    // Add investing activities
    csvRows.push(['Investing Activities', 'Amount (NGN)', 'Category', 'Type']);
    this.investingActivities.forEach(item => {
      csvRows.push([item.description, item.amount.toString(), item.category, item.type]);
    });
    csvRows.push([]);
    
    // Add financing activities
    csvRows.push(['Financing Activities', 'Amount (NGN)', 'Category', 'Type']);
    this.financingActivities.forEach(item => {
      csvRows.push([item.description, item.amount.toString(), item.category, item.type]);
    });
    csvRows.push([]);
    
    // Add metrics
    csvRows.push(['Key Metrics', 'Value (NGN)', '', '']);
    Object.entries(this.metrics).forEach(([key, value]) => {
      if (typeof value === 'number') {
        csvRows.push([this.formatMetricName(key), value.toString(), '', '']);
      }
    });
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `CashFlow_Statement_${this.filterForm.get('endDate')?.value}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    console.log('Excel export initiated');
  }

  // --- 4. INTERACTIVE CARDS & DEFINITIONS ---
  
  // Logic to show "How calculation came about"
  openMetricDetails(type: 'net' | 'operating' | 'free'): void {
    if (type === 'net') {
      this.selectedMetric = {
        title: 'Net Cash Flow',
        definition: 'The total change in cash position resulting from operating, investing, and financing activities. Shows the net increase or decrease in cash for the period.',
        formula: 'Operating Cash + Investing Cash + Financing Cash',
        breakdown: [
          { label: 'Operating Activities', value: this.metrics.operatingCashFlow, type: 'add' },
          { label: 'Investing Activities', value: this.metrics.investingCashFlow, type: 'add' },
          { label: 'Financing Activities', value: this.metrics.financingCashFlow, type: 'add' },
          { label: 'Net Cash Flow', value: this.metrics.netCashFlow, type: 'equals' }
        ]
      };
    } else if (type === 'operating') {
      this.selectedMetric = {
        title: 'Operating Cash Flow',
        definition: 'Cash generated from normal business operations. Indicates whether a company can generate sufficient positive cash flow to maintain and grow operations.',
        formula: 'Net Income + Non-Cash Items + Changes in Working Capital',
        breakdown: [
          { label: 'Net Income', value: this.reconciliation.netIncome, type: 'add' },
          { label: 'Depreciation (Non-cash)', value: this.reconciliation.depreciation, type: 'add' },
          { label: 'Working Capital Change', value: this.reconciliation.changesInWorkingCapital, type: 'add' },
          { label: 'Operating Cash Flow', value: this.reconciliation.calculatedOperatingCash, type: 'equals' }
        ]
      };
    } else if (type === 'free') {
       // Calculate CAPEX dynamically
       const capex = Math.abs(this.allInvestingActivities
        .filter(i => i.description.includes('Purchase'))
        .reduce((sum, i) => sum + i.amount, 0));

      this.selectedMetric = {
        title: 'Free Cash Flow',
        definition: 'The cash a company generates after accounting for cash outflows to support operations and maintain capital assets. Important for assessing financial health and expansion capabilities.',
        formula: 'Operating Cash Flow - Capital Expenditures (CAPEX)',
        breakdown: [
          { label: 'Operating Cash Flow', value: this.metrics.operatingCashFlow, type: 'add' },
          { label: 'Capital Expenditures', value: -capex, type: 'subtract' },
          { label: 'Free Cash Flow', value: this.metrics.freeCashFlow, type: 'equals' }
        ]
      };
    }
    this.activeModal = 'details';
  }

  // Logic to show just the definition (Info Icon)
  showDefinition(event: Event, type: 'net' | 'operating' | 'free'): void {
    event.stopPropagation(); // PREVENTS the card click from firing
    this.openMetricDetails(type);
    this.activeModal = 'definition'; // Switch mode to just definition
  }

  closeModal(): void {
    this.activeModal = null;
    this.selectedMetric = null;
  }

  // --- 5. SEARCH FILTER ---
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();

    if (!filterValue) {
      this.operatingActivities = [...this.allOperatingActivities];
      this.investingActivities = [...this.allInvestingActivities];
      this.financingActivities = [...this.allFinancingActivities];
      return;
    }

    const filterFunc = (item: CashFlowItem) => 
      item.description.toLowerCase().includes(filterValue) || 
      item.isTotal; // Always keep totals

    this.operatingActivities = this.allOperatingActivities.filter(filterFunc);
    this.investingActivities = this.allInvestingActivities.filter(filterFunc);
    this.financingActivities = this.allFinancingActivities.filter(filterFunc);
  }

  // --- Public Methods ---

  // Calculates percentage width for the visual bar in the table
  getTrendWidth(amount: number): number {
    if (this.maxCashFlowAmount === 0) return 0;
    // Return a percentage (0-100), minimum 1% for visibility
    return Math.max(1, (Math.abs(amount) / this.maxCashFlowAmount) * 100);
  }

  // Toggle view mode
  toggleViewMode(mode: 'direct' | 'indirect'): void {
    this.viewMode = mode;
    // Optional: Recalculate data based on view mode
    console.log(`View mode switched to: ${mode}`);
  }

  // Get section total
  getSectionTotal(items: CashFlowItem[]): number {
    // Return the value of the item marked as Total
    const totalItem = items.find(i => i.isTotal);
    return totalItem ? totalItem.amount : 0;
  }

  // Format currency (Nigerian Naira)
  formatCurrency(amount: number): string {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(absAmount);
    
    return amount < 0 ? `(${formatted})` : formatted;
  }

  // Format metric name for display
  private formatMetricName(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('Cash Flow', 'Cash Flow');
  }

  // Get CSS class based on amount
  getAmountClass(amount: number): string {
    if (amount > 0) return 'positive';
    if (amount < 0) return 'negative';
    return 'neutral';
  }

  // Calculate working capital total
  getWorkingCapitalTotal(): number {
    return this.workingCapitalChanges.reduce((sum, item) => {
      return item.effect === 'source' ? sum + item.change : sum - Math.abs(item.change);
    }, 0);
  }

  // Generate FIRS-compliant report
  generateFIRSReport(): void {
    console.log('Generating FIRS-compliant tax report');
    
    // Create a summary for the alert
    const reportSummary = `
FIRST TAX COMPLIANCE REPORT
===========================
Period: ${this.filterForm.get('startDate')?.value} to ${this.filterForm.get('endDate')?.value}

Tax Breakdown:
- CIT: ${this.formatCurrency(this.taxBreakdown.cit)}
- VAT: ${this.formatCurrency(this.taxBreakdown.vat)}
- WHT: ${this.formatCurrency(this.taxBreakdown.wht)}
- Education Tax: ${this.formatCurrency(this.taxBreakdown.educationTax)}
- TOTAL: ${this.formatCurrency(this.taxBreakdown.total)}

Compliance Status: ${this.nigerianCompliance.taxCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
Last Submission: ${this.nigerianCompliance.lastSubmission}
Next Deadline: ${this.nigerianCompliance.nextDeadline}

Report generated for FIRS submission on ${new Date().toLocaleDateString()}
    `;
    
    alert(reportSummary);
    
    // In a real implementation, this would generate actual PDF with specific FIRS format
    // and potentially submit via API to FIRS portal
  }

  // Validation: Check if cash flow reconciles
  validateReconciliation(): boolean {
    const calculated = this.reconciliation.netIncome + 
                      this.reconciliation.depreciation + 
                      this.reconciliation.changesInWorkingCapital;
    
    const isValid = Math.abs(calculated - this.reconciliation.calculatedOperatingCash) < 1000;
    
    // Show alert if called via button click
    if (arguments.length === 0 && (window.event?.type === 'click')) {
        alert(isValid 
          ? '✅ SUCCESS: Reconciliation balances correctly against Net Income.' 
          : '⚠️ WARNING: Discrepancy detected in reconciliation figures.');
    }

    return isValid;
  }

  // Helper to check if item should be bold (total rows)
  isBoldRow(item: CashFlowItem): boolean {
    return item.isTotal || item.indentLevel === 0;
  }

  // Get comparison arrow direction
  getComparisonArrow(percentage: number): string {
    if (percentage > 0) return '↑';
    if (percentage < 0) return '↓';
    return '→';
  }

  // Get comparison color class
  getComparisonClass(percentage: number): string {
    if (percentage > 0) return 'positive';
    if (percentage < 0) return 'negative';
    return 'neutral';
  }
}