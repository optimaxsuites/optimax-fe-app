import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { PosServiceService } from '../../../service/pos-service.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  type AbstractControl,
} from '@angular/forms';
import {
  DiscountDTO,
  HistoryData,
  IngredientDTO,
  MeasurementUnit,
  ProductData,
  ProductJSONFormat,
  supplierData,
  TaxDTO,
  VariantDTO,
  BranchDTO
} from '../../../models/interface';
import { IndustryDataService } from '../../../service/industry-data.service';
import { MetadataService } from '../../../service/metadata.service';
import { skipUntil } from 'rxjs';

interface SelectedIngredientDTO {
  ingredient: IngredientDTO;  
  quantity: number;  
}


@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.scss',
})
export class AddProductComponent {
  @Output() close = new EventEmitter<void>();
  @Input() activeItem: any;
  @Input() isEditMode: boolean = false;
  productForm!: FormGroup;
  productData: ProductJSONFormat = {
    name: '',
    code: '',
    description: '',
    sku: '',
    weight: 0,
    costPrice: '',
    sellingPrice: '',
   
    partNumber: '',
    tax: 0,
  
    variant: '',
    
    productCategory: {
      id: 0,
      name: '',
      code: '',
      description: '',
    },
    id: 0,
    productBranch: [],
       isBundle: false, 
       bundleItems: [], 
      measurementUnit: MeasurementUnit,
      reorderThreshold: 12,
    createdBy: '',
    createdDate: '',
    productImages: [],
    variants: [],
  };
  barcodeConfig = {
    barcodeType: 'CODE128',
    barcodeQuantity: 1,
  };

  discount: {
    id: 0,
    name: '',
    value: 0,
    startDate: Date,
    endDate: Date,
    minQuantity: 0,
    discountType: { id: 0, code: '', description: '', name: '' },
  } = {
    id: 0,
    name: '',
    value: 0,
    startDate: new Date(),
    endDate: new Date(),
    minQuantity: 0,
    discountType: { id: 0, code: '', description: '', name: '' },
  }
  measurementUnits = Object.keys(MeasurementUnit)

  addProduct: boolean = false;
  productImage: any = '';
  openAddVariant: boolean = false;
  isEditing: boolean = false;
  editingIndex: number | null = null;

 

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

  /**
   * NOTE: The order of this object is important! See `get variantObjectKeys()`
   */
  private readonly defaultVariant: VariantDTO = {
    id: 0,
    name: '',
    price: 0,
    quantity: 0,
    color: '',
    size: 'Regular',
    sku: '',
    branches: []
  };
  protected readonly variantValues = {
    size: [
      'XXS',
      'XS',
      'Small',
      'Medium',
      'Regular',
      'Large',
      'XL',
      'XXL',
    ] as VariantDTO['size'][],
  };
  /**
   * The `color` field would actually be a string like "Red, Blue, Yellow" when the user is adding a new variant, however, before getting stored, it will split into an array
   */
  newVariant = this.resetVariantData();

  branches: BranchDTO[] = [
 
  ];

  discountTypes: any[] = [];
  discountType: string[] = [];
  discounts: any[] = [];
  suppliers: supplierData[] = [];
  taxes: TaxDTO[] = []

  periodicDiscount: { startDate: string; endDate: string } = {
    startDate: '',
    endDate: '',
  };
  quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
  addSuccessfull: boolean = false;

  selectedBranch: any[] = [];
  selectedCategory: string = '';
  openCategories: boolean = false;
  openAddCategory: boolean = false;
  openAddDiscount: boolean = false;
  openAddSupplier: boolean = false;
  openAddTax: boolean = false;

  openBranchData = false;
  categories: any[] = [];
  configureBarcode: boolean = false;
  barcodes = [
    { label: 'CODE128 ', value: 'CODE128' },
    // { label: 'CODE128 A/B/C', value: 'CODE128' },
    { label: 'EAN-13', value: 'EAN13' },
    { label: 'EAN-8', value: 'EAN8' },
    // { label: 'EAN-5', value: 'EAN5' },
    // { label: 'EAN-2', value: 'EAN2' },
    { label: 'UPC (A)', value: 'UPC' },
    { label: 'UPC (E)', value: 'UPC' },
    { label: 'ITF', value: 'ITF' },
    // { label: 'ITF-14', value: 'ITF14' },
    // { label: 'MSI10', value: 'MSI10' },
    // { label: 'MSI11', value: 'MSI11' },
    // { label: 'MSI1010', value: 'MSI1010' },
    // { label: 'MSI1110', value: 'MSI1110' },

    { label: 'Codabar', value: 'Codabar' },
    { label: 'CODE39', value: 'CODE39' },
  ] as const;
  /**
   * This is the branch name that is used to determine what branch data to be edited
   *
   * TODO: Make this type better. It should represent the value of each branch
   */
  //@ts-ignore
  selectedBranchFromForm: (typeof this.branches)[0]['value'];
  dataOfChosenBranches: any[] = [];

  /**
   * This should be `true` as long as the backend endpoints for the new models aren't ready
   */
  fallBackToOldForm = true;
  loading: boolean = false;
  originalProducts: ProductData[] = [];
  userBranch = "headquarters"
Array = Array;

  constructor(
    private messageService: MessageService,
    private posService: PosServiceService,
    private http: HttpClient,
    private fb: FormBuilder,
    private industryData: IndustryDataService,
    private metadataService: MetadataService
  ) {
    
  }
  ngOnInit(): void {


    

    const fbGroup: Parameters<typeof this.fb.group>[0] = {
      name: ['', Validators.required],
      code: [''],
      description: ['', [Validators.required, Validators.maxLength(255)]],
      sku: [''],
      weight: [null, [Validators.min(0)]],
      // purchasePrice: [
      //   '',
      //   [Validators.required, Validators.pattern('^[0-9]*.?[0-9]{0,2}$')],
      // ],
      costPrice: [null],
      sellingPrice: [null],
      tax: [null],
      discount: [null],
      quantity: [null],
      supplier: [null],
      partNumber: [''],
      selectedBranch: [[], Validators.required], 
      branches: this.fb.array([]),
      category: [''],
      image: [null],
      startDate: [''],
      endDate: [''],
      discountMinQuantity: [0],
      discountName: [''],
      isBundle: [false],
      bundleItems: [], 
      measurementUnit: [''],
      reorderThreshold: [null],

    };

   




    this.productForm = this.fb.group(fbGroup);
    this.fetchMetaData()


  
    if (this.isEditMode && this.activeItem) {
      this.productForm.patchValue(this.activeItem);
      if (this.activeItem.variants.length > 0) {
        this.variants = this.activeItem.variants;
      }
      this.productForm
        .get('discountType')
        ?.setValue(this.activeItem?.discount?.discountType);
      this.productForm
        .get('discountName')
        ?.setValue(this.activeItem?.discount?.name);
      this.productForm
        .get('discountMinQuantity')
        ?.setValue(this.activeItem?.discount?.minQuantity);
      this.productForm
        .get('startDate')
        ?.setValue(this.activeItem?.discount?.startDate);
      this.productForm
        .get('endDate')
        ?.setValue(this.activeItem?.discount?.endDate);
        this.productForm
        .get('category')
        ?.setValue(this.activeItem?.productCategory);
      this.productForm
        .get('discountValue')
        ?.setValue(this.activeItem?.discount?.value);
      this.productForm.get('image')?.setValue(this.activeItem?.imageUrl$);
      this.productForm
      .get('purchasePrice')
      ?.setValue(this.activeItem?.currentPurchasePrice);

    }


    if (this.userBranch !== 'headquarters') {
      this.productForm.get('selectedBranch')?.disable();
    } else {
      this.productForm.get('selectedBranch')?.enable();
    }
    
    this.productForm.get('selectedBranch')?.valueChanges.subscribe(() => {
      this.updateBranches();
    });


  }

  fetchMetaData(){
    this.metadataService.discount$.subscribe(data => (this.discounts = data));
    this.metadataService.category$.subscribe(data => (this.categories = data));
    this.metadataService.supplier$.subscribe(data => (this.suppliers = data));
    this.metadataService.discountTypes$.subscribe(data => (this.discountTypes = data));
    this.metadataService.taxes$.subscribe(data => (this.taxes = data));
    this.metadataService.branches$.subscribe(data => {
      this.branches = data;
  
      if (this.branches.length > 0) {
        this.productForm.get('selectedBranch')?.setValue(this.branches[1]);
        this.newVariant.branches = [this.branches[1]]
      }
    });
    
    this.metadataService.products$.subscribe(data => {this.originalProducts = data});


  }
  get branchess(): FormArray<FormGroup>  {
    return this.productForm.get('branches') as FormArray<FormGroup> ;
  }

  get selecteddBranch() {
    return this.productForm.get('selectedBranch')?.value;
  }

  getVariants(branch: AbstractControl) {
    return branch.get('variants') as FormArray<FormGroup>;
  }

  get currentBranch() {
    return this.userBranch !== 'headquarters' ?  this.selecteddBranch : this.newVariant.branches;
  }
  
  set currentBranch(value: any) {
    if (this.userBranch === 'headquarters') {
      this.selectedBranch = value;
    } else {
      this.newVariant.branches = value;
    }
  }
  

  addIngredient(selectedIngredient: IngredientDTO, quantity: number) {
    const ingredientExists = this.selectedIngredients.find(
        (item) => item.ingredient.id === selectedIngredient.id
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
 loadVariants(){

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
        color: variant.color || 'Other'.split(',').map((val) => val.trim()),
        size: variant.size || 'Regular',
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

 loadBranches(){
  const branchDataList = this.activeItem?.branchDetails?.map((detail: any) => {
    const branchId = detail.productBranch?.branchId;
    const fullBranch = this.branches.find((branch: any) => branch.id === branchId);
    return fullBranch; 
  });
  this.productForm.get('selectedBranch')?.setValue(branchDataList);

  this.populateEditBranches();

 }
onIngredientSelect(selectedItems: any[]) {
  console.log(selectedItems)
  this.selectedIngredients = selectedItems.map(ingredient => ({
    ingredient: ingredient,
    quantity: 1, // Default quantity
  }));

  console.log(this.selectedIngredients)

}
removeIngredient(index: number) {
  this.selectedIngredients.splice(index, 1);
}
  
updateBranches() {
  const branchArray = this.branchess;
  const selectedBranches = this.selecteddBranch;

  if (selectedBranches.length > 1) {
    selectedBranches.forEach((branch: any) => {
      const exists = branchArray.controls.some(ctrl => ctrl.get('branchName')?.value.name === branch.name);

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
          })
        );
      }
    });
  } else {
    console.log('Only one branch selected');
  }
}


  populateEditBranches() {
    this.selecteddBranch.forEach((branch: any) => {
      const branchId = branch.id;
  
      const detail = this.activeItem?.branchDetails?.find(
        (d: any) => d.productBranch?.branchId === branchId
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
      })
    );
  });
}


      this.branchess.push(
        this.fb.group({
          branchName: [branch],
          sellingPrice: [detail.branchData?.price ?? 0, Validators.required],
          costPrice: [detail.branchData?.purchasePrice ?? 0, Validators.required],
          quantity: [detail.branchData?.quantity ?? 0, Validators.required],
          tax: [detail.branchData?.taxId || null, Validators.required],
          supplier: [detail.branchData?.supplierId || null, Validators.required],
          discount: [detail.branchData?.discountId || null],
          variants: variantsFormArray,
        })
      );
    });
  }
  

  removeBranch(index: number) {
    const branchToRemove = this.branchess.at(index).get('branchName')?.value;
    this.branchess.removeAt(index);
    const updatedBranches = this.productForm.controls['selectedBranch'].value.filter(
      (branch: string) => branch !== branchToRemove
    );
    this.productForm.controls['selectedBranch'].setValue(updatedBranches);
    this.variants.forEach(variant => {
      variant.branches = variant.branches?.filter(branch => branch !== branchToRemove);
    });
       this.variants = this.variants.filter(variant => variant.branches && variant.branches.length > 0);

  }
  removeVariant(branch: AbstractControl, variantIndex: number) {
    const variantsArray = branch.get('variants') as FormArray;
    const variantToRemove = variantsArray.at(variantIndex).get('name')?.value;
    const variantToId = variantsArray.at(variantIndex).get('id')?.value;

    const branchName = branch.get('branchName')?.value;

    variantsArray.removeAt(variantIndex);
    this.variants.forEach(variant => {
      if (variant.name === variantToRemove) {
        variant.branches = variant.branches?.filter(branch => branch !== branchName);
      }
    });
       this.variants = this.variants.filter(variant => variant.branches && variant.branches.length > 0);
    if(this.isEditMode){
      this.posService.deleteBranchVariantData(variantToId).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Deleted',
            detail: `Variant '${variantToRemove}' deleted successfully.`,
            key: 'tl',
            life: 3000,
          });
  
          this.activeItem.branchDetails = this.activeItem.branchDetails.map((detail: any) => {
            if (detail.branchName === branchName) {
              return {
                ...detail,
                variants: detail.variants.filter((v: any) => v.id !== variantToId)
              };
            }
            return detail;
          }).filter((detail: any) => detail.variants.length > 0);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to delete variant '${variantToRemove}'`,
            key: 'tl',
            life: 3000,
          });
        }
      });
    }

  }
  
  
  getPricingVariants(branchIndex: number): FormArray {
    return this.branchess.at(branchIndex).get('pricingVariants') as FormArray;
  }

  newPricingVariant(): FormGroup {
    return this.fb.group({
      variantName: ['', Validators.required],
      price: ['', Validators.required]
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
    const basePrice = this.productForm.get('initialPrice')?.value;
    const taxPercentage = this.productForm.get('tax')?.value;

    if (basePrice && taxPercentage) {
      const effectivePrice = basePrice * (1 + taxPercentage / 100);
      this.productForm
        .get('effectivePrice')
        ?.setValue(parseFloat(effectivePrice.toFixed(2)), { emitEvent: false });
    }
  }

  checkForEmptyFields(obj: any): boolean {
    return Object.values(obj).some(
      (value) => typeof value === 'string' && value.trim() === ''
    );
  }
  onImageUpload(event: any) {
    const file = event.target.files[0];

    this.productForm.get('image')?.setValue(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productImage = e.target.result;
        console.log(this.productImage);
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
            a.createdDate[5]
          );
          const dateB = new Date(
            b.createdDate[0],
            b.createdDate[1] - 1,
            b.createdDate[2],
            b.createdDate[3],
            b.createdDate[4],
            b.createdDate[5]
          );
          return dateB.getTime() - dateA.getTime();
        });
      } else {
        console.log('error loading data');
      }
    });
  }
  addToProduct() {
    const userName = sessionStorage.getItem('username');
    this.loading = true
    // console.log(this.productForm);
    if (this.productForm.invalid) {
      for (const controlName in this.productForm.controls) {
        const control = this.productForm.controls[controlName];
        if (control.invalid) {
          console.log(`${controlName} is invalid. Errors:`, control.errors);
        }
      }
      console.log(this.productForm)
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please ensure all required fields are filled in correctly.',
        key: 'tl',
        life: 3000,
      });
      this.loading = false

      return;
    }

    const formValues = this.productForm.value;

    // TODO: Add the rest of the fields, `variant` and `productImages`
    // console.log("branches", this.branchess.value)
    // console.log(formData);

   

    if(this.selecteddBranch?.length > 1){
      this.createProductPerBranch(this.branchess.value)
    }else {

      const product = {
        id: 0,
        name: formValues.name,
          code: formValues.code,
          partNumber: formValues.partNumber,
          description: formValues.description,
          measurementUnit: formValues.measurementUnit,
          isBundle: formValues.isBundle,
          bundleItems: formValues.bundleItems || [],
          productCategoryId: formValues.category.id,
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
          formValuesId: this.selecteddBranch.id, 
          createdBy: userName,
          createdDate: new Date().toISOString(),
      
      };

      console.log(product)
      const formData = new FormData();
        formData.append('product', JSON.stringify(product));
        if (formValues.image instanceof File) {
          formData.append('files', formValues.image);
        }

      this.posService.addProduct(formData).subscribe(
      async (data) => {
        if (data) {
          // let savedProducts = localStorage.getItem('products');
          // let productList: HistoryData = savedProducts
          //   ? new Map(JSON.parse(savedProducts))
          //   : new Map();
          // productList.set(data.id, data);
          // localStorage.setItem('products', JSON.stringify([...productList]));
          console.log(data)
          this.messageService.add({
            severity: 'success',
            summary: 'Product Added',
            detail: 'Product added successfully.',
            key: 'tl',
            life: 3000,
          });
          this.loading = false;
          this.addSuccessfull = true;
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: 'An error occured. Please try adding the product again.',
            key: 'tl',
            life: 3000,
          });
          this.loading = false;
        }
      },
      (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Unexpected error occured, please try again later.',
          key: 'tl',
          life: 3000,
        });
      }
    );
    }
  }

  async createProductPerBranch( branches: any[]) {
    this.loading = true;
    const formValues = this.productForm.value;
    const userName = sessionStorage.getItem('username');
  
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
        };
        console.log(productPayload)
        const formData = new FormData();
        formData.append('product', JSON.stringify(productPayload));
        if (formValues.image instanceof File) {
          formData.append('files', formValues.image);
        }
        console.log(formData)
        await this.posService.addProduct(formData).toPromise();
      }
  
      this.messageService.add({
        severity: 'success',
        summary: 'Product Added',
        detail: 'Products created for all branches successfully.',
        key: 'tl',
        life: 3000,
      });
      this.addSuccessfull = true;
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Failed',
        detail: 'An error occurred. Please try again.',
        key: 'tl',
        life: 3000,
      });
    } finally {
      this.loading = false;
    }
  }
  
  autoGenerateSku() {
    const formValue = this.productForm.value;


    if (formValue.name && !formValue.sku) { 
      const prefix = formValue.name.substring(0, 3).toUpperCase();
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      this.productForm.get('sku')?.setValue(`${prefix}-${randomNumber}`);

      if(this.variants.length && this.selectedBranch.length< 2){
        this.variants.forEach(v => v.sku = this.generateVariantSku(this.productForm.get(
          'sku')?.value, v))
      }


    }


    if(formValue.name && this.selecteddBranch.length > 1){
      this.branchess.controls.forEach((branchControl: FormGroup) => {
        const updatedSku = this.autoGenerateBranchSku(); 
        branchControl.patchValue({
          sku: updatedSku,  
        });

        const variantsArray = branchControl.get('variants') as FormArray;
      if (variantsArray && variantsArray.length > 0) {
        variantsArray.controls.forEach((variantControl: AbstractControl, index: number) => {
          const variantGroup = variantControl as FormGroup;
          const variantSku = variantGroup.get('sku')?.value || '';

          const parts = variantSku.split('-');
          const newPrefix = branchControl.get('sku')?.value
          const newVariantSku = `${newPrefix}-${parts.slice(1).join('-')}`;
          variantGroup.patchValue({
            sku: newVariantSku,
          });
        });
    }
      });
    }
  }
  autoGenerateBranchSku(): string | null {
    const formValue = this.productForm.value;

    if (formValue.name) { 
      const prefix = formValue.name.substring(0, 3).toUpperCase();
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}-${randomNumber}`
    }
return 'AUTO'
    
  }
  generateVariantSku(parentSku: string, variant: VariantDTO) {
    if (!parentSku) {
     return 'Auto'
    }
  
    let suffix = '';
  
    if (variant.color) {
      suffix += '-' + variant.color?.toUpperCase();
    }
    if (variant.size) {
      suffix += '-' + variant.size?.toUpperCase();
    }
  
    if (!suffix && variant.name) {
      const words = variant.name.split(' ');
      suffix += '-' + words.map(word => word.charAt(0).toUpperCase()).join('');
    }
  
    if (!suffix) {
      suffix = '-' + Math.floor(1000 + Math.random() * 9000);
    }
  
    return `${parentSku}${suffix}`;
  }
  
  
  async updateProduct() {
    const userName = sessionStorage.getItem('username');

    if (this.productForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Warn',
        detail: 'All fields are required.',
        key: 'tl',
        life: 3000,
      });
      return;
    }

    const formValues = this.productForm.value;

    const product =  {
      id: this.activeItem.id,
        name: formValues.name,
        code: formValues.code,
        partNumber: formValues.partNumber,
        description: formValues.description,
        measurementUnit: formValues.measurementUnit,
        isBundle: formValues.isBundle,
        bundleItems: formValues.bundleItems || [],
        productCategoryId: formValues.category.id,
        variants: formValues.variants || [],
        sku: formValues.sku,
        purchasePrice: formValues.costPrice,
        sellingPrice: formValues.sellingPrice,
        quantity: formValues.quantity,
        weight: formValues.weight,
        reorderThreshold: formValues.reorderThreshold,
        taxId: formValues.tax?.id,
        discountId: formValues.discount?.id,
        supplierId: formValues.supplier?.id,
        branchId: formValues.branch.id, 
        createdBy: userName,
        createdDate: new Date().toISOString(),

        productImages: formValues.productImages || [],
      };

    const formData = new FormData();
    formData.append('product', JSON.stringify(product));

    if (formValues.image instanceof File) {
      formData.append('files', formValues.image);
    }
    if (formValues.image) {
      product.productImages.push(...formValues.image);

      formData.append('files', new Blob(), formValues.image);
    }
    console.log(formData);

    this.posService.addProduct(formData).subscribe(
      async (data) => {
        if (data) {
          this.messageService.add({
            severity: 'success',
            summary: 'Product updated',
            detail: 'Product updated successfully.',
            key: 'tl',
            life: 3000,
          });
          this.resetForm();
          this.triggerClose();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: 'Failed, please try again.',
            key: 'tl',
            life: 3000,
          });
        }
      },
      (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error,
          key: 'tl',
          life: 3000,
        });
      }
    );

  }

  resetForm() {
    this.productForm.reset();
    this.productImage = '';
    this.variants = [];
    this.categories = [];
    this.discounts = [];
  }

  triggerClose() {
    this.close.emit();
  }
  get variantFormArray() {
    return this.productForm.get('variant') as FormArray;
  }
  
  addVariant() {
    //@ts-ignore
    const variant: VariantDTO = structuredClone(this.newVariant);
  
    const selectedBranch = this.productForm.get('selectedBranch')?.value;
  
    if (Array.isArray(selectedBranch) && selectedBranch.length > 1) {
  
      const branchArray = this.branchess.controls;
  
      variant.branches?.forEach((branchName) => {
        const targetBranches = branchArray.filter(
          (branch) => branch.get('branchName')?.value.name === branchName.name
        );
  
        if (targetBranches.length > 0) {
          targetBranches.forEach((targetBranch) => {
            const variantsArray = targetBranch.get('variants') as FormArray;
  
            if (this.isEditing && this.editingIndex !== null) {
              const variantIndex = variantsArray.controls.findIndex(
                (control) => control.get('sku')?.value === variant.sku
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
                  sku: [this.generateVariantSku(targetBranch.get('sku')?.value, variant)],
                  quantity: [variant.quantity],
                  size: [variant.size, Validators.required],
                  color: [variant.color, Validators.required]

                })
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
        variant.sku = this.generateVariantSku(this.productForm.get(
          'sku')?.value, variant);
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
    if(this.isEditMode){
      this.removeAllVariants()
    }

  }

  removeAllVariants() {
    const variantIds: number[] = [];

    this.branchess.controls.forEach((branchGroup: FormGroup) => {
      const variants = branchGroup.get('variants') as FormArray<FormGroup>;
  
      if (variants && variants.length > 0) {
        variants.controls.forEach((variantGroup: FormGroup) => {
          const id = variantGroup.get('id')?.value;
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
            severity: 'success',
            summary: 'Variant Deleted',
            detail: `Variant with ID ${id} deleted successfully.`,
            key: 'tl',
            life: 3000,
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to delete variant with ID ${id}.`,
            key: 'tl',
            life: 3000,
          });
        },
      });
    });
  
     // Clear from form after deletion
  this.branchess.controls.forEach((branchGroup: FormGroup) => {
    const variants = branchGroup.get('variants') as FormArray;
    variants.clear(); // Remove all variants from the UI
  });

  // Also clear from this.variants if you're tracking it separately
  this.variants = [];
  }
  
  editVariant(index: number) {
    this.isEditing = true;
    this.editingIndex = index;

    const selectedVariant = this.variants[index];
    console.log(selectedVariant)
    this.newVariant = {
      ...selectedVariant,
      color: selectedVariant.color,
      branches: selectedVariant.branches || []
    };

    this.openAddVariant = true;
  }
  // loadCategory() {
  //   this.posService.getCategories().subscribe(async (data) => {
  //     console.log(data);
  //     if (data) {
  //       this.categories = data;
  //     } else {
  //       console.log('error loading data');
  //     }
  //   });
  // }
  addCategory() {
    let categoryData = this.productData.productCategory;

    const categoryDetails = {
      name: categoryData.name,
      code: categoryData.code,
      description: categoryData.description,
    };

    if (this.checkForEmptyFields(categoryData)) {
      console.log('all fiellds are required');
      this.messageService.add({
        severity: 'error',
        summary: 'warn',
        detail: 'All fields are required',
        key: 'tl',
        life: 3000,
      });
    } else {
      this.posService.addCategory(categoryDetails).subscribe(
        async (data) => {
          console.log(data);
          if (data) {
            this.messageService.add({
              severity: 'success',
              summary: 'Category Added',
              detail: 'Category added successfully.',
              key: 'tl',
              life: 3000,
            });
            this.categories.push(data);
            categoryData = {
              id: 0,
              name: '',
              code: '',
              description: '',
            };
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: 'Failed, please try again.',
              key: 'tl',
              life: 3000,
            });
          }
        },
        (error: HttpErrorResponse) => {
          if (error.status === 500) {
            this.messageService.add({
              severity: 'error',
              summary: 'Authentication Failed',
              detail: 'Check form details and try again.',
              key: 'tl',
              life: 3000,
            });
          } else if (error.status === 404) {
            this.messageService.add({
              severity: 'error',
              summary: 'Authentication Failed',
              detail: 'Error, try again.',
              key: 'tl',
              life: 3000,
            });
          } else if (error.status === 0) {
            this.messageService.add({
              severity: 'error',
              summary: 'Server Unreachable',
              detail:
                'Unable to connect to the server. Please check your internet connection.',
              key: 'tl',
              life: 3000,
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'An unexpected error occurred.',
              key: 'tl',
              life: 3000,
            });
          }
        }
      );
    }
  }
  removeCategory(id: number) {
    this.posService.deleteCategory(id).subscribe(async (data) => {
      if (data) {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: 'Failed to delete category.',
          key: 'tl',
          life: 3000,
        });
      } else {
        // this.loadCategory();
        this.messageService.add({
          severity: 'success',
          summary: 'Category deleted',
          detail: 'Category deleted successfully.',
          key: 'tl',
          life: 3000,
        });
      }
    });
  }
 
 
  selectCategory(category: any) {
    console.log(category);
    this.productData.productCategory = category;
    this.productForm.get('category')?.setValue(category);
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
            severity: 'success',
            summary: 'Discount Added',
            detail: 'Discount added successfully.',
            key: 'tl',
            life: 3000,
          });
          // this.getDiscounts();
          // TODO: Check whether this piece of code is worth it...
          discountObj = {
            id: 0,
            name: '',
            value: 0,
            startDate: new Date(),
            endDate: new Date(),
            minQuantity: 0,
            discountType: { id: 0, code: '', name: '', description: '' },
          };
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: 'Failed, please try again.',
            key: 'tl',
            life: 3000,
          });
        }
      },
      (error: HttpErrorResponse) => {
        if (error.status === 500) {
          this.messageService.add({
            severity: 'error',
            summary: 'Authentication Failed',
            detail: 'Check form details and try again.',
            key: 'tl',
            life: 3000,
          });
        } else if (error.status === 404) {
          this.messageService.add({
            severity: 'error',
            summary: 'Authentication Failed',
            detail: 'Error, try again.',
            key: 'tl',
            life: 3000,
          });
        } else if (error.status === 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Server Unreachable',
            detail:
              'Unable to connect to the server. Please check your internet connection.',
            key: 'tl',
            life: 3000,
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'An unexpected error occurred.',
            key: 'tl',
            life: 3000,
          });
        }
      }
    );
  }
 
 
  selectDiscount(discount: any) {
    this.productData.productCategory = discount;
    this.productForm.get('discount')?.setValue(discount);
  }

  openGenerateBarcode() {
    this.configureBarcode = true;
    this.addSuccessfull = false;
  }

  get isSKUValid() {
    return (
      typeof this.productForm.get('sku')?.value == 'string' &&
      this.productForm.get('sku')?.value != ''
    );
  }

  printBarcode(variantSKU?: string) {
    this.generateBarcode(variantSKU, true);
  }

  generateBarcode(variantSKU?: string, shouldPrint?: boolean) {
    const sku = this.productForm.get('sku')?.value;

    if (typeof sku === 'string') {
      const productCode = variantSKU ? `${sku}-${variantSKU}` : sku;

      for (let i = 0; i < this.barcodeConfig.barcodeQuantity; i++) {
        const barcodeSvg = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg'
        );
        JsBarcode(barcodeSvg, productCode, {
          format: this.barcodeConfig.barcodeType,
          lineColor: '#000',
          width: 2,
          height: 125,
          displayValue: true,
        });

        this.convertSvgToPng(barcodeSvg, shouldPrint);
      }
    } else {
      alert('Please fill in the SKU with valid data.');
    }
  }

  convertSvgToPng(svgElement: Node, shouldPrint?: boolean) {
    const svgString = new XMLSerializer().serializeToString(svgElement);

    const encodedSvg = encodeURIComponent(svgString);

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const imgData = canvas.toDataURL('image/png');
      if (shouldPrint) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
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
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
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
        'PNG',
        currentX,
        currentY,
        barcodeWidth,
        barcodeHeight
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

    pdf.save('barcodes.pdf');
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
          case 'required':
            return `${name} is required.`;
          case 'pattern':
            return `${name} has an invalid format.`;
          case 'min':
            return `${name} must be at least ${errors['min'].min}.`;
          case 'minlength':
            return `${name} must be at least ${errors['minlength'].requiredLength}.`;
          case 'maxlength':
            return `${name} should not exceed ${errors['maxlength'].requiredLength} characters.`;
          default:
            return `${name} has an error.`;
        }
      }
    }

    return '';
  }

  /**
   * Yes this looks needlessly complex :p
   */
  protected get variantObjectKeys() {
    return (
      Object.keys(this.defaultVariant) as (keyof typeof this.defaultVariant)[]
    )
      .filter((key) => key != 'id' && key != 'branches')
      .map((key) => {
        if (key == 'sku') return key.toLocaleUpperCase();
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
    return (this.productForm.get('branch') as FormControl).value;
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
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';

    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const timestamp = Date.now().toString().slice(-5);
    const generatedSku = `${randomPart}-${timestamp}`;
  
    if (form && fieldName) {
      if (form instanceof FormGroup) {
        form.get(fieldName)?.setValue(generatedSku);
      } else if (typeof form === 'object' && fieldName in form) {
        form[fieldName] = generatedSku;
      }
    }
  }
}
