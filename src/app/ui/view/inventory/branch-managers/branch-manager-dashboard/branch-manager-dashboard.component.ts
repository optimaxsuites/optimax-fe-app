// branch-manager-dashboard.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  BranchInventory,
  StockMovement,
  RestockRequest,
  RestockStatus,
  RestockUrgency,
  MovementStatus,
  hasUnresolvedChangeRequest,
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
  queryParams?: Record<string, string>;
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
  queryParams?: Record<string, string>;
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

  // This tab is a fixed, single-branch view for now — no login/role system behind it, so
  // the branch it manages defaults to the first active real branch rather than being looked
  // up from a user account. (Previously hardcoded to a fake id 'br-1'/'Lagos Main Warehouse'
  // that never matched any real branch — every real branch id here is numeric — which meant
  // the whole tab, including Create Transfer's source-branch picker, silently had nothing to
  // work with against the real backend.)

  // Data
  branchInventory: BranchInventory[] = [];
  movements: StockMovement[] = [];
  restockRequests: RestockRequest[] = [];
  lowStockItems: BranchInventory[] = [];
  outOfStockItems: BranchInventory[] = [];
  recentRequests: RestockRequest[] = [];
  recentMovements: StockMovement[] = [];
  // Transfers of theirs still waiting on the edit Movement Approvals asked for — the
  // "Review Changes Requested" quick action scrolls straight down to this list.
  changesRequestedMovements: StockMovement[] = [];
  notifications: DashboardNotification[] = [];
  // Retractable — collapsing just hides the list under the header, header (with count) stays.
  notificationsCollapsed: boolean = false;
  changesRequestedCollapsed: boolean = false;
  stats: DashboardStats | null = null;
  branchName: string = '';
  branchId: string = '';
  // Signed-in branch manager's own name — 'fullname' is the session key app.ts sets at
  // login (same pattern used for attributing approvals/requests to the real user; see
  // MovementApprovalComponent.getCurrentUserName()).
  managerName: string = sessionStorage.getItem('fullname') || 'Branch Manager';

  // UI
  isLoading: boolean = true;
  error: string | null = null;
  activeTab: 'overview' | 'inventory' | 'requests' = 'overview';

  // Quick Actions — each links into the normal shared pages, but with a query param that
  // scopes/locks them to this one branch (see TransferWizardComponent's lockedBranchId
  // handling, and RestockRequestForm/ListComponent's existing branchId prefill support).
  // A getter (not a field literal) so it always reflects the real branchId resolved in
  // loadData() — that resolution is async, so a field initializer would have baked in
  // whatever branchId was set (or empty) before the branches list ever loaded.
  get quickActions(): QuickAction[] {
    return [
      {
        id: 'new-restock',
        label: 'Request Restock',
        icon: 'fa-boxes',
        route: '/admin/sales/commerce/inventory/branch-manager/requests/new',
        queryParams: { branchId: this.branchId },
        color: '#184440',
        description: 'Request stock replenishment'
      },
      {
        id: 'new-transfer',
        label: 'Create Transfer',
        icon: 'fa-exchange-alt',
        route: '/admin/sales/commerce/inventory/branch-manager/transfers/new',
        queryParams: { lockedBranchId: this.branchId },
        color: '#3B82F6',
        description: 'Send stock to or request stock from another branch'
      },
      {
        id: 'view-inventory',
        label: 'View Inventory',
        icon: 'fa-warehouse',
        route: '/admin/sales/commerce/inventory/branches/' + this.branchId,
        queryParams: { tab: 'inventory' },
        color: '#8B5CF6',
        description: 'Manage your branch stock'
      },
      {
        id: 'view-requests',
        label: 'My Requests',
        icon: 'fa-list',
        route: '/admin/sales/commerce/inventory/branch-manager/requests',
        queryParams: { branchId: this.branchId },
        color: '#F5A623',
        description: 'Track your restock requests'
      },
      {
        // No route/queryParams — this one scrolls down to the "Changes Requested" section on
        // this same dashboard instead of navigating away (see the template's special-cased
        // click handler and scrollToChangesRequested() below).
        id: 'review-changes',
        label: 'Review Changes Requested',
        icon: 'fa-pencil-alt',
        route: '',
        color: '#F59E0B',
        description: 'See what needs updating before it can be approved'
      }
    ];
  }

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private inventoryService: InventoryService,
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

  // Resolve which real branch this manager runs before fetching anything scoped to it —
  // there's no login/role system yet to look this up from the signed-in user, so this picks
  // the first active branch (or just the first branch) as a stand-in.
  this.inventoryService.getBranches()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (branches) => {
        const branch = branches.find(b => b.status === 'ACTIVE') || branches[0];
        if (!branch) {
          this.error = 'No branches available.';
          this.isLoading = false;
          return;
        }
        this.branchId = String(branch.id);
        this.branchName = branch.name;
        this.loadBranchData();
      },
      error: (err) => {
        console.error('Failed to load branches:', err);
        this.error = 'Failed to load branch data. Please try again.';
        this.isLoading = false;
      }
    });
}

private loadBranchData(): void {
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

        // Find low stock items — this used to ignore safetyStock entirely (item.quantity <=
        // item.reorderPoint), so an item at or below safety stock showed here as merely "Low
        // Stock" while every other screen in the app (branch-detail, branch-inventory-table,
        // branch-inventory-form) calls the same item "Critical" via the shared getStockStatus().
        this.lowStockItems = this.branchInventory.filter(item =>
          getStockStatus(item.quantity, item.reorderPoint, item.safetyStock) === 'LOW'
        );

        this.outOfStockItems = this.branchInventory.filter(item =>
          getStockStatus(item.quantity, item.reorderPoint, item.safetyStock) === 'CRITICAL'
        );

        // Recent requests (pending)
        this.recentRequests = this.restockRequests
          .filter(r => r.status === RestockStatus.PENDING)
          .slice(0, 5);

        // Recent movements
        this.recentMovements = this.movements
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        // Transfers still waiting on the edit an admin asked for (see "Review Changes
        // Requested" quick action and its section further down the page).
        this.changesRequestedMovements = this.movements.filter(m => hasUnresolvedChangeRequest(m));

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
   *  transfers of theirs that Movement Approvals sent back for changes, their own restock
   *  requests that are pending or were rejected, and products recently added to this
   *  branch's inventory (e.g. assigned by an admin). */
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

    // "Request Changes" on Movement Approvals leaves the movement PENDING and appends a note
    // (see MovementApprovalComponent.submitChanges()) rather than a dedicated status — so a
    // transfer touching this branch, still PENDING, with that note is how we know changes
    // were asked for. Links straight to the edit form so they can act on it immediately.
    this.movements
      .filter(m => (m.fromLocation?.id === this.branchId || m.toLocation?.id === this.branchId) &&
        m.status === MovementStatus.PENDING &&
        !!m.notes && m.notes.includes('Changes requested:'))
      .forEach(m => {
        notifications.push({
          id: 'changes-' + m.id,
          icon: 'fa-triangle-exclamation',
          color: '#F5A623',
          title: `Admin requested changes to your transfer for ${m.productName}`,
          subtitle: 'Review the note and update the transfer',
          timestamp: new Date(m.updatedAt || m.createdAt),
          route: '/admin/sales/commerce/inventory/movements/' + m.id + '/edit'
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
          route: '/admin/sales/commerce/inventory/branch-manager/requests',
          queryParams: { branchId: this.branchId }
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
          route: '/admin/sales/commerce/inventory/branches/' + this.branchId,
          queryParams: { tab: 'inventory' }
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

  navigateTo(route: string, queryParams?: Record<string, string>): void {
    this.router.navigate([route], queryParams ? { queryParams } : undefined);
  }

  /** "Review Changes Requested" quick action — stays on this dashboard and scrolls down to
   *  the section listing transfers waiting on an edit, rather than navigating away. */
  scrollToChangesRequested(): void {
    this.changesRequestedCollapsed = false;
    document.getElementById('changes-requested-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goToEditMovement(movement: StockMovement): void {
    this.navigateTo('/admin/sales/commerce/inventory/movements/' + movement.id + '/edit');
  }

  /** "To Abuja Distribution Hub" / "From Abuja Distribution Hub" — whichever side of the
   *  transfer isn't this branch, for the Changes Requested list. */
  getBranchOtherSide(movement: StockMovement): string {
    if (movement.fromLocation?.id === this.branchId) {
      return 'To ' + (movement.toLocation?.name || 'another branch');
    }
    return 'From ' + (movement.fromLocation?.name || 'another branch');
  }

  goToRequestRestock(): void {
    this.navigateTo('/admin/sales/commerce/inventory/branch-manager/requests/new', { branchId: this.branchId });
  }

  goToCreateTransfer(): void {
    this.navigateTo('/admin/sales/commerce/inventory/branch-manager/transfers/new', { lockedBranchId: this.branchId });
  }

  goToInventory(): void {
    this.navigateTo('/admin/sales/commerce/inventory/branches/' + this.branchId, { tab: 'inventory' });
  }

  goToMyRequests(): void {
    this.navigateTo('/admin/sales/commerce/inventory/branch-manager/requests', { branchId: this.branchId });
  }

  goBack(): void {
    // Back to the tab shell (with the nav-tab bar), not the standalone /branch-manager route.
    this.router.navigate(['/admin/sales/commerce/inventory']);
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