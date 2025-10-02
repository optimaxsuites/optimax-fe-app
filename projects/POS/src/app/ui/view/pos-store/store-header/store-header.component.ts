import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';

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
  @Input() allProducts: any[] = []; // Add this input for product data

  @Output() categoryChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() toggleCart = new EventEmitter<void>();
  @Output() userAction = new EventEmitter<void>();
  @Output() branchChange = new EventEmitter<any>();
  @Output() productSelect = new EventEmitter<number>(); 
  @Output() searchSubmit = new EventEmitter<string>(); 

  isBranchDropdownOpen = false;
  selectedBranch: any = null;
  isUserDropdownOpen = false;
  isAuthModalOpen = false;
  authModalMode: 'login' | 'signup' = 'login';
  
  // Search suggestions
  showSuggestions = false;
  searchSuggestions: (ProductSuggestion | CategorySuggestion)[] = [];
  productSuggestions: ProductSuggestion[] = [];
  categorySuggestions: CategorySuggestion[] = [];
  selectedSuggestionIndex = -1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['allProducts'] && this.allProducts) {
      // You can preprocess data here if needed
    }
  }

  // Search input handling
  onSearchInput(text: string): void {
    this.searchText = text;
    this.updateSearchSuggestions(text);
    this.searchChange.emit(text);
  }

  // onSearchSubmit(): void {
  //   this.showSuggestions = false;
  //   this.searchChange.emit(this.searchText);
  // }

   onSearchSubmit(): void {
    if (this.searchText.trim()) {
      this.searchSubmit.emit(this.searchText); // Emit the search term
      this.showSuggestions = false;
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
    // Small timeout to allow click events to register before hiding
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
      .slice(0, 5); // Limit to 5 categories

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
      .slice(0, 10); // Limit to 10 products

    // Combine suggestions (categories first, then products)
    this.searchSuggestions = [
      ...this.categorySuggestions,
      ...this.productSuggestions
    ];
    
    this.selectedSuggestionIndex = -1;
  }

  // Suggestion selection
  selectSuggestion(index: number): void {
    if (index < this.categorySuggestions.length) {
      // Category suggestion selected
      const category = this.categorySuggestions[index];
      this.selectCategorySuggestion(category);
    } else {
      // Product suggestion selected
      const productIndex = index - this.categorySuggestions.length;
      const product = this.productSuggestions[productIndex];
      this.selectProductSuggestion(product);
    }
  }

  selectCategorySuggestion(category: CategorySuggestion): void {
    this.searchText = '';
    this.showSuggestions = false;
    this.categoryChange.emit(category.name);
  }

  selectProductSuggestion(product: ProductSuggestion): void {
    this.searchText = '';
    this.showSuggestions = false;
    this.productSelect.emit(product.id);
  }

  // Existing methods
  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  openAuthModal(mode: 'login' | 'signup'): void {
    this.authModalMode = mode;
    this.isAuthModalOpen = true;
    this.isUserDropdownOpen = false;
  }

  closeAuthModal(): void {
    this.isAuthModalOpen = false;
  }

  handleLogin(credentials: {email: string, password: string}): void {
    console.log('Login attempt:', credentials);
    this.closeAuthModal();
    this.user = { name: credentials.email.split('@')[0], isGuest: false };
  }

  handleSignup(userData: {name: string, email: string, phone: string, password: string}): void {
    console.log('Signup attempt:', userData);
    this.closeAuthModal();
    this.user = { name: userData.name, isGuest: false };
  }

  handleGuest(): void {
    this.closeAuthModal();
    this.user = { name: 'Guest', isGuest: true };
  }

  logout(): void {
    this.user = { name: 'Guest', isGuest: true };
    this.isUserDropdownOpen = false;
  }

  onCategoryChange(category: string): void {
    this.categoryChange.emit(category);
  }

  onSearchChange(text: string): void {
    this.searchChange.emit(text);
  }

  onToggleCart(): void {
    this.toggleCart.emit();
  }

  onUserAction(): void {
    this.userAction.emit();
  }

  selectBranch(branch: any): void {
    this.selectedBranch = branch;
    this.isBranchDropdownOpen = false;
    this.branchChange.emit(branch);
  }

  toggleBranchDropdown(): void {
    this.isBranchDropdownOpen = !this.isBranchDropdownOpen;
  }
}