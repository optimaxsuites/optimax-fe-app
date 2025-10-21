// pos-store.component.ts - FIXED VERSION

import { Component, computed, OnInit, signal, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import Fuse, { IFuseOptions } from 'fuse.js';
import { ProductData, VariantDTO } from '../../models/interface';
import { ActivatedRoute } from '@angular/router'; 
import { ImageCacheService } from '../../service/image-cache.service';
import { PaymentServiceService } from '../../service/payment-service.service';
import { PosServiceService } from '../../service/pos-service.service';
import { ProductHelperService } from '../../service/product-helper.service';
import { Router } from '@angular/router';
import { StoreCartService } from '../../service/store-cart.service'; 
import { MetadataService } from '../../service/metadata.service';

type ProductDataMap = Map<string, ProductData[]>;

type ConvertedCartProducts = {
  products: ProductData[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
};

@Component({
  selector: 'app-pos-store',
  templateUrl: './pos-store.component.html',
  styleUrl: './pos-store.component.scss',
})
export class PosStoreComponent implements OnInit, OnDestroy {
  private _allProducts: ProductData[] = [];
  @ViewChild('allProductsSection') allProductsSection!: ElementRef;

  private static readonly _fuseOptions: IFuseOptions<ProductData> = {
    keys: [
      { name: 'sku', weight: 2 },
      { name: 'name', weight: 1.5 },
      'description',
      'category',
    ],
    includeScore: true,
    threshold: 0.333,
  };

  // Product data
  allProducts: ProductData[] = [];
  productData = signal<ProductDataMap>(new Map());

  // UI State
  readonly defaultCategory = 'All';
  selectedCategory = signal(this.defaultCategory);
  selectedBranch = signal<any>(null);
  user = signal({ name: 'Guest', isGuest: true });
  branches: any[] = [];
  searchText = signal('');
  
  // FIXED: Separate loading states for skeleton and content
  isLoading = signal(true);
  isContentReady = signal(false);
  private hasShownSkeleton = false; // Track if skeleton has been shown

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(20);
  totalPages = signal(0);

  // Search
  private _fuse!: Fuse<ProductData>;

  // Cart & UI State
  isSidebarVisible = true;
  isCartOpen = false;
  isHamburgerMenuOpen = false;
  isVariantModalOpen = false;
  isPaymentModalOpen = false;
  isCartSidebarVisible = true;
  selectedProduct: ProductData | null = null;
  
  // FIXED: Use signal for scroll to top visibility
  showScrollToTop = signal(false);

  // Computed properties
  private _productsInChosenCategory = computed(
    () => this.productData().get(this.selectedCategory()) ?? this._allProducts
  );

  // Cart signals
  cartProducts = computed(() => this.cartService.cart().items);
  isCartEmpty = computed(() => this.cartService.isCartEmpty());
  totalCartItems = computed(() => this.cartService.totalItems());

  convertedCartProducts = computed<ConvertedCartProducts>(() => {
    const cart = this.cartService.getCart();
    return {
      products: Array.from(cart.items).flatMap(([_, { product, quantity }]) =>
        Array(quantity).fill(product)
      ),
      subtotal: cart.subtotal,
      tax: 0,
      discount: 0,
      total: cart.subtotal,
    };
  });

  categoryOptions = computed(() => {
    const options = [
      { label: this.defaultCategory, value: this.defaultCategory },
    ];

    this.productData().forEach((_, key) => {
      options.push({
        label: key[0].toUpperCase() + key.slice(1),
        value: key,
      });
    });

    return options;
  });

  paginatedProducts = computed(() => {
    if (!this.isContentReady()) return [];

    const allProducts = this.filteredProducts();
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage();
    const endIndex = startIndex + this.itemsPerPage();
    return allProducts.slice(startIndex, endIndex);
  });

  filteredProducts = computed(() => {
    if (!this.searchText() || !this._productsInChosenCategory().length) {
      return this._productsInChosenCategory();
    }

    if (!this._fuse) {
      this._fuse = new Fuse<ProductData>(
        this._productsInChosenCategory(),
        PosStoreComponent._fuseOptions
      );
    } else {
      this._fuse.setCollection(this._productsInChosenCategory());
    }

    const searchResults = this._fuse
      .search(this.searchText())
      .map(({ item }) => item);

    if (!searchResults.length) return this._productsInChosenCategory();
    else return searchResults;
  });

  totalPagesComputed = computed(() => {
    const totalItems = this.filteredProducts().length;
    return Math.ceil(totalItems / this.itemsPerPage());
  });

  // Image fading functionality
  private currentImageIndex = 0;
  private totalImages = 4;
  private fadeInterval: any;

  // Category scroll states
  categoryScrollStates = new Map<
    string,
    { canScrollLeft: boolean; canScrollRight: boolean }
  >();

  constructor(
    private _posService: PosServiceService,
    private router: Router,
    private _imgCacheService: ImageCacheService,
    private _productHelper: ProductHelperService,
    private _paymentService: PaymentServiceService,
    private cartService: StoreCartService,
    private route: ActivatedRoute,
    private metadataService: MetadataService
  ) {}

  // FIXED: Use HostListener for scroll events
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    // Show button when scrolled down more than 300px
    this.showScrollToTop.set(scrollPosition > 300);
  }

  ngOnInit(): void {
    this.initializeComponent();
  }

  private initializeComponent(): void {
    this._fuse = new Fuse<ProductData>([], PosStoreComponent._fuseOptions);

    // Load branches
    this._posService.getBranches().subscribe((branches) => {
      this.branches = branches;
      if (branches.length > 0 && !this.selectedBranch()) {
        const initialBranch = branches[0];
        this.selectedBranch.set(initialBranch);
        this.metadataService.setSelectedBranch(initialBranch.id);
      }
    });

    this.subscribeToEnrichedProducts();
    this.startImageFading();
  }

  private subscribeToEnrichedProducts(): void {
    this.metadataService.enrichedProduct$.subscribe(async (data) => {
      if (data && data.length > 0) {
        this.processProductsData(data);
        this.handleContentLoading();
      } else {
        console.log('No enriched products data available, falling back to regular loading');
        this.loadProductsFallback();
      }
    });

    this.metadataService.branches$.subscribe((data) => {
      if (data && data.length > 0) {
        this.branches = data;
      }
    });
  }

  private processProductsData(products: ProductData[]): void {
    this._allProducts = products;
    this.allProducts = products;

    const newProductData = new Map<string, ProductData[]>();

    products.forEach((product) => {
      const categoryName = product.productCategory?.name || 'Uncategorized';

      if (!newProductData.has(categoryName)) {
        newProductData.set(categoryName, [product]);
      } else {
        newProductData.get(categoryName)!.push(product);
      }
    });

    this.productData.set(newProductData);

    if (this._fuse) {
      this._fuse.setCollection(this._productsInChosenCategory());
    }
  }

  // FIXED: Show skeleton only on first load
  private handleContentLoading(): void {
    if (!this.hasShownSkeleton) {
      // First load - show skeleton for minimum time
      this.isLoading.set(true);
      this.isContentReady.set(false);
      
      setTimeout(() => {
        this.isLoading.set(false);
        setTimeout(() => {
          this.isContentReady.set(true);
          this.updatePagination();
        }, 300);
      }, 1500);
      
      this.hasShownSkeleton = true;
    } else {
      // Subsequent loads - show content immediately
      this.isLoading.set(false);
      this.isContentReady.set(true);
      this.updatePagination();
    }
  }

  private loadProductsFallback(): void {
    this._posService.getProducts().subscribe({
      next: (data) => {
        this.processProductsData(data);
        this.handleContentLoading();
      },
      error: (error) => {
        console.error('Error loading products', error);
        this.isLoading.set(false);
        this.isContentReady.set(true);
      },
    });
  }

  private updatePagination(): void {
    const totalItems = this.filteredProducts().length;
    const calculatedTotalPages = Math.ceil(totalItems / this.itemsPerPage());

    this.totalPages.set(calculatedTotalPages);

    if (this.currentPage() > calculatedTotalPages && calculatedTotalPages > 0) {
      this.currentPage.set(1);
    }
  }

  onBranchChange(branch: any): void {
    this.selectedBranch.set(branch);
    this.metadataService.setSelectedBranch(branch.id);
    
    // FIXED: Don't show skeleton on branch change, just update content
    // The products will be automatically updated via the enrichedProduct$ subscription
  }

  onMobileCategoryNavigate(categoryName: string): void {
    this.navigateToCategoryPage(categoryName);
  }

  getCategoryList(): string[] {
    const categories: string[] = [];
    this.productData().forEach((_, key) => {
      if (key !== 'All') {
        categories.push(key);
      }
    });
    return categories;
  }

  getProductsByCategory(category: string): ProductData[] {
    return this.productData().get(category) || [];
  }

  getProductImage(product: ProductData) {
    return this._imgCacheService.getProductImage(product);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/placeholder-product.jpg';
  }

  getTotalCartItems(): number {
    return this.totalCartItems();
  }

  addToCart(product: ProductData, variant?: VariantDTO): void {
    this.cartService.addToCart(product, variant);
  }

  reduceQuantityInCart(product: ProductData): void {
    const idToUse = product.selectedVariants?.[0]
      ? `${product.id}-${product.selectedVariants[0].id}`
      : product.id.toString();

    const currentQuantity = this.cartProducts().get(idToUse)?.quantity || 0;
    this.cartService.updateQuantity(
      product,
      currentQuantity - 1,
      product.selectedVariants?.[0]
    );
  }

  removeFromCart(product: ProductData): void {
    this.cartService.removeFromCart(product, product.selectedVariants?.[0]);
  }

  clearCart(): void {
    this.cartService.clearCart();
    this.isCartOpen = false;
  }

  toggleCart(): void {
    if (window.innerWidth < 768) {
      this.isCartOpen = !this.isCartOpen;
    } else {
      this.isCartSidebarVisible = !this.isCartSidebarVisible;
    }
  }

  productQuantityInCart(product: ProductData): number {
    const idToUse = product.selectedVariants?.[0]
      ? `${product.id}-${product.selectedVariants[0].id}`
      : product.id.toString();

    return this.cartProducts().get(idToUse)?.quantity || 0;
  }

  changeCategory(category: string): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
    this.updatePagination();
  }

  changeSearchInput(text: string): void {
    this.searchText.set(text);
    this.currentPage.set(1);
    this.updatePagination();
  }

  navigateToCheckout(): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    this.router.navigate(['user/checkout/store', currentUuid, 'checkout']);
  }

  navigateToProductDetails(productId: number): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');

    if (currentUuid) {
      this.router.navigate(['product-details', productId], {
        relativeTo: this.route,
      });
    } else {
      console.error('No store UUID found in route parameters');
    }
  }

  navigateToCategoryPage(category: string): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    if (currentUuid) {
      this.router.navigate(
        ['user/checkout/store', currentUuid, 'category', category.toLowerCase()],
        {
          queryParams: {
            branch: this.selectedBranch()?.id || '',
            branchName: this.selectedBranch()?.name || '',
          },
        }
      );
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.scrollToTop();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.scrollToTop();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.scrollToTop();
    }
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  }

  getDisplayEndIndex(): number {
    const endIndex = this.currentPage() * this.itemsPerPage();
    return Math.min(endIndex, this.filteredProducts().length);
  }

  onProductSelect(productId: number): void {
    this.navigateToProductDetails(productId);
  }

  onSearchSubmit(searchTerm: string): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    if (currentUuid && searchTerm.trim()) {
      this.router.navigate(
        ['user/checkout/store', currentUuid, 'category', 'search-results'],
        {
          queryParams: { search: searchTerm.trim() },
        }
      );
    }
  }

  toggleHamburgerMenu(): void {
    this.isHamburgerMenuOpen = !this.isHamburgerMenuOpen;
  }

  openVariantModal(product: ProductData): void {
    this.selectedProduct = product;
    this.isVariantModalOpen = true;
  }

  closeVariantModal(): void {
    this.isVariantModalOpen = false;
    this.selectedProduct = null;
  }

  openPaymentModal(): void {
    this.isPaymentModalOpen = true;
  }

  closePaymentModal(): void {
    this.isPaymentModalOpen = false;
  }

  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
  }

  scrollCategoryLeft(category: string): void {
    const container = document.querySelector(
      `[data-category="${category}"]`
    ) as HTMLElement;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }

  scrollCategoryRight(category: string): void {
    const container = document.querySelector(
      `[data-category="${category}"]`
    ) as HTMLElement;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  canScrollLeft(category: string): boolean {
    const container = document.querySelector(
      `[data-category="${category}"]`
    ) as HTMLElement;
    if (container) {
      return container.scrollLeft > 0;
    }
    return false;
  }

  canScrollRight(category: string): boolean {
    const container = document.querySelector(
      `[data-category="${category}"]`
    ) as HTMLElement;
    if (container) {
      return (
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1
      );
    }
    return false;
  }

  onCategoryScroll(category: string, event: Event): void {
    const container = event.target as HTMLElement;
    this.categoryScrollStates.set(category, {
      canScrollLeft: container.scrollLeft > 0,
      canScrollRight:
        container.scrollLeft <
        container.scrollWidth - container.clientWidth - 1,
    });
  }

  scrollToAllProducts(): void {
    if (this.allProductsSection) {
      this.allProductsSection.nativeElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }

  isProductInStock(product: ProductData): boolean {
    return product.quantity > 0;
  }

  formatPrice(price: any): string {
    try {
      let priceValue: number;

      if (price === undefined || price === null) {
        priceValue = 0;
      } else if (typeof price === 'string') {
        priceValue = parseFloat(price);
        if (isNaN(priceValue)) priceValue = 0;
      } else if (typeof price === 'number') {
        priceValue = price;
      } else {
        priceValue = 0;
      }

      return `₦${priceValue.toLocaleString('en-NG')}`;
    } catch (error) {
      console.warn('Error formatting price:', error);
      return '₦0';
    }
  }

  getStockStatus(product: ProductData): string {
    return product.quantity > 0
      ? `${product.quantity} available`
      : 'Out of stock';
  }

  getStockStatusClass(product: ProductData): string {
    return product.quantity > 0 ? 'text-green-600' : 'text-red-600';
  }

  private startImageFading(): void {
    this.fadeInterval = setInterval(() => {
      this.fadeToNextImage();
    }, 3000);
  }

  private fadeToNextImage(): void {
    const images = document.querySelectorAll('.fading-image');
    if (images.length === 0) return;

    images[this.currentImageIndex].classList.add('opacity-0');
    this.currentImageIndex = (this.currentImageIndex + 1) % this.totalImages;

    setTimeout(() => {
      images[this.currentImageIndex].classList.remove('opacity-0');
    }, 100);
  }

  // FIXED: Scroll to top method - multiple approaches for browser compatibility
  scrollToTop(): void {
    // Try modern approach first
    try {
      window.scrollTo({ 
        top: 0, 
        left: 0,
        behavior: 'smooth' 
      });
    } catch (error) {
      // Fallback for older browsers
      try {
        window.scrollTo(0, 0);
      } catch (e) {
        // Last resort - scroll body/documentElement
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }
  }

    // Reference to the scrollable main element
  @ViewChild('scrollContainer', { read: ElementRef }) scrollContainer!: ElementRef;

  // Listen to scroll events on the main scrollable container
  onMainScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollTop;
    // Show button when scrolled down more than 300px
    this.showScrollToTop.set(scrollPosition > 300);
  }
}