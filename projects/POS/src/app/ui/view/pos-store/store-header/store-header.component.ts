// store-header.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-store-header',
  templateUrl: './store-header.component.html',
  styleUrls: ['./store-header.component.scss']
})
export class StoreHeaderComponent {
  @Input() branches: any[] = [];
  @Input() categoryOptions: any[] = [];
  @Input() selectedCategory: string = 'All';
  @Input() searchText: string = '';
  @Input() isCartEmpty: boolean = true;
  @Input() totalCartItems: number = 0;
  @Input() user: { name: string; isGuest: boolean } = { name: 'Guest', isGuest: true };

  @Output() categoryChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() toggleCart = new EventEmitter<void>();
  @Output() userAction = new EventEmitter<void>();
  @Output() branchChange = new EventEmitter<any>();

  isBranchDropdownOpen = false;
  selectedBranch: any = null;
  isUserDropdownOpen = false;
isAuthModalOpen = false;
authModalMode: 'login' | 'signup' = 'login';


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
  // This will be implemented later with actual authentication
  console.log('Login attempt:', credentials);
  this.closeAuthModal();
  // Update user state
  this.user = { name: credentials.email.split('@')[0], isGuest: false };
}

handleSignup(userData: {name: string, email: string, phone: string, password: string}): void {
  // This will be implemented later with actual authentication
  console.log('Signup attempt:', userData);
  this.closeAuthModal();
  // Update user state
  this.user = { name: userData.name, isGuest: false };
}

handleGuest(): void {
  this.closeAuthModal();
  // Keep user as guest
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