import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, HostListener } from '@angular/core';
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
export class StoreHeaderComponent implements OnChanges {
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

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.checkScreenSize();
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

  // FIXED: Handle category change on mobile - navigate instead of filter
  onMobileCategoryChange(category: string): void {
    console.log('Mobile category change:', category);
    if (category && category !== 'All') {
      // Always navigate to category page on mobile
      this.navigateToCategoryPage(category);
    } else {
      // For "All", use normal filtering
      this.onCategoryChange(category);
    }
    this.closeMobileMenu();
  }

  // Mobile menu methods
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

  // Search input handling
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

  // Keyboard navigation
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

  // Update search suggestions based on input
  private updateSearchSuggestions(searchTerm: string): void {
    if (!searchTerm.trim() || !this.allProducts) {
      this.searchSuggestions = [];
      this.productSuggestions = [];
      this.categorySuggestions = [];
      this.selectedSuggestionIndex = -1;
      return;
    }

    const term = searchTerm.toLowerCase();
    
    // Find matching categories
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

    // Find matching products
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

  // Suggestion selection
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
    
    // Always navigate to category page for suggestions
    this.navigateToCategoryPage(category.name);
    this.closeMobileMenu();
  }

  // Navigate to category page
  navigateToCategoryPage(categoryName: string): void {
    const currentUuid = this.route.snapshot.paramMap.get('uuid');
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

  // User dropdown methods
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
  this.closeAuthModal();
  this.user = { name: credentials.username, isGuest: false };
}

handleSignup(userData: {name: string, username: string, email: string, phone: string, password: string}): void {
  console.log('Signup attempt:', userData);
  this.closeAuthModal();
  this.user = { name: userData.username, isGuest: false };
}
  handleGuest(): void {
    this.closeAuthModal();
    this.user = { name: 'Guest', isGuest: true };
  }

  logout(): void {
    this.user = { name: 'Guest', isGuest: true };
    this.isUserDropdownOpen = false;
    this.closeMobileMenu();
  }

  // Category change handler
  onCategoryChange(category: string): void {
    this.categoryChange.emit(category);
    this.closeMobileMenu();
  }

  onSearchChange(text: string): void {
    this.searchChange.emit(text);
  }

  // Cart methods
  onToggleCart(): void {
    this.toggleCart.emit();
    this.closeMobileMenu();
  }

  onUserAction(): void {
    this.userAction.emit();
  }

  // FIXED: Branch selection methods
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

  // Close all dropdowns when clicking outside
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
  // Get the current store UUID from the route
  const currentUuid = this.route.snapshot.paramMap.get('uuid');
  
  if (currentUuid) {
    this.router.navigate(['user/checkout/store', currentUuid, 'return-refund']);
  } else {
    // Fallback if no UUID is available
    this.router.navigate(['user/checkout/store/return-refund']);
  }
  
  // Close the dropdown after navigation
  this.isUserDropdownOpen = false;
}
}