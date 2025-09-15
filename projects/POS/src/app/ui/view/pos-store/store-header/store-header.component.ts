import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-store-header',
  templateUrl: './store-header.component.html',
  styleUrl: './store-header.component.scss'
})
export class StoreHeaderComponent {
 @Input() cartItemCount: number = 0;
  @Input() isCartEmpty: boolean = true;
  @Output() toggleCart = new EventEmitter<void>();
  @Output() toggleMenu = new EventEmitter<void>();
  @Output() categoryChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();

  selectedCategory: string = 'All';
  searchText: string = '';

  onCategoryChange(category: string) {
    this.selectedCategory = category;
    this.categoryChange.emit(category);
  }

  onSearchChange(text: string) {
    this.searchText = text;
    this.searchChange.emit(text);
  }

  onToggleCart() {
    this.toggleCart.emit();
  }

  onToggleMenu() {
    this.toggleMenu.emit();
  }
}
