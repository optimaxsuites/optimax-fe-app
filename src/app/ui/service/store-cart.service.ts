// Example fix for the store-cart.service.ts file
// Replace the problematic line with proper null checking

// Before (line 48):
// ... item) => total + (item.product.sellingPrice * item.quantity), 0);

// After:
// ... item) => total + ((item.product.sellingPrice || 0) * item.quantity), 0);

// Or with more robust checking:
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProductData } from '../models/interface';

export interface CartItem {
  product: ProductData;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class StoreCartService {
  private cartItems = new BehaviorSubject<CartItem[]>([]);
  cartItems$ = this.cartItems.asObservable();

  constructor() {}

  addToCart(product: ProductData, quantity: number = 1): void {
    const currentItems = this.cartItems.value;
    const existingItem = currentItems.find(item => item.product.id === product.id);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      currentItems.push({ product, quantity });
    }

    this.cartItems.next([...currentItems]);
  }

  removeFromCart(productId: number): void {
    const currentItems = this.cartItems.value.filter(item => item.product.id !== productId);
    this.cartItems.next(currentItems);
  }

  updateQuantity(productId: number, quantity: number): void {
    const currentItems = this.cartItems.value;
    const item = currentItems.find(item => item.product.id === productId);
    
    if (item) {
      item.quantity = quantity;
      this.cartItems.next([...currentItems]);
    }
  }

  // getCartTotal(): number {
  //   return this.cartItems.value.reduce((total, item) => {
  //     const price = item.product.sellingPrice || 0;
  //     return total + (price * item.quantity);
  //   }, 0);
  // }

  getCartItemCount(): number {
    return this.cartItems.value.reduce((total, item) => total + item.quantity, 0);
  }

  clearCart(): void {
    this.cartItems.next([]);
  }
}