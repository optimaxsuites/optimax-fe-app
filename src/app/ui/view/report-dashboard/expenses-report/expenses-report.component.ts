import { Component, OnInit, ViewChild } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexPlotOptions,
  ApexStroke,
  ApexFill,
  ApexTooltip,
  ChartComponent,
  ApexLegend,
  ApexYAxis,
  ApexGrid,
} from 'ng-apexcharts';
import { FormGroup, FormBuilder } from '@angular/forms';
import { 
  ProductPerformanceReportDTO, 
  CategoryDTO, 
  ProductStatsDTO, 
  BranchDTO,
  ProductPerformanceReportRequestDTO
} from '../../../service/report.service';
import { ReportService } from '../../../service/report.service';

// Enhanced chart options types
export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  title?: ApexTitleSubtitle;
  dataLabels?: ApexDataLabels;
  plotOptions?: ApexPlotOptions;
  stroke?: ApexStroke;
  fill?: ApexFill;
  tooltip?: ApexTooltip;
  legend?: ApexLegend;
  colors?: string[];
  grid?: ApexGrid;
  labels?: string[];
};

type DonutChartOptions = {
  series: number[]; // Specific type for donut chart series
  chart: ApexChart;
  labels: string[];
  dataLabels?: ApexDataLabels;
  plotOptions?: ApexPlotOptions;
  colors?: string[];
  legend?: ApexLegend;
  tooltip?: ApexTooltip;
  fill?: ApexFill; 
  stroke?: ApexStroke; 
  responsive?: any[]; 
};

interface CategoryStats {
  name: string;
  revenue: number;
  margin: number;
  count: number;
}

@Component({
  selector: 'app-expenses-report',
  templateUrl: './expenses-report.component.html',
  styleUrls: ['./expenses-report.component.scss']
})
export class ExpensesReportComponent implements OnInit {
  @ViewChild('revenueChart') revenueChart!: ChartComponent;
  @ViewChild('productSalesChart') productSalesChart!: ChartComponent;
  @ViewChild('categoryPerformanceChart') categoryPerformanceChart!: ChartComponent;
  
  reportForm!: FormGroup;
  isLoading = false;
  report!: ProductPerformanceReportDTO;
  branches: BranchDTO[] = [];
  categories: CategoryDTO[] = [];
  filterForm = false;
  productPage = 1;
  productItemsPerPage = 10;
  Math = Math;

  public revenueChartOptions!: ChartOptions;
  public productSalesChartOptions!: DonutChartOptions;
  public categoryPerformanceChartOptions!: ChartOptions;
  
  groupByOptions = [
    { value: 'product', label: 'Product' },
    { value: 'category', label: 'Category' },
    { value: 'variant', label: 'Variant' }
  ];
  
  constructor(
    private fb: FormBuilder,
    private reportService: ReportService
  ) {
    this.initCharts();
  }
  
  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }
  
  initForm(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    this.reportForm = this.fb.group({
      startDate: [thirtyDaysAgo],
      endDate: [today],
      branchIds: [[]],
      categoryIds: [[]],
      groupBy: ['product']
    });
  }

  loadInitialData(): void {
    this.isLoading = true;
    
    this.reportService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches;
        this.reportService.getCategories().subscribe({
          next: (categories) => {
            this.categories = categories;
            this.generateReport();
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Error loading categories:', err);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading branches:', err);
      }
    });
  }
  
  openFilterForm() {
    this.filterForm = !this.filterForm;
  }

  get paginatedProductBreakdown() {
    const start = (this.productPage - 1) * this.productItemsPerPage;
    const end = start + this.productItemsPerPage;
    return this.report?.productPerformanceBreakdown?.slice(start, end) || [];
  }
  
  get productTotalPages() {
    return Math.ceil((this.report?.productPerformanceBreakdown?.length || 0) / this.productItemsPerPage);
  }
  
  setProductPage(page: number) {
    if (page >= 1 && page <= this.productTotalPages) {
      this.productPage = page;
    }
  }

  generateReport(): void {
    this.isLoading = true;
    
    const formValue = this.reportForm.value;
    const payload: ProductPerformanceReportRequestDTO = {
      startDate: formValue.startDate.toISOString(),
      endDate: formValue.endDate.toISOString(),
      branchIds: formValue.branchIds,
      categoryIds: formValue.categoryIds,
      groupBy: formValue.groupBy
    };

    this.reportService.getProductPerformanceReport(payload).subscribe({
      next: (data) => {
        this.report = data;
        this.updateCharts();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading product performance report:', err);
        this.isLoading = false;
      }
    });
  }
  
  initCharts(): void {
    // Revenue by Product Chart
    this.revenueChartOptions = {
      series: [],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: { show: true }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '70%',
          borderRadius: 6
        }
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: { categories: [] },
      yaxis: {
        title: { text: 'Revenue (₦)' }
      },
      fill: { opacity: 1 },
      tooltip: {
        y: {
          formatter: (val: number) => this.formatCurrency(val)
        }
      },
      legend: { position: 'top' },
      colors: ['#3B82F6', '#10B981']
    };
    
    // Product Sales Chart (Donut)
    this.productSalesChartOptions = {
      series: [],
      chart: { 
        type: 'donut',
        height: 400,
        toolbar: { show: true }
      },
      labels: [],
      dataLabels: { 
        enabled: true,
        formatter: (val: number, opts: any) => {
          return `${opts.w.config.labels[opts.seriesIndex]}: ${this.formatCurrency(opts.w.config.series[opts.seriesIndex])}`;
        }
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Units',
                formatter: () => this.report?.totalProductsSold?.toString() || '0'
              }
            }
          }
        }
      },
      fill: {
    opacity: 1, 
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'horizontal',
      shadeIntensity: 0.5,
      gradientToColors: ['#3B82F6', '#10B981'],
      inverseColors: true,
      opacityFrom: 1,
      opacityTo: 1,
      stops: [0, 100]
    }
  },
      tooltip: {
        y: {
          formatter: (val: number) => {
            const percentage = this.report?.totalProductsSold 
              ? (val / this.report.totalProductsSold * 100).toFixed(1) 
              : '0';
            return `${val} units (${percentage}%)`;
          }
        }
      },
      legend: {
        position: 'bottom',
        formatter: (seriesName: string, opts: any) => {
          return `${seriesName}: ${this.formatCurrency(opts.w.config.series[opts.seriesIndex])}`;
        }
      },
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    };
    
    // Category Performance Chart
    this.categoryPerformanceChartOptions = {
      series: [
        { name: 'Revenue', type: 'column', data: [] },
        { name: 'Gross Margin', type: 'line', data: [] }
      ],
      chart: {
        height: 400,
        type: 'line',
        stacked: false,
        toolbar: { show: true }
      },
      stroke: { width: [0, 3], curve: 'smooth' },
      plotOptions: { bar: { columnWidth: '50%' } },
      fill: {
        opacity: [1, 0.5],
        gradient: {
          inverseColors: false,
          shade: 'light',
          type: 'vertical',
          opacityFrom: 0.85,
          opacityTo: 0.55,
        }
      },
      dataLabels: { enabled: false },
      xaxis: { categories: [] },
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
        shared: true,
        intersect: false,
        y: {
          formatter: (y: number, { seriesIndex }: any) => {
            if (seriesIndex === 0) {
              return this.formatCurrency(y);
            } else {
              return this.formatPercent(y / 100);
            }
          }
        }
      },
      colors: ['#3B82F6', '#F59E0B']
    };
  }
  
  updateCharts(): void {
    if (!this.report) return;
    
    // Update Revenue Chart
    const topProducts = [...this.report.productPerformanceBreakdown]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);
    
    this.revenueChartOptions.series = [{
      name: 'Revenue',
      data: topProducts.map(p => p.totalRevenue)
    }, {
      name: 'Gross Margin',
      data: topProducts.map(p => p.totalRevenue * p.grossMargin)
    }];
    
    this.revenueChartOptions.xaxis = {
      categories: topProducts.map(p => p.product.name)
    };
    
    // Update Product Sales Chart (Donut)
    this.productSalesChartOptions.series = this.report.bestsellers
      .map(p => p.quantitySold);
      
    this.productSalesChartOptions.labels = this.report.bestsellers
      .map(p => p.product.name);
    
    // Update Category Performance Chart
    const categoryData = this.report.productPerformanceBreakdown.reduce(
      (acc: Record<number, CategoryStats>, curr) => {
        const catId = curr.category.id;
        if (!acc[catId]) {
          acc[catId] = {
            name: curr.category.name,
            revenue: 0,
            margin: 0,
            count: 0
          };
        }
        acc[catId].revenue += curr.totalRevenue;
        acc[catId].margin += curr.grossMargin;
        acc[catId].count++;
        return acc;
      }, {}
    );
    
    const categories = Object.values(categoryData);
    
    this.categoryPerformanceChartOptions.series = [
      {
        name: 'Revenue',
        type: 'column',
        data: categories.map(c => c.revenue)
      },
      {
        name: 'Avg. Gross Margin',
        type: 'line',
        data: categories.map(c => (c.margin / c.count) * 100)
      }
    ];
    
    this.categoryPerformanceChartOptions.xaxis = {
      categories: categories.map(c => c.name)
    };

    // Trigger chart updates
    if (this.revenueChart) {
      this.revenueChart.updateOptions(this.revenueChartOptions);
    }
    if (this.productSalesChart) {
      this.productSalesChart.updateOptions({
        series: this.productSalesChartOptions.series,
        labels: this.productSalesChartOptions.labels
      });
    }
    if (this.categoryPerformanceChart) {
      this.categoryPerformanceChart.updateOptions(this.categoryPerformanceChartOptions);
    }
  }
  
  onSubmit(): void {
    this.generateReport();
  }
  
  formatCurrency(value: number): string {
    return '₦' + value.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  formatPercent(value: number): string {
    return (value * 100).toFixed(1) + '%';
  }

  get averageGrossMargin(): number {
    const items = this.report?.productPerformanceBreakdown;
    if (!items?.length) return 0;
    const total = items.reduce((sum, item) => sum + item.grossMargin, 0);
    return total / items.length;
  }
}