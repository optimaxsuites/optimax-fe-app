// branch-manager-dashboard.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { UserContextService } from '../../../../service/inventory/user-context.service';
import {
  BranchInventory,
  StockMovement,
  RestockRequest,
  RestockStatus,
  RestockUrgency,
  MovementStatus,
  getStockStatus,
  getStockStatusLabel,
  getStockStatusColor
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// INTERFACES
// ============================================================

interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingRestocks: number;
  pendingTransfers: number;
  totalRequests: number;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  color: string;
  description: string;
}

/** A single item in the "Notifications" panel — surfaces things the branch manager
 *  needs to act on or know about: an incoming transfer, a request awaiting approval or
 *  rejected, or a product recently added to their branch's inventory. */
interface DashboardNotification {
  id: string;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  timestamp: Date;
  route: string;
}

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-branch-manager-dashboard',
  templateUrl: './branch-manager-dashboard.component.html',
  styleUrls: ['./branch-manager-dashboard.component.scss']
})
export class BranchManagerDashboardComponent implements OnInit, OnDestroy {

  // ============================================================
  // STATE
  // ============================================================

  // Data
  branchInventory: BranchInventory[] = [];
  movements: StockMovement[] = [];
  restockRequests: RestockRequest[] = [];
  lowStockItems: BranchInventory[] = [];
  outOfStockItems: BranchInventory[] = [];
  recentRequests: RestockRequest[] = [];
  recentMovements: StockMovement[] = [];
  notifications: DashboardNotification[] = [];
  stats: DashboardStats | null = null;
  branchName: string = '';
  branchId: string = '';

  // UI
  isLoading: boolean = true;
  error: string | null = null;
  activeTab: 'overview' | 'inventory' | 'requests' = 'overview';

  // Quick Actions
  quickActions: QuickAction[] = [
    {
      id: 'new-restock',
      label: 'Request Restock',
      icon: 'fa-boxes',
      route: '/admin/sales/commerce/inventory/branch-manager/requests/new',
      color: '#184440',
      description: 'Request stock replenishment'
    },
    {
      id: 'new-transfer',
      label: 'Create Transfer',
      icon: 'fa-exchange-alt',
      route: '/admin/sales/commerce/inventory/branch-manager/transfers/new',
      color: '#3B82F6',
      description: 'Transfer stock between branches'
    },
    {
      id: 'view-inventory',
      label: 'View Inventory',
      icon: 'fa-warehouse',
      route: '/admin/sales/commerce/inventory/branch-manager/inventory',
      color: '#8B5CF6',
      description: 'Manage your branch stock'
    },
    {
      id: 'view-requests',
      label: 'My Requests',
      icon: 'fa-list',
      route: '/admin/sales/commerce/inventory/branch-manager/requests',
      color: '#F5A623',
      description: 'Track your restock requests'
    }
  ];

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private inventoryService: InventoryService,
    private userContext: UserContextService,
    private router: Router
  ) {}

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

 // branch-manager-dashboard.component.ts - Update loadData()

loadData(): void {
  this.isLoading = true;
  this.error = null;

  const user = this.userContext.getUser();
  this.branchId = user.branchId || '';
  this.branchName = user.branchName || 'My Branch';

  forkJoin({
    inventory: this.inventoryService.getBranchInventory(this.branchId),
    movements: this.inventoryService.getMovements({ limit: 100 }),
    restocks: this.inventoryService.getRestockRequests({ 
      limit: 100,
      branchId: this.branchId
    })
  }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ inventory, movements, restocks }) => {
        // inventory is now BranchInventory[] directly
        this.branchInventory = inventory || [];
        this.movements = movements.data || [];
        this.restockRequests = restocks.data || [];
        
        // Filter movements by branch
        this.movements = this.movements.filter(m => 
          m.fromLocation?.id === this.branchId || 
          m.toLocation?.id === this.branchId
        );

        // Find low stock items
        this.lowStockItems = this.branchInventory.filter(item => 
          item.quantity <= item.reorderPoint && item.quantity > 0
        );

        this.outOfStockItems = this.branchInventory.filter(item => 
          item.quantity === 0
        );

        // Recent requests (pending)
        this.recentRequests = this.restockRequests
          .filter(r => r.status === RestockStatus.PENDING)
          .slice(0, 5);

        // Recent movements
        this.recentMovements = this.movements
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        this.calculateStats();
        this.buildNotifications();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load branch data:', err);
        this.error = 'Failed to load branch data. Please try again.';
        this.isLoading = false;
      }
    });
}

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  /** Builds the "Notifications" panel from data already loaded above — no separate
   *  backend needed. Covers: transfers heading to this branch that haven't arrived yet,
   *  their own restock requests that are pending or were rejected, and products recently
   *  added to this branch's inventory (e.g. assigned by an admin). */
  private buildNotifications(): void {
    const notifications: DashboardNotification[] = [];

    this.movements
      .filter(m => m.toLocation?.id === this.branchId &&
        (m.status === MovementStatus.PENDING || m.status === MovementStatus.IN_TRANSIT))
      .forEach(m => {
        notifications.push({
          id: 'transfer-' + m.id,
          icon: 'fa-truck',
          color: '#3B82F6',
          title: `${m.quantity} × ${m.productName} is on its way to your branch`,
          subtitle: m.status === MovementStatus.IN_TRANSIT ? 'In transit' : 'Awaiting approval',
          timestamp: new Date(m.createdAt),
          route: '/admin/sales/commerce/inventory/movements/' + m.id
        });
      });

    this.restockRequests
      .filter(r => r.status === RestockStatus.PENDING || r.status === RestockStatus.REJECTED)
      .forEach(r => {
        const rejected = r.status === RestockStatus.REJECTED;
        notifications.push({
          id: 'request-' + r.id,
          icon: rejected ? 'fa-times-circle' : 'fa-hourglass-half',
          color: rejected ? '#DC2626' : '#F5A623',
          title: rejected
            ? `Your request for ${r.productName} was rejected`
            : `Your request for ${r.productName} is awaiting approval`,
          subtitle: `${r.requestedQuantity} units requested`,
          timestamp: new Date(r.createdAt),
          route: '/admin/sales/commerce/inventory/branch-manager/requests'
        });
      });

    const recentWindow = Date.now() - 3 * 86400000; // last 3 days
    this.branchInventory
      .filter(i => new Date(i.lastUpdated).getTime() >= recentWindow)
      .forEach(i => {
        notifications.push({
          id: 'inventory-' + i.id,
          icon: 'fa-box-open',
          color: '#8B5CF6',
          title: `${i.productName} was added to your branch's inventory`,
          subtitle: `${i.quantity} units in stock`,
          timestamp: new Date(i.lastUpdated),
          route: '/admin/sales/commerce/inventory/branch-manager/inventory'
        });
      });

    this.notifications = notifications
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  private calculateStats(): void {
    const totalStockValue = this.branchInventory.reduce(
      (sum, item) => sum + (item.quantity * item.sellingPrice), 0
    );

    this.stats = {
      totalProducts: this.branchInventory.length,
      totalStockValue: totalStockValue,
      lowStockCount: this.lowStockItems.length,
      outOfStockCount: this.outOfStockItems.length,
      pendingRestocks: this.restockRequests.filter(r => r.status === RestockStatus.PENDING).length,
      pendingTransfers: this.movements.filter(m => m.status === MovementStatus.PENDING).length,
      totalRequests: this.restockRequests.length
    };
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  goBack(): void {
    // Navigate to main dashboard or close
  }

  // ============================================================
  // UI HELPERS
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

  getUrgencyLabel(urgency: RestockUrgency): string {
    const map: Record<RestockUrgency, string> = {
      'LOW': 'Low',
      'MEDIUM': 'Medium',
      'HIGH': 'High',
      'CRITICAL': 'Critical'
    };
    return map[urgency] || urgency;
  }

  getUrgencyColor(urgency: RestockUrgency): string {
    const map: Record<RestockUrgency, string> = {
      'LOW': '#6B7280',
      'MEDIUM': '#3B82F6',
      'HIGH': '#F5A623',
      'CRITICAL': '#DC2626'
    };
    return map[urgency] || '#6B7280';
  }

  getMovementStatusLabel(status: MovementStatus): string {
    const map: Record<MovementStatus, string> = {
      'PENDING': 'Pending',
      'IN_TRANSIT': 'In Transit',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return map[status] || status;
  }

  getMovementStatusColor(status: MovementStatus): string {
    const map: Record<MovementStatus, string> = {
      'PENDING': '#F5A623',
      'IN_TRANSIT': '#3B82F6',
      'COMPLETED': '#2EB270',
      'CANCELLED': '#DC2626'
    };
    return map[status] || '#6B7280';
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

  formatDate(date: Date | string): string {
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

  getTimeAgo(date: Date | string): string {
    if (!date) return '—';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }
}