import { Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexGrid,
  ApexStroke,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexFill,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexPlotOptions,
  ApexYAxis
} from 'ng-apexcharts';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ReportService } from '../../../service/report.service';
import { BranchReportDTO, BranchPerformanceDTO, BranchReportRequestDTO } from '../../../service/report.service';

export type ChartOptions = {
  series?: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart?: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis | ApexYAxis[];
  dataLabels?: ApexDataLabels;
  grid?: ApexGrid;
  stroke?: ApexStroke;
  title?: ApexTitleSubtitle;
  colors?: string[];
  tooltip?: ApexTooltip;
  fill?: ApexFill;
  legend?: ApexLegend;
  responsive?: ApexResponsive[];
  plotOptions?: ApexPlotOptions;
  labels?: string[];
};


@Component({
  selector: 'app-finance-report',
  templateUrl: './finance-report.component.html',
  styleUrl: './finance-report.component.scss'
})

export class FinanceReportComponent {
  filterForm!: FormGroup;
  reportData!: BranchReportDTO;
  selectedBranch!: BranchPerformanceDTO;
  isLoading = false;
  totalCompanyRevenue = 0;
  averageGrowth = 0;
  totalCustomers = 0;
  totalProducts = 0;

  revenueChartOptions!: any;
  growthChartOptions!: any;
  categoryChartOptions!: any;
  trendChartOptions!: any;
  demographicChartOptions!: any;
  trafficChartOptions!: any;

  Math = Math

filterFormOpen = false

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService
  ) {}

ngOnInit(){
  this.initFilterForm();
  this.loadReportData();
}

openFilterForm(){
  this.filterFormOpen = !this.filterFormOpen

}
  getBranchReport(request: BranchReportRequestDTO): Observable<BranchReportDTO> {
  const formattedRequest = {
      startDate: request.startDate.toISOString(),
      endDate: request.endDate.toISOString(),
      compareWithPrevious: request.compareWithPrevious
    };

   return this.reportService.getBranchPerformanceReport(formattedRequest);
  }
  private getMockData(): BranchReportDTO {
    return {
      branches: [
        
      ]
    };
  }

  getBranchMonthlyTrend(branchId: number): Observable<any> {
    
    return of();
  }

  getBranchProductCategories(branchId: number): Observable<any> {
    
    return of();
  }

  getCustomerDemographics(branchId: number): Observable<any> {
    const mockDemographicData = [
      { age: '18-24', male: 12, female: 16, other: 2 },
      { age: '25-34', male: 20, female: 24, other: 3 },
      { age: '35-44', male: 16, female: 18, other: 2 },
      { age: '45-54', male: 14, female: 12, other: 1 },
      { age: '55+', male: 10, female: 8, other: 1 }
    ];
    
    return of(mockDemographicData);
  }

  getHourlyTraffic(branchId: number): Observable<any> {
    
    
    return of();
  }

  initFilterForm(): void {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    this.filterForm = this.fb.group({
      startDate: [lastMonth],
      endDate: [today],
      compareWithPrevious: [true]
    });
  }

  loadReportData(): void {
    this.isLoading = true;
    this.getBranchReport(this.filterForm.value).subscribe({
      next: (data) => {
        this.reportData = data;
        this.calculateSummaryMetrics();
        this.initializeCharts();
        
        if (this.reportData.branches.length > 0) {
          this.selectBranch(this.reportData.branches[0]);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading report data:', error);
        this.isLoading = false;
      }
    });
  }

  calculateSummaryMetrics(): void {
    this.totalCompanyRevenue = this.reportData.branches.reduce((sum, branch) => sum + branch.totalRevenue, 0);
    
    const branchesWithGrowth = this.reportData.branches.filter(b => b.revenueGrowthPercent !== undefined);
    this.averageGrowth = branchesWithGrowth.reduce((sum, branch) => sum + branch?.revenueGrowthPercent, 0) / branchesWithGrowth.length;
    
    this.totalCustomers = this.reportData.branches.reduce((sum, branch) => sum + (branch.customerFootfall || 0), 0);
    this.totalProducts = this.reportData.branches.reduce((sum, branch) => sum + branch.productMovement, 0);
  }

  selectBranch(branch: BranchPerformanceDTO): void {
    this.selectedBranch = branch;
    // this.reportService.getBranchMonthlyTrend(branch.branch.id).subscribe(trendData => {
    //   this.updateTrendChart(trendData);
    // });
    // this.reportService.getBranchProductCategories(branch.branch.id).subscribe(categoryData => {
    //   this.updateCategoryChart(categoryData);
    // });
    // this.reportService.getCustomerDemographics(branch.branch.id).subscribe(demographicData => {
    //   this.updateDemographicChart(demographicData);
    // });
    // this.reportService.getHourlyTraffic(branch.branch.id).subscribe(trafficData => {
    //   this.updateTrafficChart(trafficData);
    // });
  }

  loadBranchDetails(branchId: number): void {
    // Load monthly trend data
    this.getBranchMonthlyTrend(branchId).subscribe(trendData => {
      this.updateTrendChart(trendData);
    });

    // Load product category data
    this.getBranchProductCategories(branchId).subscribe(categoryData => {
      this.updateCategoryChart(categoryData);
    });

    // Load demographic data
    this.getCustomerDemographics(branchId).subscribe(demographicData => {
      this.updateDemographicChart(demographicData);
    });

    // Load hourly traffic data
    this.getHourlyTraffic(branchId).subscribe(trafficData => {
      this.updateTrafficChart(trafficData);
    });
  }

  onFilterChange(): void {
    this.loadReportData();
  }

  initializeCharts(): void {
    const branchNames = this.reportData.branches.map(b => b.branch.name);
    const revenues = this.reportData.branches.map(b => b.totalRevenue);
    const growthRates = this.reportData.branches.map(b => b.revenueGrowthPercent || 0);
    
    // Revenue Comparison Chart
    this.revenueChartOptions = {
      series: [{
        name: 'Revenue',
        data: revenues
      }],
      chart: {
        type: 'bar',
        height: 350,
        fontFamily: 'Inter, sans-serif',
        toolbar: {
          show: false
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },
      colors: ['#3B82F6'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 5,
          dataLabels: {
            position: 'top'
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: branchNames,
        labels: {
          style: {
            colors: '#64748B',
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Revenue ($)',
          style: {
            fontSize: '14px',
            fontWeight: 500,
            color: '#64748B'
          }
        },
        labels: {
          formatter: function (val: number) {
            return val.toFixed(2) + '%';
          },
          style: {
            colors: '#64748B'
          }
        }
      }  
    }
    // Growth Chart
    this.growthChartOptions = {
      series: [{
        name: 'Growth %',
        data: this.reportData.branches.map(b => b.revenueGrowthPercent || 0)
      }],
      chart: {
        type: 'bar',
        height: 350,
        fontFamily: 'Inter, sans-serif',
        toolbar: {
          show: false
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },
      colors: this.reportData.branches.map(b => 
        (b.revenueGrowthPercent || 0) >= 0 ? '#10B981' : '#EF4444'
      ),
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 5,
          distributed: true
        }
      },
      dataLabels: {
        enabled: true,
        formatter: function(val: number) {
          return ( val as number).toFixed(1) + '%';
        },
        style: {
          fontSize: '12px',
          colors: ['#fff']
        },
        background: {
          enabled: true,
          foreColor: '#333',
          padding: 4,
          borderRadius: 2,
          borderWidth: 1,
          borderColor: '#fff',
          opacity: 0.9
        }
      },
      stroke: {
        show: true,
        width: 1,
        colors: ['transparent']
      },
      xaxis: {
        categories: this.reportData.branches.map(b => b.branch.name),
        labels: {
          style: {
            colors: '#64748B',
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Growth (%)',
          style: {
            fontSize: '14px',
            fontWeight: 500,
            color: '#64748B'
          }
        },
        labels: {
          formatter: function (val: number) {
            return val.toFixed(2) + '%';
          },
          style: {
            colors: '#64748B'
          }
        }
      },
      fill: {
        opacity: 1,
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.3,
          gradientToColors: undefined,
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.8,
          stops: [0, 100]
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return val.toFixed(2) + '%'
          }
        }
      }
  }
} 

  updateTrendChart(trendData: any): void {
    this.trendChartOptions = {
      series: [
        {
          name: 'Revenue',
          type: 'line',
          data: trendData.revenue
        },
        {
          name: 'Customers',
          type: 'column',
          data: trendData.customers
        }
      ],
      chart: {
        height: 350,
        type: 'line',
        stacked: false,
        fontFamily: 'Inter, sans-serif',
        toolbar: {
          show: false
        }
      },
      stroke: {
        width: [3, 0],
        curve: 'smooth'
      },
      plotOptions: {
        bar: {
          columnWidth: '50%'
        }
      },
      colors: ['#3B82F6', '#A855F7'],
      fill: {
        opacity: [1, 0.7],
        gradient: {
          inverseColors: false,
          shade: 'light',
          type: 'vertical',
          opacityFrom: 0.85,
          opacityTo: 0.55
        }
      },
      labels: trendData.months,
      xaxis: {
        type: 'category',
        labels: {
          style: {
            colors: '#64748B',
            fontSize: '12px'
          }
        }
      },
      yaxis: [
        {
          title: {
            text: 'Revenue',
            style: {
              fontSize: '14px',
              fontWeight: 500,
              color: '#64748B'
            }
          },
          labels: {
            formatter: function (val: { toLocaleString: () => string; }) {
              return '$' + val.toLocaleString();
            },
            style: {
              colors: '#64748B'
            }
          }
        },
        {
          opposite: true,
          title: {
            text: 'Customers',
            style: {
              fontSize: '14px',
              fontWeight: 500,
              color: '#64748B'
            }
          },
          labels: {
            style: {
              colors: '#64748B'
            }
          }
        }
      ],
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: function (val: { toLocaleString: () => string; }, { seriesIndex }: any) {
            return seriesIndex === 0 
              ? '$' + val.toLocaleString()
              : val.toLocaleString();
          }
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '14px',
        fontWeight: 500,
        markers: {
          width: 12,
          height: 12,
          radius: 12
        }
      },
      grid: {
        borderColor: '#E2E8F0',
        strokeDashArray: 4
      }
    };
  }

  updateCategoryChart(categoryData: any): void {
    this.categoryChartOptions = {
      series: categoryData.map((item: { value: any; }) => item.value),
      chart: {
        type: 'donut',
        height: 350,
        fontFamily: 'Inter, sans-serif'
      },
      labels: categoryData.map((item: { category: any; }) => item.category),
      colors: ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6'],
      legend: {
        position: 'bottom',
        fontSize: '14px',
        fontWeight: 500,
        markers: {
          width: 12,
          height: 12,
          radius: 12
        }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                fontSize: '16px',
                fontWeight: 600,
                color: '#334155'
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500
        }
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              height: 300
            },
            legend: {
              position: 'bottom'
            }
          }
        }
      ]
    };
  }

  updateDemographicChart(demographicData: any): void {
    this.demographicChartOptions = {
      series: [
        {
          name: 'Male',
          data: demographicData.map((item: { male: any; }) => item.male)
        },
        {
          name: 'Female',
          data: demographicData.map((item: { female: any; }) => item.female)
        },
        {
          name: 'Other',
          data: demographicData.map((item: { other: any; }) => item.other)
        }
      ],
      chart: {
        type: 'bar',
        height: 350,
        stacked: true,
        fontFamily: 'Inter, sans-serif',
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 5
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: demographicData.map((item: { age: any; }) => item.age),
        labels: {
          style: {
            colors: '#64748B',
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Customer Count',
          style: {
            fontSize: '14px',
            fontWeight: 500,
            color: '#64748B'
          }
        },
        labels: {
          style: {
            colors: '#64748B'
          }
        }
      },
      fill: {
        opacity: 1
      },
      colors: ['#3B82F6', '#EC4899', '#F59E0B'],
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        fontSize: '14px',
        fontWeight: 500,
        markers: {
          width: 12,
          height: 12,
          radius: 12
        }
      },
      grid: {
        borderColor: '#E2E8F0',
        strokeDashArray: 4
      }
    };
  }

  updateTrafficChart(trafficData: any): void {
    this.trafficChartOptions = {
      series: [
        {
          name: 'Customer Traffic',
          data: trafficData.traffic
        }
      ],
      chart: {
        height: 350,
        type: 'area',
        fontFamily: 'Inter, sans-serif',
        toolbar: {
          show: false
        }
      },
      colors: ['#3B82F6'],
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
          stops: [0, 90, 100]
        }
      },
      xaxis: {
        categories: trafficData.hours,
        labels: {
          style: {
            colors: '#64748B',
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Customer Count',
          style: {
            fontSize: '14px',
            fontWeight: 500,
            color: '#64748B'
          }
        },
        labels: {
          style: {
            colors: '#64748B'
          }
        }
      },
      tooltip: {
        x: {
          format: 'dd/MM/yy HH:mm'
        }
      },
      grid: {
        borderColor: '#E2E8F0',
        strokeDashArray: 4
      }
    };
  }

  formatCurrency(amount: number): string {
    return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  formatPercent(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })
      .format(value / 100);
  }

  getGrowthClass(growth: number): string {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  }

  getGrowthIcon(growth: number): string {
    return growth >= 0 ? 'trending_up' : 'trending_down';
  }
}
