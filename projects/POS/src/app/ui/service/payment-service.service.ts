import { Injectable, isDevMode } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, of, throwError } from "rxjs";
import { catchError, delay } from "rxjs/operators";
import type { Cart, ProductData } from "../models/interface";
import { NavigationLinksService } from "../sharedComponent/service/navigation-links/navigation-links.service";
import { ProductHelperService } from "./product-helper.service";
import { OrderGET } from "../models/interfaces/kitchen";
import { environment } from "../sharedComponent/service/environments/environment";

// Updated Payment interface with UNPAID status
export interface Payment {
  id: number;
  totalAmount: number;
  transactionDate: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'UNPAID';
}

@Injectable({
  providedIn: "root",
})
export class PaymentServiceService {
  
  private mockPayments: Payment[] = [];
  private nextPaymentId = 1;

  constructor(
    private http: HttpClient,
    private _router: Router,
    private _productHelper: ProductHelperService,
    private _navigationLinks: NavigationLinksService
  ) {}

  // ===== UPDATED PAYMENT METHODS WITH MOCK DATA =====

  /** Create a new payment record */
  createPayment(paymentData: any): Observable<OrderGET> {
    // Mock implementation - comment this out when using real backend
    const mockPayment: Payment = {
      id: this.nextPaymentId++,
      totalAmount: paymentData.amount,
      transactionDate: new Date().toISOString(),
      status: 'PENDING'
    };
    
    this.mockPayments.push(mockPayment);
    console.log('💰 Mock Payment Created:', mockPayment);
    
    // Simulate API delay and return mock response
    return of({} as OrderGET).pipe(delay(1000));
    
    // If you have a real backend, uncomment this:
    // return this.http
    //   .post<OrderGET>(this.getBaseApiUrl() + "/x/api/v2/pos/payments", paymentData)
    //   .pipe(catchError(this.handleError));
  }

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      console.error('Client error:', error.error.message);
    } else {
      // Server-side error
      console.error(`Server error: ${error.status}, Body:`, error.error);
    }
    return throwError(() => new Error('Something went wrong; please try again later.'));
  }

  /** Update payment status */
  updatePayment(paymentId: number, paymentData: Partial<Payment>): Observable<Payment> {
    // Mock implementation for development
    const paymentIndex = this.mockPayments.findIndex(p => p.id === paymentId);
    
    if (paymentIndex !== -1) {
      this.mockPayments[paymentIndex] = {
        ...this.mockPayments[paymentIndex],
        ...paymentData
      };
      
      console.log('💰 Mock Payment Updated:', this.mockPayments[paymentIndex]);
      return of(this.mockPayments[paymentIndex]).pipe(delay(500));
    } else {
      // Simulate error for non-existent payment
      return throwError(() => new Error(`Payment with ID ${paymentId} not found`));
    }
    
    // If you have a real backend, uncomment this:
    // return this.http.put<Payment>(`/api/payments/${paymentId}`, paymentData);
  }

  /** Get payment by ID */
  getPayment(paymentId: number): Observable<Payment> {
    // Mock implementation for development
    const payment = this.mockPayments.find(p => p.id === paymentId);
    
    if (payment) {
      return of(payment).pipe(delay(500));
    } else {
      return throwError(() => new Error(`Payment with ID ${paymentId} not found`));
    }
    
    // If you have a real backend, uncomment this:
    // return this.http.get<Payment>(`/api/payments/${paymentId}`);
  }

  /** Get all payments (for debugging) */
  getAllPayments(): Observable<Payment[]> {
    return of(this.mockPayments);
  }

  /** Just a redirect to the actual payment component */
  processPayment(args: {
    paymentModes: Cart["paymentModes"];
    cartItems: ProductData[];
    total: number;
    discount: number;
    tax: number;
    subTotal: number;
    deliveryStatus: string; 
    paymentTracking?: { id: number; paymentSuccess: boolean };
  }) {
    const {
      cartItems: inputCartItems,
      discount,
      paymentModes,
      paymentTracking,
      subTotal: subtotal,
      tax,
      total,
      deliveryStatus, 
    } = args;

    // Use a clone to ensure our mutations don't affect anything important
    const cartItems = structuredClone(inputCartItems);

    /** Indexed with the products name, and stores the index of the product in the new array */
    const visited = new Map<string, number>();
    
    // Get the `count` property depending on the number of times a product appears
    const trimmedCartItems = cartItems.reduce<ProductData[]>((acc, product) => {
      const { isVariant } = this._productHelper.isVariant(product);
      const productAndVariantData = this._productHelper.getData(product);
      const visitedProductIndex = visited.get(productAndVariantData.name);

      if (visitedProductIndex !== undefined) {
        // If product already exists, increment count
        acc[visitedProductIndex].count = (acc[visitedProductIndex].count || 1) + 1;
      } else {
        // If product doesn't exist, add it to the array
        visited.set(productAndVariantData.name, acc.length);
        acc.push({ ...product, count: 1 });
      }
      
      return acc;
    }, []);

    const cart: Cart = {
      cartItems: trimmedCartItems,
      total,
      discount,
      tax,
      subtotal,
      paymentModes,
      id: "",
      orderId: 0,
      deliveryStatus: deliveryStatus, 
    };

    // Hardcoded route - adjust this to match your actual cash payment route
    // Common examples: '/cash-payment', '/payment/cash', '/pay/cash'
    const cashPaymentComponentLink = '/cash-payment';

    this._router.navigate([cashPaymentComponentLink], {
      state: { cart, paymentTracking, prevUrlBeforePaymentPage: this._router.url },
    });
  }
}