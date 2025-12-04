import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductData } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';
import { ImageCacheService } from '../../../service/image-cache.service';
import { StoreCartService } from '../../../service/store-cart.service';
import { ProductHelperService } from '../../../service/product-helper.service';
import { AuthStateService } from '../../../service/auth-state.service'; // Add this

interface FilterState {
  priceRange: string;
  inStock: boolean;
  outOfStock: boolean;
  sortBy: string;
}

@Component({
  selector: 'app-category-products',
  templateUrl: './category-products.component.html',
  styleUrls: ['./category-products.component.scss']
})
export class CategoryProductsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Component state
  categoryName = '';
  storeUuid = '';
  allProducts: ProductData[] = [];
  filteredProducts = signal<ProductData[]>([]);
  searchText = signal('');
  isLoading = signal(true);
  
  // Filter state
  filters = signal<FilterState>({
    priceRange: '',
    inStock: false,
    outOfStock: false,
    sortBy: 'name-asc'
  });

  // UI state
  isCartOpen = false;
  isMobileFiltersOpen = false;
  isCartSidebarVisible = false; // Add this for desktop cart

  // Header data
  branches: any[] = [];
  user = signal({ name: 'Guest', isGuest: true }); // Change to signal

  // Computed values
  categoryOptions = computed(() => {
    const categories = new Set(this.allProducts.map(p => p.productCategory?.name).filter(Boolean));
    return Array.from(categories).map(cat => ({
      label: cat as string,
      value: cat as string
    }));
  });

  selectedCategory = computed(() => this.categoryName);
  
  // Cart signals
  cartProducts = computed(() => this.cartService.cart().items);
  isCartEmpty = computed(() => this.cartService.isCartEmpty());
  totalCartItems = computed(() => this.cartService.totalItems());
  cartSubtotal = computed(() => this.cartService.cart().subtotal);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private posService: PosServiceService,
    private imageCacheService: ImageCacheService,
    private cartService: StoreCartService,
    private productHelper: ProductHelperService,
    private authStateService: AuthStateService // Add this
  ) {}

  ngOnInit(): void {
    this.loadBranches();
    this.setupRouteListener();
    
    // Subscribe to auth state
    this.authStateService.user$.subscribe(user => {
      this.user.set(user);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBranches(): void {
    this.posService.getBranches()
      .pipe(takeUntil(this.destroy$))
      .subscribe(branches => {
        this.branches = branches;
      });
  }

  private setupRouteListener(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.storeUuid = params.get('uuid') || '';
        const categoryName = params.get('categoryName');
        
        if (categoryName) {
          if (categoryName === 'search-results') {
            this.categoryName = 'Search Results';
            this.handleSearchResultsPage();
          } else {
            this.categoryName = this.formatCategoryName(categoryName);
            this.loadCategoryProducts();
          }
        }
      });

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const search = params.get('search');
        if (search) {
          this.searchText.set(search);
          this.applyFiltersAndSearch();
        }
      });
  }

  private handleSearchResultsPage(): void {
    // Load all products for search results
    this.isLoading.set(true);
    
    this.posService.getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.allProducts = products;
          this.applyFiltersAndSearch();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading products', error);
          this.isLoading.set(false);
        }
      });
  }

  private applyFiltersAndSearch(): void {
    if (!this.allProducts.length) return;

    let filtered = this.allProducts;

    // If we're on a specific category page (not search-results), filter by category
    if (this.categoryName !== 'Search Results') {
      filtered = filtered.filter(product => 
        product.productCategory?.name?.toLowerCase() === this.categoryName.toLowerCase()
      );
    }

    // Apply search filter if there's a search term
    if (this.searchText()) {
      const searchTerm = this.searchText().toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm) ||
        product.productCategory?.name?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply other filters (stock, price, etc.)
    const currentFilters = this.filters();
    if (currentFilters.inStock && !currentFilters.outOfStock) {
      filtered = filtered.filter(product => (product.quantity || 0) > 0);
    } else if (currentFilters.outOfStock && !currentFilters.inStock) {
      filtered = filtered.filter(product => (product.quantity || 0) === 0);
    }

    if (currentFilters.priceRange) {
      filtered = this.applyPriceFilter(filtered, currentFilters.priceRange);
    }

    filtered = this.applySorting(filtered, currentFilters.sortBy);

    this.filteredProducts.set(filtered);
  }

  private loadCategoryProducts(): void {
    this.isLoading.set(true);
    
    this.posService.getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.allProducts = products;
          this.applyFiltersAndSearch();
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading products', error);
          this.isLoading.set(false);
        }
      });
  }

  private formatCategoryName(category: string): string {
    return category.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private applyPriceFilter(products: ProductData[], priceRange: string): ProductData[] {
    return products.filter(product => {
      const price = this.getProductPrice(product);
      
      switch (priceRange) {
        case '0-1000':
          return price <= 1000;
        case '1000-5000':
          return price > 1000 && price <= 5000;
        case '5000-10000':
          return price > 5000 && price <= 10000;
        case '10000+':
          return price > 10000;
        default:
          return true;
      }
    });
  }

  private getProductPrice(product: ProductData): number {
    const price = product.sellingPrice;
    if (typeof price === 'number') {
      return price;
    }
    if (typeof price === 'string') {
      return parseFloat(price) || 0;
    }
    return 0;
  }

  private applySorting(products: ProductData[], sortBy: string): ProductData[] {
    return [...products].sort((a, b) => {
      const priceA = this.getProductPrice(a);
      const priceB = this.getProductPrice(b);
      const nameA = a.name || '';
      const nameB = b.name || '';
      
      switch (sortBy) {
        case 'price-asc':
          return priceA - priceB;
        case 'price-desc':
          return priceB - priceA;
        case 'name-asc':
          return nameA.localeCompare(nameB);
        case 'name-desc':
          return nameB.localeCompare(nameA);
        default:
          return 0;
      }
    });
  }

  // ============ FILTER METHODS ============

  updatePriceRange(priceRange: string): void {
    this.filters.update(current => ({ ...current, priceRange }));
    this.applyFiltersAndSearch();
  }

  updateStockFilter(type: 'inStock' | 'outOfStock', value: boolean): void {
    this.filters.update(current => ({ ...current, [type]: value }));
    this.applyFiltersAndSearch();
  }

  updateSort(sortBy: string): void {
    this.filters.update(current => ({ ...current, sortBy }));
    this.applyFiltersAndSearch();
  }

  clearFilters(): void {
    this.filters.set({
      priceRange: '',
      inStock: false,
      outOfStock: false,
      sortBy: 'name-asc'
    });
    this.applyFiltersAndSearch();
  }

  // ============ HEADER EVENT HANDLERS ============

  onCategoryChange(category: string): void {
    if (category === 'All') {
      this.navigateToAllProducts();
    } else {
      this.router.navigate(['/user/checkout/store', this.storeUuid, 'category', category.toLowerCase()]);
    }
  }

  onSearchChange(searchText: string): void {
    this.searchText.set(searchText);
    this.applyFiltersAndSearch();
    
    const queryParams = searchText ? { search: searchText } : {};
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  onToggleCart(): void {
    if (window.innerWidth < 768) {
      this.isCartOpen = !this.isCartOpen;
    } else {
      this.isCartSidebarVisible = !this.isCartSidebarVisible;
    }
  }

  // ============ NAVIGATION METHODS ============

  navigateToAllProducts(): void {
    this.router.navigate(['/user/checkout/store', this.storeUuid]);
  }

  // FIXED: This method was not being called
  navigateToProductDetails(productId: number): void {
    this.router.navigate(['/user/checkout/store', this.storeUuid, 'product-details', productId]);
  }

  // ============ PRODUCT METHODS ============

  getProductImage(product: ProductData) {
    return this.imageCacheService.getProductImage(product);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/placeholder-product.jpg';
  }

  // ============ CART METHODS ============

  addToCart(product: ProductData): void {
    // Check if product is in stock
    if (product.quantity === 0) {
      return;
    }

    // Get current quantity in cart
    const currentQuantity = this.cartProducts().get(product.id.toString())?.quantity || 0;
    
    // Check if adding would exceed available stock
    if (currentQuantity >= product.quantity) {
      return;
    }

    // Add to cart
    this.cartService.addToCart(product);
    
    // Auto-open cart
    this.autoOpenCart();
  }

  reduceQuantityInCart(product: ProductData): void {
    const currentQuantity = this.cartProducts().get(product.id.toString())?.quantity || 0;
    this.cartService.updateQuantity(product, currentQuantity - 1);
  }

  removeFromCart(product: ProductData): void {
    this.cartService.removeFromCart(product);
  }

  clearCart(): void {
    this.cartService.clearCart();
    this.isCartOpen = false;
    this.isCartSidebarVisible = false;
  }

  private autoOpenCart(): void {
    if (window.innerWidth >= 768) {
      this.isCartSidebarVisible = true;
    } else {
      this.isCartOpen = true;
    }
  }

  getTotalCartItems(): number {
    return this.totalCartItems();
  }

  getCartSubtotal(): number {
    return this.cartSubtotal();
  }

  // ============ UI METHODS ============

  toggleMobileFilters(): void {
    this.isMobileFiltersOpen = !this.isMobileFiltersOpen;
  }

  hasActiveFilters(): boolean {
    const current = this.filters();
    return !!current.priceRange || current.inStock || current.outOfStock || current.sortBy !== 'name-asc';
  }

  getActiveFiltersCount(): number {
    let count = 0;
    const current = this.filters();
    
    if (current.priceRange) count++;
    if (current.inStock) count++;
    if (current.outOfStock) count++;
    if (current.sortBy !== 'name-asc') count++;
    
    return count;
  }

  navigateToCheckout(): void {
  this.isCartOpen = false;
  this.isCartSidebarVisible = false;
  this.router.navigate(['user/checkout/store', this.storeUuid, 'checkout']);
}

  // Price formatting helper
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
      return '₦0';
    }
  }

  // Add to your component
selectedBranch: any = null;

// Add these methods
onBranchChange(branch: any): void {
  this.selectedBranch = branch;
}

onMobileCategoryNavigate(category: string): void {
  this.navigateToCategoryPage(category);
}

private navigateToCategoryPage(category: string): void {
  this.router.navigate(['/user/checkout/store', this.storeUuid, 'category', category.toLowerCase()]);
}
}