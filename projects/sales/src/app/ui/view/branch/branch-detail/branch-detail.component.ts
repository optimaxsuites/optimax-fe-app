// branch-detail.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from '../../../service/inventory/inventory.service';
import {
  Branch,
  BranchInventory,
  BranchStockSummary,
  StockMovement,
  StockAlert,
  getStockStatus,
  getStockStatusColor,
  getStockStatusLabel,
  MovementType,
  MovementStatus
} from '../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-branch-detail',
  templateUrl: './branch-detail.component.html',
  styleUrls: ['./branch-detail.component.scss']
})
export class BranchDetailComponent implements OnInit, OnDestroy {

  // ============================================================
  // STATE
  // ============================================================

  // Core
  branchId: string = '';
  branch: Branch | null = null;
  branches: Branch[] = [];
  branchInventory: BranchInventory[] = [];
  branchSummary: BranchStockSummary | null = null;
  isLoading: boolean = true;
  error: string | null = null;
  isSaving: boolean = false;

  // Tabs
  activeTab: 'overview' | 'inventory' | 'movements' | 'alerts' | 'analytics' = 'overview';

  // Inventory filters
  inventoryFilters = {
    searchTerm: '',
    stockStatus: 'ALL',
    category: 'ALL'
  };

  // Categories for filter
  categories: string[] = ['ALL'];

  // Stock movement filters
  movementFilters = {
    type: 'ALL',
    status: 'ALL',
    dateFrom: '',
    dateTo: ''
  };

  // Edit mode
  isEditing: boolean = false;
  editForm!: FormGroup;

  // UI
  Math = Math;

  // Movement types for filter
  movementTypes = ['ALL', 'PURCHASE', 'TRANSFER', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGED'];
  movementStatuses = ['ALL', 'PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];
  stockStatuses = ['ALL', 'CRITICAL', 'LOW', 'NORMAL', 'OVERSTOCK'];

  // Computed
  filteredInventory: BranchInventory[] = [];
  filteredMovements: StockMovement[] = [];

  // Statistics
  stats = {
    totalProducts: 0,
    totalStockUnits: 0,
    totalStockValue: 0,
    lowStock: 0,
    outOfStock: 0,
    totalMovements: 0
  };

  // Alerts
  alerts: StockAlert[] = [];

  // Recent movements
  recentMovements: StockMovement[] = [];

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private location: Location,
    private inventoryService: InventoryService,
    private fb: FormBuilder
  ) {
    this.buildForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    this.loadBranchList();
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.branchId = params['branchId'];
      if (this.branchId) {
        this.loadBranchData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // FORM BUILDING
  // ============================================================

  private buildForm(): void {
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      code: ['', [Validators.required, Validators.minLength(2)]],
      type: ['', Validators.required],
      status: ['', Validators.required],
      location: this.fb.group({
        address: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        country: ['Nigeria', Validators.required],
        postalCode: [''],
        lat: [''],
        lng: ['']
      }),
      contact: this.fb.group({
        phone: ['', Validators.required],
        email: ['', [Validators.email]],
        manager: ['', Validators.required]
      })
    });
  }

  private populateForm(branch: Branch): void {
    this.editForm.patchValue({
      name: branch.name,
      code: branch.code,
      type: branch.type,
      status: branch.status,
      location: {
        address: branch.location.address,
        city: branch.location.city,
        state: branch.location.state,
        country: branch.location.country,
        postalCode: branch.location.postalCode || '',
        lat: branch.location.lat || '',
        lng: branch.location.lng || ''
      },
      contact: {
        phone: branch.contact.phone,
        email: branch.contact.email || '',
        manager: branch.contact.manager
      }
    });
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadBranchData(): void {
    this.isLoading = true;
    this.error = null;

    // Load branch details
    this.inventoryService.getBranch(this.branchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branch) => {
          this.branch = branch;
          this.populateForm(branch);
          this.loadBranchInventory();
          this.loadBranchSummary();
          this.loadBranchAlerts();
          this.loadRecentMovements();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load branch:', err);
          this.error = 'Failed to load branch details. Please try again.';
          this.isLoading = false;
        }
      });
  }

  loadBranchList(): void {
    this.inventoryService.getBranches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branches) => { this.branches = branches; },
        error: (err) => console.error('Failed to load branch list:', err)
      });
  }

  loadBranchInventory(): void {
    this.inventoryService.getBranchInventory(this.branchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory) => {
          this.branchInventory = inventory;
          this.applyInventoryFilters();
          this.calculateStats();
          this.updateCategories();
        },
        error: (err) => {
          console.error('Failed to load branch inventory:', err);
        }
      });
  }

  loadBranchSummary(): void {
    this.inventoryService.getBranchAnalytics(this.branchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.branchSummary = summary;
        },
        error: (err) => {
          console.error('Failed to load branch summary:', err);
        }
      });
  }

  loadBranchAlerts(): void {
    this.inventoryService.getDashboardAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.alerts = alerts.filter(a => a.branchId === this.branchId);
        },
        error: (err) => {
          console.error('Failed to load alerts:', err);
        }
      });
  }

  loadRecentMovements(): void {
    this.inventoryService.getRecentMovements(20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (movements) => {
          this.recentMovements = movements.filter(m =>
            m.fromLocation.id === this.branchId ||
            m.toLocation.id === this.branchId
          );
          this.applyMovementFilters();
        },
        error: (err) => {
          console.error('Failed to load movements:', err);
        }
      });
  }

  // ============================================================
  // FILTERING
  // ============================================================

  applyInventoryFilters(): void {
    this.filteredInventory = this.branchInventory.filter(item => {
      const searchMatch = !this.inventoryFilters.searchTerm ||
        item.productName.toLowerCase().includes(this.inventoryFilters.searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(this.inventoryFilters.searchTerm.toLowerCase());

      const status = getStockStatus(item.quantity, item.reorderPoint, item.safetyStock);
      const statusMatch = this.inventoryFilters.stockStatus === 'ALL' ||
        status === this.inventoryFilters.stockStatus;

      return searchMatch && statusMatch;
    });
  }

  applyMovementFilters(): void {
    this.filteredMovements = this.recentMovements.filter(m => {
      const typeMatch = this.movementFilters.type === 'ALL' ||
        m.movementType === this.movementFilters.type;

      const statusMatch = this.movementFilters.status === 'ALL' ||
        m.status === this.movementFilters.status;

      return typeMatch && statusMatch;
    });
  }

  private updateCategories(): void {
    this.categories = ['ALL', 'Electronics', 'Building Materials', 'Paints', 'Plumbing'];
  }

  // ============================================================
  // STATS CALCULATION
  // ============================================================

  calculateStats(): void {
    let totalProducts = this.branchInventory.length;
    let totalStockUnits = 0;
    let totalStockValue = 0;
    let lowStock = 0;
    let outOfStock = 0;

    this.branchInventory.forEach(item => {
      totalStockUnits += item.quantity;
      totalStockValue += item.quantity * item.sellingPrice;

      if (item.quantity <= 0) {
        outOfStock++;
      } else if (item.quantity <= item.reorderPoint) {
        lowStock++;
      }
    });

    this.stats = {
      totalProducts,
      totalStockUnits,
      totalStockValue,
      lowStock,
      outOfStock,
      totalMovements: this.recentMovements.length
    };
  }

  // ============================================================
  // TAB MANAGEMENT
  // ============================================================

  setActiveTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  navigateToProduct(productId: string): void {
    this.router.navigate(['/admin/sales/commerce/inventory/products', productId]);
  }

  /** Switch to a different branch from the branch selector in the top bar. */
  onBranchChange(branchId: string | null): void {
    if (!branchId || branchId === this.branchId) return;
    this.isEditing = false;
    this.router.navigate(['/admin/sales/inventory/branches', branchId]);
  }

  createTransfer(productId?: string): void {
    this.router.navigate(['/admin/sales/commerce/inventory/movements/transfer'], {
      queryParams: productId ? {
        productId: productId,
        branchId: this.branchId
      } : { branchId: this.branchId }
    });
  }

  createRestockRequest(): void {
    this.router.navigate(['/admin/sales/commerce/inventory/restock/requests/new'], {
      queryParams: { branchId: this.branchId }
    });
  }

  createStockCount(): void {
    this.router.navigate(['/admin/sales/commerce/inventory/movements/adjustment'], {
      queryParams: { branchId: this.branchId }
    });
  }

  navigateToAddProduct(): void {
    this.router.navigate(['/admin/sales/commerce/inventory/branches', this.branchId, 'inventory', 'new']);
  }

  viewMovement(movementId: string): void {
    this.router.navigate(['/admin/sales/commerce/inventory/movements', movementId]);
  }

  // ============================================================
  // EDIT MODE
  // ============================================================

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing && this.branch) {
      this.populateForm(this.branch);
    }
  }

  saveBranch(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.editForm.value;

    this.inventoryService.updateBranch(this.branchId, formValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.branch = updated;
          this.isEditing = false;
          this.isSaving = false;
        },
        error: (err) => {
          console.error('Failed to update branch:', err);
          this.isSaving = false;
          this.error = 'Failed to update branch. Please try again.';
        }
      });
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  goBack(): void {
    this.location.back();
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    this.loadBranchData();
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

  getBranchStatusColor(status: string): string {
    const map: Record<string, string> = {
      'ACTIVE': '#2EB270',
      'INACTIVE': '#6B7280',
      'UNDER_CONSTRUCTION': '#F59E0B'
    };
    return map[status] || '#6B7280';
  }

  getBranchTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'FLAGSHIP': '⭐ Flagship',
      'STANDARD': 'Standard',
      'MINI': 'Mini'
    };
    return map[type] || type;
  }

  getStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getMovementTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'PURCHASE': 'Purchase',
      'TRANSFER': 'Transfer',
      'SALE': 'Sale',
      'RETURN': 'Return',
      'ADJUSTMENT': 'Adjustment',
      'DAMAGED': 'Damaged'
    };
    return map[type] || type;
  }

  getMovementStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
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

  getInitials(name: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.editForm.get(fieldName);
    return !!control?.invalid && !!control?.touched;
  }

  getFieldError(fieldName: string): string {
    const control = this.editForm.get(fieldName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'This field is required';
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} characters required`;

    return 'Invalid input';
  }
}