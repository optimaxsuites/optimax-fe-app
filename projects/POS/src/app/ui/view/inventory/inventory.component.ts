import { Component, OnInit , Input, Output, EventEmitter, HostListener} from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ProductJSONFormat } from '../../models/interface';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs';
@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
  providers: [MessageService]
})
export class InventoryComponent {

  @Output() productUpdated = new EventEmitter<any>();
  items = [{ showMenu: false }, { showMenu: false }]; // Example list of items

 
 

  toggleDropdown2(item: any, event?: Event) {
    if (event) {
      event.stopPropagation(); // Stop event propagation
    }
    item.showMenu = !item.showMenu;
  }

  @HostListener('document:click')
  closeAllDropdowns() {
    this.items.forEach((item) => (item.showMenu = false));
  }
closeDropdown(item: any) {
  item.showMenu = false;
}

// updatedProduct: any = null;

  
// updateInventory(updatedProduct: any) {
//   console.log("Product Updated:", updatedProduct);

//   // Find the product in the list
//   const index = this.products.findIndex(p => p.id === updatedProduct.id);
//   if (index !== -1) {
//     if (!this.products[index].history) {
//       this.products[index].history = [];
//     }

//     // Add update record to history
//     const updateRecord = {
//       sku: updatedProduct.sku,
//       code: updatedProduct.code,
//       name: updatedProduct.name,
//       effectivePrice: updatedProduct.effectivePrice,
//       effectiveQuantity: updatedProduct.effectiveQuantity,
//       productCategory: updatedProduct.productCategory,
//       timestamp: new Date().toISOString() // Add timestamp for tracking
//     };

//     // Store update history
//     this.products[index].history.push(updateRecord);
//     this.products[index] = { ...updatedProduct, history: this.products[index].history };

//     // ✅ Save updated products list to `localStorage`
//     localStorage.setItem('products', JSON.stringify(this.products));

//     // ✅ Also update `updatedProduct` for the view page
//     this.updatedProduct = { ...this.products[index] };
//   }

//   this.editInventory = false; // Close edit form
// }


  
//  saveProduct() {
//   if (this.activeItem) {
//     this.productUpdated.emit(this.activeItem);
//   }
//  }
  // saveProduct() {
  //   // Update the quantity of the active product
  //   const updatedProduct = this.products.find(item => item.id === this.activeItem.id);
  //   if (updatedProduct) {
  //     updatedProduct.effectiveQuantity = this.activeItem.effectiveQuantity;
  //   }
  
  //   // Trigger change detection to reflect the updated quantity in the table
  //   this.cdRef.detectChanges();
  
  //   // Close the sidebar
  //   this.sidebarVisible = false;
  
  //   // Optionally, show a toast notification or handle other UI updates
  // }

  
  products: any[] = [];
  originalProducts: any[] = [];
  viewProduct: 
  boolean = false;
  viewInventory: 
  boolean = false;
  addProduct: boolean = false;
  inventoryItems = []; 
  activeItem: any = {};
  deleteModal: boolean = false;
  editProduct: boolean = false;
  editInventory: boolean = false;


  sidebarVisible: boolean = false; // Controls sidebar visibility

  openEditInventory(item: any = {}) {
    this.activeItem = item;
    console.log('view', item);
    this.tableSection = false;
    this.viewProduct = false;
    this.addProduct = false;
    this.editInventory = !this.editInventory;
  }
  
  // closeSidebar() {
  //   this.sidebarVisible = false; // Close sidebar
  // }




  discountTypes = [
    { label: 'Periodic', value: 'periodic' },
    { label: 'Quantity Based', value: 'quantityBased' },
    { label: 'Global Discount', value: 'globalDiscount' },
  ];
  discountType: string[] = [];
  periodicDiscount: { startDate: string; endDate: string } = {
    startDate: '',
    endDate: '',
  };
  quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
  productImage: any = '';
  tableSection: boolean = true;
  searchTerm: string = '';
  selectedCategories: number[] = [];
  categories: any[] = [];
  isImportDialogOpen = false;
  constructor(
    private messageService: MessageService,
    private posService: PosServiceService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategory();
    this.getProducts();
    this.getDiscountTypes();
    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
      const productList = JSON.parse(savedProducts);
      // For example, choose the first product or the one you need:
      this.activeItem = productList[0];
    }
  }

  closeView() {
    this.viewProduct = false;
  }

  checkForEmptyFields(obj: any): boolean {
    return Object.values(obj).some(
      (value) => typeof value === 'string' && value.trim() === ''
    );
  }

  getMenuItems(item: any) {
    return [
      { label: 'View', icon: 'pi pi-eye', command: () => this.openViewInventory(item) },
      { label: 'Edit', icon: 'pi pi-pencil', command: () => this.openEditInventory(item) },
      { label: 'Delete', icon: 'pi pi-trash', command: () => this.openDeleteModal(item) }
    ];
  }

  
  dropdownVisible: boolean[] = [];
  toggleDropdown(index: number): void {
    this.dropdownVisible[index] = !this.dropdownVisible[index];
    
  }
  



  selectedAction!: string;
  actions = [
    { label: 'Edit', value: 'edit' },
    // Add more actions as needed
  ];

  // Method that is triggered when an action is selected
  onActionChange(item: any): void {
    if (this.selectedAction === 'edit') {
      this.openEditInventory(item);
    }
    // You can add more conditions for other actions like 'delete'
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
        this.products = [...this.originalProducts];
        console.log(this.products);
      } else {
        console.log('error loading data');
      }
    });
  }
  getDiscountTypes() {
    this.posService.getDiscountTypes().subscribe(async (data) => {
      console.log(data);
      if (data) {
        this.discountTypes = data;
      } else {
        console.log('error loading data');
      }
    });
  }
  loadCategory() {
    this.posService.getCategories().subscribe(async (data) => {
      console.log(data);
      if (data) {
        this.categories = data;
      } else {
        console.log('error loading data');
      }
    });
  }
  getQuantityClass(quantity: number): string {
    return quantity >= 10 ? 'quantity-available' : 'quantity-low';
  }

  getTooltipText(item: any): string {
    return `Name: ${item.name}\nCategory: ${item.productCategory?.name}\nPrice: ${item.effectivePrice}\nStock: ${item.effectiveQuantity}`;
  }
  
  
  filterProductsBySearch(searchValue: string) {
    this.searchTerm = searchValue;
    if (searchValue.length === 0) {
      if (this.selectedCategories.length === 0) {
        this.products = [...this.originalProducts];
      } else {
        this.filterProductsByCategory();
      }
    } else {
      this.products = this.originalProducts.filter((product) => {
        const matchesCategory =
          this.selectedCategories.length === 0 ||
          this.selectedCategories.includes(product.productCategory?.id);
        const matchesSearch = product.name
          .toLowerCase()
          .includes(this.searchTerm);
        return matchesCategory && matchesSearch;
      });
    }
  }
 




  filterProductsByCategory() {
    if (this.selectedCategories.length === 0) {
      this.products = [...this.originalProducts];
    } else {
      this.products = this.originalProducts.filter((product) =>
        this.selectedCategories.includes(product.productCategory?.id)
      );
    }
  }
  deleteProduct() {
    this.posService
      .deleteProduct(this.activeItem.id)
      .subscribe(async (data) => {
        if (data) {
          console.log(data);
        } else {
          this.deleteModal = false;
          this.getProducts();
          this.messageService.add({
            severity: 'success',
            summary: 'Product deleted',
            detail: `${this.activeItem.name} deleted successfully`,
            key: 'tl',
            life: 3000,
          });
        }
      });
  }

  openViewProduct(item: any = {}) {
    this.activeItem = item;
    console.log(this.activeItem);
    this.viewProduct = !this.viewProduct;
    this.viewInventory = !this.viewInventory;
    this.tableSection = !this.tableSection;
  }

  openViewInventory(item: any = {}) {
    this.activeItem = item;
    console.log(this.activeItem);
    this.viewProduct = !this.viewProduct;
    this.viewInventory = !this.viewInventory;
    this.tableSection = !this.tableSection;
  }

  openViewEditForm() {
    this.viewProduct = !this.viewProduct;
    this.viewInventory = !this.viewInventory;
    this.editProduct = !this.editProduct;
    this.editInventory = !this.editInventory;
  }

  openDeleteModal(item: any = {}) {
    this.activeItem = item;
    // this.tableSection =!this.tableSection
    console.log('modal open', this.deleteModal);
    this.deleteModal = !this.deleteModal;
  }

  // closeEditInventory() {
  //   this.tableSection = true;  // Show the table again
  //   this.editInventory = false;  // Hide the editInventory form
    
  // }


  // openEditInventory(item: any = {}) {
  //   this.activeItem = item;
  //   console.log('view', item);
  //   this.tableSection = false;
  //   this.viewProduct = false;
  //   this.addProduct = false;
  //   this.editProduct = !this.editProduct;
  //   this.editInventory = !this.editInventory;
  // }

  closeEdit() {
    this.tableSection = true;
    this.viewProduct = false;
    this.viewInventory = false;
    this.editProduct = false;
    this.addProduct = false;
    this.editInventory = false;
    this.getProducts();
  }

  openAddProdut() {
    this.tableSection = false;
    this.viewProduct = false;
    this.viewInventory = false;
    this.editProduct = false;
    this.addProduct = true;
    this.editInventory = false;
  }

  closeAddProduct() {
    this.tableSection = true;
    this.viewProduct = false;
    this.viewInventory = false;
    this.editProduct = false;
    this.addProduct = false;
    this.getProducts();
    this.editInventory = false;
  }

  toggleImportDialog() {
    this.isImportDialogOpen = !this.isImportDialogOpen;
  }
  closeEditInventory(){
    this.tableSection = true;
    this.viewProduct = false;
    this.viewInventory = false;
    this.editProduct = false;
    this.addProduct = false;
    this.editInventory = false;
    this.getProducts();
  }
}


