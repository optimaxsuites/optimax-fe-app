import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PosServiceService } from '../../../service/pos-service.service';
import {
  ProductData,
  InventoryPayload,
  supplierData,
  ProductCategoryGET,
  BranchDTO,
  StockMovementPayload,
} from '../../../models/interface';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-edit-inventory',
  templateUrl: './edit-inventory.component.html',
  styleUrls: ['./edit-inventory.component.scss'],
})
export class EditInventoryComponent implements OnInit {
  @Input() activeItem: ProductData | null = null;
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() product: ProductData[] = [];
  @Output() close = new EventEmitter<void>();

  productForm: FormGroup;
  supplierForm: FormGroup;
  categories: ProductCategoryGET[] = [];
  branches: BranchDTO[] = [];
  suppliers: supplierData[] = [];
  discountOptions: number[] = [5, 10, 15, 20, 25, 30];
  isSupplierModalOpen = false;
  isLoading = false;

  // Price details - for stock movement selling price with tax and discount
  priceDetails = {
    basePrice: 0,
    tax: 0,
    discount: null as number | null,
    effectivePrice: 0,
  };

  // New supplier data
  newSupplier: supplierData = {
    name: '',
    contactPerson: '',
    email: '',
    phoneNumber: 0,
    address: '',
    notes: '',
    agreeTerms: false,
  };

  stockMovementForm: FormGroup;
  showStockMovementSection = false;
  minDate: Date = new Date();
  maxDate: Date = new Date();
  inventoryId: number | null = null;

  selectedCategory: number | null = null;
  selectedBranch: number | null = null;
  selectedSupplier: number | null = null;
  selectedDate: string = new Date().toISOString().split('T')[0];
  newQuantity: number = 0;
  newPrice: number = 0;
  openPriceChange = false;

  // Preview values for real-time updates
  previewData = {
    quantity: 0,
    purchasePrice: 0,
    sellingPrice: 0 as number | string,
    effectiveSellingPrice: 0 as number | string,
  };

  constructor(
    private fb: FormBuilder,
    private posService: PosServiceService,
    private messageService: MessageService
  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      description: [''],
      sku: [''],
      weight: [0],
      purchasePrice: [0, Validators.required],
      sellingPrice: [0, Validators.required],
      quantity: [0, Validators.required],
      reorderThreshold: [0],
      measurementUnit: [''],
      partNumber: [''],
      expiryDate: [null],
      isBundle: [false],
      bundleItems: [[]],
    });

    this.supplierForm = this.fb.group({
      name: ['', Validators.required],
      contactPerson: [''],
      email: ['', Validators.email],
      phoneNumber: [''],
      address: [''],
      notes: [''],
    });

    this.stockMovementForm = this.fb.group({
      quantity: [0, [Validators.required, Validators.min(1)]],
      reference: [''],
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.min(0)]],
      supplierId: [null, Validators.required],
      createdDate: [
        new Date().toISOString().split('T')[0],
        Validators.required,
      ],
    });
  }

  ngOnInit(): void {
    this.loadInitialData();

    if (this.mode === 'edit' && this.activeItem) {
      this.prefillForm();
    }

    this.setupStockMovementWatchers();
  }

  toggleStockMovement(): void {
    this.showStockMovementSection = !this.showStockMovementSection;
    if (this.showStockMovementSection) {
      this.initializeStockMovementForm();
    }
  }

  loadInitialData(): void {
    this.isLoading = true;

    forkJoin([
      this.posService.getCategories(),
      this.posService.getBranches(),
      this.posService.getSupplier(),
      this.posService.getDiscount(),
    ]).subscribe({
      next: ([categories, branches, suppliers, discounts]) => {
        this.categories = categories;
        this.branches = branches;
        this.suppliers = suppliers;

        if (discounts && discounts.length) {
          this.discountOptions = discounts.map(
            (d: { value: number }) => d.value
          );
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load initial data',
          life: 3000,
        });
        this.isLoading = false;
      },
    });
  }

  prefillForm(): void {
    if (!this.activeItem) return;

    this.productForm.patchValue({
      name: this.activeItem.name,
      sku: this.activeItem.sku,
      code: this.activeItem.code,
      description: this.activeItem.description,
      weight: this.activeItem.weight,
      purchasePrice: this.activeItem.purchasePrice || 0,
      sellingPrice: this.activeItem.sellingPrice || 0,
      quantity: this.activeItem.quantity,
      reorderThreshold: this.activeItem.reorderThreshold || 0,
      partNumber: this.activeItem.partNumber || '',
      measurementUnit: this.activeItem.measurementUnit || '',
      expiryDate: this.activeItem.expiryDate
        ? new Date(this.activeItem.expiryDate).toISOString().split('T')[0]
        : null,
      isBundle: this.activeItem.isBundle || false,
      bundleItems: this.activeItem.bundleItems || [],
    });

    this.selectedCategory = this.activeItem.productCategory?.id || null;
    this.selectedBranch = this.activeItem.branch?.id || null;
    this.selectedSupplier = this.activeItem.supplier?.id || null;

    // Initialize price details for stock movement
    this.priceDetails = {
      basePrice: Number(this.activeItem.sellingPrice) || 0,
      tax: Number(this.activeItem.tax?.rate) || 0,
      discount: this.activeItem.discount?.value || null,
      effectivePrice: Number(this.activeItem.sellingPrice) || 0,
    };

    // Initialize preview data
    this.previewData = {
      quantity: this.activeItem.quantity || 0,
      purchasePrice: this.activeItem.purchasePrice || 0,
      sellingPrice: this.activeItem.sellingPrice || 0,
      effectiveSellingPrice: this.activeItem.sellingPrice || 0,
    };
  }

  onProductChange(event: any): void {
    if (event && event.id) {
      this.posService.getProductById(event.id).subscribe((product) => {
        this.activeItem = product;
        this.prefillForm();
        this.updateProductInList(product);
      });
    }
  }

  updateProductInList(updatedProduct: ProductData): void {
    const index = this.product.findIndex((p) => p.id === updatedProduct.id);
    if (index !== -1) {
      this.product[index] = updatedProduct;
    }
  }

  openSupplierModal(): void {
    this.isSupplierModalOpen = true;
  }

  closeSupplierModal(): void {
    this.isSupplierModalOpen = false;
    this.supplierForm.reset();
    this.newSupplier = {
      name: '',
      contactPerson: '',
      email: '',
      phoneNumber: 0,
      address: '',
      notes: '',
      agreeTerms: false,
    };
  }

  createSupplier(): void {
    if (!this.newSupplier.name || !this.newSupplier.agreeTerms) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill required fields and agree to terms',
        life: 3000,
      });
      return;
    }

    this.isLoading = true;
    const supplierData = { ...this.newSupplier };

    this.posService.addSupplier(supplierData).subscribe({
      next: (newSupplier) => {
        this.suppliers.push(newSupplier);
        this.stockMovementForm.patchValue({
          supplierId: newSupplier.id,
        });

        if (!this.selectedSupplier) {
          this.selectedSupplier = newSupplier.id;
        }

        this.closeSupplierModal();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Supplier created and selected successfully',
          life: 3000,
        });
        this.isLoading = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create supplier',
          life: 3000,
        });
        this.isLoading = false;
      },
    });
  }

  private resetStockMovementForm(): void {
    this.stockMovementForm.reset({
      quantity: 0,
      reference: '',
      purchasePrice: 0,
      sellingPrice: 0,
      createdDate: new Date().toISOString().split('T')[0],
      supplierId: null,
    });

    this.priceDetails = {
      basePrice: 0,
      tax: 0,
      discount: null,
      effectivePrice: 0,
    };
  }

  private getOrCreateInventory(): Promise<InventoryPayload | null> {
    return new Promise((resolve) => {
      this.posService.getInventories().subscribe({
        next: (inventories) => {
          const existingInventory = inventories.find(
            (inv) =>
              inv.product?.id === this.activeItem?.id &&
              inv.branch?.id === this.selectedBranch
          );

          if (existingInventory) {
            resolve(existingInventory);
          } else {
            const newInventory: InventoryPayload = {
              id: 0,
              product: { id: this.activeItem?.id } as ProductData,
              branch: { id: this.selectedBranch } as BranchDTO,
              availableQuantity: 0,
              status: 'active',
              stockMovement: [],
            };

            this.posService.addInventory(newInventory).subscribe({
              next: (createdInventory) => {
                resolve(createdInventory);
              },
              error: (err) => {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to create inventory',
                  life: 3000,
                });
                resolve(null);
              },
            });
          }
        },
        error: (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load inventories',
            life: 3000,
          });
          resolve(null);
        },
      });
    });
  }

  private refreshProductData(): void {
    if (this.activeItem?.id) {
      this.posService
        .getProductById(this.activeItem.id)
        .subscribe((product) => {
          this.activeItem = product;
          this.updateProductInList(product);
          this.prefillForm();
        });
    }
  }

  closeEdit(): void {
    this.close.emit();
  }

  getProductValue(field: keyof ProductData): string {
    return this.activeItem?.[field]?.toString() || '';
  }

  getCurrentQuantity(): number {
    return this.activeItem?.quantity || 0;
  }

  getNewTotalQuantity(): number {
    const currentQty = this.getCurrentQuantity();
    const additionalQty = this.stockMovementForm.get('quantity')?.value || 0;
    return currentQty + additionalQty;
  }

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeItem'] || changes['mode']) {
      if (this.mode === 'create' || !this.activeItem) {
        this.resetForm();
      } else if (this.mode === 'edit' && this.activeItem) {
        this.prefillForm();
      }
    }
  }

  resetForm(): void {
    this.productForm.reset({
      name: '',
      sku: '',
      code: '',
      description: '',
      weight: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      quantity: 0,
      reorderThreshold: 0,
    });

    this.resetStockMovementForm();

    this.selectedCategory = null;
    this.selectedBranch = null;
    this.selectedSupplier = null;
    this.newQuantity = 0;
    this.openPriceChange = false;
    this.showStockMovementSection = false;

    this.previewData = {
      quantity: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      effectiveSellingPrice: 0,
    };
  }

  onSupplierChange(supplierId: number): void {
    this.selectedSupplier = supplierId;
    if (this.mode === 'edit' && this.activeItem) {
      this.productForm.patchValue({
        supplierId: supplierId,
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  async saveStockMovement(): Promise<void> {
    // Validate form
    if (this.stockMovementForm.invalid) {
      this.markFormGroupTouched(this.stockMovementForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields correctly',
        life: 3000,
      });
      return;
    }

    if (!this.activeItem?.id || !this.selectedBranch) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Product or branch not selected',
        life: 3000,
      });
      return;
    }

    this.isLoading = true;

    try {
      // 1. Get or create inventory
      const inventory = await this.getOrCreateInventory();
      if (!inventory) {
        throw new Error('Inventory not available');
      }

      // 2. Prepare stock movement data
      const movementData: StockMovementPayload = {
        quantity: this.stockMovementForm.value.quantity,
        purchasePrice: this.stockMovementForm.value.purchasePrice,
        sellingPrice: this.priceDetails.effectivePrice,
        createdDate: this.stockMovementForm.value.createdDate,
        supplierId: this.stockMovementForm.value.supplierId,
        inventoryId: inventory.id,
        reference: this.stockMovementForm.value.reference || undefined,
        id: 0,
        stockMovementsId: 0,
        createdById: 1, // Replace with actual user ID
        ingredientId: this.activeItem.id,
        stockMovement: [],
      };

      console.log('Stock movement data:', movementData);

      // 3. Create stock movement
      await this.posService.createStockMovement(movementData).toPromise();

      // 4. Update product with new values
      const updatedProduct = {
        ...this.activeItem,
        quantity: (this.activeItem.quantity || 0) + movementData.quantity,
        purchasePrice: movementData.purchasePrice,
        sellingPrice: movementData.sellingPrice,
        tax: { rate: this.priceDetails.tax },
        discount: { value: this.priceDetails.discount || 0 },
      };

      console.log('Updated product:', updatedProduct);
      await this.posService.updateProduct(updatedProduct).toPromise();

      // 5. Update inventory
      await this.updateInventoryAfterMovement(
        inventory.id,
        movementData.quantity
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Stock movement recorded successfully',
        life: 3000,
      });

      this.resetStockMovementForm();
      this.showStockMovementSection = false;
      this.refreshProductData();
    } catch (error) {
      console.error('Error in stock movement:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to record stock movement: ' + (error as Error).message,
        life: 5000,
      });
    } finally {
      this.isLoading = false;
    }
  }

  private async updateInventoryAfterMovement(
    inventoryId: number,
    quantity: number
  ): Promise<void> {
    try {
      const inventory = await this.posService
        .getInventoryById(inventoryId)
        .toPromise();
      if (inventory) {
        const updatedInventory = {
          ...inventory,
          availableQuantity: (inventory.availableQuantity || 0) + quantity,
        };
        await this.posService
          .updateInventory(inventoryId, updatedInventory)
          .toPromise();
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    }
  }

  //////
  // Fixed methods for your EditInventoryComponent

  setupStockMovementWatchers(): void {
    // Watch quantity changes
    this.stockMovementForm.get('quantity')?.valueChanges.subscribe((value) => {
      this.previewData.quantity =
        (this.getCurrentQuantity() || 0) + (value || 0);
      this.updatePreviewData();
    });

    // Watch purchase price changes
    this.stockMovementForm
      .get('purchasePrice')
      ?.valueChanges.subscribe((value) => {
        this.previewData.purchasePrice = value || 0;
        this.updatePreviewData();
      });

    // FIXED: Watch selling price changes and update priceDetails.basePrice
    this.stockMovementForm
      .get('sellingPrice')
      ?.valueChanges.subscribe((value) => {
        // Only update if the change is not from our own calculation
        if (!this.isUpdatingFromCalculation) {
          this.priceDetails.basePrice = Number(value) || 0;
          this.calculateEffectivePrice();
        }
      });
  }

  // Add this flag to prevent circular updates
  private isUpdatingFromCalculation = false;

  initializeStockMovementForm(): void {
    const currentDate = new Date().toISOString().split('T')[0];

    this.stockMovementForm.patchValue({
      purchasePrice: this.activeItem?.purchasePrice || 0,
      sellingPrice: this.activeItem?.sellingPrice || 0,
      createdDate: currentDate,
      supplierId: this.selectedSupplier,
    });

    // Initialize price details
    this.priceDetails = {
      basePrice: Number(this.activeItem?.sellingPrice) || 0,
      tax: Number(this.activeItem?.tax?.rate) || 0,
      discount: this.activeItem?.discount?.value || null,
      effectivePrice: Number(this.activeItem?.sellingPrice) || 0,
    };

    this.calculateEffectivePrice();
  }

  calculateEffectivePrice(): void {
    const basePrice = Number(this.priceDetails.basePrice) || 0;
    const taxRate = Number(this.priceDetails.tax) || 0;
    const discount = Number(this.priceDetails.discount) || 0;

    // Calculate price after discount
    const priceAfterDiscount = basePrice - (basePrice * discount) / 100;

    // Calculate tax amount
    const taxAmount = (priceAfterDiscount * taxRate) / 100;

    // Calculate final price
    const finalPrice = priceAfterDiscount + taxAmount;

    this.priceDetails.effectivePrice = parseFloat(finalPrice.toFixed(2));
    this.previewData.effectiveSellingPrice = this.priceDetails.effectivePrice;

    // FIXED: Set flag to prevent circular updates
    this.isUpdatingFromCalculation = true;

    // Update the selling price in the form to show the calculated effective price
    this.stockMovementForm.patchValue(
      {
        sellingPrice: this.priceDetails.effectivePrice,
      },
      { emitEvent: false }
    );

    // Reset flag after update
    setTimeout(() => {
      this.isUpdatingFromCalculation = false;
    }, 0);

    // Update preview
    this.updatePreviewData();
  }

  // FIXED: This method should update priceDetails.basePrice from the input
  updatePrices(): void {
    // This is called when the base price input changes
    this.calculateEffectivePrice();
  }

  // Enhanced method to handle base price changes from the HTML input
  onBasePriceChange(value: number): void {
    this.priceDetails.basePrice = value || 0;
    this.calculateEffectivePrice();
  }

  // Method to handle tax changes
  onTaxChange(value: number): void {
    this.priceDetails.tax = value || 0;
    this.calculateEffectivePrice();
  }

  // Method to handle discount changes
  onDiscountChange(value: number | null): void {
    this.priceDetails.discount = value;
    this.calculateEffectivePrice();
  }

  getPriceAfterDiscount(): number {
    const basePrice = Number(this.priceDetails.basePrice) || 0;
    const discount = Number(this.priceDetails.discount) || 0;
    return basePrice - (basePrice * discount) / 100;
  }

  getTaxAmount(): number {
    const priceAfterDiscount = this.getPriceAfterDiscount();
    const taxRate = Number(this.priceDetails.tax) || 0;
    return priceAfterDiscount * (taxRate / 100);
  }

  private ensureNumber(value: number | string): number {
    return typeof value === 'string' ? parseFloat(value) || 0 : value;
  }

  getPriceBreakdownText(): string {
    const base = this.ensureNumber(this.priceDetails.basePrice);
    const discount = this.priceDetails.discount || 0;
    const tax = this.priceDetails.tax;
    const discountAmount = base * (discount / 100);
    const priceAfterDiscount = base - discountAmount;
    const taxAmount = priceAfterDiscount * (tax / 100);
    const effectivePrice = this.ensureNumber(this.priceDetails.effectivePrice);

    let breakdown = `Price Breakdown:
  Base: ${base.toFixed(2)}`;

    if (discount) {
      breakdown += `
  Discount: -${discount}% (${discountAmount.toFixed(2)})`;
    }

    breakdown += `
  Tax: +${tax}% (${taxAmount.toFixed(2)})
  Total: ${effectivePrice.toFixed(2)}`;

    return breakdown;
  }

  updatePreviewData(): void {
    this.productForm.patchValue(
      {
        quantity: this.previewData.quantity,
        purchasePrice: this.previewData.purchasePrice,
        sellingPrice: this.priceDetails.effectivePrice,
      },
      { emitEvent: false }
    );
  }
}
