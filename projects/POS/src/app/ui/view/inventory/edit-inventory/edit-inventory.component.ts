import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Router } from '@angular/router';
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
  InventoryStatus,
  StockMovementCreateDTO,
  InventoryResponsePayload,
  InventoryCreatePayload,
  StockMovementCreatePayload,
  InventoryUpdatePayload,
  StockMovementResponsePayload,
  StockMovementPostBody,
  StockMovementPayload,
} from '../../../models/interface';
import { firstValueFrom } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
  @Output() updated = new EventEmitter<{
    inventoryId: number;
    quantity: number;
    status: InventoryStatus;
  }>();

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
    discountType: { id: 0; code: "", description: "", name: "" };
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
    private router: Router,
    private messageService: MessageService,
    private metadataService: MetadataService,
    private http: HttpClient,
  ) {
    this.initializeForms();
  }

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
      createdDate: [new Date().toISOString().slice(0, 10), Validators.required],
      reference: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      // This control holds the supplier ID (number or null) because the template uses bindValue="id"
      supplier: [null], 
      purchasePrice: [0, [Validators.required, Validators.min(0)]],
      sellingPrice: [0, [Validators.min(0)]],
      tax: [null],
      discount: [null],
    });
  }

  ngOnInit(): void {
    // Note: fetchMetaData triggers supplier fetching and then populateStockMovementDefaults
    this.fetchMetaData();
    this.loadInitialData();
    
    // Safety delay to ensure suppliers are loaded if fetchMetaData hasn't completed quickly
    setTimeout(() => {
      if (this.mode === 'edit' && this.activeItem) {
        this.patchFormValues();
        this.prefillForm();
        this.populateStockMovementDefaults();
      }
    }, 100);

    this.setupStockMovementWatchers();
  }

  private populateStockMovementDefaults(): void {
    if (!this.activeItem) return;

    const productData = this.getProductData();
    
    const selectedTax = productData.tax?.id ? this.taxes.find(t => t.id === productData.tax.id) : null;
    const selectedDiscount = productData.discount?.id ? this.discounts.find(d => d.id === productData.discount.id) : null;
    
    // FIX: Get the default supplier ID for the form. This is the ID of the supplier linked to the product.
    // If it's null, the ng-select placeholder "Select supplier" will show.
    const defaultSupplierId = productData.supplier?.id ?? null;
    
    this.stockMovementForm.patchValue({
      purchasePrice: Number(productData.purchasePrice) || 0,
      sellingPrice: Number(productData.sellingPrice) || 0,
      // FIX: Patch the ID (number or null) into the form control. 
      // ng-select with bindValue="id" will correctly select this option.
      supplier: defaultSupplierId, 
      tax: selectedTax,           
      discount: selectedDiscount,   
      createdDate: new Date().toISOString().slice(0, 10),
      quantity: 1, // Reset quantity to 1 for new movement
      reference: ''
    });

    // Update price details
    this.priceDetails = {
      basePrice: Number(productData.sellingPrice) || 0,
      tax: Number(productData.tax?.rate) || 0,
      discount: productData.discount?.value || null,
      effectivePrice: Number(productData.sellingPrice) || 0,
      taxAmount: 0,
      priceAfterDiscount: Number(productData.sellingPrice) || 0
    };

    this.calculateEffectivePrice();
  }

  private getProductData(): any {
    if (!this.activeItem) return {};

    const item: any = this.activeItem;
    if (item.__originalProduct) {
      return item.__originalProduct;
    }
    if (item.product) {
      return item.product;
    }

    return this.activeItem;
  }

  getPurchasePrice(): string {
    const productData = this.getProductData();
    return productData.purchasePrice?.toString() || '0';
  }

  getSupplierName(): string {
    const productData = this.getProductData();
    return productData.supplier?.name || 'N/A';
  }

  getPartNumber(): string {
    const productData = this.getProductData();
    return productData.partNumber || 'N/A';
  }

  getMeasurementUnit(): string {
    const productData = this.getProductData();
    return productData.measurementUnit || 'N/A';
  }

  private fetchMetaData(): void {
    this.metadataService.taxes$.subscribe((taxes: TaxDTO[]) => {
      this.taxes = taxes;
      
      const productData = this.getProductData(); 
      const taxData = productData.tax || this.activeItem?.tax; 
      if (this.mode === 'edit' && taxData) {
        const selectedTax = this.taxes.find(t => t.id === taxData.id);
        if (selectedTax) {
          this.productForm.get('tax')?.setValue(selectedTax);
        }
      }
    });

    this.metadataService.discount$.subscribe((discounts: any[]) => {
      this.discounts = discounts;
      
      const productData = this.getProductData(); 
      const discountData = productData.discount || this.activeItem?.discount;
      if (this.mode === 'edit' && discountData) {
        const selectedDiscount = this.discounts.find(d => d.id === discountData.id);
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
      // Re-populate defaults if suppliers load after ngOnInit runs
      // This ensures the supplier dropdown has values to match against.
      if (this.mode === 'edit' && this.activeItem) {
        this.populateStockMovementDefaults();
      }
    });
  }

  private patchFormValues(): void {
    if (!this.activeItem) return;

    const productData = this.getProductData();

    this.productForm.patchValue({
      name: productData.name || this.activeItem.name,
      code: productData.code || this.activeItem.code,
      description: productData.description || this.activeItem.description,
      sku: productData.sku || this.activeItem.sku,
      weight: productData.weight || this.activeItem.weight,
      purchasePrice: productData.purchasePrice || this.activeItem.purchasePrice,
      sellingPrice: productData.sellingPrice || this.activeItem.sellingPrice,
      quantity: this.activeItem.quantity,
      reorderThreshold: productData.reorderThreshold || this.activeItem.reorderThreshold,
      measurementUnit: productData.measurementUnit || this.activeItem.measurementUnit,
      partNumber: productData.partNumber || this.activeItem.partNumber,
      expiryDate: productData.expiryDate || this.activeItem.expiryDate,
      isBundle: productData.isBundle || this.activeItem.isBundle,
      bundleItems: productData.bundleItems || this.activeItem.bundleItems || [],
    });

    const taxData = productData.tax || this.activeItem.tax;
    if (taxData) {
      const selectedTax = this.taxes.find(t => t.id === taxData.id);
      if (selectedTax) {
        this.productForm.get('tax')?.setValue(selectedTax);

        if (this.stockMovementForm.get('tax')) {
          this.stockMovementForm.get('tax')?.setValue(selectedTax);
        }
      }
    }

    const discountData = productData.discount || this.activeItem.discount;
    if (discountData) {
      const selectedDiscount = this.discounts.find(d => d.id === discountData.id);
      if (selectedDiscount) {
        this.productForm.get('discount')?.setValue(selectedDiscount);

        if (this.stockMovementForm.get('discount')) {
          this.stockMovementForm.get('discount')?.setValue(selectedDiscount);
        }
      }
    }
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  getErrorMessage(controlName: string, displayName?: string): string {
    const control = this.stockMovementForm.get(controlName) || this.productForm.get(controlName);
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
      // Removed direct supplier fetch here since it's already in fetchMetaData
      this.posService.getDiscount(),
    ]).subscribe({
      next: ([categories, branches, discounts]) => {
        this.categories = categories;
        this.branches = branches;
        // this.suppliers is populated by metadataService.supplier$ subscription

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
          key: "tl"
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
          discountObj = {
            id: 0,
            name: "",
            value: 0,
            startDate: new Date(),
            endDate: new Date(),
            minQuantity: 0,
            discountType: { id: 0, code: "", description: "", name: "" },
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

    const productData = this.getProductData();

    this.productForm.patchValue({
      name: productData.name || this.activeItem.name,
      sku: productData.sku || this.activeItem.sku,
      code: productData.code || this.activeItem.code,
      description: productData.description || this.activeItem.description,
      weight: productData.weight || this.activeItem.weight,
      purchasePrice: productData.purchasePrice || this.activeItem.purchasePrice || 0,
      sellingPrice: productData.sellingPrice || this.activeItem.sellingPrice || 0,
      quantity: this.activeItem.quantity,
      reorderThreshold: productData.reorderThreshold || this.activeItem.reorderThreshold || 0,
      partNumber: productData.partNumber || this.activeItem.partNumber || '',
      measurementUnit: productData.measurementUnit || this.activeItem.measurementUnit || '',
      expiryDate: (productData.expiryDate || this.activeItem.expiryDate)
        ? new Date(productData.expiryDate || this.activeItem.expiryDate).toISOString().split('T')[0]
        : null,
      isBundle: productData.isBundle || this.activeItem.isBundle || false,
      bundleItems: productData.bundleItems || this.activeItem.bundleItems || [],
    });

    const categoryData = productData.productCategory || this.activeItem.productCategory;
    const branchData = productData.branch || this.activeItem.branch;
    const supplierData = productData.supplier || this.activeItem.supplier;

    this.selectedCategory = categoryData?.id || null;
    this.selectedBranch = branchData?.id || null;
    this.selectedSupplier = supplierData?.id || null;

    // Initialize price details for stock movement
    this.priceDetails = {
      basePrice: Number(productData.sellingPrice || this.activeItem.sellingPrice) || 0,
      tax: Number(productData.tax?.rate || this.activeItem.tax?.rate) || 0,
      discount: (productData.discount?.value || this.activeItem.discount?.value) || null,
      effectivePrice: Number(productData.sellingPrice || this.activeItem.sellingPrice) || 0,
      taxAmount: 0,
      priceAfterDiscount: Number(productData.sellingPrice || this.activeItem.sellingPrice) || 0
    };

    // Initialize preview data
    this.previewData = {
      quantity: this.activeItem.quantity || 0,
      purchasePrice: Number(productData.purchasePrice || this.activeItem.purchasePrice) || 0,
      sellingPrice: Number(productData.sellingPrice || this.activeItem.sellingPrice) || 0,
      effectiveSellingPrice: Number(productData.sellingPrice || this.activeItem.sellingPrice) || 0,
    };
  }

  onProductChange(event: any): void {
    if (event && event.id) {
      this.posService.getProductById(event.id).subscribe((product) => {
        this.activeItem = product;
        this.prefillForm();
        
        // Ensure defaults are populated whenever the product changes
        setTimeout(() => {
          this.populateStockMovementDefaults();
        }, 50);
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
        key: "tl"
      });
      return;
    }

    this.isLoading = true;
    const supplierData = { ...this.newSupplier };

    this.posService.addSupplier(supplierData).subscribe({
      next: (newSupplier) => {
        this.suppliers.push(newSupplier);
        // The form control name is 'supplier', which will hold the ID
        this.stockMovementForm.patchValue({
          supplier: newSupplier.id, 
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
          key: "tl"
        });
        this.isLoading = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to create supplier',
          life: 3000,
          key: "tl"
        });
        this.isLoading = false;
      },
    });
  }

  private resetStockMovementForm(): void {
    this.stockMovementForm.reset({
      createdDate: new Date().toISOString().split('T')[0],
      reference: '',
      quantity: 1,
      supplier: null, // Resetting to null
      purchasePrice: this.activeItem?.purchasePrice || 0,
      sellingPrice: this.activeItem?.sellingPrice || 0,
      tax: null,
      discount: null,
    });
    this.stockMovementForm.markAsPristine();
    this.stockMovementForm.markAsUntouched();

    this.priceDetails = {
      basePrice: 0,
      tax: 0,
      discount: null,
      effectivePrice: 0,
      taxAmount: 0,
      priceAfterDiscount: 0
    };
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
    const productData = this.getProductData();
    return productData[field]?.toString() || this.activeItem?.[field]?.toString() || '';
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
        this.populateStockMovementDefaults(); 
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

  private toIso(raw: string): string {
    return raw?.includes('T') ? new Date(raw).toISOString()
                              : new Date(`${raw}T00:00:00`).toISOString();
  }

  private getInventoryIdFromActiveItem(): number | null {
    const anyItem: any = this.activeItem;
    return (anyItem?.inventoryId ?? anyItem?.__inventory?.id ?? null) as number | null;
  }

  private async findInventoryIdForProductBranch(productId: number, branchId: number): Promise<number | null> {
    const list = await firstValueFrom(this.posService.getInventories());
    const hit = (list || []).find((inv: any) => {
      const pid = inv.productId ?? inv.ingredientId ?? inv.product?.id;
      const bid = inv.branchId ?? inv.branch?.id;
      return Number(pid) === Number(productId) && Number(bid) === Number(branchId);
    });
    return hit?.id ?? null;
  }

  async saveStockMovement(): Promise<void> {
    if (this.stockMovementForm.invalid) {
      this.stockMovementForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields',
        life: 2500,
        key: "tl"
      });
      return;
    }
    
    if (!this.activeItem?.id || !this.selectedBranch) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Product or branch not selected',
        life: 2500,
        key: "tl"
      });
      return;
    }

    const rawDate = this.stockMovementForm.value.createdDate;
    const reference = this.stockMovementForm.value.reference || '';
    const qtyAbs = Number(this.stockMovementForm.value.quantity) || 0;
    
    const purchasePrice = Number(this.stockMovementForm.value.purchasePrice) || 0;
    // Prefer explicit sellingPrice entered in the stockMovementForm, otherwise fall back to base price
    const formSelling = this.stockMovementForm.get('sellingPrice')?.value;
    const sellingPrice = Number(
      formSelling !== null && formSelling !== undefined && formSelling !== ''
        ? formSelling
        : (this.priceDetails?.basePrice ?? this.activeItem?.sellingPrice ?? 0)
    );

    const supplier = this.stockMovementForm.value.supplier;
    //  The supplier value is already the ID (or null) because of bindValue="id"
    const supplierId = supplier ? Number(supplier) : null; 

    // Assume IN movement based on component context
    const signedQty = qtyAbs; 

    this.isLoading = true;
    try {
      let inventoryId = this.getInventoryIdFromActiveItem();
      if (!inventoryId) {
        inventoryId = await this.findInventoryIdForProductBranch(this.activeItem.id, this.selectedBranch);
      }

      if (!inventoryId) {
        if (signedQty <= 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'No inventory yet',
            detail: 'You can\'t reduce stock before creating inventory. Please add stock (IN) first.',
            life: 3500,
            key: "tl"
          });
          return;
        }

        const createPayload = {
          availableQuantity: 0,
          status: 'IN_STOCK' as InventoryStatus,
          productId: this.activeItem.id,
          branchId: this.selectedBranch,
          stockMovement: []
        };
        const created = await firstValueFrom(this.posService.createInventory(createPayload));
        if (!created?.id) throw new Error('Failed to create inventory');
        inventoryId = created.id;
        (this.activeItem as any).inventoryId = inventoryId; 
      }

      try {
        const fresh = await firstValueFrom(this.posService.getInventoryById(inventoryId));
        const projected = Number(fresh?.availableQuantity ?? 0) + signedQty;
        if (projected < 0) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Insufficient stock',
            detail: 'This movement would make stock negative.',
            life: 3000,
            key: "tl"
          });
          return;
        }
      } catch {
        // Continue if we can't fetch fresh data
      }

      const createdDate = rawDate 
        ? new Date(rawDate).toISOString() 
        : new Date().toISOString();
      
      const createdById = this.getCurrentUserId();
      const ingredientId = this.activeItem.id; 
      
      const tempBody: StockMovementPostBody = {
        quantity: signedQty,
        reference,
        purchasePrice,
        sellingPrice,
        createdDate,
        createdById: createdById || 0,
        supplierId: supplierId ? Number(supplierId) : null,
        ingredientId: Number(ingredientId), 
        inventoryId: Number(inventoryId)
      };
      
      const finalPayload: StockMovementPostBody = {
          quantity: tempBody.quantity,
          reference: tempBody.reference,
          purchasePrice: tempBody.purchasePrice,
          sellingPrice: tempBody.sellingPrice,
          createdDate: tempBody.createdDate,
          createdById: tempBody.createdById,
          supplierId: tempBody.supplierId,
          ingredientId: tempBody.ingredientId,
          inventoryId: tempBody.inventoryId
      };

      console.log('Sending stock movement payload (Final):', finalPayload);

      await firstValueFrom(this.posService.createStockMovement(finalPayload));

      // Update product with new selling price if it was changed
      if (this.activeItem) {
        const newSellingPrice = Number(sellingPrice) || Number(this.activeItem.sellingPrice);
        const currentPrice = Number(this.activeItem.sellingPrice) || 0;
        if (newSellingPrice && newSellingPrice !== currentPrice) {
          const updatedProduct: ProductData = {
            ...this.activeItem,
            sellingPrice: newSellingPrice.toString()
          };
          try {
            await firstValueFrom(this.posService.updateProduct(updatedProduct));
            this.activeItem.sellingPrice = newSellingPrice.toString();
            this.updateProductInList(updatedProduct);
          } catch (updateError) {
            console.warn('Failed to update product selling price:', updateError);
            // Don't fail the entire operation if product update fails
          }
        }
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Stock movement recorded successfully!',
        life: 2500,
        key: "tl"
      });

      const after = await firstValueFrom(this.posService.getInventoryById(inventoryId));
      this.updated.emit({
        inventoryId,
        quantity: Number(after?.availableQuantity ?? 0),
        status: (after?.status ?? 'IN_STOCK') as InventoryStatus
      });
      
      if (this.activeItem) {
        (this.activeItem as any).quantity = after?.availableQuantity ?? (Number((this.activeItem as any).quantity) || 0) + signedQty;
      }

      setTimeout(() => {
        this.close.emit();
      }, 1500);

      this.resetStockMovementForm();

    } catch (err: any) {
      console.error('Stock movement error:', err);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.error?.message || err?.message || 'Failed to record movement',
        life: 4000,
        key: "tl"
      });
    } finally {
      this.isLoading = false;
    }
  }

  private formatDateForBackend(dateString: string): string {
    if (!dateString) return new Date().toISOString();
    
    if (dateString.includes('T')) {
      return new Date(dateString).toISOString();
    }
    
    const date = new Date(`${dateString}T00:00:00`);
    return date.toISOString();
  }

  private getCurrentUserId(): number {
    const userData = sessionStorage.getItem('currentUser');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return Number(user.id) || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  private async getOrCreateInventoryStrict(): Promise<InventoryResponsePayload> {
    if (!this.activeItem || !this.selectedBranch) {
      throw new Error('Product and branch are required to resolve inventory');
    }

    const allInventories = await firstValueFrom(this.posService.getInventories());
    const existing = allInventories?.find(
      inv => inv.productId === this.activeItem!.id && inv.branchId === this.selectedBranch
    );
    
    if (existing) return existing;

    const createPayload: InventoryCreatePayload = {
      availableQuantity: 0,
      status: 'IN_STOCK',
      productId: this.activeItem.id,
      branchId: this.selectedBranch,
      stockMovement: []
    };

    const created = await firstValueFrom(
      this.posService.createInventory(createPayload)
    );
    
    if (!created || !created.id) {
      throw new Error('Failed to create inventory');
    }
    
    return created;
  }

  private showValidationError(): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Validation',
      detail: 'Please fill all required fields correctly',
      life: 3000,
      key: "tl"
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

  private prepareMovementApiPayload(inventoryId: number): StockMovementCreatePayload {
    if (!this.activeItem) throw new Error('No product selected');

    const rawDate = this.stockMovementForm.value.createdDate;
    const date = rawDate?.includes('T') ? new Date(rawDate) : new Date(`${rawDate}T00:00:00`);
    const createdDate = date.toISOString();

    const quantity = Number(this.stockMovementForm.value.quantity) || 0;
    const purchasePrice = Number(this.stockMovementForm.value.purchasePrice) || 0;
    const sellingPrice = Number(this.priceDetails.effectivePrice) || 0;

    const supplier = this.stockMovementForm.value.supplier;
    // Extract supplierId from ID
    const supplierId = supplier ? Number(supplier) : null;

    return {
      quantity: quantity,
      reference: this.stockMovementForm.value.reference || '',
      purchasePrice: purchasePrice,
      sellingPrice: sellingPrice,
      createdDate: createdDate,
      supplierId: supplierId ?? null,
      ingredientId: this.activeItem.id,
      inventoryId: inventoryId
    };
  }

  private async processStockMovement(movementData: StockMovementPayload, inventoryId: number): Promise<void> {
    try {
      const inventoryPayload: InventoryPayload = {
        id: inventoryId,
        productId: this.activeItem?.id || 0,
        branchId: this.selectedBranch || 0,
        availableQuantity: (this.activeItem?.quantity || 0) + movementData.quantity,
        status: 'IN_STOCK',
        stockMovement: [movementData]
      };

      await this.posService.addInventory(inventoryPayload).toPromise();

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

    const updatedProduct: ProductData = {
      ...this.activeItem,
      quantity: (this.activeItem.quantity || 0) + movementData.quantity,
      purchasePrice: movementData.purchasePrice.toString(),
      sellingPrice: movementData.sellingPrice.toString(),
      ...(this.activeItem.tax && { tax: this.activeItem.tax }),
      ...(this.activeItem.discount && { discount: this.activeItem.discount }),
    };

    try {
      await this.posService.updateProduct(updatedProduct).toPromise();
      
      this.activeItem = updatedProduct;
      this.updateProductInList(updatedProduct);
      
    } catch (error) {
      console.error('Backend update failed:', error);
      
      this.messageService.add({
        severity: 'warn',
        summary: 'Offline Mode',
        detail: 'Changes saved locally but not synced with server',
        life: 3000,
        key: "tl"
      });
    }
  }

  private showSuccessMessage(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Stock movement recorded successfully',
      life: 3000,
      key: "tl"
    });
  }

  private resetAfterSuccess(): void {
    this.resetStockMovementForm();
    this.showStockMovementSection = false;
    this.refreshProductData();
  }

  private handleMovementError(error: any): void {
    console.error('Error in stock movement:', error);
    
    let errorMessage = 'Failed to record stock movement';
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        errorMessage = 'Invalid data submitted';
      } else if (error.status === 404) {
        errorMessage = 'Inventory not found';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000,
      key: "tl"
    });
  }

  setupStockMovementWatchers(): void {
    this.stockMovementForm.get('quantity')?.valueChanges.subscribe((value) => {
      this.previewData.quantity =
        (this.getCurrentQuantity() || 0) + (value || 0);
      this.updatePreviewData();
    });

    this.stockMovementForm
      .get('purchasePrice')
      ?.valueChanges.subscribe((value) => {
        this.previewData.purchasePrice = value || 0;
        this.updatePreviewData();
      });
  }

  private isUpdatingFromCalculation = false;

  initializeStockMovementForm(): void {
    const currentDate = new Date().toISOString().slice(0, 10);
    
    const initialValues = {
      purchasePrice: this.activeItem?.purchasePrice || 0,
      sellingPrice: this.priceDetails.effectivePrice || this.activeItem?.sellingPrice || 0,
      createdDate: currentDate,
      // Pass the supplier ID here, or null
      supplier: this.selectedSupplier ?? null, 
      quantity: 1,
      reference: '',
    };
    
    this.stockMovementForm.patchValue(initialValues);
  }

  private initializePriceDetails(): void {
    const item = this.activeItem;
    if (!item) {
      throw new Error('No active item selected');
    }

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

    const priceAfterDiscount = this.calculatePriceAfterDiscount(basePrice, discount);
    
    const taxAmount = this.calculateTaxAmount(priceAfterDiscount, taxRate);

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

  updatePrices(): void {
    this.calculateEffectivePrice();
  }

  onBasePriceChange(value: number): void {
    this.priceDetails.basePrice = value || 0;
    this.calculateEffectivePrice();
  }

  onTaxChange(value: number): void {
    this.priceDetails.tax = value || 0;
    this.calculateEffectivePrice();
  }

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

  private buildStockMovementCreatePayload(inventoryId?: number): StockMovementCreatePayload {
    if (!this.activeItem) throw new Error('No product selected');

    // FIX: Removed action logic that caused TS2367 since the form doesn't expose it. Assume 'IN'.
    const qty = Number(this.stockMovementForm.value.quantity) || 0;
    const signedQty = qty;

    const raw = this.stockMovementForm.value.createdDate;
    const date = raw?.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`);
    const createdDate = date.toISOString();

    const purchasePrice = Number(this.stockMovementForm.value.purchasePrice) || 0;
    const sellingPrice = Number(
      this.stockMovementForm.value.sellingPrice
        ?? this.priceDetails?.effectivePrice
        ?? this.priceDetails?.basePrice
        ?? 0
    );

    const supplier = this.stockMovementForm.value.supplier ?? this.selectedSupplier ?? null;
    // Extract supplierId from ID
    const supplierId = supplier ? Number(supplier) : null;

    const payload: StockMovementCreatePayload = {
      quantity: signedQty,
      reference: this.stockMovementForm.value.reference || '',
      purchasePrice,
      sellingPrice,
      createdDate,
      supplierId: supplierId ?? null,
      ingredientId: this.activeItem.id,
    };
    if (inventoryId) payload.inventoryId = inventoryId;

    return payload;
  }

  private async findExistingInventory(productId: number, branchId: number)
    : Promise<InventoryResponsePayload | undefined> {
    const all = await firstValueFrom(this.posService.getInventories());
    return all?.find(inv => inv.productId === productId && inv.branchId === branchId);
  }

  private buildInventoryCreatePayload(nextQty: number): InventoryCreatePayload {
    if (!this.activeItem || !this.selectedBranch) {
      throw new Error('Product and branch are required');
    }
    const status: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK' =
      nextQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';

    const movement = this.buildStockMovementCreatePayload();

    return {
      availableQuantity: nextQty,
      status,
      productId: this.activeItem.id,
      branchId: this.selectedBranch,
      stockMovement: [] as any[],
    };
  }

  private buildInventoryUpdatePayload(
    existing: InventoryResponsePayload,
    nextQty: number
  ): InventoryUpdatePayload {
    const status: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK' =
      nextQty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';

    const movement = this.buildStockMovementCreatePayload(existing.id);

    return {
      id: existing.id,
      availableQuantity: nextQty,
      status,
      productId: existing.productId,
      branchId: existing.branchId,
      stockMovement: [movement],
    };
  }

  private buildInventoryScalarUpdate(existing: InventoryResponsePayload, nextQty: number) {
    const status: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK' =
      nextQty <= 0 ? 'OUT_OF_STOCK' : 'IN_STOCK';

    return {
      id: existing.id,
      availableQuantity: nextQty,
      status,
      productId: existing.productId,
      branchId: existing.branchId,
    } as any;
  }

  private buildMovementForPost(inventoryId: number): any {
    // FIX: Removed action logic that caused TS2367 since the form doesn't expose it. Assume 'IN'.
    const qty = Number(this.stockMovementForm.value.quantity) || 0;
    const signedQty = qty;

    const raw = this.stockMovementForm.value.createdDate;
    const iso = (raw?.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`)).toISOString();

    return {
      quantity: signedQty,
      reference: this.stockMovementForm.value.reference || '',
      createdDate: iso,
      inventoryId,                
    };
  }
}