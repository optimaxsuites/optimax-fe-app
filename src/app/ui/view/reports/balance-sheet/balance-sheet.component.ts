import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApexNonAxisChartSeries, ApexChart, ApexResponsive, ApexLegend, ApexAxisChartSeries, ApexXAxis, ApexDataLabels, ApexStroke, ApexYAxis, ApexTitleSubtitle } from 'ng-apexcharts';

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
  styleUrl: './balance-sheet.component.scss'
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

  // Balance Sheet Dummy Data 
  balanceSheetData = {
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

  // Analytics Calculations
  analytics = {
    workingCapital: this.balanceSheetData.assets.current.total - this.balanceSheetData.liabilities.current.total,
    debtToEquity: (this.balanceSheetData.liabilities.total / this.balanceSheetData.equity.total).toFixed(2),
    currentRatio: (this.balanceSheetData.assets.current.total / this.balanceSheetData.liabilities.current.total).toFixed(2),
    quickRatio: ((this.balanceSheetData.assets.current.total - this.balanceSheetData.assets.current.inventory) / 
                this.balanceSheetData.liabilities.current.total).toFixed(2)
  };

  // Chart Data
  assetChartData = {
    series: [this.balanceSheetData.assets.current.total, this.balanceSheetData.assets.nonCurrent.total],
    labels: ['Current Assets', 'Non-Current Assets']
  };

  liabilityTrendData = {
    series: [{
      name: 'Total Liabilities',
      data: [175000, 185000, 190000, 200000]
    }],
    categories: ['Q1', 'Q2', 'Q3', 'Q4']
  };

  // Key Findings Autogeneration
  keyFindings = this.generateKeyFindings();

  constructor(private fb: FormBuilder) {
    this.balanceSheetForm = this.fb.group({
      entityName: [this.entityName],
      asOfDate: [new Date()],
      selectedYear: [2025]
    });

    // Generate 12 months of historical dummy data
    this.generateHistoricalData();
  }

  downloadTable(){

  }

  ngOnInit(): void {
    this.initSavedReports();
  }


  saveReport() {
    const report = {
      ...this.balanceSheetData,
      metadata: {
        period: this.selectedPeriod,
        savedAt: new Date(),
        generatedBy: 'System'
      }
    };

    this.savedReports.unshift(report);
    this.showToast('Report saved successfully');

    // Simulate annual report (December only)
    if (this.selectedPeriod.month === 'December') {
      this.generateAnnualReport();
    }
  }

  private generateAnnualReport() {
    const annualData = {
      assets: {
        total: this.balanceSheetData.assets.total * 1.1, 
        breakdown: this.balanceSheetData.assets
      },
      year: this.selectedPeriod.year,
      type: 'ANNUAL_SUMMARY'
    };
    this.showToast('Annual report auto-generated');
  }

  updateReport() {
    this.isUpdating = true;
    
    // Simulate API call
    setTimeout(() => {
      // Randomize data slightly to simulate refresh
      this.balanceSheetData.assets.current.cash = this.randomize(45000, 5);
      this.balanceSheetData.liabilities.current.accountsPayable = this.randomize(40000, 5);
      
      this.lastUpdated = new Date();
      this.balanceSheetForm.patchValue({ asOfDate: this.lastUpdated });
      this.isUpdating = false;
      this.showToast('Data updated successfully');
    }, 2000);
  }



  private generateHistoricalData() {
    this.savedReports = this.periods.map((period, index) => {
      const monthProgress = (index + 1) / 12;
      return {
        assets: {
          current: {
            total: Math.round(140000 + (monthProgress * 30000)),
            breakdown: {
              cash: Math.round(40000 + (monthProgress * 10000)),
              accountsReceivable: Math.round(60000 + (monthProgress * 15000))
            }
          },
          nonCurrent: {
            total: Math.round(380000 + (monthProgress * 20000))
          }
        },
        metadata: {
          period,
          savedAt: new Date(2025, index, 15)
        }
      };
    });
  }

  private generateKeyFindings() {
    const assetsGrowth = ((this.balanceSheetData.assets.total - 500000) / 500000 * 100).toFixed(1);
    const liabilityRatio = (this.balanceSheetData.liabilities.total / this.balanceSheetData.assets.total * 100).toFixed(1);
    
    return [
      `Total assets grew by ${assetsGrowth}% year-to-date`,
      `Liability-to-asset ratio at ${liabilityRatio}%`,
      this.balanceSheetData.assets.current.cash > 50000 ? 
        'Strong cash position maintained' : 
        'Review cash flow management',
      // this.analytics.currentRatio > 2 ? 
      //   'Healthy current ratio' : 
        'Monitor short-term obligations'
    ];
  }

 

  toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
    setTimeout(() => {
      window.dispatchEvent(new Event('resize')); // Refresh charts
    }, 300);
  }

  // async shareReport() {
  //   try {
  //     await Share.share({
  //       title: `${this.entityName} Balance Sheet`,
  //       text: `Balance Sheet as of ${this.selectedPeriod.month} ${this.selectedPeriod.year}`,
  //       url: '',
  //       dialogTitle: 'Share Financial Report'
  //     });
  //   } catch (e) {
  //     console.error('Sharing failed:', e);
  //     this.showToast('Sharing not available');
  //   }
  // }

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


  onPeriodChange(period: any) {
    this.selectedPeriod = period;
    
    // Simulate data change
    const monthIndex = this.periods.findIndex(p => 
      p.month === period.month && p.year === period.year
    );
    
    // Adjust data based on month progression
    const progressFactor = (monthIndex + 1) / 12;
    this.balanceSheetData.assets.current.total = Math.round(140000 + (progressFactor * 30000));
    this.balanceSheetData.liabilities.current.total = Math.round(70000 + (progressFactor * 10000));
    
    this.updateCalculations();
    this.showToast(`Loaded ${period.month} data`);
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    // Simulate chart data change
    this.liabilityTrendData.series[0].data = 
      [170000, 175000, 182000, 190000].map(v => v * (1 + (year - 2023) * 0.15));
    this.showToast(`Showing ${year} trend data`);
  }

  private updateCalculations() {
    this.balanceSheetData.assets.total = 
      this.balanceSheetData.assets.current.total + 
      this.balanceSheetData.assets.nonCurrent.total;
      
    this.analytics = {
      workingCapital: this.balanceSheetData.assets.current.total - this.balanceSheetData.liabilities.current.total,
      debtToEquity: (this.balanceSheetData.liabilities.total / this.balanceSheetData.equity.total).toFixed(2),
      currentRatio: (this.balanceSheetData.assets.current.total / this.balanceSheetData.liabilities.current.total).toFixed(2),
      quickRatio: ((this.balanceSheetData.assets.current.total - this.balanceSheetData.assets.current.inventory) / 
                  this.balanceSheetData.liabilities.current.total).toFixed(2)
    };
    
    this.keyFindings = this.generateKeyFindings();
  }



  private randomize(base: number, percentVariation: number): number {
    const variation = base * (percentVariation / 100);
    return Math.round(base + (Math.random() * variation * 2) - variation);
  }

  private showToast(message: string) {
    console.log('UI Toast:', message); // Replace with actual toast service
  }

  private initSavedReports() {
    // Preload with 3 sample reports
    if (this.savedReports.length === 0) {
      this.savedReports = [
        {
          assets: { total: 520000 },
          metadata: { period: { month: 'April', year: 2025 }, savedAt: new Date('2025-04-15') }
        },
        {
          assets: { total: 480000 },
          metadata: { period: { month: 'March', year: 2025 }, savedAt: new Date('2025-03-15') }
        }
      ];
    }
  }



  openSavedReport(report: any) {
    this.selectedPeriod = report.metadata.period;
    this.balanceSheetData.assets.total = report.assets.total;
    // this.closeModal();
    this.showToast(`Loaded ${report.metadata.period.month} report`);
  }
}