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
  TaxDTO,
  DiscountDTO,
  
  StockMovementPayload,
} from '../../../models/interface';
import { HttpClient,HttpErrorResponse } from '@angular/common/http';
import { MetadataService } from '../../../service/metadata.service';
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

  // Initialize forms with definite assignment assertion
  productForm!: FormGroup;
  supplierForm!: FormGroup;
  stockMovementForm!: FormGroup;

  categories: ProductCategoryGET[] = [];
  branches: BranchDTO[] = [];
  taxes: TaxDTO[] = [];
  discounts: any[] = [];
  discountTypes: any[] = [];
	discountType: string[] = [];
  suppliers: supplierData[] = [];
  discountOptions: number[] = [5, 10, 15, 20, 25, 30];
  isSupplierModalOpen = false;
  isLoading = false;
  openAddTax = false;
  openAddDiscount = false;

  priceDetails = {
    basePrice: 0,
    tax: 0,
    discount: null as number | null,
    effectivePrice: 0,
    taxAmount: 0,
    priceAfterDiscount: 0,
  };

  newSupplier: supplierData = {
    name: '',
    contactPerson: '',
    email: '',
    phoneNumber: 0,
    address: '',
    notes: '',
    agreeTerms: false,
  };
  discount: {
		id: 0;
		name: "";
		value: 0;
		startDate: Date;
		endDate: Date;
		minQuantity: 0;
		discountType: { id: 0; code: ""; description: ""; name: "" };
	} = {
		id: 0,
		name: "",
		value: 0,
		startDate: new Date(),
		endDate: new Date(),
		minQuantity: 0,
		discountType: { id: 0, code: "", description: "", name: "" },
	};

  showStockMovementSection = false;
  minDate: Date = new Date();
  maxDate: Date = new Date();
  inventoryId: number | null = null;
  selectedSupplierId: string | null = null;

  selectedCategory: number | null = null;
  selectedBranch: number | null = null;
  selectedSupplier: number | null = null;
  selectedDate: string = new Date().toISOString().split('T')[0];
  newQuantity: number = 0;
  newPrice: number = 0;
  openPriceChange = false;
  openAddSupplier: boolean = false;
 
  previewData = {
    quantity: 0,
    purchasePrice: 0,
    sellingPrice: 0 as number | string,
    effectiveSellingPrice: 0 as number | string,
  };

  constructor(
    private fb: FormBuilder,
    private posService: PosServiceService,
    private messageService: MessageService,
    private metadataService: MetadataService,
    private http: HttpClient
  ) {
    this.initializeForms();
  }

  // ngOnInit(): void {
  //   this.fetchMetaData();
  //   if (this.mode === 'edit' && this.activeItem) {
  //     this.patchFormValues();
  //   }
  // }

 private initializeForms(): void {
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
    tax: [null],
    discount: [null],
    selectedBranch: [[], Validators.required],
  });

  this.supplierForm = this.fb.group({
    name: ['', Validators.required],
    contactPerson: [''],
    email: ['', [Validators.email]],
    phoneNumber: [''],
    address: [''],
    notes: [''],
  });

    this.stockMovementForm = this.fb.group({
    quantity: [0, [Validators.required, Validators.min(1)]],
    reference: [''],
    purchasePrice: [0, [Validators.required, Validators.min(0)]],
    sellingPrice: [0, [Validators.min(0)]],
    supplier: [null, Validators.required],  // This matches the backend structure
    createdDate: [new Date().toISOString(), Validators.required],
    tax: [null],
    discount: [null],
  });
  }

  private fetchMetaData(): void {
    // Corrected observable names to match your service
    this.metadataService.taxes$.subscribe((taxes: TaxDTO[]) => {
      this.taxes = taxes;
      if (this.mode === 'edit' && this.activeItem?.tax) {
        const selectedTax = this.taxes.find(t => t.id === this.activeItem?.tax?.id);
        if (selectedTax) {
          this.productForm.get('tax')?.setValue(selectedTax);
        }
      }
    });

    this.metadataService.discount$.subscribe((discounts: any[]) => {
      this.discounts = discounts;
      if (this.mode === 'edit' && this.activeItem?.discount) {
        const selectedDiscount = this.discounts.find(d => d.id === this.activeItem?.discount?.id);
        if (selectedDiscount) {
          this.productForm.get('discount')?.setValue(selectedDiscount);
        }
      }
    });

    this.metadataService.branches$.subscribe((branches: BranchDTO[]) => {
      this.branches = branches;
    });

    this.metadataService.category$.subscribe((categories: ProductCategoryGET[]) => {
      this.categories = categories;
    });

    this.metadataService.supplier$.subscribe((suppliers: supplierData[]) => {
      this.suppliers = suppliers;
    });
  }

  private patchFormValues(): void {
    if (!this.activeItem) return;

    this.productForm.patchValue({
      name: this.activeItem.name,
      code: this.activeItem.code,
      description: this.activeItem.description,
      sku: this.activeItem.sku,
      weight: this.activeItem.weight,
      purchasePrice: this.activeItem.purchasePrice,
      sellingPrice: this.activeItem.sellingPrice,
      quantity: this.activeItem.quantity,
      reorderThreshold: this.activeItem.reorderThreshold,
      measurementUnit: this.activeItem.measurementUnit,
      partNumber: this.activeItem.partNumber,
      expiryDate: this.activeItem.expiryDate,
      isBundle: this.activeItem.isBundle,
      bundleItems: this.activeItem.bundleItems || [],
    });

    if (this.activeItem.tax) {
      const selectedTax = this.taxes.find(t => t.id === this.activeItem?.tax?.id);
      if (selectedTax) {
        this.productForm.get('tax')?.setValue(selectedTax);
      }
    }

    if (this.activeItem.discount) {
      const selectedDiscount = this.discounts.find(d => d.id === this.activeItem?.discount?.id);
      if (selectedDiscount) {
        this.productForm.get('discount')?.setValue(selectedDiscount);
      }
    }
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  getErrorMessage(controlName: string, displayName?: string): string {
    const control = this.productForm.get(controlName);
    const name = displayName || controlName;

    if (control && control.errors) {
      const errors = control.errors;
      const errorKeys = Object.keys(errors);

      if (errorKeys.length > 0) {
        switch (errorKeys[0]) {
          case "required": return `${name} is required.`;
          case "pattern": return `${name} has an invalid format.`;
          case "min": return `${name} must be at least ${errors["min"].min}.`;
          case "minlength": return `${name} must be at least ${errors["minlength"].requiredLength}.`;
          case "maxlength": return `${name} should not exceed ${errors["maxlength"].requiredLength} characters.`;
          default: return `${name} has an error.`;
        }
      }
    }
    return "";
  }
  ngOnInit(): void {
    this.fetchMetaData(); // From first version
    this.loadInitialData(); // From second version

    if (this.mode === 'edit' && this.activeItem) {
      this.patchFormValues(); // From first version
      this.prefillForm(); // From second version
    }

    this.setupStockMovementWatchers(); // From second version
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
  addDiscount() {
      let discountObj = this.discount;
  
      const discountDetails: DiscountDTO = {
        id: discountObj.id,
        name: discountObj.name,
        value: discountObj.value,
        discountType: discountObj.discountType,
        endDate: discountObj.endDate,
        startDate: discountObj.startDate,
        minQuantity: discountObj.minQuantity,
      };
  
      this.posService.addDiscount(discountDetails).subscribe(
        async (data) => {
          console.log(data);
          if (data) {
            this.messageService.add({
              severity: "success",
              summary: "Discount Added",
              detail: "Discount added successfully.",
              key: "tl",
              life: 3000,
            });
            // this.getDiscounts();
            // TODO: Check whether this piece of code is worth it...
            discountObj = {
              id: 0,
              name: "",
              value: 0,
              startDate: new Date(),
              endDate: new Date(),
              minQuantity: 0,
              discountType: { id: 0, code: "", name: "", description: "" },
            };
          } else {
            this.messageService.add({
              severity: "error",
              summary: "Failed",
              detail: "Failed, please try again.",
              key: "tl",
              life: 3000,
            });
          }
        },
        (error: HttpErrorResponse) => {
          if (error.status === 500) {
            this.messageService.add({
              severity: "error",
              summary: "Authentication Failed",
              detail: "Check form details and try again.",
              key: "tl",
              life: 3000,
            });
          } else if (error.status === 404) {
            this.messageService.add({
              severity: "error",
              summary: "Authentication Failed",
              detail: "Error, try again.",
              key: "tl",
              life: 3000,
            });
          } else if (error.status === 0) {
            this.messageService.add({
              severity: "error",
              summary: "Server Unreachable",
              detail:
                "Unable to connect to the server. Please check your internet connection.",
              key: "tl",
              life: 3000,
            });
          } else {
            this.messageService.add({
              severity: "error",
              summary: "Error",
              detail: "An unexpected error occurred.",
              key: "tl",
              life: 3000,
            });
          }
        },
      );
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
  taxAmount: 0, // Add this - you can calculate it or set initial value
  priceAfterDiscount: Number(this.activeItem.sellingPrice) || 0 // Add this
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
  taxAmount: 0,
  priceAfterDiscount: 0
};
  }

  private getOrCreateInventory(): Promise<InventoryPayload | null> {
    return new Promise((resolve) => {
      this.posService.getInventories().subscribe({
        next: (inventories) => {
          const existingInventory = inventories.find(
            (inv) =>
              inv.productId === this.activeItem?.id && 
            inv.branchId === this.selectedBranch      
          );

          if (existingInventory) {
            resolve(existingInventory);
          } else {
            const newInventory: InventoryPayload = {
            id: 0,
            productId: this.activeItem?.id || 0,   
            branchId: this.selectedBranch || 0,     
            availableQuantity: 0,
            status: 'IN_STOCK',
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
      this.showValidationError();
      return;
    }

    if (!this.validateProductAndBranch()) {
      return;
    }

    this.isLoading = true;

    try {
      const inventory = await this.getOrCreateInventory();
      if (!inventory) {
        throw new Error('Inventory not available');
      }

      const movementData = this.prepareMovementData(inventory.id);
      await this.processStockMovement(movementData, inventory.id);

      this.showSuccessMessage();
      this.resetAfterSuccess();
    } catch (error) {
      this.handleMovementError(error);
    } finally {
      this.isLoading = false;
    }
}

private showValidationError(): void {
    this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields correctly',
        life: 3000,
    });
}

private validateProductAndBranch(): boolean {
  if (!this.activeItem?.id || !this.selectedBranch) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Product or branch not selected',
      life: 3000,
    });
    return false;
  }
    return true;
}
private getCurrentUserId(): number {
   
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            return user.id || 0;
        } catch {
            return 0;
        }
    }
    return 0;
    
    
}


private prepareMovementData(inventoryId: number): StockMovementPayload {
    if (!this.activeItem) {
        throw new Error('No active item selected');
    }
const createdDate = this.stockMovementForm.value.createdDate;
  const formattedDate = createdDate.includes('T') 
    ? createdDate 
    : `${createdDate}T00:00:00`;

  return {
    id: 0,
    quantity: this.stockMovementForm.value.quantity,
    purchasePrice: this.stockMovementForm.value.purchasePrice,
    sellingPrice: this.priceDetails.effectivePrice,
    createdDate: formattedDate,
    reference: this.stockMovementForm.value.reference || '',
    createdById: this.getCurrentUserId(),
    supplier: {
      id: this.stockMovementForm.value.supplier || this.selectedSupplier || 0  // Fixed: use supplier instead of supplierId
    },
    ingredient: {
      id: this.activeItem.id  // Backend expects ingredient object with id
    }
  };
}

private async processStockMovement(movementData: StockMovementPayload, inventoryId: number): Promise<void> {
   try {
    // Create the inventory payload with stock movement
     const inventoryPayload: InventoryPayload = {
      id: inventoryId,
      productId: this.activeItem?.id || 0,
      branchId: this.selectedBranch || 0,
      availableQuantity: (this.activeItem?.quantity || 0) + movementData.quantity,
      status: 'IN_STOCK',
      stockMovement: [movementData]
    };

    // Send the complete inventory payload to backend
    await this.posService.addInventory(inventoryPayload).toPromise();

    // Update the local product data
    await this.updateLocalProductData(movementData);
    
  } catch (error) {
    console.error('Error processing stock movement:', error);
    throw error;
  }
}
private async updateLocalProductData(movementData: StockMovementPayload): Promise<void> {
  if (!this.activeItem) {
    console.warn('No active item selected for update');
    return;
  }

  // Create updated product with proper type conversion
  const updatedProduct: ProductData = {
    ...this.activeItem,
    quantity: (this.activeItem.quantity || 0) + movementData.quantity,
    purchasePrice: movementData.purchasePrice.toString(), // Convert to string if required by API
    sellingPrice: movementData.sellingPrice.toString(),  // Convert to string if required by API
    // Ensure all required fields are included
    ...(this.activeItem.tax && { tax: this.activeItem.tax }),
    ...(this.activeItem.discount && { discount: this.activeItem.discount }),
  };

  try {
    // Update backend
    await this.posService.updateProduct(updatedProduct).toPromise();
    
    // Update local state only after successful backend update
    this.activeItem = updatedProduct;
    this.updateProductInList(updatedProduct);
    
  } catch (error) {
    console.error('Backend update failed:', error);
    
    
    // Create a version with numbers for local use if needed
    const localUpdatedProduct = {
      ...updatedProduct,
      purchasePrice: movementData.purchasePrice, // Keep as number locally
      sellingPrice: movementData.sellingPrice,   // Keep as number locally
    };
    
    // Fallback to local update
    // this.activeItem = localUpdatedProduct;
    // this.updateProductInList(localUpdatedProduct);
    
    // Show user warning
    this.messageService.add({
      severity: 'warn',
      summary: 'Offline Mode',
      detail: 'Changes saved locally but not synced with server',
      life: 3000
    });
  }
}

// private getUpdatedProduct(movementData: StockMovementPayload): any {
//   if (!this.activeItem) {
//         throw new Error('No active item selected');
//     }
//     return {
//         ...this.activeItem,
//         quantity: (this.activeItem.quantity || 0) + movementData.quantity,
//         purchasePrice: movementData.purchasePrice,
//         sellingPrice: movementData.sellingPrice,
//         tax: { rate: this.priceDetails.tax },
//         discount: { value: this.priceDetails.discount || 0 },
//     };
// }

private showSuccessMessage(): void {
    this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Stock movement recorded successfully',
        life: 3000,
    });
}

private resetAfterSuccess(): void {
    this.resetStockMovementForm();
    this.showStockMovementSection = false;
    this.refreshProductData();
}

private handleMovementError(error: any): void {
    console.error('Error in stock movement:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to record stock movement: ${errorMessage}`,
        life: 5000,
    });
}
  private async updateInventoryAfterMovement(inventoryId: number, quantity: number): Promise<void> {
    try {
        const inventory = await this.posService.getInventoryById(inventoryId).toPromise();
        if (!inventory) {
            throw new Error('Inventory not found');
        }

        const updatedInventory = {
            ...inventory,
            availableQuantity: (inventory.availableQuantity || 0) + quantity,
            lastUpdated: new Date().toISOString()
        };

        await this.posService.updateInventory(inventoryId, updatedInventory).toPromise();
    } catch (error) {
        console.error('Error updating inventory:', error);
        throw new Error('Failed to update inventory');
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
const currentDate = new Date().toISOString(); // Keeps full format: "2025-08-14T10:30:00.123Z"

const initialValues = {
    purchasePrice: this.activeItem?.purchasePrice || 0,
    sellingPrice: this.activeItem?.sellingPrice || 0,
    createdDate: currentDate, // Now includes time component
    supplier: this.selectedSupplier,
    quantity: 0,
    reference: ''
};

    this.stockMovementForm.patchValue(initialValues);

    this.initializePriceDetails();
    this.setupStockMovementWatchers();
}

private initializePriceDetails(): void {
    const item = this.activeItem;
    if (!item) {
        throw new Error('No active item selected');
    }

    // Explicit type conversion if needed
    const basePrice = Number(item.sellingPrice) || 0;
    const taxRate = item.tax ? Number(item.tax.rate) : 0;
    const discountValue = item.discount?.value !== undefined ? Number(item.discount.value) : null;

    this.priceDetails = {
        basePrice,
        tax: taxRate,
        discount: discountValue,
        effectivePrice: basePrice,
        taxAmount: 0,
        priceAfterDiscount: 0
    };

    this.calculateEffectivePrice();
}

 // Add to your component's properties
priceCalculationSettings = {
    decimalPlaces: 2,
    roundTax: true,
    roundDiscount: true
};

calculateEffectivePrice(): void {
    if (this.isUpdatingFromCalculation) return;

    const basePrice = this.ensureNumber(this.priceDetails.basePrice);
    const taxRate = this.ensureNumber(this.priceDetails.tax);
    const discount = this.priceDetails.discount ? this.ensureNumber(this.priceDetails.discount) : 0;

    // Calculate price after discount
    const priceAfterDiscount = this.calculatePriceAfterDiscount(basePrice, discount);
    
    // Calculate tax amount
    const taxAmount = this.calculateTaxAmount(priceAfterDiscount, taxRate);

    // Calculate final price
    const finalPrice = this.roundValue(priceAfterDiscount + taxAmount, this.priceCalculationSettings.decimalPlaces);

    this.updatePriceDetails(finalPrice, taxAmount, priceAfterDiscount);
}

private calculatePriceAfterDiscount(basePrice: number, discount: number): number {
    const discountAmount = (basePrice * discount) / 100;
    return this.roundValue(basePrice - discountAmount, this.priceCalculationSettings.decimalPlaces);
}

private calculateTaxAmount(priceAfterDiscount: number, taxRate: number): number {
    const taxAmount = (priceAfterDiscount * taxRate) / 100;
    return this.priceCalculationSettings.roundTax 
        ? this.roundValue(taxAmount, this.priceCalculationSettings.decimalPlaces)
        : taxAmount;
}

private updatePriceDetails(finalPrice: number, taxAmount: number, priceAfterDiscount: number): void {
    this.isUpdatingFromCalculation = true;

    this.priceDetails = {
        ...this.priceDetails,
        effectivePrice: finalPrice,
        taxAmount: taxAmount,
        priceAfterDiscount: priceAfterDiscount
    };

    this.stockMovementForm.patchValue({
        sellingPrice: finalPrice
    }, { emitEvent: false });

    setTimeout(() => this.isUpdatingFromCalculation = false, 0);
}

private roundValue(value: number, decimalPlaces: number): number {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(value * factor) / factor;
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
