// bulk-transfer.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  Branch,
  Product,
  BranchInventory,
  StockMovement,
  MovementType,
  getMovementTypeLabel
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-bulk-transfer',
  templateUrl: './bulk-transfer.component.html',
  styleUrls: ['./bulk-transfer.component.scss']
})
export class BulkTransferComponent implements OnInit, OnDestroy {

  // ============================================================
  // OUTPUTS
  // ============================================================

  @Output() completed = new EventEmitter<StockMovement[]>();
  @Output() cancelled = new EventEmitter<void>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  branches: Branch[] = [];
  products: Product[] = [];
  sourceInventory: BranchInventory[] = [];
  destInventory: BranchInventory[] = [];
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  error: string | null = null;

  // Form
  bulkForm!: FormGroup;

  // Product selection
  productSearchTerm: string = '';
  showProductDropdown: boolean = false;
  filteredProducts: Product[] = [];

  // UI
  Math = Math;
  showConfirmDialog: boolean = false;
  confirmMessage: string = '';

  // Step tracking
  currentStep: number = 1;
  totalSteps: number = 4;

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
    this.buildForm();
  }

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
  // FORM BUILDING
  // ============================================================

  private buildForm(): void {
    this.bulkForm = this.fb.group({
      sourceBranchId: ['', Validators.required],
      destinationBranchId: ['', Validators.required],
      items: this.fb.array([]),
      notes: [''],
      priority: ['MEDIUM']
    });
  }

  private createItemForm(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      productName: [''],
      sku: [''],
      quantity: ['', [Validators.required, Validators.min(1)]],
      sourceStock: [0],
      destinationStock: [0]
    });
  }

  // ============================================================
  // GETTERS
  // ============================================================

  get items(): FormArray {
    return this.bulkForm.get('items') as FormArray;
  }

  get sourceBranchId(): string {
    return this.bulkForm.get('sourceBranchId')?.value;
  }

  get destinationBranchId(): string {
    return this.bulkForm.get('destinationBranchId')?.value;
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
          this.checkLoadingComplete();
        },
        error: (err) => {
          console.error('Failed to load branches:', err);
          this.error = 'Failed to load branches. Please try again.';
          this.isLoading = false;
        }
      });

    // Load products
    this.inventoryService.getProducts({ limit: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.products = response.data;
          this.filteredProducts = response.data;
          this.checkLoadingComplete();
        },
        error: (err) => {
          console.error('Failed to load products:', err);
          this.error = 'Failed to load products. Please try again.';
          this.isLoading = false;
        }
      });
  }

  private checkLoadingComplete(): void {
    if (this.branches.length > 0 && this.products.length > 0) {
      this.isLoading = false;
    }
  }

  // ============================================================
  // BRANCH SELECTION
  // ============================================================

  onSourceBranchChange(): void {
    if (this.sourceBranchId) {
      this.loadSourceInventory();
      // Clear existing items
      this.items.clear();
      this.productSearchTerm = '';
    }
  }

  onDestinationBranchChange(): void {
    if (this.destinationBranchId) {
      this.loadDestinationInventory();
    }
  }

  loadSourceInventory(): void {
    if (!this.sourceBranchId) return;

    this.inventoryService.getBranchInventory(this.sourceBranchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory) => {
          this.sourceInventory = inventory;
          // Update existing items with source stock
          this.updateItemStocks();
        },
        error: (err) => {
          console.error('Failed to load source inventory:', err);
        }
      });
  }

  loadDestinationInventory(): void {
    if (!this.destinationBranchId) return;

    this.inventoryService.getBranchInventory(this.destinationBranchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory) => {
          this.destInventory = inventory;
          this.updateItemStocks();
        },
        error: (err) => {
          console.error('Failed to load destination inventory:', err);
        }
      });
  }

  private updateItemStocks(): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items.at(i);
      const productId = item.get('productId')?.value;

      const sourceItem = this.sourceInventory.find(inv => inv.productId === productId);
      const destItem = this.destInventory.find(inv => inv.productId === productId);

      if (sourceItem) {
        item.patchValue({ sourceStock: sourceItem.quantity });
      }
      if (destItem) {
        item.patchValue({ destinationStock: destItem.quantity });
      }
    }
  }

  // ============================================================
  // PRODUCT MANAGEMENT
  // ============================================================

  onProductSearch(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.productSearchTerm = searchTerm;
    if (searchTerm.length > 0) {
      this.filteredProducts = this.products.filter(p =>
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      this.filteredProducts = this.products;
    }
    this.showProductDropdown = true;
  }

  addProduct(product: Product): void {
    // Check if product already added
    if (this.items.value.some((item: any) => item.productId === product.id)) {
      this.error = 'Product already added to transfer';
      this.showProductDropdown = false;
      this.productSearchTerm = '';
      return;
    }

    // Check if product exists in source inventory
    const sourceItem = this.sourceInventory.find(i => i.productId === String(product.id));
    if (!sourceItem || sourceItem.quantity <= 0) {
      this.error = 'Product not available in source branch';
      this.showProductDropdown = false;
      this.productSearchTerm = '';
      return;
    }

    // Add to form
    const item = this.createItemForm();
    const destItem = this.destInventory.find(i => i.productId === String(product.id));
    item.patchValue({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: 1,
      sourceStock: sourceItem.quantity,
      destinationStock: destItem?.quantity || 0
    });
    this.items.push(item);
    // Ensure form detects new control
    this.bulkForm.updateValueAndValidity();

    this.showProductDropdown = false;
    this.productSearchTerm = '';
    this.error = null;
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  updateQuantity(index: number): void {
    const item = this.items.at(index);
    const quantity = parseInt(item.get('quantity')?.value || '0', 10);
    const sourceStock = item.get('sourceStock')?.value || 0;
    if (quantity > sourceStock) {
      this.error = `Quantity cannot exceed available stock (${sourceStock})`;
    } else {
      this.error = null;
    }
  }

  onProductBlur(): void {
    setTimeout(() => {
      this.showProductDropdown = false;
    }, 200);
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.cancelConfirmDialog();
    }
  }

  getTotalItems(): number {
    return this.items.value.reduce((sum: number, item: any) => sum + (parseInt(item.quantity) || 0), 0);
  }

  getTotalProducts(): number {
    return this.items.length;
  }

  // ============================================================
  // BULK OPERATIONS
  // ============================================================

  clearAllItems(): void {
    if (this.items.length === 0) return;
    if (confirm('Are you sure you want to remove all items?')) {
      this.items.clear();
      this.error = null;
    }
  }

  // ============================================================
  // WIZARD NAVIGATION
  // ============================================================

  goToStep(step: number): void {
    if (step < 1 || step > this.totalSteps) return;
    if (step > this.currentStep && !this.validateCurrentStep()) return;
    this.currentStep = step;
    this.error = null;
  }

  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.error = null;
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.error = null;
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        if (!this.sourceBranchId || !this.destinationBranchId) {
          this.error = 'Please select both source and destination branches';
          return false;
        }
        if (this.sourceBranchId === this.destinationBranchId) {
          this.error = 'Source and destination branches cannot be the same';
          return false;
        }
        return true;
      case 2:
        if (this.items.length === 0) {
          this.error = 'Please add at least one product to transfer';
          return false;
        }
        // Validate quantities
        for (let i = 0; i < this.items.length; i++) {
          const item = this.items.at(i);
          const quantity = parseInt(item.get('quantity')?.value || 0);
          const sourceStock = parseInt(item.get('sourceStock')?.value || 0);
          if (quantity > sourceStock) {
            const productName = item.get('productName')?.value;
            this.error = `Insufficient stock for ${productName}. Available: ${sourceStock}`;
            return false;
          }
          if (quantity <= 0) {
            this.error = 'Quantity must be greater than 0';
            return false;
          }
        }
        return true;
      case 3:
        return this.items.length > 0;
      default:
        return true;
    }
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  submitTransfer(): void {
    if (!this.validateCurrentStep()) return;

    this.isSubmitting = true;
    this.error = null;

    const formValue = this.bulkForm.value;
    const items: any[] = formValue.items;
    const sourceBranchId = formValue.sourceBranchId;
    const destinationBranchId = formValue.destinationBranchId;
    const sourceBranchName = this.getBranchName(sourceBranchId);
    const destinationBranchName = this.getBranchName(destinationBranchId);

    // Checked up front, before any request is sent, so an insufficient-stock item blocks the
    // whole batch instead of letting earlier items in the list already be created.
    for (const item of items) {
      const quantity = parseInt(item.quantity, 10) || 0;
      const sourceStock = parseInt(item.sourceStock, 10) || 0;
      if (quantity > sourceStock) {
        this.isSubmitting = false;
        this.error = `Insufficient stock for ${item.productName}. Available: ${sourceStock}`;
        return;
      }
    }

    // Recorded PENDING — stock doesn't move until the transfer is approved (Movement Approvals
    // page or a manual status update to COMPLETED); see
    // InventoryService.applyTransferStockAdjustment(). createMovement() is a real HTTP call, not
    // a synchronous mock — this used to flip isSubmitting back to false and navigate away right
    // after firing all the requests, before any of them had actually resolved. That let the
    // button re-enable mid-batch (risking a duplicate submission) and reported success/failure
    // based on state that hadn't been set yet.
    const requests = items.map(item => {
      const quantity = parseInt(item.quantity, 10) || 0;
      return this.inventoryService.createMovement({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity,
        movementType: MovementType.TRANSFER,
        fromLocation: { type: 'BRANCH', id: sourceBranchId, name: sourceBranchName },
        toLocation: { type: 'BRANCH', id: destinationBranchId, name: destinationBranchName },
        notes: formValue.notes || ''
      }).pipe(
        map(movement => ({ ok: true as const, movement })),
        catchError(err => of({ ok: false as const, productName: item.productName as string, message: err?.message as string | undefined }))
      );
    });

    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe(results => {
      this.isSubmitting = false;

      const created = results.filter((r): r is { ok: true; movement: StockMovement } => r.ok).map(r => r.movement);
      const failed = results.filter((r): r is { ok: false; productName: string; message: string | undefined } => !r.ok);

      if (created.length > 0) {
        this.completed.emit(created);
      }

      if (failed.length === 0) {
        this.router.navigate(['/admin/sales/commerce/inventory/movements/approvals']);
        return;
      }

      // Remove the items that already succeeded, so a resubmit only retries the ones that
      // actually failed instead of creating duplicate movements for the ones that didn't.
      for (let i = results.length - 1; i >= 0; i--) {
        if (results[i].ok) this.items.removeAt(i);
      }

      this.error = failed.length === results.length
        ? `Failed to create any transfers. ${failed[0].productName}: ${failed[0].message || 'unknown error'}`
        : `${created.length} of ${results.length} transfers were created; ${failed.length} failed (e.g. ${failed[0].productName}). The successful ones were removed from this form — fix the remaining item(s) and submit again.`;
    });
  }

  // ============================================================
  // CANCEL
  // ============================================================

  cancel(): void {
    if (this.items.length > 0 || this.bulkForm.dirty) {
      this.showConfirmDialog = true;
      this.confirmMessage = 'You have unsaved changes. Are you sure you want to leave?';
    } else {
      this.cancelled.emit();
      this.router.navigate(['/admin/sales/commerce/inventory']);
    }
  }

  confirmCancel(): void {
    this.showConfirmDialog = false;
    this.cancelled.emit();
    this.router.navigate(['/admin/sales/commerce/inventory']);
  }

  cancelConfirmDialog(): void {
    this.showConfirmDialog = false;
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getBranchName(branchId: string): string {
    const branch = this.branches.find(b => String(b.id) === branchId);
    return branch?.name || branchId;
  }

  getSourceStock(productId: string | number): number {
    const item = this.sourceInventory.find(i => String(i.productId) === String(productId));
    return item?.quantity || 0;
  }

  getDestinationStock(productId: string | number): number {
    const item = this.destInventory.find(i => String(i.productId) === String(productId));
    return item?.quantity || 0;
  }

  getMovementTypeLabel(type: string): string {
    return getMovementTypeLabel(type as MovementType);
  }

  getStepStatus(step: number): 'complete' | 'current' | 'incomplete' {
    if (step < this.currentStep) return 'complete';
    if (step === this.currentStep) return 'current';
    return 'incomplete';
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

  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return !!this.sourceBranchId && !!this.destinationBranchId &&
          this.sourceBranchId !== this.destinationBranchId;
      case 2:
        return this.items.length > 0;
      case 3:
        return this.items.length > 0;
      default:
        return true;
    }
  }
}