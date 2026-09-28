// restock-suggestion.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin, of, interval, takeUntil, takeWhile } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  Branch,
  BranchInventory,
  Product,
  getStockStatus,
  getStockStatusLabel,
  getStockStatusColor,
  getSuggestedRestockQuantity,
  RestockUrgency,
  RestockStatus,
  RestockRequest
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-restock-suggestion',
  templateUrl: './restock-suggestion.component.html',
  styleUrls: ['./restock-suggestion.component.scss']
})
export class RestockSuggestionComponent implements OnInit, OnDestroy {

  // ============================================================
  // INPUTS / OUTPUTS
  // ============================================================

  @Input() branchId: string = '';
  @Input() limit: number = 10;
  @Input() autoRefresh: boolean = true;
  @Input() compact: boolean = false;
  @Output() suggestionSelected = new EventEmitter<RestockSuggestion>();
  @Output() createRequest = new EventEmitter<RestockSuggestion>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  suggestions: RestockSuggestion[] = [];
  filteredSuggestions: RestockSuggestion[] = [];
  branches: Branch[] = [];
  products: Product[] = [];
  branchInventory: BranchInventory[] = [];
  isLoading: boolean = true;
  isCreatingAll: boolean = false;
  error: string | null = null;

  // UI
  Math = Math;
  showAll: boolean = false;
  selectedSuggestion: RestockSuggestion | null = null;
  showCreateModal: boolean = false;

  // Stats
  stats = {
    total: 0,
    critical: 0,
    low: 0,
    branches: 0
  };

  // Enums
  RestockUrgency = RestockUrgency;

  // Private
  private destroy$ = new Subject<void>();
  private refreshSubscription: any;

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
    this.loadData();
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    // Load branches
    this.inventoryService.getBranches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branches) => {
          this.branches = branches;
          this.stats.branches = branches.length;
          this.loadInventory();
        },
        error: (err) => {
          console.error('Failed to load branches:', err);
          this.error = 'Failed to load branches';
          this.isLoading = false;
        }
      });

    // Load products
    this.inventoryService.getProducts({ limit: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.products = response.data;
        },
        error: (err) => console.error('Failed to load products:', err)
      });
  }

  loadInventory(): void {
    // If branchId is provided, load only that branch's inventory
    if (this.branchId) {
      this.inventoryService.getBranchInventory(this.branchId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (inventory) => {
            this.branchInventory = inventory;
            this.generateSuggestions();
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Failed to load inventory:', err);
            this.error = 'Failed to load inventory data';
            this.isLoading = false;
          }
        });
    } else {
      // Load inventory for all branches
      const allInventory: BranchInventory[] = [];
      let completed = 0;
      const branches = this.branches;

      if (branches.length === 0) {
        this.isLoading = false;
        return;
      }

      branches.forEach(branch => {
        this.inventoryService.getBranchInventory(String(branch.id))
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (inventory) => {
              allInventory.push(...inventory);
              completed++;
              if (completed === branches.length) {
                this.branchInventory = allInventory;
                this.generateSuggestions();
                this.isLoading = false;
              }
            },
            error: (err) => {
              console.error('Failed to load inventory for branch:', branch.id, err);
              completed++;
              if (completed === branches.length) {
                this.branchInventory = allInventory;
                this.generateSuggestions();
                this.isLoading = false;
              }
            }
          });
      });
    }
  }

  // ============================================================
  // AUTO REFRESH
  // ============================================================

  private startAutoRefresh(): void {
    this.refreshSubscription = interval(60000)
      .pipe(takeWhile(() => true))
      .subscribe(() => {
        this.loadData();
      });
  }

  // ============================================================
  // SUGGESTIONS GENERATION
  // ============================================================

  private generateSuggestions(): void {
    const suggestions: RestockSuggestion[] = [];
    const productMap = new Map<string, Product>();

    this.products.forEach(p => productMap.set(String(p.id), p));

    this.branchInventory.forEach(item => {
      const status = getStockStatus(item.quantity, item.reorderPoint, item.safetyStock);

      // Only include if stock is below reorder point or at safety stock level
      if (status === 'CRITICAL' || status === 'LOW') {
        const product = productMap.get(item.productId);
        if (product) {
          const suggestedQuantity = this.calculateSuggestedQuantity(item);
          suggestions.push({
            id: `sug-${item.branchId}-${item.productId}`,
            productId: item.productId,
            productName: item.productName,
            sku: item.sku,
            branchId: item.branchId,
            branchName: item.branchName,
            currentStock: item.quantity,
            reorderPoint: item.reorderPoint,
            safetyStock: item.safetyStock,
            suggestedQuantity: suggestedQuantity,
            urgency: status === 'CRITICAL' ? RestockUrgency.CRITICAL : RestockUrgency.HIGH,
            productImage: product.images?.[0] || '',
            category: product.category as string,
            sellingPrice: item.sellingPrice,
            costEstimate: suggestedQuantity * item.costPrice
          });
        }
      }
    });

    // Sort by urgency (critical first) and then by quantity
    suggestions.sort((a, b) => {
      if (a.urgency === RestockUrgency.CRITICAL && b.urgency !== RestockUrgency.CRITICAL) return -1;
      if (a.urgency !== RestockUrgency.CRITICAL && b.urgency === RestockUrgency.CRITICAL) return 1;
      if (a.urgency === RestockUrgency.HIGH && b.urgency !== RestockUrgency.HIGH) return -1;
      if (a.urgency !== RestockUrgency.HIGH && b.urgency === RestockUrgency.HIGH) return 1;
      return (a.currentStock / a.reorderPoint) - (b.currentStock / b.reorderPoint);
    });

    this.suggestions = suggestions;
    this.filteredSuggestions = suggestions.slice(0, this.limit);
    this.calculateStats();
  }

  private calculateSuggestedQuantity(item: BranchInventory): number {
    const status = getStockStatus(item.quantity, item.reorderPoint, item.safetyStock);
    return getSuggestedRestockQuantity(item.quantity, item.reorderPoint, status);
  }

  private calculateStats(): void {
    this.stats.total = this.suggestions.length;
    this.stats.critical = this.suggestions.filter(s => s.urgency === RestockUrgency.CRITICAL).length;
    this.stats.low = this.suggestions.filter(s => s.urgency === RestockUrgency.HIGH).length;
  }

  // ============================================================
  // FILTERING
  // ============================================================

  toggleShowAll(): void {
    this.showAll = !this.showAll;
    this.filteredSuggestions = this.showAll ? this.suggestions : this.suggestions.slice(0, this.limit);
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  selectSuggestion(suggestion: RestockSuggestion): void {
    this.selectedSuggestion = suggestion;
    this.suggestionSelected.emit(suggestion);
  }

  createRestockRequest(suggestion: RestockSuggestion): void {
    this.createRequest.emit(suggestion);
    // Navigate to restock request form with pre-filled data
    this.router.navigate(['/admin/sales/commerce/inventory/restock/requests/new'], {
      queryParams: {
        branchId: suggestion.branchId,
        productId: suggestion.productId,
        quantity: suggestion.suggestedQuantity
      }
    });
  }

  viewProduct(productId: string): void {
    this.router.navigate(['/admin/sales/commerce/inventory/products', productId]);
  }

  viewBranch(branchId: string): void {
    this.router.navigate(['/admin/sales/commerce/inventory/branches', branchId]);
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

  getUrgencyLabel(urgency: string): string {
    return urgency.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getUrgencyColor(urgency: string): string {
    const map: Record<string, string> = {
      [RestockUrgency.CRITICAL]: '#DC2626',
      [RestockUrgency.HIGH]: '#F97316',
      [RestockUrgency.MEDIUM]: '#F59E0B',
      [RestockUrgency.LOW]: '#3B82F6'
    };
    return map[urgency] || '#6B7280';
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

  getInitials(name: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
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

  // ============================================================
  // BULK ACTIONS
  // ============================================================

  createAllRequests(): void {
    if (this.suggestions.length === 0 || this.isCreatingAll) return;
    if (!confirm(`Create restock requests for all ${this.suggestions.length} suggested items?`)) return;

    // This used to call createRestockRequest(suggestion) once per suggestion, but that method
    // only navigates to the New Request form pre-filled for ONE item — it never actually creates
    // anything itself. Firing N router.navigate() calls in a tight loop meant Angular cancelled
    // every navigation but the last, so "Create All" only ever opened the form for the final
    // suggestion, and the confirm dialog's promise of N requests was never kept. This now calls
    // the real create endpoint directly for every suggestion and waits for all of them.
    this.isCreatingAll = true;
    this.error = null;
    const currentUserId = sessionStorage.getItem('userid');
    const currentUserName = sessionStorage.getItem('fullname');

    const requests = this.suggestions.map(s => this.inventoryService.createRestockRequest({
      branchId: s.branchId,
      branchName: s.branchName,
      productId: s.productId,
      productName: s.productName,
      sku: s.sku,
      currentStock: s.currentStock,
      reorderPoint: s.reorderPoint,
      safetyStock: s.safetyStock,
      requestedQuantity: s.suggestedQuantity,
      urgency: s.urgency,
      costEstimate: s.costEstimate || 0,
      status: RestockStatus.PENDING,
      ...(currentUserId ? { createdBy: currentUserId } : {}),
      ...(currentUserName ? { createdByName: currentUserName } : {})
    }).pipe(
      map(() => ({ ok: true as const })),
      catchError(err => of({ ok: false as const, productName: s.productName, message: err?.message as string | undefined }))
    ));

    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe(results => {
      this.isCreatingAll = false;
      const failed = results.filter((r): r is { ok: false; productName: string; message: string | undefined } => !r.ok);

      if (failed.length === 0) {
        this.router.navigate(['/admin/sales/commerce/inventory/restock/requests']);
        return;
      }

      this.error = failed.length === results.length
        ? `Failed to create any restock requests. ${failed[0].productName}: ${failed[0].message || 'unknown error'}`
        : `${results.length - failed.length} of ${results.length} restock requests were created; ${failed.length} failed (e.g. ${failed[0].productName}).`;
      // Reload so the ones that succeeded drop out of the suggestions list.
      this.refresh();
    });
  }
}

// ============================================================
// INTERFACE
// ============================================================

export interface RestockSuggestion {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  branchId: string;
  branchName: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  suggestedQuantity: number;
  urgency: RestockUrgency;
  productImage?: string;
  category?: string;
  sellingPrice?: number;
  costEstimate?: number;
}