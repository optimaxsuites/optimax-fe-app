import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProductData } from '../../../models/interface';
import { PosServiceService } from '../../../service/pos-service.service';
import { OptimizedImageService } from '../../../service/optimized-image.service';
import { StoreCartService } from '../../../service/store-cart.service';
import { ProductHelperService } from '../../../service/product-helper.service';
import { AuthStateService } from '../../../service/auth-state.service';

interface FilterState {
  priceRange: string;
  inStock: boolean;
  outOfStock: boolean;
  sortBy: string;
}

interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  leaving?: boolean;
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
  isCartSidebarVisible = false;

  // Header data
  branches: any[] = [];
  user = signal({ name: 'Guest', isGuest: true });

  // Toast notifications
  toasts = signal<Toast[]>([]);

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
    private imageService: OptimizedImageService,
    private cartService: StoreCartService,
    private productHelper: ProductHelperService,
    private authStateService: AuthStateService
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
      const price = this.getDiscountedPrice(product);
      
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

  private applySorting(products: ProductData[], sortBy: string): ProductData[] {
    return [...products].sort((a, b) => {
      const priceA = this.getDiscountedPrice(a);
      const priceB = this.getDiscountedPrice(b);
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

  // ============ DISCOUNT METHODS ============

  // Get selling price (with discount applied)
  getSellingPrice(product: ProductData): number {
    if (!product || !product.sellingPrice) return 0;
    
    return typeof product.sellingPrice === 'string'
      ? parseFloat(product.sellingPrice)
      : product.sellingPrice;
  }

  // Get cost price (original price)
  getCostPrice(product: ProductData): number {
    if (!product || !product.costPrice) {
      // Fallback to selling price if no cost price
      return this.getSellingPrice(product);
    }
    
    return typeof product.costPrice === 'string'
      ? parseFloat(product.costPrice)
      : product.costPrice;
  }

  // Check if product has discount
  hasDiscount(product: ProductData): boolean {
    if (!product?.discount) return false;
    
    const discount = product.discount;
    
    // Check if discount is active
    if (discount.active === false) return false;
    
    // Check if discount has a valid value
    if (discount.value && discount.value > 0) {
      return true;
    }
    
    // Check discountValue property as alternative
    if (discount.discountValue && discount.discountValue > 0) {
      return true;
    }
    
    // Check if discount dates are valid
    if (discount.startDate && discount.endDate) {
      const now = new Date();
      const startDate = new Date(discount.startDate);
      const endDate = new Date(discount.endDate);
      
      if (now < startDate || now > endDate) {
        return false;
      }
    }
    
    // Check price difference as last resort
    return this.calculateDiscountFromPrices(product) > 0;
  }

  // Calculate discount percentage
  getDiscountPercentage(product: ProductData): number {
    if (!product?.discount) return 0;
    
    const discount = product.discount;
    
    // Check if discountType is an object with name property
    if (discount.discountType) {
      const discountTypeName = discount.discountType.name || discount.discountType;
      
      if (discountTypeName === 'PERCENTAGE' && discount.value) {
        return Math.round(discount.value);
      }
      
      // For fixed amount discounts, calculate percentage from price
      if ((discountTypeName === 'FIXED_AMOUNT' || discountTypeName === 'AMOUNT') && discount.value) {
        const costPrice = this.getCostPrice(product);
        if (costPrice > 0) {
          const percentage = (discount.value / costPrice) * 100;
          return Math.round(percentage);
        }
      }
    }
    
    // Fallback: Check if there's a discount value
    if (discount.value) {
      return Math.round(discount.value);
    }
    
    // Final fallback: Calculate from price difference
    return this.calculateDiscountFromPrices(product);
  }

  // Helper method to calculate discount from price difference
  calculateDiscountFromPrices(product: ProductData): number {
    const sellingPrice = this.getSellingPrice(product);
    const costPrice = this.getCostPrice(product);
    
    // If no valid prices or cost price is 0, return 0
    if (!costPrice || costPrice <= 0 || sellingPrice >= costPrice) {
      return 0;
    }
    
    const discountAmount = costPrice - sellingPrice;
    const percentage = (discountAmount / costPrice) * 100;
    
    // Round to nearest whole number
    return Math.round(percentage);
  }

  // Get discounted price
  getDiscountedPrice(product: ProductData): number {
    const costPrice = this.getCostPrice(product);
    
    if (!this.hasDiscount(product)) {
      return this.getSellingPrice(product);
    }
    
    const discount = product.discount;
    
    if (discount?.discountType) {
      const discountTypeName = discount.discountType.name || discount.discountType;
      
      // Percentage discount
      if (discountTypeName === 'PERCENTAGE' && discount.value) {
        const discountAmount = costPrice * (discount.value / 100);
        return Math.max(0, costPrice - discountAmount);
      }
      
      // Fixed amount discount
      if ((discountTypeName === 'FIXED_AMOUNT' || discountTypeName === 'AMOUNT') && discount.value) {
        return Math.max(0, costPrice - discount.value);
      }
    }
    
    // Fallback: Use discount value if available
    if (discount?.value) {
      // Assume it's a percentage if no type specified
      const discountAmount = costPrice * (discount.value / 100);
      return Math.max(0, costPrice - discountAmount);
    }
    
    // Fallback: Use discountValue if available
    if (discount?.discountValue) {
      const discountAmount = costPrice * (discount.discountValue / 100);
      return Math.max(0, costPrice - discountAmount);
    }
    
    // Final fallback: Return selling price
    return this.getSellingPrice(product);
  }

  // Calculate how much customer saves
  getSavingsAmount(product: ProductData): number {
    if (!this.hasDiscount(product)) return 0;
    
    const costPrice = this.getCostPrice(product);
    const discountedPrice = this.getDiscountedPrice(product);
    
    return costPrice - discountedPrice;
  }

  // Format savings for display
  getSavingsText(product: ProductData): string {
    const savings = this.getSavingsAmount(product);
    if (savings <= 0) return '';
    
    const percentage = this.getDiscountPercentage(product);
    return `Save ${this.formatPrice(savings)} (${percentage}%)`;
  }

  // ============ TOAST METHODS ============

  showToast(
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration: number = 5000
  ): void {
    const toast: Toast = {
      id: Date.now(),
      title,
      message,
      type
    };
    
    this.toasts.update(toasts => [...toasts, toast]);
    
    setTimeout(() => {
      this.removeToast(toast.id);
    }, duration);
  }

  removeToast(toastId: number): void {
    this.toasts.update(toasts => {
      const toast = toasts.find(t => t.id === toastId);
      if (toast) {
        toast.leaving = true;
      }
      return [...toasts];
    });
    
    setTimeout(() => {
      this.toasts.update(toasts => toasts.filter(t => t.id !== toastId));
    }, 300);
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
      this.router.navigate(['optimerce', this.storeUuid, 'category', category.toLowerCase()]);
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
    this.router.navigate(['optimerce', this.storeUuid]);
  }

  navigateToProductDetails(productId: number): void {
    this.router.navigate(['optimerce', this.storeUuid, 'product-details', productId]);
  }

  // ============ PRODUCT METHODS ============

  getProductImage(product: ProductData): string {
    return this.imageService.getProductImage(product);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/placeholder-product.jpg';
  }

  // ============ CART METHODS ============

  addToCart(product: ProductData): void {
    // Check if product is in stock
    if (product.quantity === 0) {
      this.showToast(
        'Out of Stock',
        `${product.name} is currently out of stock.`,
        'warning'
      );
      return;
    }

    // Get current quantity in cart
    const currentQuantity = this.cartProducts().get(product.id.toString())?.quantity || 0;
    
    // Check if adding would exceed available stock
    if (currentQuantity >= product.quantity) {
      this.showToast(
        'Maximum Quantity Reached',
        `Only ${product.quantity} items available for ${product.name}.`,
        'warning'
      );
      return;
    }

    // Add to cart
    this.cartService.addToCart(product);
    
    // Show success toast ONLY on mobile (screen width < 768px)
    if (window.innerWidth < 768) {
      this.showToast(
        'Added to Cart! 🛒',
        `${product.name} has been added to your cart.`,
        'success'
      );
    }
    
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
    }
  }

  getTotalCartItems(): number {
    return this.totalCartItems();
  }

  getCartSubtotal(): number {
    return this.cartSubtotal();
  }

  // Add this method to get the price to display in cart
  getCartItemPrice(cartItem: any): number {
    // Use unitPrice if available (already discounted), otherwise fallback to selling price
    return cartItem.unitPrice || this.getSellingPrice(cartItem.product);
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
    this.router.navigate(['optimerce', this.storeUuid, 'checkout']);
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

  // ============ BRANCH METHODS ============

  selectedBranch: any = null;

  onBranchChange(branch: any): void {
    this.selectedBranch = branch;
  }

  onMobileCategoryNavigate(category: string): void {
    this.navigateToCategoryPage(category);
  }

  private navigateToCategoryPage(category: string): void {
    this.router.navigate(['optimerce', this.storeUuid, 'category', category.toLowerCase()]);
  }

  // Get discount info for badge (quick version)
  getDiscountInfoQuick(product: ProductData): string {
    if (!this.hasDiscount(product)) return '';
    
    const percentage = this.getDiscountPercentage(product);
    if (percentage > 0) {
      return `-${Math.round(percentage)}%`;
    }
    
    return 'SALE';
  }

  // Quick check for discount
  hasDiscountQuick(product: ProductData): boolean {
    return !!(product?.discount && product.discount.value && product.discount.value > 0);
  }

  // Get discount amount (in currency)
  getDiscountAmount(product: ProductData): number {
    if (!this.hasDiscount(product)) return 0;
    
    const costPrice = this.getCostPrice(product);
    const sellingPrice = this.getSellingPrice(product);
    
    // If we have discount object with fixed amount
    if (product.discount?.value && 
        (product.discount.discountType?.name === 'FIXED_AMOUNT' || 
         product.discount.discountType?.name === 'AMOUNT')) {
      return product.discount.value;
    }
    
    // Otherwise calculate from price difference
    return Math.max(0, costPrice - sellingPrice);
  }

  // Get formatted discount info for badge
  getDiscountInfo(product: ProductData): string {
    if (!this.hasDiscount(product)) return '';
    
    const discount = product.discount;
    let displayText = '';
    
    if (discount?.discountType) {
      const discountTypeName = discount.discountType.name || discount.discountType;
      
      if (discountTypeName === 'PERCENTAGE' && discount.value) {
        displayText = `${Math.round(discount.value)}% OFF`;
      } else if ((discountTypeName === 'FIXED_AMOUNT' || discountTypeName === 'AMOUNT') && discount.value) {
        displayText = `-${this.formatPrice(discount.value)} OFF`;
      } else if (discount.value) {
        displayText = `${Math.round(discount.value)}% OFF`;
      }
    } else if (discount?.value) {
      displayText = `${Math.round(discount.value)}% OFF`;
    } else if (discount?.discountValue) {
      displayText = `${Math.round(discount.discountValue)}% OFF`;
    } else {
      const percentage = this.getDiscountPercentage(product);
      if (percentage > 0) {
        displayText = `${percentage}% OFF`;
      } else {
        displayText = 'SALE';
      }
    }
    
    return displayText;
  }

  // Get discount type name for display
  getDiscountType(product: ProductData): string {
    if (!product?.discount?.discountType?.name) return 'Discount';
    
    return product.discount.discountType.name;
  }

  // Get discount name/description
  getDiscountDescription(product: ProductData): string {
    if (!product?.discount?.name) return '';
    
    return product.discount.name;
  }

  // Get discount min quantity
  getDiscountMinQuantity(product: ProductData): number {
    if (!product?.discount?.minQuantity) return 0;
    
    return product.discount.minQuantity;
  }

  // Debug method to check discount structure
  debugDiscountStructure(product: ProductData): void {
    console.log('🔍 Debugging discount structure for:', product.name);
    console.log('Discount object:', product.discount);
    
    if (product.discount) {
      console.log('Discount value:', product.discount.value);
      console.log('Discount value type:', typeof product.discount.value);
      console.log('DiscountValue:', product.discount.discountValue);
      console.log('Discount type:', product.discount.discountType);
      
      if (product.discount.discountType) {
        console.log('Discount type name:', product.discount.discountType.name);
        console.log('Discount type typeof:', typeof product.discount.discountType);
      }
      
      console.log('Active:', product.discount.active);
      console.log('Start date:', product.discount.startDate);
      console.log('End date:', product.discount.endDate);
    }
    
    console.log('Calculated discount percentage:', this.getDiscountPercentage(product));
    console.log('Has discount:', this.hasDiscount(product));
    console.log('---');
  }
}