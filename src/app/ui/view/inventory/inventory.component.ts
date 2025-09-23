// inventory.component.ts - Fixed version

import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ViewChild,
  ViewChildren,
  QueryList,
  Renderer2,
  Inject,
  OnDestroy,
} from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ProductData,
  ProductJSONFormat,
  BranchDTO,
  InventoryPayload,
  InventoryResponsePayload,
} from '../../models/interface';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { ImageCacheService } from '../../service/image-cache.service';
import { OverlayPanel } from 'primeng/overlaypanel';
import { MetadataService } from '../../service/metadata.service';
import { DOCUMENT } from '@angular/common';
import { EditInventoryComponent } from './edit-inventory/edit-inventory.component';
import { BehaviorSubject } from 'rxjs';
import { isSuperUser, getUserPermissionsFor } from '../../../shared/pipes/helper';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent implements OnInit, OnDestroy {
  @ViewChildren('op') overlayPanels!: QueryList<any>;
  @ViewChild('op') op!: OverlayPanel;
  @ViewChild('editInventoryComponent')
  @HostListener('document:click', ['$event'])
  mode: 'create' | 'edit' = 'create';
  editInventoryComponent!: EditInventoryComponent;
  isLoading: boolean = false;
  isBranchSwitching: boolean = false; 
  selectedProduct: any = null;
  currentPage = 0;
  rowsPerPage = 15;
  selectedBranch: number = 1;
  branches: BranchDTO[] = [];
  @Output() formReset = new EventEmitter<void>();

  products: ProductData[] = [];
  inventories: InventoryResponsePayload[] = [];
  tableSections: boolean = false;
  @Output() productUpdated = new EventEmitter<any>();
  items = [{ showMenu: false }, { showMenu: false }];

  dropdownVisible: boolean[] = [];
  selectedAction!: string;
  originalProducts: any[] = [];
  viewProduct: boolean = false;
  viewInventory: boolean = false;
  addProduct: boolean = false;
  inventoryItems = [];
  activeItem: any = {};
  deleteModal: boolean = false;
  editProduct: boolean = false;
  editInventory: boolean = false;
  addInventory: boolean = false;

  discountType: string[] = [];
  sidebarVisible: boolean = false;

  actions = [{ label: 'Edit', value: 'edit' }];

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
  showInformation = false;
  selectedProductId: number | null = null;
  private originalBodyOverflow: string = '';
  inventoryPermission = {
  canView: false,
  canEdit: false,
  canDelete: false,
  canCreate: false,
  };  
  superUser = isSuperUser();
   productPermissions = {
  canView: false,
  canEdit: false,
  canDelete: false,
  canCreate: false,
  };  

  constructor(
    private messageService: MessageService,
    private posService: PosServiceService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef,
    private imageCacheService: ImageCacheService,
    private productService: PosServiceService,
    public metadataService: MetadataService,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2
  ) {}

  closeAllOverlays() {
    if (this.overlayPanels) {
      this.overlayPanels.forEach(overlay => {
        if (overlay.overlayVisible) {
          overlay.hide();
        }
      });
    }
  }

  onDocumentClick(event: any) {
   
    if (this.products && Array.isArray(this.products)) {
      this.products.forEach((p: any) => (p.showMenu = false));
    }
    if (this.paginatedProducts && Array.isArray(this.paginatedProducts)) {
      this.paginatedProducts.forEach((p: any) => (p.showMenu = false));
    }

    
    if (this.overlayPanels) {
      this.overlayPanels.forEach(overlay => {
        if (overlay.overlayVisible && !overlay.el.nativeElement.contains(event.target)) {
          overlay.hide();
        }
      });
    }
  }


  onPageChange(event: any) {
    this.currentPage = event.page;
    this.rowsPerPage = event.rows;
  }

  ngOnInit(): void {
    this.originalBodyOverflow = this.document.body.style.overflow || 'auto';
    this.isLoading = true;

    // Load supporting data
    this.loadCategory();
    this.getDiscountTypes();
    
    // Subscribe to branches
    this.metadataService.branches$.subscribe((data) => {
      this.branches = data;
      console.log('Branches loaded:', this.branches); 
    });
    
    if (this.selectedBranch) {
      this.metadataService.setSelectedBranch(this.selectedBranch);
    }
    if (isSuperUser()) {
          this.productPermissions = {
            canView: true,
            canEdit: true,
            canDelete: true,
            canCreate: true,
          };
        }else {
        this.productPermissions = getUserPermissionsFor('POS_PDT');
    
    }

    this.getInventories();


  }

  // FIXED: Handle branch filter change with proper loading states
  onBranchChange(branchId: number): void {
    console.log('Branch changed to:', branchId);
    this.selectedBranch = branchId;
    this.isBranchSwitching = true; // Set branch switching state
    this.metadataService.setSelectedBranch(branchId);
    this.getInventories(); // Reload data immediately
  }

  onInventoryUpdated(ev: { inventoryId: number; quantity: number; status: string }) {
    console.log('parent received updated', ev);
    const updateOne = (arr: any[]) => {
      const idx = arr?.findIndex(
        p => p?.inventoryId === ev.inventoryId || p?.__inventory?.id === ev.inventoryId
      );
      if (idx > -1) {
        arr[idx] = { ...arr[idx], quantity: ev.quantity, status: ev.status };
      }
    };

    updateOne(this.products);
    updateOne(this.paginatedProducts);
    
    this.products = [...this.products];
  }

  ngOnDestroy(): void {
    // Ensure modal is closed and body scroll is restored when component is destroyed
    if (this.showInformation) {
      this.closeInformation();
    }

    // Restore original body overflow state
    this.renderer.setStyle(
      this.document.body,
      'overflow',
      this.originalBodyOverflow
    );
    this.renderer.removeClass(this.document.body, 'modal-open');
  }

  get paginatedProducts() {
    const startIndex = this.currentPage * this.rowsPerPage;
    return this.products.slice(startIndex, startIndex + this.rowsPerPage);
  }

  // FIXED: Inventory fetching with proper loading states
  getInventories(): void {
    // Don't set isLoading if we're just switching branches
    if (!this.isBranchSwitching) {
      this.isLoading = true;
    }
    
    console.log('Loading inventories for branch:', this.selectedBranch);
    
    this.posService.getInventories().subscribe({
      next: (response) => {
        console.log('Raw inventory response:', response);
        
        if (!response || !Array.isArray(response)) {
          console.error('Invalid inventory response:', response);
          this.products = [];
          this.originalProducts = [];
          this.isLoading = false;
          this.isBranchSwitching = false;
          return;
        }

        // Store raw inventories
        this.inventories = response;
        
        // Filter by selected branch if needed
        const filteredInventories = this.selectedBranch
          ? response.filter(inv => inv.branch?.id === this.selectedBranch)
          : response;

        // Map to product format for display
        const mapped = filteredInventories.map((inv: any) => this.mapInventoryToProductRow(inv));
        console.log('Filtered and mapped inventory data:', mapped);

        // Sort by creation date (newest first)
        mapped.sort((a, b) => (b.createdDateMs ?? 0) - (a.createdDateMs ?? 0));

        this.originalProducts = mapped;
        this.products = [...mapped];
        
        console.log('Final products array:', this.products);
        this.isLoading = false;
        this.isBranchSwitching = false; // Reset branch switching state
        this.applyFilters();
      },
      error: (err) => {
        console.error('Failed to load inventories:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load inventory data'
        });
        this.originalProducts = [];
        this.products = [];
        this.isLoading = false;
        this.isBranchSwitching = false; // Reset branch switching state
      }
    });
  }

  
 private mapInventoryToProductRow(inv: any): any {
  console.log('Mapping inventory item:', inv);
  
  // Use type assertion to access the properties that might exist
  const inventory = inv as any;
  
  return {
    id: inventory.product?.id || inventory.productId || inventory.id,
    code: inventory.product?.code || '',
    sku: inventory.product?.sku || '',
    name: inventory.product?.name || `Product #${inventory.productId || inventory.id}`,
    sellingPrice: Number(inventory.product?.sellingPrice || 0),
    quantity: inventory.availableQuantity !== undefined && inventory.availableQuantity !== null
      ? Number(inventory.availableQuantity)
      : Number(inventory.quantity || 0),
    
    productCategory: inventory.product?.productCategory || null,
    imageUrl$: inventory.product?.imageUrl || 
              (inventory.product?.productImages && inventory.product.productImages[0]?.url) || 
              null,
    
    variants: inventory.product?.variants || [],
    inventoryId: inventory.id,
    branch: inventory.branch || { id: inventory.branchId },
    createdDateMs: new Date(inventory.createdDate || Date.now()).getTime(),
    
    __inventory: inventory,
    __originalProduct: inventory.product
  };
}

  toggleDropdown2(item: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    // If already open, close it (toggle)
    if (item.showMenu) {
      item.showMenu = false;
      return;
    }
    // Otherwise, close all and open this one
    if (this.products && Array.isArray(this.products)) {
      this.products.forEach((p: any) => (p.showMenu = false));
    }
    if (this.paginatedProducts && Array.isArray(this.paginatedProducts)) {
      this.paginatedProducts.forEach((p: any) => (p.showMenu = false));
    }
    item.showMenu = true;
  }

  @HostListener('document:click')
  closeAllDropdowns() {
    if (this.products && Array.isArray(this.products)) {
      this.products.forEach((p: any) => (p.showMenu = false));
    }
    if (this.paginatedProducts && Array.isArray(this.paginatedProducts)) {
      this.paginatedProducts.forEach((p: any) => (p.showMenu = false));
    }
    
   
    this.closeAllOverlays();
  }

  closeDropdown(item: any) {
    item.showMenu = false;
  }

  toggleView() {
    this.tableSections = !this.tableSections;
    console.log('Table Section Toggled:', this.tableSections);
  }

  fetchProducts() {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.paginatedProducts.splice(
          0,
          this.paginatedProducts.length,
          ...this.products.slice(0, this.rowsPerPage)
        );
      },
      error: (err) => {
        console.error('Error fetching products', err);
      },
    });
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
      {
        label: 'View',
        icon: 'pi pi-eye',
        command: () => this.openViewInventory(item),
      },
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.openEditInventory(item, 'edit'),
      },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => this.openDeleteModal(item),
      },
    ];
  }

  toggleDropdown(index: number): void {
    this.dropdownVisible[index] = !this.dropdownVisible[index];
  }

  onActionChange(item: any): void {
    if (this.selectedAction === 'edit') {
      this.openEditInventory(item, 'edit');
    }
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

  applyFilters() {
    let tempProducts = [...this.originalProducts];
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase().trim();

    // Apply category filter
    if (this.selectedCategories.length > 0) {
      tempProducts = tempProducts.filter(product =>
        this.selectedCategories.includes(product.productCategory?.id)
      );
    }

    // Apply search filter
    if (lowerCaseSearchTerm) {
      tempProducts = tempProducts.filter(product =>
        (typeof product.name === 'string' && product.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (typeof product.sku === 'string' && product.sku.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (typeof product.code === 'string' && product.code.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }
    
    this.products = tempProducts;
  }

  filterProductsBySearch(searchValue: string) {
    this.searchTerm = searchValue;
    this.applyFilters();
  }

  filterProductsByCategory() {
    this.applyFilters();
  }

  openViewProduct(item: any = {}) {
    this.activeItem = item;
    console.log(this.activeItem);
    this.viewProduct = !this.viewProduct;
    this.viewInventory = !this.viewInventory;
    this.tableSection = !this.tableSection;
    this.tableSections = false;
  }

  openViewInventory(item: any = {}) {
    this.activeItem = item;
    console.log(this.activeItem);
    this.viewProduct = !this.viewProduct;
    this.viewInventory = !this.viewInventory;
    this.tableSection = !this.tableSection;
    this.tableSections = false;
  }

  openViewEditForm() {
    this.viewProduct = !this.viewProduct;
    this.viewInventory = !this.viewInventory;
    this.editProduct = !this.editProduct;
    this.editInventory = !this.editInventory;
    this.tableSections = false;
  }

  openDeleteModal(item: any = {}) {
    this.activeItem = item;
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
    this.getInventories();
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
    this.getInventories();
    this.editInventory = false;
  }

  toggleImportDialog() {
    this.isImportDialogOpen = !this.isImportDialogOpen;
  }

  closeEditInventory() {
    this.tableSection = true;
    this.viewProduct = false;
    this.viewInventory = false;
    this.editProduct = false;
    this.addProduct = false;
    this.editInventory = false;
    this.addInventory = false;
    this.getInventories();
    this.tableSections = false;
  }

  showOverlayPanel(event: Event, product: any, op: OverlayPanel) {
    this.selectedProduct = product;
    op.toggle(event);
  }

  openInformation(product: ProductData) {
    this.selectedProductId = product.id;
    this.showInformation = true;
    this.viewInventory = false;

    // Store current scroll position
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Apply modal-open class and prevent scrolling
    this.renderer.addClass(this.document.body, 'modal-open');
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
    this.renderer.setStyle(this.document.body, 'position', 'fixed');
    this.renderer.setStyle(this.document.body, 'top', `-${scrollTop}px`);
    this.renderer.setStyle(this.document.body, 'width', '100%');

    // Disable pointer events on main content
    const mainContainer = this.document.querySelector(
      '.font-sans'
    ) as HTMLElement;
    if (mainContainer) {
      this.renderer.setStyle(mainContainer, 'pointer-events', 'none');
    }
  }

  closeInformation() {
    this.showInformation = false;
    this.selectedProductId = null;

    // Get the stored scroll position
    const scrollTop = parseInt(this.document.body.style.top || '0', 10) * -1;

    // Remove modal styles
    this.renderer.removeClass(this.document.body, 'modal-open');
    this.renderer.removeStyle(this.document.body, 'overflow');
    this.renderer.removeStyle(this.document.body, 'position');
    this.renderer.removeStyle(this.document.body, 'top');
    this.renderer.removeStyle(this.document.body, 'width');

    // Restore scroll position
    window.scrollTo(0, scrollTop);

    // Re-enable pointer events on main content
    const mainContainer = this.document.querySelector(
      '.font-sans'
    ) as HTMLElement;
    if (mainContainer) {
      this.renderer.removeStyle(mainContainer, 'pointer-events');
    }
  }

  // Enhanced backdrop click handler
  onBackdropClick(event: MouseEvent) {
    // Only close if clicking directly on the backdrop element
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal-backdrop')) {
      this.closeInformation();
    }
  }

  // Prevent scrolling when modal is open - but allow scrolling within modal
  @HostListener('window:wheel', ['$event'])
  @HostListener('window:touchmove', ['$event'])
  onPreventScroll(event: Event) {
    if (this.showInformation) {
      // Allow scrolling only within the modal content
      const target = event.target as HTMLElement;
      const modalScrollContainer = target.closest('.modal-scroll-container');
      const modalContent = target.closest('.modal-content');

      // If the event is not within the modal content, prevent it
      if (!modalContent) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      // If within modal but not in scroll container, prevent it
      if (modalContent && !modalScrollContainer) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      // Allow scrolling within the modal scroll container
      return true;
    }
    return true;
  }

  // Enhanced keyboard event handling
  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): boolean | void {
    if (this.showInformation) {
      // Handle escape key
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.closeInformation();
        return false;
      }

      // Allow arrow keys and page up/down for scrolling within modal
      const allowedKeys = [
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
      ];
      if (allowedKeys.includes(event.key)) {
        const target = event.target as HTMLElement;
        const modalScrollContainer = target.closest('.modal-scroll-container');

        if (modalScrollContainer) {
          // Allow these keys within the modal
          return true;
        }
      }

      // Prevent other keyboard scrolling on the background
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'PageUp',
          'PageDown',
          'Home',
          'End',
          ' ',
        ].includes(event.key)
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
      return false;
    }
    return true;
  }

  // Additional methods for barcode and PDF generation using the imported libraries
  generateBarcode(code: string, elementId: string) {
    JsBarcode(`#${elementId}`, code, {
      format: 'CODE128',
      width: 2,
      height: 100,
      displayValue: true,
    });
  }

  async generatePDF(elementId: string, filename: string = 'document.pdf') {
    const element = document.getElementById(elementId);
    if (element) {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    }
  }

  // Method to print product labels with barcode
  printProductLabel(item: any) {
    const barcodeElementId = `barcode-${item.id}`;
    setTimeout(() => {
      this.generateBarcode(item.code || item.sku, barcodeElementId);
    }, 100);
  }

  // Method to export product data to PDF
  exportToPDF() {
    this.generatePDF('product-table', 'products-inventory.pdf');
  }

  resetFormFields(): void {
    this.activeItem = {
      id: 0,
      name: '',
      code: '',
      description: '',
      sku: '',
      weight: 0,
      purchasePrice: '0',
      sellingPrice: '0',
      quantity: 0,
      createdDate: new Date().toISOString(),
      createdBy: '',
      partNumber: '',
      tax: { id: 0, rate: 0 },
      branch: null,
      variant: '',
      discount: null,
      productCategory: null,
      productImages: [],
      variants: [],
      supplier: null,
    };
    this.mode = 'create';
  }

  openEditInventory(item: any = {}, mode: string) {
    if (mode === 'parent') {
      this.resetFormFields();
      this.mode = 'create';
      this.activeItem = null;
    } else {
      this.mode = 'edit';
      this.activeItem = item;
    }

    this.tableSection = false;
    this.viewProduct = false;
    this.addProduct = false;
    this.editInventory = true;
    this.getInventories();
    this.tableSections = false;
  }
  

  onImageError(event: Event): void {
  const target = event.target as HTMLImageElement;
  if (target) {
    target.src = 'assets/placeholder-product.jpg';
  }
}

  // FIXED: Image URL handling with proper error handling and correct API path
  getImageUrl(item: any): Observable<string> {
    const productImages = item.productImages || 
                         item.__originalProduct?.productImages || 
                         item.__inventory?.product?.productImages;
                         
    if (productImages && productImages.length > 0 && productImages[0].imgNo) {
      // FIXED: Using correct API path from your file structure
      const remoteImageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${productImages[0].imgNo}`;
      return this.imageCacheService.getImage(remoteImageUrl).pipe(
        catchError((error) => {
          // Don't log error to console to avoid spam
          return of('assets/images/placeholder-product.jpg');
        })
      );
    }
    
    // Return placeholder without logging error
    return of('assets/images/placeholder-product.jpg');
  }
}