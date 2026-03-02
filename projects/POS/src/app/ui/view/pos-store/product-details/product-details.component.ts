import { Component, OnInit, signal, computed, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { CurrencyPipe } from '@angular/common';

import { ProductData, VariantDTO, ProductImageDTO, DiscountDTO } from '../../../models/interface';
import { ImageCacheService } from '../../../service/image-cache.service';
import { PosServiceService } from '../../../service/pos-service.service';
import { StoreCartService } from '../../../service/store-cart.service';
import { AuthStateService } from '../../../service/auth-state.service';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss'],
  providers: [CurrencyPipe]
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  // Signals
  product = signal<ProductData | null>(null);
  isLoading = signal(true);
  quantity = signal(1);
  storeUuid = '';
  
  // Add allProducts property for header
  allProducts: ProductData[] = [];

  // Cart visibility signals
  isCartOpen = false;
  isCartSidebarVisible = false;

  // Image gallery signals
  selectedImageIndex = signal(0);
  isImageModalOpen = signal(false);

  // Toast notification
  showToast = signal(false);
  toastMessage = signal('');

  // Cart signals
  cartProducts = computed(() => this.cartService.cart().items);
  isCartEmpty = computed(() => this.cartService.isCartEmpty());
  totalCartItems = computed(() => this.cartService.totalItems());

  // Related products with pagination
  relatedProducts = signal<ProductData[]>([]);
  currentRelatedPage = signal(1);
  relatedItemsPerPage = signal(4);
  totalRelatedPages = signal(1);

  // Scroll to top
  showScrollToTop = signal(false);

  // Header data
  branches: any[] = [];
  user = signal({ name: 'Guest', isGuest: true });
  selectedCategory = signal('All');
  searchText = signal('');

  // Subscriptions
  private routeSubscription!: Subscription;
  private navigationSubscription!: Subscription;
  private authSubscription!: Subscription;

  // Computed values
  categoryOptions = computed(() => {
    const categories = new Set(this.allProducts.map(p => p.productCategory?.name).filter(Boolean));
    return [
      { label: 'Category', value: 'All' },
      ...Array.from(categories).map(cat => ({
        label: cat as string,
        value: (cat as string).toLowerCase()
      }))
    ];
  });

  // Computed for current selected image
  currentImage = computed((): ProductImageDTO | undefined => {
    const product = this.product();
    const index = this.selectedImageIndex();

    if (!product || !product.productImages || product.productImages.length === 0) {
      return undefined;
    }

    return product.productImages[index] || product.productImages[0];
  });

  // Computed for all product images
  allImages = computed(() => {
    const product = this.product();
    return product?.productImages || [];
  });

  hasMultipleImages = computed(() => {
    return this.allImages().length > 1;
  });

  // Computed for paginated related products
  paginatedRelatedProducts = computed(() => {
    const related = this.relatedProducts();
    const startIndex = (this.currentRelatedPage() - 1) * this.relatedItemsPerPage();
    const endIndex = startIndex + this.relatedItemsPerPage();
    return related.slice(startIndex, endIndex);
  });

  // Computed for cart subtotal
  cartSubtotal = computed(() => {
    return this.cartService.cart().subtotal;
  });

  @ViewChild('mainContent') mainContent!: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private posService: PosServiceService,
    private imageCacheService: ImageCacheService,
    private cartService: StoreCartService,
    private authStateService: AuthStateService,
    private currencyPipe: CurrencyPipe
  ) {}

  ngOnInit(): void {
    this.storeUuid = this.route.snapshot.paramMap.get('uuid') || '';
    
    // Add scroll listener for scroll-to-top button
    this.addScrollListener();

    // Load branches
    this.loadBranches();

    // Subscribe to auth state
    this.authSubscription = this.authStateService.user$.subscribe(user => {
      this.user.set(user);
    });

    // Initial load
    this.loadProductFromRoute();

    // Listen for route changes (when clicking related products)
    this.routeSubscription = this.route.paramMap
      .pipe(
        filter(params => params.has('id')),
        distinctUntilChanged()
      )
      .subscribe(params => {
        const productId = params.get('id');
        if (productId) {
          console.log('Route changed to product ID:', productId);
          this.loadProductDetails(parseInt(productId));
        }
      });

    // Listen for navigation events to handle browser back/forward
    this.navigationSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        console.log('Navigation ended, reloading product from route');
        this.loadProductFromRoute();
      });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    
    // Clean up scroll listener
    window.removeEventListener('scroll', this.onScroll.bind(this));
    // Clean up keyboard listener
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private loadBranches(): void {
    this.posService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches;
      },
      error: (error) => {
        console.error('Error loading branches:', error);
      }
    });
  }

  private loadProductFromRoute(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      console.log('Initial load for product ID:', productId);
      this.loadProductDetails(parseInt(productId));
    } else {
      this.isLoading.set(false);
      console.error('No product ID found in route');
    }
  }

  private loadProductDetails(productId: number): void {
    console.log('Loading product details for ID:', productId);
    this.isLoading.set(true);
    
    // Reset component state for new product
    this.product.set(null);
    this.selectedImageIndex.set(0);
    this.quantity.set(1);
    this.relatedProducts.set([]);
    
    this.posService.getProducts().subscribe({
      next: (products: ProductData[]) => {
        console.log('Products loaded from service:', products.length);
        
        // Store all products for header
        this.allProducts = products;
        
        const foundProduct = products.find((p: ProductData) => p.id === productId);
        console.log('Found product:', foundProduct);
        
        if (foundProduct) {
          this.product.set(foundProduct);
          // Preload images for better performance
          this.imageCacheService.preloadProductImages(foundProduct);
          this.loadRelatedProducts(foundProduct, products);
          
          // Update browser title
          document.title = `${foundProduct.name} - Store`;
          
          // Scroll to top after a small delay to ensure DOM is updated
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        } else {
          this.product.set(null);
          console.error('Product not found:', productId);
          this.showToastMessage('Product not found');
        }
        
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading product details:', error);
        this.product.set(null);
        this.isLoading.set(false);
        this.showToastMessage('Failed to load product details. Please try again.');
      }
    });
  }

  private loadRelatedProducts(
    currentProduct: ProductData,
    allProducts: ProductData[]
  ): void {
    const related = allProducts.filter(
      (p: ProductData) =>
        p.id !== currentProduct.id &&
        p.productCategory?.id === currentProduct.productCategory?.id
    );

    console.log('Loaded related products:', related.length);
    this.relatedProducts.set(related);
    this.totalRelatedPages.set(
      Math.ceil(related.length / this.relatedItemsPerPage())
    );

    // Preload related product images
    this.imageCacheService.preloadRelatedProductsImages(related);
  }

  // Image gallery methods
  selectImage(index: number): void {
    const images = this.allImages();
    if (index >= 0 && index < images.length) {
      this.selectedImageIndex.set(index);
    }
  }

  nextImage(): void {
    const images = this.allImages();
    const currentIndex = this.selectedImageIndex();
    const nextIndex = (currentIndex + 1) % images.length;
    this.selectedImageIndex.set(nextIndex);
  }

  previousImage(): void {
    const images = this.allImages();
    const currentIndex = this.selectedImageIndex();
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    this.selectedImageIndex.set(prevIndex);
  }

  openImageModal(): void {
    this.isImageModalOpen.set(true);
    // Add keyboard event listener
    document.addEventListener('keydown', this.handleKeyDown);
  }

  closeImageModal(): void {
    this.isImageModalOpen.set(false);
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  // Navigation methods
  navigateToProductDetails(productId: number): void {
    console.log('Navigating to product ID:', productId);
    this.router.navigate(
      ['/optimerce', this.storeUuid, 'product-details', productId]
    ).then(success => {
      if (!success) {
        console.error('Navigation failed for product ID:', productId);
        this.showToastMessage('Failed to navigate to product');
      }
    });
  }

  // Scroll to top functionality
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private addScrollListener(): void {
    window.addEventListener('scroll', this.onScroll.bind(this));
  }

  private onScroll(): void {
    this.showScrollToTop.set(window.scrollY > 300);
  }

  // Related products pagination
  nextRelatedPage(): void {
    if (this.currentRelatedPage() < this.totalRelatedPages()) {
      this.currentRelatedPage.set(this.currentRelatedPage() + 1);
    }
  }

  previousRelatedPage(): void {
    if (this.currentRelatedPage() > 1) {
      this.currentRelatedPage.set(this.currentRelatedPage() - 1);
    }
  }

  goToRelatedPage(page: number): void {
    if (page >= 1 && page <= this.totalRelatedPages()) {
      this.currentRelatedPage.set(page);
    }
  }

  getRelatedPageNumbers(): (number | string)[] {
    const total = this.totalRelatedPages();
    const current = this.currentRelatedPage();
    const pages: (number | string)[] = [];

    if (total <= 5) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 3; i <= total; i++) pages.push(i);
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

  // Image methods
  getProductImage(
    product: ProductData,
    specificImage?: ProductImageDTO | null
  ): Observable<string> {
    // For related products, always use their first image
    if (product.id !== this.product()?.id) {
      return this.imageCacheService.getProductImage(product);
    }

    // For main product with specific image (handle null case)
    if (specificImage && specificImage.imgNo) {
      const imageUrl = this.imageCacheService.getImageUrlFromDTO(specificImage);
      return this.imageCacheService.getImage(imageUrl);
    }

    // For main product with selected index
    if (this.selectedImageIndex() > 0 && product.productImages) {
      return this.imageCacheService.getProductImageByIndex(
        product,
        this.selectedImageIndex()
      );
    }

    // Default to first image
    return this.imageCacheService.getProductImage(product);
  }

  getThumbnailImage(
    product: ProductData,
    image: ProductImageDTO
  ): Observable<string> {
    const imageUrl = this.imageCacheService.getImageUrlFromDTO(image);
    return this.imageCacheService.getImage(imageUrl);
  }

  // Cart methods
  getTotalCartItems(): number {
    return this.totalCartItems();
  }

  getCartSubtotal(): number {
    return this.cartSubtotal();
  }

  toggleCart(): void {
    if (window.innerWidth < 768) {
      this.isCartOpen = !this.isCartOpen;
    } else {
      this.isCartSidebarVisible = !this.isCartSidebarVisible;
    }
  }

  addToCart(product?: ProductData): void {
    const productToAdd = product || this.product();
    if (!productToAdd || !this.isInStock(productToAdd)) return;

    for (let i = 0; i < this.quantity(); i++) {
      this.cartService.addToCart(productToAdd);
    }

    this.quantity.set(1);
    this.autoOpenCart();
  }

  addVariantToCart(variant: VariantDTO): void {
    const product = this.product();
    if (!product || variant.quantity === 0) return;

    for (let i = 0; i < this.quantity(); i++) {
      this.cartService.addToCart(product, variant);
    }

    this.quantity.set(1);
    this.autoOpenCart();
  }

  addRelatedToCart(relatedProduct: ProductData): void {
    this.cartService.addToCart(relatedProduct);
    this.autoOpenCart();
  }

  private autoOpenCart(): void {
    if (window.innerWidth >= 768) {
      this.isCartSidebarVisible = true;
    } else {
      this.isCartOpen = true;
    }
    
    // Show toast message for mobile
    if (window.innerWidth < 768) {
      this.showToastMessage('Product added to cart!');
    }
  }

  private showToastMessage(message: string): void {
    this.toastMessage.set(message);
    this.showToast.set(true);

    setTimeout(() => {
      this.showToast.set(false);
    }, 3000);
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
    this.isCartSidebarVisible = false;
  }

  navigateToCheckout(): void {
    this.isCartOpen = false;
    this.isCartSidebarVisible = false;
    this.router.navigate(['optimerce', this.storeUuid, 'checkout']);
  }

  // Helper methods with null safety
  getSellingPrice(product?: ProductData): number {
    const productToUse = product || this.product();
    if (!productToUse?.sellingPrice) return 0;

    return typeof productToUse.sellingPrice === 'string'
      ? parseFloat(productToUse.sellingPrice)
      : productToUse.sellingPrice;
  }

  getCostPrice(product?: ProductData): number {
    const productToUse = product || this.product();
    if (!productToUse?.costPrice) {
      // Fallback to selling price if no cost price
      return this.getSellingPrice(productToUse || undefined);
    }

    return typeof productToUse.costPrice === 'string'
      ? parseFloat(productToUse.costPrice)
      : productToUse.costPrice;
  }

  // Discount-related methods with null safety
  hasDiscount(product?: ProductData): boolean {
    const productToUse = product || this.product();
    if (!productToUse) return false;
    
    // First check if there's a discount object
    if (productToUse.discount) {
      return this.isDiscountActive(productToUse.discount);
    }
    
    // Fallback: Check price difference
    return this.calculateDiscountFromPrices(productToUse) > 0;
  }

  private isDiscountActive(discount: DiscountDTO): boolean {
    if (discount.active === false) return false;
    
    // Check if discount has a valid value
    if (discount.value && discount.value > 0) {
      // Check discount dates if they exist
      if (discount.startDate && discount.endDate) {
        const now = new Date();
        const startDate = new Date(discount.startDate);
        const endDate = new Date(discount.endDate);
        
        if (now < startDate || now > endDate) {
          return false;
        }
      }
      return true;
    }
    
    return false;
  }

  private calculateDiscountFromPrices(product: ProductData): number {
    if (!product) return 0;
    
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

  getDiscountPercentage(product?: ProductData): number {
    const productToUse = product || this.product();
    if (!productToUse?.discount) return 0;
    
    const discount = productToUse.discount;
    
    // Check if discountType is an object with name property
    if (discount.discountType) {
      const discountTypeName = discount.discountType.name || discount.discountType;
      
      if (discountTypeName === 'PERCENTAGE' && discount.value) {
        return Math.round(discount.value);
      }
      
      // For fixed amount discounts, calculate percentage from price
      if ((discountTypeName === 'FIXED_AMOUNT' || discountTypeName === 'AMOUNT') && discount.value) {
        const costPrice = this.getCostPrice(productToUse);
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
    return this.calculateDiscountFromPrices(productToUse);
  }

  getDiscountType(product?: ProductData): string {
    const productToUse = product || this.product();
    if (!productToUse?.discount?.discountType?.name) return 'Discount';
    
    return productToUse.discount.discountType.name;
  }

  getDiscountDescription(product?: ProductData): string {
    const productToUse = product || this.product();
    if (!productToUse?.discount?.name) return '';
    
    return productToUse.discount.name;
  }

  getDiscountedPrice(product?: ProductData): number {
    const productToUse = product || this.product();
    if (!productToUse) return 0;
    
    const costPrice = this.getCostPrice(productToUse);
    
    if (!this.hasDiscount(productToUse)) {
      return this.getSellingPrice(productToUse);
    }
    
    const discount = productToUse.discount;
    
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
    return this.getSellingPrice(productToUse);
  }

  getDiscountAmount(product?: ProductData): number {
    const productToUse = product || this.product();
    if (!productToUse || !this.hasDiscount(productToUse)) return 0;
    
    const costPrice = this.getCostPrice(productToUse);
    const sellingPrice = this.getSellingPrice(productToUse);
    
    // If we have discount object with fixed amount
    if (productToUse.discount?.value && 
        (productToUse.discount.discountType?.name === 'FIXED_AMOUNT' || 
         productToUse.discount.discountType?.name === 'AMOUNT')) {
      return productToUse.discount.value;
    }
    
    // Otherwise calculate from price difference
    return Math.max(0, costPrice - sellingPrice);
  }

  getSavingsAmount(product?: ProductData): number {
    const productToUse = product || this.product();
    if (!productToUse || !this.hasDiscount(productToUse)) return 0;
    
    const costPrice = this.getCostPrice(productToUse);
    const discountedPrice = this.getDiscountedPrice(productToUse);
    
    return costPrice - discountedPrice;
  }

  getSavingsText(product?: ProductData): string {
    const productToUse = product || this.product();
    if (!productToUse) return '';
    
    const savings = this.getSavingsAmount(productToUse);
    if (savings <= 0) return '';
    
    const percentage = this.getDiscountPercentage(productToUse);
    return `Save ${this.formatPrice(savings)} (${percentage}%)`;
  }

  isInStock(product?: ProductData): boolean {
    const productToUse = product || this.product();
    return !!(productToUse?.quantity && productToUse.quantity > 0);
  }

  getAvailableQuantity(product?: ProductData): number {
    const productToUse = product || this.product();
    return productToUse?.quantity || 0;
  }

  hasVariants(): boolean {
    const product = this.product();
    return !!(product?.variants && product.variants.length > 0);
  }

  getVariants(): VariantDTO[] {
    const product = this.product();
    return product?.variants || [];
  }

  canIncreaseQuantity(): boolean {
    const currentQuantity = this.quantity();
    const maxQuantity = this.getAvailableQuantity();
    return currentQuantity < maxQuantity;
  }

  calculateTotalPrice(): number {
    const product = this.product();
    if (!product) return 0;
    
    return this.getDiscountedPrice(product) * this.quantity();
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
      return '₦0';
    }
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/placeholder-product.jpg';
  }

  increaseQuantity(): void {
    if (this.canIncreaseQuantity()) {
      this.quantity.set(this.quantity() + 1);
    }
  }

  decreaseQuantity(): void {
    const currentQuantity = this.quantity();
    if (currentQuantity > 1) {
      this.quantity.set(currentQuantity - 1);
    }
  }

  // Header event handlers
  changeCategory(category: string): void {
    this.selectedCategory.set(category);
    
    if (category === 'All') {
      this.navigateToAllProducts();
    } else {
      this.navigateToCategoryPage(category);
    }
  }

  changeSearchInput(text: string): void {
    this.searchText.set(text);
  }

  changeBranch(branch: any): void {
    console.log('Branch changed to:', branch);
  }

  // Navigation methods
  navigateToAllProducts(): void {
    const currentUuid = this.storeUuid;
    if (currentUuid) {
      this.router.navigate(['/optimerce', currentUuid]);
    }
  }

  navigateToCategoryPage(categoryName: string): void {
    const currentUuid = this.storeUuid;
    if (currentUuid) {
      this.router.navigate(['/optimerce', currentUuid, 'category', categoryName.toLowerCase()]);
    }
  }

  // Keyboard navigation for modal
  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.isImageModalOpen()) return;

    switch (event.key) {
      case 'Escape':
        this.closeImageModal();
        break;
      case 'ArrowLeft':
        this.previousImage();
        break;
      case 'ArrowRight':
        this.nextImage();
        break;
    }
  };
}