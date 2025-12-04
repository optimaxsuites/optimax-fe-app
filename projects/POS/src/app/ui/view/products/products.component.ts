import { Component, OnInit, ViewChildren, QueryList, HostListener } from "@angular/core";
import { PosServiceService } from "../../service/pos-service.service";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  BranchDTO,
  DiscountDTO,
  MeasurementUnit,
  ProductCategoryPOST,
  ProductData,
  ProductJSONFormat,
  ProductJSONFormatPOST,
} from "../../models/interface";
import { MessageService } from "primeng/api";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { filter, Observable } from "rxjs";
import { Workbook, Worksheet } from "exceljs";
import { KeyValue } from "@angular/common";
import { ProductExcelColumns } from "../../models/enums";
import { ImageCacheService } from "../../service/image-cache.service";
import { MetadataService } from "../../service/metadata.service";
import { getUserPermissionsFor, isSuperUser } from "../../../shared/pipes/helper";
import { Route, Router } from "@angular/router";
import { NavigationLinksService } from "../../sharedComponent/service/navigation-links/navigation-links.service";

@Component({
  selector: "app-products",
  templateUrl: "./products.component.html",
  styleUrl: "./products.component.scss",
  providers: [MessageService],
})
export class ProductsComponent implements OnInit {

  @ViewChildren('op') overlayPanels!: QueryList<any>;
  closeAllOverlays() {
    if (this.overlayPanels) {
      this.overlayPanels.forEach(overlay => {
        if (overlay.overlayVisible) {
          overlay.hide();
        }
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any) {
    if (this.overlayPanels) {
      this.overlayPanels.forEach(overlay => {
        if (overlay.overlayVisible && !overlay.el.nativeElement.contains(event.target)) {
          overlay.hide();
        }
      });
    }
  }

  // Products data
  products: ProductData[] = [];
  tableSections: boolean = false;
  imageUrl: string = "";
  originalProducts: ProductData[] = [];
  viewProduct: boolean = false;
  addProduct: boolean = false;
  activeItem: any = {};
  isLoading = this.metadataService.loading$;
  listOfSelectedItems: number[] = [];
  deleteModal: boolean = false;
  deleteMultipleItemsModal = false;
  editProduct: boolean = false;
  configureBarcode: boolean = false;
  categoryLoading: boolean = false;

  discountTypes = [
    { label: "Periodic", value: "periodic" },
    { label: "Quantity Based", value: "quantityBased" },
    { label: "Global Discount", value: "globalDiscount" },
  ] as const;
  discountType: string[] = [];
  periodicDiscount: { startDate: string; endDate: string } = {
    startDate: "",
    endDate: "",
  };
  quantityBasedDiscount: { minQuantity: number } = { minQuantity: 0 };
  productImage: any = "";
  tableSection: boolean = true;
  searchTerm: string = "";
  selectedCategories: number[] = [];
  selectedBranch: number | null = null;

  categories: any[] = [];
  isImportDialogOpen = false;
  branches: BranchDTO[] = [];
  productTableHeaders = {
    sku: "SKU",
    code: "Code",
    name: "Name",
    price: "Price",
    quantity: "Quantity",
    category: "Category",
    action: "",
  } as const;
  sortingData = {
    headerToSort: this.productTableHeaders
      .sku as (typeof this.productTableHeaders)[keyof typeof this.productTableHeaders],
    order: "asc" as "asc" | "desc",
  };
  barcodeConfig = {
    barcodeType: "CODE128",
    barcodeQuantity: 0,
    variants: false,
  };
  barcodes = [
    { label: "CODE128 ", value: "CODE128" },
    { label: "EAN-13", value: "EAN13" },
    { label: "EAN-8", value: "EAN8" },
    { label: "UPC (A)", value: "UPC" },
    { label: "UPC (E)", value: "UPC" },
    { label: "ITF", value: "ITF" },
    { label: "Codabar", value: "Codabar" },
    { label: "CODE39", value: "CODE39" },
  ] as const;

  measurementUnits = Object.keys(MeasurementUnit);
  parsedProductData: ProductJSONFormatPOST[] = [];
  originalOrder = (
    a: KeyValue<string, string>,
    b: KeyValue<string, string>,
  ): number => 0;

  // Paginator
  currentPage = 0;
  rowsPerPage = 15;
  private readonly _defaultExpiryDate = new Date(Date.now() + (100 * 365.25 * 24 * 60 * 60 * 1000));

  productPermissions = {
    canView: false,
    canEdit: false,
    canDelete: false,
    canCreate: false,
  };  
  
  superUser = isSuperUser();

  // Global Search Properties for the searchbar component
  globalSearchResults: any[] = [];
  isSearching: boolean = false;
  searchError: string | null = null;
  currentGlobalSearchQuery: string = '';

  // Add this property to fix the error
  isDropdownOpen = false;

  constructor(
    private messageService: MessageService,
    private posService: PosServiceService,
    private http: HttpClient,
    private imageCacheService: ImageCacheService,
    public metadataService: MetadataService,
    private router: Router,
    private navigationLink: NavigationLinksService
  ) {}

  ngOnInit(): void {
    this.loadCategory();
    this.getProducts();
    this.getDiscountTypes();
    this.fetchUserBranchId();
    this.metadataService.branches$.subscribe((data) => (this.branches = data));
    if (this.selectedBranch) {
      this.metadataService.setSelectedBranch(this.selectedBranch);
    }
    this.setRowsPerPageBasedOnScreenSize();

    window.addEventListener(
      "resize",
      this.setRowsPerPageBasedOnScreenSize.bind(this),
    );

    if (isSuperUser()) {
      this.productPermissions = {
        canView: true,
        canEdit: true,
        canDelete: true,
        canCreate: true,
      };
    } else {
      this.productPermissions = getUserPermissionsFor('POS_PDT');
    }
  }

  ngOnDestroy() {
    window.removeEventListener(
      "resize",
      this.setRowsPerPageBasedOnScreenSize.bind(this),
    );
  }

  fetchUserBranchId(){
    const userBranch= sessionStorage.getItem('userBranchInfoRegData');
    this.selectedBranch = userBranch ? JSON.parse(userBranch).branch.id : 1;
  }

  setRowsPerPageBasedOnScreenSize() {
    const height = window.innerWidth;

    if (height > 1000) {
      this.rowsPerPage = 21;
    } else if (height > 800) {
      this.rowsPerPage = 15;
    } else if (height > 600) {
      this.rowsPerPage = 10;
    } else {
      this.rowsPerPage = 5;
    }
  }

  toggleView() {
    this.tableSections = !this.tableSections;
  }

  get paginatedProducts() {
    const startIndex = this.currentPage * this.rowsPerPage;
    return this.products.slice(startIndex, startIndex + this.rowsPerPage);
  }

  onPageChange(event: any) {
    this.currentPage = event.page;
    this.rowsPerPage = event.rows;
  }

  checkForEmptyFields(obj: any): boolean {
    return Object.values(obj).some(
      (value) => typeof value === "string" && value.trim() === "",
    );
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
            a.createdDate[5],
          );
          const dateB = new Date(
            b.createdDate[0],
            b.createdDate[1] - 1,
            b.createdDate[2],
            b.createdDate[3],
            b.createdDate[4],
            b.createdDate[5],
          );
          return dateB.getTime() - dateA.getTime();
        });
        this.products = [...this.originalProducts];
        console.log(this.products);
        console.log(this.isLoading)
      } else {
        console.log("error loading data");
      }
    });
  }

  getDiscountTypes() {
    this.posService.getDiscountTypes().subscribe(async (data) => {
      console.log(data);
      if (data) {
        this.discountTypes = data;
      } else {
        console.log("error loading data");
      }
    });
  }

  loadCategory() {
    this.posService.getCategories().subscribe(async (data) => {
      console.log(data);
      if (data) {
        this.categories = data;
      } else {
        console.log("error loading data");
      }
    });
  }

  // Handle search results from searchbar component
  onSearchResultsChange(updatedList: any[]) {
    this.products = updatedList;
  }

  // Handle global search requests from searchbar component
  onGlobalSearch(searchQuery: string) {
    if (!searchQuery) {
      // Clear global search results
      this.globalSearchResults = [];
      this.isSearching = false;
      this.searchError = null;
      this.currentGlobalSearchQuery = '';
      return;
    }

    this.isSearching = true;
    this.searchError = null;
    this.currentGlobalSearchQuery = searchQuery;

    // Use the actual global search API
    this.posService.getGlobalStockBySearch(searchQuery).subscribe({
      next: (results: any[]) => {
        this.globalSearchResults = results;
        this.isSearching = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isSearching = false;
        this.searchError = error.error?.message || 'Failed to perform global search';
        this.globalSearchResults = [];
      }
    });
  }

  // Handle when a product is selected from global search
  onGlobalProductSelected(selectedProduct: any) {
    console.log('Global product selected:', selectedProduct);
    
    // Extract branch information - handle different response formats
    const branchId = selectedProduct.branchId || selectedProduct.branch?.id;
    const branchName = selectedProduct.branchName || selectedProduct.branch?.name;
    
    // Store the current search query before switching branches
    const currentSearchQuery = this.currentGlobalSearchQuery;
    
    if (branchId && branchId !== this.selectedBranch) {
      // Switch to the branch where the product belongs
      this.selectedBranch = branchId;
      this.metadataService.setSelectedBranch(branchId);
      
      // Show success message
      this.messageService.add({
        severity: "success",
        summary: "Branch Switched",
        detail: `Switched to ${branchName || 'selected'} branch to view "${selectedProduct.name || selectedProduct.productName}"`,
        key: "tl",
        life: 3000,
      });

      // Refresh products for the new branch AND reapply the search
      this.getProductsForBranch(branchId, currentSearchQuery);
      
      // Close any open dropdowns but keep the search query
      this.isDropdownOpen = false;
    } else if (branchId === this.selectedBranch) {
      this.messageService.add({
        severity: "info",
        summary: "Product Available",
        detail: `"${selectedProduct.name || selectedProduct.productName}" is already available in current branch`,
        key: "tl",
        life: 3000,
      });
    } else {
      this.messageService.add({
        severity: "warn",
        summary: "Branch Info Missing",
        detail: "Could not determine the branch for this product",
        key: "tl",
        life: 3000,
      });
    }
  }

  // Method to get products for specific branch with optional search query
  getProductsForBranch(branchId: number, searchQuery?: string) {
    this.posService.getFilteredProductsWithDetails(branchId).subscribe({
      next: (products: any[]) => {
        this.originalProducts = products.sort((a: any, b: any) => {
          const dateA = new Date(
            a.createdDate[0],
            a.createdDate[1] - 1,
            a.createdDate[2],
            a.createdDate[3],
            a.createdDate[4],
            a.createdDate[5],
          );
          const dateB = new Date(
            b.createdDate[0],
            b.createdDate[1] - 1,
            b.createdDate[2],
            b.createdDate[3],
            b.createdDate[4],
            b.createdDate[5],
          );
          return dateB.getTime() - dateA.getTime();
        });
        
        // Apply the search query if it exists
        if (searchQuery && searchQuery.trim() !== '') {
          this.products = this.filterProductsBySearchTerm(this.originalProducts, searchQuery);
          // Update the searchbar component with the filtered results
          this.currentGlobalSearchQuery = searchQuery;
        } else {
          this.products = [...this.originalProducts];
        }
        
        console.log('Products loaded for branch:', branchId, this.products);
      },
      error: (error) => {
        console.error('Error loading products for branch:', error);
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Failed to load products for selected branch",
          key: "tl",
          life: 3000,
        });
      }
    });
  }

  // Helper method to filter products by search term
  private filterProductsBySearchTerm(products: ProductData[], searchTerm: string): ProductData[] {
    const term = searchTerm.toLowerCase().trim();
    return products.filter(product => 
      product.name?.toLowerCase().includes(term) ||
      product.sku?.toLowerCase().includes(term) ||
      product.code?.toLowerCase().includes(term) ||
      product.productCategory?.name?.toLowerCase().includes(term)
    );
  }

  // Helper method for stock color coding
  getStockColor(quantity: number): string {
    if (quantity > 10) return 'text-green-600';
    if (quantity > 0) return 'text-orange-500';
    return 'text-red-600';
  }

  // Original methods continue...
  filterProductsByCategory() {
    if (this.selectedCategories.length === 0) {
      this.products = [...this.originalProducts];
    } else {
      this.categoryLoading = true;
        this.products = this.originalProducts.filter((product) =>
          this.selectedCategories.includes(product.productCategory?.id),
        );
        this.categoryLoading = false;
    }
  }

  deleteProduct() {
    if (!this.activeItem?.id) {
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "No product selected for deletion",
        key: "tl",
        life: 3000,
      });
      return;
    }

    this.posService.deleteProduct(this.activeItem.id).subscribe({
      next: (response) => {
        this.deleteModal = false;
        this.getProducts();
        this.messageService.add({
          severity: "success",
          summary: "Product Deleted",
          detail: `${this.activeItem.name} has been deleted successfully`,
          key: "tl",
          life: 3000,
        });
        this.activeItem = {};
      },
      error: (error: HttpErrorResponse) => {
        this.deleteModal = false;
        console.error('Delete error:', error);
        
        if (error.status === 500 && 
            (error.error?.exception === 'DataIntegrityViolationException' || 
             error.error?.message?.includes('foreign key constraint') ||
             error.error?.message?.includes('violates foreign key constraint'))) {
          this.messageService.add({
            severity: "error",
            summary: "Cannot Delete Product",
            detail: `${this.activeItem.name} cannot be deleted because it's currently being used in inventory, sales, or other transactions. Please remove it from inventory first or contact your administrator.`,
            key: "tl",
            life: 6000,
          });
        } else if (error.status === 404) {
          this.messageService.add({
            severity: "error",
            summary: "Product Not Found",
            detail: "The product you're trying to delete no longer exists.",
            key: "tl",
            life: 3000,
          });
        } else if (error.status === 403) {
          this.messageService.add({
            severity: "error",
            summary: "Access Denied",
            detail: "You don't have permission to delete this product.",
            key: "tl",
            life: 3000,
          });
        } else {
          this.messageService.add({
            severity: "error",
            summary: "Deletion Failed",
            detail: error.error?.message || "An unexpected error occurred while deleting the product. Please try again or contact support.",
            key: "tl",
            life: 4000,
          });
        }
      }
    });
  }

  toggleSelectedItemInList(item: ProductData) {
    const id = item.id;

    if (this.listOfSelectedItems.includes(id)) {
      this.listOfSelectedItems = this.listOfSelectedItems.filter(
        (itemId) => itemId !== id,
      );
    } else {
      this.listOfSelectedItems.push(id);
    }
  }

  deleteSelectedProducts(ids: number[] = this.listOfSelectedItems) {
    if (ids.length === 0) {
      this.messageService.add({
        severity: "warn",
        summary: "No Selection",
        detail: "Please select products to delete",
        key: "tl",
        life: 3000,
      });
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const totalCount = ids.length;

    ids.forEach((id, index) => {
      this.posService.deleteProduct(id).subscribe({
        next: (response) => {
          successCount++;
          this.listOfSelectedItems = this.listOfSelectedItems.filter(
            (itemId) => itemId !== id
          );
          
          if (successCount + errorCount === totalCount) {
            this.handleBulkDeleteComplete(successCount, errorCount);
          }
        },
        error: (error: HttpErrorResponse) => {
          errorCount++;
          console.error(`Failed to delete product with id ${id}:`, error);
          
          if (successCount + errorCount === totalCount) {
            this.handleBulkDeleteComplete(successCount, errorCount);
          }
        }
      });
    });

    this.toggleMultiDeleteModal();
  }

  private handleBulkDeleteComplete(successCount: number, errorCount: number) {
    this.getProducts();
    
    if (successCount > 0 && errorCount === 0) {
      this.messageService.add({
        severity: "success",
        summary: "Bulk Delete Successful",
        detail: `${successCount} product(s) deleted successfully`,
        key: "tl",
        life: 3000,
      });
    } else if (successCount > 0 && errorCount > 0) {
      this.messageService.add({
        severity: "warn",
        summary: "Partial Success",
        detail: `${successCount} product(s) deleted, ${errorCount} failed (may be in use)`,
        key: "tl",
        life: 5000,
      });
    } else {
      this.messageService.add({
        severity: "error",
        summary: "Bulk Delete Failed",
        detail: `Failed to delete ${errorCount} product(s). They may be referenced in other records.`,
        key: "tl",
        life: 5000,
      });
    }
  }

  canDeleteProduct(product: ProductData): boolean {
    if (product.quantity && product.quantity > 0) {
      return false;
    }
    
    if (product.variants && product.variants.length > 0) {
      const hasVariantsWithQuantity = product.variants.some(variant => variant.quantity > 0);
      if (hasVariantsWithQuantity) {
        return false;
      }
    }
    
    return true;
  }

  getDeleteRestrictionMessage(product: ProductData): string {
    const reasons: string[] = [];
    
    if (product.quantity && product.quantity > 0) {
      reasons.push(`has ${product.quantity} items in inventory`);
    }
    
    if (product.variants && product.variants.length > 0) {
      const variantsWithQuantity = product.variants.filter(v => v.quantity > 0);
      if (variantsWithQuantity.length > 0) {
        reasons.push(`has ${variantsWithQuantity.length} variants with inventory`);
      }
    }
    
    if (reasons.length === 0) {
      return "may be referenced in transactions or other records";
    }
    
    return reasons.join(" and ");
  }

  openDeleteModalWithValidation(item: ProductData) {
    this.activeItem = item;
    this.deleteModal = true;
  }

  getProductActions(product: ProductData) {
    const actions = [
      { 
        label: 'View', 
        icon: 'pi pi-eye', 
        action: () => this.openViewProduct(product),
        show: true 
      },
      { 
        label: 'Edit', 
        icon: 'pi pi-pen-to-square', 
        action: () => this.openEdit(product),
        show: this.productPermissions.canEdit 
      },
      { 
        label: 'Generate Barcode', 
        icon: 'pi pi-download', 
        action: (op: any) => this.promptBarcode(product, op),
        show: true 
      },
      { 
        label: 'Delete', 
        icon: 'pi pi-times-circle', 
        action: () => this.openDeleteModalWithValidation(product),
        show: this.productPermissions.canDelete,
        class: this.canDeleteProduct(product) ? '' : 'text-orange-500',
        tooltip: this.canDeleteProduct(product) ? '' : `Cannot delete: ${this.getDeleteRestrictionMessage(product)}`
      }
    ];
    
    return actions.filter(action => action.show);
  }

  openViewProduct(item: any = {}) {
    this.activeItem = item;
    console.log(this.activeItem);
    this.viewProduct = !this.viewProduct;
    this.tableSection = !this.tableSection;
  }

  openViewEditForm() {
    this.viewProduct = !this.viewProduct;
    this.editProduct = !this.editProduct;
  }

  openDeleteModal(item: any = {}) {
    this.activeItem = item;
    this.deleteModal = !this.deleteModal;
  }

  toggleMultiDeleteModal() {
    this.deleteMultipleItemsModal = !this.deleteMultipleItemsModal;
  }

  openEdit(item: any = {}) {
    this.activeItem = item;
    console.log("view", item);
    this.tableSection = false;
    this.viewProduct = false;
    this.addProduct = false;
    this.editProduct = !this.editProduct;
  }

  closeEdit() {
    this.tableSection = true;
    this.viewProduct = false;
    this.editProduct = false;
    this.addProduct = false;
    this.getProducts();
  }

  openAddProduct() {
    this.tableSection = false;
    this.viewProduct = false;
    this.editProduct = false;
    this.addProduct = true;
  }

  openAddBranch(){
    const settingsLink = this.navigationLink.getLink('settingsLink')
        this.router.navigate([settingsLink], {
      queryParams: { open: 'branches' }
    });
  }

  closeAddProduct() {
    this.tableSection = true;
    this.viewProduct = false;
    this.editProduct = false;
    this.addProduct = false;
    this.getProducts();
  }

  toggleImportDialog() {
    this.isImportDialogOpen = !this.isImportDialogOpen;
    if (!this.isImportDialogOpen) this.#clearImportedProductData();
  }

  #clearImportedProductData() {
    this.parsedProductData.length = 0;
  }

  async processExcelImport(xlsxImport: File) {
    this.#clearImportedProductData();
    const workbook = new Workbook();
    await workbook.xlsx.load(await xlsxImport.arrayBuffer());
    const worksheet = workbook.getWorksheet("Products to Add") as Worksheet;
    
    for (let i = 2; i < 999; i++) {
      const row = worksheet.getRow(i);

      const name = row.getCell(ProductExcelColumns.NAME + 1).text;
      if (name == "Dummy Product" || name == "") continue;
      const description = row.getCell(ProductExcelColumns.DESCRIPTION + 1).text;
      
      const imgUrl = ((url: string) => {
        try {
          new URL(url);
          return url;
        } catch (_) {
          return "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWN8hLKJungcUipWLReON9fse4yZcyB0rzNw&s";
        }
      })(row.getCell(ProductExcelColumns.IMAGE_URL + 1).text);
      
      const imgBlob = await (await fetch(imgUrl)).blob();
      const imgFile = new File([imgBlob], "img.jpg", {
        type: imgBlob.type,
      });
      console.log(imgFile);
      const branchName = row.getCell(ProductExcelColumns.BRANCH + 1).text;
      const code = parseInt(row.getCell(ProductExcelColumns.CODE + 1).text);
      const basePrice = parseInt(
        row.getCell(ProductExcelColumns.BASE_PRICE + 1).text,
      );
      const taxPercentage = parseInt(
        row.getCell(ProductExcelColumns.TAX_PERCENTAGE + 1).text,
      );
      const discountName = row.getCell(
        ProductExcelColumns.DISCOUNT_NAME + 1,
      ).text;
      const quantity = parseInt(
        row.getCell(ProductExcelColumns.QUANTITY + 1).text,
      );
      const sku = parseInt(row.getCell(ProductExcelColumns.SKU + 1).text);
      const partNumber = parseInt(
        row.getCell(ProductExcelColumns.PART_NUMBER + 1).text,
      );
      const categoryName = row.getCell(ProductExcelColumns.CATEGORY + 1).text;
      const variantNames = row
        .getCell(ProductExcelColumns.VARIANTS + 1)
        .text.split(",");
      const weight = parseInt(
        row.getCell(ProductExcelColumns.ITEM_WEIGHT + 1).text,
      );

      let discount: DiscountDTO = {} as any;
      let productCategory: ProductCategoryPOST = {} as any;
      let branch: string = branchName;

      this.products.forEach((product) => {
        if (product.productCategory.name == categoryName) {
          productCategory = structuredClone(product.productCategory);
        }
      });

      this.parsedProductData.push({
        id: 0 || (Math.random().toString(36).substr(2, 50) as any),
        createdDate: new Date().toISOString(),
        createdBy: "",
        costPrice: (
          basePrice -
          (basePrice * discount.value) / 100 -
          (basePrice * taxPercentage) / 100
        ).toFixed(2),
        variant: "",
        productImages: [
          {
            id: 54,
            name: "Opera Snapshot_2025-02-03_030901_localhost.png",
            imgNo: "d03BR3TK6L3",
          },
        ],
        variants: [],
        name: name,
        description: description,
        code: code.toString(),
        tax: { rate: taxPercentage, name: "" },
        discount: discount,
        sku: sku.toString(),
        partNumber: partNumber.toString(),
        productCategory: productCategory,
        weight: weight,
        expiryDate: this._defaultExpiryDate.toISOString()
      });
    }
  }

  sortProductsByHeader(
    header: (typeof this.productTableHeaders)[keyof typeof this.productTableHeaders],
  ) {
    if (header == "") return;
    else {
      if (header == this.sortingData.headerToSort) {
        this.sortingData.order =
          this.sortingData.order == "asc" ? "desc" : "asc";
      } else {
        this.sortingData.headerToSort = header;
      }

      this.products.sort((productA, productB) => {
        let productAVal: string | number, productBVal: string | number;

        switch (header) {
          case "Code":
            productAVal = productA.code;
            productBVal = productB.code;
            break;
          case "SKU":
            productAVal = productA.sku;
            productBVal = productB.sku;
            break;
          case "Name":
            productAVal = productA.name;
            productBVal = productB.name;
            break;
          case "Category":
            productAVal = productA.productCategory.name;
            productBVal = productB.productCategory.name;
            break;
          default:
            productAVal = 0;
            productBVal = 0;
        }

        if (typeof productAVal == "number" && typeof productBVal == "number") {
          return this.sortingData.order == "asc"
            ? productBVal - productAVal
            : productAVal - productBVal;
        } else {
          const valA = productAVal.toString().toLocaleLowerCase();
          const valB = productBVal.toString().toLocaleLowerCase();
          return this.sortingData.order == "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
      });
    }
  }

  getBarcodeModalHeader(): string {
    return `Barcode for ${this.activeItem.name || 'Product'}`;
  }

  promptBarcode(item: any, op: any) {
    op.hide();
    this.configureBarcode = true;
    this.activeItem = item;
    this.barcodeConfig.barcodeQuantity = item.quantity || 1;
  }

  printBarcode() {
    this.generateBarcode(true);
  }

  generateBarcode(shouldPrint?: boolean) {
    const barcodes: { svg: SVGSVGElement; text: string }[] = [];

    const sku = this.activeItem?.code;
    if (typeof sku === "string") {
      const displayValue = `${(
        this.activeItem.name?.split(" ")[0] || ""
      ).toLowerCase()}-${sku}`;

      for (let i = 0; i < this.barcodeConfig.barcodeQuantity; i++) {
        const barcodeSvg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        JsBarcode(barcodeSvg, sku, {
          format: this.barcodeConfig.barcodeType,
          lineColor: "#000",
          width: 3,
          height: 150,
          displayValue: true,
          text: displayValue,
        });
        barcodes.push({ svg: barcodeSvg, text: displayValue });
      }
    } else {
      alert("Please fill in the SKU with valid data.");
    }

    if (Array.isArray(this.activeItem?.variants)) {
      this.activeItem.variants.forEach(
        (variant: { sku: string; name: string; quantity: number }) => {
          const variantSKU = variant?.sku;
          if (typeof variantSKU === "string") {
            const displayValue = `${(
              variant.name?.split(" ")[0] || ""
            ).toLowerCase()}-${variantSKU}`;

            for (let i = 0; i < variant.quantity; i++) {
              const barcodeSvg = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "svg",
              );
              JsBarcode(barcodeSvg, variantSKU, {
                format: this.barcodeConfig.barcodeType,
                lineColor: "#000",
                width: 3,
                height: 150,
                displayValue: true,
                text: displayValue,
              });
              barcodes.push({ svg: barcodeSvg, text: displayValue });
            }
          }
        },
      );
    }

    if (shouldPrint) {
      this.printBarcodesSeparately(barcodes);
    }
  }

  printBarcodesSeparately(barcodes: { svg: SVGSVGElement; text: string }[]) {
    barcodes.forEach((barcode, index) => {
      setTimeout(() => {
        const svgString = new XMLSerializer().serializeToString(barcode.svg);
        const encodedSvg = encodeURIComponent(svgString);

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);

          const imgData = canvas.toDataURL("image/png");
          this.printSingleImage(imgData);
        };
        img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
      }, index * 1500);
    });
  }

  printSingleImage(imgSrc: string) {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.write(`
        <html>
        <head>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
              img { max-width: 100%; max-height: 100%; }
            }
          </style>
        </head>
        <body>
          <img src="${imgSrc}">
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 5000);
      }, 500);
    }
  }

  convertSvgToPng(svgElement: Node, shouldPrint?: boolean) {
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute("width", "300");
    svgClone.setAttribute("height", "150");

    if (shouldPrint) {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
            <html>
            <head>
              <title>Print Barcode</title>
              <style>
                @media print {
                  body { margin: 0; padding: 0; }
                  @page { size: auto; margin: 0; }
                }
              </style>
            </head>
            <body onload="window.print();">
              ${new XMLSerializer().serializeToString(svgClone)}
            </body>
            </html>
          `);
        doc.close();

        setTimeout(() => document.body.removeChild(iframe), 5000);
      }
    } else {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const encodedSvg = encodeURIComponent(svgString);
      const imgSrc = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
      this.generatePDF(imgSrc);
    }
  }

  generatePDF(imgData: string) {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: "a4",
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
        "PNG",
        currentX,
        currentY,
        barcodeWidth,
        barcodeHeight,
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

    pdf.save("barcodes.pdf");
  }
}