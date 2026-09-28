// product-analytics.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnChanges, OnDestroy, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  Product,
  ProductPerformance,
  BranchInventory,
  Branch,
  ProductStatus,
  StockMovement,
  MovementType,
  getStockStatus,
  getStockStatusLabel,
  getStockStatusColor
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-product-analytics',
  templateUrl: './product-analytics.component.html',
  styleUrls: ['./product-analytics.component.scss']
})
export class ProductAnalyticsComponent implements OnInit, OnChanges, OnDestroy {

  // ============================================================
  // INPUTS / OUTPUTS
  // ============================================================

  @Input() productId: string = '';
  @Output() close = new EventEmitter<void>();

  // ============================================================
  // STATE
  // ============================================================

  // Core
  product: Product | null = null;
  performance: ProductPerformance | null = null;
  branchInventory: BranchInventory[] = [];
  branches: Branch[] = [];
  isLoading: boolean = true;
  error: string | null = null;

  // UI
  Math = Math;
  activeTab: 'overview' | 'sales' | 'inventory' | 'trends' = 'overview';
  dateRange: 'week' | 'month' | 'quarter' | 'year' = 'month';

  // Computed
  totalStock: number = 0;
  totalValue: number = 0;
  branchCount: number = 0;

  // Chart data — built from real SALE movements in buildSalesData(), not simulated.
  salesData: { month: string; sales: number; revenue: number; profit: number }[] = [];

  // Real SALE movement history for this product, refetched on load and re-bucketed (not
  // re-fetched) when the date range changes.
  private salesMovements: StockMovement[] = [];

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    // Get productId from route if not provided
    if (!this.productId) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['id']) {
          this.productId = params['id'];
          this.loadData();
        }
      });
    } else {
      this.loadData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-load when the caller (e.g. a selector dropdown) picks a different product.
    if (changes['productId'] && !changes['productId'].firstChange && this.productId) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      product: this.inventoryService.getProduct(this.productId),
      performance: this.inventoryService.getProductPerformance(this.productId),
      branches: this.inventoryService.getBranches(),
      // Real sales history this product's charts are built from — see buildSalesData().
      salesHistory: this.inventoryService.getMovements({ productId: this.productId, type: MovementType.SALE, limit: 2000 })
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ product, performance, branches, salesHistory }) => {
          this.product = product;
          this.performance = performance;
          this.branches = branches;
          this.salesMovements = salesHistory.data;
          this.loadBranchInventory();
          this.calculateStats();
          this.buildSalesData();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load product analytics:', err);
          this.error = 'Failed to load analytics data';
          this.isLoading = false;
        }
      });
  }

  loadBranchInventory(): void {
    if (!this.productId) return;

    // this.branches was already loaded by loadData()'s forkJoin a moment earlier — re-fetching
    // it here duplicated a network call on every load/refresh/product-change for no reason.
    const branches = this.branches;
    let completed = 0;
    const allInventory: BranchInventory[] = [];

    if (branches.length === 0) {
      this.branchInventory = allInventory;
      return;
    }

    branches.forEach(branch => {
      this.inventoryService.getBranchInventory(String(branch.id))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (inventory) => {
            const items = inventory.filter(i => i.productId === this.productId);
            allInventory.push(...items);
            completed++;
            if (completed === branches.length) {
              this.branchInventory = allInventory;
              this.calculateStats();
            }
          },
          error: (err) => console.error('Failed to load branch inventory:', err)
        });
    });
  }

  // ============================================================
  // STATS CALCULATION
  // ============================================================

  calculateStats(): void {
    this.totalStock = this.branchInventory.reduce((sum, item) => sum + item.quantity, 0);
    this.totalValue = this.branchInventory.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
    this.branchCount = this.branchInventory.length;
  }

  // ============================================================
  // CHART DATA
  // ============================================================

  /**
   * Builds the Monthly Sales / Sales Trend charts from this product's real SALE movement
   * history — not Math.random(). Revenue/profit per bucket are derived from real quantities
   * sold times this product's real average price / average margin (from getProductPerformance),
   * since individual movement records don't carry their own price.
   */
  private buildSalesData(): void {
    const buckets = this.buildTimeBuckets();
    const avgPrice = this.performance?.averagePrice || 0;
    const marginRatio = this.performance && this.performance.totalRevenue > 0
      ? this.performance.totalProfit / this.performance.totalRevenue
      : 0;

    this.salesMovements.forEach(m => {
      const d = new Date(m.createdAt);
      const bucket = buckets.find(b => d >= b.start && d < b.end);
      if (bucket) bucket.sales += (m.quantity || 0);
    });

    this.salesData = buckets.map(b => {
      const revenue = Math.round(b.sales * avgPrice);
      return {
        month: b.label,
        sales: b.sales,
        revenue,
        profit: Math.round(revenue * marginRatio)
      };
    });
  }

  /** Time windows to bucket real sales movements into, based on the selected date range. */
  private buildTimeBuckets(): { label: string; start: Date; end: Date; sales: number }[] {
    const now = new Date();
    const buckets: { label: string; start: Date; end: Date; sales: number }[] = [];

    if (this.dateRange === 'week') {
      for (let i = 6; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
        buckets.push({ label: start.toLocaleDateString('en-US', { weekday: 'short' }), start, end, sales: 0 });
      }
    } else if (this.dateRange === 'quarter') {
      for (let i = 5; i >= 0; i--) {
        const q = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
        const start = new Date(q.getFullYear(), Math.floor(q.getMonth() / 3) * 3, 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 3, 1);
        buckets.push({ label: `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`, start, end, sales: 0 });
      }
    } else if (this.dateRange === 'year') {
      for (let i = 4; i >= 0; i--) {
        const start = new Date(now.getFullYear() - i, 0, 1);
        const end = new Date(start.getFullYear() + 1, 0, 1);
        buckets.push({ label: String(start.getFullYear()), start, end, sales: 0 });
      }
    } else {
      // 'month' (default): last 6 months
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        buckets.push({ label: start.toLocaleDateString('en-US', { month: 'short' }), start, end, sales: 0 });
      }
    }

    return buckets;
  }

  // ============================================================
  // TAB MANAGEMENT
  // ============================================================

  setActiveTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  // ============================================================
  // DATE RANGE
  // ============================================================

  changeDateRange(range: 'week' | 'month' | 'quarter' | 'year'): void {
    this.dateRange = range;
    // Re-buckets the already-fetched real sales movements at the new granularity — this used to
    // just regenerate a fresh batch of random numbers, giving the illusion the filter was doing
    // something when nothing about the underlying (fake) data ever changed.
    this.buildSalesData();
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  goBack(): void {
    if (this.close.observed) {
      this.close.emit();
    } else {
      this.location.back();
    }
  }

  viewProduct(): void {
    if (this.product) {
      this.router.navigate(['/admin/sales/commerce/inventory/products', this.product.id]);
    }
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    this.loadData();
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getStockStatus(quantity: number, reorderPoint: number, safetyStock: number): 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK' {
    return getStockStatus(quantity, reorderPoint, safetyStock);
  }

  getStockStatusLabel(status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK'): string {
    return getStockStatusLabel(status);
  }

  getStockStatusColor(status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK'): string {
    return getStockStatusColor(status);
  }

  getStockStatusClass(status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK'): string {
    const map = {
      'CRITICAL': 'critical',
      'LOW': 'low',
      'NORMAL': 'normal',
      'OVERSTOCK': 'overstock'
    };
    return map[status] || 'normal';
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      [ProductStatus.ACTIVE]: 'active',
      [ProductStatus.INACTIVE]: 'inactive',
      [ProductStatus.DISCONTINUED]: 'discontinued',
      [ProductStatus.OUT_OF_STOCK]: 'out-of-stock'
    };
    return map[status] || 'inactive';
  }

  getStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getTrendIcon(trend: 'UP' | 'DOWN' | 'STABLE'): string {
    const map = {
      'UP': 'fa-arrow-up',
      'DOWN': 'fa-arrow-down',
      'STABLE': 'fa-minus'
    };
    return map[trend] || 'fa-minus';
  }

  getTrendColor(trend: 'UP' | 'DOWN' | 'STABLE'): string {
    const map = {
      'UP': '#2EB270',
      'DOWN': '#DC2626',
      'STABLE': '#F5A623'
    };
    return map[trend] || '#6B7280';
  }

  getPerformanceColor(score: number): string {
    if (score >= 80) return '#2EB270';
    if (score >= 60) return '#F5A623';
    if (score >= 40) return '#F97316';
    return '#DC2626';
  }

  getBranchName(branchId: string): string {
    const branch = this.branches.find(b => String(b.id) === branchId);
    return branch?.name || branchId;
  }

  formatCurrency(value: number): string {
    if (!value) return '₦0';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    if (!value) return '0';
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  formatDate(date: Date): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  // Chart helpers
  getMaxSales(): number {
    if (!this.salesData || this.salesData.length === 0) return 100;
    const max = Math.max(...this.salesData.map(d => d.sales));
    return Math.ceil(max / 50) * 50 + 50;
  }

  getMaxRevenue(): number {
    if (!this.salesData || this.salesData.length === 0) return 10000;
    const max = Math.max(...this.salesData.map(d => d.revenue));
    return Math.ceil(max / 5000) * 5000 + 5000;
  }

  getChartWidth(index: number, total: number): number {
    return ((index + 1) / total) * 100;
  }

  getColor(index: number): string {
    const colors = ['#2E6276', '#2EB270', '#F5A623', '#DC2626', '#3B82F6', '#8B5CF6'];
    return colors[index % colors.length];
  }

  getConicGradient(): string {
    if (!this.branchInventory || this.branchInventory.length === 0) {
      return '#e2e8f0';
    }

    const total = this.branchInventory.reduce((sum, item) => sum + item.quantity, 0);
    if (total === 0) return '#e2e8f0';

    let gradient = '';
    let currentAngle = 0;

    this.branchInventory.forEach((item, index) => {
      const percentage = (item.quantity / total) * 100;
      const end = currentAngle + percentage;
      const color = this.getColor(index);

      if (index === 0) {
        gradient = `conic-gradient(${color} 0% ${end}%`;
      } else {
        gradient += `, ${color} ${currentAngle}% ${end}%`;
      }

      if (index === this.branchInventory.length - 1) {
        gradient += ')';
      }

      currentAngle = end;
    });

    return gradient;
  }
}