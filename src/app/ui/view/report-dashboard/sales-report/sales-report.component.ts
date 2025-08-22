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
import { 
  SalesReportDTO, 
  SalesReportBreakdownDTO, 
  TopProductDTO, 
  BranchSalesDTO
} from '../../../models/interface';
import { ReportService } from '../../../service/report.service';
import { FormGroup, FormBuilder } from '@angular/forms';
import { ProductBranchDTO } from '../../../service/report.service';

type PaymentMethodBreakdown = {
  paymentMethod: string;
  revenue: number;
  transactions: number;
};

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
  series: number[];
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
  styleUrls: ['./sales-report.component.scss']
})
export class SalesReportComponent implements OnInit {
  @ViewChild("branchChart") branchChart!: ChartComponent;
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
  currentPage = 1;
  itemsPerPage = 10;
  isFilterFormOpen = false;
  Math = Math;
  
  // Summary metrics
  totalRevenue = 0;
  totalTransactions = 0;
  averageOrderValue = 0;
  totalDiscounts = 0;

  // Filter options
  selectedBranch = 'all';
  selectedPaymentMethod = 'all';
  selectedCashier = 'all';
  categories: any[] = [];
  branches: {id: string, name: string}[] = [];
  paymentMethods: string[] = [];
  cashiers: {id: string, name: string}[] = [];

  // Store original unfiltered data
  private originalBreakdown: SalesReportBreakdownDTO[] = [];
  private originalTopSellingProducts: TopProductDTO[] = [];
  private originalPaymentMethods: PaymentMethodBreakdown[] = [];
  private originalBranchSales: BranchSalesDTO[] = [];

  filterForm: FormGroup | undefined;

  constructor(
    private reportService: ReportService,
    private fb: FormBuilder
  ) {
    this.initChartOptions();
    this.initFilterForm();
  }

  ngOnInit(): void {
    this.loadSalesData();
  }

  initFilterForm() {
    this.filterForm = this.fb.group({
      branchIds: ['all'],
      categoryIds: ['all'],
      startDate: [null],
      endDate: [null],
      includeLowStock: [false]
    });
  }

  openFilterForm() {
    this.isFilterFormOpen = !this.isFilterFormOpen;
  }

  loadSalesData(): void {
    const payload = {
      startDate: '2025-08-01T00:00:00.000Z',
      endDate: '2025-08-13T23:59:59.000Z',
      branchIds: [],
      cashierIds: [],
      paymentMethods: [],
      groupBy: ''
    };

    this.reportService.getSalesPerformanceReport(payload).subscribe({
      next: (data) => {
        this.salesReport = data;
        
        // Store original data for filtering
        this.originalBreakdown = [...data.breakdown];
        this.originalTopSellingProducts = [...data.topSellingProducts];
        this.originalPaymentMethods = [...data.paymentMethodBreakdown];
        this.originalBranchSales = [...data.totalSalesPerBranch];
        
        // Set summary metrics
        this.totalRevenue = data.totalRevenue;
        this.totalTransactions = data.totalTransactions;
        this.averageOrderValue = data.averageOrderValue;
        this.totalDiscounts = data.totalDiscounts || 0;
        
        // Extract filter options
        this.extractFilterOptions();
        
        this.loading = false;
        this.updateCharts();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading sales data:', err);
      }
    });
  }

  extractFilterOptions() {
    if (!this.salesReport) return;

    // Extract unique branches with IDs
    this.branches = [{id: 'all', name: 'All Branches'}];
    const branchMap = new Map<number, string>();
    this.salesReport.totalSalesPerBranch.forEach(item => {
      if (!branchMap.has(item.branch.id)) {
        branchMap.set(item.branch.id, item.branch.name);
        this.branches.push({id: item.branch.id.toString(), name: item.branch.name});
      }
    });
    
    // Extract unique payment methods
    this.paymentMethods = ['all'];
    const paymentMap = new Map<string, boolean>();
    this.salesReport.paymentMethodBreakdown.forEach(item => {
      if (!paymentMap.has(item.paymentMethod)) {
        paymentMap.set(item.paymentMethod, true);
        this.paymentMethods.push(item.paymentMethod);
      }
    });
    
    // Extract unique cashiers
    this.cashiers = [{id: 'all', name: 'All Cashiers'}];
    const cashierMap = new Map<number, string>();
    this.salesReport.breakdown
      .filter(item => item.cashier)
      .forEach(item => {
        if (!cashierMap.has(item.cashier.id)) {
          cashierMap.set(item.cashier.id, item.cashier.name);
          this.cashiers.push({id: item.cashier.id.toString(), name: item.cashier.name});
        }
      });

    // Reset filter selections
    this.selectedBranch = 'all';
    this.selectedPaymentMethod = 'all';
    this.selectedCashier = 'all';
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
    this.branchChartOptions = {
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
          text: "Revenue (₦)",
          style: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#6B7280'
          }
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => {
            return this.formatCurrency(val);
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
        formatter: (val: number) => {
          return this.formatCurrency(val, false);
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
          formatter: (val: number) => {
            return this.formatCurrency(val);
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
        enabled: true,
        formatter: (val: number, opts?: any) => {
          return `${opts.w.config.labels[opts.seriesIndex]}: ${this.formatCurrency(val, false)}`;
        }
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
          formatter: (val: number) => {
            return this.formatCurrency(val);
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
          name: "Transactions",
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
        text: "Sales Trend (Last 30 Days)",
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
          text: "Amount (₦)",
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
          formatter: (val: number) => {
            return this.formatCurrency(val);
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

    // Update product chart - aggregate products with the same name
    const productMap = new Map<string, number>();
    this.salesReport.topSellingProducts.forEach(product => {
      const productName = product.product.name;
      const currentRevenue = productMap.get(productName) || 0;
      productMap.set(productName, currentRevenue + product.revenue);
    });

    const sortedProducts = Array.from(productMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); 

    this.productChartOptions.series = [{
      name: "Revenue",
      data: sortedProducts.map(p => p[1])
    }];
    this.productChartOptions.xaxis = {
      categories: sortedProducts.map(p => p[0])
    };

    // Update payment method chart
    this.paymentChartOptions.series = this.salesReport.paymentMethodBreakdown.map(p => p.revenue);
    this.paymentChartOptions.labels = this.salesReport.paymentMethodBreakdown.map(p => p.paymentMethod);

    // Prepare data for trend chart from current breakdown
    const groupedByDate = this.groupBreakdownByDate(this.salesReport.breakdown);
    const dates = Array.from(groupedByDate.keys()).sort((a, b) => a - b);
    
    this.trendChartOptions.series = [
      {
        name: "Revenue",
        data: dates.map(date => {
          const group = groupedByDate.get(date);
          return group ? group.revenue : 0;
        })
      },
      {
        name: "Transactions",
        data: dates.map(date => {
          const group = groupedByDate.get(date);
          return group ? group.transactions : 0;
        })
      }
    ];
    
    this.trendChartOptions.xaxis = {
      categories: dates.map(date => formatDate(new Date(date), 'MMM dd', 'en-US'))
    };

    // Update all charts
    if (this.branchChart) this.branchChart.updateOptions(this.branchChartOptions);
    if (this.productChart) this.productChart.updateOptions(this.productChartOptions);
    if (this.paymentChart) this.paymentChart.updateOptions(this.paymentChartOptions);
    if (this.trendChart) this.trendChart.updateOptions(this.trendChartOptions);
  }

  groupBreakdownByDate(breakdown: SalesReportBreakdownDTO[]) {
    const groups = new Map<number, { revenue: number, transactions: number }>();
    
    breakdown.forEach(item => {
      const dateKey = new Date(item.date).getTime();
      
      if (!groups.has(dateKey)) {
        groups.set(dateKey, { revenue: 0, transactions: 0 });
      }
      
      const group = groups.get(dateKey);
      if (group) {
        group.revenue += item.revenue;
        group.transactions += item.transactions;
      }
    });
    
    return groups;
  }

  setDateRange(range: string) {
    this.dateRange = range;
    this.trendChartOptions.title = {
      ...this.trendChartOptions.title,
      text: `Sales Trend (Last ${range})`
    };
    if (this.trendChart) {
      this.trendChart.updateOptions(this.trendChartOptions);
    }
  }

  setTab(tab: string) {
    this.selectedTab = tab;
  }

  applyFilters() {
    if (!this.salesReport) return;

    // Start with original data
    let filteredBreakdown = [...this.originalBreakdown];
    let filteredProducts = [...this.originalTopSellingProducts];
    let filteredPayments = [...this.originalPaymentMethods];
    let filteredBranches = [...this.originalBranchSales];

    // Filter by branch
    if (this.selectedBranch !== 'all') {
      const branchId = parseInt(this.selectedBranch);
      filteredBreakdown = filteredBreakdown.filter(item => 
        item.branch?.id === branchId
      );
      filteredProducts = filteredProducts.filter(product => 
       product.product.branches?.some((b: any) => (b as ProductBranchDTO).id === branchId)
      );
      filteredBranches = filteredBranches.filter(
        branch => branch.branch.id === branchId
      );
    }

    // Filter by payment method
    if (this.selectedPaymentMethod !== 'all') {
      filteredBreakdown = filteredBreakdown.filter(
        item => item.paymentMethod === this.selectedPaymentMethod
      );
      filteredPayments = filteredPayments.filter(
        payment => payment.paymentMethod === this.selectedPaymentMethod
      );
    }

    // Filter by cashier
    if (this.selectedCashier !== 'all') {
      const cashierId = parseInt(this.selectedCashier);
      filteredBreakdown = filteredBreakdown.filter(
        item => item.cashier?.id === cashierId
      );
    }

    // Update the report with filtered data
    this.salesReport = {
      ...this.salesReport,
      breakdown: filteredBreakdown,
      topSellingProducts: filteredProducts,
      paymentMethodBreakdown: filteredPayments,
      totalSalesPerBranch: filteredBranches,
      totalRevenue: filteredBreakdown.reduce((sum, item) => sum + item.revenue, 0),
      totalTransactions: filteredBreakdown.reduce((sum, item) => sum + item.transactions, 0),
      averageOrderValue: filteredBreakdown.length > 0 
        ? filteredBreakdown.reduce((sum, item) => sum + item.revenue, 0) / filteredBreakdown.length
        : 0,
      totalDiscounts: filteredBreakdown.reduce((sum, item) => sum + (item.discounts || 0), 0)
    };

    // Update summary metrics
    this.totalRevenue = this.salesReport.totalRevenue;
    this.totalTransactions = this.salesReport.totalTransactions;
    this.averageOrderValue = this.salesReport.averageOrderValue;
    this.totalDiscounts = this.salesReport.totalDiscounts;

    // Reset pagination
    this.currentPage = 1;

    // Refresh charts
    this.updateCharts();
  }

  resetFilters() {
    this.selectedBranch = 'all';
    this.selectedPaymentMethod = 'all';
    this.selectedCashier = 'all';

    // Restore original data
    if (this.salesReport) {
      this.salesReport = {
        ...this.salesReport,
        breakdown: [...this.originalBreakdown],
        topSellingProducts: [...this.originalTopSellingProducts],
        paymentMethodBreakdown: [...this.originalPaymentMethods],
        totalSalesPerBranch: [...this.originalBranchSales],
        totalRevenue: this.originalBreakdown.reduce((sum, item) => sum + item.revenue, 0),
        totalTransactions: this.originalBreakdown.reduce((sum, item) => sum + item.transactions, 0),
        averageOrderValue: this.originalBreakdown.length > 0 
          ? this.originalBreakdown.reduce((sum, item) => sum + item.revenue, 0) / this.originalBreakdown.length
          : 0,
        totalDiscounts: this.originalBreakdown.reduce((sum, item) => sum + (item.discounts || 0), 0)
      };

      // Update summary metrics
      this.totalRevenue = this.salesReport.totalRevenue;
      this.totalTransactions = this.salesReport.totalTransactions;
      this.averageOrderValue = this.salesReport.averageOrderValue;
      this.totalDiscounts = this.salesReport.totalDiscounts;
    }

    // Reset pagination
    this.currentPage = 1;

    // Refresh charts
    this.updateCharts();
  }

  formatCurrency(amount: number, includeSymbol: boolean = true): string {
    return (includeSymbol ? '₦' : '') + amount.toLocaleString('en-NG', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  }

  convertTimestampToDate(timestamp: number): Date {
    return new Date(timestamp);
  }
}