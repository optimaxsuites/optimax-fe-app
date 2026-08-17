// inventory-dashboard.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, interval, takeUntil, takeWhile } from 'rxjs';
import { InventoryService } from '../../../service/inventory/inventory.service';
import {
  InventoryDashboardData,
  InventoryDashboardStats,
  StockAlert,
  StockMovement,
  ProductPerformance,
  BranchStockSummary,
  QuickAction,
  getStockStatus,
  getStockStatusColor,
  getStockStatusLabel,
  getMovementTypeLabel,
  getMovementTypeIcon,
  StockAlertSeverity
} from '../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-inventory-dashboard',
  templateUrl: './inventory-dashboard.component.html',
  styleUrls: ['./inventory-dashboard.component.scss']
})
export class InventoryDashboardComponent implements OnInit, OnDestroy {

  // ============================================================
  // STATE
  // ============================================================

  isLoading: boolean = true;
  dashboardData: InventoryDashboardData | null = null;
  error: string | null = null;

  // Stats
  stats: InventoryDashboardStats | null = null;
  aiDismissed: boolean = false;

  // Data Arrays
  alerts: StockAlert[] = [];
  recentMovements: StockMovement[] = [];
  topProducts: ProductPerformance[] = [];
  branchSummaries: BranchStockSummary[] = [];
  quickActions: QuickAction[] = [];

  // UI Helpers
  Math = Math;

  // Auto-refresh
  private destroy$ = new Subject<void>();
  private autoRefreshSubscription: any;

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private inventoryService: InventoryService,
    private router: Router
  ) { }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    this.loadDashboardData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadDashboardData(): void {
    this.isLoading = true;
    this.error = null;

    this.inventoryService.getDashboardData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.stats = data.stats;
          this.alerts = data.alerts || [];
          this.recentMovements = data.recentMovements || [];
          this.topProducts = data.topProducts || [];
          this.branchSummaries = data.branchSummaries || [];
          this.inventoryService.getQuickActions().pipe(takeUntil(this.destroy$)).subscribe(actions => { this.quickActions = actions; });
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load dashboard:', err);
          this.error = 'Failed to load inventory dashboard data';
          this.isLoading = false;
        }
      });
  }

  // ============================================================
  // AUTO REFRESH
  // ============================================================

  private startAutoRefresh(): void {
    // Refresh every 60 seconds
    this.autoRefreshSubscription = interval(60000)
      .pipe(takeWhile(() => true))
      .subscribe(() => {
        this.loadDashboardData();
      });
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  navigateTo(route: string): void {
    this.router.navigateByUrl(`/admin/sales${route}`);
  }

  navigateToProduct(productId: string): void {
    this.router.navigate(['/admin/sales/commerce/inventory/products', productId]);
  }

  navigateToBranch(branchId: string): void {
    this.router.navigate(['/admin/sales/commerce/inventory/branches', branchId]);
  }

  navigateToMovement(movementId: string): void {
    this.router.navigate(['/admin/sales/inventory/movements', movementId]);
  }

  resolveAlert(alertId: string): void {
    this.inventoryService.resolveAlert(alertId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove the alert from the list
          this.alerts = this.alerts.filter(a => a.id !== alertId);
          if (this.stats) {
            this.stats.lowStockItems = this.alerts.filter(a =>
              a.type === 'LOW_STOCK' || a.type === 'OUT_OF_STOCK'
            ).length;
          }
        },
        error: (err) => {
          console.error('Failed to resolve alert:', err);
        }
      });
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getStockStatus(quantity: number, reorderPoint: number, safetyStock: number): 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK' {
    return getStockStatus(quantity, reorderPoint, safetyStock);
  }

  getStockStatusColor(status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK'): string {
    return getStockStatusColor(status);
  }

  getStockStatusLabel(status: 'CRITICAL' | 'LOW' | 'NORMAL' | 'OVERSTOCK'): string {
    return getStockStatusLabel(status);
  }

  getMovementTypeLabel(type: string): string {
    return getMovementTypeLabel(type as any);
  }

  getMovementTypeIcon(type: string): string {
    return getMovementTypeIcon(type as any);
  }

  getAlertSeverityClass(severity: StockAlertSeverity): string {
    const map: Record<StockAlertSeverity, string> = {
      [StockAlertSeverity.INFO]: 'info',
      [StockAlertSeverity.WARNING]: 'warning',
      [StockAlertSeverity.CRITICAL]: 'critical'
    };
    return map[severity] || 'info';
  }

  getAlertIcon(type: string): string {
    const map: Record<string, string> = {
      'LOW_STOCK': 'fa-exclamation-triangle',
      'OUT_OF_STOCK': 'fa-times-circle',
      'EXPIRING': 'fa-clock',
      'OVER_STOCK': 'fa-arrow-up'
    };
    return map[type] || 'fa-bell';
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

  formatTime(date: Date): string {
    if (!date) return '—';
    return new Date(date).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getPerformanceTrend(trend: 'UP' | 'DOWN' | 'STABLE'): string {
    const map = {
      'UP': 'fa-arrow-up',
      'DOWN': 'fa-arrow-down',
      'STABLE': 'fa-minus'
    };
    return map[trend] || 'fa-minus';
  }

  getPerformanceTrendColor(trend: 'UP' | 'DOWN' | 'STABLE'): string {
    const map = {
      'UP': '#2EB270',
      'DOWN': '#DC2626',
      'STABLE': '#F5A623'
    };
    return map[trend] || '#6B7280';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    this.loadDashboardData();
  }
}