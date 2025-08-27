import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
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
  BranchSalesDTO,
  BranchDTO 
} from '../../../models/interface';
import { ReportService } from '../../../service/report.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

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
  selectedTab = 'overview';
  currentPage = 1;
  itemsPerPage = 10;
  isFilterFormOpen = false;
  Math = Math;
  
  // Form properties
  reportForm!: FormGroup;
  
  // Filter properties
  branches: BranchDTO[] = []; 
  paymentMethods = [
    { id: 'cash', name: 'Cash' },
    { id: 'card', name: 'Card' },
    { id: 'transfer', name: 'Transfer' },
    { id: 'wallet', name: 'Wallet' }
  ];

  constructor(
    private reportService: ReportService,
    private fb: FormBuilder
  ) {
    this.initChartOptions();
    this.createForm();
  }

  ngOnInit(): void {
    this.setDefaultDateRange();
    this.loadBranches(); 
  }

  createForm(): void {
    this.reportForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      branchIds: [[]],
      paymentMethodIds: [[]],
      groupBy: ['day']
    });
  }

  // Set default date range (last 30 days)
  setDefaultDateRange(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const startDate = this.formatDateForInput(thirtyDaysAgo);
    const endDate = this.formatDateForInput(today);
    
    this.reportForm.patchValue({
      startDate: startDate,
      endDate: endDate
    });
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Toggle filter form
  toggleFilterForm(): void {
    this.isFilterFormOpen = !this.isFilterFormOpen;
  }
  
  loadBranches(): void {
    this.reportService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches || [];
        this.loadSalesData();
      },
      error: (err) => {
        console.error('Error loading branches:', err);
        this.branches = [];
        this.loadSalesData();
      }
    });
  }


  loadSalesData(): void {
    this.loading = true;
    
    const formValue = this.reportForm.value;
    
    // Convert dates to ISO format with time
    const startDate = new Date(formValue.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(formValue.endDate);
    endDate.setHours(23, 59, 59, 999);

    const payload = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      branchIds: formValue.branchIds || [],
      cashierIds: [],
      paymentMethods: formValue.paymentMethodIds || [],
      groupBy: formValue.groupBy || 'day'
    };

    this.reportService.getSalesPerformanceReport(payload).subscribe({
      next: (data) => {
        this.salesReport = data;
        
        
        this.loading = false;
        this.updateCharts();
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading sales data:', err);
      }
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
        text: `Sales Trend`,
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

    // Update trend chart title with current date range
    const formValue = this.reportForm.value;
    this.trendChartOptions.title = {
      ...this.trendChartOptions.title,
      text: `Sales Trend (${formValue.startDate} to ${formValue.endDate})`
    };

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

  setTab(tab: string) {
    this.selectedTab = tab;
  }

  onSubmit() {
    this.isFilterFormOpen = false;
    this.loadSalesData();
  }

  resetFilters() {
    this.reportForm.reset();
    this.setDefaultDateRange();
    this.reportForm.patchValue({
      branchIds: [],
      paymentMethodIds: [],
      groupBy: 'day'
    });
  }

  formatCurrency(amount: number, includeSymbol: boolean = true): string {
    return (includeSymbol ? '₦' : '') + amount.toLocaleString('en-NG', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  }

  get report() {
    return this.salesReport;
  }
}