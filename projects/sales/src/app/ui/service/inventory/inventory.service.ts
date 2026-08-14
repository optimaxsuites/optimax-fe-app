// inventory.service.ts
// ============================================================
// IMPORTS
// ============================================================

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError, delay, shareReplay } from 'rxjs/operators';
import {
  Product,
  Branch,
  BranchInventory,
  StockMovement,
  RestockRequest,
  StockAlert,
  ProductPerformance,
  BranchStockSummary,
  InventoryDashboardData,
  InventoryDashboardStats,
  QuickAction,
  ProductFilters,
  MovementFilters,
  RestockFilters,
  ApiResponse,
  PaginatedResponse,
  ProductStatus,
  MovementType,
  MovementStatus,
  RestockStatus,
  RestockUrgency,
  StockAlertType,
  StockAlertSeverity,
  Supplier,
  Category,
  MeasurementUnit
} from '../../domain/inventory/inventory.dto';

// ============================================================
// ENVIRONMENT CONFIG
// ============================================================

const API_BASE = '/api/inventory';

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_STATS: InventoryDashboardStats = {
  totalSkus: 1420,
  totalStockValue: 245000000,
  totalStockUnits: 85200,
  lowStockItems: 14,
  outOfStockItems: 3,
  totalBranches: 6,
  monthlyMovementCount: 324,
  monthlyMovementValue: 48500000,
  averageStockTurnover: 4.2,
  totalProfit: 12400000,
  lastUpdated: new Date()
};

const MOCK_ALERTS: StockAlert[] = [
  {
    id: 'alt-1',
    type: StockAlertType.OUT_OF_STOCK,
    severity: StockAlertSeverity.CRITICAL,
    productId: 'prod-1',
    productName: 'Cement Dangote Grade 42.5R',
    sku: 'CEM-DG-425',
    branchId: 'br-1',
    branchName: 'Lagos Main Warehouse',
    currentStock: 0,
    threshold: 100,
    message: 'Dangote Cement is completely out of stock at Lagos Warehouse!',
    isResolved: false,
    createdAt: new Date(),
    resolvedAt: new Date()
  },
  {
    id: 'alt-2',
    type: StockAlertType.LOW_STOCK,
    severity: StockAlertSeverity.WARNING,
    productId: 'prod-2',
    productName: 'Iron Rod 16mm (Per Ton)',
    sku: 'IRN-16MM-TON',
    branchId: 'br-2',
    branchName: 'Abuja Distribution Hub',
    currentStock: 12,
    threshold: 50,
    message: 'Iron Rod 16mm is below the reorder point of 50 tons.',
    isResolved: false,
    createdAt: new Date(Date.now() - 3600000),
    resolvedAt: new Date()
  },
  {
    id: 'alt-3',
    type: StockAlertType.EXPIRING,
    severity: StockAlertSeverity.INFO,
    productId: 'prod-3',
    productName: 'Wall Paint White Satin 20L',
    sku: 'PNT-WS-20L',
    branchId: 'br-3',
    branchName: 'Port Harcourt Store',
    currentStock: 85,
    threshold: 10,
    message: 'Premium Satin Paint batch #2024-09 expires in 30 days.',
    isResolved: false,
    createdAt: new Date(Date.now() - 7200000),
    resolvedAt: new Date()
  }
];

const MOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    productId: 'prod-1',
    productName: 'Cement Dangote Grade 42.5R',
    sku: 'CEM-DG-425',
    fromLocation: { type: 'SUPPLIER', id: 'sup-1', name: 'Dangote Cement Factory' },
    toLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    quantity: 600,
    movementType: MovementType.PURCHASE,
    status: MovementStatus.COMPLETED,
    cost: 3600000,
    sellingPrice: 4200000,
    trackingNumber: 'TRK-DG-99238',
    batchNumber: 'BAT-2026-08',
    expiryDate: new Date(Date.now() + 180 * 24 * 3600000),
    notes: 'Restock purchase order PO-8892',
    createdBy: 'usr-1',
    createdByName: 'John Doe',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 1800000),
    approvedAt: new Date(Date.now() - 1700000),
    completedAt: new Date(Date.now() - 1200000)
  },
  {
    id: 'mov-2',
    productId: 'prod-2',
    productName: 'Iron Rod 16mm (Per Ton)',
    sku: 'IRN-16MM-TON',
    fromLocation: { type: 'WAREHOUSE', id: 'br-1', name: 'Lagos Main Warehouse' },
    toLocation: { type: 'BRANCH', id: 'br-2', name: 'Abuja Distribution Hub' },
    quantity: 45,
    movementType: MovementType.TRANSFER,
    status: MovementStatus.IN_TRANSIT,
    cost: 13500000,
    sellingPrice: 15750000,
    trackingNumber: 'TRK-TX-44021',
    batchNumber: 'BAT-2026-02',
    expiryDate: new Date(),
    notes: 'Inter-branch stock transfer to meet sudden demand',
    createdBy: 'usr-1',
    createdByName: 'John Doe',
    approvedBy: 'usr-2',
    approvedByName: 'Jane Smith',
    createdAt: new Date(Date.now() - 5400000),
    approvedAt: new Date(Date.now() - 5200000),
    completedAt: new Date()
  },
  {
    id: 'mov-3',
    productId: 'prod-3',
    productName: 'Wall Paint White Satin 20L',
    sku: 'PNT-WS-20L',
    fromLocation: { type: 'BRANCH', id: 'br-3', name: 'Port Harcourt Store' },
    toLocation: { type: 'CUSTOMER', id: 'cust-1', name: 'Julius Berger Site C' },
    quantity: 120,
    movementType: MovementType.SALE,
    status: MovementStatus.COMPLETED,
    cost: 2160000,
    sellingPrice: 2880000,
    trackingNumber: 'TRK-SL-77890',
    batchNumber: 'BAT-2025-11',
    expiryDate: new Date(Date.now() + 365 * 24 * 3600000),
    notes: 'Invoice INV-10023 sales delivery',
    createdBy: 'usr-4',
    createdByName: 'Mary Okoye',
    approvedBy: 'usr-4',
    approvedByName: 'Mary Okoye',
    createdAt: new Date(Date.now() - 10800000),
    approvedAt: new Date(Date.now() - 10800000),
    completedAt: new Date(Date.now() - 9000000)
  }
];

const MOCK_TOP_PRODUCTS: ProductPerformance[] = [
  {
    productId: 'prod-1',
    productName: 'Cement Dangote Grade 42.5R',
    sku: 'CEM-DG-425',
    category: 'Building Materials',
    totalSold: 12500,
    totalRevenue: 87500000,
    totalProfit: 12500000,
    averagePrice: 7000,
    sellThroughRate: 88,
    stockTurnover: 6.5,
    daysOfInventory: 15,
    performanceScore: 94,
    trend: 'UP',
    period: { start: new Date(), end: new Date() }
  },
  {
    productId: 'prod-2',
    productName: 'Iron Rod 16mm (Per Ton)',
    sku: 'IRN-16MM-TON',
    category: 'Metal & Steel',
    totalSold: 180,
    totalRevenue: 63000000,
    totalProfit: 9000000,
    averagePrice: 350000,
    sellThroughRate: 74,
    stockTurnover: 3.8,
    daysOfInventory: 24,
    performanceScore: 86,
    trend: 'UP',
    period: { start: new Date(), end: new Date() }
  },
  {
    productId: 'prod-4',
    productName: 'PVC Pipes 4-inch (Length 6m)',
    sku: 'PVC-4IN-6M',
    category: 'Plumbing & Pipes',
    totalSold: 4200,
    totalRevenue: 29400000,
    totalProfit: 5880000,
    averagePrice: 7000,
    sellThroughRate: 91,
    stockTurnover: 8.2,
    daysOfInventory: 11,
    performanceScore: 89,
    trend: 'STABLE',
    period: { start: new Date(), end: new Date() }
  },
  {
    productId: 'prod-3',
    productName: 'Wall Paint White Satin 20L',
    sku: 'PNT-WS-20L',
    category: 'Paints & Finishes',
    totalSold: 950,
    totalRevenue: 22800000,
    totalProfit: 5700000,
    averagePrice: 24000,
    sellThroughRate: 68,
    stockTurnover: 2.9,
    daysOfInventory: 35,
    performanceScore: 78,
    trend: 'DOWN',
    period: { start: new Date(), end: new Date() }
  }
];

const MOCK_BRANCH_SUMMARIES: BranchStockSummary[] = [
  {
    branchId: 'br-1',
    branchName: 'Lagos Main Warehouse',
    totalProducts: 850,
    totalStockValue: 120500000,
    totalStockUnits: 42000,
    lowStockCount: 4,
    outOfStockCount: 1,
    topSellingProducts: []
  },
  {
    branchId: 'br-2',
    branchName: 'Abuja Distribution Hub',
    totalProducts: 620,
    totalStockValue: 72100000,
    totalStockUnits: 24500,
    lowStockCount: 6,
    outOfStockCount: 2,
    topSellingProducts: []
  },
  {
    branchId: 'br-3',
    branchName: 'Port Harcourt Store',
    totalProducts: 480,
    totalStockValue: 36200000,
    totalStockUnits: 12800,
    lowStockCount: 2,
    outOfStockCount: 0,
    topSellingProducts: []
  },
  {
    branchId: 'br-4',
    branchName: 'Kano Outlet',
    totalProducts: 310,
    totalStockValue: 16200000,
    totalStockUnits: 5900,
    lowStockCount: 2,
    outOfStockCount: 0,
    topSellingProducts: []
  }
];

const MOCK_DASHBOARD_DATA: InventoryDashboardData = {
  stats: MOCK_STATS,
  alerts: MOCK_ALERTS,
  recentMovements: MOCK_MOVEMENTS,
  topProducts: MOCK_TOP_PRODUCTS,
  branchSummaries: MOCK_BRANCH_SUMMARIES,
  quickActions: []
};

// ============================================================
// INVENTORY SERVICE
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  // ============================================================
  // STATE MANAGEMENT
  // ============================================================

  private dashboardDataSubject = new BehaviorSubject<InventoryDashboardData | null>(null);
  dashboardData$ = this.dashboardDataSubject.asObservable();

  private productsSubject = new BehaviorSubject<Product[]>([]);
  products$ = this.productsSubject.asObservable();

  private branchesSubject = new BehaviorSubject<Branch[]>([]);
  branches$ = this.branchesSubject.asObservable();

  private branchInventorySubject = new BehaviorSubject<BranchInventory[]>([]);
  branchInventory$ = this.branchInventorySubject.asObservable();

  private movementsSubject = new BehaviorSubject<StockMovement[]>([]);
  movements$ = this.movementsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  private currentBranchIdSubject = new BehaviorSubject<string | null>(null);
  currentBranchId$ = this.currentBranchIdSubject.asObservable();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(private http: HttpClient) { }

  // ============================================================
  // DASHBOARD
  // ============================================================

  /**
   * Get inventory dashboard data
   */
  getDashboardData(): Observable<InventoryDashboardData> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<ApiResponse<InventoryDashboardData>>(`${API_BASE}/dashboard`)
      .pipe(
        map(response => response.data),
        tap(data => {
          this.dashboardDataSubject.next(data);
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.dashboardDataSubject.next(MOCK_DASHBOARD_DATA);
          this.loadingSubject.next(false);
          return of(MOCK_DASHBOARD_DATA);
        })
      );
  }

  /**
   * Get dashboard stats only
   */
  getDashboardStats(): Observable<InventoryDashboardStats> {
    return this.http.get<ApiResponse<InventoryDashboardStats>>(`${API_BASE}/dashboard/stats`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          return of(MOCK_STATS);
        })
      );
  }

  /**
   * Get dashboard alerts
   */
  getDashboardAlerts(): Observable<StockAlert[]> {
    return this.http.get<ApiResponse<StockAlert[]>>(`${API_BASE}/dashboard/alerts`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          return of(MOCK_ALERTS);
        })
      );
  }

  /**
   * Get recent stock movements
   */
  getRecentMovements(limit: number = 10): Observable<StockMovement[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ApiResponse<StockMovement[]>>(`${API_BASE}/dashboard/movements`, { params })
      .pipe(
        map(response => response.data),
        catchError(err => {
          return of(MOCK_MOVEMENTS.slice(0, limit));
        })
      );
  }

  /**
   * Get top selling products
   */
  getTopProducts(limit: number = 5): Observable<ProductPerformance[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ApiResponse<ProductPerformance[]>>(`${API_BASE}/dashboard/top-products`, { params })
      .pipe(
        map(response => response.data),
        catchError(err => {
          return of(MOCK_TOP_PRODUCTS.slice(0, limit));
        })
      );
  }

  /**
   * Get branch stock summaries
   */
  getBranchSummaries(): Observable<BranchStockSummary[]> {
    return this.http.get<ApiResponse<BranchStockSummary[]>>(`${API_BASE}/dashboard/branch-summaries`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          return of(MOCK_BRANCH_SUMMARIES);
        })
      );
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${API_BASE}/alerts/${alertId}/resolve`, {})
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to resolve alert');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // PRODUCTS
  // ============================================================

  /**
   * Get all products with filters
   */
  getProducts(filters?: ProductFilters): Observable<PaginatedResponse<Product>> {
    this.loadingSubject.next(true);

    let params = new HttpParams();
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.brand) params = params.set('brand', filters.brand);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.minPrice) params = params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice.toString());
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<ApiResponse<PaginatedResponse<Product>>>(`${API_BASE}/products`, { params })
      .pipe(
        map(response => response.data),
        tap(data => {
          this.productsSubject.next(data.data);
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load products');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get a single product
   */
  getProduct(id: string): Observable<Product> {
    this.loadingSubject.next(true);

    return this.http.get<ApiResponse<Product>>(`${API_BASE}/products/${id}`)
      .pipe(
        map(response => response.data),
        tap(() => this.loadingSubject.next(false)),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load product');
          return throwError(() => err);
        })
      );
  }

  /**
   * Create a new product
   */
  createProduct(product: Partial<Product>): Observable<Product> {
    this.loadingSubject.next(true);

    return this.http.post<ApiResponse<Product>>(`${API_BASE}/products`, product)
      .pipe(
        map(response => response.data),
        tap(() => {
          this.loadingSubject.next(false);
          this.getProducts().subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to create product');
          return throwError(() => err);
        })
      );
  }

  /**
   * Update a product
   */
  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    this.loadingSubject.next(true);

    return this.http.put<ApiResponse<Product>>(`${API_BASE}/products/${id}`, product)
      .pipe(
        map(response => response.data),
        tap(() => {
          this.loadingSubject.next(false);
          this.getProducts().subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to update product');
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete a product
   */
  deleteProduct(id: string): Observable<void> {
    this.loadingSubject.next(true);

    return this.http.delete<ApiResponse<void>>(`${API_BASE}/products/${id}`)
      .pipe(
        map(response => response.data),
        tap(() => {
          this.loadingSubject.next(false);
          this.getProducts().subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to delete product');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // BRANCHES
  // ============================================================

  /**
   * Get all branches
   */
  getBranches(): Observable<Branch[]> {
    return this.http.get<ApiResponse<Branch[]>>(`${API_BASE}/branches`)
      .pipe(
        map(response => response.data),
        tap(data => this.branchesSubject.next(data)),
        catchError(err => {
          this.errorSubject.next('Failed to load branches');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get a single branch
   */
  getBranch(id: string): Observable<Branch> {
    return this.http.get<ApiResponse<Branch>>(`${API_BASE}/branches/${id}`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to load branch');
          return throwError(() => err);
        })
      );
  }

  /**
   * Update a branch
   */
  updateBranch(id: string, branch: Partial<Branch>): Observable<Branch> {
    return this.http.put<ApiResponse<Branch>>(`${API_BASE}/branches/${id}`, branch)
      .pipe(
        map(response => response.data),
        tap(updated => {
          const current = this.branchesSubject.value;
          const index = current.findIndex(b => b.id === id);
          if (index !== -1) {
            current[index] = updated;
            this.branchesSubject.next([...current]);
          }
        }),
        catchError(err => {
          this.errorSubject.next('Failed to update branch');
          return throwError(() => err);
        })
      );
  }

  /**
   * Create a branch
   */
  createBranch(branch: Partial<Branch>): Observable<Branch> {
    return this.http.post<ApiResponse<Branch>>(`${API_BASE}/branches`, branch)
      .pipe(
        map(response => response.data),
        tap(created => {
          const current = this.branchesSubject.value;
          this.branchesSubject.next([...current, created]);
        }),
        catchError(err => {
          this.errorSubject.next('Failed to create branch');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get branch inventory
   */
  getBranchInventory(branchId: string): Observable<BranchInventory[]> {
    this.loadingSubject.next(true);

    return this.http.get<ApiResponse<BranchInventory[]>>(`${API_BASE}/branches/${branchId}/inventory`)
      .pipe(
        map(response => response.data),
        tap(data => {
          this.branchInventorySubject.next(data);
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load branch inventory');
          return throwError(() => err);
        })
      );
  }

  /**
   * Set current branch
   */
  setCurrentBranch(branchId: string | null): void {
    this.currentBranchIdSubject.next(branchId);
  }

  /**
   * Get current branch ID
   */
  getCurrentBranchId(): string | null {
    return this.currentBranchIdSubject.value;
  }

  // ============================================================
  // STOCK MOVEMENTS
  // ============================================================

  /**
   * Get stock movements with filters
   */
  getMovements(filters?: MovementFilters): Observable<PaginatedResponse<StockMovement>> {
    this.loadingSubject.next(true);

    let params = new HttpParams();
    if (filters) {
      if (filters.type) params = params.set('type', filters.type);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.branchId) params = params.set('branchId', filters.branchId);
      if (filters.productId) params = params.set('productId', filters.productId);
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo.toISOString());
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<ApiResponse<PaginatedResponse<StockMovement>>>(`${API_BASE}/movements`, { params })
      .pipe(
        map(response => response.data),
        tap(data => {
          this.movementsSubject.next(data.data);
          this.loadingSubject.next(false);
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load movements');
          return throwError(() => err);
        })
      );
  }

  /**
   * Create a stock movement (transfer/transfer)
   */
  createMovement(movement: Partial<StockMovement>): Observable<StockMovement> {
    this.loadingSubject.next(true);

    return this.http.post<ApiResponse<StockMovement>>(`${API_BASE}/movements`, movement)
      .pipe(
        map(response => response.data),
        tap(() => {
          this.loadingSubject.next(false);
          this.getMovements().subscribe();
          this.getDashboardData().subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to create movement');
          return throwError(() => err);
        })
      );
  }

  /**
   * Update a stock movement
   */
  updateMovement(id: string, movement: Partial<StockMovement>): Observable<StockMovement> {
    this.loadingSubject.next(true);

    return this.http.put<ApiResponse<StockMovement>>(`${API_BASE}/movements/${id}`, movement)
      .pipe(
        map(response => response.data),
        tap(() => {
          this.loadingSubject.next(false);
          this.getMovements().subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to update movement');
          return throwError(() => err);
        })
      );
  }

  /**
   * Approve a stock movement
   */
  approveMovement(id: string): Observable<void> {
    this.loadingSubject.next(true);

    return this.http.post<ApiResponse<void>>(`${API_BASE}/movements/${id}/approve`, {})
      .pipe(
        map(response => response.data),
        tap(() => {
          this.loadingSubject.next(false);
          this.getMovements().subscribe();
          this.getDashboardData().subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to approve movement');
          return throwError(() => err);
        })
      );
  }

  /**
   * Reject a stock movement
   */
  rejectMovement(id: string, reason: string): Observable<void> {
    this.loadingSubject.next(true);

    return this.http.post<ApiResponse<void>>(`${API_BASE}/movements/${id}/reject`, { reason })
      .pipe(
        map(response => response.data),
        tap(() => {
          this.loadingSubject.next(false);
          this.getMovements().subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to reject movement');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get a single movement
   */
  getMovement(id: string): Observable<StockMovement> {
    return this.http.get<ApiResponse<StockMovement>>(`${API_BASE}/movements/${id}`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to load movement');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // RESTOCKING
  // ============================================================

  /**
   * Get restock requests with filters
   */
  getRestockRequests(filters?: RestockFilters): Observable<PaginatedResponse<RestockRequest>> {
    this.loadingSubject.next(true);

    let params = new HttpParams();
    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.urgency) params = params.set('urgency', filters.urgency);
      if (filters.branchId) params = params.set('branchId', filters.branchId);
      if (filters.productId) params = params.set('productId', filters.productId);
      if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params = params.set('dateTo', filters.dateTo.toISOString());
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<ApiResponse<PaginatedResponse<RestockRequest>>>(`${API_BASE}/restock/requests`, { params })
      .pipe(
        map(response => response.data),
        tap(() => this.loadingSubject.next(false)),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to load restock requests');
          return throwError(() => err);
        })
      );
  }

  /**
   * Create a restock request
   */
  createRestockRequest(request: Partial<RestockRequest>): Observable<RestockRequest> {
    this.loadingSubject.next(true);

    return this.http.post<ApiResponse<RestockRequest>>(`${API_BASE}/restock/requests`, request)
      .pipe(
        map(response => response.data),
        tap(() => {
          this.loadingSubject.next(false);
          this.getRestockRequests().subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to create restock request');
          return throwError(() => err);
        })
      );
  }

  /**
   * Approve a restock request
   */
  approveRestockRequest(id: string, notes: string): Observable<void> {
    this.loadingSubject.next(true);

    return this.http.post<ApiResponse<void>>(`${API_BASE}/restock/requests/${id}/approve`, { notes })
      .pipe(
        map(response => response.data),
        tap(() => {
          this.loadingSubject.next(false);
          this.getRestockRequests().subscribe();
          this.getDashboardData().subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to approve restock request');
          return throwError(() => err);
        })
      );
  }

  /**
   * Reject a restock request
   */
  rejectRestockRequest(id: string, reason: string): Observable<void> {
    this.loadingSubject.next(true);

    return this.http.post<ApiResponse<void>>(`${API_BASE}/restock/requests/${id}/reject`, { reason })
      .pipe(
        map(response => response.data),
        tap(() => {
          this.loadingSubject.next(false);
          this.getRestockRequests().subscribe();
        }),
        catchError(err => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Failed to reject restock request');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get restock suggestions for a branch
   */
  getRestockSuggestions(branchId: string): Observable<RestockRequest[]> {
    return this.http.get<ApiResponse<RestockRequest[]>>(`${API_BASE}/restock/suggestions/${branchId}`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to load restock suggestions');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // ANALYTICS
  // ============================================================

  /**
   * Get product performance
   */
  getProductPerformance(productId: string, period?: { start: Date; end: Date }): Observable<ProductPerformance> {
    let params = new HttpParams();
    if (period) {
      params = params.set('start', period.start.toISOString());
      params = params.set('end', period.end.toISOString());
    }

    return this.http.get<ApiResponse<ProductPerformance>>(`${API_BASE}/analytics/products/${productId}`, { params })
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to load product performance');
          return throwError(() => err);
        })
      );
  }

  /**
   * Get branch analytics
   */
  getBranchAnalytics(branchId: string): Observable<BranchStockSummary> {
    return this.http.get<ApiResponse<BranchStockSummary>>(`${API_BASE}/analytics/branches/${branchId}`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to load branch analytics');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // QUICK ACTIONS
  // ============================================================

  /**
   * Get quick actions configuration
   */
  getQuickActions(): QuickAction[] {
    return [
      {
        id: 'create-transfer',
        label: 'Create Transfer',
        icon: 'fa-exchange-alt',
        route: '/inventory/movements/transfer',
        color: '#2E6276',
        description: 'Transfer stock between branches'
      },
      {
        id: 'request-restock',
        label: 'Request Restock',
        icon: 'fa-truck-loading',
        route: '/inventory/restock/requests/new',
        color: '#F5A623',
        description: 'Request restock from procurement'
      },
      {
        id: 'stock-count',
        label: 'Stock Count',
        icon: 'fa-clipboard-list',
        route: '/inventory/movements/adjustment',
        color: '#8B5CF6',
        description: 'Perform stock count adjustment'
      },
      {
        id: 'add-product',
        label: 'Add Product',
        icon: 'fa-plus-circle',
        route: '/inventory/products/new',
        color: '#2EB270',
        description: 'Add new product to catalog'
      }
    ];
  }

  // ============================================================
  // CLEAR STATE
  // ============================================================

  clearState(): void {
    this.dashboardDataSubject.next(null);
    this.productsSubject.next([]);
    this.branchesSubject.next([]);
    this.branchInventorySubject.next([]);
    this.movementsSubject.next([]);
    this.loadingSubject.next(false);
    this.errorSubject.next(null);
    this.currentBranchIdSubject.next(null);
  }

  // inventory.service.ts - Add these methods

  // ============================================================
  // CATEGORIES
  // ============================================================

  /**
   * Get all categories
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(`${API_BASE}/categories`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to load categories');
          return throwError(() => err);
        })
      );
  }

  /**
   * Create a category
   */
  createCategory(category: Partial<Category>): Observable<Category[]> {
    return this.http.post<ApiResponse<Category[]>>(`${API_BASE}/categories`, category)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to create category');
          return throwError(() => err);
        })
      );
  }

  /**
   * Update a category
   */
  updateCategory(id: string, category: Partial<Category>): Observable<Category[]> {
    return this.http.put<ApiResponse<Category[]>>(`${API_BASE}/categories/${id}`, category)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to update category');
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete a category
   */
  deleteCategory(id: string): Observable<Category[]> {
    return this.http.delete<ApiResponse<Category[]>>(`${API_BASE}/categories/${id}`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to delete category');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // MEASUREMENT UNITS
  // ============================================================

  /**
   * Get all measurement units
   */
  getMeasurementUnits(): Observable<MeasurementUnit[]> {
    return this.http.get<ApiResponse<MeasurementUnit[]>>(`${API_BASE}/units`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to load units');
          return throwError(() => err);
        })
      );
  }

  /**
   * Create a measurement unit
   */
  createMeasurementUnit(unit: Partial<MeasurementUnit>): Observable<MeasurementUnit[]> {
    return this.http.post<ApiResponse<MeasurementUnit[]>>(`${API_BASE}/units`, unit)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to create unit');
          return throwError(() => err);
        })
      );
  }

  /**
   * Update a measurement unit
   */
  updateMeasurementUnit(id: string, unit: Partial<MeasurementUnit>): Observable<MeasurementUnit[]> {
    return this.http.put<ApiResponse<MeasurementUnit[]>>(`${API_BASE}/units/${id}`, unit)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to update unit');
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete a measurement unit
   */
  deleteMeasurementUnit(id: string): Observable<MeasurementUnit[]> {
    return this.http.delete<ApiResponse<MeasurementUnit[]>>(`${API_BASE}/units/${id}`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to delete unit');
          return throwError(() => err);
        })
      );
  }

  // ============================================================
  // SUPPLIERS
  // ============================================================

  /**
   * Get all suppliers
   */
  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<ApiResponse<Supplier[]>>(`${API_BASE}/suppliers`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to load suppliers');
          return throwError(() => err);
        })
      );
  }

  /**
   * Create a supplier
   */
  createSupplier(supplier: Partial<Supplier>): Observable<Supplier[]> {
    return this.http.post<ApiResponse<Supplier[]>>(`${API_BASE}/suppliers`, supplier)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to create supplier');
          return throwError(() => err);
        })
      );
  }

  /**
   * Update a supplier
   */
  updateSupplier(id: string, supplier: Partial<Supplier>): Observable<Supplier[]> {
    return this.http.put<ApiResponse<Supplier[]>>(`${API_BASE}/suppliers/${id}`, supplier)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to update supplier');
          return throwError(() => err);
        })
      );
  }

  /**
   * Delete a supplier
   */
  deleteSupplier(id: string): Observable<Supplier[]> {
    return this.http.delete<ApiResponse<Supplier[]>>(`${API_BASE}/suppliers/${id}`)
      .pipe(
        map(response => response.data),
        catchError(err => {
          this.errorSubject.next('Failed to delete supplier');
          return throwError(() => err);
        })
      );
  }
}