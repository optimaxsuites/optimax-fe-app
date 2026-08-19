// branch-inventory-form.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  Branch,
  BranchInventory,
  Product,
  getStockStatus,
  getStockStatusLabel
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-branch-inventory-form',
  templateUrl: './branch-inventory-form.component.html',
  styleUrls: ['./branch-inventory-form.component.scss']
})
export class BranchInventoryFormComponent implements OnInit, OnDestroy, OnChanges {

  // ============================================================
  // INPUTS / OUTPUTS
  // ============================================================

  @Input() branchId: string = '';
  @Input() inventoryItemId: string = '';
  @Input() mode: 'create' | 'edit' | 'batch' = 'create';
  @Output() saved = new EventEmitter<BranchInventory>();
  @Output() cancelled = new EventEmitter<void>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  branch: Branch | null = null;
  branches: Branch[] = [];
  inventoryItem: BranchInventory | null = null;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  isLoading: boolean = true;
  isSaving: boolean = false;
  error: string | null = null;

  // Forms
  inventoryForm!: FormGroup;
  batchForm!: FormGroup;

  // Product search
  productSearchTerm: string = '';
  showProductDropdown: boolean = false;
  selectedProduct: Product | null = null;
  parseInt = parseInt;

  onProductBlur(): void {
    setTimeout(() => {
      this.showProductDropdown = false;
    }, 200);
  }

  // UI
  Math = Math;
  currentStep: number = 1;
  totalSteps: number = 3;
  showConfirmDialog: boolean = false;
  confirmMessage: string = '';

  // Batch items
  batchItems: BatchItem[] = [];

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private fb: FormBuilder
  ) {
    this.buildForms();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    // Get branchId from route if not provided
    if (!this.branchId) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['branchId']) {
          this.branchId = params['branchId'];
        }
      });
    }

    // Get inventoryItemId from route if not provided
    if (!this.inventoryItemId) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['id']) {
          this.inventoryItemId = params['id'];
          this.mode = 'edit';
        }
      });
    }

    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['branchId'] && !changes['branchId'].firstChange) {
      this.loadData();
    }
    if (changes['inventoryItemId'] && !changes['inventoryItemId'].firstChange) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // FORM BUILDING
  // ============================================================

  resetForms(): void {
    this.inventoryForm.reset({
      productId: '',
      quantity: '',
      reorderPoint: '',
      safetyStock: '',
      sellingPrice: '',
      costPrice: '',
      notes: ''
    });
    this.batchItemsArray.clear();
    this.selectedProduct = null;
    this.productSearchTerm = '';
    this.error = null;
  }

  private buildForms(): void {
    // Main inventory form
    this.inventoryForm = this.fb.group({
      productId: ['', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0)]],
      reorderPoint: ['', [Validators.required, Validators.min(0)]],
      safetyStock: ['', [Validators.required, Validators.min(0)]],
      sellingPrice: ['', [Validators.required, Validators.min(0)]],
      costPrice: ['', [Validators.min(0)]],
      notes: ['']
    });

    // Batch form for bulk addition
    this.batchForm = this.fb.group({
      items: this.fb.array([])
    });
  }

  private createBatchItemForm(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      productName: [''],
      quantity: ['', [Validators.required, Validators.min(0)]],
      reorderPoint: ['', [Validators.required, Validators.min(0)]],
      safetyStock: ['', [Validators.required, Validators.min(0)]],
      sellingPrice: ['', [Validators.required, Validators.min(0)]],
      costPrice: ['', [Validators.min(0)]]
    });
  }

  // ============================================================
  // GETTERS
  // ============================================================

  get batchItemsArray(): FormArray {
    return this.batchForm.get('items') as FormArray;
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    // Load branch list (for the branch selector)
    this.inventoryService.getBranches()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branches) => { this.branches = branches; },
        error: (err) => console.error('Failed to load branches:', err)
      });

    // Load branch
    if (this.branchId) {
      this.inventoryService.getBranch(this.branchId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (branch) => {
            this.branch = branch;
          },
          error: (err) => {
            console.error('Failed to load branch:', err);
            this.error = 'Failed to load branch details';
          }
        });
    }

    // Load products for dropdown
    this.inventoryService.getProducts({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.products = response.data;
          this.filteredProducts = response.data;
        },
        error: (err) => {
          console.error('Failed to load products:', err);
          this.error = 'Failed to load products';
        }
      });

    // Load inventory item if in edit mode
    if (this.inventoryItemId && this.mode === 'edit') {
      // In a real implementation, you'd fetch the specific inventory item
      // For now, we'll simulate by getting branch inventory and finding the item
      this.inventoryService.getBranchInventory(this.branchId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (items) => {
            const item = items.find(i => i.id === this.inventoryItemId);
            if (item) {
              this.inventoryItem = item;
              this.populateForm(item);
              this.selectedProduct = {
                id: item.productId,
                name: item.productName,
                sku: item.sku
              } as Product;
            }
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Failed to load inventory item:', err);
            this.error = 'Failed to load inventory item';
            this.isLoading = false;
          }
        });
    } else {
      this.isLoading = false;
    }
  }

  // ============================================================
  // FORM POPULATION
  // ============================================================

  private populateForm(item: BranchInventory): void {
    this.inventoryForm.patchValue({
      productId: item.productId,
      quantity: item.quantity,
      reorderPoint: item.reorderPoint,
      safetyStock: item.safetyStock,
      sellingPrice: item.sellingPrice,
      costPrice: item.costPrice || 0,
      notes: ''
    });
  }

  // ============================================================
  // BRANCH SELECTION
  // ============================================================

  /** Switch which branch this form is managing inventory for. */
  onBranchChange(branchId: string | null): void {
    if (!branchId || branchId === this.branchId) return;
    this.branchId = branchId;
    this.resetForms();
    this.loadData();
  }

  // ============================================================
  // PRODUCT SEARCH
  // ============================================================

  onProductSearch(searchTerm: string): void {
    this.productSearchTerm = searchTerm;
    this.showProductDropdown = searchTerm.length > 0;

    if (searchTerm.length > 0) {
      this.filteredProducts = this.products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      this.filteredProducts = this.products;
    }
  }

  selectProduct(product: Product): void {
    this.selectedProduct = product;
    this.inventoryForm.patchValue({
      productId: product.id,
      // Auto-populate selling price from product if available
      sellingPrice: product.sellingPrice || product.price || 0,
      costPrice: product.costPrice || 0
    });
    this.showProductDropdown = false;
    this.productSearchTerm = product.name;
  }

  // ============================================================
  // BATCH ITEMS MANAGEMENT
  // ============================================================

  addBatchItem(): void {
    this.batchItemsArray.push(this.createBatchItemForm());
  }

  removeBatchItem(index: number): void {
    this.batchItemsArray.removeAt(index);
  }

  addProductToBatch(product: Product): void {
    // Check if product already exists in batch
    const exists = this.batchItemsArray.value.some((item: any) => item.productId === product.id);
    if (exists) {
      this.error = 'Product already added to batch';
      return;
    }

    const form = this.createBatchItemForm();
    form.patchValue({
      productId: product.id,
      productName: product.name,
      sellingPrice: product.sellingPrice || product.price || 0,
      costPrice: product.costPrice || 0
    });
    this.batchItemsArray.push(form);
    this.error = null;
  }

  // ============================================================
  // STEP NAVIGATION
  // ============================================================

  goToStep(step: number): void {
    if (step < 1 || step > this.totalSteps) return;
    if (step > this.currentStep && !this.validateCurrentStep()) return;
    this.currentStep = step;
  }

  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        if (this.mode === 'batch') {
          return this.batchItemsArray.length > 0;
        } else {
          return !!(this.inventoryForm.get('productId')?.valid &&
            this.inventoryForm.get('quantity')?.valid);
        }
      case 2:
        return !!this.inventoryForm.get('sellingPrice')?.valid;
      default:
        return true;
    }
  }

  // ============================================================
  // SAVE
  // ============================================================

  save(): void {
    if (this.mode === 'batch') {
      this.saveBatch();
    } else {
      this.saveSingle();
    }
  }

  saveSingle(): void {
    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      this.error = 'Please fix all validation errors';
      return;
    }

    this.isSaving = true;
    this.error = null;

    const formValue = this.inventoryForm.value;
    const data = {
      branchId: this.branchId,
      productId: formValue.productId,
      quantity: parseInt(formValue.quantity),
      reorderPoint: parseInt(formValue.reorderPoint),
      safetyStock: parseInt(formValue.safetyStock),
      sellingPrice: parseFloat(formValue.sellingPrice),
      costPrice: parseFloat(formValue.costPrice || 0),
      notes: formValue.notes || ''
    };

    // In a real implementation, this would call an API
    // For now, we'll simulate saving
    console.log('Saving inventory:', data);

    setTimeout(() => {
      this.isSaving = false;
      // Emit saved event with mock data
      const savedItem: BranchInventory = {
        id: Date.now().toString(),
        branchId: this.branchId,
        branchName: this.branch?.name || '',
        productId: data.productId,
        productName: this.selectedProduct?.name || '',
        sku: this.selectedProduct?.sku || '',
        quantity: data.quantity,
        reorderPoint: data.reorderPoint,
        safetyStock: data.safetyStock,
        reorderQuantity: data.reorderPoint,
        sellingPrice: data.sellingPrice,
        costPrice: data.costPrice,
        lastUpdated: new Date()
      };
      this.saved.emit(savedItem);
    }, 1000);
  }

  saveBatch(): void {
    if (this.batchItemsArray.length === 0) {
      this.error = 'Please add at least one product';
      return;
    }

    this.isSaving = true;
    this.error = null;

    const items = this.batchItemsArray.value;
    const data = items.map((item: any) => ({
      branchId: this.branchId,
      productId: item.productId,
      quantity: parseInt(item.quantity),
      reorderPoint: parseInt(item.reorderPoint),
      safetyStock: parseInt(item.safetyStock),
      sellingPrice: parseFloat(item.sellingPrice),
      costPrice: parseFloat(item.costPrice || 0)
    }));

    // In a real implementation, this would call an API
    console.log('Saving batch inventory:', data);

    setTimeout(() => {
      this.isSaving = false;
      // Emit saved event with mock data
      const savedItems = data.map((d: any, index: number) => ({
        id: (Date.now() + index).toString(),
        branchId: this.branchId,
        branchName: this.branch?.name || '',
        productId: d.productId,
        productName: this.products.find(p => p.id === d.productId)?.name || '',
        sku: this.products.find(p => p.id === d.productId)?.sku || '',
        quantity: d.quantity,
        reorderPoint: d.reorderPoint,
        safetyStock: d.safetyStock,
        reorderQuantity: d.reorderPoint,
        sellingPrice: d.sellingPrice,
        costPrice: d.costPrice,
        lastUpdated: new Date()
      }));
      // Emit only the first one for simplicity, or you can emit the whole list
      if (savedItems.length > 0) {
        this.saved.emit(savedItems[0]);
      }
      this.navigateAway();
    }, 1000);
  }

  // ============================================================
  // CANCEL
  // ============================================================

  cancel(): void {
    if (this.hasUnsavedChanges()) {
      this.showConfirmDialog = true;
      this.confirmMessage = 'You have unsaved changes. Are you sure you want to leave?';
    } else {
      this.cancelled.emit();
      this.navigateAway();
    }
  }

  confirmCancel(): void {
    this.showConfirmDialog = false;
    this.cancelled.emit();
    this.navigateAway();
  }

  /** Falls back to browser history when nothing is listening to saved/cancelled — this component is currently only ever routed to directly, never embedded. */
  private navigateAway(): void {
    if (!this.saved.observed && !this.cancelled.observed) {
      this.location.back();
    }
  }

  cancelConfirmDialog(): void {
    this.showConfirmDialog = false;
  }

  private hasUnsavedChanges(): boolean {
    // Check if any form has been modified
    return this.inventoryForm.dirty ||
      this.batchItemsArray.length > 0 ||
      this.inventoryForm.get('quantity')?.value !== '';
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getStockStatus(quantity: number, reorderPoint: number, safetyStock: number): string {
    return getStockStatus(quantity, reorderPoint, safetyStock);
  }

  getStockStatusLabel(status: any): string {
    return getStockStatusLabel(status);
  }

  getStockStatusColor(status: any): string {
    const map = {
      'CRITICAL': '#DC2626',
      'LOW': '#F59E0B',
      'NORMAL': '#2EB270',
      'OVERSTOCK': '#3B82F6'
    };
    return (map as any)[status] || '#6B7280';
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

  isFieldInvalid(fieldName: string): boolean {
    const control = this.inventoryForm.get(fieldName);
    return !!control?.invalid && !!control?.touched;
  }

  getFieldError(fieldName: string): string {
    const control = this.inventoryForm.get(fieldName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'This field is required';
    if (errors['min']) return `Minimum value is ${errors['min'].min}`;
    if (errors['pattern']) return 'Invalid format';

    return 'Invalid input';
  }

  getBranchTypeLabel(type: string): string {
    const map: Record<string, string> = {
      'FLAGSHIP': '⭐ Flagship',
      'STANDARD': 'Standard',
      'MINI': 'Mini'
    };
    return map[type] || type;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }
}

interface BatchItem {
  productId: string;
  productName: string;
  quantity: number;
  reorderPoint: number;
  safetyStock: number;
  sellingPrice: number;
  costPrice: number;
}