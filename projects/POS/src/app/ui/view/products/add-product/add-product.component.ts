import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { PosServiceService } from '../../../service/pos-service.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.scss'
})
export class AddProductComponent {

  @Output() close = new EventEmitter<void>();  
  @Input() activeItem: any;
  @Input() isEditMode: boolean = false;
  productForm!: FormGroup;
  productData = {
    name: "",
    code: "",
    description: "",
    sku: "",
    weight: 0,
    initialPrice: "",
    effectivePrice: "",
    initialQuantity: 0,
    effectiveQuantity: 0,
    partNumber: "",
    tax: 0,
    branch: "",
    variant: "",
    discount: 0,
    category: "",
    id: 0,
    count: 0,
    discountType: [] as any[],
    discountValue: 0,
    image: {} as any,
    startDate: "",
    endDate: "",
    discountMinQuantity: 0,
    discountName: ''
  }
  categoryData = {
    name: "",
    code: "",
    description: "",
  }
 discountData = {
    name: "",
    value: "",
    startDate: "",
    endDate: "",
    minQuantity: "",
    discountType: [] as number[]
  }
  barcodeConfig = {
    barcodeType: 'CODE128',
    barcodeQuantity: 1
  }
  
  addProduct: boolean = false;
  productImage: any = ''
  openAddVariant: boolean = false
  isEditing: boolean = false; 
  editingIndex: number | null = null
  variants: any[] = [];
  newVariant = {
    name: '',
    price: '',
    quantity: '',
    sku: ''
  };    
  branches: any[] = [
    { label: 'HQT', value: 'headquarter' },
    {label: 'wuse', value: 'Wuse'}
    ]

  discountTypes: any[] = [];
    discountType: string[] = []
    discounts: any[] = []

    periodicDiscount: { startDate: string, endDate: string } = { startDate: '', endDate: '' };
    quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
  addSuccessfull: boolean = false

  selectedBranch: any[] = []
  selectedCategory: string=  ""
  openCategories: boolean = false
  openAddCategory: boolean = false
  openAddDiscount: boolean = false
  categories: any[] = []
  configureBarcode: boolean = false
  barcodes: any[] = [
    { label: 'CODE128 ', value: 'CODE128' },
    {label: 'CODE128 A/B/C', value: 'CODE128'},
    {label: 'EAN-13', value: 'EAN13'},
    {label: 'EAN-8', value: 'EAN8'},
    {label: 'EAN-5', value: 'EAN5'},
    {label: 'EAN-2', value: 'EAN2'},
    {label: 'UPC (A)', value: 'UPC'},
    {label: 'UPC (E)', value: 'UPC'},
    {label: 'ITF', value: 'ITF'},
    {label: 'ITF-14', value: 'ITF14'},
    {label: 'MSI10', value: 'MSI10'},
    {label: 'MSI11', value: 'MSI11'},
    {label: 'MSI1010', value: 'MSI1010'},
    {label: 'MSI1110', value: 'MSI1110'},
  ]
  constructor(
    private messageService: MessageService,
    private posService: PosServiceService,  
    private http: HttpClient, 
    private fb: FormBuilder,
  ) {
  }
  ngOnInit(): void {
    console.log(this.activeItem)
    this.loadCategory()
    this.getDiscountTypes()
    this.getDiscounts()
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(255)]],
      sku: ['', Validators.required],
      weight: [, [ Validators.min(0)]],
      initialPrice: ['', [Validators.required, Validators.pattern('^[0-9]*\.?[0-9]{0,2}$')]],
      effectivePrice: ['', [Validators.required, Validators.pattern('^[0-9]*\.?[0-9]{0,2}$')]],
      initialQuantity: [, [Validators.required, Validators.min(0)]],
      effectiveQuantity: [, [Validators.required, Validators.min(0)]],
      partNumber: ['', Validators.required],
      tax: [, [Validators.required, Validators.min(0)]],
      branch: ['', Validators.required],
      variant: [''],
      discount: [""],
      category: [''],
      image: [null], 
      startDate: [''],
      endDate: [''],
      discountMinQuantity: [0],
      discountName: [''],
      variants: [this.variants]
    });
    this.productForm.get('initialQuantity')?.valueChanges.subscribe(value => {
      this.productForm.get('effectiveQuantity')?.setValue(value, { emitEvent: false });
    });
    this.productForm.get('initialPrice')?.valueChanges.subscribe(() => {
      this.calculateEffectivePrice();
    });

    this.productForm.get('tax')?.valueChanges.subscribe(() => {
      this.calculateEffectivePrice();
    });
    if (this.isEditMode && this.activeItem) {
      this.productForm.patchValue(this.activeItem);
      if(this.activeItem.variants.length > 0){
        this.variants = this.activeItem.variants
      }
      this.productForm.get('discountType')?.setValue(this.activeItem?.discount?.discountType)
      this.productForm.get('discountName')?.setValue(this.activeItem?.discount?.name)
      this.productForm.get('discountMinQuantity')?.setValue(this.activeItem?.discount?.minQuantity)
      this.productForm.get('startDate')?.setValue(this.activeItem?.discount?.startDate)
      this.productForm.get('endDate')?.setValue(this.activeItem?.discount?.endDate)
      this.productForm.get('discountValue')?.setValue(this.activeItem?.discount?.value)
      this.productForm.get('image')?.setValue(this.activeItem?.productImages)

      
    }
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
      this.productForm.get('effectivePrice')?.setValue(parseFloat(effectivePrice.toFixed(2)), { emitEvent: false });
    }
  }

  getDiscountTypes(){
        this.posService.getDiscountTypes().subscribe(
          async (data) => {
            if (data) {
              this.discountTypes = data
            } else {
             console.log("error loading data")
            }}
        )  
    }

  getDiscounts(){
        this.posService.getDiscount().subscribe(
          async (data) => {
            if (data) {
              this.discounts = data
            } else {
             console.log("error loading data")
            }}
        )  
  }
  checkForEmptyFields(obj: any): boolean {
    return Object.values(obj).some(value => typeof value === 'string' && value.trim() === '');
  }
  onImageUpload(event: any) {
    const file = event.target.files[0];

    this.productForm.get('image')?.setValue(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }


  addToProduct() {
    const userName = sessionStorage.getItem("username");
  
    if (this.productForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: "Please ensure all required fields are filled in correctly.",
        key: 'tl',
        life: 3000
      });

    return;
  }
  
   
    const formValues = this.productForm.value;
  

    const product = {
      id: 0,
      name: formValues.name,
      code: formValues.code,
      description: formValues.description,
      sku: formValues.sku,
      weight: formValues.weight,
      initialPrice: formValues.initialPrice,
      effectivePrice: formValues.effectivePrice,
      initialQuantity: formValues.initialQuantity,
      effectiveQuantity: formValues.effectiveQuantity,
      partNumber: formValues.partNumber,
      tax: formValues.tax,
      branch: formValues.branch, 
      discount: formValues.discount,
      variants: this.variants,
      productCategory: formValues.category,
      createdBy: userName,
      createdDate: new Date().toISOString(),
    };
  

    const formData = new FormData();
    formData.append('product', JSON.stringify(product));

    if (formValues.image instanceof File) {
      formData.append('files', formValues.image);
    }
  
    console.log(formData);

    this.posService.addProduct(formData).subscribe(
      async (data) => {
        if (data) {
          this.messageService.add({
            severity: 'success',
            summary: 'Product Added',
            detail: 'Product added successfully.',
            key: 'tl',
            life: 3000
          });
          // this.addSuccessfull = true

        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: 'Failed, please try again.',
            key: 'tl',
            life: 3000
          });
        }
      },
      (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: "Unexpected error occured, please try again later3",
          key: 'tl',
          life: 3000
        });
      }
    );
  }

  updateProduct(){
    const userName = sessionStorage.getItem("username");
  
    if (this.productForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Warn',
        detail: 'All fields are required',
        key: 'tl',
        life: 3000
      });
      return;
    }
  
   
    const formValues = this.productForm.value;

    const product = {
      id: this.activeItem.id,
      name: formValues.name,
      code: formValues.code,
      description: formValues.description,
      sku: formValues.sku,
      weight: formValues.weight,
      initialPrice: formValues.initialPrice,
      effectivePrice: formValues.effectivePrice,
      initialQuantity: formValues.initialQuantity,
      effectiveQuantity: formValues.effectiveQuantity,
      partNumber: formValues.partNumber,
      tax: formValues.tax,
      branch: formValues.branch, 
      discount: formValues.discount,
      variants: this.variants,
      productImages: [] as any[],
      productCategory: formValues.category,
      createdBy: userName,
      createdDate: new Date().toISOString(),
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
            life: 3000
          });
          this.resetForm();
          this.triggerClose()
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: 'Failed, please try again.',
            key: 'tl',
            life: 3000
          });
        }
      },
      (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error,
          key: 'tl',
          life: 3000
        });
      }
    );
  }

 
  resetForm() {
    this.productForm.reset();
    this.productImage = "";
    this.variants =[]
    this.categories = []
    this.discounts = []
  }
    
   triggerClose() {
    this.close.emit();
  }
  get variantFormArray() {
    return this.productForm.get('variant') as FormArray;
  }
   addVariant() {
    if (this.isEditing && this.editingIndex !== null) {
      this.variants[this.editingIndex] = { ...this.newVariant };
      this.isEditing = false;
      this.editingIndex = null;
    } else {
      this.variants.push({ ...this.newVariant });
    }

    this.newVariant = {
      name: '',
      price: '',
      quantity: '',
      sku: ''
    };

    this.openAddVariant = false;
  
  }

  deleteVariant(index: number) {
    this.variants.splice(index, 1);
  } 
  editVariant(index: number) {
    this.isEditing = true;
    this.editingIndex = index;
    
    const selectedVariant = this.variants[index];
    this.newVariant = { ...selectedVariant }; 

    this.openAddVariant = true; 

   }
  loadCategory(){
    this.posService.getCategories().subscribe(
      async (data) => {
        console.log(data)
        if (data) {
          this.categories = data
        } else {
         console.log("error loading data")
        }}
    )  
  }
  addCategory() {
    const categoryDetails = {
      name: this.categoryData.name,
      code: this.categoryData.code,
      description: this.categoryData.description
    }

    if (this.checkForEmptyFields(this.categoryData)) {
      console.log("all fiellds are required")
        this.messageService.add({ severity: 'error', summary: 'warn', detail: 'All fields are required' , key: 'tl', life: 3000 });
    } else {
            this.posService.addCategory(categoryDetails).subscribe(
              async (data) => {
            console.log(data)
            if (data) {
              this.messageService.add({ severity: 'success', summary: 'Category Added', detail: 'Category added successfully.', key: 'tl', life: 3000 });
          this.loadCategory();
              this.categoryData = {
                name: "",
                code: "",
                description: "",
              }
            } else {
              this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Failed, please try again.', key: 'tl', life: 3000 });
            }
                },
                (error: HttpErrorResponse) => {
                  if (error.status === 500) {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Check form details and try again.', key: 'tl', life: 3000 });
                  } else if (error.status === 404) {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Error, try again.', key: 'tl', life: 3000 });
                  } else if (error.status === 0) {
                    this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'Unable to connect to the server. Please check your internet connection.', key: 'tl', life: 3000 });
                  } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An unexpected error occurred.', key: 'tl', life: 3000 });
                  }
                }
            );}
  
  }
  removeCategory(id: number) {
    this.posService.deleteCategory(id).subscribe(
      async (data) => {
        if (data) {
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Failed', 
            detail: 'Failed to delete category.', 
            key: 'tl', 
            life: 3000 
          });
        } else {
          this.loadCategory();
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Category deleted', 
            detail: 'Category deleted successfully.', 
            key: 'tl', 
            life: 3000 
          });
        }}
    )  
  }
  selectCategory(category: any) {
    console.log(
    category
    )
    this.productData.category = category
    this.productForm.get('category')?.setValue(category)
    console.log(this.productData.category)
  }

  toggleCategoryDropdown(){
    this.openCategories =!this.openCategories
  }

  addDiscount() {
    const discountDetails = {
      name: this.discountData.name,
      value: this.discountData.value,
      discountTypes: this.discountData.discountType,
      endDate: this.discountData.endDate,
      startDate: this.discountData.startDate,
      minQuantity: this.discountData.minQuantity,
    }

     this.posService.addDiscount(discountDetails).subscribe(
              async (data) => {
            console.log(data)
            if (data) {
              this.messageService.add({ severity: 'success', summary: 'Discount Added', detail: 'Discount added successfully.', key: 'tl', life: 3000 });
          this.getDiscounts();
              this.discountData = {
                name: "",
                value: "",
                startDate: "",
                endDate: "",
                minQuantity: "",
                discountType: [] as number[]
              }
            } else {
              this.messageService.add({ severity: 'error', summary: 'Failed', detail: 'Failed, please try again.', key: 'tl', life: 3000 });
            }
                },
                (error: HttpErrorResponse) => {
                  if (error.status === 500) {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Check form details and try again.', key: 'tl', life: 3000 });
                  } else if (error.status === 404) {
                    this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Error, try again.', key: 'tl', life: 3000 });
                  } else if (error.status === 0) {
                    this.messageService.add({ severity: 'error', summary: 'Server Unreachable', detail: 'Unable to connect to the server. Please check your internet connection.', key: 'tl', life: 3000 });
                  } else {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'An unexpected error occurred.', key: 'tl', life: 3000 });
                  }
                }
            )
  
  }
  selectDiscount(discount: any) {
    this.productData.category = discount
    this.productForm.get('discount')?.setValue(discount)
  }

  openGenerateBarcode() {
    this.configureBarcode = true
    this.addSuccessfull = false
  }

  generateBarcode() {
  const productCode: string = '5901234123457';
    
    const barcodeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(barcodeSvg, productCode, {
      format: this.barcodeConfig.barcodeType,
      lineColor: '#000',
      width: 1,
      height: 50,
      displayValue: true
    });


    this.convertSvgToPng(barcodeSvg);
  }
  
  convertSvgToPng(svgElement: Node) {
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
      this.generatePDF(imgData);
    };
  
    img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
  }
  
  generatePDF(imgData: string) {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
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
      pdf.addImage(imgData, 'PNG', currentX, currentY, barcodeWidth, barcodeHeight);
  
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
  getImageUrl(string: string){
    return this.posService.getProductImage(string)
    }
  getErrorMessage(controlName: string,  displayName?: string): string {
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
}
