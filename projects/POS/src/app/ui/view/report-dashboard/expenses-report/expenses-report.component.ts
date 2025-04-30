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
import { StyleColor } from '../../../models/enums';
import { FormGroup, FormBuilder } from '@angular/forms';
// import { BranchDTO } from '../../../models/interface';
// import { ProductDTO } from '../../../service/metadata.service';
import { ProductPerformanceReportDTO, CategoryDTO, ProductStatsDTO, ProductPerformanceDTO, BranchDTO, ProductDTO } from '../../../service/report.service';

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
  labels?: string[]
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
  styleUrl: './expenses-report.component.scss',
})
export class ExpensesReportComponent implements OnInit {
  // Daily Expense Report charts
  @ViewChild('revenueChart') revenueChart!: ChartComponent;
  @ViewChild('productSalesChart') productSalesChart!: ChartComponent;
  @ViewChild('categoryPerformanceChart') categoryPerformanceChart!: ChartComponent;
  
  reportForm!: FormGroup;
  isLoading = false;
  report!: ProductPerformanceReportDTO;
  branches: BranchDTO[] = [];
  categories: CategoryDTO[] = [];
  filterForm = false
  
  // Chart options
  public revenueChartOptions!: any;
  public productSalesChartOptions!: any;
  public categoryPerformanceChartOptions!: any;
  
  groupByOptions = [
    { value: 'product', label: 'Product' },
    { value: 'category', label: 'Category' },
    { value: 'variant', label: 'Variant' }
  ];
  
  constructor(private fb: FormBuilder) {
    this.initCharts();
  }
  
  ngOnInit(): void {
    this.initForm();
    this.loadDummyData();
    this.generateReport();
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
  
  openFilterForm(){
    this.filterForm = !this.filterForm
  }
  loadDummyData(): void {
    // Dummy branches
    this.branches = [
      { id: 1, name: 'Downtown Store', location: 'Central City' },
      { id: 2, name: 'Mall Outlet', location: 'Westfield Mall' },
      { id: 3, name: 'East End Shop', location: 'East District' },
      { id: 4, name: 'North Plaza', location: 'North County' }
    ];
    
    // Dummy categories
    this.categories = [
      { id: 1, name: 'Electronics', description: 'Electronic devices and accessories' },
      { id: 2, name: 'Clothing', description: 'Apparel and fashion items' },
      { id: 3, name: 'Home & Kitchen', description: 'Household and kitchen products' },
      { id: 4, name: 'Sports & Outdoors', description: 'Athletic and outdoor equipment' }
    ];
  }
  
  generateReport(): void {
    this.isLoading = true;
    
    // Simulate API call delay
    setTimeout(() => {
      // This would be an API call in a real application
      this.report = this.getDummyReportData();
      this.updateCharts();
      this.isLoading = false;
    }, 800);
  }
  
  getDummyReportData(): ProductPerformanceReportDTO {
    // Generate 20 products with realistic data
    const products: any = [];
    for (let i = 1; i <= 20; i++) {
      let category, name, price;
      
      if (i <= 5) {
        category = 1; // Electronics
        name = ['Smartphone', 'Laptop', 'Tablet', 'Headphones', 'Smart Watch'][i-1];
        price = [699, 1299, 449, 199, 299][i-1];
      } else if (i <= 10) {
        category = 2; // Clothing
        name = ['T-Shirt', 'Jeans', 'Sweater', 'Jacket', 'Dress'][i-6];
        price = [29.99, 59.99, 49.99, 89.99, 79.99][i-6];
      } else if (i <= 15) {
        category = 3; // Home & Kitchen
        name = ['Blender', 'Coffee Maker', 'Toaster', 'Cookware Set', 'Knife Set'][i-11];
        price = [79.99, 129.99, 49.99, 199.99, 89.99][i-11];
      } else {
        category = 4; // Sports & Outdoors
        name = ['Running Shoes', 'Yoga Mat', 'Dumbbells', 'Tennis Racket', 'Bicycle'][i-16];
        price = [119.99, 39.99, 49.99, 159.99, 499.99][i-16];
      }
      
      products.push({
        id: i,
        name,
        sku: `SKU-${category}-${i}`,
        price,
        // category
      });
    }
    
    // Generate bestsellers
    const bestsellers: ProductStatsDTO[] = products.slice(0, 5).map((product: { price: number; }, index: number) => {
      const quantitySold = 100 - (index * 15);
      return {
        product,
        quantitySold,
        revenue: quantitySold * product.price,
        percentageOfTotal: (20 - index * 3)
      };
    });
    
    // Generate underperformers
    const underperformers: ProductStatsDTO[] = products.slice(15, 20).map((product: { price: number; }, index: number) => {
      const quantitySold = 15 - (index * 2);
      return {
        product,
        quantitySold,
        revenue: quantitySold * product.price,
        percentageOfTotal: (3 - index * 0.5)
      };
    });
    
    // Generate product performance breakdown
    const productPerformanceBreakdown: ProductPerformanceDTO[] = products.map((product: { price: number; }, index: number) => {
      const categoryId = Math.ceil((index + 1) / 5);
      const quantitySold = Math.floor(Math.random() * 100) + 10;
      const totalRevenue = quantitySold * product.price;
      const grossMargin = (Math.random() * 0.3) + 0.3; // 30-60% margin
      
      return {
        product,
        category: this.categories.find(c => c.id === categoryId),
        quantitySold,
        totalRevenue,
        grossMargin,
        branch: index % 4 === 0 ? this.branches[0] : 
                index % 4 === 1 ? this.branches[1] : 
                index % 4 === 2 ? this.branches[2] : this.branches[3],
        variant: index % 2 === 0 ? 'Standard' : 'Premium'
      };
    });
    
    // Calculate totals
    const totalProductsSold = productPerformanceBreakdown.reduce((sum, item) => sum + item.quantitySold, 0);
    const totalRevenue = productPerformanceBreakdown.reduce((sum, item) => sum + item.totalRevenue, 0);
    
    return {
      totalProductsSold,
      totalRevenue,
      bestsellers,
      underperformers,
      productPerformanceBreakdown
    };
  }
  
  initCharts(): void {
    // Revenue by Product Chart
    this.revenueChartOptions = {
      series: [],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '70%',
          borderRadius: 6
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
        categories: []
      },
      yaxis: {
        title: {
          text: 'Revenue ($)'
        }
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return '$' + val.toFixed(2);
          }
        }
      },
      legend: {
        position: 'top'
      },
      colors: ['#3B82F6', '#10B981']
    };
    
    // Product Sales Chart
    this.productSalesChartOptions = {
      series: [],
      chart: {
        type: 'donut',
        height: 400
      },
      dataLabels: {
        enabled: true
      },
      tooltip: {
        y: {
          formatter: function (val: string) {
            return val + ' units';
          }
        }
      },
      legend: {
        position: 'bottom'
      },
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    };
    
    // Category Performance Chart
    this.categoryPerformanceChartOptions = {
      series: [{
        name: 'Revenue',
        type: 'column',
        data: []
      }, {
        name: 'Gross Margin',
        type: 'line',
        data: []
      }],
      chart: {
        height: 400,
        type: 'line',
        stacked: false,
        toolbar: {
          show: true
        }
      },
      stroke: {
        width: [0, 3],
        curve: 'smooth'
      },
      plotOptions: {
        bar: {
          columnWidth: '50%'
        }
      },
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
      dataLabels: {
        enabled: false
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
        shared: true,
        intersect: false,
        y: {
          formatter: function (y: number, { seriesIndex }: any) {
            if (seriesIndex === 0) {
              return '$' + y.toFixed(2);
            } else {
              return y.toFixed(2) + '%';
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
    const topProducts = this.report.productPerformanceBreakdown
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
    
    // Update Product Sales Chart
    this.productSalesChartOptions.series = this.report.bestsellers
      .map(p => p.quantitySold);
      
    this.productSalesChartOptions.labels = this.report.bestsellers
      .map(p => p.product.name);
    
    // Update Category Performance Chart
    // Group by category
    
const categoryData: Record<number, CategoryStats> = this.report.productPerformanceBreakdown.reduce(
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
    },
    {}
  );
    
    const categories = Object.values(categoryData);
    
    this.categoryPerformanceChartOptions.series = [
      {
        name: 'Revenue',
        type: 'column',
        data: categories.map(c => (c as any).revenue)
      },
      {
        name: 'Avg. Gross Margin',
        type: 'line',
        data: categories.map(c => ((c as any).margin / (c as any).count) * 100)
      }
    ];
    
    this.categoryPerformanceChartOptions.xaxis = {
      categories: categories.map(c => (c as any).name)
    };
  }
  
  onSubmit(): void {
    this.generateReport();
  }
  
  formatCurrency(value: number): string {
    return '₦' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
  
  formatPercent(value: number): string {
    return (value * 100).toFixed(1) + '%';
  }
  get averageGrossMargin(): number {
    const items = this.report.productPerformanceBreakdown;
    if (!items?.length) return 0;
    const total = items.reduce((sum, item) => sum + item.grossMargin, 0);
    return total / items.length;
  }
  
}
