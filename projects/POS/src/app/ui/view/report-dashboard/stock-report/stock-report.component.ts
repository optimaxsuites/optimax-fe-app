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
  @ViewChild('movementPrintContent') movementPrintContent!: ElementRef;

  filterForm!: FormGroup;
  movementFilterForm!: FormGroup;

  reportData: InventoryReportDTO = { inventory: [] };
  movementReportData: StockMovementReportDTO = {
    movements: [],
    totalInflow: 0,
    totalOutflow: 0,
    netChange: 0
  };

  private productMap = new Map<number, ProductDTO>();
  private branchMap = new Map<number, BranchDTO>();
  private categoryMap = new Map<number, CategoryDTO>();
  private inventoryMap = new Map<number, ProductDTO>();

  branches: BranchDTO[] = [];
  categories: CategoryDTO[] = [];
  currentUserBranchId: number | null = null;
  availableMovementProducts: ProductDTO[] = [];

  totalItems = 0;
  lowStockItems = 0;
  totalValue = 0;

  categoriesChartOptions: any;
  stockTrendChartOptions: any;
  branchComparisonChartOptions: any;
  salesVsStockChartOptions: any;

  isFilterFormOpen = true;
  isMovementFilterOpen = false;
  isLoading = true;
  isMovementLoading = true;

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
  showMovementCustomDateRange = false;
  groupByMovement: 'none' | 'day' | 'week' | 'month' = 'none';

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
    this.loadAllDataOptimized();
  }

  initFilters(): void {
    const initialBranchIds = this.currentUserBranchId !== null ? [this.currentUserBranchId] : [];

    this.filterForm = this.fb.group({
      branchIds: [initialBranchIds],
      categoryIds: [[]],
      includeLowStock: [false],
      dateRange: ['today'],
      startDate: [null],
      endDate: [null]
    });

    this.movementFilterForm = this.fb.group({
      dateRange: ['today'],
      startDate: [null],
      endDate: [null],
      productId: [null]
    });

    this.onDateRangeChange(null, this.filterForm);
    this.onMovementDateRangeChange(null);
  }

  onDateRangeChange(event: any, form: FormGroup): void {
    const value = form.get('dateRange')?.value;
    this.showCustomDateRange = value === 'custom';

    const today = new Date();
    let startDate: Date = new Date();
    let endDate: Date = new Date();

    // Ensure we capture the full day (00:00 to 23:59)
    endDate.setHours(23, 59, 59, 999);

    switch (value) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '3daysAgo':
        startDate.setDate(today.getDate() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last7Days':
        startDate.setDate(today.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '1month':
        startDate.setMonth(today.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        return;
      default:
        break;
    }

    form.patchValue({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });

    // Sync movement filter if main filter changes
    if (form === this.filterForm && value !== 'custom') {
        this.movementFilterForm.patchValue({
            dateRange: value,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        });
    }
  }

  onMovementDateRangeChange(event: any): void {
    const form = this.movementFilterForm;
    const value = form.get('dateRange')?.value;
    this.showMovementCustomDateRange = value === 'custom';

    const today = new Date();
    let startDate: Date = new Date();

    switch (value) {
      case 'today':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        
        form.patchValue({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endOfToday.toISOString().split('T')[0]
        });
        break;
      case '3daysAgo':
        startDate.setDate(today.getDate() - 3);
        startDate.setHours(0, 0, 0, 0);
        form.patchValue({
          startDate: startDate.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        });
        break;
      default:
        break;
    }
  }

  loadAllDataOptimized(): void {
    this.isLoading = true;
    this.isMovementLoading = true;
    
    if(this.filterForm.get('dateRange')?.value !== 'custom') {
      this.onDateRangeChange(null, this.filterForm);
    }

    // STEP 1: Load branches, categories, and products
    forkJoin({
      branches: this.reportService.getBranches().pipe(
        catchError(error => {
          console.error('Error loading branches:', error);
          return of([]);
        })
      ),
      categories: this.reportService.getCategories().pipe(
        catchError(error => {
          console.error('Error loading categories:', error);
          return of([]);
        })
      ),
      allProducts: this.reportService.getAllProducts().pipe(
        catchError(error => {
          console.error('Error loading all products:', error);
          return of([]);
        })
      )
    }).pipe(
      switchMap(({ branches, categories, allProducts }) => {
        console.log('Loaded base data:', { 
          branches: branches.length, 
          categories: categories.length, 
          products: allProducts.length 
        });

        this.branches = branches;
        this.categories = categories;

        this.populateEnrichmentMapsFromArrays(branches, categories, allProducts);

        if (this.currentUserBranchId !== null && (!this.filterForm.get('branchIds')?.value || this.filterForm.get('branchIds')?.value?.length === 0)) {
          this.filterForm.get('branchIds')?.setValue([this.currentUserBranchId]);
        }

        const mainFilters = this.prepareInventoryFilters();
        const movementFilters = this.prepareMovementFilters();

        console.log('Prepared filters:', { mainFilters, movementFilters });

        return forkJoin({
          inventoryReport: this.reportService.getInventoryReport(mainFilters).pipe(
            catchError(error => {
              console.error('Error loading inventory report:', error);
              return of({ inventory: [] } as InventoryReportDTO);
            })
          ),
          movementReport: this.reportService.getStockMovementReport(movementFilters).pipe(
            catchError(error => {
              console.error('Error loading movement report:', error);
              return of({ 
                movements: [], 
                totalInflow: 0, 
                totalOutflow: 0, 
                netChange: 0 
              } as StockMovementReportDTO);
            })
          ),
        });
      }),
      switchMap(({ inventoryReport, movementReport }) => {
        console.log('Received reports:', {
          inventory: inventoryReport.inventory.length,
          movements: movementReport.movements.length
        });

        this.reportData = inventoryReport;
        
        // --- 1. Populate Inventory Map for Fallback Lookup ---
        this.inventoryMap.clear();
        if (this.reportData.inventory) {
            this.reportData.inventory.forEach((invItem: any) => {
                // invItem is typically { id: 70, product: {...}, ... }
                // We map ID(70) -> Product Object
                if (invItem.id && invItem.product) {
                    this.inventoryMap.set(invItem.id, invItem.product);
                }
            });
        }

        // --- 2. Strict Client-Side Filtering for Movements ---
        // Backend returns loose dates, we must filter strictly here
        let filteredMovements = [...movementReport.movements];
        const movementFormFilters = this.movementFilterForm.value;
        const startDateStr = movementFormFilters.startDate;
        const endDateStr = movementFormFilters.endDate;

        if (startDateStr && endDateStr) {
            const startFilter = new Date(startDateStr);
            startFilter.setHours(0, 0, 0, 0);
            const endFilter = new Date(endDateStr);
            endFilter.setHours(23, 59, 59, 999);
            
            filteredMovements = filteredMovements.filter(movement => {
                const movementDate = this.parseMovementDate(movement.createdDate);
                return movementDate >= startFilter && movementDate <= endFilter;
            });
        }
        
        this.movementReportData = {
          movements: filteredMovements,
          totalInflow: movementReport.totalInflow,
          totalOutflow: movementReport.totalOutflow,
          netChange: movementReport.netChange
        };

        this.enrichInventoryData();
        this.enrichMovementData();
        
        return of({ success: true });
      }),
      finalize(() => {
        this.isLoading = false;
        this.isMovementLoading = false;
        console.log("OPTIMIZED LOAD: Complete.");
      })
    ).subscribe({
      next: () => {
        this.calculateSummaryMetrics();
        this.initCharts();
        this.prepareDropdownData();
        this.getProductsForMovementFilter();
      },
      error: (error) => {
        console.error('Critical error during data loading pipeline:', error);
        this.initEmptyCharts();
        this.reportData = { inventory: [] };
        this.movementReportData = { movements: [], totalInflow: 0, totalOutflow: 0, netChange: 0 };
      }
    });
  }

  private populateEnrichmentMapsFromArrays(
    branches: BranchDTO[], 
    categories: CategoryDTO[], 
    products: ProductDTO[]
  ): void {
    this.branchMap.clear();
    this.categoryMap.clear();
    this.productMap.clear();
    
    branches.forEach(branch => { 
      if (branch.id) this.branchMap.set(branch.id, branch); 
    });
    
    categories.forEach(category => { 
      if (category.id) this.categoryMap.set(category.id, category); 
    });
    
    products.forEach(product => { 
      if (product.id) this.productMap.set(product.id, product); 
    });

    console.log('Enrichment maps populated:', {
      branches: this.branchMap.size,
      categories: this.categoryMap.size,
      products: this.productMap.size
    });
  }

  private prepareInventoryFilters(): InventoryReportRequestDTO {
    const formFilters = this.filterForm.value;

    const allBranchIds = this.branches.map(b => b.id).filter(id => id !== undefined) as number[];
    // Strict category filtering
    const finalCategoryIds = formFilters.categoryIds?.length > 0 ? formFilters.categoryIds : [];

    const finalBranchIds = formFilters.branchIds?.length > 0
      ? formFilters.branchIds
      : allBranchIds;

    return {
      branchIds: finalBranchIds,
      categoryIds: finalCategoryIds,
      includeLowStock: formFilters.includeLowStock || false,
      startDate: this.formatDateToISO(formFilters.startDate, false),
      endDate: this.formatDateToISO(formFilters.endDate, true)
    };
  }

  private prepareMovementFilters(): StockMovementReportRequestDTO {
    const mainFormFilters = this.filterForm.value;
    const movementFormFilters = this.movementFilterForm.value;
    
    // Inherit from main filters
    const allBranchIds = this.branches.map(b => b.id).filter(id => id !== undefined) as number[];
    const finalBranchIds = mainFormFilters.branchIds?.length > 0 ? mainFormFilters.branchIds : allBranchIds;
    const finalCategoryIds = mainFormFilters.categoryIds?.length > 0 ? mainFormFilters.categoryIds : undefined;

    return {
      branchIds: finalBranchIds,
      categoryIds: finalCategoryIds,
      productId: movementFormFilters.productId,
      startDate: this.formatDateToISO(movementFormFilters.startDate, false),
      endDate: this.formatDateToISO(movementFormFilters.endDate, true)
    };
  }

  private enrichInventoryData(): void {
    this.reportData.inventory.forEach(item => {
      if (item.product?.id) {
        const productDetails = this.productMap.get(Number(item.product.id));
        if (productDetails) {
          item.product = {
            ...item.product,
            ...productDetails,
            name: productDetails.name || item.product.name,
            sku: productDetails.sku || item.product.sku,
            sellingPrice: String(productDetails.sellingPrice || item.product.sellingPrice || '0')
          };
        }
      }
      if (item.category?.id) {
        item.category = this.categoryMap.get(item.category.id) || item.category;
      }
      if (item.branch?.id) {
        item.branch = this.branchMap.get(item.branch.id) || item.branch;
      }
    });
  }

  private enrichMovementData(): void {
    console.log('Enriching movement data, movements count:', this.movementReportData.movements.length);
    
    this.movementReportData.movements.forEach((item: any) => {
      const actualProductId = item.productId;
      const inventoryId = item.inventoryId;
      
      // 1. Primary Lookup: By Product ID
      let product = this.productMap.get(actualProductId);
      
      // 2. Fallback Lookup: By Inventory ID (if Product ID is missing/0)
      if ((!product || actualProductId === 0) && inventoryId) {
          product = this.inventoryMap.get(inventoryId);
      }

      const branch = this.branchMap.get(item.branchId);
      
      if (product) {
        item.productName = product.name || `Product ${actualProductId}`;
        item.productSku = product.sku || 'N/A';
        item.productDisplayName = `${product.name || 'Unknown'} (${product.sku || 'N/A'})`;
        item.categoryName = product.productCategory?.name || 'N/A';
        // Only override price if 0 or null
        if (!item.sellingPrice) {
            item.sellingPrice = product.sellingPrice || null;
        }
        item.supplierName = product.supplier?.name || item.supplierName || 'N/A';
      } else {
        item.productName = `Unknown Product (InvID: ${inventoryId || 'N/A'})`;
        item.productSku = 'N/A';
        item.productDisplayName = `Unknown Product`;
        item.categoryName = 'N/A';
        item.supplierName = 'N/A';
      }
      
      if (branch) {
        item.branchName = branch.name || `Branch ${item.branchId}`;
      } else {
        item.branchName = `Branch ${item.branchId}`;
      }
    });

    this.movementReportData.totalInflow = this.movementReportData.movements
      .filter(m => m.quantity > 0)
      .reduce((sum, m) => sum + m.quantity, 0);
    
    this.movementReportData.totalOutflow = this.movementReportData.movements
      .filter(m => m.quantity < 0)
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    
    this.movementReportData.netChange = this.movementReportData.totalInflow - this.movementReportData.totalOutflow;
  }

  getProductsForMovementFilter(): void {
    const selectedCategoryIds: number[] = this.filterForm.get('categoryIds')?.value || [];
    const selectedBranchIds: number[] = this.filterForm.get('branchIds')?.value || [];
    const productsInInventory = Array.from(this.productMap.values());

    this.availableMovementProducts = productsInInventory.filter(product => {
      const branchMatch = selectedBranchIds.length === 0 || 
                          (product.branches && product.branches.some(pb => selectedBranchIds.includes(pb.branchId.id)));
      const categoryMatch = selectedCategoryIds.length === 0 || 
                            (product.productCategory && selectedCategoryIds.includes(product.productCategory.id));
      return branchMatch && categoryMatch;
    });

    this.availableMovementProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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

  private parseMovementDate(dateInput: string | number[]): Date {
    if (Array.isArray(dateInput)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, ms = 0] = dateInput;
      return new Date(year, month - 1, day, hour, minute, second, ms);
    } else if (typeof dateInput === 'string') {
      return new Date(dateInput);
    } else {
      return new Date();
    }
  }

  applyFilters(): void {
    this.page = 1;
    this.isLoading = true;
    this.isMovementLoading = true;
    this.loadAllDataOptimized();
    this.isFilterFormOpen = false;
  }

  applyMovementFilters(): void {
    this.movementPage = 1;
    this.isMovementLoading = true;

    const movementFilters = this.prepareMovementFilters();
    
    this.reportService.getStockMovementReport(movementFilters).pipe(
      catchError(error => {
        console.error('Error loading movement report:', error);
        return of({ movements: [], totalInflow: 0, totalOutflow: 0, netChange: 0 } as StockMovementReportDTO);
      }),
      finalize(() => {
        this.isMovementLoading = false;
      })
    ).subscribe((movementReport: StockMovementReportDTO) => {
      // --- STRICT CLIENT-SIDE DATE FILTERING (Fix for broken backend filters) ---
      let filteredMovements = [...movementReport.movements];
      const movementFormFilters = this.movementFilterForm.value;
      const startDateStr = movementFormFilters.startDate;
      const endDateStr = movementFormFilters.endDate;

      if (startDateStr && endDateStr) {
          const startFilter = new Date(startDateStr);
          startFilter.setHours(0, 0, 0, 0);
          const endFilter = new Date(endDateStr);
          endFilter.setHours(23, 59, 59, 999);
          
          filteredMovements = filteredMovements.filter(movement => {
              const movementDate = this.parseMovementDate(movement.createdDate);
              return movementDate >= startFilter && movementDate <= endFilter;
          });
      }
      
      this.movementReportData = {
        movements: filteredMovements,
        totalInflow: movementReport.totalInflow,
        totalOutflow: movementReport.totalOutflow,
        netChange: movementReport.netChange
      };

      this.enrichMovementData();
    });

    this.isMovementFilterOpen = false;
  }

  toggleMovementFilter(): void {
    this.isMovementFilterOpen = !this.isMovementFilterOpen;
    this.isFilterFormOpen = false;
  }

  openFilterForm(): void {
    this.isFilterFormOpen = !this.isFilterFormOpen;
    this.isMovementFilterOpen = false;
  }

  resetFilters(): void {
    this.filterForm.reset({
      branchIds: this.currentUserBranchId !== null ? [this.currentUserBranchId] : [],
      categoryIds: [],
      includeLowStock: false,
      dateRange: 'today',
    });
    this.showCustomDateRange = false;
    this.onDateRangeChange(null, this.filterForm);
    this.resetMovementFilters(false);
    this.applyFilters();
  }

  resetMovementFilters(shouldReload: boolean = true): void {
    this.movementFilterForm.reset({
      dateRange: 'today',
      productId: null
    });
    this.showMovementCustomDateRange = false;
    this.onMovementDateRangeChange(null);
    
    if (shouldReload) {
      this.applyMovementFilters();
    }
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
      const price = parseFloat(String(item.product?.sellingPrice || '0')) || 0;
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
    const selectedCategoryIds: number[] = this.filterForm.get('categoryIds')?.value || [];
    
    // STRICT FILTERING: Only show selected categories, or all if none selected
    let categoriesToShow = this.categories;
    if (selectedCategoryIds.length > 0) {
      categoriesToShow = this.categories.filter(c => selectedCategoryIds.includes(c.id));
    }

    const categoryData = categoriesToShow.map((category: CategoryDTO) => {
      const items = this.reportData.inventory.filter((item: InventoryItemDTO) => item.category?.id === category.id);
      const totalStock = items.reduce((sum: number, item: InventoryItemDTO) => sum + item.currentStock, 0);
      return { x: category.name, y: totalStock };
    }).filter(item => item.y > 0 || selectedCategoryIds.length > 0); // Show 0s if explicitly filtered

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
      monthsToDisplay = 3;
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
        const soldPerMonth = totalSold / (this.reportData.inventory.length > 0 ? monthsToDisplay : 1);
        const estimatedStock = totalCurrentStock + (i * soldPerMonth);
        trendValues.push(Math.max(0, Math.round(estimatedStock)));
      }
    }
    
    const chartTitle = monthsToDisplay === 6 ? 'Inventory Trend (Last 6 Months)' : `Inventory Trend (Last ${monthsToDisplay} Months)`;

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
        text: chartTitle,
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
    const selectedBranchIds: number[] = this.filterForm.get('branchIds')?.value || [];
    const branchesToShow = selectedBranchIds.length > 0 
        ? this.branches.filter(b => selectedBranchIds.includes(b.id)) 
        : this.branches;

    const branchData = branchesToShow.map((branch: BranchDTO) => {
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
            width: 200
          },
          legend: {
            position: 'bottom'
          }
        }
      }],
      title: {
        text: 'Stock Distribution by Branch',
        align: 'left'
      },
      legend: {
        position: 'bottom'
      }
    };
  }

  initSalesVsStockChart(): void {
    const selectedCategoryIds: number[] = this.filterForm.get('categoryIds')?.value || [];
    let categoriesToShow = this.categories;
    if (selectedCategoryIds.length > 0) {
      categoriesToShow = this.categories.filter(c => selectedCategoryIds.includes(c.id));
    }

    const categoryStats = categoriesToShow.map((category: CategoryDTO) => {
      const items = this.reportData.inventory.filter((item: InventoryItemDTO) => item.category?.id === category.id);
      const totalStock = items.reduce((sum: number, item: InventoryItemDTO) => sum + item.currentStock, 0);
      const totalSold = items.reduce((sum: number, item: InventoryItemDTO) => sum + item.soldQuantity, 0);

      return {
        name: category.name,
        stock: totalStock,
        sold: totalSold
      };
    }).filter(item => (item.stock > 0 || item.sold > 0) || selectedCategoryIds.length > 0);

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
          aValue = parseFloat(String(a.product?.sellingPrice || '0'));
          bValue = parseFloat(String(b.product?.sellingPrice || '0'));
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
      
      if (column !== 'createdDate') {
        const dateA = this.parseMovementDate(a.createdDate).getTime();
        const dateB = this.parseMovementDate(b.createdDate).getTime();
        if (dateA < dateB) return this.movementSortDirection === 'asc' ? -1 : 1;
        if (dateA > dateB) return this.movementSortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  formatMovementDate(dateString: string | number[]): string {
    let date: Date;

    if (Array.isArray(dateString)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, ms = 0] = dateString;
      date = new Date(year, month - 1, day, hour, minute, second, ms);
    } else if (typeof dateString === 'string') {
      date = new Date(dateString);
    } else {
      return 'N/A';
    }

    if (isNaN(date.getTime())) {
      console.error('Invalid date encountered:', dateString);
      return 'Invalid Date';
    }

    return date.toLocaleString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
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
    console.log('Printing entire report...');
    window.print();
  }
  
  printStockMovementHistory(): void {
    if (!this.movementPrintContent?.nativeElement) {
      console.error('Movement report content element not found for printing.');
      return;
    }

    const content = this.movementPrintContent.nativeElement.innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    
    if (printWindow) {
      printWindow.document.write('<html><head><title>Stock Movement History</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: sans-serif; padding: 20px; }
        h3 { color: #1f2937; margin-bottom: 10px; }
        .print-table-container table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .print-table-container th, .print-table-container td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
        .print-table-container th { background-color: #f9fafb; font-size: 10px; text-transform: uppercase; }
        .print-table-container td { font-size: 12px; }
        .bg-green-50 { background-color: #ecfdf5 !important; }
        .bg-red-50 { background-color: #fef2f2 !important; }
        .text-sm { font-size: 14px; }
        .text-xs { font-size: 12px; }
        .text-green-600 { color: #059669; }
        .text-red-600 { color: #dc2626; }
        .text-blue-600 { color: #2563eb; }
        .flex-space-x-4 > * + * { margin-left: 1rem; }
        @media print {
          .print-hidden { display: none; }
          .print-table-container { page-break-after: always; }
          table { table-layout: fixed; }
          .px-6 { padding-left: 0.5rem; padding-right: 0.5rem; }
        }
      `);
      printWindow.document.write('</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(`<div class="print-table-container">${content}</div>`);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      
      const printTimer = setTimeout(() => {
        printWindow.focus(); 
        printWindow.print();
        clearTimeout(printTimer);
      }, 500);
    } else {
      console.error('Failed to open print window. Check popup blocker settings.');
    }
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