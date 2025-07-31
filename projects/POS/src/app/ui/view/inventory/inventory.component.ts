import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ViewChild,
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
  InventoryPayload,
} from '../../models/interface';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Observable } from 'rxjs';
import { ImageCacheService } from '../../service/image-cache.service';
import { OverlayPanel } from 'primeng/overlaypanel';
import { MetadataService } from '../../service/metadata.service';
import { DOCUMENT } from '@angular/common';
import { EditInventoryComponent } from './edit-inventory/edit-inventory.component';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class InventoryComponent implements OnInit, OnDestroy {
  @ViewChild('op') op!: OverlayPanel;
  @ViewChild('editInventoryComponent')
  mode: 'create' | 'edit' = 'create';
  editInventoryComponent!: EditInventoryComponent;
  selectedProduct: any = null;
  currentPage = 0;
  rowsPerPage = 15;
  @Output() formReset = new EventEmitter<void>();

  // Use enriched products from MetadataService
  products: ProductData[] = [];
  inventories: InventoryPayload[] = [];
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
  isLoading = this.metadataService.loading$;

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

  constructor(
    private messageService: MessageService,
    private posService: PosServiceService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef,
    private imageCacheService: ImageCacheService,
    private productService: PosServiceService,
    private metadataService: MetadataService,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2
  ) {}

  onPageChange(event: any) {
    this.currentPage = event.page;
    this.rowsPerPage = event.rows;
  }

  ngOnInit(): void {
    this.originalBodyOverflow = this.document.body.style.overflow || 'auto';

    this.loadCategory();
    this.getProducts();
    this.getDiscountTypes();
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

  // In your component class

  get paginatedProducts() {
    const startIndex = this.currentPage * this.rowsPerPage;
    return this.products.slice(startIndex, startIndex + this.rowsPerPage);
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
  }

  closeDropdown(item: any) {
    item.showMenu = false;
  }

  // Use the same image loading approach as the first component
  getImageUrl(item: any): Observable<string> {
    const remoteImageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${item.productImages[0].imgNo}`;
    return this.imageCacheService.getImage(remoteImageUrl);
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

  // Load products using enriched products from MetadataService (same as first component)
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
        console.log('Products loaded:', this.products);
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
          .includes(this.searchTerm.toLowerCase());
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

  closeEditInventory() {
    this.tableSection = true;
    this.viewProduct = false;
    this.viewInventory = false;
    this.editProduct = false;
    this.addProduct = false;
    this.editInventory = false;
    this.addInventory = false;
    this.getProducts();
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
    this.tableSections = false;
  }
}
