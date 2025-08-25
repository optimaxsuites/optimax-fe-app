import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ReportService } from '../../../service/report.service';

interface InventoryReportRequestDTO {
  branchIds?: number[];
  categoryIds?: number[];
  includeLowStock?: boolean;
}

interface ProductDTO {
  id: number;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
}

interface CategoryDTO {
  id: number;
  name: string;
}

interface BranchDTO {
  id: number;
  name: string;
  location: string;
}

interface InventoryItemDTO {
  product: ProductDTO;
  category: CategoryDTO;
  currentStock: number;
  soldQuantity: number;
  branch: BranchDTO;
  lowStockAlert: boolean;
}

interface InventoryReportDTO {
  inventory: InventoryItemDTO[];
}

@Component({
  selector: 'app-stock-report',
  templateUrl: './stock-report.component.html',
  styleUrl: './stock-report.component.scss'
})
export class StockReportComponent implements OnInit {
  filterForm!: FormGroup;
  reportData!: InventoryReportDTO;
  
  branches: BranchDTO[] = [];
  categories: CategoryDTO[] = [];
  
  totalItems = 0;
  lowStockItems = 0;
  totalValue = 0;
  
  categoriesChartOptions: any;
  stockTrendChartOptions: any;
  branchComparisonChartOptions: any;
  salesVsStockChartOptions: any;
  isFilterFormOpen = false;
  isLoading = false;
  page = 1;
  pageSize = 10;
  sortColumn = 'product.name';
  sortDirection = 'asc';
  
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService
  ) { }

  ngOnInit(): void {
    this.initFilters();
    this.loadInitialData();
  }

  initFilters(): void {
    this.filterForm = this.fb.group({
      branchIds: [[]],
      categoryIds: [[]],
      includeLowStock: [false]
    });
  }

  loadInitialData(): void {
    this.isLoading = true;
    
    // Load branches and categories concurrently
    Promise.all([
      this.loadBranches(),
      this.loadCategories()
    ]).then(() => {
      // Load initial inventory report
      this.loadInventoryReport();
    }).catch(error => {
      console.error('Error loading initial data:', error);
      this.isLoading = false;
    });
  }

  loadBranches(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.reportService.getBranches().subscribe({
        next: (branches) => {
          this.branches = branches;
          resolve();
        },
        error: (error) => {
          console.error('Error loading branches:', error);
          this.branches = [];
          resolve(); // Continue even if branches fail to load
        }
      });
    });
  }

  loadCategories(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.reportService.getCategories().subscribe({
        next: (categories) => {
          this.categories = categories;
          resolve();
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.categories = [];
          resolve(); // Continue even if categories fail to load
        }
      });
    });
  }

  loadInventoryReport(filters?: InventoryReportRequestDTO): void {
    this.isLoading = true;
    
    const requestPayload: InventoryReportRequestDTO = filters || {
      branchIds: [],
      categoryIds: [],
      includeLowStock: false
    };

    // If no specific branches/categories selected, include all
    if (!requestPayload.branchIds?.length) {
      requestPayload.branchIds = this.branches.map(b => b.id);
    }
    if (!requestPayload.categoryIds?.length) {
      requestPayload.categoryIds = this.categories.map(c => c.id);
    }

    this.reportService.getInventoryReport(requestPayload).subscribe({
      next: (data) => {
        this.reportData = data;
        this.calculateSummaryMetrics();
        this.initCharts();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading inventory report:', error);
        this.isLoading = false;
        this.reportData = { inventory: [] };
        this.calculateSummaryMetrics();
        this.initCharts();
      }
    });
  }

  openFilterForm(): void {
    this.isFilterFormOpen = !this.isFilterFormOpen;
  }

  calculateSummaryMetrics(): void {
    if (!this.reportData?.inventory) {
      this.totalItems = 0;
      this.lowStockItems = 0;
      this.totalValue = 0;
      return;
    }

    this.totalItems = this.reportData.inventory.reduce((sum, item) => sum + item.currentStock, 0);
    this.lowStockItems = this.reportData.inventory.filter(item => item.lowStockAlert).length;
    this.totalValue = this.reportData.inventory.reduce((sum, item) => sum + (item.currentStock * item.product.price), 0);
  }

  initCharts(): void {
    if (!this.reportData?.inventory?.length) {
      this.initEmptyCharts();
      return;
    }
    
    this.initCategoriesChart();
    this.initStockTrendChart();
    this.initBranchComparisonChart();
    this.initSalesVsStockChart();
  }

  initEmptyCharts(): void {
    this.categoriesChartOptions = this.createEmptyBarChart('Stock by Category');
    this.stockTrendChartOptions = this.createEmptyLineChart('Inventory Trend (Last 6 Months)');
    this.branchComparisonChartOptions = this.createEmptyPieChart('Stock Distribution by Branch');
    this.salesVsStockChartOptions = this.createEmptyRadarChart('Stock vs Sales by Category');
  }

  initCategoriesChart(): void {
    // Aggregate data by category
    const categoryData = this.categories.map(category => {
      const items = this.reportData.inventory.filter(item => item.category.id === category.id);
      const totalStock = items.reduce((sum, item) => sum + item.currentStock, 0);
      return { x: category.name, y: totalStock };
    }).filter(item => item.y > 0);

    this.categoriesChartOptions = {
      series: [{ data: categoryData }],
      chart: {
        type: 'bar',
        height: 350
      },
      colors: ['#4F46E5'],
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
        }
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: categoryData.map(item => item.x),
      },
      title: {
        text: 'Stock by Category',
        align: 'left'
      }
    };
  }

  initStockTrendChart(): void {
    // For now, create a simple trend based on current data
    // In a real implementation, you'd fetch historical data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentTotal = this.totalItems;
    
    // Generate trend data based on current stock (simulated for demo)
    const trendData = months.map((month, index) => {
      const variance = Math.random() * 0.2 - 0.1; // ±10% variance
      const value = Math.floor(currentTotal * (0.8 + index * 0.05 + variance));
      return { x: month, y: value };
    });

    this.stockTrendChartOptions = {
      series: [{
        name: 'Total Inventory',
        data: trendData
      }],
      chart: {
        height: 350,
        type: 'line',
        toolbar: {
          show: false
        }
      },
      colors: ['#10B981'],
      stroke: {
        width: 3,
        curve: 'smooth'
      },
      xaxis: {
        categories: months
      },
      title: {
        text: 'Inventory Trend (Last 6 Months)',
        align: 'left'
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: "horizontal",
          shadeIntensity: 0.5,
          gradientToColors: ['#3B82F6'],
          opacityFrom: 1,
          opacityTo: 1,
        },
      },
      markers: {
        size: 4,
        colors: ["#FFA41B"],
        strokeColors: "#fff",
        strokeWidth: 2,
        hover: {
          size: 7,
        }
      }
    };
  }

  initBranchComparisonChart(): void {
    // Compare inventory across branches
    const branchData = this.branches.map(branch => {
      const branchStock = this.reportData.inventory
        .filter(item => item.branch.id === branch.id)
        .reduce((sum, item) => sum + item.currentStock, 0);
      return {
        label: branch.name,
        value: branchStock
      };
    }).filter(item => item.value > 0); // Only show branches with stock

    this.branchComparisonChartOptions = {
      series: branchData.map(item => item.value),
      chart: {
        width: 380,
        type: 'pie',
      },
      labels: branchData.map(item => item.label),
      colors: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 300
          },
          legend: {
            position: 'bottom'
          }
        }
      }],
      title: {
        text: 'Stock Distribution by Branch',
        align: 'left'
      }
    };
  }

  initSalesVsStockChart(): void {
    // Compare sales vs. current stock for categories with data
    const categoryStats = this.categories.map(category => {
      const items = this.reportData.inventory.filter(item => item.category.id === category.id);
      const totalStock = items.reduce((sum, item) => sum + item.currentStock, 0);
      const totalSold = items.reduce((sum, item) => sum + item.soldQuantity, 0);
      
      return {
        name: category.name,
        stock: totalStock,
        sold: totalSold
      };
    }).filter(item => item.stock > 0 || item.sold > 0); // Only show categories with data

    const categories = categoryStats.map(item => item.name);
    const stockData = categoryStats.map(item => item.stock);
    const salesData = categoryStats.map(item => item.sold);

    this.salesVsStockChartOptions = {
      series: [{
        name: 'Current Stock',
        data: stockData
      }, {
        name: 'Sold Quantity',
        data: salesData
      }],
      chart: {
        type: 'radar',
        height: 350,
        toolbar: {
          show: false
        }
      },
      dataLabels: {
        enabled: true
      },
      plotOptions: {
        radar: {
          size: 140,
          polygons: {
            strokeColors: '#e9e9e9',
            fill: {
              colors: ['#f8f8f8', '#fff']
            }
          }
        }
      },
      title: {
        text: 'Stock vs Sales by Category',
        align: 'left'
      },
      colors: ['#10B981', '#F59E0B'],
      markers: {
        size: 4,
        colors: ['#10B981', '#F59E0B'],
        strokeWidth: 2,
      },
      tooltip: {
        y: {
          formatter: function(val: any) {
            return val.toString();
          }
        }
      },
      xaxis: {
        categories: categories
      },
      yaxis: {
        tickAmount: 7
      }
    };
  }

  // Helper methods for empty charts
  createEmptyBarChart(title: string): any {
    return {
      series: [{ data: [] }],
      chart: { type: 'bar', height: 350 },
      colors: ['#4F46E5'],
      title: { text: title, align: 'left' },
      noData: { text: 'No data available' }
    };
  }

  createEmptyLineChart(title: string): any {
    return {
      series: [{ name: 'Data', data: [] }],
      chart: { height: 350, type: 'line' },
      title: { text: title, align: 'left' },
      noData: { text: 'No data available' }
    };
  }

  createEmptyPieChart(title: string): any {
    return {
      series: [],
      chart: { type: 'pie' },
      labels: [],
      title: { text: title, align: 'left' },
      noData: { text: 'No data available' }
    };
  }

  createEmptyRadarChart(title: string): any {
    return {
      series: [{ name: 'Stock', data: [] }, { name: 'Sales', data: [] }],
      chart: { type: 'radar', height: 350 },
      title: { text: title, align: 'left' },
      xaxis: { categories: [] },
      noData: { text: 'No data available' }
    };
  }

  applyFilters(): void {
    const filters = this.filterForm.value as InventoryReportRequestDTO;
    
    // Convert empty arrays to undefined to fetch all data
    const cleanedFilters: InventoryReportRequestDTO = {
      branchIds: filters.branchIds?.length ? filters.branchIds : undefined,
      categoryIds: filters.categoryIds?.length ? filters.categoryIds : undefined,
      includeLowStock: filters.includeLowStock || false
    };
    
    console.log('Applying filters:', cleanedFilters);
    this.loadInventoryReport(cleanedFilters);
  }

  resetFilters(): void {
    this.filterForm.reset({
      branchIds: [],
      categoryIds: [],
      includeLowStock: false
    });
    this.loadInventoryReport();
  }

  sortData(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    // Sort the inventory data
    this.reportData.inventory.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (column) {
        case 'product.name':
          aValue = a.product.name.toLowerCase();
          bValue = b.product.name.toLowerCase();
          break;
        case 'product.sku':
          aValue = a.product.sku.toLowerCase();
          bValue = b.product.sku.toLowerCase();
          break;
        case 'category.name':
          aValue = a.category.name.toLowerCase();
          bValue = b.category.name.toLowerCase();
          break;
        case 'currentStock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        case 'product.price':
          aValue = a.product.price;
          bValue = b.product.price;
          break;
        case 'branch.name':
          aValue = a.branch.name.toLowerCase();
          bValue = b.branch.name.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    console.log(`Sorted by ${this.sortColumn} in ${this.sortDirection} order`);
  }

  exportToCsv(): void {
    if (!this.reportData?.inventory?.length) {
      console.log('No data to export');
      return;
    }
    
    const headers = ['Product Name', 'SKU', 'Category', 'Current Stock', 'Price', 'Branch', 'Low Stock Alert'];
    const csvData = this.reportData.inventory.map(item => [
      item.product.name,
      item.product.sku,
      item.category.name,
      item.currentStock,
      item.product.price,
      item.branch.name,
      item.lowStockAlert ? 'Yes' : 'No'
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  exportToPdf(): void {
    console.log('Exporting to PDF...');
    // Implement PDF export logic here
  }

  printReport(): void {
    console.log('Printing report...');
    window.print();
  }

  trackByItemId(index: number, item: InventoryItemDTO): any {
    return item.product?.id || index;
  }
}