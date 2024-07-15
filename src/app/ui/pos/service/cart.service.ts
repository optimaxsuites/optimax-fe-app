import { Injectable } from '@angular/core';
import { Product } from '../models/interface';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItemsSubject = new BehaviorSubject<any[]>([]);
  cartItems$ = this.cartItemsSubject.asObservable();
  constructor() { }
  private cartItems: Product[] = [];

  getCartItems(): Product[] {
    return this.cartItems;
  }

  addToCart(product: Product) {
    let existingItem = this.cartItems.find(item => item.id === product.id);
    if (existingItem) {
      existingItem.cartPriceTotal += product.price;
      existingItem.count += 1;
    } else {
      this.cartItems.push({ ...product, count: 1 });
    }
  }

  deleteCartItem(index: number) {
    this.cartItems.splice(index, 1);
  }

  calculateTotals(discount: number) {
    const subtotal = this.cartItems.reduce((acc, item) => acc + item.cartPriceTotal, 0);
    const productDiscount = this.cartItems.reduce((acc, item) => acc + (item.discount || 0), 0);
    const tax = subtotal * 0.1;
    const totalDiscount = discount + productDiscount;
    const total = subtotal + tax - totalDiscount;
    return { subtotal, tax, total, discount: totalDiscount };
  }

  resetProductDiscount(index: number) {
    this.cartItems[index].discount = 0.00;
  }
  updateCart(items: any[]) {
    this.cartItemsSubject.next(items);
  }
}
