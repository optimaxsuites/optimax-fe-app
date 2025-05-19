import { Component, OnInit , Input, Output, EventEmitter, HostListener, ViewChild} from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ProductData, ProductJSONFormat } from '../../models/interface';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs';
import { ImageCacheService } from '../../service/image-cache.service';
import { OverlayPanel } from 'primeng/overlaypanel';
import { MetadataService } from '../../service/metadata.service';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})

export class InventoryComponent {
  
  @ViewChild('op') op!: OverlayPanel;
  currentPage = 0;
  rowsPerPage = 15;
  
  products: ProductData[] = [];
  // isLoading: boolean = true
  tableSections: boolean = false;
  @Output() productUpdated = new EventEmitter<any>();
  items = [{ showMenu: false }, { showMenu: false }]; // Example list of items

  dropdownVisible: boolean[] = [];
  selectedAction!: string; 
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





  // ingredients = [
  //   { id: 1, name: 'Flour', code: 'ING001', description: 'All-purpose flour for baking and cooking', sku: 'FLR-1001', weight: 1.0, initialPrice: '500', effectivePrice: '450', initialQuantity: 50, effectiveQuantity: 40, createdDate: '2025-03-14T10:00:00.000Z', createdBy: 'Admin', partNumber: 'FLR-001', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 50, percentage: 10 }, productCategory: { id: 1, name: 'Baking' }, productImages: [{ url: 'flour.jpg', alt: 'Flour' }], variants: [] },
  //   { id: 2, name: 'Sugar', code: 'ING002', description: 'Granulated white sugar', sku: 'SGR-1002', weight: 1.0, initialPrice: '300', effectivePrice: '280', initialQuantity: 30, effectiveQuantity: 20, createdDate: '2025-03-14T10:10:00.000Z', createdBy: 'Admin', partNumber: 'SGR-002', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 20, percentage: 7 }, productCategory: { id: 2, name: 'Sweeteners' }, productImages: [{ url: 'sugar.jpg', alt: 'Sugar' }], variants: [] },
  //   { id: 3, name: 'Salt', code: 'ING003', description: 'Refined table salt', sku: 'SLT-1003', weight: 0.5, initialPrice: '100', effectivePrice: '90', initialQuantity: 20, effectiveQuantity: 15, createdDate: '2025-03-14T10:20:00.000Z', createdBy: 'Admin', partNumber: 'SLT-003', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 10, percentage: 5 }, productCategory: { id: 3, name: 'Seasoning' }, productImages: [{ url: 'salt.jpg', alt: 'Salt' }], variants: [] },
  //   { id: 4, name: 'Butter', code: 'ING004', description: 'Unsalted butter', sku: 'BTR-1004', weight: 0.5, initialPrice: '700', effectivePrice: '680', initialQuantity: 25, effectiveQuantity: 18, createdDate: '2025-03-14T10:30:00.000Z', createdBy: 'Admin', partNumber: 'BTR-004', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 20, percentage: 3 }, productCategory: { id: 4, name: 'Dairy' }, productImages: [{ url: 'butter.jpg', alt: 'Butter' }], variants: [] },
  //   { id: 5, name: 'Eggs', code: 'ING005', description: 'Fresh farm eggs', sku: 'EGG-1005', weight: 0.5, initialPrice: '150', effectivePrice: '140', initialQuantity: 50, effectiveQuantity: 35, createdDate: '2025-03-14T10:40:00.000Z', createdBy: 'Admin', partNumber: 'EGG-005', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 10, percentage: 5 }, productCategory: { id: 5, name: 'Protein' }, productImages: [{ url: 'eggs.jpg', alt: 'Eggs' }], variants: [] },
  //   { id: 6, name: 'Milk', code: 'ING006', description: 'Fresh whole milk', sku: 'MLK-1006', weight: 1.0, initialPrice: '400', effectivePrice: '380', initialQuantity: 30, effectiveQuantity: 20, createdDate: '2025-03-14T10:50:00.000Z', createdBy: 'Admin', partNumber: 'MLK-006', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 20, percentage: 5 }, productCategory: { id: 6, name: 'Dairy' }, productImages: [{ url: 'milk.jpg', alt: 'Milk' }], variants: [] },
  //   { id: 7, name: 'Cheese', code: 'ING007', description: 'Cheddar cheese', sku: 'CHS-1007', weight: 0.5, initialPrice: '900', effectivePrice: '880', initialQuantity: 15, effectiveQuantity: 10, createdDate: '2025-03-14T11:00:00.000Z', createdBy: 'Admin', partNumber: 'CHS-007', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 20, percentage: 3 }, productCategory: { id: 7, name: 'Dairy' }, productImages: [{ url: 'cheese.jpg', alt: 'Cheese' }], variants: [] },
  //   { id: 8, name: 'Tomato Sauce', code: 'ING008', description: 'Rich tomato sauce', sku: 'TMS-1008', weight: 1.0, initialPrice: '250', effectivePrice: '230', initialQuantity: 25, effectiveQuantity: 18, createdDate: '2025-03-14T11:10:00.000Z', createdBy: 'Admin', partNumber: 'TMS-008', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 20, percentage: 5 }, productCategory: { id: 8, name: 'Condiments' }, productImages: [{ url: 'tomato_sauce.jpg', alt: 'Tomato Sauce' }], variants: [] },
  //   { id: 9, name: 'Vegetable Oil', code: 'ING009', description: 'Pure vegetable oil', sku: 'VGO-1009', weight: 1.0, initialPrice: '600', effectivePrice: '580', initialQuantity: 20, effectiveQuantity: 15, createdDate: '2025-03-14T11:20:00.000Z', createdBy: 'Admin', partNumber: 'VGO-009', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 20, percentage: 3 }, productCategory: { id: 9, name: 'Oils' }, productImages: [{ url: 'vegetable_oil.jpg', alt: 'Vegetable Oil' }], variants: [] },
  //   { id: 10, name: 'Onions', code: 'ING010', description: 'Fresh onions', sku: 'ONN-1010', weight: 1.0, initialPrice: '200', effectivePrice: '180', initialQuantity: 50, effectiveQuantity: 40, createdDate: '2025-03-14T11:30:00.000Z', createdBy: 'Admin', partNumber: 'ONN-010', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 20, percentage: 10 }, productCategory: { id: 10, name: 'Vegetables' }, productImages: [{ url: 'onions.jpg', alt: 'Onions' }], variants: [] },
  //   { id: 11, name: 'Garlic', code: 'ING011', description: 'Fresh garlic cloves', sku: 'GRL-1011', weight: 0.5, initialPrice: '150', effectivePrice: '130', initialQuantity: 30, effectiveQuantity: 20, createdDate: '2025-03-14T11:40:00.000Z', createdBy: 'Admin', partNumber: 'GRL-011', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 20, percentage: 5 }, productCategory: { id: 11, name: 'Vegetables' }, productImages: [{ url: 'garlic.jpg', alt: 'Garlic' }], variants: [] },
  //   { id: 12, name: 'Rice', code: 'ING016', description: 'Long grain white rice', sku: 'RIC-1016', weight: 5.0, initialPrice: '1500', effectivePrice: '1400', initialQuantity: 40, effectiveQuantity: 30, createdDate: '2025-03-14T12:30:00.000Z', createdBy: 'Admin', partNumber: 'RIC-016', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 100, percentage: 7 }, productCategory: { id: 12, name: 'Grains' }, productImages: [{ url: 'rice.jpg', alt: 'Rice' }], variants: [] },
  // { id: 13, name: 'Beans', code: 'ING017', description: 'Black beans', sku: 'BNS-1017', weight: 2.0, initialPrice: '800', effectivePrice: '750', initialQuantity: 25, effectiveQuantity: 18, createdDate: '2025-03-14T12:40:00.000Z', createdBy: 'Admin', partNumber: 'BNS-017', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 50, percentage: 6 }, productCategory: { id: 13, name: 'Grains' }, productImages: [{ url: 'beans.jpg', alt: 'Beans' }], variants: [] },
  // { id: 14, name: 'Chicken', code: 'ING018', description: 'Fresh whole chicken', sku: 'CHK-1018', weight: 2.5, initialPrice: '2500', effectivePrice: '2400', initialQuantity: 30, effectiveQuantity: 20, createdDate: '2025-03-14T12:50:00.000Z', createdBy: 'Admin', partNumber: 'CHK-018', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 100, percentage: 4 }, productCategory: { id: 14, name: 'Meat' }, productImages: [{ url: 'chicken.jpg', alt: 'Chicken' }], variants: [] },
  // { id: 15, name: 'Beef', code: 'ING019', description: 'Lean beef', sku: 'BEF-1019', weight: 2.0, initialPrice: '3000', effectivePrice: '2900', initialQuantity: 20, effectiveQuantity: 15, createdDate: '2025-03-14T13:00:00.000Z', createdBy: 'Admin', partNumber: 'BEF-019', tax: 5, branch: 'Main Branch', variant: null, discount: { amount: 100, percentage: 3 }, productCategory: { id: 15, name: 'Meat' }, productImages: [{ url: 'beef.jpg', alt: 'Beef' }], variants: [] }
  // ];
  








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
  isLoading = this.metadataService.loading$;


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
    private cdRef: ChangeDetectorRef,
    private imageCacheService: ImageCacheService,
    private productService: PosServiceService,
    private metadataService: MetadataService
  ) {}
  onPageChange(event: any) {
    this.currentPage = event.page;
    this.rowsPerPage = event.rows;
  }
  ngOnInit(): void {
    this.loadCategory();
    this.getProducts();
    this.getDiscountTypes();
    // this.fetchProducts();

 
  }
  get paginatedProducts() {
    const startIndex = this.currentPage * this.rowsPerPage;
    return this.products.slice(startIndex, startIndex + this.rowsPerPage);

  }
  
  toggleDropdown2(item: any, event?: Event) {
    if (event) {
      event.stopPropagation(); // Stop event propagation
    }
    (item as any).showMenu = !(item as any).showMenu;
  }

  @HostListener('document:click')
  closeAllDropdowns() {
    this.items.forEach((item) => (item.showMenu = false));
  }

  closeDropdown(item: any) {
    item.showMenu = false;
  }
  getImageUrl(item: any): Observable<string> {
    const remoteImageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${item.productImages[0].imgNo}`;
    return this.imageCacheService.getImage(remoteImageUrl);
  }


  toggleView() {
    this.tableSections = !this.tableSections;
    console.log("Table Section Toggled:", this.tableSections); // Debugging
  }

  fetchProducts() {
    // this.isLoading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.paginatedProducts.splice(0, this.paginatedProducts.length, ...this.products.slice(0, this.rowsPerPage));
        // this.isLoading = false;
      },
      error: (err) => {
        console.error("Error fetching products", err);
        // this.isLoading = false;
      }
    });
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
    this.tableSections = false;  // Hide the product list
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
    this.metadataService.enrichedProduct$.subscribe(async (data) => {
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
        console.log(this.products)
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
    this.tableSections = false;  // Hide the product list
  }

  openViewInventory(item: any = {}) {
    this.activeItem = item;
    console.log(this.activeItem);
    this.viewProduct = !this.viewProduct;
    this.viewInventory = !this.viewInventory;
    this.tableSection = !this.tableSection;
    this.tableSections = false;  // Hide the product list
  }

  openViewEditForm() {
    this.viewProduct = !this.viewProduct;
    this.viewInventory = !this.viewInventory;
    this.editProduct = !this.editProduct;
    this.editInventory = !this.editInventory;
    this.tableSections = false;  // Hide the product list
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
    this.tableSections = false;  // Hide the product list
  }
  
}


