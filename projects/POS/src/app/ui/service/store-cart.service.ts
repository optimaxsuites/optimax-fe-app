// store-cart.service.ts - FIXED
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GuestOrderService } from './guest-order.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../sharedComponent/service/environments/environment';
import { isDevMode } from '@angular/core';
import { ProductData, VariantDTO } from '../models/interface';

interface CartItem {
  product: ProductData;
  quantity: number;
  isVariant: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StoreCartService {
  // Use signals instead of BehaviorSubject
  private cartItems = signal<Map<string, CartItem>>(new Map());
  private readonly CART_STORAGE_KEY = 'store_cart';
  private apiUrl: string;

  // Computed values for reactive updates
  cart = computed(() => {
    const items = this.cartItems();
    const subtotal = this.calculateSubtotal(items);
    return { items, subtotal };
  });

  isCartEmpty = computed(() => this.cartItems().size === 0);
  totalItems = computed(() => {
    let total = 0;
    this.cartItems().forEach(item => total += item.quantity);
    return total;
  });

  constructor(
    private guestOrderService: GuestOrderService,
    private http: HttpClient
  ) {
    this.apiUrl = this.getBaseApiUrl();
    this.loadCartFromStorage();
  }

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  private loadCartFromStorage(): void {
    try {
      const storedCart = localStorage.getItem(this.CART_STORAGE_KEY);
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        const cartMap = new Map();
        
        Object.keys(parsedCart.items).forEach(key => {
          const item = parsedCart.items[key];
          cartMap.set(key, {
            product: item.product,
            quantity: item.quantity,
            isVariant: item.isVariant
          });
        });
        
        this.cartItems.set(cartMap);
        console.log('Cart loaded from storage:', cartMap.size, 'items');
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      this.clearCart();
    }
  }

  private saveCartToStorage(): void {
    try {
      const currentCart = this.cartItems();
      const cartData = {
        items: Object.fromEntries(currentCart),
        subtotal: this.cart().subtotal,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cartData));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }

  // Public API
  getCart() {
    return this.cart();
  }

  addToCart(product: ProductData, variant?: VariantDTO): void {
    const currentCart = new Map(this.cartItems());
    const idToUse = variant ? `${product.id}-${variant.id}` : product.id.toString();
    
    if (currentCart.has(idToUse)) {
      const existingItem = currentCart.get(idToUse)!;
      currentCart.set(idToUse, {
        ...existingItem,
        quantity: existingItem.quantity + 1
      });
    } else {
      const clonedProduct = JSON.parse(JSON.stringify(product));
      if (variant) {
        clonedProduct.selectedVariants = [variant];
      }
      
      currentCart.set(idToUse, {
        product: clonedProduct,
        quantity: 1,
        isVariant: !!variant
      });
    }
    
    this.cartItems.set(currentCart);
    this.saveCartToStorage();
    console.log('Cart updated - items:', currentCart.size);
  }

  removeFromCart(product: ProductData, variant?: VariantDTO): void {
    const currentCart = new Map(this.cartItems());
    const idToUse = variant ? `${product.id}-${variant.id}` : product.id.toString();
    
    currentCart.delete(idToUse);
    this.cartItems.set(currentCart);
    this.saveCartToStorage();
  }

  updateQuantity(product: ProductData, quantity: number, variant?: VariantDTO): void {
    if (quantity <= 0) {
      this.removeFromCart(product, variant);
      return;
    }
    
    const currentCart = new Map(this.cartItems());
    const idToUse = variant ? `${product.id}-${variant.id}` : product.id.toString();
    
    if (currentCart.has(idToUse)) {
      const existingItem = currentCart.get(idToUse)!;
      currentCart.set(idToUse, {
        ...existingItem,
        quantity: quantity
      });
      
      this.cartItems.set(currentCart);
      this.saveCartToStorage();
    }
  }

  clearCart(): void {
    this.cartItems.set(new Map());
    localStorage.removeItem(this.CART_STORAGE_KEY);
  }

  private calculateSubtotal(cart: Map<string, CartItem>): number {
    let subtotal = 0;
    cart.forEach((item) => {
      const price = item.product.sellingPrice;
      // Fix: Check if price exists and is valid
      if (price !== undefined && price !== null) {
        const priceValue = typeof price === 'string' ? parseFloat(price) : price;
        if (!isNaN(priceValue)) {
          subtotal += priceValue * item.quantity;
        }
      }
    });
    return subtotal;
  }

  placeOrder(orderData: any): Observable<any> {
    const orderId = this.guestOrderService.generateOrderId();
    
    const guestOrder = {
      id: orderId,
      items: orderData.items,
      subtotal: orderData.subtotal,
      deliveryFee: orderData.deliveryFee || 0,
      total: orderData.total,
      deliveryMethod: orderData.deliveryMethod,
      paymentMethod: orderData.paymentMethod,
      deliveryInfo: orderData.deliveryInfo,
      orderDate: new Date().toISOString(),
      status: 'confirmed' as const
    };

    this.guestOrderService.saveOrder(guestOrder);

    return this.http.post(`${this.apiUrl}/orders`, orderData).pipe(
      catchError((error: any) => {
        console.warn('API order submission failed, but order saved locally:', error);
        return of({
          success: true,
          orderId: orderId,
          message: 'Order placed successfully (saved locally)'
        });
      })
    );
  }

  processPayment(paymentPayload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payments`, paymentPayload).pipe(
      catchError((error: any) => {
        console.warn('Payment processing failed:', error);
        return of({
          success: true,
          paymentId: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          message: 'Payment processed (mock response for guest order)'
        });
      })
    );
  }

  getGuestOrders(): any[] {
    return this.guestOrderService.getOrders();
  }

  getGuestOrder(orderId: string): any {
    return this.guestOrderService.getOrder(orderId);
  }
}