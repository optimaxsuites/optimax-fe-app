import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { 
  ApexNonAxisChartSeries,
  ApexChart, 
  ApexResponsive, 
  ApexLegend, 
  ApexAxisChartSeries, 
  ApexXAxis, 
  ApexDataLabels, 
  ApexStroke, 
  ApexYAxis, 
  ApexTitleSubtitle 
} from 'ng-apexcharts';

export type PieChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  responsive: ApexResponsive[];
  legend: ApexLegend;
};

export type LineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-balance-sheet',
  templateUrl: './balance-sheet.component.html',
  styleUrls: ['./balance-sheet.component.scss']
})
export class BalanceSheetComponent implements OnInit {
  // Form Controls
  balanceSheetForm: FormGroup;
  isFullScreen = false;
  isUpdating = false;
  lastUpdated: Date = new Date();
  searchFilter = '';
  isModalOpen = false;
  newComment = '';
  isEditing = false;
  isBalanced = true;
  asOfDate: string = this.formatDate(new Date());
  reportStatus: 'Compiling' | 'Under Review' | 'Completed' = 'Compiling';

  simulateReportStatusFlow() {
  this.reportStatus = 'Compiling';

  // After 10 seconds → Under Review
  setTimeout(() => {
    this.reportStatus = 'Under Review';
  }, 10000);

  // After 30 seconds total → Completed
  setTimeout(() => {
    this.reportStatus = 'Completed';
  }, 30000);
}



  // Dummy Data Stores
  entityName = 'Acme Corporation Ltd.';
  savedReports: any[] = [];
  userComments = [
    { user: 'Finance Team', text: 'Q2 shows strong asset growth', date: new Date('2025-05-15') },
    { user: 'Auditor', text: 'Verify non-current assets valuation', date: new Date('2025-05-20') }
  ];

  // Period Data
  periods = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2025, i, 1).toLocaleString('default', { month: 'long' }),
    year: 2025
  }));
  selectedPeriod = this.periods[new Date().getMonth()];
  years = [2023, 2024, 2025];
  selectedYear = 2025;

  // Balance Sheet Data with base values
  baseData = {
    assets: {
      current: {
        cash: 45000,
        accountsReceivable: 75000,
        inventory: 30000,
        prepaidExpenses: 5000,
        total: 155000
      },
      nonCurrent: {
        property: 200000,
        equipment: 120000,
        investments: 30000,
        intangibleAssets: 50000,
        total: 400000
      },
      total: 555000
    },
    liabilities: {
      current: {
        accountsPayable: 40000,
        shortTermDebt: 30000,
        accruedExpenses: 10000,
        total: 80000
      },
      nonCurrent: {
        longTermDebt: 90000,
        deferredTax: 20000,
        leaseObligations: 10000,
        total: 120000
      },
      total: 200000
    },
    equity: {
      commonStock: 150000,
      retainedEarnings: 195000,
      otherComprehensiveIncome: 10000,
      total: 355000
    }
  };

  balanceSheetData = {...this.baseData};

  // Analytics Calculations
  analytics = {
    workingCapital: 0,
    debtToEquity: '0',
    currentRatio: '0',
    quickRatio: '0',
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0
  };

  // Chart Data
  assetChartData = {
    series: [] as number[],
    labels: ['Current Assets', 'Non-Current Assets']
  };

  liabilityTrendData = {
    series: [] as any[],
    categories: ['Q1', 'Q2', 'Q3', 'Q4']
  };

  // Key Findings Autogeneration
  keyFindings: string[] = [];

  // Chart Options
  public pieChartOptions: Partial<PieChartOptions>;
  public lineChartOptions: Partial<LineChartOptions>;

  constructor(private fb: FormBuilder) {
    this.balanceSheetForm = this.fb.group({
      entityName: [this.entityName],
      asOfDate: [new Date()],
      selectedYear: [2025]
    });

    // Initialize chart options
    this.pieChartOptions = {
      series: [],
      chart: {
        type: 'pie',
        height: 350
      },
      labels: ['Current Assets', 'Non-Current Assets'],
      responsive: [{
        breakpoint: 480,
        options: {
          chart: { width: 200 },
          legend: { position: 'bottom' }
        }
      }],
      legend: { position: 'right' }
    };

    this.lineChartOptions = {
      series: [],
      chart: {
        height: 350,
        type: 'line',
        zoom: { enabled: false }
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      title: { text: 'Liabilities Over Time', align: 'left' },
      xaxis: { categories: [] },
      yaxis: { 
        labels: { 
          formatter: (val) => `₦${val.toLocaleString()}` 
        } 
      }
    };

    this.generateHistoricalData();
  }

  ngOnInit(): void {
    // this.initSavedReports();
    this.updateAllCalculations();
    this.updateCharts();
    this.simulateReportStatusFlow();
  }

  



  saveReport() {
    const report = {
      ...this.balanceSheetData,
      analytics: this.analytics,
      metadata: {
        period: this.selectedPeriod,
        savedAt: new Date(),
        generatedBy: 'System'
      }
    };

    this.savedReports.unshift(report);
    this.showToast('Report saved successfully');

    if (this.selectedPeriod.month === 'December') {
      this.generateAnnualReport();
    }
  }

  private generateAnnualReport() {
    const annualData = {
      ...this.balanceSheetData,
      year: this.selectedPeriod.year,
      type: 'ANNUAL_SUMMARY'
    };
    this.showToast('Annual report auto-generated');
  }


  
  updateReport() {
    this.isUpdating = true;
    
    setTimeout(() => {
      
      Object.keys(this.balanceSheetData.assets.current).forEach(key => {
        if (key !== 'total') {
          const typedKey = key as keyof typeof this.balanceSheetData.assets.current;
          this.balanceSheetData.assets.current[typedKey] = this.randomize(
            this.baseData.assets.current[typedKey], 
            10
          );
        }
      });

      Object.keys(this.balanceSheetData.liabilities.current).forEach(key => {
  if (key !== 'total') {
    const typedKey = key as keyof typeof this.balanceSheetData.liabilities.current;
    this.balanceSheetData.liabilities.current[typedKey] = this.randomize(
      this.baseData.liabilities.current[typedKey],
      10
    );
  }
});


      this.updateAllCalculations();
      this.updateCharts();
      
      this.lastUpdated = new Date();
      this.asOfDate = this.formatDate(this.lastUpdated);
      this.balanceSheetForm.patchValue({ asOfDate: this.lastUpdated });
      this.isUpdating = false;
      this.showToast('Data updated successfully');
    }, 2000);
  }

 

  private updateAllCalculations() {
    // Update totals first
    this.balanceSheetData.assets.current.total = 
      this.balanceSheetData.assets.current.cash +
      this.balanceSheetData.assets.current.accountsReceivable +
      this.balanceSheetData.assets.current.inventory +
      this.balanceSheetData.assets.current.prepaidExpenses;

    this.balanceSheetData.assets.nonCurrent.total =
      this.balanceSheetData.assets.nonCurrent.property +
      this.balanceSheetData.assets.nonCurrent.equipment +
      this.balanceSheetData.assets.nonCurrent.investments +
      this.balanceSheetData.assets.nonCurrent.intangibleAssets;

    this.balanceSheetData.assets.total =
      this.balanceSheetData.assets.current.total +
      this.balanceSheetData.assets.nonCurrent.total;

    this.balanceSheetData.liabilities.current.total =
      this.balanceSheetData.liabilities.current.accountsPayable +
      this.balanceSheetData.liabilities.current.shortTermDebt +
      this.balanceSheetData.liabilities.current.accruedExpenses;

    this.balanceSheetData.liabilities.total =
      this.balanceSheetData.liabilities.current.total +
      this.balanceSheetData.liabilities.nonCurrent.total;

    this.balanceSheetData.equity.total =
      this.balanceSheetData.equity.commonStock +
      this.balanceSheetData.equity.retainedEarnings +
      this.balanceSheetData.equity.otherComprehensiveIncome;

    // Update analytics
    this.analytics = {
      workingCapital: this.balanceSheetData.assets.current.total - 
                     this.balanceSheetData.liabilities.current.total,
      debtToEquity: (this.balanceSheetData.liabilities.total / 
                    this.balanceSheetData.equity.total).toFixed(2),
      currentRatio: (this.balanceSheetData.assets.current.total / 
                    this.balanceSheetData.liabilities.current.total).toFixed(2),
      quickRatio: ((this.balanceSheetData.assets.current.total - 
                  this.balanceSheetData.assets.current.inventory) / 
                  this.balanceSheetData.liabilities.current.total).toFixed(2),
      totalAssets: this.balanceSheetData.assets.total,
      totalLiabilities: this.balanceSheetData.liabilities.total,
      totalEquity: this.balanceSheetData.equity.total
    };

    this.keyFindings = this.generateKeyFindings();
  }

  private generateKeyFindings() {
    const assetsGrowth = ((this.analytics.totalAssets - 500000) / 500000 * 100).toFixed(1);
    const liabilityRatio = (this.analytics.totalLiabilities / this.analytics.totalAssets * 100).toFixed(1);
    
    return [
      `Total assets grew by ${assetsGrowth}% year-to-date`,
      `Liability-to-asset ratio at ${liabilityRatio}%`,
      this.balanceSheetData.assets.current.cash > 50000 ? 
        'Strong cash position maintained' : 
        'Review cash flow management',
      +this.analytics.currentRatio > 2 ? 
        'Healthy current ratio' : 
        'Monitor short-term obligations',
      `Working capital: ₦${this.analytics.workingCapital.toLocaleString()}`
    ];
  }



  private updateCharts() {
    // Update pie chart
    this.assetChartData.series = [
      this.balanceSheetData.assets.current.total,
      this.balanceSheetData.assets.nonCurrent.total
    ];
    this.pieChartOptions.series = this.assetChartData.series;

    // Update line chart with quarterly data based on current month
    const monthIndex = this.periods.findIndex(p => 
      p.month === this.selectedPeriod.month
    );
    const quarter = Math.floor(monthIndex / 3) + 1;
    
    // Generate trend data based on current values
    const baseValue = this.balanceSheetData.liabilities.total;
    this.liabilityTrendData.series = [{
      name: 'Total Liabilities',
      data: [
        baseValue * 0.85,
        baseValue * 0.92,
        baseValue * 0.96,
        baseValue
      ]
    }];
    
    this.lineChartOptions.series = this.liabilityTrendData.series;
  }



  onPeriodChange(period: any) {
    this.selectedPeriod = period;
    const monthIndex = this.periods.findIndex(p => 
      p.month === period.month && p.year === period.year
    );
    
    
    const multiplier = 1 + (monthIndex * 0.08); 
    
    // Update all values based on base data
    Object.keys(this.baseData.assets.current).forEach(key => {
      if (key !== 'total') {
        const typedKey = key as keyof typeof this.balanceSheetData.assets.current;
        this.balanceSheetData.assets.current[typedKey] = 
          Math.round(this.baseData.assets.current[typedKey] * multiplier);
      }
    });

    Object.keys(this.baseData.liabilities.current).forEach(key => {
      if (key !== 'total') {
        const typedKey = key as keyof typeof this.balanceSheetData.liabilities.current;
        this.balanceSheetData.liabilities.current[typedKey] = 
          Math.round(this.baseData.liabilities.current[typedKey] * multiplier * 0.9); // Liabilities grow slightly slower
      }
    });

    // Update date display
    this.asOfDate = `${period.month} 30, ${period.year}`;
    
    this.updateAllCalculations();
    this.updateCharts();
    this.showToast(`Loaded ${period.month} data`);
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    // Adjust base values for year change
    const yearMultiplier = 1 + (year - 2023) * 0.15; 
    
    Object.keys(this.baseData.assets.current).forEach(key => {
      if (key !== 'total') {
        const typedKey = key as keyof typeof this.baseData.assets.current;
        this.baseData.assets.current[typedKey] =
          Math.round(this.baseData.assets.current[typedKey] * yearMultiplier); 
          
      }
    });

    this.updateAllCalculations();
    this.updateCharts();
    this.showToast(`Showing ${year} data`);
  }

 

  toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }

  downloadTable() {
    const tableData = {
      ...this.balanceSheetData,
      analytics: this.analytics,
      asOfDate: this.asOfDate
    };
    
    const blob = new Blob([JSON.stringify(tableData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${this.asOfDate.replace(/[ ,]/g, '-')}.json`;
    a.click();
  }

  shareReport() {
    const shareData = {
      title: `${this.entityName} Balance Sheet`,
      text: `Balance Sheet as of ${this.asOfDate}\n` +
            `Total Assets: ₦${this.analytics.totalAssets.toLocaleString()}\n` +
            `Total Liabilities: ₦${this.analytics.totalLiabilities.toLocaleString()}\n` +
            `Equity: ₦${this.analytics.totalEquity.toLocaleString()}`,
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData).catch((e) => {
        this.showToast('Sharing failed: ' + e.message);
      });
    } else {
      const text = `${shareData.title}\n${shareData.text}`;
      prompt('Copy this report data:', text);
      this.showToast('Report data copied to clipboard');
    }
  }

  postComment() {
    if (this.newComment.trim()) {
      this.userComments.unshift({
        user: 'Current User',
        text: this.newComment,
        date: new Date()
      });
      this.newComment = '';
      this.showToast('Comment added');
    }
  }



  private generateHistoricalData() {
    this.savedReports = this.periods.map((period, index) => {
      const multiplier = 1 + (index * 0.08);
      return {
        assets: {
          current: {
            cash: Math.round(this.baseData.assets.current.cash * multiplier),
            accountsReceivable: Math.round(this.baseData.assets.current.accountsReceivable * multiplier),
            inventory: Math.round(this.baseData.assets.current.inventory * multiplier),
            prepaidExpenses: Math.round(this.baseData.assets.current.prepaidExpenses * multiplier),
            total: Math.round(this.baseData.assets.current.total * multiplier)
          },
          nonCurrent: {
            property: Math.round(this.baseData.assets.nonCurrent.property * multiplier),
            equipment: Math.round(this.baseData.assets.nonCurrent.equipment * multiplier),
            investments: Math.round(this.baseData.assets.nonCurrent.investments * multiplier),
            intangibleAssets: Math.round(this.baseData.assets.nonCurrent.intangibleAssets * multiplier),
            total: Math.round(this.baseData.assets.nonCurrent.total * multiplier)
          },
          total: Math.round(this.baseData.assets.total * multiplier)
        },
        metadata: {
          period,
          savedAt: new Date(2025, index, 15)
        }
      };
    });
  }

  // private initSavedReports() {
  //   if (this.savedReports.length === 0) {
  //     this.savedReports = this.generateHistoricalData();
  //   }
  // }

  openSavedReport(report: any) {
    this.selectedPeriod = report.metadata.period;
    this.balanceSheetData = {...report};
    this.asOfDate = this.formatDate(report.metadata.savedAt);
    this.updateAllCalculations();
    this.updateCharts();
    this.showToast(`Loaded ${report.metadata.period.month} report`);
  }


  private randomize(base: number, percentVariation: number): number {
    const variation = base * (percentVariation / 100);
    return Math.round(base + (Math.random() * variation * 2) - variation);
  }

  private showToast(message: string) {
    console.log('UI Toast:', message);
    // Implement actual toast notification here
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}