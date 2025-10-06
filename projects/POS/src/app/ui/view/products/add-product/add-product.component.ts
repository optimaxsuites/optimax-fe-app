import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
	type AbstractControl,
	FormArray,
	FormBuilder,
	FormControl,
	FormGroup,
	Validators,
	ValidationErrors,
} from "@angular/forms";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";
import { MessageService } from "primeng/api";
import { debounceTime, skipUntil } from "rxjs";
import {
	BranchDTO,
	DiscountDTO,
	HistoryData,
	IngredientDTO,
	MeasurementUnit,
	ProductData,
	ProductJSONFormat,
	ProductJSONFormatPOST,
	supplierData,
	TaxDTO,
	VariantDTO,
} from "../../../models/interface";
import { IndustryDataService } from "../../../service/industry-data.service";
import { MetadataService } from "../../../service/metadata.service";
import { PosServiceService } from "../../../service/pos-service.service";
import { firstValueFrom } from 'rxjs';
interface SelectedIngredientDTO {
	ingredient: IngredientDTO;
	quantity: number;
}
interface BundleItem {
  product: ProductData;
  quantity: number;
  priceAdjustment: number; 
}

@Component({
	selector: "app-add-product",
	templateUrl: "./add-product.component.html",
	styleUrl: "./add-product.component.scss",
})
export class AddProductComponent {
	@Output() close = new EventEmitter<void>();
	@Input() activeItem: any;
	@Input() isEditMode: boolean = false;
	productForm!: FormGroup;
	/** Roughly a hundred years from now */
	private readonly _defaultExpiryDate = new Date(
		Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000,
	);
	productData: ProductJSONFormatPOST = {
		name: "",
		code: "",
		description: "",
		sku: "",
		weight: 0,
		costPrice: "",
		sellingPrice: "",
		expiryDate: this._defaultExpiryDate.toISOString(),

		partNumber: "",
		tax: { name: "", rate: 0 },

		variant: "",

		productCategory: {
			id: 0,
			name: "",
			code: "",
			description: "",
			endDate: this._defaultExpiryDate.toISOString(),
		},
		id: 0,
		productBranch: [],
		isBundle: false,
		bundleItems: [],
		measurementUnit: MeasurementUnit,
		reorderThreshold: 12,
		createdBy: "",
		createdDate: "",
		productImages: [],
		variants: [],
	};
	barcodeConfig = {
		barcodeType: "CODE128",
		barcodeQuantity: 1,
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
	measurementUnits = Object.keys(MeasurementUnit);

	addProduct: boolean = false;
	productImage: any = "";
	openAddVariant: boolean = false;
	isEditing: boolean = false;
	editingIndex: number | null = null;
	Object = Object;
	savingCategory = false;
    savingDiscount = false;
    savingSupplier = false;

	/**
	 * We use this for now, pending when user registration industry field is updated
	 */
	industry: string = "Hotel";
	dummyIngredients: IngredientDTO[] = [
		{
			id: 1,
			name: "Flour",
			code: "FLR001",
			sku: "SKU-FLR-001",
			measurementUnit: MeasurementUnit.UNIT, // Kilogram
			purchasePrice: 500,
			currentStock: 100,
			reorderThreshold: 20,
		},
		{
			id: 2,
			name: "Sugar",
			code: "SGR001",
			sku: "SKU-SGR-001",
			measurementUnit: MeasurementUnit.UNIT, // Gram
			purchasePrice: 200,
			currentStock: 5000,
			reorderThreshold: 500,
		},
		{
			id: 3,
			name: "Eggs",
			code: "EGG001",
			sku: "SKU-EGG-001",
			measurementUnit: MeasurementUnit.UNIT, // Pieces

			purchasePrice: 50,
			currentStock: 200,
			reorderThreshold: 30,
		},
		{
			id: 4,
			name: "Milk",
			code: "MLK001",
			sku: "SKU-MLK-001",
			measurementUnit: MeasurementUnit.UNIT, // Liters

			purchasePrice: 400,
			currentStock: 50,
			reorderThreshold: 10,
		},
	];
	selectedIngredients: SelectedIngredientDTO[] = [];

	/**
	 * This will be an object indexed with `this.selectedBranchIndex` where each value would be an array of variants for each branch.
	 */
	variants: VariantDTO[] = [];

	private async createInventoryForNewProduct(
  productId: number,
  branchId: number,
  initialQty: number,
  purchasePrice: number,
  sellingPrice: number,
  supplierId?: number | null
) {
  const nowIso = new Date().toISOString();

  
  const payload: any = {
    id: 0,
    availableQuantity: Number(initialQty) || 0,
    status: (Number(initialQty) || 0) > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    productId: productId,             
    branchId: branchId,
    stockMovement: [
      {
        id: 0,
        quantity: Number(initialQty) || 0,
        reference: 'Initial stock',
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        createdDate: nowIso,
        stockMovementsId: 0,
        createdById: 0,
        supplierId: supplierId ?? null
        
      }
    ]
  };

  try {
    await firstValueFrom(this.posService.createInventory(payload as any));
  } catch (err) {
    console.error('Inventory create failed', err);
    
    this.messageService?.add({
      severity: 'warn',
      summary: 'Inventory',
      detail: 'Product was created, but inventory failed. You can add it later from Inventory.',
      life: 3000
    });
  }
}

	/**
	 * NOTE: The order of this object is important! See `get variantObjectKeys()`
	 */
	private readonly defaultVariant: VariantDTO = {
		id: 0,
		name: "",
		price: 0,
		quantity: 0,
		color: "",
		size: "Regular",
		sku: "",
		branches: [],
	};
	protected readonly variantValues = {
		size: [
			"XXS",
			"XS",
			"Small",
			"Medium",
			"Regular",
			"Large",
			"XL",
			"XXL",
		] as VariantDTO["size"][],
	};
	/**
	 * The `color` field would actually be a string like "Red, Blue, Yellow" when the user is adding a new variant, however, before getting stored, it will split into an array
	 */
	newVariant = this.resetVariantData();

	branches: BranchDTO[] = [];

	discountTypes: any[] = [];
	discountType: string[] = [];
	discounts: any[] = [];
	suppliers: supplierData[] = [];
	taxes: TaxDTO[] = [];
	selectedBundleItems: BundleItem[] = [];
    availableProducts: ProductData[] = [];

	periodicDiscount: { startDate: string; endDate: string } = {
		startDate: "",
		endDate: "",
	};
	quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
	addSuccessfull: boolean = false;

	selectedBranch: any[] = [];
	selectedCategory: string = "";
	openCategories: boolean = false;
	openAddCategory: boolean = false;
	openAddDiscount: boolean = false;
	openAddSupplier: boolean = false;
	openAddTax: boolean = false;

	openBranchData = false;
	categories: any[] = [];
	configureBarcode: boolean = false;
	barcodes = [
		{ label: "CODE128 ", value: "CODE128" },
		// { label: 'CODE128 A/B/C', value: 'CODE128' },
		{ label: "EAN-13", value: "EAN13" },
		{ label: "EAN-8", value: "EAN8" },
		// { label: 'EAN-5', value: 'EAN5' },
		// { label: 'EAN-2', value: 'EAN2' },
		{ label: "UPC (A)", value: "UPC" },
		{ label: "UPC (E)", value: "UPC" },
		{ label: "ITF", value: "ITF" },
		// { label: 'ITF-14', value: 'ITF14' },
		// { label: 'MSI10', value: 'MSI10' },
		// { label: 'MSI11', value: 'MSI11' },
		// { label: 'MSI1010', value: 'MSI1010' },
		// { label: 'MSI1110', value: 'MSI1110' },

		{ label: "Codabar", value: "Codabar" },
		{ label: "CODE39", value: "CODE39" },
	] as const;
	/**
	 * This is the branch name that is used to determine what branch data to be edited
	 *
	 * TODO: Make this type better. It should represent the value of each branch
	 */
	//@ts-ignore
	selectedBranchFromForm: (typeof this.branches)[0]["value"];
	dataOfChosenBranches: any[] = [];
	selectedProductIds: number[] = [];

	/**
	 * This should be `true` as long as the backend endpoints for the new models aren't ready
	 */
	fallBackToOldForm = true;
	loading: boolean = false;
	originalProducts: ProductData[] = [];
	userBranch = "headquarters";
	Array = Array;
	console = console;

	constructor(
		private messageService: MessageService,
		private posService: PosServiceService,
		private http: HttpClient,
		private fb: FormBuilder,
		private industryData: IndustryDataService,
		private metadataService: MetadataService,
	) {}
ngOnInit(): void {
  const fbGroup: Parameters<typeof this.fb.group>[0] = {
    name: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    isAvailableInStore: [true],
    code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]{3,20}$/)]],
    description: ['', [Validators.required]],
    sku: [""],
    weight: [null, [Validators.min(0), Validators.max(9999)]],
    costPrice: [null, [Validators.required, Validators.min(0.01)]],
    sellingPrice: [null, [Validators.required, Validators.min(0.01)]],
    tax: [null],
    discount: [null],
    quantity: [null, [Validators.required, Validators.min(0)]],
    supplier: [null],
    partNumber: [""],
    selectedBranch: [[], Validators.required],
    branches: this.fb.array([]),
    category: [""],
    image: [null],
    startDate: [""],
    endDate: [""],
    discountMinQuantity: [0],
    discountName: [""],
    isBundle: [false],
    bundleItems: [[], this.bundleItemsValidator.bind(this)],
    selectedProductIds: [[]], 
    measurementUnit: [""],
    reorderThreshold: [null, [Validators.required, Validators.min(1)]],
    expiryDate: [this._defaultExpiryDate.toISOString()],
  };

  this.productForm = this.fb.group(fbGroup);
  this.fetchMetaData();
  this.loadAvailableProducts();

  if (this.isEditMode && this.activeItem) {
    setTimeout(() => {
      this.initializeEditMode();
    }, 100);
  }

  this.productForm.get("selectedBranch")?.valueChanges.subscribe(() => {
    this.updateBranches();
  });
  
  // Fixed subscription for selectedProductIds
  this.productForm.get("selectedProductIds")?.valueChanges.subscribe((selectedIds) => {
    if (selectedIds && Array.isArray(selectedIds)) {
      this.syncBundleItems(selectedIds);
    }
  });
}
syncBundleItems(selectedProductIds: number[]) {
  // Avoid processing if the selection hasn't actually changed
  const currentIds = this.selectedBundleItems.map(item => item.product.id);
  const newIds = selectedProductIds || [];
  
  if (JSON.stringify(currentIds.sort()) === JSON.stringify(newIds.sort())) {
    return;
  }

  console.log('Syncing bundle items with selected IDs:', selectedProductIds);

  // Clear existing items
  this.selectedBundleItems = [];

  // Add items for each selected product ID
  if (newIds.length > 0) {
    newIds.forEach(productId => {
      const product = this.availableProducts.find(p => p.id === productId);
      if (product) {
        this.selectedBundleItems.push({
          product: product,
          quantity: 1,
          priceAdjustment: 0
        });
      }
    });
  }

  // Update the bundle items form array
  this.updateBundleItemsInForm();
}

bundleItemsValidator(control: AbstractControl): ValidationErrors | null {
  
  const controlValue = control.value;
  const isBundleControl = control.parent?.get('isBundle');
  const isBundle = isBundleControl?.value;
  
  if (isBundle && (!controlValue || controlValue.length === 0)) {
    return { required: true };
  }
  return null;
}
  loadAvailableProducts() {
    this.metadataService.products$.subscribe((products) => {
      this.availableProducts = products.filter(product => {
        // Exclude the current product if in edit mode
        if (this.isEditMode && this.activeItem) {
          return product.id !== this.activeItem.id;
        }
        return true;
      });
    });
  }
onBundleToggle(event: Event) {
  const target = event.target as HTMLInputElement;
  const isBundle = target.checked;
  
  console.log('Bundle toggle:', isBundle);
  
  if (!isBundle) {
    
    this.selectedBundleItems = [];
    this.selectedProductIds = [];
    this.productForm.get('bundleItems')?.setValue([], { emitEvent: false });
    this.productForm.get('selectedProductIds')?.setValue([], { emitEvent: false });
  }
  
  
  setTimeout(() => {
    this.productForm.get('bundleItems')?.updateValueAndValidity({ emitEvent: false });
  }, 50);
}
updateSelectedProductIds() {
  this.selectedProductIds = this.selectedBundleItems.map(item => item.product.id);
}
updateBundleItemsInForm() {
  const bundleItemsData = this.selectedBundleItems.map(item => ({
    id: 0,
    productId: Number(item.product.id),
    quantity: Number(item.quantity) || 1,
    priceAdjustment: Number(item.priceAdjustment) || 0
  }));

  console.log('Updating bundle items in form:', bundleItemsData);

  // Update the form control value
  this.productForm.get('bundleItems')?.setValue(bundleItemsData, { emitEvent: false });
  this.productForm.get('bundleItems')?.markAsDirty();
  
  // Update validation
  setTimeout(() => {
    this.productForm.get('bundleItems')?.updateValueAndValidity({ emitEvent: false });
  }, 50);
}
updateBundleItemsForm() {
  if (!this.productForm) return;
  
  const bundleItemsData = this.selectedBundleItems
    .map(item => {
      const productId = Number(item.product.id);
      const quantity = Number(item.quantity) || 1;
      const priceAdjustment = Number(item.priceAdjustment) || 0;
      
      if (isNaN(productId) || productId <= 0) {
        console.error('Invalid productId:', item.product.id, item.product);
        return null;
      }
      
      return {
        id: 0,
        productId: productId,
        quantity: quantity,
        priceAdjustment: priceAdjustment
      };
    })
    .filter(item => item !== null);

  
  this.productForm.get('bundleItems')?.setValue(bundleItemsData, { emitEvent: false });
  
  
  const selectedIds = this.selectedBundleItems.map(item => item.product.id);
  this.selectedProductIds = selectedIds;
  this.productForm.get('selectedProductIds')?.setValue(selectedIds, { emitEvent: false });
  
  this.productForm.get('bundleItems')?.markAsDirty();
  
  
  setTimeout(() => {
    this.productForm.get('bundleItems')?.updateValueAndValidity({ emitEvent: false });
  }, 0);
}
incrementBundleItemQuantity(index: number) {
  if (this.selectedBundleItems[index].quantity < 99) {
    this.selectedBundleItems[index].quantity++;
    this.updateBundleItemsInForm();
  }
}

decrementBundleItemQuantity(index: number) {
  if (this.selectedBundleItems[index].quantity > 1) {
    this.selectedBundleItems[index].quantity--;
    this.updateBundleItemsInForm();
  }
}
updateBundleItemQuantity(index: number, value: any) {
  const quantity = Number(value) || 1;
  if (quantity >= 1 && quantity <= 99) {
    this.selectedBundleItems[index].quantity = quantity;
    this.updateBundleItemsInForm();
  }
}

updateBundlePriceAdjustment(index: number, value: any) {
  const priceAdjustment = Number(value) || 0;
  this.selectedBundleItems[index].priceAdjustment = priceAdjustment;
  this.updateBundleItemsInForm();
}

removeBundleItem(index: number) {
  this.selectedBundleItems.splice(index, 1);
  

  const selectedIds = this.selectedBundleItems.map(item => item.product.id);
  this.productForm.get('selectedProductIds')?.setValue(selectedIds, { emitEvent: true });
}
 calculateBundleTotalPrice(): number {
  return this.selectedBundleItems.reduce(
	(total, item) => total + (((Number(item.product.sellingPrice) || 0) + item.priceAdjustment) * item.quantity),
	0
  );
}
  calculateBundleSavings(): number {
    const individualTotal = this.calculateBundleTotalPrice();
    const bundlePrice = this.productForm.get('sellingPrice')?.value || 0;
    return Math.max(0, individualTotal - bundlePrice);
  }
getAbsValue(value: number): number {
  return Math.abs(value);
}
private initializeEditMode() {
    console.log('Initializing edit mode with activeItem:', this.activeItem);

    // Set basic form values with proper fallbacks
    this.productForm.patchValue({
        name: this.activeItem.name || '',
        code: this.activeItem.code || '',
        description: this.activeItem.description || '',
		isAvailableInStore: this.activeItem.isAvailableInStore ?? true,
        sku: this.activeItem.sku || '',
        weight: this.activeItem.weight || 0,
        costPrice: this.activeItem.purchasePrice || this.activeItem.costPrice || 0,
        sellingPrice: this.activeItem.sellingPrice || 0,
        quantity: this.activeItem.quantity || 0,
        partNumber: this.activeItem.partNumber || '',
        reorderThreshold: this.activeItem.reorderThreshold || 12,
        expiryDate: this.activeItem.expiryDate || this._defaultExpiryDate.toISOString(),
        isBundle: this.activeItem.isBundle || false,
        bundleItems: this.activeItem.bundleItems || [],
        measurementUnit: this.activeItem.measurementUnit || ''
    });

  
    this.setRelatedObjects();
     if (this.activeItem.isBundle && this.activeItem.bundleItems) {
      this.selectedBundleItems = this.activeItem.bundleItems.map((item: any) => ({
        product: this.availableProducts.find(p => p.id === item.productId) || item,
        quantity: item.quantity || 1,
        priceAdjustment: item.priceAdjustment || 0
      }));
    }
    // Set variants
    if (this.activeItem.variants && this.activeItem.variants.length > 0) {
        this.variants = [...this.activeItem.variants];
    }

    // Set branch information
    this.setBranchInformation();

    // Initialize product image
    this.initializeProductImage();

    console.log('Form after initialization:', this.productForm.value);
}
private setRelatedObjects() {
    // Set category
    if (this.activeItem.productCategory) {
        const category = this.categories.find(c => c.id === this.activeItem.productCategory.id);
        if (category) {
            this.productForm.patchValue({ category: category });
        }
    }

    // Set tax
    if (this.activeItem.tax) {
        const tax = this.taxes.find(t => t.id === this.activeItem.tax.id);
        if (tax) {
            this.productForm.patchValue({ tax: tax });
        }
    }

    // Set discount
    if (this.activeItem.discount) {
        const discount = this.discounts.find(d => d.id === this.activeItem.discount.id);
        if (discount) {
            this.productForm.patchValue({ discount: discount });
        }
    }

    // Set supplier
    if (this.activeItem.supplier) {
        const supplier = this.suppliers.find(s => s.id === this.activeItem.supplier.id);
        if (supplier) {
            this.productForm.patchValue({ supplier: supplier });
        }
    }
}
private setBranchInformation() {
    if (this.activeItem.branch) {
        const branch = this.branches.find(b => b.id === this.activeItem.branch.id);
        if (branch) {
            if (this.userBranch === "headquarters") {
                this.productForm.patchValue({ selectedBranch: [branch] });
            } else {
                this.productForm.patchValue({ selectedBranch: branch });
            }
        }
    }
}
private initializeProductImage() {
    console.log('Initializing product image for activeItem:', this.activeItem);
    
    // Check if productImages array exists and has items
    if (this.activeItem?.productImages && Array.isArray(this.activeItem.productImages) && this.activeItem.productImages.length > 0) {
        const lastImage = this.activeItem.productImages[this.activeItem.productImages.length - 1];
        console.log('Found last image:', lastImage);
        
        // If it's already a complete URL, use it directly
        if (typeof lastImage === 'string' && (lastImage.startsWith('http') || lastImage.startsWith('data:'))) {
            this.productImage = lastImage;
            console.log('Using direct URL:', this.productImage);
            return;
        }
        
        // If it's an object with imageUrl property
        if (lastImage?.imageUrl) {
            this.productImage = lastImage.imageUrl;
            console.log('Using imageUrl property:', this.productImage);
            return;
        }
        
        // If lastImage is an object, try to use it directly without service call
        if (typeof lastImage === 'object' && lastImage !== null) {
            // Check if we can construct a data URL or use base64
            if (lastImage.data || lastImage.base64) {
                this.productImage = `data:image/jpeg;base64,${lastImage.data || lastImage.base64}`;
                return;
            }
            
            // For now, skip the service call that's causing 401 and use placeholder
            console.log('Skipping service call due to auth issues, using placeholder');
            this.productImage = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWN8hLKJungcUipWLReON9fse4yZcyB0rzNw&s';
            return;
        }
    }
    
    // Try direct properties on activeItem
    if (this.activeItem?.imageUrl) {
        this.productImage = this.activeItem.imageUrl;
        console.log('Using activeItem.imageUrl:', this.productImage);
        return;
    }
    
    if (this.activeItem?.image) {
        this.productImage = this.activeItem.image;
        console.log('Using activeItem.image:', this.productImage);
        return;
    }
    
    // Default fallback
    this.productImage = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWN8hLKJungcUipWLReON9fse4yZcyB0rzNw&s';
    console.log('Using fallback image');
}
	fetchMetaData() {
		this.metadataService.discount$.subscribe((data) => (this.discounts = data));
		this.metadataService.category$.subscribe(
			(data) => (this.categories = data),
		);
		this.metadataService.supplier$.subscribe((data) => (this.suppliers = data));
		this.metadataService.discountTypes$.subscribe(
			(data) => (this.discountTypes = data),
		);
		this.metadataService.taxes$.subscribe((data) => (this.taxes = data));
		this.metadataService.branches$.subscribe((data) => {
			this.branches = data;

			if (this.branches.length > 0) {
				if (this.userBranch === "headquarters") {
					this.productForm.patchValue({
						selectedBranch: [this.branches[0]],
					});
				} else {
					this.productForm.patchValue({
						selectedBranch: this.branches[0],
					});
				}

				console.log(this.productForm.get("selectedBranch")?.value);
				this.newVariant.branches = [this.branches[0]];
			}
		});

		console.log(this.productForm);

		this.metadataService.products$.subscribe((data) => {
			this.originalProducts = data;
		});
	}
	get branchess(): FormArray<FormGroup> {
		return this.productForm.get("branches") as FormArray<FormGroup>;
	}

	get selecteddBranch() {
		return this.productForm.get("selectedBranch")?.value;
	}

	getVariants(branch: AbstractControl) {
		return branch.get("variants") as FormArray<FormGroup>;
	}

	get currentBranch() {
		return this.userBranch !== "headquarters"
			? this.selecteddBranch
			: this.newVariant.branches;
	}

	set currentBranch(value: any) {
		if (this.userBranch === "headquarters") {
			this.selectedBranch = value;
		} else {
			this.newVariant.branches = value;
		}
	}

	addIngredient(selectedIngredient: IngredientDTO, quantity: number) {
		const ingredientExists = this.selectedIngredients.find(
			(item) => item.ingredient.id === selectedIngredient.id,
		);

		if (!ingredientExists) {
			this.selectedIngredients.push({
				ingredient: selectedIngredient,
				quantity: quantity,
			});
		} else {
			console.log("Ingredient already added!");
		}
	}
	loadVariants() {
		const variantMap: { [key: string]: any } = {};

		this.activeItem?.branchDetails?.forEach((branchDetail: any) => {
			const branchId = branchDetail.productBranch.branchId;
			const variants = branchDetail.variants;

			variants.forEach((variant: any) => {
				const key = variant.variantId || variant.sku || variant.name;

				if (!variantMap[key]) {
					variantMap[key] = {
						variantId: variant.variantId,
						name: variant.name,
						sku: variant.sku,
						color: variant.color || "Other".split(",").map((val) => val.trim()),
						size: variant.size || "Regular",
						branches: [branchId],
					};
				} else {
					if (!variantMap[key].branches.includes(branchId)) {
						variantMap[key].branches.push(branchId);
					}
				}
			});
		});

		this.variants = Object.values(variantMap);
	}

	loadBranches() {
		const branchDataList = this.activeItem?.branchDetails?.map(
			(detail: any) => {
				const branchId = detail.productBranch?.branchId;
				const fullBranch = this.branches.find(
					(branch: any) => branch.id === branchId,
				);
				return fullBranch;
			},
		);
		this.productForm.get("selectedBranch")?.setValue(branchDataList);

		this.populateEditBranches();
	}
	onIngredientSelect(selectedItems: any[]) {
		console.log(selectedItems);
		this.selectedIngredients = selectedItems.map((ingredient) => ({
			ingredient: ingredient,
			quantity: 1, // Default quantity
		}));

		console.log(this.selectedIngredients);
	}
	removeIngredient(index: number) {
		this.selectedIngredients.splice(index, 1);
	}

updateBranches() {
    const branchArray = this.branchess;
    const selectedBranches = this.selecteddBranch;

    if (!selectedBranches || (!Array.isArray(selectedBranches) || selectedBranches.length <= 0)) return;

    if (Array.isArray(selectedBranches) && selectedBranches.length === 1) {
        while (branchArray.length > 0) {
            branchArray.removeAt(0);
        }
        return;
    }
	
   

   

    if (branchArray.value.length > 1) {
        for (let i = branchArray.value.length - 1; i >= 0; i--) {
            const formBranch = branchArray.at(i).get("branchName")?.value;
            const stillSelected = selectedBranches.some(
                (b: any) => b.name === formBranch.name,
            );
				console.log(stillSelected);
				if (!stillSelected) {
					branchArray.removeAt(i);
				}
			}
		}
         if (!Array.isArray(selectedBranches)) return;
		selectedBranches.forEach((branch: any) => {
			const exists = branchArray.controls.some(
				(ctrl) => ctrl.get("branchName")?.value.name === branch.name,
			);

			if (!exists) {
				branchArray.push(
					this.fb.group({
						branchName: [branch],
						sellingPrice: [null, Validators.required],
						costPrice: [null, Validators.required],
						quantity: [null, Validators.required],
						sku: [this.autoGenerateBranchSku(), Validators.required],
						code: [null, Validators.required],
						partNumber: [null, Validators.required],
						tax: [null, Validators.required],
						supplier: [null, Validators.required],
						discount: [null],
						variants: this.fb.array([]),
					}),
				);
			}
		});
	}

	populateEditBranches() {
		this.selecteddBranch.forEach((branch: any) => {
			const branchId = branch.id;

			const detail = this.activeItem?.branchDetails?.find(
				(d: any) => d.productBranch?.branchId === branchId,
			);

			const variantsFormArray = new FormArray<FormGroup>([]);

			if (detail?.variants?.length) {
				detail.variants.forEach((variant: any) => {
					variantsFormArray.push(
						this.fb.group({
							id: [variant.id],
							name: [variant.name, Validators.required],
							price: [variant.price, Validators.required],
							sku: [variant.sku],
							quantity: [variant.quantity, Validators.required],
						}),
					);
				});
			}

			this.branchess.push(
				this.fb.group({
					branchName: [branch],
					sellingPrice: [detail.branchData?.price ?? 0, Validators.required],
					costPrice: [
						detail.branchData?.purchasePrice ?? 0,
						Validators.required,
					],
					quantity: [detail.branchData?.quantity ?? 0, Validators.required],
					tax: [detail.branchData?.taxId || null, Validators.required],
					supplier: [
						detail.branchData?.supplierId || null,
						Validators.required,
					],
					discount: [detail.branchData?.discountId || null],
					variants: variantsFormArray,
				}),
			);
		});
	}

	removeBranch(index: number) {
		const branchToRemove = this.branchess.at(index).get("branchName")?.value;
		this.branchess.removeAt(index);
		const updatedBranches = this.productForm.controls[
			"selectedBranch"
		].value.filter((branch: string) => branch !== branchToRemove);
		this.productForm.controls["selectedBranch"].setValue(updatedBranches);
		this.variants.forEach((variant) => {
			variant.branches = variant.branches?.filter(
				(branch) => branch !== branchToRemove,
			);
		});
		this.variants = this.variants.filter(
			(variant) => variant.branches && variant.branches.length > 0,
		);
	}
	removeVariant(branch: AbstractControl, variantIndex: number) {
		const variantsArray = branch.get("variants") as FormArray;
		const variantToRemove = variantsArray.at(variantIndex).get("name")?.value;
		const variantToId = variantsArray.at(variantIndex).get("id")?.value;

		const branchName = branch.get("branchName")?.value;

		variantsArray.removeAt(variantIndex);
		this.variants.forEach((variant) => {
			if (variant.name === variantToRemove) {
				variant.branches = variant.branches?.filter(
					(branch) => branch !== branchName,
				);
			}
		});
		this.variants = this.variants.filter(
			(variant) => variant.branches && variant.branches.length > 0,
		);
		if (this.isEditMode) {
			this.posService.deleteBranchVariantData(variantToId).subscribe({
				next: () => {
					this.messageService.add({
						severity: "success",
						summary: "Deleted",
						detail: `Variant '${variantToRemove}' deleted successfully.`,
						key: "tl",
						life: 3000,
					});

					this.activeItem.branchDetails = this.activeItem.branchDetails
						.map((detail: any) => {
							if (detail.branchName === branchName) {
								return {
									...detail,
									variants: detail.variants.filter(
										(v: any) => v.id !== variantToId,
									),
								};
							}
							return detail;
						})
						.filter((detail: any) => detail.variants.length > 0);
				},
				error: () => {
					this.messageService.add({
						severity: "error",
						summary: "Error",
						detail: `Failed to delete variant '${variantToRemove}'`,
						key: "tl",
						life: 3000,
					});
				},
			});
		}
	}

	getPricingVariants(branchIndex: number): FormArray {
		return this.branchess.at(branchIndex).get("pricingVariants") as FormArray;
	}

	newPricingVariant(): FormGroup {
		return this.fb.group({
			variantName: ["", Validators.required],
			price: ["", Validators.required],
		});
	}

	addPricingVariant(branchIndex: number) {
		this.getPricingVariants(branchIndex).push(this.newPricingVariant());
	}

	removePricingVariant(branchIndex: number, variantIndex: number) {
		this.getPricingVariants(branchIndex).removeAt(variantIndex);
	}

	isFieldInvalid(fieldName: string) {
		const field = this.productForm.get(fieldName);

		return field?.invalid && (field.touched || field.dirty);
	}

	calculateEffectivePrice() {
		const basePrice = this.productForm.get("initialPrice")?.value;
		const taxPercentage = this.productForm.get("tax")?.value;

		if (basePrice && taxPercentage) {
			const effectivePrice = basePrice * (1 + taxPercentage / 100);
			this.productForm
				.get("effectivePrice")
				?.setValue(parseFloat(effectivePrice.toFixed(2)), { emitEvent: false });
		}
	}

	checkForEmptyFields<TObj extends object>(
		obj: TObj,
		fieldsToIgnore: ReadonlyArray<keyof TObj> = [],
	): boolean {
		return Object.entries(obj).some(
			([key, value]) =>
				typeof value === "string" &&
				value.trim() === "" &&
				!fieldsToIgnore.includes(key as unknown as keyof TObj),
		);
	}
	onImageUpload(event: any) {
    const file = event.target.files[0];
    
    if (file) {
        this.productForm.get("image")?.setValue(file);
        
        const reader = new FileReader();
        reader.onload = (e: any) => {
            this.productImage = e.target.result;
            console.log('New image uploaded:', this.productImage);
        };
        reader.readAsDataURL(file);
    }
}

	getProducts() {
		this.posService.getProducts().subscribe(async (data) => {
			if (data) {
				this.originalProducts = data.sort((a: any, b: any) => {
					const dateA = new Date(
						a.createdDate[0],
						a.createdDate[1] - 1,
						a.createdDate[2],
						a.createdDate[3],
						a.createdDate[4],
						a.createdDate[5],
					);
					const dateB = new Date(
						b.createdDate[0],
						b.createdDate[1] - 1,
						b.createdDate[2],
						b.createdDate[3],
						b.createdDate[4],
						b.createdDate[5],
					);
					return dateB.getTime() - dateA.getTime();
				});
			} else {
				console.log("error loading data");
			}
		});
	}
addToProduct() {
  const userName = sessionStorage.getItem("username");
  this.loading = true;

  // Validate bundle items if it's a bundle product
  if (this.productForm.get('isBundle')?.value && this.selectedBundleItems.length === 0) {
    this.messageService.add({
      severity: "error",
      summary: "Validation Error",
      detail: "Please select at least one product for the combo.",
      key: "tl",
      life: 3000,
    });
    this.loading = false;
    return;
  }

  if (this.productForm.invalid) {
    this.markFormGroupTouched(this.productForm);
    this.messageService.add({
      severity: "error",
      summary: "Validation Error",
      detail: "Please fill in all required fields correctly.",
      key: "tl",
      life: 3000,
    });
    this.loading = false;
    return;
  }

  const formValues = this.productForm.value;

  if (this.selecteddBranch?.length > 1) {
    this.createProductPerBranch(this.branchess.value);
  } else {
    
let bundleItems: any[] = [];
if (formValues.isBundle && this.selectedBundleItems.length > 0) {
  bundleItems = this.selectedBundleItems
    .map(item => {
      const productId = Number(item.product.id);
      
 
      if (isNaN(productId) || productId <= 0) {
        console.error('Invalid productId in bundle item:', item);
        return null;
      }
      
      return {
        productId: productId,
        quantity: Number(item.quantity) || 1,
        priceAdjustment: Number(item.priceAdjustment) || 0
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  
  console.log('Final bundle items for backend:', JSON.stringify(bundleItems, null, 2));
  
  
  if (bundleItems.length === 0) {
    this.messageService.add({
      severity: "error",
      summary: "Validation Error",
      detail: "Failed to create valid bundle items. Please check product selection.",
      key: "tl",
      life: 3000,
    });
    this.loading = false;
    return;
  }
}

    const product = {
      id: 0,
      name: formValues.name,
      isAvailableInStore: formValues.isAvailableInStore ?? true,
      code: formValues.code,
      partNumber: formValues.partNumber,
      description: formValues.description,
      measurementUnit: formValues.measurementUnit,
      isBundle: formValues.isBundle || false,
      bundleItems: bundleItems, 
      productCategoryId: formValues.category?.id,
      variants: this.variants || [],
      sku: formValues.sku,
      purchasePrice: formValues.costPrice,
      sellingPrice: formValues.sellingPrice,
      quantity: formValues.quantity,
      weight: formValues.weight,
      reorderThreshold: formValues.reorderThreshold,
      taxId: formValues.tax?.id,
      discountId: formValues.discount?.id,
      supplierId: formValues.supplier?.id,
      branchId: formValues.selectedBranch?.id || formValues.selectedBranch[0]?.id,
      createdBy: userName,
      createdDate: new Date().toISOString(),
      expiryDate: formValues.expiryDate,
    };

    console.log('Final product payload:', JSON.stringify(product, null, 2));

    const formData = new FormData();
    formData.append("product", JSON.stringify(product));
    if (formValues.image instanceof File) {
      formData.append("files", formValues.image);
    }

    this.posService.addProduct(formData).subscribe(
      async (data) => {
        if (data) {
          console.log('Product created successfully:', data);
          const branchId = product.branchId; 
          await this.createInventoryForNewProduct(
            data.id,                                  
            Number(branchId),
            Number(product.quantity),
            Number(product.purchasePrice),
            Number(product.sellingPrice),
            product.supplierId ?? null
          );
          this.messageService.add({
            severity: "success",
            summary: "Product Added",
            detail: "Product added successfully.",
            key: "tl",
            life: 3000,
          });
          this.loading = false;
          this.addSuccessfull = true;
          this.resetFormAfterSuccess();
        } else {
          this.messageService.add({
            severity: "error",
            summary: "Failed",
            detail: "An error occured. Please try adding the product again.",
            key: "tl",
            life: 3000,
          });
          this.loading = false;
        }
      },
      (error) => {
        this.loading = false;
        console.error('Error creating product:', error);
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Unexpected error occured, please try again later.",
          key: "tl",
          life: 3000,
        });
      },
    );
  }
}
  resetFormAfterSuccess() {
    this.productForm.reset();
    this.productForm.markAsUntouched();
    this.productForm.markAsPristine();
    
    this.productImage = "";
    this.variants = [];
    this.selectedIngredients = [];
    this.selectedBundleItems = []; 
    
    while (this.branchess.length !== 0) {
      this.branchess.removeAt(0);
    }

    if (this.branches.length > 0) {
      const defaultBranch = this.userBranch === "headquarters" ? [this.branches[0]] : this.branches[0];
      this.productForm.patchValue({
        selectedBranch: defaultBranch,
        expiryDate: this._defaultExpiryDate.toISOString(),
        isBundle: false,
        bundleItems: [],
        reorderThreshold: 12
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
  Object.keys(formGroup.controls).forEach(key => {
    const control = formGroup.get(key);
    if (control) {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    }
  });
}

	async createProductPerBranch(branches: any[]) {
		this.loading = true;
		const formValues = this.productForm.value;
		const userName = sessionStorage.getItem("username");

		try {
			for (const branch of branches) {
				const productPayload = {
					name: formValues.name,
					code: branch.code,
					partNumber: branch.partNumber,
					description: formValues.description,
					measurementUnit: formValues.measurementUnit,
					isBundle: formValues.isBundle,
					bundleItems: formValues.bundleItems || [],
					productCategoryId: formValues.category.id,
					variants: branch.variants || [],
					// branch-specific values
					sku: branch.sku,
					purchasePrice: branch.costPrice,
					sellingPrice: branch.sellingPrice,
					quantity: branch.quantity,
					weight: formValues.weight,
					reorderThreshold: formValues.reorderThreshold,
					taxId: branch.tax?.id,
					discountId: branch.discount?.id,
					supplierId: branch.supplier?.id,
					branchId: branch.branchName.id, // if needed on the backend
					createdBy: userName,
					createdDate: new Date().toISOString(),

					productImages: formValues.productImages || [],
					expiryDate: formValues.expiryDate,
				};
				console.log(productPayload);
				const formData = new FormData();
				formData.append("product", JSON.stringify(productPayload));
				if (formValues.image instanceof File) {
					formData.append("files", formValues.image);
				}
				console.log(formData);
				 const created: any = await this.posService.addProduct(formData).toPromise();
				 if (created?.id) {
    await this.createInventoryForNewProduct(
      created.id,
      Number(branch.branchName?.id),   // branch id used when creating the product
      Number(branch.quantity),
      Number(branch.costPrice),
      Number(branch.sellingPrice),
      branch.supplier?.id ?? null
    );
  }
			}

			this.messageService.add({
				severity: "success",
				summary: "Product Added",
				detail: "Products created for all branches successfully.",
				key: "tl",
				life: 3000,
			});
			this.addSuccessfull = true;
		} catch (error) {
			this.messageService.add({
				severity: "error",
				summary: "Failed",
				detail: "An error occurred. Please try again.",
				key: "tl",
				life: 3000,
			});
		} finally {
			this.loading = false;
		}
	}

	resetFormOnSuccess() {
  this.productForm.reset();
  this.productImage = "";
  this.variants = [];
  this.selectedIngredients = [];
  // Reset to initial state but keep branch selection if not headquarters
  if (this.branches.length > 0) {
    this.productForm.patchValue({
      selectedBranch: this.userBranch === "headquarters" ? [this.branches[0]] : this.branches[0]
    });
  }
}

	autoGenerateSku() {
		const formValue = this.productForm.value;

		if (formValue.name && !formValue.sku) {
			const prefix = formValue.name.substring(0, 3).toUpperCase();
			const randomNumber = Math.floor(1000 + Math.random() * 9000);
			this.productForm.get("sku")?.setValue(`${prefix}-${randomNumber}`);

			if (this.variants.length && this.selectedBranch.length < 2) {
				this.variants.forEach(
					(v) =>
						(v.sku = this.generateVariantSku(
							this.productForm.get("sku")?.value,
							v,
						)),
				);
			}
		}

		if (formValue.name && this.selecteddBranch.length > 1) {
			this.branchess.controls.forEach((branchControl: FormGroup) => {
				const updatedSku = this.autoGenerateBranchSku();
				branchControl.patchValue({
					sku: updatedSku,
				});

				const variantsArray = branchControl.get("variants") as FormArray;
				if (variantsArray && variantsArray.length > 0) {
					variantsArray.controls.forEach(
						(variantControl: AbstractControl, index: number) => {
							const variantGroup = variantControl as FormGroup;
							const variantSku = variantGroup.get("sku")?.value || "";

							const parts = variantSku.split("-");
							const newPrefix = branchControl.get("sku")?.value;
							const newVariantSku = `${newPrefix}-${parts.slice(1).join("-")}`;
							variantGroup.patchValue({
								sku: newVariantSku,
							});
						},
					);
				}
			});
		}
	}
	autoGenerateBranchSku(): string | null {
		const formValue = this.productForm.value;

		if (formValue.name) {
			const prefix = formValue.name.substring(0, 3).toUpperCase();
			const randomNumber = Math.floor(1000 + Math.random() * 9000);
			return `${prefix}-${randomNumber}`;
		}
		return "AUTO";
	}
	
	generateVariantSku(parentSku: string, variant: VariantDTO) {
		if (!parentSku) {
			return "Auto";
		}

		let suffix = "";

		if (variant.color) {
			suffix += "-" + variant.color?.toUpperCase();
		}
		if (variant.size) {
			suffix += "-" + variant.size?.toUpperCase();
		}

		if (!suffix && variant.name) {
			const words = variant.name.split(" ");
			suffix +=
				"-" + words.map((word) => word.charAt(0).toUpperCase()).join("");
		}

		if (!suffix) {
			suffix = "-" + Math.floor(1000 + Math.random() * 9000);
		}

		return `${parentSku}${suffix}`;
	}

async updateProduct() {
    this.loading = true;
    const userName = sessionStorage.getItem("username");

    // Only validate if required fields are missing
    if (this.productForm.invalid) {
        console.log('Form validation errors:');
        Object.keys(this.productForm.controls).forEach(key => {
            const control = this.productForm.get(key);
            if (control && control.invalid) {
                console.log(`${key} is invalid:`, control.errors);
            }
        });
        
        this.messageService.add({
            severity: "error",
            summary: "Validation Error",
            detail: "Please fill in all required fields correctly.",
            key: "tl",
            life: 3000,
        });
        this.loading = false;
        return;
    }

    const formValues = this.productForm.value;
    const hasNewImage = formValues.image instanceof File;

    console.log('Form values:', formValues);
    console.log('Has new image:', hasNewImage);

    // Build the product object with proper fallbacks
    const product = {
        id: this.activeItem.id,
        name: formValues.name,
        code: formValues.code,
		isAvailableInStore: formValues.isAvailableInStore ?? this.activeItem.isAvailableInStore ?? true,
        partNumber: formValues.partNumber,
        description: formValues.description,
        measurementUnit: formValues.measurementUnit,
        isBundle: formValues.isBundle,
        bundleItems: formValues.bundleItems || [],
        productCategoryId: formValues.category?.id || this.activeItem.productCategory?.id,
        variants: this.variants || [],
        sku: formValues.sku,
        purchasePrice: formValues.costPrice,
        sellingPrice: formValues.sellingPrice,
        quantity: formValues.quantity,
        weight: formValues.weight,
        reorderThreshold: formValues.reorderThreshold,
        taxId: formValues.tax?.id,
        discountId: formValues.discount?.id,
        supplierId: formValues.supplier?.id,
        branchId: this.activeItem.branch?.id || this.activeItem.branchId,
        createdBy: this.activeItem.createdBy,
        createdDate: this.activeItem.createdDate,
        expiryDate: formValues.expiryDate || this.activeItem.expiryDate,
        // Clear existing images if new image is provided
        clearExistingImages: hasNewImage
    };

    console.log('Product data to update:', product);

    const formData = new FormData();
    formData.append("product", JSON.stringify(product));
    
    // If there's a new image, add it and set replacement flags
    if (hasNewImage) {
        formData.append("files", formValues.image);
        formData.append("replaceImages", "true");
        formData.append("clearExistingImages", "true");
    } else if (this.activeItem.productImages && this.activeItem.productImages.length > 0) {
        // Keep the existing images if no new image is provided
        const existingImages = this.activeItem.productImages.map((img: any) => img.id);
        formData.append("existingImageIds", JSON.stringify(existingImages));
    }

    try {
        const response = await this.posService.updateProduct(formData).toPromise();
        
        this.loading = false;
        
        if (response) {
            this.messageService.add({
                severity: "success",
                summary: "Success",
                detail: "Product updated successfully.",
                key: "tl",
                life: 3000,
            });
            
            // Close the modal and refresh data
            this.triggerClose();
        } else {
            this.messageService.add({
                severity: "error",
                summary: "Failed",
                detail: "Failed to update product. Please try again.",
                key: "tl",
                life: 3000,
            });
        }
    } catch (error) {
        this.loading = false;
        console.error('Update error:', error);
        
        this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to update product. Please try again.",
            key: "tl",
            life: 3000,
        });
    }
}
	resetForm() {
		this.productForm.reset();
		this.productImage = "";
		this.variants = [];
		this.categories = [];
		this.discounts = [];
	}

	triggerClose() {
		this.close.emit();
	}
	get variantFormArray() {
		return this.productForm.get("variant") as FormArray;
	}

	addVariant() {
		//@ts-ignore
		const variant: VariantDTO = structuredClone(this.newVariant);

		const selectedBranch = this.productForm.get("selectedBranch")?.value;

		if (Array.isArray(selectedBranch) && selectedBranch.length > 1) {
			const branchArray = this.branchess.controls;

			variant.branches?.forEach((branchName) => {
				const targetBranches = branchArray.filter(
					(branch) => branch.get("branchName")?.value.name === branchName.name,
				);

				if (targetBranches.length > 0) {
					targetBranches.forEach((targetBranch) => {
						const variantsArray = targetBranch.get("variants") as FormArray;

						if (this.isEditing && this.editingIndex !== null) {
							const variantIndex = variantsArray.controls.findIndex(
								(control) => control.get("sku")?.value === variant.sku,
							);

							if (variantIndex !== -1) {
								variantsArray.at(variantIndex).patchValue({
									id: variant.id,
									name: variant.name,
									price: variant.price,
									sku: variant.sku,
									quantity: variant.quantity,
									size: variant.size,
									color: variant.color,
								});
							}

							this.variants[this.editingIndex] = variant;
						} else {
							variantsArray.push(
								this.fb.group({
									// id: [variant.id],
									name: [variant.name, Validators.required],
									price: [variant.price],
									sku: [
										this.generateVariantSku(
											targetBranch.get("sku")?.value,
											variant,
										),
									],
									quantity: [variant.quantity],
									size: [variant.size],
									color: [variant.color],
								}),
							);
						}
					});
				}
			});
			this.variants.push(variant);
		} else {
			if (this.isEditing && this.editingIndex !== null) {
				this.variants[this.editingIndex] = variant;
			} else {
				variant.sku = this.generateVariantSku(
					this.productForm.get("sku")?.value,
					variant,
				);
				this.variants.push(variant);
			}
		}

		this.newVariant = this.resetVariantData();
		this.openAddVariant = false;
		this.isEditing = false;
		this.editingIndex = null;
	}

	deleteVariant(index: number) {
		this.variants.splice(index, 1);
		if (this.isEditMode) {
			this.removeAllVariants();
		}
	}

	removeAllVariants() {
		const variantIds: number[] = [];

		this.branchess.controls.forEach((branchGroup: FormGroup) => {
			const variants = branchGroup.get("variants") as FormArray<FormGroup>;

			if (variants && variants.length > 0) {
				variants.controls.forEach((variantGroup: FormGroup) => {
					const id = variantGroup.get("id")?.value;
					if (id) {
						variantIds.push(id);
					}
				});
			}
		});

		variantIds.forEach((id: number) => {
			this.posService.deleteBranchVariantData(id).subscribe({
				next: () => {
					this.messageService.add({
						severity: "success",
						summary: "Variant Deleted",
						detail: `Variant with ID ${id} deleted successfully.`,
						key: "tl",
						life: 3000,
					});
				},
				error: () => {
					this.messageService.add({
						severity: "error",
						summary: "Error",
						detail: `Failed to delete variant with ID ${id}.`,
						key: "tl",
						life: 3000,
					});
				},
			});
		});

		
		this.branchess.controls.forEach((branchGroup: FormGroup) => {
			const variants = branchGroup.get("variants") as FormArray;
			variants.clear(); // Remove all variants from the UI
		});

		
		this.variants = [];
	}
	private isEditFormValid(): boolean {
    const requiredFields = ['name', 'description'];
    
    for (const field of requiredFields) {
        const control = this.productForm.get(field);
        if (!control?.value || (typeof control.value === 'string' && control.value.trim() === '')) {
            return false;
        }
    }
    
    return true;
}

	editVariant(index: number) {
		this.isEditing = true;
		this.editingIndex = index;

		const selectedVariant = this.variants[index];
		console.log(selectedVariant);
		this.newVariant = {
			...selectedVariant,
			color: selectedVariant.color,
			branches: selectedVariant.branches || [],
		};

		this.openAddVariant = true;
	}

	addCategory() {
		let categoryData = { ...this.productData.productCategory };
		// The inputted date would be something like `2025-06-07` so we need to force it to an iso string
		categoryData.endDate = new Date(categoryData.endDate).toISOString();

		if (this.checkForEmptyFields(categoryData, ["endDate", "description"])) {
			console.log("all fields are required");
			this.messageService.add({
				severity: "error",
				summary: "warn",
				detail: "All fields are required",
				key: "tl",
				life: 3000,
			});
		} else {
			this.posService.addCategory(categoryData).subscribe(
				async (data) => {
					console.log(data);
					if (data) {
						this.messageService.add({
							severity: "success",
							summary: "Category Added",
							detail: "Category added successfully.",
							key: "tl",
							life: 3000,
						});
						this.categories.push(data);
						categoryData = {
							id: 0,
							name: "",
							code: "",
							description: "",
							endDate: "",
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
	}
	removeCategory(id: number) {
		this.posService.deleteCategory(id).subscribe(async (data) => {
			if (data) {
				this.messageService.add({
					severity: "error",
					summary: "Failed",
					detail: "Failed to delete category.",
					key: "tl",
					life: 3000,
				});
			} else {
				// this.loadCategory();
				this.messageService.add({
					severity: "success",
					summary: "Category deleted",
					detail: "Category deleted successfully.",
					key: "tl",
					life: 3000,
				});
			}
		});
	}

	selectCategory(category: any) {
		console.log(category);
		this.productData.productCategory = category;
		this.productForm.get("category")?.setValue(category);
		console.log(this.productData.productCategory);
	}

	toggleCategoryDropdown() {
		this.openCategories = !this.openCategories;
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

	selectDiscount(discount: any) {
		this.productData.productCategory = discount;
		this.productForm.get("discount")?.setValue(discount);
	}

	openGenerateBarcode() {
		this.configureBarcode = true;
		this.addSuccessfull = false;
	}

	get isSKUValid() {
		return (
			typeof this.productForm.get("sku")?.value == "string" &&
			this.productForm.get("sku")?.value != ""
		);
	}

	printBarcode(variantSKU?: string) {
		this.generateBarcode(variantSKU, true);
	}

	generateBarcode(variantSKU?: string, shouldPrint?: boolean) {
		const sku = this.productForm.get("sku")?.value;

		if (typeof sku === "string") {
			const productCode = variantSKU ? `${sku}-${variantSKU}` : sku;

			for (let i = 0; i < this.barcodeConfig.barcodeQuantity; i++) {
				const barcodeSvg = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"svg",
				);
				JsBarcode(barcodeSvg, productCode, {
					format: this.barcodeConfig.barcodeType,
					lineColor: "#000",
					width: 2,
					height: 125,
					displayValue: true,
				});

				this.convertSvgToPng(barcodeSvg, shouldPrint);
			}
		} else {
			alert("Please fill in the SKU with valid data.");
		}
	}
getLastImage(): string {
   
    return this.productImage || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWN8hLKJungcUipWLReON9fse4yZcyB0rzNw&s';
}
	convertSvgToPng(svgElement: Node, shouldPrint?: boolean) {
		const svgString = new XMLSerializer().serializeToString(svgElement);

		const encodedSvg = encodeURIComponent(svgString);

		const img = new Image();

		img.onload = () => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			canvas.width = img.width;
			canvas.height = img.height;
			ctx?.drawImage(img, 0, 0);

			const imgData = canvas.toDataURL("image/png");
			if (shouldPrint) {
				const iframe = document.createElement("iframe");
				iframe.style.display = "none";
				document.body.appendChild(iframe);

				const doc = iframe.contentWindow?.document;
				if (doc) {
					doc.write(`
          <html>
          <body onload="window.print();">
          </body>
          </html>
        `);
					doc.close();
					doc.body.appendChild(canvas);
					// iframe.contentWindow!.print();

					setTimeout(() => document.body.removeChild(iframe), 5000);
				}
			} else this.generatePDF(imgData);
		};

		img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
	}

	generatePDF(imgData: string) {
		const pdf = new jsPDF({
			orientation: "portrait",
			unit: "px",
			format: "a4",
		});

		const pdfWidth = pdf.internal.pageSize.getWidth();
		const pdfHeight = (100 * pdfWidth) / 200;

		const padding = 10;
		const barcodeWidth = 150;
		const barcodeHeight = 50;
		const itemsPerRow = Math.floor((pdfWidth - 2 * padding) / pdfWidth);
		let currentX = padding;
		let currentY = padding;

		for (let i = 0; i < this.barcodeConfig.barcodeQuantity; i++) {
			pdf.addImage(
				imgData,
				"PNG",
				currentX,
				currentY,
				barcodeWidth,
				barcodeHeight,
			);

			currentX += pdfWidth;
			if ((i + 1) % itemsPerRow === 0) {
				currentX = padding;
				currentY += barcodeHeight + padding;
			}

			if (currentX + pdfWidth > pdf.internal.pageSize.getWidth()) {
				currentX = padding;
				currentY += pdfHeight + padding;
			}

			if (currentY + pdfHeight + padding > pdf.internal.pageSize.getHeight()) {
				pdf.addPage();
				currentX = padding;
				currentY = padding;
			}
		}

		pdf.save("barcodes.pdf");
	}
	getImageUrl(string: string) {
		return this.posService.getProductImage(string);
	}
getErrorMessage(controlName: string, displayName?: string): string {
	const control = this.productForm.get(controlName);
	const name = displayName || controlName;

	if (control && control.errors) {
		const errors = control.errors;
		const errorKeys = Object.keys(errors);

		if (errorKeys.length > 0) {
			switch (errorKeys[0]) {
				case "required":
					return `${name} is required.`;
				case "pattern":
					if (controlName === 'code') return 'Code must contain only uppercase letters, numbers, and hyphens (3-20 characters)';
					if (controlName === 'quantity') return 'Quantity must be a valid number';
					return `${name} has an invalid format.`;
				case "min":
					if (controlName === 'costPrice' || controlName === 'sellingPrice') return `${name} must be greater than 0`;
					return `${name} must be at least ${errors["min"].min}.`;
				case "minlength":
					return `${name} must be at least ${errors["minlength"].requiredLength} characters long.`;
				case "maxlength":
					return `${name} should not exceed ${errors["maxlength"].requiredLength} characters.`;
				default:
					return `${name} has an error.`;
			}
		}
	}

	return "";
}
	isFieldInvalidAndTouched(fieldName: string): boolean {
  const field = this.productForm.get(fieldName);
  return !!(field && field.invalid && (field.dirty || field.touched));
}

	/**
	 * Yes this looks needlessly complex :p
	 */
	protected get variantObjectKeys() {
		return (
			Object.keys(this.defaultVariant) as (keyof typeof this.defaultVariant)[]
		)
			.filter((key) => key != "id" && key != "branches")
			.map((key) => {
				if (key == "sku") return key.toLocaleUpperCase();
				// "size" becomes "Size"
				else return key.charAt(0).toLocaleUpperCase() + key.slice(1);
			});
	}

	private resetVariantData() {
		return {
			id: this.defaultVariant.id,
			name: this.defaultVariant.name,
			price: this.defaultVariant.price,
			quantity: this.defaultVariant.quantity,
			color: this.defaultVariant.color[0],
			size: this.defaultVariant.size,
			sku: this.defaultVariant.sku,
			branches: this.defaultVariant.branches,
		};
	}

	get businessType() {
		return this.industryData.businessType;
	}

	/**
	 * An array of values from `this.branches` that have been selected by the multiple-choice `ng-select`
	 */
	get selectedBranches(): string[] {
		return (this.productForm.get("branch") as FormControl).value;
	}

	/**
	 * Constructs an object of the form elements for the chosen branches.
	 */

	/** UNUSED */
	deleteBranch(branchData: (typeof this.branches)[0]) {
		console.log(branchData);
		console.log(this.branches);
		delete this.branches[this.branches.findIndex((br) => br == branchData)];
		// this.dataOfChosenBranches = this.getDataOfChosenBranches;
	}

	generateRandomSku(form?: any, fieldName?: string) {
		const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
		let randomPart = "";

		for (let i = 0; i < 4; i++) {
			randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
		}

		const timestamp = Date.now().toString().slice(-5);
		const generatedSku = `${randomPart}-${timestamp}`;

		if (form && fieldName) {
			if (form instanceof FormGroup) {
				form.get(fieldName)?.setValue(generatedSku);
			} else if (typeof form === "object" && fieldName in form) {
				form[fieldName] = generatedSku;
			}
		}
	}

	setExpiryDate(inputEvent: Event) {
		this.productForm
			.get("expiryDate")
			?.setValue(
				new Date(
					(inputEvent.target as unknown as { value: string })?.value ??
						this._defaultExpiryDate,
				).toISOString(),
			);
	}
}
