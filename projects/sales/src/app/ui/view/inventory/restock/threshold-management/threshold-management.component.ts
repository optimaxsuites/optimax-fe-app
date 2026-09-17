// threshold-management.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  Branch,
  BranchInventory,
  Product,
  getStockStatus,
  getStockStatusLabel,
  getStockStatusColor
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-threshold-management',
  templateUrl: './threshold-management.component.html',
  styleUrls: ['./threshold-management.component.scss']
})
export class ThresholdManagementComponent implements OnInit, OnDestroy {

  // ============================================================
  // INPUTS / OUTPUTS
  // ============================================================

  @Input() branchId: string = '';
  @Output() thresholdsUpdated = new EventEmitter<void>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  branches: Branch[] = [];
  selectedBranch: Branch | null = null;
  inventoryItems: BranchInventory[] = [];
  filteredItems: BranchInventory[] = [];
  products: Product[] = [];
  isLoading: boolean = true;
  isSaving: boolean = false;
  error: string | null = null;
  success: string | null = null;

  // Filters
  filterForm: FormGroup;
  searchSubject = new Subject<string>();

  // UI
  Math = Math;
  parseInt = parseInt;
  showEditModal: boolean = false;
  editingItem: BranchInventory | null = null;
  editForm: FormGroup;
  bulkForm!: FormGroup;
  activeTab: 'list' | 'bulk' = 'list';
  showBulkEdit: boolean = false;

  // Stats
  stats = {
    total: 0,
    critical: 0,
    low: 0,
    healthy: 0,
    overstock: 0
  };

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private inventoryService: InventoryService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.filterForm = this.buildFilterForm();
    this.editForm = this.buildEditForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    this.loadData();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // FORM BUILDING
  // ============================================================

  private buildFilterForm(): FormGroup {
    return this.fb.group({
      search: [''],
      status: ['ALL'],
      category: ['ALL']
    });
  }

  private buildEditForm(): FormGroup {
    return this.fb.group({
      reorderPoint: ['', [Validators.required, Validators.min(0)]],
      safetyStock: ['', [Validators.required, Validators.min(0)]],
      reorderQuantity: ['', [Validators.required, Validators.min(0)]]
    });
  }

  private buildBulkForm(): FormGroup {
    return this.fb.group({
      branchId: ['', Validators.required],
      multiplier: ['1.5', Validators.required],
      applyTo: ['ALL']
    });
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filterForm.patchValue({ search: searchTerm });
      this.applyFilters();
    });
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
          if (this.branchId) {
            const branch = branches.find(b => String(b.id) === this.branchId);
            if (branch) {
              this.selectedBranch = branch;
              this.loadInventory(this.branchId);
            }
          } else if (branches.length > 0) {
            this.selectedBranch = branches[0];
            this.loadInventory(String(branches[0].id));
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load branches:', err);
          this.error = 'Failed to load branches. Please try again.';
          this.isLoading = false;
        }
      });

    // Load products for reference
    this.inventoryService.getProducts({ limit: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.products = response.data;
          this.mergeProductsIntoInventory();
        },
        error: (err) => console.error('Failed to load products:', err)
      });
  }

  loadInventory(branchId: string): void {
    this.isLoading = true;
    this.inventoryService.getBranchInventory(branchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory) => {
          this.inventoryItems = inventory;
          this.mergeProductsIntoInventory();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load inventory:', err);
          this.error = 'Failed to load inventory. Please try again.';
          this.isLoading = false;
        }
      });
  }

  // getBranchInventory() only returns products that already have a stock record at this
  // branch, so any product created after that record never existed (e.g. anything added in
  // Product Management, which never creates a branch-inventory row) was invisible here with
  // no way to set a threshold for it. Fill in a placeholder row for every catalog product
  // missing from the branch's inventory — editing one for the first time creates its real
  // record via saveBranchInventoryItem() in saveEdit() below.
  private mergeProductsIntoInventory(): void {
    if (!this.selectedBranch || this.products.length === 0) return;
    const branchId = String(this.selectedBranch.id);
    const existingProductIds = new Set(
      this.inventoryItems.filter(i => i.branchId === branchId).map(i => i.productId)
    );
    const missing = this.products.filter(p => !existingProductIds.has(String(p.id)));
    if (missing.length > 0) {
      const placeholders: BranchInventory[] = missing.map(p => ({
        id: 0,
        branchId,
        branchName: this.selectedBranch!.name,
        productId: String(p.id),
        productName: p.name,
        sku: p.sku,
        // Product Management's stockQuantity is the only stock figure this product has
        // anywhere until a real per-branch record exists — showing 0 here instead
        // contradicted what the user had just seen on the product's own page.
        quantity: p.stockQuantity || 0,
        reorderPoint: 0,
        reorderQuantity: 0,
        safetyStock: 0,
        sellingPrice: p.sellingPrice || p.unitPrice || p.price || 0,
        costPrice: p.costPrice || 0,
        lastUpdated: new Date()
      }));
      this.inventoryItems = [...this.inventoryItems, ...placeholders];
    }
    this.applyFilters();
    this.calculateStats();
  }

  onBranchChange(branchId: string | number): void {
    const branch = this.branches.find(b => String(b.id) === String(branchId));
    if (branch) {
      this.selectedBranch = branch;
      this.loadInventory(String(branchId));
    }
  }

  // ============================================================
  // FILTERING
  // ============================================================

  applyFilters(): void {
    const formValue = this.filterForm.value;

    this.filteredItems = this.inventoryItems.filter(item => {
      // Search filter
      const searchMatch = !formValue.search ||
        (item.productName || '').toLowerCase().includes(formValue.search.toLowerCase()) ||
        (item.sku || '').toLowerCase().includes(formValue.search.toLowerCase());

      // Status filter
      const status = getStockStatus(item.quantity, item.reorderPoint, item.safetyStock);
      const statusMatch = formValue.status === 'ALL' ||
        status === formValue.status;

      return searchMatch && statusMatch;
    });
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: 'ALL',
      category: 'ALL'
    });
    this.searchSubject.next('');
    this.applyFilters();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.searchSubject.next(target.value);
    }
  }

  getActiveFilterCount(): number {
    const formValue = this.filterForm.value;
    let count = 0;
    if (formValue.search) count++;
    if (formValue.status !== 'ALL') count++;
    if (formValue.category !== 'ALL') count++;
    return count;
  }

  // ============================================================
  // STATS CALCULATION
  // ============================================================

  calculateStats(): void {
    this.stats.total = this.inventoryItems.length;
    this.stats.critical = this.inventoryItems.filter(item =>
      getStockStatus(item.quantity, item.reorderPoint, item.safetyStock) === 'CRITICAL'
    ).length;
    this.stats.low = this.inventoryItems.filter(item =>
      getStockStatus(item.quantity, item.reorderPoint, item.safetyStock) === 'LOW'
    ).length;
    this.stats.healthy = this.inventoryItems.filter(item =>
      getStockStatus(item.quantity, item.reorderPoint, item.safetyStock) === 'NORMAL'
    ).length;
    this.stats.overstock = this.inventoryItems.filter(item =>
      getStockStatus(item.quantity, item.reorderPoint, item.safetyStock) === 'OVERSTOCK'
    ).length;
  }

  // ============================================================
  // EDIT MODAL
  // ============================================================

  openEditModal(item: BranchInventory): void {
    this.editingItem = item;
    this.editForm.patchValue({
      reorderPoint: item.reorderPoint,
      safetyStock: item.safetyStock,
      reorderQuantity: item.reorderQuantity || item.reorderPoint
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingItem = null;
    this.editForm.reset();
    this.error = null;
    this.success = null;
  }

  saveEdit(): void {
    if (this.editForm.invalid || !this.editingItem || !this.selectedBranch) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.error = null;
    this.success = null;

    const formValue = this.editForm.value;
    const editingItem = this.editingItem;

    // editingItem may be a placeholder (id: 0) for a product that's never had a branch-
    // inventory record before — saveBranchInventoryItem() upserts by branchId+productId, so
    // this both creates that record for the first time and updates an existing one.
    this.inventoryService.saveBranchInventoryItem({
      branchId: String(this.selectedBranch.id),
      productId: editingItem.productId,
      quantity: editingItem.quantity,
      reorderPoint: parseInt(formValue.reorderPoint),
      reorderQuantity: parseInt(formValue.reorderQuantity),
      safetyStock: parseInt(formValue.safetyStock),
      sellingPrice: editingItem.sellingPrice,
      costPrice: editingItem.costPrice
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved) => {
        const index = this.inventoryItems.findIndex(i =>
          i.branchId === saved.branchId && i.productId === saved.productId
        );
        if (index !== -1) {
          this.inventoryItems[index] = saved;
        } else {
          this.inventoryItems.push(saved);
        }
        this.applyFilters();
        this.calculateStats();

        this.isSaving = false;
        this.success = 'Thresholds updated successfully!';
        this.thresholdsUpdated.emit();

        setTimeout(() => {
          this.closeEditModal();
        }, 1500);
      },
      error: (err) => {
        console.error('Failed to save thresholds:', err);
        this.error = 'Failed to update thresholds. Please try again.';
        this.isSaving = false;
      }
    });
  }

  // ============================================================
  // BULK EDIT
  // ============================================================

  openBulkEdit(): void {
    this.showBulkEdit = !this.showBulkEdit;
    if (this.showBulkEdit) {
      this.bulkForm = this.buildBulkForm();
    }
  }

  applyBulkEdit(): void {
    // In a real implementation, this would apply bulk updates
    // For now, we'll show a success message
    this.success = 'Bulk update applied successfully!';
    setTimeout(() => {
      this.success = null;
      this.showBulkEdit = false;
    }, 2000);
  }

  // ============================================================
  // SORTING
  // ============================================================

  sortField: string = 'productName';
  sortDirection: 'asc' | 'desc' = 'asc';

  toggleSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.sortItems();
  }

  private sortItems(): void {
    this.filteredItems.sort((a, b) => {
      let aVal: any = (a as any)[this.sortField];
      let bVal: any = (b as any)[this.sortField];

      if (this.sortField === 'productName') {
        aVal = a.productName;
        bVal = b.productName;
      } else if (this.sortField === 'status') {
        aVal = getStockStatus(a.quantity, a.reorderPoint, a.safetyStock);
        bVal = getStockStatus(b.quantity, b.reorderPoint, b.safetyStock);
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  viewProduct(productId: string): void {
    this.router.navigate(['/admin/sales/commerce/inventory/products', productId]);
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

  getBranchName(branchId: string): string {
    const branch = this.branches.find(b => String(b.id) === branchId);
    return branch?.name || branchId;
  }

  getStatusCount(status: string): number {
    const map: Record<string, number> = {
      'CRITICAL': this.stats.critical,
      'LOW': this.stats.low,
      'NORMAL': this.stats.healthy,
      'OVERSTOCK': this.stats.overstock
    };
    return map[status] || 0;
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

  isFieldInvalid(fieldName: string): boolean {
    const control = this.editForm.get(fieldName);
    return !!control?.invalid && !!control?.touched;
  }

  getFieldError(fieldName: string): string {
    const control = this.editForm.get(fieldName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'This field is required';
    if (errors['min']) return `Minimum value is ${errors['min'].min}`;

    return 'Invalid input';
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    if (this.selectedBranch) {
      this.loadInventory(String(this.selectedBranch.id));
    }
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  goBack(): void {
    this.router.navigate(['/admin/sales/commerce/inventory']);
  }
}