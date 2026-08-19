import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  StockMovement,
  MovementType,
  MovementStatus,
  Branch,
  Product,
  getMovementTypeLabel as getMovementTypeLabelFn,
  getMovementTypeIcon as getMovementTypeIconFn
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-stock-movement-form',
  templateUrl: './stock-movement-form.component.html',
  styleUrls: ['./stock-movement-form.component.scss']
})
export class StockMovementFormComponent implements OnInit, OnDestroy, OnChanges {

  // ============================================================
  // INPUTS / OUTPUTS
  // ============================================================

  @Input() movementId: string = '';
  @Input() mode: 'create' | 'edit' | 'view' = 'create';
  @Input() prefillData: any = null;
  @Output() saved = new EventEmitter<StockMovement>();
  @Output() cancelled = new EventEmitter<void>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  movement: StockMovement | null = null;
  branches: Branch[] = [];
  products: Product[] = [];
  filteredProducts: Product[] = [];
  isLoading: boolean = true;
  isSaving: boolean = false;
  error: string | null = null;

  // Forms
  movementForm!: FormGroup;

  // UI
  currentStep: number = 1;
  totalSteps: number = 3;
  showProductSearch: boolean = false;
  productSearchTerm: string = '';
  selectedProducts: Map<string, { product: Product; quantity: number }> = new Map();
  showConfirmDialog: boolean = false;
  confirmMessage: string = '';

  // Movement types
  movementTypes = Object.values(MovementType);
  movementStatuses = Object.values(MovementStatus);

  // Location types
  locationTypes = ['WAREHOUSE', 'BRANCH', 'SUPPLIER', 'CUSTOMER'];

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
    this.buildForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    // Get movementId from route if not provided
    if (!this.movementId) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['id']) {
          this.movementId = params['id'];
          this.mode = 'view';
        }
      });
    }

    // Get prefill data from query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['productId'] || params['branchId']) {
        this.prefillData = {
          productId: params['productId'],
          branchId: params['branchId']
        };
      }
    });

    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['movementId'] && !changes['movementId'].firstChange) {
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

  private buildForm(): void {
    this.movementForm = this.fb.group({
      movementType: ['', Validators.required],
      priority: ['MEDIUM'],
      fromLocationType: ['', Validators.required],
      fromLocationId: ['', Validators.required],
      toLocationType: ['', Validators.required],
      toLocationId: ['', Validators.required],
      items: this.fb.array([]),
      notes: [''],
      scheduledDate: ['']
    });
  }

  private createItemForm(): FormGroup {
    return this.fb.group({
      productId: ['', Validators.required],
      productName: [''],
      sku: [''],
      quantity: ['', [Validators.required, Validators.min(1)]],
      weight: [''],
      volume: [''],
      unit: ['EACH']
    });
  }

  // ============================================================
  // GETTERS
  // ============================================================

  get items(): FormArray {
    return this.movementForm.get('items') as FormArray;
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
        },
        error: (err: any) => {
          console.error('Failed to load branches:', err);
          this.error = 'Failed to load branches. Please try again.';
        }
      });

    // Load products
    this.inventoryService.getProducts({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.products = response.data;
          this.filteredProducts = response.data;
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('Failed to load products:', err);
          this.error = 'Failed to load products. Please try again.';
          this.isLoading = false;
        }
      });

    // Load movement if in edit/view mode
    if (this.movementId && (this.mode === 'edit' || this.mode === 'view')) {
      this.inventoryService.getMovement(this.movementId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (movement: StockMovement) => {
            this.movement = movement;
            this.populateForm(movement);
            if (this.mode === 'view') {
              this.movementForm.disable();
            }
            this.isLoading = false;
          },
          error: (err: any) => {
            console.error('Failed to load movement:', err);
            this.error = 'Failed to load movement details. Please try again.';
            this.isLoading = false;
          }
        });
    }

    // Apply prefill data
    if (this.prefillData) {
      this.applyPrefill();
    }
  }

  // ============================================================
  // FORM POPULATION
  // ============================================================

  private populateForm(movement: StockMovement): void {
    this.movementForm.patchValue({
      movementType: movement.movementType,
      fromLocationType: movement.fromLocation.type,
      fromLocationId: movement.fromLocation.id,
      toLocationType: movement.toLocation.type,
      toLocationId: movement.toLocation.id,
      notes: movement.notes || '',
      scheduledDate: movement.scheduledDate || ''
    });

    // Add items
    this.items.clear();
    const item = this.createItemForm();
    item.patchValue({
      productId: movement.productId,
      productName: movement.productName,
      sku: movement.sku,
      quantity: movement.quantity
    });
    this.items.push(item);
  }

  private applyPrefill(): void {
    if (this.prefillData?.productId) {
      const product = this.products.find(p => p.id === this.prefillData.productId);
      if (product) {
        const item = this.createItemForm();
        item.patchValue({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1
        });
        this.items.push(item);
      }
    }

    if (this.prefillData?.branchId) {
      this.movementForm.patchValue({
        fromLocationType: 'BRANCH',
        fromLocationId: this.prefillData.branchId
      });
    }
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
    this.showProductSearch = true;
  }

  onProductSearchBlur(): void {
    setTimeout(() => {
      this.showProductSearch = false;
    }, 200);
  }

  selectProduct(product: Product): void {
    // Check if product already added
    const existingItem = this.items.value.find((item: any) => item.productId === product.id);
    if (existingItem) {
      this.error = 'Product already added to movement';
      this.showProductSearch = false;
      this.productSearchTerm = '';
      return;
    }

    const item = this.createItemForm();
    item.patchValue({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: 1
    });
    this.items.push(item);
    this.showProductSearch = false;
    this.productSearchTerm = '';
    this.error = null;
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  // ============================================================
  // LOCATION HELPERS
  // ============================================================

  getLocationsForType(type: string): any[] {
    if (type === 'BRANCH') {
      return this.branches;
    }
    // For other types, return mock data or empty
    return [];
  }

  getLocationName(type: string, id: string): string {
    if (type === 'BRANCH') {
      const branch = this.branches.find(b => b.id === id);
      return branch?.name || id;
    }
    return id;
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
        return !!this.movementForm.get('movementType')?.valid &&
          !!this.movementForm.get('fromLocationId')?.valid &&
          !!this.movementForm.get('toLocationId')?.valid;
      case 2:
        return this.items.length > 0 && this.items.valid;
      default:
        return true;
    }
  }

  // ============================================================
  // SAVE
  // ============================================================

  save(): void {
    if (this.movementForm.invalid) {
      this.movementForm.markAllAsTouched();
      this.error = 'Please fix all validation errors';
      return;
    }

    this.isSaving = true;
    this.error = null;

    const formValue = this.movementForm.value;
    const item = formValue.items[0] || {};

    const data: any = {
      movementType: formValue.movementType,
      fromLocation: {
        type: formValue.fromLocationType,
        id: formValue.fromLocationId,
        name: this.getLocationName(formValue.fromLocationType, formValue.fromLocationId)
      },
      toLocation: {
        type: formValue.toLocationType,
        id: formValue.toLocationId,
        name: this.getLocationName(formValue.toLocationType, formValue.toLocationId)
      },
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: parseInt(item.quantity),
      notes: formValue.notes || '',
      scheduledDate: formValue.scheduledDate || null
    };

    if (this.mode === 'edit' && this.movementId) {
      // Update existing movement
      this.inventoryService.updateMovement(this.movementId, data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result: StockMovement) => {
            this.isSaving = false;
            this.saved.emit(result);
            this.navigateAway();
          },
          error: (err: any) => {
            console.error('Failed to update movement:', err);
            this.error = 'Failed to update movement. Please try again.';
            this.isSaving = false;
          }
        });
    } else {
      // Create new movement
      this.inventoryService.createMovement(data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result: StockMovement) => {
            this.isSaving = false;
            this.saved.emit(result);
            this.navigateAway();
          },
          error: (err: any) => {
            console.error('Failed to create movement:', err);
            this.error = 'Failed to create movement. Please try again.';
            this.isSaving = false;
          }
        });
    }
  }

  // ============================================================
  // CANCEL
  // ============================================================

  cancel(): void {
    if (this.movementForm.dirty) {
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

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getMovementTypeLabel(type: string): string {
    return getMovementTypeLabelFn(type as MovementType);
  }

  getMovementTypeIcon(type: string): string {
    return getMovementTypeIconFn(type as MovementType);
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.movementForm.get(fieldName);
    return !!control?.invalid && !!control?.touched;
  }

  getFieldError(fieldName: string): string {
    const control = this.movementForm.get(fieldName);
    if (!control || !control.errors) return '';

    const errors = control.errors;
    if (errors['required']) return 'This field is required';
    if (errors['min']) return `Minimum value is ${errors['min'].min}`;
    if (errors['pattern']) return 'Invalid format';

    return 'Invalid input';
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

  getTotalItems(): number {
    return this.items.value.reduce((sum: number, item: any) => sum + (parseInt(item.quantity) || 0), 0);
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    this.loadData();
  }
}