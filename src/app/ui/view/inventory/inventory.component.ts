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
})

export class InventoryComponent {


  @Output() productUpdated = new EventEmitter<any>();
  items = [{ showMenu: false }, { showMenu: false }]; // Example list of items

  dropdownVisible: boolean[] = [];
  selectedAction!: string; 
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
  addInventory: boolean = false;
  mode: string = '';
  discountType: string[] = [];
  sidebarVisible: boolean = false; // Controls sidebar visibility

  actions = [
    { label: 'Edit', value: 'edit' },
  ];

  discountTypes = [
    { label: 'Periodic', value: 'periodic' },
    { label: 'Quantity Based', value: 'quantityBased' },
    { label: 'Global Discount', value: 'globalDiscount' },
  ];

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
 
  }

  
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

  openEditInventory(item: any = {}, mode: string) {
    this.mode = mode;

   if (mode === 'parent') {
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
   if(mode === 'child'){
    this.activeItem = item || {};

   }
    this.tableSection = false;
    this.viewProduct = false;
    this.addProduct = false;
    this.editInventory = !this.editInventory;
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
      { label: 'Edit', icon: 'pi pi-pencil', command: () => this.openEditInventory(item, 'child') },
      { label: 'Delete', icon: 'pi pi-trash', command: () => this.openDeleteModal(item) }
    ];
  }
 
  
  toggleDropdown(index: number): void {
    this.dropdownVisible[index] = !this.dropdownVisible[index];
    
  }


  onActionChange(item: any): void {
    if (this.selectedAction === 'edit') {
      this.openEditInventory(item, 'child');
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
    return `Name: ${item.name}\nCategory: 
    ${item.productCategory?.name}\nPrice: 
    ${item.effectivePrice}\nStock: ${item.effectiveQuantity}`;
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
    this.addInventory = false;
    this.getProducts();
  }
}


