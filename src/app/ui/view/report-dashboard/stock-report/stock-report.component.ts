import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, of, Observable, EMPTY } from 'rxjs';
import { catchError, map, switchMap, finalize } from 'rxjs/operators';
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
  InventoryReportDTO,
  StockMovementReportDTO,
  StockMovementReportItemDTO,
  StockMovementReportRequestDTO
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
  movementReportData: StockMovementReportDTO = {
    movements: [],
    totalInflow: 0,
    totalOutflow: 0,
    netChange: 0
  };

  branches: BranchDTO[] = [];
  categories: CategoryDTO[] = [];
  currentUserBranchId: number | null = null; 

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
  
  movementPage = 1;
  movementPageSize = 10;
  movementSortColumn: keyof StockMovementReportItemDTO | 'totalCost' = 'createdDate';
  movementSortDirection = 'desc';

  Math = Math;
  showCustomDateRange = false;
  groupByMovement: 'none' | 'day' | 'week' | 'month' = 'day';

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
    this.currentUserBranchId = this.reportService.getCurrentUserBranchId();
    this.initFilters();
    this.initEmptyCharts();
    this.loadInitialData();
  }

  initFilters(): void {
    const initialBranchIds = this.currentUserBranchId !== null ? [this.currentUserBranchId] : [];
    
    this.filterForm = this.fb.group({
      branchIds: [initialBranchIds], 
      categoryIds: [[]],
      includeLowStock: [false],
      dateRange: ['last7Days'],
      startDate: [null],
      endDate: [null],
      groupByMovement: [this.groupByMovement]
    });
    this.onDateRangeChange(null);
  }

  onDateRangeChange(event: any): void {
    const value = this.filterForm.get('dateRange')?.value;
    this.showCustomDateRange = value === 'custom';

    const today = new Date();
    let startDate: Date = new Date();

    switch (value) {
      case 'today':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '3daysAgo':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last7Days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '1month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        return;
    }

    if (value !== 'custom') {
      this.filterForm.patchValue({
        startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
        endDate: today.toISOString().split('T')[0] // YYYY-MM-DD
      });
    }
  }

  loadInitialData(): void {
    this.isLoading = true;
    console.log("INITIAL LOAD: Starting data fetching...");
    
    // Load branches and categories first
    Promise.all([this.loadBranches(), this.loadCategories()])
      .then(() => {
        console.log(`INITIAL LOAD: Branches loaded: ${this.branches.length}, Categories loaded: ${this.categories.length}`);
        
        // Ensure initial branch filter is set after branches are loaded
        if (this.currentUserBranchId !== null && this.branches.some(b => b.id === this.currentUserBranchId)) {
            const currentFilter = this.filterForm.get('branchIds')?.value;
            if (!currentFilter || currentFilter.length === 0) {
                this.filterForm.get('branchIds')?.setValue([this.currentUserBranchId]);
                console.log(`INITIAL LOAD: Setting default branch filter to ID: ${this.currentUserBranchId}`);
            }
        }
        
        this.loadInventoryReport();
      })
      .catch(error => {
        console.error('INITIAL LOAD: Error loading initial data:', error);
        this.isLoading = false;
      });
  }

  private formatDateToISO(dateString: string | undefined | null, isEndDate: boolean): string | undefined {
    if (!dateString) return undefined;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return undefined;
    
    if (isEndDate) {
        date.setHours(23, 59, 59, 999); 
    } else {
        date.setHours(0, 0, 0, 0); 
    }
    
    return date.toISOString();
  }

  loadBranches(): Promise<void> {
    return new Promise((resolve) => {
      this.reportService.getBranches().subscribe({
        next: (branches: BranchDTO[]) => {
          this.branches = branches;
          resolve();
        },
        error: (error: any) => {
          console.error('Error loading branches:', error);
          this.branches = [];
          resolve();
        }
      });
    });
  }

  loadCategories(): Promise<void> {
    return new Promise((resolve) => {
      this.reportService.getCategories().subscribe({
        next: (categories: CategoryDTO[]) => {
          this.categories = categories;
          resolve();
        },
        error: (error: any) => {
          console.error('Error loading categories:', error);
          this.categories = [];
          resolve();
        }
      });
    });
  }

  loadInventoryReport(filters?: InventoryReportRequestDTO): void {
    this.isLoading = true;

    const formFilters = this.filterForm.value;
    
    const cleanedFilters: InventoryReportRequestDTO = {
      branchIds: filters?.branchIds || (formFilters.branchIds?.length ? formFilters.branchIds : undefined),
      categoryIds: filters?.categoryIds || (formFilters.categoryIds?.length ? formFilters.categoryIds : undefined),
      includeLowStock: filters?.includeLowStock || formFilters.includeLowStock || false,
      startDate: this.formatDateToISO(filters?.startDate || formFilters.startDate, false),
      endDate: this.formatDateToISO(filters?.endDate || formFilters.endDate, true)
    };
    
    //  Determine final IDs for API calls (send all IDs if none selected/available)
    const allBranchIds = this.branches.map(b => b.id);
    const allCategoryIds = this.categories.map(c => c.id);
    
    const finalBranchIds = cleanedFilters.branchIds && cleanedFilters.branchIds.length > 0
        ? cleanedFilters.branchIds
        : (this.branches.length > 0 ? allBranchIds : undefined); 
        
    const finalCategoryIds = cleanedFilters.categoryIds && cleanedFilters.categoryIds.length > 0
        ? cleanedFilters.categoryIds
        : (this.categories.length > 0 ? allCategoryIds : undefined);

    const invReportFilters: InventoryReportRequestDTO = {
        ...cleanedFilters,
        branchIds: finalBranchIds || [], 
        categoryIds: finalCategoryIds || []
    };
    
    const movementFilters: StockMovementReportRequestDTO = {
        ...cleanedFilters,
        branchIds: finalBranchIds || [],
        categoryIds: finalCategoryIds || [],
        groupBy: formFilters.groupByMovement || 'none'
    };
    
    console.log('API CALL: Inventory Report Request Filters:', invReportFilters);
    console.log('API CALL: Stock Movement Request Filters:', movementFilters);

    const getStockMovementReport$: Observable<StockMovementReportDTO> = this.reportService.getStockMovementReport(movementFilters);

    forkJoin({
        inventory: this.reportService.getInventoryReport(invReportFilters).pipe(
          catchError(error => {
            console.error('ERROR: Failed loading inventory report:', error);
            return of({ inventory: [] } as InventoryReportDTO);
          })
        ),
        movements: getStockMovementReport$.pipe(
          catchError((error: any) => {
            console.error('ERROR: Failed loading stock movement report:', error);
            return of({ 
              movements: [], 
              totalInflow: 0, 
              totalOutflow: 0, 
              netChange: 0 
            } as StockMovementReportDTO);
          })
        )
    }).pipe(
      //  Receive base data and determine required enrichment IDs
      switchMap(({ inventory, movements }) => {
        this.reportData = inventory;
        this.movementReportData = movements;
        console.log(`DATA RECEIVED: Inventory items count: ${inventory.inventory?.length}, Movements count: ${movements.movements?.length}`);

        //  Collect unique ID
        const inventoryProductIds = this.reportData.inventory.map(item => item.product?.id).filter((id): id is number | string => id !== undefined && id !== null);
        const movementProductIds = this.movementReportData.movements.map(item => item.productId).filter((id): id is number => id !== undefined && id !== null && typeof id === 'number');

        const uniqueProductIds = [...new Set([...inventoryProductIds, ...movementProductIds])].map(id => Number(id));
        
        const inventoryCategoryIds = this.reportData.inventory.map(item => item.category?.id).filter((id): id is number => id !== undefined && id !== null);
        const uniqueCategoryIds = [...new Set(inventoryCategoryIds)];
        
        const inventoryBranchIds = this.reportData.inventory.map(item => item.branch?.id).filter((id): id is number => id !== undefined && id !== null);
        const movementBranchIds = this.movementReportData.movements.map(item => item.branchId).filter((id): id is number => id !== undefined && id !== null);
        const uniqueBranchIds = [...new Set([...inventoryBranchIds, ...movementBranchIds])];

        console.log(`ENRICHMENT: Fetching details for ${uniqueProductIds.length} products, ${uniqueCategoryIds.length} categories, ${uniqueBranchIds.length} branches.`);

        // Create parallel enrichment requests ---
        const productRequests = uniqueProductIds.map(id => this.reportService.getProductById(id).pipe(catchError(() => of(null))));
        const categoryRequests = uniqueCategoryIds.map(id => this.reportService.getCategoryById(id).pipe(catchError(() => of(null))));
        const branchRequests = uniqueBranchIds.map(id => this.reportService.getBranchById(id).pipe(catchError(() => of(null))));

        return forkJoin({
          products: productRequests.length ? forkJoin(productRequests) : of([]),
          categories: categoryRequests.length ? forkJoin(categoryRequests) : of([]),
          branches: branchRequests.length ? forkJoin(branchRequests) : of([])
        });
      }),
      // Phase 3: Map fetched details back to the report data
      finalize(() => this.isLoading = false), // Ensure loading spinner stops regardless of success or final error
      catchError((error: any) => {
        console.error('ERROR: Error processing data enrichment chain:', error);
        this.reportData = { inventory: [] };
        this.movementReportData = { movements: [], totalInflow: 0, totalOutflow: 0, netChange: 0 };
        return EMPTY; // Stop the subscription 
      })
    ).subscribe({
      next: (fullData: { products: (ProductDTO | null)[], categories: (CategoryDTO | null)[], branches: (BranchDTO | null)[] }) => {
        console.log('ENRICHMENT: Starting final data mapping.');
        const productMap = new Map(fullData.products.filter(p => p !== null).map(p => [p!.id, p!]));
        const categoryMap = new Map(fullData.categories.filter(c => c !== null).map(c => [c!.id, c!]));
        const branchMap = new Map(fullData.branches.filter(b => b !== null).map(b => [b!.id, b!]));

        // Enrich Inventory Details
        this.reportData.inventory.forEach(item => {
          if (item.product?.id) {
            const productDetails = productMap.get(Number(item.product.id));
            if (productDetails) {
              Object.assign(item.product, productDetails);
            }
          }
          if (item.category?.id) {
            item.category = categoryMap.get(item.category.id) || item.category;
          }
          if (item.branch?.id) {
            item.branch = branchMap.get(item.branch.id) || item.branch;
          }
        });
        
        // Enrich Stock Movements Details
        if (this.movementReportData.movements.length > 0) {
            this.movementReportData.movements.forEach(item => {
                const product = productMap.get(item.productId);
                const branch = branchMap.get(item.branchId);
                const category = product?.productCategory ? categoryMap.get(product.productCategory.id) : undefined;
                
                item.productName = product?.name || item.productName;
                item.productSku = product?.sku || item.productSku;
                item.productCategory = category?.name || item.productCategory;
                item.branchName = branch?.name || item.branchName;
                item.sellingPrice = item.sellingPrice || (product?.sellingPrice as number | null | undefined) || null;
                item.supplierName = product?.supplier?.name || item.supplierName;
            });
            this.sortMovementData('createdDate');
        }
        console.log('ENRICHMENT: Data mapping complete. Displaying results.');

        this.calculateSummaryMetrics();
        this.initCharts();
        this.prepareDropdownData();
      },
      error: (error: any) => {
        console.error('ERROR: Final subscription error during data processing:', error);
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
      const price = parseFloat(item.product?.sellingPrice || '0') || parseFloat(item.product?.costPrice || '0'); 
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
    if (!this.reportData?.inventory?.length) {
      this.stockTrendChartOptions = this.createEmptyLineChart('Inventory Trend (Last 6 Months)');
      return;
    }
    
    const totalCurrentStock = this.reportData.inventory.reduce((sum, item) => sum + item.currentStock, 0);
    const totalSold = this.reportData.inventory.reduce((sum, item) => sum + item.soldQuantity, 0);
    
    const dateRange = this.filterForm.get('dateRange')?.value;
    let monthsToDisplay = 6;
    if (dateRange === 'today' || dateRange === '3daysAgo' || dateRange === 'last7Days' || dateRange === '1month') {
        monthsToDisplay = 1;
    }

    const months = [];
    const trendValues = [];
    const now = new Date();
    
    for (let i = monthsToDisplay - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('en-US', { month: 'short' });
        months.push(monthName);
        
        if (i === 0) {
            trendValues.push(totalCurrentStock);
        } else {
            const soldPerMonth = totalSold / monthsToDisplay; 
            const estimatedStock = totalCurrentStock + (i * soldPerMonth);
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
    this.page = 1; 
    this.movementPage = 1;

    const cleanedFilters: InventoryReportRequestDTO = {
      branchIds: filters.branchIds?.length ? filters.branchIds : undefined,
      categoryIds: filters.categoryIds?.length ? filters.categoryIds : undefined,
      includeLowStock: filters.includeLowStock || false,
      startDate: filters.startDate, 
      endDate: filters.endDate
    };

    this.groupByMovement = filters.groupByMovement;
    
    console.log('APPLYING FILTERS:', cleanedFilters);
    this.loadInventoryReport(cleanedFilters);

    this.isFilterFormOpen = false; 
  }

  resetFilters(): void {
    this.filterForm.reset({
      branchIds: this.currentUserBranchId !== null ? [this.currentUserBranchId] : [], 
      categoryIds: [],
      includeLowStock: false,
      dateRange: 'last7Days',
      groupByMovement: 'day'
    });
    this.showCustomDateRange = false;
    this.onDateRangeChange(null);
    this.loadInventoryReport();
    this.isFilterFormOpen = false;
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

  sortMovementData(column: keyof StockMovementReportItemDTO | 'totalCost'): void {
    if (!this.movementReportData?.movements || this.movementReportData.movements.length === 0) return;

    if (this.movementSortColumn === column) {
      this.movementSortDirection = this.movementSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.movementSortColumn = column;
      this.movementSortDirection = 'asc';
    }

    this.movementReportData.movements.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      if (column === 'totalCost') {
          aValue = (a.purchasePrice || 0) * Math.abs(a.quantity);
          bValue = (b.purchasePrice || 0) * Math.abs(b.quantity);
      } else {
          aValue = a[column as keyof StockMovementReportItemDTO];
          bValue = b[column as keyof StockMovementReportItemDTO];
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return this.movementSortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return this.movementSortDirection === 'asc' ? -1 : 1;
      
      if (aValue < bValue) return this.movementSortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.movementSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  formatMovementDate(dateString: string): string {
    const date = new Date(dateString);
    if (this.groupByMovement === 'day') {
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (this.groupByMovement === 'week') {
        const day = date.getDate();
        const startOfWeek = new Date(date.setDate(day - date.getDay()));
        return startOfWeek.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) + ' - ' + new Date(date.setDate(startOfWeek.getDate() + 6)).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }
    if (this.groupByMovement === 'month') {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return date.toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    element.style.padding = '20px'; 

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

  trackByMovementId(index: number, item: StockMovementReportItemDTO): any {
    return item.id || index;
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