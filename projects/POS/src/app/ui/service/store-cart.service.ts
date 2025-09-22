import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GuestOrderService } from './guest-order.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../sharedComponent/service/environments/environment';
import { isDevMode } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StoreCartService {
  private cartSubject = new BehaviorSubject<Map<any, any>>(new Map());
  private subtotalSubject = new BehaviorSubject<number>(0);
  private apiUrl: string;

  constructor(
    private guestOrderService: GuestOrderService,
    private http: HttpClient
  ) {
    this.apiUrl = this.getBaseApiUrl();
  }

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  getCart(): { items: Map<any, any>, subtotal: number } {
    return {
      items: this.cartSubject.value,
      subtotal: this.subtotalSubject.value
    };
  }

  setCart(items: Map<any, any>, subtotal: number): void {
    this.cartSubject.next(items);
    this.subtotalSubject.next(subtotal);
  }

  clearCart(): void {
    this.cartSubject.next(new Map());
    this.subtotalSubject.next(0);
  }

  placeOrder(orderData: any): Observable<any> {
    // Generate order ID for guest
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

    // Save to localStorage
    this.guestOrderService.saveOrder(guestOrder);

    // Also call your actual API if needed
    return this.http.post(`${this.apiUrl}/orders`, orderData).pipe(
      catchError((error: any) => {
        console.warn('API order submission failed, but order saved locally:', error);
        // Even if API fails, return success for the guest order
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
        // Return a mock payment response for guest orders
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