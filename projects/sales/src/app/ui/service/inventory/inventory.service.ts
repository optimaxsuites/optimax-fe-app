// inventory.service.ts
// ============================================================
// IMPORTS
// ============================================================

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
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
// LOCAL STORAGE KEYS & MOCK DATA
// ============================================================

const LOCAL_KEYS = {
  DASHBOARD: 'inventory_dashboard',
  PRODUCTS: 'inventory_products',
  BRANCHES: 'inventory_branches',
  BRANCH_INVENTORY: 'inventory_branch_inventory',
  MOVEMENTS: 'inventory_movements',
  CATEGORIES: 'inventory_categories',
  MEASUREMENT_UNITS: 'inventory_measurement_units',
  SUPPLIERS: 'inventory_suppliers'
};

// ---------------------------------------------------
// MOCK DATA (kept unchanged from original file)
// ---------------------------------------------------

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
// INVENTORY SERVICE (LocalStorage implementation)
// ============================================================

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  // ----------------------------------------------------
  // STATE MANAGEMENT (RxJS subjects)
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // CONSTRUCTOR – seed LocalStorage if empty
  // ----------------------------------------------------
  constructor() {
    if (!localStorage.getItem(LOCAL_KEYS.DASHBOARD)) {
      // seed all keys with initial mock data
      localStorage.setItem(LOCAL_KEYS.DASHBOARD, JSON.stringify(MOCK_DASHBOARD_DATA));
      localStorage.setItem(LOCAL_KEYS.PRODUCTS, JSON.stringify([]));
      localStorage.setItem(LOCAL_KEYS.BRANCHES, JSON.stringify([]));
      localStorage.setItem(LOCAL_KEYS.BRANCH_INVENTORY, JSON.stringify([]));
      localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify([]));
      localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify([]));
      localStorage.setItem(LOCAL_KEYS.MEASUREMENT_UNITS, JSON.stringify([]));
      localStorage.setItem(LOCAL_KEYS.SUPPLIERS, JSON.stringify([]));
    }
    this.loadInitialState();
  }

  private loadInitialState(): void {
    this.dashboardDataSubject.next(
      JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData
    );
    this.productsSubject.next(
      JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[]
    );
    this.branchesSubject.next(
      JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[]
    );
    // Removed erroneous self-referential call; quick actions are accessed via component subscription.


    this.branchInventorySubject.next(
      JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCH_INVENTORY) as string) as BranchInventory[]
    );
    this.movementsSubject.next(
      JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[]
    );
  }

  // ----------------------------------------------------
  // DASHBOARD
  // ----------------------------------------------------
  /** Get full dashboard data */
  getDashboardData(): Observable<InventoryDashboardData> {
    this.loadingSubject.next(true);
    const data = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    this.dashboardDataSubject.next(data);
    this.loadingSubject.next(false);
    return of(data);
  }

  /** Get only stats */
  getDashboardStats(): Observable<InventoryDashboardStats> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    return of(dash.stats);
  }

  /** Get alerts */
  getDashboardAlerts(): Observable<StockAlert[]> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    return of(dash.alerts);
  }

  /** Recent movements (limit optional) */
  getRecentMovements(limit: number = 10): Observable<StockMovement[]> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    return of(dash.recentMovements.slice(0, limit));
  }

  /** Top products (limit optional) */
  getTopProducts(limit: number = 5): Observable<ProductPerformance[]> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    return of(dash.topProducts.slice(0, limit));
  }

  /** Branch summaries */
  getBranchSummaries(): Observable<BranchStockSummary[]> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    return of(dash.branchSummaries);
  }

  /** Resolve an alert – marks it resolved in storage */
  resolveAlert(alertId: string): Observable<void> {
    const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
    const alert = dash.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isResolved = true;
      localStorage.setItem(LOCAL_KEYS.DASHBOARD, JSON.stringify(dash));
    }
    return of(undefined);
  }

  // ----------------------------------------------------
  // PRODUCTS
  // ----------------------------------------------------
  /** Get all products (filters ignored for local mode) */
  getProducts(_filters?: ProductFilters): Observable<PaginatedResponse<Product>> {
    this.loadingSubject.next(true);
    const products = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
    const response: PaginatedResponse<Product> = {
      data: products,
      total: products.length,
      page: 1,
      limit: products.length,
      totalPages: 1
    };
    this.productsSubject.next(products);
    this.loadingSubject.next(false);
    return of(response);
  }

  /** Single product by id */
  getProduct(id: string): Observable<Product> {
    this.loadingSubject.next(true);
    const products = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
    const product = products.find(p => p.id === id);
    this.loadingSubject.next(false);
    return product ? of(product) : throwError(() => new Error('Product not found'));
  }

  /** Create product – generates a simple temporary id */
  createProduct(product: Partial<Product>): Observable<Product> {
    this.loadingSubject.next(true);
    const products = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
    const newProduct: Product = {
      ...(product as Product),
      id: 'prod-' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as Product;
    products.push(newProduct);
    localStorage.setItem(LOCAL_KEYS.PRODUCTS, JSON.stringify(products));
    this.productsSubject.next(products);
    this.loadingSubject.next(false);
    return of(newProduct);
  }

  /** Update existing product */
  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    this.loadingSubject.next(true);
    const products = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
      this.loadingSubject.next(false);
      return throwError(() => new Error('Product not found'));
    }
    const updated = { ...products[index], ...product, updatedAt: new Date() } as Product;
    products[index] = updated;
    localStorage.setItem(LOCAL_KEYS.PRODUCTS, JSON.stringify(products));
    this.productsSubject.next(products);
    this.loadingSubject.next(false);
    return of(updated);
  }

  /** Delete product */
  deleteProduct(id: string): Observable<void> {
    this.loadingSubject.next(true);
    let products = JSON.parse(localStorage.getItem(LOCAL_KEYS.PRODUCTS) as string) as Product[];
    products = products.filter(p => p.id !== id);
    localStorage.setItem(LOCAL_KEYS.PRODUCTS, JSON.stringify(products));
    this.productsSubject.next(products);
    this.loadingSubject.next(false);
    return of(undefined);
  }

  // ----------------------------------------------------
  // BRANCHES
  // ----------------------------------------------------
  getBranches(): Observable<Branch[]> {
    const branches = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[];
    this.branchesSubject.next(branches);
    return of(branches);
  }

  getBranch(id: string): Observable<Branch> {
    const branches = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[];
    const branch = branches.find(b => b.id === id);
    return branch ? of(branch) : throwError(() => new Error('Branch not found'));
  }

  updateBranch(id: string, branch: Partial<Branch>): Observable<Branch> {
    const branches = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[];
    const index = branches.findIndex(b => b.id === id);
    if (index === -1) {
      return throwError(() => new Error('Branch not found'));
    }
    const updated = { ...branches[index], ...branch, updatedAt: new Date() } as Branch;
    branches[index] = updated;
    localStorage.setItem(LOCAL_KEYS.BRANCHES, JSON.stringify(branches));
    this.branchesSubject.next(branches);
    return of(updated);
  }

  createBranch(branch: Partial<Branch>): Observable<Branch> {
    const branches = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCHES) as string) as Branch[];
    const newBranch: Branch = {
      ...(branch as Branch),
      id: 'br-' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    } as Branch;
    branches.push(newBranch);
    localStorage.setItem(LOCAL_KEYS.BRANCHES, JSON.stringify(branches));
    this.branchesSubject.next(branches);
    return of(newBranch);
  }

  /** Get inventory for a branch – returns whole list (no per‑branch filtering for now) */
  getBranchInventory(_branchId: string): Observable<BranchInventory[]> {
    const inventory = JSON.parse(localStorage.getItem(LOCAL_KEYS.BRANCH_INVENTORY) as string) as BranchInventory[];
    this.branchInventorySubject.next(inventory);
    return of(inventory);
  }

  setCurrentBranch(branchId: string | null): void {
    this.currentBranchIdSubject.next(branchId);
  }

  getCurrentBranchId(): string | null {
    return this.currentBranchIdSubject.value;
  }

  // ----------------------------------------------------
  // STOCK MOVEMENTS
  // ----------------------------------------------------
  /** Get stock movements (filters ignored) */
  getMovements(_filters?: MovementFilters): Observable<PaginatedResponse<StockMovement>> {
    this.loadingSubject.next(true);
    const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
    const response: PaginatedResponse<StockMovement> = {
      data: movements,
      total: movements.length,
      page: 1,
      limit: movements.length,
      totalPages: 1
    };
    this.movementsSubject.next(movements);
    this.loadingSubject.next(false);
    return of(response);
  }

  /** Create a movement (transfer / adjustment / etc.) */
  createMovement(movement: Partial<StockMovement>): Observable<StockMovement> {
    this.loadingSubject.next(true);
    const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
    const newMovement: StockMovement = {
      ...(movement as StockMovement),
      id: 'mov-' + Date.now(),
      createdAt: new Date(),
      status: MovementStatus.PENDING
    } as StockMovement;
    movements.push(newMovement);
    localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify(movements));
    this.movementsSubject.next(movements);
    this.loadingSubject.next(false);
    return of(newMovement);
  }

  /** Update a movement */
  updateMovement(id: string, movement: Partial<StockMovement>): Observable<StockMovement> {
    this.loadingSubject.next(true);
    const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
    const index = movements.findIndex(m => m.id === id);
    if (index === -1) {
      this.loadingSubject.next(false);
      return throwError(() => new Error('Movement not found'));
    }
    const updated = { ...movements[index], ...movement, updatedAt: new Date() } as StockMovement;
    movements[index] = updated;
    localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify(movements));
    this.movementsSubject.next(movements);
    this.loadingSubject.next(false);
    return of(updated);
  }

  /** Approve a movement – set status to COMPLETED */
  approveMovement(id: string): Observable<void> {
    this.loadingSubject.next(true);
    const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
    const movement = movements.find(m => m.id === id);
    if (movement) {
      movement.status = MovementStatus.COMPLETED;
      (movement as any).approvedAt = new Date();
      localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify(movements));
    }
    this.movementsSubject.next(movements);
    this.loadingSubject.next(false);
    return of(undefined);
  }

  /** Reject a movement – set status to CANCELLED */
  rejectMovement(id: string, _reason: string): Observable<void> {
    this.loadingSubject.next(true);
    const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
    const movement = movements.find(m => m.id === id);
    if (movement) {
      movement.status = MovementStatus.CANCELLED;
      localStorage.setItem(LOCAL_KEYS.MOVEMENTS, JSON.stringify(movements));
    }
    this.movementsSubject.next(movements);
    this.loadingSubject.next(false);
    return of(undefined);
  }

// ----------------------------------------------------
// QUICK ACTIONS (read from dashboard data)
// ----------------------------------------------------
getQuickActions(): Observable<QuickAction[]> {
  const dash = JSON.parse(localStorage.getItem(LOCAL_KEYS.DASHBOARD) as string) as InventoryDashboardData;
  return of(dash.quickActions);
}

// ----------------------------------------------------
// CATEGORIES CRUD
// ----------------------------------------------------
getCategories(): Observable<Category[]> {
  const categories = JSON.parse(localStorage.getItem(LOCAL_KEYS.CATEGORIES) as string) as Category[];
  return of(categories);
}
createCategory(cat: Partial<Category>): Observable<Category[]> {
  const categories = JSON.parse(localStorage.getItem(LOCAL_KEYS.CATEGORIES) as string) as Category[];
  const newCat: Category = { ...(cat as Category), id: 'cat-' + Date.now() } as Category;
  categories.push(newCat);
  localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(categories));
  return of(categories);
}
updateCategory(id: string, cat: Partial<Category>): Observable<Category[]> {
  const categories = JSON.parse(localStorage.getItem(LOCAL_KEYS.CATEGORIES) as string) as Category[];
  const idx = categories.findIndex(c => c.id === id);
  if (idx === -1) return throwError(() => new Error('Category not found'));
  const updated = { ...categories[idx], ...cat } as Category;
  categories[idx] = updated;
  localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(categories));
  return of(categories);
}
deleteCategory(id: string): Observable<Category[]> {
  let categories = JSON.parse(localStorage.getItem(LOCAL_KEYS.CATEGORIES) as string) as Category[];
  categories = categories.filter(c => c.id !== id);
  localStorage.setItem(LOCAL_KEYS.CATEGORIES, JSON.stringify(categories));
  return of(categories);
}

// ----------------------------------------------------
// MEASUREMENT UNITS CRUD
// ----------------------------------------------------
getMeasurementUnits(): Observable<MeasurementUnit[]> {
  const units = JSON.parse(localStorage.getItem(LOCAL_KEYS.MEASUREMENT_UNITS) as string) as MeasurementUnit[];
  return of(units);
}
createMeasurementUnit(unit: Partial<MeasurementUnit>): Observable<MeasurementUnit[]> {
  const units = JSON.parse(localStorage.getItem(LOCAL_KEYS.MEASUREMENT_UNITS) as string) as MeasurementUnit[];
  const newUnit: MeasurementUnit = { ...(unit as MeasurementUnit), id: 'unit-' + Date.now() } as MeasurementUnit;
  units.push(newUnit);
  localStorage.setItem(LOCAL_KEYS.MEASUREMENT_UNITS, JSON.stringify(units));
  return of(units);
}
updateMeasurementUnit(id: string, unit: Partial<MeasurementUnit>): Observable<MeasurementUnit[]> {
  const units = JSON.parse(localStorage.getItem(LOCAL_KEYS.MEASUREMENT_UNITS) as string) as MeasurementUnit[];
  const idx = units.findIndex(u => u.id === id);
  if (idx === -1) return throwError(() => new Error('Unit not found'));
  const updated = { ...units[idx], ...unit } as MeasurementUnit;
  units[idx] = updated;
  localStorage.setItem(LOCAL_KEYS.MEASUREMENT_UNITS, JSON.stringify(units));
  return of(units);
}
deleteMeasurementUnit(id: string): Observable<MeasurementUnit[]> {
  let units = JSON.parse(localStorage.getItem(LOCAL_KEYS.MEASUREMENT_UNITS) as string) as MeasurementUnit[];
  units = units.filter(u => u.id !== id);
  localStorage.setItem(LOCAL_KEYS.MEASUREMENT_UNITS, JSON.stringify(units));
  return of(units);
}

// ----------------------------------------------------
// SUPPLIERS CRUD
// ----------------------------------------------------
getSuppliers(): Observable<Supplier[]> {
  const suppliers = JSON.parse(localStorage.getItem(LOCAL_KEYS.SUPPLIERS) as string) as Supplier[];
  return of(suppliers);
}
createSupplier(supplier: Partial<Supplier>): Observable<Supplier[]> {
  const suppliers = JSON.parse(localStorage.getItem(LOCAL_KEYS.SUPPLIERS) as string) as Supplier[];
  const newSup: Supplier = { ...(supplier as Supplier), id: 'sup-' + Date.now() } as Supplier;
  suppliers.push(newSup);
  localStorage.setItem(LOCAL_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  return of(suppliers);
}
updateSupplier(id: string, supplier: Partial<Supplier>): Observable<Supplier[]> {
  const suppliers = JSON.parse(localStorage.getItem(LOCAL_KEYS.SUPPLIERS) as string) as Supplier[];
  const idx = suppliers.findIndex(s => s.id === id);
  if (idx === -1) return throwError(() => new Error('Supplier not found'));
  const updated = { ...suppliers[idx], ...supplier } as Supplier;
  suppliers[idx] = updated;
  localStorage.setItem(LOCAL_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  return of(suppliers);
}
deleteSupplier(id: string): Observable<Supplier[]> {
  let suppliers = JSON.parse(localStorage.getItem(LOCAL_KEYS.SUPPLIERS) as string) as Supplier[];
  suppliers = suppliers.filter(s => s.id !== id);
  localStorage.setItem(LOCAL_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  return of(suppliers);
}

// ----------------------------------------------------
// SINGLE MOVEMENT FETCH
// ----------------------------------------------------
getMovement(id: string): Observable<StockMovement> {
  const movements = JSON.parse(localStorage.getItem(LOCAL_KEYS.MOVEMENTS) as string) as StockMovement[];
  const mov = movements.find(m => m.id === id);
  return mov ? of(mov) : throwError(() => new Error('Movement not found'));
}

// ----------------------------------------------------
// BRANCH ANALYTICS (stub)
// ----------------------------------------------------
getBranchAnalytics(_branchId: string): Observable<any> {
  return of({});
}

}