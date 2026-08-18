// transfer-wizard.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  Branch,
  Product,
  BranchInventory,
  StockMovement,
  MovementType,
  MovementStatus,
  getMovementTypeLabel
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-transfer-wizard',
  templateUrl: './transfer-wizard.component.html',
  styleUrls: ['./transfer-wizard.component.scss']
})
export class TransferWizardComponent implements OnInit, OnDestroy {

  // ============================================================
  // OUTPUTS
  // ============================================================

  @Output() completed = new EventEmitter<StockMovement>();
  @Output() cancelled = new EventEmitter<void>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  branches: Branch[] = [];
  products: Product[] = [];
  sourceInventory: BranchInventory[] = [];
  destInventory: BranchInventory[] = [];
  filteredProducts: Product[] = [];
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  error: string | null = null;

  // Wizard
  currentStep: number = 1;
  totalSteps: number = 4;
  stepTitles = ['Select Source', 'Select Products', 'Select Destination', 'Review & Confirm'];

  // Forms
  wizardForm!: FormGroup;

  // Product selection
  productSearchTerm: string = '';
  showProductDropdown: boolean = false;
  selectedProducts: Map<string, { product: Product; quantity: number; sourceStock: number; destinationStock?: number }> = new Map();

  // UI
  Math = Math;
  showConfirmDialog: boolean = false;
  confirmMessage: string = '';

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
    this.wizardForm = this.fb.group({
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
    return this.wizardForm.get('items') as FormArray;
  }

  get sourceBranchId(): string {
    return this.wizardForm.get('sourceBranchId')?.value;
  }

  get destinationBranchId(): string {
    return this.wizardForm.get('destinationBranchId')?.value;
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
        next: (branches: Branch[]) => {
          this.branches = branches;
          this.checkLoadingComplete();
        },
        error: (err: any) => {
          console.error('Failed to load branches:', err);
          this.error = 'Failed to load branches. Please try again.';
          this.isLoading = false;
        }
      });

    // Load products
    this.inventoryService.getProducts({ limit: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.products = response.data;
          this.filteredProducts = response.data;
          this.checkLoadingComplete();
        },
        error: (err: any) => {
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
      this.selectedProducts.clear();
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
        next: (inventory: BranchInventory[]) => {
          this.sourceInventory = inventory;
          // Update selected products with source stock
          this.selectedProducts.forEach((value, key) => {
            const item = inventory.find((i: BranchInventory) => i.productId === key);
            value.sourceStock = item?.quantity || 0;
          });
        },
        error: (err: any) => {
          console.error('Failed to load source inventory:', err);
        }
      });
  }

  loadDestinationInventory(): void {
    if (!this.destinationBranchId) return;

    this.inventoryService.getBranchInventory(this.destinationBranchId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inventory: BranchInventory[]) => {
          this.destInventory = inventory;
          // Update selected products with destination stock
          this.selectedProducts.forEach((value, key) => {
            const item = inventory.find((i: BranchInventory) => i.productId === key);
            value.destinationStock = item?.quantity || 0;
          });
        },
        error: (err: any) => {
          console.error('Failed to load destination inventory:', err);
        }
      });
  }

  // ============================================================
  // PRODUCT SEARCH
  // ============================================================

  onProductSearch(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value;
    this.productSearchTerm = searchTerm;
    if (searchTerm.length > 0) {
      this.filteredProducts = this.products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      this.filteredProducts = this.products;
    }
    this.showProductDropdown = true;
  }

  hideProductDropdown(): void {
    setTimeout(() => {
      this.showProductDropdown = false;
    }, 200);
  }

  selectProduct(product: Product): void {
    // Check if product already added
    if (this.selectedProducts.has(product.id)) {
      this.error = 'Product already added to transfer';
      this.showProductDropdown = false;
      this.productSearchTerm = '';
      return;
    }

    // Check if product exists in source inventory
    const sourceItem = this.sourceInventory.find((i: BranchInventory) => i.productId === product.id);
    if (!sourceItem || sourceItem.quantity <= 0) {
      this.error = 'Product not available in source branch';
      this.showProductDropdown = false;
      this.productSearchTerm = '';
      return;
    }

    // Add to selected products
    this.selectedProducts.set(product.id, {
      product: product,
      quantity: 1,
      sourceStock: sourceItem.quantity,
      destinationStock: this.destInventory.find((i: BranchInventory) => i.productId === product.id)?.quantity || 0
    });

    // Add to form
    const item = this.createItemForm();
    item.patchValue({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: 1,
      sourceStock: sourceItem.quantity,
      destinationStock: this.destInventory.find((i: BranchInventory) => i.productId === product.id)?.quantity || 0
    });
    this.items.push(item);

    this.showProductDropdown = false;
    this.productSearchTerm = '';
    this.error = null;
  }

  removeProduct(productId: string, index: number): void {
    this.selectedProducts.delete(productId);
    this.items.removeAt(index);
  }

  updateQuantity(index: number): void {
    const item = this.items.at(index);
    const productId = item.get('productId')?.value;
    const quantity = parseInt(item.get('quantity')?.value || 0);
    if (productId && this.selectedProducts.has(productId)) {
      const selected = this.selectedProducts.get(productId)!;
      selected.quantity = quantity;
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
        if (!this.sourceBranchId || this.sourceBranchId === this.destinationBranchId) {
          if (this.sourceBranchId === this.destinationBranchId) {
            this.error = 'Source and destination branches cannot be the same';
          } else {
            this.error = 'Please select a source branch';
          }
          return false;
        }
        return true;
      case 2:
        if (this.items.length === 0) {
          this.error = 'Please add at least one product to transfer';
          return false;
        }
        // Validate quantities don't exceed source stock
        for (let i = 0; i < this.items.length; i++) {
          const item = this.items.at(i);
          const quantity = parseInt(item.get('quantity')?.value || 0);
          const sourceStock = parseInt(item.get('sourceStock')?.value || 0);
          if (quantity > sourceStock) {
            const productName = item.get('productName')?.value;
            this.error = `Insufficient stock for ${productName}. Available: ${sourceStock}`;
            return false;
          }
        }
        return true;
      case 3:
        if (!this.destinationBranchId) {
          this.error = 'Please select a destination branch';
          return false;
        }
        if (this.sourceBranchId === this.destinationBranchId) {
          this.error = 'Source and destination branches cannot be the same';
          return false;
        }
        return true;
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

    const formValue = this.wizardForm.value;
    const items = formValue.items;

    // Create movements for each item
    const movements = items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: parseInt(item.quantity),
      movementType: MovementType.TRANSFER,
      fromLocation: {
        type: 'BRANCH',
        id: formValue.sourceBranchId,
        name: this.getBranchName(formValue.sourceBranchId)
      },
      toLocation: {
        type: 'BRANCH',
        id: formValue.destinationBranchId,
        name: this.getBranchName(formValue.destinationBranchId)
      },
      notes: formValue.notes || '',
      priority: formValue.priority,
      status: MovementStatus.PENDING
    }));

    // In a real implementation, this would call an API to create the transfer
    // For now, we'll simulate
    console.log('Creating transfers:', movements);

    setTimeout(() => {
      this.isSubmitting = false;
      // Emit completion with first movement
      this.completed.emit(movements[0] as StockMovement);
      this.router.navigate(['/admin/sales/commerce/inventory/movements']);
    }, 1500);
  }

  // ============================================================
  // CANCEL
  // ============================================================

  cancel(): void {
    if (this.items.length > 0 || this.wizardForm.dirty) {
      this.showConfirmDialog = true;
      this.confirmMessage = 'You have unsaved changes. Are you sure you want to leave?';
    } else {
      this.cancelled.emit();
      this.router.navigate(['/admin/sales/commerce/inventory/movements']);
    }
  }

  confirmCancel(): void {
    this.showConfirmDialog = false;
    this.cancelled.emit();
    this.router.navigate(['/admin/sales/commerce/inventory/movements']);
  }

  cancelConfirmDialog(): void {
    this.showConfirmDialog = false;
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getBranchName(branchId: string): string {
    const branch = this.branches.find(b => b.id === branchId);
    return branch?.name || branchId;
  }

  getSourceStock(productId: string): number {
    const item = this.sourceInventory.find(i => i.productId === productId);
    return item?.quantity || 0;
  }

  getDestinationStock(productId: string): number {
    const item = this.destInventory.find(i => i.productId === productId);
    return item?.quantity || 0;
  }

  getTotalItems(): number {
    return this.items.value.reduce((sum: number, item: any) => sum + (parseInt(item.quantity) || 0), 0);
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
        return !!this.destinationBranchId && this.sourceBranchId !== this.destinationBranchId;
      default:
        return true;
    }
  }
}