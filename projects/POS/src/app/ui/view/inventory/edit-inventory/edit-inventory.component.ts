
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
import { Message } from 'primeng/api';
import { FormGroup } from '@angular/forms';
import { FormBuilder, Validators } from '@angular/forms'; 


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
  newBranchName: string = ''; // Renamed from newOption
  showBranchInput: boolean = false; // Renamed from showInput
  openAddDiscount: boolean = false;
  productForm!: FormGroup;


  selectDiscount(discount: any) {
    this.productData.productCategory = discount;
    this.productForm.get('discount')?.setValue(discount);
  }

  branchForm!: FormGroup;
  branchOptions: Branch[] = [
    { id: 1, name: 'Branch A' },
    { id: 2, name: 'Branch B' },
    { id: 3, name: 'Branch C' },
    { id: 4, name: 'Branch D' },
    { id: 5, name: 'Branch E' },
    { id: 6, name: 'Branch F' },
  ];
  dropdownOpen: boolean = false;
  isEditing: boolean = false; 

  selectAll() {
    const allSelected = this.branchForm.value.selectedBranches.length === this.branchOptions.length;
    this.branchForm.patchValue({ selectedBranches: allSelected ? [] : [...this.branchOptions] });
  }
  productData: ProductJSONFormat = {
    name: '',
    code: '',
    description: '',
    sku: '',
    weight: 0,
    initialPrice: '',
    effectivePrice: '',
    initialQuantity: 0,
    effectiveQuantity: 0,
    partNumber: '',
    tax: 0,
    branch: '',
    variant: '',

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
   @Input() product: any;  
   @Output() productUpdated: EventEmitter<any> = new EventEmitter();
   //@ts-ignore
  @Input() activeItem: ProductData;
  @Output() close = new EventEmitter<void>();  
  isOpen = false;


//@ts-ignore
  notificationMessage: string ;
  isVisible: boolean = false;
   // Function to show the notification



  // Form fields
  supplierName: string = '';
  contactPerson: string = '';
  email: string = '';
  phone: string = '';
  address: string = '';
  products: string = '';
  notes: string = '';
  agreeTerms: boolean = false;
  router: any;
 
  loadBranchesFromLocalStorage() {
    const storedBranches = localStorage.getItem('branches');
    if (storedBranches) {
      this.headquartersOptions = JSON.parse(storedBranches);
    }
  }

  toggleBranchInput() {
    this.showBranchInput = !this.showBranchInput;
  }

   // Add a new branch and store it in localStorage
   addBranch() {
    if (this.newBranchName.trim() !== '') {
      this.headquartersOptions.push(this.newBranchName.trim());
      localStorage.setItem('branches', JSON.stringify(this.headquartersOptions));
      this.newBranchName = ''; // Clear input
      this.showBranchInput = false; // Hide input field
    }
  }
  currentPriceAndQuantity: { quantity: number; price: number }[] = [];
  openPriceChange: boolean = false;
  saveToLocalStorage() {
    const quantity = (document.getElementById('currentQuantity') as HTMLInputElement)?.value;
    const price = (document.getElementById('currentPrice') as HTMLInputElement)?.value;
    const newEntry = { quantity: Number(quantity), price: Number(price) };

  
    if (quantity && price) {
      // Retrieve existing data from local storage (or initialize as an empty array)
      let storedData = JSON.parse(localStorage.getItem('currentPriceAndQuantity') || '[]');
  
      // Add new entry
      storedData.push({ quantity: Number(quantity), price: Number(price) });
      

      // 🔹 Check if this entry already exists to prevent duplicates
    const isDuplicate = storedData.some(
      (entry: any) => entry.quantity === newEntry.quantity && entry.price === newEntry.price
    );

    if (!isDuplicate) {
      storedData.push(newEntry);
    }
  
      // Save updated data back to local storage under a **single key**
      localStorage.setItem('currentPriceAndQuantity', JSON.stringify(storedData));
  
      // Update component variable to reflect in UI
      this.currentPriceAndQuantity = storedData;
    }
  }
  
  loadFromLocalStorage() {
    const storedData = JSON.parse(localStorage.getItem('currentPriceAndQuantity') || '[]');
    this.currentPriceAndQuantity = storedData;
  }

  saveProduct() {
    if (!this.selectedSupplier) {
      alert("Please select a supplier before updating the product.");
      return;
    }
    if (!this.activeItem.effectiveQuantity || !this.activeItem.effectivePrice) {
      alert("Please enter both quantity and price before updating the product.");
      return;
    }
    if (this.activeItem) {

      let savedProducts = localStorage.getItem('products');
      let productList:HistoryData = savedProducts ? new Map(JSON.parse(savedProducts)) : new Map();
      console.log("product list", productList);

      const id = this.activeItem.id
      const productHistory = productList.get(id) ?? []
          // Store in local storage

      // ✅ Retrieve supplier details from localStorage if not already set
        if (!this.selectedSupplier) {
          const supplierDataString = localStorage.getItem('selectedSupplier');
          this.selectedSupplier = supplierDataString ? JSON.parse(supplierDataString) : null;
        }

        // ✅ Ensure supplier exists before adding to product update
        if (!this.selectedSupplier) {
          alert("No supplier selected! Please choose a supplier before updating.");
          return;
        }

      const updateRecord = {
        ...this.activeItem,
        updatedAt: new Date(), // or use your createdDate field
        supplier: this.selectedSupplier  // ensure this.selectedSupplier contains the full supplier object
      };

      productHistory.push(updateRecord)
      
      productList.set(id, productHistory)





      // Retrieve existing suppliers or initialize an empty array
      const storedSuppliers = JSON.parse(localStorage.getItem('selectedSuppliers') || '[]');

        // Add the new supplier to the list
        storedSuppliers.push(this.selectedSupplier);
        console.log("storedSuppliers:", storedSuppliers);


        localStorage.setItem("savedBranches", JSON.stringify(this.savedBranches));
        console.log("savedBranches:", this.savedBranches);

       // Save the updated list back to localStorage
      localStorage.setItem('products', JSON.stringify([...productList]));
      // Emit event to update UI
      this.productUpdated.emit(this.activeItem);
      // this.notificationMessage = true;
      alert("Product updated successfully");
     

      // Clear the message after 3 seconds
      
      this.closeEdit();
    } else {
      console.error("No product is being edited.");
    }

  }
  hasSelectedSupplier = false;

  changeSelectedSupplier(Event:Event){
    const name = (Event.target as HTMLSelectElement).value;
    
    this.selectedSupplier =  this.suppliers.filter(n =>{
      return n.supplierName === name
    })[0];
    console.log("Selected Supplier:", this.selectedSupplier);
    localStorage.setItem('selectedSupplier', JSON.stringify(this.selectedSupplier));
    this.hasSelectedSupplier = true;
  }
  
  saveBranches() {
    console.log("Selected Branches:", this.selectedHeadquarters);
  }

  selectedHeadquarters:  string[] = []; 
  headquartersOptions: string[] = ['Wuse', 'Gariki', 'Zone1'];

  toggleHeadquartersInput() {
     const newBranch = prompt("Enter a new branch name:");
    if (newBranch && newBranch.trim() !== '') {
      this.headquartersOptions.push(newBranch.trim());
      localStorage.setItem('branches', JSON.stringify(this.headquartersOptions));
    }
  }
  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  isSelected(branch: Branch): boolean {
    return this.branchForm.value.selectedBranches.some((b: Branch) => b.id === branch.id);
  }

  selectBranch(branch: Branch) {
    let selectedBranches = [...this.branchForm.value.selectedBranches];

    if (this.isSelected(branch)) {
      selectedBranches = selectedBranches.filter(b => b.id !== branch.id);
    } else {
      selectedBranches.push(branch);
    }

    this.branchForm.patchValue({ selectedBranches });
  }



  
  // deleteSelectedHeadquarters() {
  //   if (this.selectedHeadquarters) {
  //     this.headquartersOptions = this.headquartersOptions.filter(branch => branch !== this.selectedHeadquarters);
  //     localStorage.setItem('branches', JSON.stringify(this.headquartersOptions));
  //     this.selectedHeadquarters = ''; // Reset selection
  //   }


  // branchOptions = [
  //   { name: 'Lagos Branch', code: 'LAG' },
  //   { name: 'Abuja Branch', code: 'ABJ' },
  //   { name: 'Port Harcourt Branch', code: 'PH' }
  // ];

  // selectedBranchList: string[] = []; // Stores selected branches
  // isBranchListOpen = false; // Controls dropdown visibility

  // toggleBranchList() {
  //   this.isBranchListOpen = !this.isBranchListOpen;
  // }

  // updateBranchSelection(branch: string) {
  //   if (this.selectedBranchList.includes(branch)) {
  //     this.selectedBranchList = this.selectedBranchList.filter(b => b !== branch);
  //   } else {
  //     this.selectedBranchList.push(branch);
  //   }
  // }


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


  getDisplayName(supplier: supplierData): string {
    return supplier.supplierName;
  }
  // updateProductQuantity(id: number, quantity: number): Observable<any> {
  //   return this.http.put(`https://your-api.com/products/${id}/update-quantity`, { quantity });
  // }

  selectedOrganizer: string = '';

  // updateQuantity() {
  //   const index = this.products.findIndex((p: { effectiveQuantity: number }) => 
  //     p.effectiveQuantity === this.activeItem.effectiveQuantity
  //   );
    

  //   if (index !== -1) {
  //     this.products[index] = { ...this.activeItem };
  //   } else {
  //     console.error('Product not found with the given quantity');
  //   }
  // }

  
  addOption() {
    if (this.newOption.trim() && !this.options.includes(this.newOption)) {
      this.options.push(this.newOption);
      this.updateLocalStorage();
      this.newOption = '';
      this.showInput = false;
    }
  }

  // addOption2() {
  //   if (this.newOption2.trim() && !this.options2.includes(this.newOption2)) {
  //     this.options2.push(this.newOption2);
  //     this.updateLocalStorage();
  //     this.newOption2 = '';
  //     this.showInput2 = false;
  //   }
  // }

  updateLocalStorage() {
    localStorage.setItem('dropdownOptions', JSON.stringify(this.options));
    //  localStorage.setItem('dropdownOptions', JSON.stringify(this.options2));
  }
  
  toggleInput2() {
    this.showInput2 = !this.showInput2;
  }

 
  toggleInput() {
    this.showInput = !this.showInput;
  }
 
  selectedOption: string = ""; // Ensure it's null initially

  deleteSelectedOption() {
    if (this.selectedOption) {
      this.options = this.options.filter(option => option !== this.selectedOption);
      this.updateLocalStorage();
      this.selectedOption = ''// Reset selection
    }
    
    
  }

 
  private defaultSupplier: supplierData = {
    id: 0,
    supplierName: '',
    contactPerson: '',
    email: '',
    phone: 0,
    address: '',
    products: ' ',
    notes: '',
    agreeTerms: false,
    createdAt: new Date(),
  }
  selectedSupplier = structuredClone(this.defaultSupplier);


  selectSupplier(supplier: any) {
    localStorage.setItem('selected', JSON.stringify(supplier)); // Store the entire supplier object
    this.router.navigate(['/supplier-details']);
  }

removeSelectedSupplier() {
  if (this.selectedSupplier) {
    // Remove the selected supplier from the array
    this.suppliers = this.suppliers.filter(supplier => supplier.supplierName !== this.selectedSupplier.supplierName);
    
    // Update local storage
    localStorage.setItem('suppliers', JSON.stringify(this.suppliers));

    // Reset selection
    this.selectedSupplier = structuredClone(this.defaultSupplier) ;
    this.hasSelectedSupplier = false;
  }
}

savedBranches: any[] = [];

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
  updateSelectedOption(): void {
    // Save the selected change-type to local storage
    localStorage.setItem('selectedOption', JSON.stringify(this.selectedOption));
  }
  
  selectedDate: string = '';
  saveDate() {
    // Save the selected date to local storage
    localStorage.setItem('selectedDate', this.selectedDate);
  }

   
  organizers = ['suppler_1', 'suppler_2', 'suppler_3'];
  // suppliers: string[] = []; 

//   showAlert = false;

// showTermsAlert() {
//   this.showAlert = true;
// }

// closeAlert() {
//   this.showAlert = false;
// }

discounts = [
  { id: 1, name: '10% Off' },
  { id: 2, name: '20% Off' },
  { id: 3, name: 'Buy 1 Get 1 Free' }
];

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

// agreeTerms: boolean = false;

  submitForm() {
    // if (!this.agreeTerms) {
    //   alert("You must agree to the Terms & Conditions before proceeding.");
    //   return;
    // }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    const phonePattern = /^[0-9]{10,15}$/;
    if (!emailPattern.test(this.email)) {
      alert("Please enter a valid Gmail address.");
      return;
    }
  
    if (!phonePattern.test(this.phone)) {
      alert("Enter a valid phone number (digits only, 10-15 characters).");
      return;
    }
    if (!this.supplierName || !this.contactPerson || !this.email || !this.phone) {
      alert('Please fill in all required fields.');
      return;
    }
    const storedSuppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
    const lastId = storedSuppliers.length > 0 ? storedSuppliers[storedSuppliers.length - 1].id : 0;
    
    const newSupplier:supplierData = {
      id: lastId + 1,
      supplierName: this.supplierName.trim(),
      contactPerson: this.contactPerson,
      email: this.email,
      phone: parseInt(this.phone),
      address: this.address,
      products: this.products,
      notes: this.notes,
      agreeTerms: this.agreeTerms,
      createdAt: new Date()  // Add a
    };
    // let suppliers = [];
    // const storedSuppliers = localStorage.getItem('suppliers');
    // if (storedSuppliers) {
    //   suppliers = JSON.parse(storedSuppliers);
    // }
    // let suppliers:supplierData[] = JSON.parse(localStorage.getItem('suppliers') || '[]');

   this.suppliers.push(newSupplier);

    // Save the updated list back to local storage
    localStorage.setItem('suppliers', JSON.stringify(this.suppliers))

    console.log('New Supplier Data:', this.suppliers);
    alert('Supplier added successfully!');

    // Close Modal after submission
    this.closeModal();

    // Reset Form
    this.resetForm();
  }

  // Reset Form
  resetForm() {
    this.supplierName = '';
    this.contactPerson = '';
    this.email = '';
    this.phone = '';
    this.address = '';
    this.agreeTerms = false;
    this.notes = '';
    this.products= '';
    
   
  }



  




  // trackByFn(index: number, item: string) {
  //   return item; // Tracks by value instead of reference
  // }
  
  // productData = {
  //   name: "",
  //   code: "",
  //   description: "",
  //   sku: "",
  //   weight: 0,
  //   initialPrice: "",
  //   effectivePrice: "",
  //   initialQuantity: 0,
  //   effectiveQuantity: 0,
  //   partNumber: "",
  //   tax: 0,
  //   branch: "",
  //   variant: "",
  //   discount: 0,
  //   category: "",
  //   organizer: "",
  //   changetype: "",
  //   id: 0,
  //   count: 0,
  //   discountType: [] as any[],
  //   discountValue: 0,
  //   image: {} as any,
  //   startDate: "",
  //   endDate: "",
  //   discountMinQuantity: 0,
  //   discountName: ''
  // }
  // categoryData = {
  //   name: "",
  //   code: "",
  //   description: "",
  // }
  barcodeConfig = {
    barcodeType: 'CODE128',
    barcodeQuantity: 1
  }
  
  addProduct: boolean = false;
  productImage: any = ''
  openAddVariant: boolean = false
  variants: any[] = [];
  newVariant = {
    name: '',
    price: '',
    quantity: '',
    sku: ''
  };    
  // branches: any[] = [
  //   { label: 'HQT', value: 'headquarter' },
  //   {label: 'wuse', value: 'Wuse'}
  //   ]

  discountTypes: any[] = [];
    discountType: string[] = []
    periodicDiscount: { startDate: string, endDate: string } = { startDate: '', endDate: '' };
    quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
  addSuccessfull: boolean = false

 
  changetype = ['Restock', 'Sale', 'Return'];

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
  constructor(
    private posService: PosServiceService,  private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
  ) {
  }


  ngOnInit(): void {
    this.branchForm = this.fb.group({
      selectedBranches: [[]], // Store selected objects as an array
      quantity: [null, Validators.required],
      price: [null, Validators.required]
    });
    this.loadFromLocalStorage();

   this.loadBranchesFromLocalStorage();
    this.loadCategory()
    this.getDiscountTypes()
    console.log(this.activeItem)
    const savedOptions = localStorage.getItem('dropdownOptions');
    this.options = savedOptions ? JSON.parse(savedOptions) : ['Restock'];
    //     const storedSuppliers = localStorage.getItem('suppliers');
    // this.suppliers = storedSuppliers ? JSON.parse(storedSuppliers) : [];
    // const storedSuppliers = localStorage.getItem('suppliers');
    // if (storedSuppliers) {
    //   this.suppliers = JSON.parse(storedSuppliers);
    // } else {
    //   this.suppliers = ['suppler_1', 'suppler_2', 'suppler_3']; // Default values
    // }
    // const savedSuppliers = localStorage.getItem('suppliers');
    // if (savedSuppliers) {
    //   this.suppliers = JSON.parse(savedSuppliers);
    // }
    const storedSuppliers = localStorage.getItem('suppliers');
    if (storedSuppliers) {
      this.suppliers = JSON.parse(storedSuppliers);
    }
  


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
      const newQuantity = this.activeItem.effectiveQuantity;
      const newPrice = this.activeItem.effectivePrice;
  
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
  
      // Update the UI to show all lists
      this.savedBranches = savedBranchLists;
  
      console.log(`Updated branches for product ${productId}:`, this.savedBranches);
  
      this.isEditing = false; // Reset after saving
    } else {
      console.log("No branches selected!");
    }
  }
  
  editingIndex: number | null = null; // Track which selection is being edited

  
  editAllBranches(listIndex: number) {
    if (this.savedBranches.length > listIndex) {
      const selectedList = this.savedBranches[listIndex]; // Get the selected list
  
      // Set values based on the first branch in that list
      if (selectedList.length > 0) {
        this.activeItem.effectiveQuantity = selectedList[0].quantity;
        this.activeItem.effectivePrice = selectedList[0].price;
      }
  
      this.editingIndex = listIndex; // Track which list is being edited
      this.isEditing = true; // Switch to edit mode
  
      alert(`Editing selection ${listIndex + 1}!`);
      console.log("Editing selection:", selectedList);
    }
  }
  
  deleteAllBranches() {
    this.savedBranches = []; // Clears all selected branches
  }
  
  closeEdit() {
    this.close.emit();

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

