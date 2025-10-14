// pos-store.component.ts - CORRECTED VERSION
import { Component, computed, OnInit, signal, effect, OnDestroy } from '@angular/core';
import Fuse, { IFuseOptions } from 'fuse.js';
import { ProductData, VariantDTO } from '../../models/interface';
import { ActivatedRoute } from '@angular/router'; 
import { ImageCacheService } from '../../service/image-cache.service';
import { PaymentServiceService } from '../../service/payment-service.service';
import { PosServiceService } from '../../service/pos-service.service';
import { ProductHelperService } from '../../service/product-helper.service';
import { Router } from '@angular/router';
import { StoreCartService } from '../../service/store-cart.service'; 

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

  allProducts: ProductData[] = [];

  productData = signal<ProductDataMap>(new Map());
  readonly defaultCategory = 'All';
  selectedCategory = signal(this.defaultCategory);

  private _productsInChosenCategory = computed(
    () => this.productData().get(this.selectedCategory()) ?? this._allProducts
  );

  user = signal({ name: 'Guest', isGuest: true });
  branches: any[] = [];
  searchText = signal('');
  isLoading = signal(true);
  isContentReady = signal(false);

  // Pagination signals - FIXED
  currentPage = signal(1);
  itemsPerPage = signal(20);
  totalPages = signal(0);

  private readonly _fuse = new Fuse<ProductData>(
    this._productsInChosenCategory(),
    PosStoreComponent._fuseOptions
  );

  isSidebarVisible = true;
  isCartOpen = false;
  isHamburgerMenuOpen = false;
  isVariantModalOpen = false;
  isPaymentModalOpen = false;
  isCartSidebarVisible = true;
  selectedProduct: ProductData | null = null;
  showScrollToTop = false;

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
    subtotal: cart.subtotal, // Use the cart service's calculated subtotal
    tax: 0,
    discount: 0,
    total: cart.subtotal
  };
});

  // Category options for dropdown
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

  // Paginated products for "All Products" section
  paginatedProducts = computed(() => {
    if (!this.isContentReady()) return [];
    
    const allProducts = this.filteredProducts();
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage();
    const endIndex = startIndex + this.itemsPerPage();
    return allProducts.slice(startIndex, endIndex);
  });

  // Filtered products based on search
  filteredProducts = computed(() => {
    if (!this.searchText() || !this._productsInChosenCategory().length) {
      return this._productsInChosenCategory();
    }
    this._fuse.setCollection(this._productsInChosenCategory());

    const searchResults = this._fuse
      .search(this.searchText())
      .map(({ item }) => item);

    if (!searchResults.length) return this._productsInChosenCategory();
    else return searchResults;
  });

  // FIXED: Update total pages computation
  totalPagesComputed = computed(() => {
    const totalItems = this.filteredProducts().length;
    return Math.ceil(totalItems / this.itemsPerPage());
  });

  // FIXED: Simplified pagination effect
  private updatePagination = effect(() => {
    const totalItems = this.filteredProducts().length;
    const calculatedTotalPages = Math.ceil(totalItems / this.itemsPerPage());
    
    this.totalPages.set(calculatedTotalPages);
    
    // Reset to page 1 if current page is beyond new total pages
    if (this.currentPage() > calculatedTotalPages && calculatedTotalPages > 0) {
      this.currentPage.set(1);
    }
  });

  // Search results state
  didSearchHaveResults = computed<'no_search_yet' | 'no' | 'yes'>(() => {
    if (!this.searchText() || !this._productsInChosenCategory().length)
      return 'no_search_yet';
    else if (this.filteredProducts() === this._productsInChosenCategory())
      return 'no';
    else return 'yes';
  });

  constructor(
    private _posService: PosServiceService,
    private router: Router,
    private _imgCacheService: ImageCacheService,
    private _productHelper: ProductHelperService,
    private _paymentService: PaymentServiceService,
    private cartService: StoreCartService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Load branches
    this._posService.getBranches().subscribe((branches) => {
      this.branches = branches;
    });

    // Load products with proper loading sequence
    this.loadProducts();

    this.addScrollListener();
  }

  private addScrollListener(): void {
    window.addEventListener('scroll', () => {
      this.showScrollToTop = window.scrollY > 300;
    });
  }

  navigateToCategory(category: string): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    if (currentUuid) {
      this.router.navigate(['/store', currentUuid, 'category', category.toLowerCase()]);
    }
  }

  /**
   * Load products with proper skeleton loading sequence
   */
  private loadProducts(): void {
    this._posService.getProducts().subscribe({
      next: (data) => {
        this._allProducts = data;
        this.allProducts = data;

        // Process product data into categories
        data.forEach((iteratedProduct) => {
          const categoryName = iteratedProduct.productCategory.name;

          if (!this.productData().has(categoryName)) {
            this.productData.update((oldMap) =>
              new Map(oldMap).set(categoryName, [iteratedProduct])
            );
          } else {
            this.productData.update((oldMap) => {
              const existingProductArray = oldMap.get(categoryName);
              if (!existingProductArray) return new Map(oldMap);
              existingProductArray.push(iteratedProduct);
              return new Map(oldMap).set(categoryName, existingProductArray);
            });
          }
        });
        
        // Wait for skeleton to complete before showing content
        this.simulateSkeletonLoading();
      },
      error: (error) => {
        console.error('Error loading products', error);
        this.isLoading.set(false);
        this.isContentReady.set(true);
      }
    });
  }

  /**
   * Simulate minimum skeleton loading time for better UX
   */
  private simulateSkeletonLoading(): void {
    const minSkeletonTime = 1500;
    
    setTimeout(() => {
      this.isLoading.set(false);
      
      setTimeout(() => {
        this.isContentReady.set(true);
      }, 300);
    }, minSkeletonTime);
  }

  ngOnDestroy(): void {
    this.updatePagination.destroy();
    window.removeEventListener('scroll', () => {
      this.showScrollToTop = window.scrollY > 300;
    });
  }

  // ============ PAGINATION METHODS ============

  /**
   * Go to next page
   */
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.scrollToTop();
    }
  }

  /**
   * Go to previous page
   */
  previousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.scrollToTop();
    }
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.scrollToTop();
    }
  }

  /**
   * Scroll to top of page
   */
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Generate page numbers for pagination with ellipsis logic - FIXED
   */
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

  // ============ PRODUCT METHODS ============

  /**
   * Get list of categories
   */
  getCategoryList(): string[] {
    const categories: string[] = [];
    this.productData().forEach((_, key) => {
      if (key !== 'All') {
        categories.push(key);
      }
    });
    return categories;
  }

  /**
   * Get products by category
   */
  getProductsByCategory(category: string): ProductData[] {
    return this.productData().get(category) || [];
  }

  /**
   * Get product image with caching
   */
  getProductImage(product: ProductData) {
    return this._imgCacheService.getProductImage(product);
  }

  /**
   * Handle image loading errors
   */
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/placeholder-product.jpg';
  }

  // ============ CART METHODS ============

  /**
   * Get total cart items count
   */
  getTotalCartItems(): number {
    return this.totalCartItems();
  }

  /**
   * Add product to cart
   */
  addToCart(product: ProductData, variant?: VariantDTO): void {
    this.cartService.addToCart(product, variant);
    this.cartProducts();
  }

  /**
   * Reduce quantity in cart
   */
  reduceQuantityInCart(product: ProductData): void {
    const idToUse = product.selectedVariants?.[0] 
      ? `${product.id}-${product.selectedVariants[0].id}` 
      : product.id.toString();
    
    const currentQuantity = this.cartProducts().get(idToUse)?.quantity || 0;
    this.cartService.updateQuantity(product, currentQuantity - 1, product.selectedVariants?.[0]);
    this.cartProducts();
  }

  /**
   * Remove product from cart
   */
  removeFromCart(product: ProductData): void {
    this.cartService.removeFromCart(product, product.selectedVariants?.[0]);
    this.cartProducts();
  }

  /**
   * Clear entire cart
   */
  clearCart(): void {
    this.cartService.clearCart();
    this.isCartOpen = false;
  }

  /**
   * Toggle cart visibility (mobile/desktop)
   */
  toggleCart(): void {
    if (window.innerWidth < 768) {
      this.isCartOpen = !this.isCartOpen;
    } else {
      this.isCartSidebarVisible = !this.isCartSidebarVisible;
    }
  }

  /**
   * Get quantity of specific product in cart
   */
  productQuantityInCart(product: ProductData): number {
    const idToUse = product.selectedVariants?.[0] 
      ? `${product.id}-${product.selectedVariants[0].id}` 
      : product.id.toString();

    return this.cartProducts().get(idToUse)?.quantity || 0;
  }

  // ============ EVENT HANDLERS ============

  /**
   * Handle category change
   */
  changeCategory(category: string): void {
    this.selectedCategory.set(category);
    this.currentPage.set(1);
  }

  /**
   * Handle search input change
   */
  changeSearchInput(text: string): void {
    this.searchText.set(text);
    this.currentPage.set(1);
  }

  // ============ NAVIGATION METHODS ============

  /**
   * Navigate to checkout page
   */
  navigateToCheckout(): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    this.router.navigate(['/store', currentUuid, 'checkout']);
  }

  /**
   * Navigate to product details page
   */
  navigateToProductDetails(productId: number): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    
    if (currentUuid) {
      this.router.navigate(['product-details', productId], { relativeTo: this.route });
    } else {
      console.error('No store UUID found in route parameters');
    }
  }

  // ============ UI STATE METHODS ============

  /**
   * Toggle hamburger menu (mobile)
   */
  toggleHamburgerMenu(): void {
    this.isHamburgerMenuOpen = !this.isHamburgerMenuOpen;
  }

  /**
   * Open variant selection modal
   */
  openVariantModal(product: ProductData): void {
    this.selectedProduct = product;
    this.isVariantModalOpen = true;
  }

  /**
   * Close variant selection modal
   */
  closeVariantModal(): void {
    this.isVariantModalOpen = false;
    this.selectedProduct = null;
  }

  /**
   * Open payment modal
   */
  openPaymentModal(): void {
    this.isPaymentModalOpen = true;
  }

  /**
   * Close payment modal
   */
  closePaymentModal(): void {
    this.isPaymentModalOpen = false;
  }

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
  }

  // ============ HELPER METHODS ============

  /**
   * Check if product is in stock
   */
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
  /**
   * Get stock status text
   */
  getStockStatus(product: ProductData): string {
    return product.quantity > 0 ? `${product.quantity} available` : 'Out of stock';
  }

  /**
   * Get stock status class for styling
   */
  getStockStatusClass(product: ProductData): string {
    return product.quantity > 0 ? 'text-green-600' : 'text-red-600';
  }
  
  getDisplayEndIndex(): number {
    const endIndex = this.currentPage() * this.itemsPerPage();
    return Math.min(endIndex, this.filteredProducts().length);
  }

  navigateToCategoryPage(category: string): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    if (currentUuid) {
      this.router.navigate(['/store', currentUuid, 'category', category.toLowerCase()]);
    }
  }

  onProductSelect(productId: number): void {
    this.navigateToProductDetails(productId);
  }

  onSearchSubmit(searchTerm: string): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
    if (currentUuid && searchTerm.trim()) {
      this.router.navigate(['/store', currentUuid, 'category', 'search-results'], {
        queryParams: { search: searchTerm.trim() }
      });
    }
  }

  // Add scroll state tracking
  categoryScrollStates = new Map<string, { canScrollLeft: boolean; canScrollRight: boolean }>();

  /**
   * Scroll category left
   */
  scrollCategoryLeft(category: string): void {
    const container = document.querySelector(`[data-category="${category}"]`) as HTMLElement;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }

  /**
   * Scroll category right
   */
  scrollCategoryRight(category: string): void {
    const container = document.querySelector(`[data-category="${category}"]`) as HTMLElement;
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  /**
   * Check if can scroll left
   */
  canScrollLeft(category: string): boolean {
    const container = document.querySelector(`[data-category="${category}"]`) as HTMLElement;
    if (container) {
      return container.scrollLeft > 0;
    }
    return false;
  }

  /**
   * Check if can scroll right
   */
  canScrollRight(category: string): boolean {
    const container = document.querySelector(`[data-category="${category}"]`) as HTMLElement;
    if (container) {
      return container.scrollLeft < (container.scrollWidth - container.clientWidth - 1);
    }
    return false;
  }

  /**
   * Handle scroll events to update arrow states
   */
  onCategoryScroll(category: string, event: Event): void {
    const container = event.target as HTMLElement;
    this.categoryScrollStates.set(category, {
      canScrollLeft: container.scrollLeft > 0,
      canScrollRight: container.scrollLeft < (container.scrollWidth - container.clientWidth - 1)
    });
  }
}