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

  // Two separate filter forms
  filterForm!: FormGroup; // Main Inventory Report Filters
  movementFilterForm!: FormGroup; // Dedicated Stock Movement Filters

  // Data storage
  reportData!: InventoryReportDTO;
  movementReportData: StockMovementReportDTO = {
    movements: [],
    totalInflow: 0,
    totalOutflow: 0,
    netChange: 0
  };

  // Shared Enrichment Maps
  private productMap = new Map<number, ProductDTO>();
  private branchMap = new Map<number, BranchDTO>();
  private categoryMap = new Map<number, CategoryDTO>();

  branches: BranchDTO[] = [];
  categories: CategoryDTO[] = [];
  currentUserBranchId: number | null = null;
  availableMovementProducts: ProductDTO[] = []; // New property for movement filter dropdown

  totalItems = 0;
  lowStockItems = 0;
  totalValue = 0;

  categoriesChartOptions: any;
  stockTrendChartOptions: any;
  branchComparisonChartOptions: any;
  salesVsStockChartOptions: any;

  isFilterFormOpen = false;
  isMovementFilterOpen = false;
  isLoading = false; // Main spinner for initial load of everything
  isMovementLoading = false; // Dedicated spinner for movement table refresh

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

  async ngOnInit(): Promise<void> {
    this.currentUserBranchId = this.reportService.getCurrentUserBranchId();
    this.initFilters();
    this.initEmptyCharts();

    // Use synchronous flow (await) in ngOnInit
    await this.loadInitialData();
  }

  initFilters(): void {
    const initialBranchIds = this.currentUserBranchId !== null ? [this.currentUserBranchId] : [];

    // Main inventory filter form (defaults to user branch)
    this.filterForm = this.fb.group({
      branchIds: [initialBranchIds],
      categoryIds: [[]],
      includeLowStock: [false],
      dateRange: ['last7Days'],
      startDate: [null],
      endDate: [null]
    });

    // Separate movement filter form (defaults to 'Last 3 Days', filtered by Product ID)
    this.movementFilterForm = this.fb.group({
      dateRange: ['3daysAgo'], // Default to 'Last 3 Days'
      startDate: [null],
      endDate: [null],
      productId: [null] // Filter by specific product
    });

    this.onDateRangeChange(null, this.filterForm);
    this.onMovementDateRangeChange(null);
  }

  onDateRangeChange(event: any, form: FormGroup): void {
    const value = form.get('dateRange')?.value;
    this.showCustomDateRange = value === 'custom';

    const today = new Date();
    let startDate: Date = new Date();

    switch (value) {
      case 'today':
      case '3daysAgo':
      case 'last7Days':
      case '1month':
        // Calculate dynamic dates
        if (value === '3daysAgo') startDate.setDate(today.getDate() - 3);
        else if (value === 'last7Days') startDate.setDate(today.getDate() - 7);
        else if (value === '1month') startDate.setMonth(today.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);

        form.patchValue({
          startDate: startDate.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        });
        break;
      default:
        // 'custom' - leave form values alone
        break;
    }
  }

  onMovementDateRangeChange(event: any): void {
    const form = this.movementFilterForm;
    const value = form.get('dateRange')?.value;
    this.showMovementCustomDateRange = value === 'custom';

    if (value === 'all') {
      // The requirement asks for 'Today', 'Last 3 Days', and 'Custom Range'. 'All Time' is removed.
      form.patchValue({ startDate: null, endDate: null });
      return;
    }

    const today = new Date();
    let startDate: Date = new Date();

    switch (value) {
      case 'today':
      case '3daysAgo':
        if (value === '3daysAgo') startDate.setDate(today.getDate() - 3);
        startDate.setHours(0, 0, 0, 0);

        form.patchValue({
          startDate: startDate.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        });
        break;
      default:
        // 'custom' - leave form values alone
        break;
    }
  }

  async loadInitialData(): Promise<void> {
    this.isLoading = true;
    this.isMovementLoading = true;
    console.log("INITIAL LOAD: Starting initial data chain...");

    try {
        // 1. Load basic data (Branches/Categories)
        await Promise.all([this.loadBranches(), this.loadCategories()]);

        // Ensure default branch filter is set
        if (this.currentUserBranchId !== null && this.branches.some(b => b.id === this.currentUserBranchId)) {
            const branchIdArray = [this.currentUserBranchId];
            this.filterForm.get('branchIds')?.setValue(branchIdArray);
            // movementFilterForm no longer has branchIds, it pulls from main filterForm
        }

        // 2. Load and Enrich Inventory Report (Populates Maps)
        await this.loadAndEnrichInventoryReport();

        // 3. Populate product list for Movement Filter
        this.getProductsForMovementFilter();

        // 4. Load and Enrich Stock Movements (Uses Maps)
        await this.loadAndEnrichStockMovements();

        // Final UI updates
        this.calculateSummaryMetrics();
        this.initCharts();
        this.prepareDropdownData();

    } catch (error) {
        console.error('CRITICAL ERROR during initial load:', error);
    } finally {
        this.isLoading = false;
        this.isMovementLoading = false;
        console.log("INITIAL LOAD: Complete.");
    }
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

  // Primary load function that fetches the report and populates the enrichment maps
  private loadAndEnrichInventoryReport(): Promise<void> {
    const formFilters = this.filterForm.value;

    const cleanedFilters: InventoryReportRequestDTO = {
      branchIds: formFilters.branchIds?.length ? formFilters.branchIds : undefined,
      categoryIds: formFilters.categoryIds?.length ? formFilters.categoryIds : undefined,
      includeLowStock: formFilters.includeLowStock || false,
      startDate: this.formatDateToISO(formFilters.startDate, false),
      endDate: this.formatDateToISO(formFilters.endDate, true)
    };

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

    return new Promise((resolve, reject) => {
        this.reportService.getInventoryReport(invReportFilters).pipe(
            switchMap((inventory: InventoryReportDTO) => {
                this.reportData = inventory;
                console.log(`DATA RECEIVED: Inventory items count: ${inventory.inventory?.length}`);

                // Collect unique IDs for ENRICHMENT
                const inventoryProductIds = this.reportData.inventory.map(item => item.product?.id).filter((id): id is number | string => id !== undefined && id !== null);
                const inventoryCategoryIds = this.reportData.inventory.map(item => item.category?.id).filter((id): id is number => id !== undefined && id !== null);
                const inventoryBranchIds = this.reportData.inventory.map(item => item.branch?.id).filter((id): id is number => id !== undefined && id !== null);

                const uniqueProductIds = [...new Set(inventoryProductIds)].map(id => Number(id));
                const uniqueCategoryIds = [...new Set(inventoryCategoryIds)];
                const uniqueBranchIds = [...new Set(inventoryBranchIds)];

                const validProductIds = uniqueProductIds.filter(id => id > 0);
                const validBranchIds = uniqueBranchIds.filter(id => id > 0);

                const productRequests = validProductIds.map(id => this.reportService.getProductById(id).pipe(catchError(() => of(null))));
                const categoryRequests = uniqueCategoryIds.map(id => this.reportService.getCategoryById(id).pipe(catchError(() => of(null))));
                const branchRequests = validBranchIds.map(id => this.reportService.getBranchById(id).pipe(catchError(() => of(null))));

                return forkJoin({
                    products: productRequests.length ? forkJoin(productRequests) : of([]),
                    categories: categoryRequests.length ? forkJoin(categoryRequests) : of([]),
                    branches: branchRequests.length ? forkJoin(branchRequests) : of([])
                });
            }),
            catchError((error: any) => {
                console.error('ERROR: Inventory processing error:', error);
                this.reportData = { inventory: [] };
                return of({ products: [], categories: [], branches: [] });
            })
        ).subscribe({
            next: (fullData: any) => {
                // Populate Shared Maps
                this.productMap = new Map(fullData.products.filter((p: any) => p !== null && p!.id > 0).map((p: any) => [p!.id, p!]));
                this.categoryMap = new Map(fullData.categories.filter((c: any) => c !== null).map((c: any) => [c!.id, c!]));
                this.branchMap = new Map(fullData.branches.filter((b: any) => b !== null).map((b: any) => [b!.id, b!]));

                // Enrich Inventory Data (uses the newly created maps)
                this.reportData.inventory.forEach(item => {
                    if (item.product?.id) {
                        const productDetails = this.productMap.get(Number(item.product.id));
                        if (productDetails) {
                            Object.assign(item.product, productDetails);
                        }
                    }
                    if (item.category?.id) {
                        item.category = this.categoryMap.get(item.category.id) || item.category;
                    }
                    if (item.branch?.id) {
                        item.branch = this.branchMap.get(item.branch.id) || item.branch;
                    }
                });
                console.log('ENRICHMENT (INV): Data mapping complete.');

                // After main report load, update products for the movement filter
                this.getProductsForMovementFilter();

                resolve();
            },
            error: reject
        });
    });
  }

  // Helper to prepare the product list for the movement filter dropdown
  getProductsForMovementFilter(): void {
    const selectedCategoryIds: number[] = this.filterForm.get('categoryIds')?.value || [];
    const selectedBranchIds: number[] = this.filterForm.get('branchIds')?.value || [];

    // Filter the product map to only include products present in the current inventory
    const productsInInventory = Array.from(this.productMap.values());

    this.availableMovementProducts = productsInInventory.filter(product => {
      // Find all inventory items for this product
      const inventoryItems = this.reportData.inventory.filter(item => item.product?.id === product.id);

      // Check if any inventory item for this product matches the main filter criteria
      const matchesBranch = selectedBranchIds.length === 0 || inventoryItems.some(item => selectedBranchIds.includes(item.branch?.id || -1));
      const matchesCategory = selectedCategoryIds.length === 0 || inventoryItems.some(item => selectedCategoryIds.includes(item.category?.id || -1));

      return matchesBranch && matchesCategory;
    });

    // Sort by product name
    this.availableMovementProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }


  // Dedicated load function for Stock Movement Report that uses existing maps
  loadAndEnrichStockMovements(filters?: StockMovementReportRequestDTO): Promise<void> {
    this.isMovementLoading = true;

    // Use branchIds and categoryIds from the main filterForm
    const mainFormFilters = this.filterForm.value;
    const movementFormFilters = this.movementFilterForm.value;

    const allBranchIds = this.branches.map(b => b.id);
    const finalBranchIds = mainFormFilters.branchIds && mainFormFilters.branchIds.length > 0
        ? mainFormFilters.branchIds
        : (this.branches.length > 0 ? allBranchIds : undefined);

    const movementFilters: StockMovementReportRequestDTO = {
      branchIds: finalBranchIds || [], // Use main branch filter
      categoryIds: mainFormFilters.categoryIds?.length ? mainFormFilters.categoryIds : undefined, // Use main category filter (optional)
      productId: movementFormFilters.productId, // Use the new dedicated product filter
      startDate: this.formatDateToISO(movementFormFilters.startDate, false),
      endDate: this.formatDateToISO(movementFormFilters.endDate, true)
    };

    return new Promise((resolve, reject) => {
        this.reportService.getStockMovementReport(movementFilters).pipe(
            catchError((error: any) => {
                console.error('ERROR: Failed loading stock movement report:', error);
                this.movementReportData = { movements: [], totalInflow: 0, totalOutflow: 0, netChange: 0 };
                return of(this.movementReportData);
            }),
            finalize(() => this.isMovementLoading = false)
        ).subscribe({
            next: (movementsReport: StockMovementReportDTO) => {
                this.movementReportData.movements = movementsReport.movements;

                // Recalculate summary metrics in the component
                this.movementReportData.totalInflow = movementsReport.movements.filter(m => m.quantity > 0).reduce((sum, m) => sum + m.quantity, 0);
                this.movementReportData.totalOutflow = movementsReport.movements.filter(m => m.quantity < 0).reduce((sum, m) => sum + Math.abs(m.quantity), 0);
                this.movementReportData.netChange = this.movementReportData.totalInflow - this.movementReportData.totalOutflow;

                // Enrich Stock Movements using the shared maps
                this.movementReportData.movements.forEach(item => {
                    const product = this.productMap.get(item.productId);
                    const branch = this.branchMap.get(item.branchId);

                    // Use enriched data or fallback placeholders
                    item.productName = product?.name || `Unknown Product`;
                    item.productSku = product?.sku || 'N/A';
                    item.branchName = branch?.name || `Unknown Branch`;

                    if (product) {
                        item.sellingPrice = item.sellingPrice || product.sellingPrice || null;
                        item.supplierName = product.supplier?.name || item.supplierName;
                    }
                });

                // The grouping logic has been removed from the component side as it should be handled by the API based on the original `groupByMovement` property, but since the property is now replaced with `productId`, we default the component-side grouping to 'none' for detailed viewing.
                this.groupByMovement = 'none';
                this.sortMovementData('createdDate');
                resolve();
            },
            error: reject
        });
    });
  }

  // Main filter apply method (calls loadInventoryReport)
  applyFilters(): void {
    this.page = 1;

    // Trigger main inventory load which runs its own enrichment, chart updates, and updates the movement product list
    this.loadAndEnrichInventoryReport().then(() => {
        // Reset movement filter to re-run it with the new main filters applied
        this.movementFilterForm.get('productId')?.setValue(null);
        this.movementFilterForm.get('dateRange')?.setValue('3daysAgo');
        this.onMovementDateRangeChange(null);
        this.loadAndEnrichStockMovements();
    });

    this.isFilterFormOpen = false;
  }

  // Dedicated filter apply method for movements
  applyMovementFilters(): void {
    this.movementPage = 1;

    // Trigger movement load which runs its own enrichment
    this.loadAndEnrichStockMovements();
    this.isMovementFilterOpen = false;
  }

  // Toggle for movement filter form
  toggleMovementFilter(): void {
    this.isMovementFilterOpen = !this.isMovementFilterOpen;
    this.isFilterFormOpen = false; // Close main filter when opening movement filter
  }

  // Toggle for main filter form
  openFilterForm(): void {
    this.isFilterFormOpen = !this.isFilterFormOpen;
    this.isMovementFilterOpen = false; // Close movement filter when opening main filter
  }

  resetFilters(): void {
    this.filterForm.reset({
      branchIds: this.currentUserBranchId !== null ? [this.currentUserBranchId] : [],
      categoryIds: [],
      includeLowStock: false,
      dateRange: 'last7Days',
    });
    this.showCustomDateRange = false;
    this.onDateRangeChange(null, this.filterForm);
    this.loadAndEnrichInventoryReport();
    this.isFilterFormOpen = false;
  }

  resetMovementFilters(): void {
    this.movementFilterForm.reset({
      dateRange: '3daysAgo',
      productId: null
    });
    this.showMovementCustomDateRange = false;
    this.onMovementDateRangeChange(null);
    this.loadAndEnrichStockMovements();
    this.isMovementFilterOpen = false;
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
      const price = parseFloat(String(item.product?.sellingPrice || '0')) || parseFloat(String(item.product?.costPrice || '0'));
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
      return 0;
    });
  }

  formatMovementDate(dateString: string | number[]): string {
    let date: Date;

    // Handle array format [year, month, day, hour, minute, second, millisecond]
    if (Array.isArray(dateString)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, ms = 0] = dateString;
      date = new Date(year, month - 1, day, hour, minute, second, ms);
    } else {
      // Handle ISO string format
      date = new Date(dateString);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return 'Invalid Date';
    }

    // Since groupByMovement is fixed to 'none' in the movement filter, always show detailed date/time.
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