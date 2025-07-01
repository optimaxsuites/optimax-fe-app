import { Component, OnInit, ViewChild } from '@angular/core';
import { 
  ApexAxisChartSeries, 
  ApexChart, 
  ApexXAxis, 
  ApexDataLabels, 
  ApexStroke, 
  ApexYAxis, 
  ApexTitleSubtitle, 
  ApexLegend,
  ApexTooltip,
  ApexFill,
  ApexPlotOptions,
  ChartComponent
} from 'ng-apexcharts';
import { formatDate } from '@angular/common';
import { SalesReportDTO } from '../../../models/interface';
import { MetadataService } from '../../../service/metadata.service';

export type BranchChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  legend?: ApexLegend;
  tooltip: ApexTooltip;
  colors: string[];
};

export type ProductChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  title: ApexTitleSubtitle;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  colors: string[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
};

export type PaymentChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  dataLabels: ApexDataLabels;
  title: ApexTitleSubtitle;
  legend: ApexLegend;
  colors: string[];
  tooltip: ApexTooltip;
};

export type TrendChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  legend: ApexLegend;
  tooltip: ApexTooltip;
  colors: string[];
};


@Component({
  selector: 'app-sales-report',
  templateUrl: './sales-report.component.html',
  styleUrl: './sales-report.component.scss',
})
export class SalesReportComponent {
  @ViewChild("branchChart")
  branchChart!: ChartComponent;
  @ViewChild("productChart") productChart!: ChartComponent;
  @ViewChild("paymentChart") paymentChart!: ChartComponent;
  @ViewChild("trendChart") trendChart!: ChartComponent;

  public branchChartOptions!: BranchChartOptions;
  public productChartOptions!: ProductChartOptions;
  public paymentChartOptions!: PaymentChartOptions;
  public trendChartOptions!: TrendChartOptions;

  salesReport!: SalesReportDTO;
  loading = true;
  dateRange = '30 days';
  selectedTab = 'overview';
  Math = Math
  currentPage = 1;
itemsPerPage = 10;

  // Filter options
  selectedBranch = 'all';
  selectedPaymentMethod = 'all';
  selectedCashier = 'all';
  
  constructor(private dataService: MetadataService) {
    this.initChartOptions();
  }

  ngOnInit() {
    this.dataService.getSalesReport().subscribe(data => {
      this.salesReport = data;
      this.loading = false;
      this.updateCharts();
    });
  }

  get paginatedBreakdown() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.salesReport?.breakdown?.slice(start, end) || [];
  }
  
  get totalPages() {
    return Math.ceil((this.salesReport?.breakdown?.length || 0) / this.itemsPerPage);
  }
  
  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  

  initChartOptions() {
    // Branch sales chart (bar chart)
    this.branchChartOptions  = {
      series: [{
        name: "Revenue",
        data: []
      }],
      chart: {
        type: "bar",
        height: 350,
        toolbar: {
          show: false
        }
      },
      colors: ["#4F46E5"],
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: "smooth",
        width: 2
      },
      title: {
        text: "Revenue by Branch",
        align: "left",
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151'
        }
      },
      xaxis: {
        categories: []
      },
      yaxis: {
        title: {
          text: "Revenue ($)",
          style: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#6B7280'
          }
        }
      },
      tooltip: {
        y: {
          formatter: function(val) {
            return "$" + val.toLocaleString();
          }
        }
      }
    };

    // Top products chart (horizontal bar)
    this.productChartOptions = {
      series: [{
        name: "Revenue",
        data: []
      }],
      chart: {
        type: "bar",
        height: 350,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '70%',
          distributed: false
        }
      },
      colors: ["#10B981"],
      dataLabels: {
        enabled: true,
        formatter: function(val) {
          return "$" + val.toLocaleString();
        },
        textAnchor: 'start',
        style: {
          fontSize: '12px',
          colors: ['#fff']
        },
        offsetX: 0
      },
      stroke: {
        width: 0
      },
      xaxis: {
        categories: []
      },
      yaxis: {
        labels: {
          show: true
        }
      },
      title: {
        text: "Top Selling Products",
        align: "left",
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151'
        }
      },
      tooltip: {
        y: {
          formatter: function(val) {
            return "$" + val.toLocaleString();
          }
        }
      },
      fill: {
        opacity: 1
      }
    };

    // Payment methods chart (pie chart)
    this.paymentChartOptions = {
      series: [],
      chart: {
        type: "donut",
        height: 350
      },
      labels: [],
      dataLabels: {
        enabled: true
      },
      colors: ["#3B82F6", "#F97316", "#14B8A6", "#EC4899", "#8B5CF6"],
      title: {
        text: "Payment Method Distribution",
        align: "left",
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151'
        }
      },
      legend: {
        position: "bottom"
      },
      tooltip: {
        y: {
          formatter: function(val) {
            return "$" + val.toLocaleString();
          }
        }
      }
    };

    // Sales trend chart (line chart)
    this.trendChartOptions = {
      series: [
        {
          name: "Revenue",
          data: []
        },
        {
          name: "Discounts",
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
      colors: ["#6366F1", "#F59E0B"],
      title: {
        text: "Sales Trend (Last 14 Days)",
        align: "left",
        style: {
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151'
        }
      },
      xaxis: {
        type: "category",
        categories: []
      },
      yaxis: {
        title: {
          text: "Amount ($)",
          style: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#6B7280'
          }
        }
      },
      legend: {
        position: "top",
        horizontalAlign: "right"
      },
      tooltip: {
        y: {
          formatter: function(val) {
            return "$" + val.toLocaleString();
          }
        }
      }
    };
  }

  updateCharts() {
    if (!this.salesReport) return;

    // Update branch chart
    this.branchChartOptions.series = [{
      name: "Revenue",
      data: this.salesReport.totalSalesPerBranch.map(b => b.totalRevenue)
    }];
    this.branchChartOptions.xaxis = {
      categories: this.salesReport.totalSalesPerBranch.map(b => b.branch.name)
    };

    // Update product chart
    this.productChartOptions.series = [{
      name: "Revenue",
      data: this.salesReport.topSellingProducts.map(p => p.revenue)
    }];
    this.productChartOptions.xaxis = {
      categories: this.salesReport.topSellingProducts.map(p => p.product.name)
    };

    // Update payment method chart
    // this.paymentChartOptions.series = this.salesReport.paymentMethodBreakdown.map(p => p.revenue);
    this.paymentChartOptions.labels = this.salesReport.paymentMethodBreakdown.map(p => p.paymentMethod);

    // Prepare data for trend chart
    const groupedByDate = this.groupBreakdownByDate();
    const dates = Array.from(groupedByDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    this.trendChartOptions.series = [
      {
        name: "Revenue",
        data: dates.map(date => {
          const group = groupedByDate.get(date);
          return group ? group.revenue : 0;
        })
      },
      {
        name: "Discounts",
        data: dates.map(date => {
          const group = groupedByDate.get(date);
          return group ? group.discounts : 0;
        })
      }
    ];
    
    this.trendChartOptions.xaxis = {
      categories: dates.map(date => formatDate(new Date(date), 'MMM dd', 'en-US'))
    };
  }

  groupBreakdownByDate() {
    const groups = new Map<string, { revenue: number, discounts: number }>();
    
    this.salesReport.breakdown.forEach(item => {
      const dateKey = item.date.toString().split('T')[0];
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, { revenue: 0, discounts: 0 });
      }
      
      const group = groups.get(dateKey);
      if (group) {
        group.revenue += item.revenue;
        group.discounts += item.discounts;
      }
    });
    
    return groups;
  }

  setDateRange(range: string) {
    this.dateRange = range;
    // Implementation for changing date range would go here
  }

  setTab(tab: string) {
    this.selectedTab = tab;
  }

  // Methods for filtering
  applyFilters() {
    // Implementation for applying filters would go here
    console.log('Filters applied:', {
      branch: this.selectedBranch,
      paymentMethod: this.selectedPaymentMethod,
      cashier: this.selectedCashier
    });
  }

  resetFilters() {
    this.selectedBranch = 'all';
    this.selectedPaymentMethod = 'all';
    this.selectedCashier = 'all';
    this.applyFilters();
  }

  formatCurrency(amount: number): string {
    return '₦' + amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
}
