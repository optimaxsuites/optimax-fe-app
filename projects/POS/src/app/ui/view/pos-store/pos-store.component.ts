import { Component, computed, OnInit, signal, OnDestroy, ViewChild, ElementRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
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
import { AuthService } from '../../service/auth.service';
import { isPlatformBrowser } from '@angular/common';

type ProductDataMap = Map<string, ProductData[]>;

type ConvertedCartProducts = {
  products: ProductData[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
};

interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  leaving?: boolean;
}

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

  allProducts: ProductData[] = [];
  productData = signal<ProductDataMap>(new Map());

  readonly defaultCategory = 'All';
  selectedCategory = signal(this.defaultCategory);
  selectedBranch = signal<any>(null);
  user = signal({ name: 'Guest', isGuest: true });
  branches: any[] = [];
  searchText = signal('');
  
  isLoading = signal(true);
  isContentReady = signal(false);
  private hasShownSkeleton = false;

  currentPage = signal(1);
  itemsPerPage = signal(20);
  totalPages = signal(0);

  private _fuse!: Fuse<ProductData>;

  isSidebarVisible = true;
  isCartOpen = false;
  isHamburgerMenuOpen = false;
  isVariantModalOpen = false;
  isPaymentModalOpen = false;
  isCartSidebarVisible = true;
  selectedProduct: ProductData | null = null;
  
  showScrollToTop = signal(false);

  welcomeBannerVisible = signal(true);
  toasts = signal<Toast[]>([]);

  private _productsInChosenCategory = computed(
    () => this.productData().get(this.selectedCategory()) ?? this._allProducts
  );

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

  private currentImageIndex = 0;
  private totalImages = 4;
  private fadeInterval: any;

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
    private metadataService: MetadataService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    this.showScrollToTop.set(scrollPosition > 300);
  }

  ngOnInit(): void {
    this.initializeComponent();
    this.initializeUserState();
    this.checkWelcomeBannerVisibility();
  }

  private initializeComponent(): void {
    this._fuse = new Fuse<ProductData>([], PosStoreComponent._fuseOptions);

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

  private initializeUserState(): void {
    // Check authentication status
    if (this.authService.isAuthenticated()) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        const displayName = currentUser.upi?.fullname || currentUser.username || 'User';
        this.user.set({ 
          name: displayName, 
          isGuest: false 
        });
        
        // Show welcome back message for returning users
        this.showWelcomeBackMessage(displayName);
      }
    } else {
      this.user.set({ name: 'Guest', isGuest: true });
    }

    // Check if user is new
    this.checkUserStatus();
  }

  private showWelcomeBackMessage(username: string): void {
    const greeting = this.getTimeBasedGreeting();
    this.showToast(
      `${greeting}`,
      `Welcome back, ${username}! Great to see you again.`,
      'success'
    );
  }

  private checkUserStatus(): void {
    // Implement logic to check if user is new or returning
    // For now, we'll just log it
    console.log('Checking user status...');
  }

  private welcomeBannerDismissed(): boolean {
    // Check if banner was dismissed in current session
    // You can implement session-based dismissal logic here
    return false; // Default to not dismissed
  }

  private checkWelcomeBannerVisibility(): void {
    // Don't show if already dismissed in this session
    if (this.welcomeBannerDismissed()) {
      this.welcomeBannerVisible.set(false);
      return;
    }
    
    // Check localStorage for previous dismissal
    if (isPlatformBrowser(this.platformId)) {
      const wasDismissed = localStorage.getItem('welcomeBannerDismissed');
      if (wasDismissed === 'true') {
        this.welcomeBannerVisible.set(false);
        return;
      }
    }
    
    // Show banner for new users or guests
    this.welcomeBannerVisible.set(true);
  }

  private subscribeToEnrichedProducts(): void {
    this.metadataService.enrichedProduct$.subscribe(async (data) => {
      if (data && data.length > 0) {
        this.processProductsData(data);
        this.handleContentLoading();
      } else {
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

  private handleContentLoading(): void {
    if (!this.hasShownSkeleton) {
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

  getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    const emojis = ['🌅', '☀️', '🌙'];
    
    if (hour < 12) {
      return `Good Morning ${emojis[0]}`;
    } else if (hour < 17) {
      return `Good Afternoon ${emojis[1]}`;
    } else {
      return `Good Evening ${emojis[2]}`;
    }
  }

  showToast(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const toast: Toast = {
      id: Date.now(),
      title,
      message,
      type
    };
    
    this.toasts.update(toasts => [...toasts, toast]);
    
    setTimeout(() => {
      this.removeToast(toast.id);
    }, 5000);
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

  hideWelcomeBanner(): void {
    this.welcomeBannerVisible.set(false);
    
    // Save dismissal to localStorage
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('welcomeBannerDismissed', 'true');
    }
  }

  handleLogin(credentials: {username: string, password: string}): void {
    this.user.set({ name: credentials.username, isGuest: false });
    
    const greeting = this.getTimeBasedGreeting();
    this.showToast(
      `${greeting}`,
      `Welcome back, ${credentials.username}! Great to see you again.`,
      'success'
    );
  }

  handleSignup(userData: {name: string, username: string, email: string, phone: string, password: string}): void {
    this.user.set({ name: userData.username, isGuest: false });
    
    const greeting = this.getTimeBasedGreeting();
    this.showToast(
      'Account Created! 🎉',
      `${greeting}, ${userData.username}! Welcome to our store. Start shopping now.`,
      'success'
    );
  }

  closeAuthModal(): void {
    const modal = document.querySelector('app-auth-modal');
    if (modal) {
      modal.remove();
    }
  }

  onBranchChange(branch: any): void {
    this.selectedBranch.set(branch);
    this.metadataService.setSelectedBranch(branch.id);
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

  scrollToTop(): void {
    try {
      window.scrollTo({ 
        top: 0, 
        left: 0,
        behavior: 'smooth' 
      });
    } catch (error) {
      try {
        window.scrollTo(0, 0);
      } catch (e) {
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

  @ViewChild('scrollContainer', { read: ElementRef }) scrollContainer!: ElementRef;

  onMainScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollTop;
    this.showScrollToTop.set(scrollPosition > 300);
  }
}