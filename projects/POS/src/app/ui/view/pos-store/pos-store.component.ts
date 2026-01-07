import { Component, computed, OnInit, signal, OnDestroy, ViewChild, ElementRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import Fuse, { IFuseOptions } from 'fuse.js';
import { ProductData, VariantDTO } from '../../models/interface';
import { ActivatedRoute } from '@angular/router'; 
import { ImageCacheService } from '../../service/image-cache.service';
// import { PaymentServiceService } from '../../service/payment-service.service';
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
   // WhatsApp configuration
  whatsappPhone = '';
  whatsappMessage = 'Hello! I visited your store and would love to get more information.';
  whatsappHoverMessage = "Hi, let's chat! We're here to help you with any questions.";
  showWhatsAppFallback = false;
  
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
    // private _paymentService: PaymentServiceService,
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


  isAuthModalOpen = signal(false);
authModalMode: 'login' | 'signup' = 'login';
private hasSeenAuthModal = false;

  ngOnInit(): void {
  // this.initializeComponent();
  this.loadUserFromStorage();
  this.showAuthModalOnFirstVisit();
  // this.debugFirstProductTax(); 
  }

//   private showAuthModalOnFirstVisit(): void {
//   // Check if user has already seen the modal in this session
//   if (this.hasSeenAuthModal) return;
  
//   // Check if user is not logged in
//   if (this.user().isGuest) {
//     // Small delay to ensure the store is loaded
//     setTimeout(() => {
//       this.isAuthModalOpen.set(true);
//       this.authModalMode = 'login';
//       this.hasSeenAuthModal = true;
//     }, 1000);
//   }
// }

  // Add this new method
private loadUserFromStorage(): void {
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      this.user.set(userData);
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      this.user.set({ name: 'Guest', isGuest: true });
    }
  }
}

  private initializeComponent(): void {
    this._fuse = new Fuse<ProductData>([], PosStoreComponent._fuseOptions);

    this._posService.getBranches().subscribe((branches) => {
      this.branches = branches;
      // console.log(branches)
      // const persistedBranchId = this.metadataService.selectedBranchId$;
      
      if (branches.length > 0 && !this.selectedBranch()) {
        const branchToSelect = branches[0];
        this.selectedBranch.set(branchToSelect);
        // this.metadataService.setSelectedBranch(branchToSelect.id);
        this.updateWhatsAppNumber(branchToSelect);
        console.log('🏛️ Store initialized with Branch ID:', branchToSelect.id);
      }
    });

    // this.subscribeToEnrichedProducts();
    // this.startImageFading();
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

  // showToast(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
  //   const toast: Toast = {
  //     id: Date.now(),
  //     title,
  //     message,
  //     type
  //   };
    
  //   this.toasts.update(toasts => [...toasts, toast]);
    
  //   setTimeout(() => {
  //     this.removeToast(toast.id);
  //   }, 5000);
  // }

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
  const userData = { name: credentials.username, isGuest: false };
  
  // Store in localStorage
  localStorage.setItem('currentUser', JSON.stringify(userData));
  
  // Update signal
  this.user.set(userData);
  
  const greeting = this.getTimeBasedGreeting();
  this.showToast(
    `${greeting}`,
    `Welcome back, ${credentials.username}! Great to see you again.`,
    'success'
  );
  
  this.closeAuthModal();
}

// Update your handleSignup method
handleSignup(userData: {name: string, username: string, email: string, phone: string, password: string}): void {
  const userInfo = { name: userData.username, isGuest: false };
  
  // Store in localStorage
  localStorage.setItem('currentUser', JSON.stringify(userInfo));
  
  // Update signal
  this.user.set(userInfo);
  
  const greeting = this.getTimeBasedGreeting();
  this.showToast(
    'Account Created! 🎉',
    `${greeting}, ${userData.username}! Welcome to our store. Start shopping now.`,
    'success'
  );
  
  this.closeAuthModal();
}

closeAuthModal(): void {
  const modal = document.querySelector('app-auth-modal');
  if (modal) {
    modal.remove();
  }
}

handleGuest(): void {
  this.closeAuthModal();
  // Optional: Show info toast for guest
  this.showToast(
    'Continuing as Guest',
    'You can create an account anytime to save your preferences and track orders.',
    'info'
  );
}

private showAuthModalOnFirstVisit(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return;
    }

    // Check if user has already seen the modal in this session
    const hasSeenModal = sessionStorage.getItem('hasSeenAuthModal');
    if (hasSeenModal === 'true') {
      this.hasSeenAuthModal = true;
      return;
    }

    // Only show modal if user is guest AND hasn't seen it before
    if (this.user().isGuest && !this.hasSeenAuthModal) {
      // Small delay to ensure the store is fully loaded
      setTimeout(() => {
        this.isAuthModalOpen.set(true);
        this.authModalMode = 'login';
        this.hasSeenAuthModal = true;
        sessionStorage.setItem('hasSeenAuthModal', 'true');
      }, 1500); // 1.5 second delay
    }
  }
  onBranchChange(branch: any): void {
    this.selectedBranch.set(branch);
    this.metadataService.setSelectedBranch(branch.id);
    this.updateWhatsAppNumber(branch);

      // Clear cart when branch changes
  this.cartService.clearCart();
  
  // Update branch
  this.selectedBranch.set(branch);
  this.metadataService.setSelectedBranch(branch.id);
  this.updateWhatsAppNumber(branch);
  
  // Show notification
  this.showToast(
    'Branch Changed',
    `Cart has been cleared for ${branch.name}.`,
    'info'
  );
  }

onMobileCategoryNavigate(categoryName: string): void {
  this.navigateToCategoryPage(categoryName);
}

  private updateWhatsAppNumber(branch: any): void {
    if (branch && branch.whatsappPhoneNumber && branch.whatsappPhoneNumber.trim() !== '') {
      // Clean the WhatsApp number (remove any non-numeric characters except +)
      const cleanedNumber = this.cleanWhatsAppNumber(branch.whatsappPhoneNumber);
      this.whatsappPhone = cleanedNumber;
      this.showWhatsAppFallback = false;
      
      // Show toast notification with branch WhatsApp info
      this.showToast(
        'Branch Support Available',
        `You can now contact ${branch.name} directly via WhatsApp.`,
        'success'
      );
    } else {
      // No WhatsApp number available for this branch
      this.whatsappPhone = '';
      this.showWhatsAppFallback = true;
      
      // Show warning toast
      this.showWhatsAppUnavailableToast(branch?.name || 'This branch');
    }
  }

  private cleanWhatsAppNumber(phoneNumber: string): string {
    // Remove all non-numeric characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it starts with 0, replace with country code
    if (cleaned.startsWith('0')) {
      cleaned = '+234' + cleaned.substring(1);
    }
    
    // If it doesn't have +, add it for Nigeria
    if (!cleaned.startsWith('+') && cleaned.length === 11) {
      cleaned = '+234' + cleaned.substring(1);
    }
    
    return cleaned;
  }

  private showWhatsAppUnavailableToast(branchName: string): void {
    this.showToast(
      'Customer Care Unavailable',
      `${branchName} WhatsApp customer care service isn't available at the moment. Please check again later or visit another branch.`,
      'warning',
      6000 // Show for 6 seconds
    );
  }

  // Add this method to override showToast with optional duration
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

// And make sure this method exists:
navigateToCategoryPage(category: string): void {
  const currentUuid = this.route.snapshot.paramMap.get('uuid');
  if (currentUuid) {
    this.router.navigate(
      ['/store', currentUuid, 'category', category.toLowerCase()],
      {
        queryParams: {
          branch: this.selectedBranch()?.id || '',
          branchName: this.selectedBranch()?.name || '',
        },
      }
    );
  }
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
  const idToUse = variant
    ? `${product.id}-${variant.id}`
    : product.id.toString();
  const currentQuantity = this.cartProducts().get(idToUse)?.quantity || 0;

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
  this.cartService.addToCart(product, variant);

  // Show success toast ONLY on mobile (screen width < 768px)
  if (window.innerWidth < 768) {
    this.showToast(
      'Added to Cart! 🛒',
      `${product.name} has been added to your cart.`,
      'success'
    );
  }
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

  // Add auth modal handlers
openAuthModal(mode: 'login' | 'signup' = 'login'): void {
  this.authModalMode = mode;
  this.isAuthModalOpen.set(true);
}

isCartVisible = computed(() => {
  // Check both desktop cart sidebar and mobile cart modal
  return this.isCartOpen || (this.isCartSidebarVisible && !this.isCartEmpty());
    // Don't show cart when no items
  if (this.isCartEmpty()) return false;
  
  // Check both desktop cart sidebar and mobile cart modal
  return this.isCartOpen || this.isCartSidebarVisible;
});

// closeAuthModal(): void {
//   this.isAuthModalOpen.set(false);
// }


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
  if (currentUuid) {
    // Use the correct route path based on your routing configuration
    this.router.navigate(['user/checkout/store', currentUuid, 'checkout']);
  } else {
    console.error('Store UUID not found');
    this.showToast('Error', 'Unable to navigate to checkout. Store not found.', 'error');
  }
  
  // Close cart modals
  this.isCartOpen = false;
  this.isCartSidebarVisible = false;
}
  navigateToProductDetails(productId: number): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');

    if (currentUuid) {
      this.router.navigate(['product-details', productId], {
        relativeTo: this.route,
      });
    }
  }

  // navigateToCategoryPage(category: string): void {
  //   const currentUuid = this.route.snapshot.paramMap.get('uuid');
  //   if (currentUuid) {
  //     this.router.navigate(
  //       ['user/checkout/store', currentUuid, 'category', category.toLowerCase()],
  //       {
  //         queryParams: {
  //           branch: this.selectedBranch()?.id || '',
  //           branchName: this.selectedBranch()?.name || '',
  //         },
  //       }
  //     );
  //   }
  // }

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

  debugFirstProductTax(): void {
  // Temporarily fetch the product list directly to see the raw data
  this._posService.getProducts().subscribe({
    next: (products) => {
      if (products && products.length > 0) {
        console.log('🔍 DEBUG: Raw product data from API (first 3 products):');
        products.slice(0, 3).forEach((product, index) => {
          console.log(`Product ${index + 1}: ${product.name}`);
          console.log('- tax property:', product.tax);
          console.log('- tax type:', typeof product.tax);
          console.log('- is array?', Array.isArray(product.tax));
          console.log('- discount property:', product.discount);
        });
      }
    },
    error: (error) => {
      console.error('Error fetching products for debug:', error);
    }
  });
}

// Get selling price (with discount applied)
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
// Quick check for discount (simpler version)
hasDiscountQuick(product: ProductData): boolean {
  return !!(product?.discount && product.discount.value && product.discount.value > 0);
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

// Updated: Debug method to check discount structure
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

// Get formatted discount info for badge (quick version)
getDiscountInfoQuick(product: ProductData): string {
  if (!this.hasDiscountQuick(product)) return '';
  
  const percentage = this.getDiscountPercentage(product);
  if (percentage > 0) {
    return `-${Math.round(percentage)}%`;
  }
  
  return 'SALE';
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

// Add this method to get the price to display in cart
getCartItemPrice(cartItem: any): number {
  // Use unitPrice if available (already discounted), otherwise fallback to selling price
  return cartItem.unitPrice || this.getSellingPrice(cartItem.product);
}
}