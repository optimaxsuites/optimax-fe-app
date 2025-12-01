import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

interface ProductSuggestion {
  id: number;
  name: string;
  category: string;
  price: number;
  image?: string;
}

interface CategorySuggestion {
  name: string;
  productCount: number;
}

@Component({
  selector: 'app-store-header',
  templateUrl: './store-header.component.html',
  styleUrls: ['./store-header.component.scss']
})
export class StoreHeaderComponent implements OnChanges, OnInit {
  @Input() branches: any[] = [];
  @Input() categoryOptions: any[] = [];
  @Input() selectedCategory: string = 'All';
  @Input() searchText: string = '';
  @Input() isCartEmpty: boolean = true;
  @Input() totalCartItems: number = 0;
  @Input() user: { name: string; isGuest: boolean } = { name: 'Guest', isGuest: true };
  @Input() allProducts: any[] = [];
  @Input() selectedBranch: any = null;
  
  @Output() mobileCategoryNavigate = new EventEmitter<string>();
  @Output() categoryChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() toggleCart = new EventEmitter<void>();
  @Output() userAction = new EventEmitter<void>();
  @Output() branchChange = new EventEmitter<any>();
  @Output() productSelect = new EventEmitter<number>(); 
  @Output() searchSubmit = new EventEmitter<string>();
  @Output() showToast = new EventEmitter<{title: string, message: string, type: 'success' | 'error' | 'warning' | 'info'}>();

  // Desktop state
  isBranchDropdownOpen = false;
  isUserDropdownOpen = false;
  isAuthModalOpen = false;
  authModalMode: 'login' | 'signup' = 'login';
  
  // Search suggestions
  showSuggestions = false;
  searchSuggestions: (ProductSuggestion | CategorySuggestion)[] = [];
  productSuggestions: ProductSuggestion[] = [];
  categorySuggestions: CategorySuggestion[] = [];
  selectedSuggestionIndex = -1;

  // Mobile state
  isMobileMenuOpen = false;
  isMobile = false;

  // Business info from sessionStorage
  businessInfo: any = null;
  businessName: string | null = null;

  // Make route public or create a getter for the UUID
  currentStoreUuid: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute // Keep this private, we'll use a getter
  ) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadBusinessInfo();
    this.loadCurrentStoreUuid();
  }

  // NEW: Public getter for the store UUID
  get storeUuid(): string | null {
    return this.route.snapshot.paramMap.get('uuid');
  }

  // Alternative: Load UUID on init
  private loadCurrentStoreUuid(): void {
    this.currentStoreUuid = this.route.snapshot.paramMap.get('uuid');
  }

  private loadBusinessInfo(): void {
    const userInfoString = sessionStorage.getItem("userBranchInfoRegData");
    if (userInfoString) {
      try {
        this.businessInfo = JSON.parse(userInfoString);
        this.businessName = this.businessInfo?.fullname || 
                           this.businessInfo?.businessName || 
                           this.businessInfo?.name || 
                           this.businessInfo?.storeName || 
                           null;
        
        console.log('Business name loaded:', this.businessName);
      } catch (error) {
        console.error('Error parsing business info:', error);
        this.businessName = null;
      }
    } else {
      console.log('No business info found in sessionStorage');
      this.businessName = null;
    }
  }

  hasBusinessName(): boolean {
    return !!this.businessName && this.businessName.trim().length > 0;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.isMobileMenuOpen = false;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allProducts'] && this.allProducts) {
      // Preprocess data if needed
    }
    
    if (changes['branches'] && this.branches.length > 0 && !this.selectedBranch) {
      this.selectedBranch = this.branches[0];
    }
  }

  onShowToast(event: {title: string, message: string, type: 'success' | 'error' | 'warning' | 'info'}): void {
    this.showToast.emit(event);
  }

  onMobileCategoryChange(category: string): void {
    console.log('Mobile category change:', category);
    
    if (category && category !== 'All') {
      this.navigateToCategoryPage(category);
    } else {
      const currentUuid = this.storeUuid;
      if (currentUuid) {
        this.router.navigate(['/store', currentUuid]);
      }
    }
    this.closeMobileMenu();
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      this.isBranchDropdownOpen = false;
      this.isUserDropdownOpen = false;
      this.showSuggestions = false;
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  onSearchInput(text: string): void {
    this.searchText = text;
    this.updateSearchSuggestions(text);
    this.searchChange.emit(text);
  }

  onSearchSubmit(): void {
    if (this.searchText.trim()) {
      this.searchSubmit.emit(this.searchText);
      this.showSuggestions = false;
      this.closeMobileMenu();
    }
  }

  onSearchEnter(): void {
    if (this.selectedSuggestionIndex >= 0 && this.searchSuggestions.length > 0) {
      this.selectSuggestion(this.selectedSuggestionIndex);
    } else {
      this.onSearchSubmit();
    }
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  onArrowDown(event: Event): void {
    event.preventDefault();
    if (this.searchSuggestions.length > 0) {
      this.selectedSuggestionIndex = 
        (this.selectedSuggestionIndex + 1) % this.searchSuggestions.length;
    }
  }

  onArrowUp(event: Event): void {
    event.preventDefault();
    if (this.searchSuggestions.length > 0) {
      this.selectedSuggestionIndex = 
        this.selectedSuggestionIndex <= 0 ? 
        this.searchSuggestions.length - 1 : 
        this.selectedSuggestionIndex - 1;
    }
  }

  private updateSearchSuggestions(searchTerm: string): void {
    if (!searchTerm.trim() || !this.allProducts) {
      this.searchSuggestions = [];
      this.productSuggestions = [];
      this.categorySuggestions = [];
      this.selectedSuggestionIndex = -1;
      return;
    }

    const term = searchTerm.toLowerCase();
    
    this.categorySuggestions = this.categoryOptions
      .filter(category => 
        category.label.toLowerCase().includes(term) || 
        category.value.toLowerCase().includes(term)
      )
      .map(category => {
        const productCount = this.allProducts.filter(p => 
          p.productCategory?.name?.toLowerCase() === category.value.toLowerCase()
        ).length;
        
        return {
          name: category.label,
          productCount: productCount
        };
      })
      .slice(0, 5);

    this.productSuggestions = this.allProducts
      .filter(product => 
        product.name?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.productCategory?.name?.toLowerCase().includes(term)
      )
      .map(product => ({
        id: product.id,
        name: product.name,
        category: product.productCategory?.name || 'Uncategorized',
        price: product.sellingPrice || 0,
        image: product.imageUrl || product.images?.[0]
      }))
      .slice(0, 10);

    this.searchSuggestions = [
      ...this.categorySuggestions,
      ...this.productSuggestions
    ];
    
    this.selectedSuggestionIndex = -1;
  }

  selectSuggestion(index: number): void {
    if (index < this.categorySuggestions.length) {
      const category = this.categorySuggestions[index];
      this.selectCategorySuggestion(category);
    } else {
      const productIndex = index - this.categorySuggestions.length;
      const product = this.productSuggestions[productIndex];
      this.selectProductSuggestion(product);
    }
  }

  selectCategorySuggestion(category: CategorySuggestion): void {
    this.searchText = '';
    this.showSuggestions = false;
    this.navigateToCategoryPage(category.name);
    this.closeMobileMenu();
  }

  navigateToCategoryPage(categoryName: string): void {
    const currentUuid = this.storeUuid;
    if (currentUuid) {
      this.router.navigate(['/store', currentUuid, 'category', categoryName.toLowerCase()], {
        queryParams: { 
          branch: this.selectedBranch?.id || '',
          branchName: this.selectedBranch?.name || ''
        }
      });
    }
  }
  
  selectProductSuggestion(product: ProductSuggestion): void {
    this.searchText = '';
    this.showSuggestions = false;
    this.productSelect.emit(product.id);
    this.closeMobileMenu();
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
    if (this.isUserDropdownOpen) {
      this.isBranchDropdownOpen = false;
      this.isMobileMenuOpen = false;
    }
  }

  openAuthModal(mode: 'login' | 'signup'): void {
    this.authModalMode = mode;
    this.isAuthModalOpen = true;
    this.isUserDropdownOpen = false;
    this.closeMobileMenu();
  }

  closeAuthModal(): void {
    this.isAuthModalOpen = false;
  }

  handleLogin(credentials: {username: string, password: string}): void {
    console.log('Login attempt:', credentials);
    
    this.userAction.emit();
    
    const userData = { name: credentials.username, isGuest: false };
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    this.user = userData;
    this.closeAuthModal();
    
    const greeting = this.getTimeBasedGreeting();
    this.showToast.emit({
      title: `Welcome Back! 🎉`,
      message: `${greeting}, ${credentials.username}! Great to see you again.`,
      type: 'success'
    });
  }

  handleSignup(userData: {name: string, username: string, email: string, phone: string, password: string}): void {
    console.log('Signup attempt:', userData);
    
    this.userAction.emit();
    
    const userInfo = { name: userData.username, isGuest: false };
    localStorage.setItem('currentUser', JSON.stringify(userInfo));
    
    this.user = userInfo;
    this.closeAuthModal();
    
    const greeting = this.getTimeBasedGreeting();
    this.showToast.emit({
      title: 'Account Created! 🎉',
      message: `${greeting}, ${userData.username}! Welcome to our store. Start shopping now.`,
      type: 'success'
    });
  }

  handleGuest(): void {
    this.closeAuthModal();
    this.user = { name: 'Guest', isGuest: true };
  }

  logout(): void {
    this.user = { name: 'Guest', isGuest: true };
    this.isUserDropdownOpen = false;
    this.closeMobileMenu();
    
    this.showToast.emit({
      title: 'Signed Out',
      message: 'You have been successfully signed out. See you again soon!',
      type: 'info'
    });
  }

  onCategoryFilterChange(category: string): void {
    console.log('Category filter changed:', category);
    
    if (category === 'All') {
      const currentUuid = this.storeUuid;
      if (currentUuid) {
        this.router.navigate(['/store', currentUuid]);
      }
    } else {
      this.navigateToCategoryPage(category);
    }
    
    this.isBranchDropdownOpen = false;
    this.isUserDropdownOpen = false;
    this.showSuggestions = false;
  }

  onCategoryChange(category: string): void {
    if (category === 'All') {
      const currentUuid = this.storeUuid;
      if (currentUuid) {
        this.router.navigate(['/store', currentUuid]);
      }
    } else {
      this.categoryChange.emit(category);
    }
    this.closeMobileMenu();
  }

  onSearchChange(text: string): void {
    this.searchChange.emit(text);
  }

  onToggleCart(): void {
    this.toggleCart.emit();
    this.closeMobileMenu();
  }

  onUserAction(): void {
    this.userAction.emit();
  }

  selectBranch(branch: any): void {
    console.log('Branch selected:', branch);
    this.selectedBranch = branch;
    this.isBranchDropdownOpen = false;
    this.branchChange.emit(branch);
    this.closeMobileMenu();
  }

  toggleBranchDropdown(): void {
    this.isBranchDropdownOpen = !this.isBranchDropdownOpen;
    if (this.isBranchDropdownOpen) {
      this.isUserDropdownOpen = false;
      if (!this.isMobile) {
        this.isMobileMenuOpen = false;
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    if (!target.closest('.relative')) {
      this.isBranchDropdownOpen = false;
      this.isUserDropdownOpen = false;
      this.showSuggestions = false;
    }
    
    if (this.isMobileMenuOpen && !target.closest('.md\\:hidden') && !target.closest('button')) {
      this.isMobileMenuOpen = false;
    }
  }

  navigateToReturnsRefunds(): void {
    const currentUuid = this.storeUuid;
    
    if (currentUuid) {
      this.router.navigate(['user/checkout/store', currentUuid, 'return-refund']);
    } else {
      this.router.navigate(['user/checkout/store/return-refund']);
    }
    
    this.isUserDropdownOpen = false;
  }
  
  orderHistory(): void {
    const currentUuid = this.storeUuid;
    
    if (currentUuid) {
      this.router.navigate(['user/checkout/store', currentUuid, 'order-history']);
    } else {
      this.router.navigate(['user/checkout/store/order-history']);
    }
    
    this.isUserDropdownOpen = false;
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
}