
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { PosServiceService } from '../../../service/pos-service.service';
import { ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs';
import { HistoryData, ProductData, ProductJSONFormat, supplierData } from '../../../models/interface';
import { position } from 'html2canvas/dist/types/css/property-descriptors/position';
import { Toast } from 'primeng/toast';
import { Message, MessageService } from 'primeng/api';
import { FormGroup } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms'; 
import { MetadataService } from '../../../service/metadata.service';

interface Branch {
  id: number;
  name: string;
}

@Component({
  selector: 'app-edit-inventory',
  templateUrl: './edit-inventory.component.html',
  styleUrl: './edit-inventory.component.scss'
})

export class EditInventoryComponent {

  messages: Message[] = [];
  newBranchName: string = '';
  selectedDate: string = '';

  showBranchInput: boolean = false; 
  openAddDiscount: boolean = false;
  productForm!: FormGroup;
   // Ensure it's explicitly null


  newPrice: number = 0;
  newQuantity: number = 0;
  isVariantEditOpen: boolean = false;

  @Input() product: any;  
  @Output() productUpdated: EventEmitter<any> = new EventEmitter();

  //@ts-ignore
  @Input() activeItem: ProductData | any
  @Input() mode: string = '';  
  @Input() products: ProductData[] = [];  

  @Output() close = new EventEmitter<void>();  
  isOpen = false;
  hasSelectedSupplier = false;
  isVisible: boolean = false;


  currentPriceAndQuantity: { quantity: number; price: number }[] = [];
  openPriceChange: boolean = false;
  pricingQuantity: any;

  branchForm!: FormGroup;
  dropdownOpen: boolean = false;
  isEditing: boolean = false; 

  // sourceName = '';
  showModal = false;
  sourceInput  = '';
  options: string[] = [];
  // options2: string[] = [];
  source: string = '';
  suppliers:supplierData[]=[];
  newOption: string = '';
  newOption2: string = '';
  showInput: boolean = false;
  showInput2: boolean = false;
  sourceName: string = '';
  

  // Form fields
  supplierName: string = '';
  contactPerson: string = '';
  email: string = '';
  phone: string = '';
  address: string = '';
  // products: string = '';
  notes: string = '';
  agreeTerms: boolean = false;
  router: any;
  selectedCountryCode = '+234'; // Default to Nigeria
  phonePattern = '^\\+?[1-9]\\d{1,14}$'; // Allows international phone numbers
  phoneNumber: string = '';


  countryCodes = [
    { name: 'Nigeria', code: '+234' },
    { name: 'United States', code: '+1' },
    { name: 'United Kingdom', code: '+44' },
    { name: 'Canada', code: '+1' },
    { name: 'India', code: '+91' },
    { name: 'Germany', code: '+49' },
    { name: 'France', code: '+33' },
    { name: 'Australia', code: '+61' },
  ];



  selectedVariant: any = {
  name: '',
  price: 0,
  quantity: 0,
  };

  openAddVariant: boolean = false
  variants: any[] = [];
  newVariant = {
    name: '',
    price: '',
    quantity: '',
    sku: ''
  }; 

private defaultSupplier: supplierData = {
  id: 0,
  name: '',
  contactPerson: '',
  email: '',
  phoneNumber: 0,
  address: '',
  products: ' ',
  notes: '',
  agreeTerms: false,
  createdAt: new Date(),
}

selectedSupplier: supplierData = { ...this.defaultSupplier };
selectedBranch: any[] = []
selectedCategory: string=  ""
openCategories: boolean = false
openAddCategory: boolean = false
categories: string[] = [];
newCategory: string = '';
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

productData: ProductJSONFormat = {
  name: '',
  code: '',
  description: '',
  sku: '',
  weight: 0,
  costPrice: '',
  sellingPrice: '',
  // initialQuantity: 0,
  // effectiveQuantity: 0,
  partNumber: '',
  tax: 0,
  // branch: '',
  // variant: '',

  discount: {
    id: 0,
    name: '',
    value: 0,
    startDate: new Date(),
    endDate: new Date(),
    minQuantity: 0,
    discountType: {id: 0, code: ' ', name: ' ', description: " "},
  },

  productCategory: {
    id: 0,
    name: '',
    code: '',
    description: '',
  },
  id: 0,
  createdDate: '',
  createdBy: null,
  productImages: [],
  variants: []
}

discountOptions = ["Black Friday", "10%","Test" ]
startDate: string = ''; // Start Date Property
endDate: string = '';   // End Date Property
discountTypes: any[] = [];

showDiscountModal: boolean = false;
discountTitle: string = '';
discountRate: number = 0;
selectedDiscountOption: any;
discountStartDate: Date | undefined;
discountEndDate: Date | undefined;
minimumDiscountQuantity: number = 0;

discountOptions_2 = [
  { label: 'Percentage', value: 'percentage' },
  { label: 'Fixed Amount', value: 'fixed' }
];

priceDetails = {
  basePrice: null as number | null,
  tax: null as number | null,
  discount: null as number | null,
  effectivePrice: null as number | null,
  sellingprice: null as number | null
};

constructor(
  private posService: PosServiceService,  private http: HttpClient,
  private cdr: ChangeDetectorRef,
  private fb: FormBuilder,
  private messageService: MessageService,
  private metadataService: MetadataService
) {}


ngOnInit(): void {
  this.branchForm = this.fb.group({
    selectedBranches: [[]], // Store selected objects as an array
    quantity: [null, Validators.required],
    price: [null, Validators.required]
  });

  if (this.activeItem) {
    this.variants = this.activeItem.variants ? this.activeItem.variants : [];
  }
  console.log("this is variant", this.variants);

  this.loadFromLocalStorage();
  this.loadCategory()
  this.getDiscountTypes()
  console.log(this.activeItem)

  const savedOptions = localStorage.getItem('dropdownOptions');
  this.options = savedOptions ? JSON.parse(savedOptions) : ['Restock'];
 
  this.metadataService.supplier$.subscribe((data) => this.suppliers = data)
  console.log(this.suppliers)
  
}
selectOption(event: any) {

 this.activeItem = this.products.find(item => item.id === Number(event.target.value));
 if (this.activeItem) {
  this.variants = this.activeItem.variants ? this.activeItem.variants : [];
}
console.log(this.activeItem)
}
openVariantEditModal(variant: any) {
  console.log('Editing Variant:', variant);
  this.selectedVariant = { 
    ...variant, 
    currentQuantity: variant.quantity, 
    currentPrice: variant.price, 
    newQuantity: 0, 
    newPrice: 0 
  };
  this.isVariantEditOpen = true;
  console.log('Modal Opened with Variant:', this.selectedVariant);
}
togglePriceChange() {

  this.openPriceChange = true;
 
  // // If openPriceChange is true, replace selling price with effective price
  // if (this.openPriceChange) {
  //   this.priceDetails.sellingprice = this.priceDetails.effectivePrice;
  // }
}
updateSellingPrice() {

console.log("this is price details", this.priceDetails.effectivePrice)
 return this.priceDetails.effectivePrice ;
}



saveDiscount() {
  if (this.discountTitle && this.discountRate) {
    const newDiscount = `${this.discountTitle} - ${this.discountRate}%`;
    this.discountOptions.push(newDiscount);
    this.openAddDiscount = false; // Close modal after saving
    this.discountTitle = '';

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Discount added successfully',
      life: 3000,
      key: 'tg'
    });
  } else {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please fill in all fields',
      life: 3000,
      key: 'tg'
    });
  }
}


// Function to Close Modal
closeVariantEditModal() {
  this.isVariantEditOpen = false;
  this.selectedVariant = { name: '', price: 0, quantity: 0 }; 
}

setSelectedVariant(variant: any) {
  this.selectedVariant = variant; 
  console.log('Selected Variant Set:', this.selectedVariant);
}

// Function to Update Variant
updateVariant() {
  console.log('Before Update:', this.selectedVariant);
  const index = this.variants.findIndex(v => v.name === this.selectedVariant.name && v.sku === this.selectedVariant.sku);

  if (index !== -1) {

    console.log(`Index Found: ${index}`);
    console.log('Current Quantity:', this.selectedVariant.quantity);
    console.log('New Quantity:', this.newQuantity);
    console.log('Current Price:', this.selectedVariant.price);
    console.log('New Price:', this.newPrice);

    const historyEntry = {
      variantName: this.selectedVariant.name,
      currentPrice: this.selectedVariant.price, 
      newPrice: this.newPrice || 0,            
      currentQuantity: this.selectedVariant.quantity, 
      newQuantity: this.newQuantity || 0,          
      updatedAt: new Date()
    };

     //  Fetch all existing histories
     const storedHistory = localStorage.getItem('variantHistories');
     let allHistories = storedHistory ? JSON.parse(storedHistory) : [];
 
     // Add new history entry
     allHistories.push(historyEntry);
     console.log(`All Histories:`, allHistories);
 
     // Save back to Local Storage
     localStorage.setItem('variantHistories', JSON.stringify(allHistories));
     console.log("Local Storage Updated", allHistories);

    // Update the variant with new price and quantity
    this.variants[index].quantity = this.selectedVariant.quantity + (this.newQuantity || 0);
    this.variants[index].price = this.selectedVariant.price + (this.newPrice || 0);

    // Reset Form Inputs
    this.newQuantity = 0;
    this.newPrice = 0;

    this.closeVariantEditModal();

  } else {
    console.log('Variant Not Found');
  }

  this.closeVariantEditModal();
}

saveFullHistory() {
  // Get Existing Full Histories
  const fullHistories = JSON.parse(localStorage.getItem('fullHistories') || '[]');
  const currentHistory = JSON.parse(localStorage.getItem('variantHistories') || '[]');

  if (currentHistory.length > 0) {
    fullHistories.push({
      historyName: `History ${fullHistories.length + 1}`,
      historyEntries: currentHistory,
      savedAt: new Date(),
    });

  localStorage.setItem('fullHistories', JSON.stringify(fullHistories));
  console.log(`New Full History Saved:`, fullHistories);

  // Clear current history
  localStorage.removeItem('variantHistories');
  } else {
    console.log('❌ No History to Save');
  }

}


selectDiscount(discount: any) {
  this.productData.productCategory = discount;
  this.productForm.get('discount')?.setValue(discount);
}


saveToLocalStorage() {
  const newPricingQuantity = {
    availableQuantity: (document.getElementById('currentQuantity') as HTMLInputElement)?.value,
    restockedQuantity: (document.getElementById('restockedQuantity') as HTMLInputElement)?.value,
    currentQuantity: (document.getElementById('currentQuantity2') as HTMLInputElement)?.value,
    currentPrice: (document.getElementById('currentPrice') as HTMLInputElement)?.value,
    currentSellingPrice: (document.getElementById('currentSellingPrice') as HTMLInputElement)?.value,
  };
  
  // Retrieve existing data
  const existingData = localStorage.getItem('pricingQuantity');
  let pricingList = existingData ? JSON.parse(existingData) : [];

  // Make sure it's always an array
  if (!Array.isArray(pricingList)) {
    pricingList = [];
  }
  // Append new item without overriding the list
  pricingList.push(newPricingQuantity);
  // Save back to local storage
  localStorage.setItem('pricingQuantity', JSON.stringify(pricingList));
  console.log('Saved:', newPricingQuantity);
  console.log('Full List:', pricingList);

}
  

loadFromLocalStorage() {
  const storedData = JSON.parse(localStorage.getItem('currentPriceAndQuantity') || '[]');
  this.currentPriceAndQuantity = storedData;
}

saveProduct() {
  if (this.activeItem) {
    let savedProducts = localStorage.getItem('products');
    let productList:HistoryData = savedProducts ? new Map(JSON.parse(savedProducts)) : new Map();
    console.log("product list", productList);

    const id = this.activeItem.id
    const productHistory = productList.get(id) ?? []

    const updateRecord = {
      ...this.activeItem,
      updatedAt: new Date(),
      supplier: this.selectedSupplier  
    };

    productHistory.push(updateRecord)
    productList.set(id, productHistory)

    // Retrieve existing suppliers or initialize an empty array
    const storedSuppliers = JSON.parse(localStorage.getItem('selectedSuppliers') || '[]');

    // Add the new supplier to the list
    storedSuppliers.push(this.selectedSupplier);
    console.log("storedSuppliers:", storedSuppliers);

    // Save the updated list back to localStorage
    localStorage.setItem('products', JSON.stringify([...productList]));
    // Emit event to update UI
    this.productUpdated.emit(this.activeItem);
    this.saveToLocalStorage();

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Product updated successfully',
      life: 3000,
      key: 'tg'
    });
    console.log('service message')
      
    this.closeEdit();
    } else {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'An error occurred while updating the product',
      life: 3000,
      key: 'tg'
    });
    }

  this.saveFullHistory(); 
  // localStorage.removeItem("ful");

}

changeSelectedSupplier(Event:Event){
  const name = (Event.target as HTMLSelectElement).value;
  console.log("Selected Supplier:", this.selectedSupplier);
  localStorage.setItem('selectedSupplier', JSON.stringify(this.selectedSupplier));
  this.hasSelectedSupplier = true;
}
  

toggleDropdown() {
  this.dropdownOpen = !this.dropdownOpen;
}

getDisplayName(supplier: supplierData): string {
  return supplier.name;
}

addOption() {
  if (this.newOption.trim() && !this.options.includes(this.newOption)) {
    this.options.push(this.newOption);
    this.updateLocalStorage();
    this.newOption = '';
    this.showInput = false;
  }
}

updateLocalStorage() {
  localStorage.setItem('dropdownOptions', JSON.stringify(this.options));
}

toggleInput() {
  this.showInput = !this.showInput;
}

selectSupplier(supplier: any) {
  localStorage.setItem('selected', JSON.stringify(supplier)); // Store the entire supplier object
  this.router.navigate(['/supplier-details']);
}

openSourceModal() {
  this.showModal = true;
}

closeSourceModal() {
    this.showModal = false;
    this.sourceName = ""; 
}

openModal() {
    this.isOpen = true;   
}
  
closeModal() {
    this.isOpen = false;
}

saveSource() {
  console.log("New Source Added:", this.sourceInput);
  this.closeSourceModal();
}
  
saveDate() {
  // Save the selected date to local storage
  localStorage.setItem('selectedDate', this.selectedDate);
}

submitForm() {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  const phonePattern = /^[0-9]{10,15}$/;
  if (!emailPattern.test(this.email)) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please enter a valid email address.',
      life: 3000,
      key: 'tg'
    });
    return;
  }

  if (!phonePattern.test(this.phone)) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please enter a valid Phone number',
      life: 3000,
      key: 'tg'
    });
    return;
  }
  if (!this.supplierName || !this.contactPerson || !this.email || !this.phone) {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please fill in all required fields.',
      life: 3000,
      key: 'tg'
    });
    return;
  }
  const storedSuppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
  const lastId = storedSuppliers.length > 0 ? storedSuppliers[storedSuppliers.length - 1].id : 0;
  
  const newSupplier:supplierData = {
    id: lastId + 1,
    name: this.supplierName.trim(),
    contactPerson: this.contactPerson,
    email: this.email,
    phoneNumber: parseInt(this.phone),
    address: this.address,
    // products: this.products,
    notes: this.notes,
    agreeTerms: this.agreeTerms,
    createdAt: new Date()  
  };
  
  this.suppliers.push(newSupplier);

  // Save the updated list back to local storage
  localStorage.setItem('suppliers', JSON.stringify(this.suppliers))

  console.log('New Supplier Data:', this.suppliers);
  this.messageService.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Suplier added successfully',
    life: 3000,
    key: 'tg'
  });

  // Close Modal after submission
  this.closeModal();

    // Reset Form
  this.resetForm();

}


resetForm() {
  this.supplierName = '';
  this.contactPerson = '';
  this.email = '';
  this.phone = '';
  this.address = '';
  this.agreeTerms = false;
  this.notes = '';
  // this.products= '';
}



calculateEffectivePrice() {
  const basePrice = this.priceDetails.basePrice || 0;
  const tax = this.priceDetails.tax || 0;
  const taxAmount = (basePrice * tax) / 100;
  this.priceDetails.effectivePrice = basePrice + taxAmount;
  sellingPrice: this.priceDetails.effectivePrice;
}

removeBranch(branchId: number) {
  let selectedBranches = this.branchForm.value.selectedBranches.filter((b: { id: number; }) => b.id !== branchId);
  this.branchForm.patchValue({ selectedBranches });
}

@HostListener('document:click', ['$event'])
onClickOutside(event: Event) {
  const target = event.target as HTMLElement;
  if (!target.closest('.dropdown-container')) {
    this.dropdownOpen = false;
  }
}
  
getDiscountTypes(){
  this.posService.getDiscountTypes().subscribe(
    async (data) => {
      console.log(data)
      if (data) {
        this.discountTypes = data
      } else {
        console.log("error loading data")
      }}
  )  
  }

checkForEmptyFields(obj: any): boolean {
  return Object.values(obj).some(value => typeof value === 'string' && value.trim() === '');
}

deleteVariant(index: number) {
  this.variants.splice(index, 1);
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


getProduct() {
  this.posService.getProducts().subscribe((data) => {
    if (data) {
      this.product = data;
      console.log('Products Loaded:', this.product); // Debugging
    } else {
      console.log('Error loading products');
    }
  });
}
  
 
saveSelection(productId: number) {
  if (this.branchForm.value.selectedBranches.length > 0) {
    const newQuantity = this.activeItem?.effectiveQuantity;
    const newPrice = this.activeItem?.effectivePrice;
  
    // Retrieve previously saved branch lists for this product
    let savedBranchLists = JSON.parse(localStorage.getItem(`savedBranches_${productId}`) || '[]');
    // Create a new list entry
    const newBranchList = this.branchForm.value.selectedBranches.map((branch: any) => ({
      id: branch.id,
      name: branch.name,
      quantity: newQuantity,
      price: newPrice
    }));

    // Add the new list to the existing lists (keeping old ones)
    savedBranchLists.push(newBranchList);
    // Save back to local storage
    localStorage.setItem(`savedBranches_${productId}`, JSON.stringify(savedBranchLists));
    this.isEditing = false; 

    } else {
      console.log("No branches selected!");
    }
}
  
closeEdit() {
  this.close.emit();
  this.activeItem =  { id: 0,
    name: "",
    code: "",
    description: "",
    sku: "",
    weight: 0,
    initialPrice: "",
    effectivePrice: "",
    initialQuantity: Number,
    effectiveQuantity: Number,
    // Date String Format: "2025-02-02T22:56:31.935Z"
    createdDate: "",
  
    createdBy: "" ,
    partNumber: "",
    tax: Number,
    branch: "",
    variant: "" ,
    discount: {},
    productCategory: {},
    productImages: [],
    variants: [],
    supplier: '',
    cartPriceTotal: '',
    count: 0,
    discountedPrice: 0,
    selectedVariant: '',
    pricingQuantity: 0,
  }
}

addVariant() {
this.variants.push({ ...this.newVariant });
this.newVariant = {
  name: '',
  price: '',
  quantity: '',
  sku: ''
};
this.openAddVariant = false;
  }
}

