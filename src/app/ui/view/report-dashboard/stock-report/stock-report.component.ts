import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexXAxis,
  ApexPlotOptions,
  ApexStroke,
  ApexLegend,
  ApexTooltip,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexYAxis
} from "ng-apexcharts";
import { ReportService } from '../../../service/report.service';
import {
  InventoryReportRequestDTO,
  ProductDTO,
  CategoryDTO,
  BranchDTO,
  InventoryItemDTO,
  InventoryReportDTO
} from '../../../models/interface';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface DropdownData {
  label: string;
  value: any;
}

@Component({
  selector: 'app-stock-report',
  templateUrl: './stock-report.component.html',
  styleUrl: './stock-report.component.scss'
})
export class StockReportComponent implements OnInit {
  @ViewChild('reportContent') reportContent!: ElementRef;

  filterForm!: FormGroup;
  reportData!: InventoryReportDTO;

  branches: BranchDTO[] = [];
  categories: CategoryDTO[] = [];

  totalItems = 0;
  lowStockItems = 0;
  totalValue = 0;

  // Initializing with empty but valid ApexCharts configuration
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
  showCustomDateRange = false;

  isDropdownOpen: { [key: string]: boolean } = {
    totalItems: false,
    lowStockItems: false
  };
  dropdownData: { [key: string]: DropdownData[] } = {
    totalItems: [],
    lowStockItems: []
  };
  hoveringInfo: { [key: string]: boolean } = {
    totalValue: false
  };

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService
  ) { }

  ngOnInit(): void {
    this.initFilters();
    this.initEmptyCharts();
    this.loadInitialData();
  }

  initFilters(): void {
    this.filterForm = this.fb.group({
      branchIds: [[]],
      categoryIds: [[]],
      includeLowStock: [false],
      dateRange: ['last7Days'],
      startDate: [null],
      endDate: [null]
    });
    this.onDateRangeChange(null);
  }

  onDateRangeChange(event: any): void {
    const value = this.filterForm.get('dateRange')?.value;
    this.showCustomDateRange = value === 'custom';

    const today = new Date();
    let startDate: Date;

    switch (value) {
      case 'today':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        break;
      case '3daysAgo':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 3);
        break;
      case 'last7Days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case '1month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      default:
        return;
    }

    if (value !== 'custom') {
      this.filterForm.patchValue({
        startDate: startDate.toISOString().substring(0, 10),
        endDate: today.toISOString().substring(0, 10)
      });
    }
  }

  loadInitialData(): void {
    this.isLoading = true;
    Promise.all([this.loadBranches(), this.loadCategories()])
      .then(() => {
        this.loadInventoryReport();
      })
      .catch(error => {
        console.error('Error loading initial data:', error);
        this.isLoading = false;
      });
  }

  loadBranches(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.reportService.getBranches().subscribe({
        next: (branches: BranchDTO[]) => {
          this.branches = branches;
          resolve();
        },
        error: (error) => {
          console.error('Error loading branches:', error);
          this.branches = [];
          resolve();
        }
      });
    });
  }

  loadCategories(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.reportService.getCategories().subscribe({
        next: (categories: CategoryDTO[]) => {
          this.categories = categories;
          resolve();
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.categories = [];
          resolve();
        }
      });
    });
  }

  loadInventoryReport(filters?: InventoryReportRequestDTO): void {
    this.isLoading = true;

    const cleanedFilters: InventoryReportRequestDTO = {
      branchIds: filters?.branchIds || undefined,
      categoryIds: filters?.categoryIds || undefined,
      includeLowStock: filters?.includeLowStock || false,
      startDate: filters?.startDate || undefined,
      endDate: filters?.endDate || undefined
    };

    if (!cleanedFilters.branchIds?.length) {
      cleanedFilters.branchIds = this.branches.map(b => b.id);
    }
    if (!cleanedFilters.categoryIds?.length) {
      cleanedFilters.categoryIds = this.categories.map(c => c.id);
    }

    this.reportService.getInventoryReport(cleanedFilters).pipe(
      switchMap((data: InventoryReportDTO) => {
        this.reportData = data;

        const productIds = [...new Set(this.reportData.inventory.map(item => item.product?.id))].filter(id => id !== null);
        const categoryIds = [...new Set(this.reportData.inventory.map(item => item.category?.id))].filter(id => id !== null);
        const branchIds = [...new Set(this.reportData.inventory.map(item => item.branch?.id))].filter(id => id !== null);

        const productRequests = productIds.map(id => this.reportService.getProductById(id as number).pipe(catchError(() => of(null))));
        const categoryRequests = categoryIds.map(id => this.reportService.getCategoryById(id as number).pipe(catchError(() => of(null))));
        const branchRequests = branchIds.map(id => this.reportService.getBranchById(id as number).pipe(catchError(() => of(null))));

        return forkJoin({
          products: productRequests.length ? forkJoin(productRequests) : of([]),
          categories: categoryRequests.length ? forkJoin(categoryRequests) : of([]),
          branches: branchRequests.length ? forkJoin(branchRequests) : of([])
        });
      })
    ).subscribe({
      next: (fullData: { products: (ProductDTO | null)[], categories: (CategoryDTO | null)[], branches: (BranchDTO | null)[] }) => {
        const productMap = new Map(fullData.products.filter(p => p !== null).map(p => [p!.id, p!]));
        const categoryMap = new Map(fullData.categories.filter(c => c !== null).map(c => [c!.id, c!]));
        const branchMap = new Map(fullData.branches.filter(b => b !== null).map(b => [b!.id, b!]));

        this.reportData.inventory.forEach(item => {
          if (item.product?.id !== null) {
            const productDetails = productMap.get(Number(item.product.id));
            if (productDetails) {
              Object.assign(item.product, productDetails);
            }
          }
          if (item.category?.id !== null) {
            item.category = categoryMap.get(item.category.id) || item.category;
          }
          if (item.branch?.id !== null) {
            item.branch = branchMap.get(item.branch.id) || item.branch;
          }
        });

        this.calculateSummaryMetrics();
        this.initCharts();
        this.prepareDropdownData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading inventory report or related data:', error);
        this.isLoading = false;
        this.reportData = { inventory: [] };
        this.calculateSummaryMetrics();
        this.initCharts();
        this.prepareDropdownData();
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

    this.totalItems = this.reportData.inventory.reduce((sum: number, item: InventoryItemDTO) => sum + item.currentStock, 0);
    this.lowStockItems = this.reportData.inventory.filter((item: InventoryItemDTO) => item.lowStockAlert).length;
    this.totalValue = this.reportData.inventory.reduce((sum: number, item: InventoryItemDTO) => {
      const price = parseFloat(item.product?.sellingPrice || '0');
      return sum + (item.currentStock * price);
    }, 0);
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
    const categoryData = this.categories.map((category: CategoryDTO) => {
      const items = this.reportData.inventory.filter((item: InventoryItemDTO) => item.category?.id === category.id);
      const totalStock = items.reduce((sum: number, item: InventoryItemDTO) => sum + item.currentStock, 0);
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
    // If there is no report data, display an empty chart
    if (!this.reportData?.inventory?.length) {
      this.stockTrendChartOptions = this.createEmptyLineChart('Inventory Trend (Last 6 Months)');
      return;
    }
    
    // Get total current stock and total sold quantity from the report
    const totalCurrentStock = this.reportData.inventory.reduce((sum, item) => sum + item.currentStock, 0);
    const totalSold = this.reportData.inventory.reduce((sum, item) => sum + item.soldQuantity, 0);
    
    // Determine the number of months based on the date range, or use a default of 6
    const dateRange = this.filterForm.get('dateRange')?.value;
    let monthsToDisplay = 6;
    if (dateRange === 'today') {
      monthsToDisplay = 1;
    } else if (dateRange === '3daysAgo' || dateRange === 'last7Days') {
      monthsToDisplay = 1; 
    } else if (dateRange === '1month') {
      monthsToDisplay = 1;
    }

    // Generate month labels and data points dynamically
    const months = [];
    const trendValues = [];
    const now = new Date();
    
    // Get the month and year of the latest data point
    const latestMonth = now.toLocaleString('default', { month: 'short' });
    const latestYear = now.getFullYear();

    // Populate the chart data backwards from the current month
    // The chart will only show a single data point if a short date range is selected
    for (let i = monthsToDisplay - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('default', { month: 'short' });
        months.push(monthName);
        
        if (i === 0) {
            // For the current month, use the actual total current stock
            trendValues.push(totalCurrentStock);
        } else {
            // For past months, use a simple estimation.
            // This is a placeholder as real historical data is not available.
            // Assuming sales are spread evenly.
            const soldPerMonth = totalSold / monthsToDisplay;
            const estimatedStock = totalCurrentStock + ((monthsToDisplay - 1 - i) * soldPerMonth);
            trendValues.push(Math.round(estimatedStock));
        }
    }
    
    this.stockTrendChartOptions = {
      series: [{
        name: 'Total Inventory',
        data: trendValues
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
    const branchData = this.branches.map((branch: BranchDTO) => {
      const branchStock = this.reportData.inventory
        .filter((item: InventoryItemDTO) => item.branch?.id === branch.id)
        .reduce((sum: number, item: InventoryItemDTO) => sum + item.currentStock, 0);
      return {
        label: branch.name,
        value: branchStock
      };
    }).filter(item => item.value > 0);

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
    const categoryStats = this.categories.map((category: CategoryDTO) => {
      const items = this.reportData.inventory.filter((item: InventoryItemDTO) => item.category?.id === category.id);
      const totalStock = items.reduce((sum: number, item: InventoryItemDTO) => sum + item.currentStock, 0);
      const totalSold = items.reduce((sum: number, item: InventoryItemDTO) => sum + item.soldQuantity, 0);

      return {
        name: category.name,
        stock: totalStock,
        sold: totalSold
      };
    }).filter(item => item.stock > 0 || item.sold > 0);

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
          formatter: function(val: number) {
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

  // Helper functions to create empty, but valid chart configs
  createEmptyBarChart(title: string): any {
    return {
      series: [{ name: 'Data', data: [] }],
      chart: { type: 'bar', height: 350 },
      title: { text: title, align: 'left' },
      xaxis: { categories: [] },
      noData: { text: 'No data available' }
    };
  }

  createEmptyLineChart(title: string): any {
    return {
      series: [{ name: 'Data', data: [] }],
      chart: { type: 'line', height: 350 },
      title: { text: title, align: 'left' },
      xaxis: { categories: [] },
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
    const filters = this.filterForm.value;
    this.page = 1; // Reset to first page on filter change

    const cleanedFilters: InventoryReportRequestDTO = {
      branchIds: filters.branchIds?.length ? filters.branchIds : undefined,
      categoryIds: filters.categoryIds?.length ? filters.categoryIds : undefined,
      includeLowStock: filters.includeLowStock || false,
      startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
      endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined
    };
    
    console.log('Applying filters:', cleanedFilters);
    this.loadInventoryReport(cleanedFilters);
  }

  resetFilters(): void {
    this.filterForm.reset({
      branchIds: [],
      categoryIds: [],
      includeLowStock: false,
      dateRange: 'last7Days'
    });
    this.showCustomDateRange = false;
    this.onDateRangeChange(null); // Recalculate and set the date range
    this.loadInventoryReport();
  }

  sortData(column: string): void {
    if (!this.reportData?.inventory) return;

    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.reportData.inventory.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (column) {
        case 'product.name':
          aValue = a.product?.name?.toLowerCase();
          bValue = b.product?.name?.toLowerCase();
          break;
        case 'product.sku':
          aValue = a.product?.sku?.toLowerCase();
          bValue = b.product?.sku?.toLowerCase();
          break;
        case 'category.name':
          aValue = a.category?.name?.toLowerCase();
          bValue = b.category?.name?.toLowerCase();
          break;
        case 'branch.name':
          aValue = a.branch?.name?.toLowerCase();
          bValue = b.branch?.name?.toLowerCase();
          break;
        case 'currentStock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        case 'soldQuantity':
          aValue = a.soldQuantity;
          bValue = b.soldQuantity;
          break;
        case 'product.sellingPrice':
          aValue = parseFloat(a.product?.sellingPrice || '0');
          bValue = parseFloat(b.product?.sellingPrice || '0');
          break;
        default:
          return 0;
      }

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return this.sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return this.sortDirection === 'asc' ? -1 : 1;

      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  exportToCsv(): void {
    if (!this.reportData?.inventory?.length) {
      console.log('No data to export');
      return;
    }

    const headers = ['Product Name', 'SKU', 'Category', 'Current Stock', 'Price', 'Branch', 'Low Stock Alert'];
    const csvData = this.reportData.inventory.map((item: InventoryItemDTO) => [
      item.product?.name,
      item.product?.sku,
      item.category?.name,
      item.currentStock,
      item.product?.sellingPrice,
      item.branch?.name,
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
    if (!this.reportContent?.nativeElement) {
      console.error('Report content element not found for PDF export.');
      return;
    }

    const element = this.reportContent.nativeElement;
    const originalStyle = element.style.cssText;
    element.style.padding = '20px'; // Add some padding for better formatting

    html2canvas(element, { scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
      element.style.cssText = originalStyle; 
    }).catch(error => {
      console.error('Error generating PDF:', error);
      element.style.cssText = originalStyle; 
    });
  }

  printReport(): void {
    console.log('Printing report...');
    window.print();
  }

  trackByItemId(index: number, item: InventoryItemDTO): any {
    return item.product?.id || index;
  }

  prepareDropdownData(): void {
    if (!this.reportData?.inventory) return;

    const totalItemsData = [...this.reportData.inventory]
      .sort((a, b) => b.currentStock - a.currentStock)
      .map(item => ({
        label: `${item.product?.name} (${item.branch?.name})`,
        value: item.currentStock.toLocaleString()
      }));
    this.dropdownData['totalItems'] = totalItemsData;

    const lowStockData = [...this.reportData.inventory]
      .filter(item => item.lowStockAlert)
      .sort((a, b) => a.currentStock - b.currentStock)
      .map(item => ({
        label: `${item.product?.name} (${item.branch?.name})`,
        value: item.currentStock.toLocaleString()
      }));
    this.dropdownData['lowStockItems'] = lowStockData;
  }

  toggleDropdown(metric: string): void {
    this.isDropdownOpen[metric] = !this.isDropdownOpen[metric];
    for (const key in this.isDropdownOpen) {
      if (key !== metric) {
        this.isDropdownOpen[key] = false;
      }
    }
  }
}