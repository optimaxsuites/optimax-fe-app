
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import { MessageService } from 'primeng/api';
import { PosServiceService } from '../../../service/pos-service.service';
import { ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs';
import { HistoryData, ProductData, supplierData } from '../../../models/interface';
import { NotificationsService } from 'angular2-notifications';
import { position } from 'html2canvas/dist/types/css/property-descriptors/position';
import { Options, Position, NotificationAnimationType } from 'angular2-notifications';

@Component({
  selector: 'app-edit-inventory',
  templateUrl: './edit-inventory.component.html',
  styleUrl: './edit-inventory.component.scss'
})
export class EditInventoryComponent {

   @Input() product: any;  
   @Output() productUpdated: EventEmitter<any> = new EventEmitter();
   //@ts-ignore
  @Input() activeItem: ProductData;
  @Output() close = new EventEmitter<void>();  
  isOpen = false;

  
 onSucess() {
     
 }

  notificationMessage: string = '';
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
 
  
  saveProduct() {
    console.log("active item", this.activeItem);
    if (this.activeItem) {

      let savedProducts = localStorage.getItem('products');
      let productList:HistoryData = savedProducts ? new Map(JSON.parse(savedProducts)) : new Map();
      console.log("product list", productList);
  
      // // Find the product in storage
      // const existingProduct = productList.find((p: any) => p.id === this.activeItem.id);
  
      // if (existingProduct) {
      //   // Ensure history array exists
      //   if (!existingProduct.history) {
      //     existingProduct.history = [];
      //   }
  
        // Store the previous state before updating
        // existingProduct.history.push({
        //   sku: existingProduct.sku,
        //   code: existingProduct.code,
        //   name: existingProduct.name,
        //   costPrice: existingProduct.costPrice,
        //   effectivePrice: existingProduct.effectivePrice,
        //   effectiveQuantity: existingProduct.effectiveQuantity,
        //   productCategory: existingProduct.productCategory,
        //   updatedAt: new Date() 
        // });
  
        // Update the product details
      //   Object.assign(existingProduct, this.activeItem);
      // } else {
      //   // If the product isn't found, add it with an empty history
      //   this.activeItem.history = [];
      //   productList.push(this.activeItem);
      // }
  
      const id = this.activeItem.id
      const productHistory = productList.get(id) ?? []

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
      console.log("active item", this.selectedSupplier);

      console.log("Update Record:", updateRecord);
      productHistory.push(updateRecord)
      
      productList.set(id, productHistory)


    
      

      // Retrieve existing suppliers or initialize an empty array
      const storedSuppliers = JSON.parse(localStorage.getItem('selectedSuppliers') || '[]');

        // Add the new supplier to the list
        storedSuppliers.push(this.selectedSupplier);
        console.log("storedSuppliers:", storedSuppliers);

        // Save the updated list back to localStorage

      localStorage.setItem('selectedSuppliers', JSON.stringify(storedSuppliers)); // this selects the supplier 


      console.log("Selected Supplier After Saving:", this.selectedSupplier); // saves selected suplier
        

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


  changeSelectedSupplier(Event:Event){
    const name = (Event.target as HTMLSelectElement).value;
    
    this.selectedSupplier =  this.suppliers.filter(n =>{
      return n.supplierName === name
    })[0];
    console.log("Selected Supplier:", this.selectedSupplier);
    localStorage.setItem('selectedSupplier', JSON.stringify(this.selectedSupplier));
  }
  

  selectedHeadquarters: string = '';
  headquartersOptions: string[] = ['Wuse', 'Gariki', 'Zone1'];

  toggleHeadquartersInput() {
    // Logic to open an input field for adding new headquarters
    console.log('Add new headquarters logic here');
  }
  
  deleteSelectedHeadquarters() {
    this.selectedHeadquarters;
  }

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
  }
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


// agreeTerms: boolean = false;

  submitForm() {
    // if (this.sourceName.trim()) {
    //   // Add new supplier and remove duplicates
    //   if (!this.suppliers.includes(this.sourceName.trim())) {
    //     this.suppliers.push(this.sourceName.trim());
    //   }

    //   // Save to local storage
    //   localStorage.setItem('suppliers', JSON.stringify(this.suppliers));

    //   // Reset input and close modal
    //   this.sourceName = '';
    //   this.closeModal();
    // }
    // if (!this.agreeTerms) {
    //   this.showAlert = true; // Show the alert modal
    //   return;
    // }
    
    if (!this.agreeTerms) {
      alert("You must agree to the Terms & Conditions before proceeding.");
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
    organizer: "",
    changetype: "",
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
    private messageService: MessageService,
    private posService: PosServiceService,  private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private notifications: NotificationsService
  ) {
  }

  showError(message: string, title: string = 'Error') {
    this.notifications.error(title, message, {
      timeOut: 3000,
      showProgressBar: true,
      pauseOnHover: true,
      clickToClose: true,
    });
  }

  showInfo(message: string, title: string = 'Info') {
    this.notifications.info(title, message, {
      timeOut: 3000,
      showProgressBar: true,
      pauseOnHover: true,
      clickToClose: true,
    });
  }
  notificationOptions: Options = {
    position: ['top', 'right'] as Position,
    timeOut: 3000,
    showProgressBar: true,
    pauseOnHover: true,
    clickToClose: true,
    animate: 'fade' as NotificationAnimationType, // ✅ Explicitly cast 'fade'
  };

  ngOnInit(): void {
    this.loadCategory()
    this.getDiscountTypes()
    console.log(this.activeItem)
    const savedOptions = localStorage.getItem('dropdownOptions');
    this.options = savedOptions ? JSON.parse(savedOptions) : ['Restock', 'Sale', 'Return'];
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
  onImageUpload(event: any) {
    const file = event.target.files[0];
    console.log(file)
        this.productData.image = file;

    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
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
    console.log(this.productData.category)
  }
  
  toggleCategoryDropdown(){
    this.openCategories =!this.openCategories
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

