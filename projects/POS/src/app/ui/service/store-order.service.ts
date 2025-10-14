// store-order.service.ts - UPDATED with proper payment linking
import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, from, forkJoin } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../sharedComponent/service/environments/environment';
import { PaystackService, PaystackPaymentData } from './paystack.service';

@Injectable({
  providedIn: 'root'
})
export class StoreOrderService {
  constructor(
    private http: HttpClient,
    private paystackService: PaystackService
  ) {}

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  // ========== PAYSTACK METHODS ==========

  processPaystackPayment(
    email: string,
    amount: number,
    orderNumber: string
  ): Observable<any> {
    const paymentData: PaystackPaymentData = {
      email: email,
      amount: amount,
      reference: this.paystackService.generateReference(),
      metadata: {
        custom_fields: [
          {
            display_name: "Order Number",
            variable_name: "order_number",
            value: orderNumber
          }
        ]
      }
    };

    console.log('💳 Processing Paystack payment:', paymentData);
    return from(this.paystackService.processPayment(paymentData));
  }

  // ========== ORDER CREATION METHODS ==========

  // Create order with payment - FIXED VERSION
  createOrderWithPayment(
    orderData: StoreOrderPOST,
    paymentMethod: string,
    paymentReference: string,
    deliveryInfo?: any
  ): Observable<any> {
    // First create the payment
    return this.createPaymentRecord(
      orderData.totalAmount,
      orderData.orderNumber,
      paymentMethod === 'card' ? 'PAID' : 'PENDING',
      this.mapPaymentMethod(paymentMethod),
      paymentReference
    ).pipe(
      switchMap((paymentResponse: any) => {
        console.log('✅ Payment record created:', paymentResponse);
        
        // Now create the order with the payment ID
        const orderWithPayment = {
          ...orderData,
          paymentId: paymentResponse.id,
          orderStatus: paymentMethod === 'card' ? 'PAID' : 'UNPAID'
        };

        // Handle delivery info if needed
        if (deliveryInfo && orderData.deliveryFee > 0) {
          return this.createDeliveryInfo(deliveryInfo).pipe(
            switchMap((deliveryResponse: any) => {
              const orderWithDelivery = {
                ...orderWithPayment,
                deliveryInfoId: deliveryResponse.id,
                customerEmail: deliveryInfo.email || orderData.customerEmail
              };
              return this.finalizeOrderCreation(orderWithDelivery);
            })
          );
        } else {
          return this.finalizeOrderCreation(orderWithPayment);
        }
      })
    );
  }

  // Simple order creation for cash payments
  createCashOrder(
    orderData: StoreOrderPOST, 
    deliveryInfo?: any
  ): Observable<any> {
    return this.createOrderWithPayment(
      orderData,
      'cash',
      `CASH-${orderData.orderNumber}`,
      deliveryInfo
    );
  }

  // ========== PRIVATE HELPER METHODS ==========

  // Create payment record in our system
  private createPaymentRecord(
    totalAmount: string, 
    orderNumber: string, 
    status: string, 
    method: string,
    reference: string
  ): Observable<any> {
    const amount = parseFloat(totalAmount);
    const paymentData = {
      status: status,
      method: method,
      amount: amount,
      totalAmount: amount,
      transactionDate: new Date().toISOString(),
      reference: reference,
      paymentReference: reference
    };

    console.log('💳 Creating payment record:', paymentData);

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/payments',
      paymentData
    ).pipe(catchError(this.handleError));
  }

  private finalizeOrderCreation(orderData: StoreOrderPOST): Observable<any> {
    // CRITICAL: Ensure paymentId is set properly
    if (!orderData.paymentId || orderData.paymentId === 0) {
      console.error('❌ Payment ID is missing! Cannot create order without payment.');
      return throwError(() => 'Payment record must be created before order');
    }

    // Clean up the order data - remove null/0 IDs except paymentId which is required
    const sanitizedOrderData = {
      ...orderData,
      discountId: orderData.discountId && orderData.discountId > 0 ? orderData.discountId : null,
      paymentId: orderData.paymentId, // MUST be valid
      cashierId: orderData.cashierId && orderData.cashierId > 0 ? orderData.cashierId : null,
      deliveryInfoId: orderData.deliveryInfoId && orderData.deliveryInfoId > 0 ? orderData.deliveryInfoId : null,
      orderItem: orderData.orderItem.map(item => ({
        ...item,
        orderId: null, // Backend will set this
        productVariantId: item.productVariantId && item.productVariantId > 0 ? item.productVariantId : null
      }))
    };

    console.log('🚀 Sending final order data with paymentId:', sanitizedOrderData.paymentId);
    console.log('Full order payload:', JSON.stringify(sanitizedOrderData, null, 2));

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/orders', 
      sanitizedOrderData
    ).pipe(
      catchError((error) => {
        console.error('❌ Order creation failed:', error);
        return this.handleError(error);
      })
    );
  }

  private createDeliveryInfo(deliveryInfo: any): Observable<any> {
    const deliveryData = {
      fullName: deliveryInfo.fullName,
      phoneNumber: deliveryInfo.phoneNumber,
      address: deliveryInfo.address,
      email: deliveryInfo.email || '',
      instructions: deliveryInfo.instructions || ''
    };

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/deliveryInfos',
      deliveryData
    ).pipe(catchError(this.handleError));
  }

  private mapPaymentMethod(storeMethod: string): string {
    const methodMap: { [key: string]: string } = {
      'cash': 'CASH',
      'transfer': 'TRANSFER', 
      'card': 'CARD',
      'mobile': 'MOBILE_MONEY'
    };
    return methodMap[storeMethod] || 'CASH';
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 500) {
        errorMessage = 'Server error: ' + (error.error.message || 'Check form details and try again.');
      } else if (error.error) {
        if (typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error.fieldErrors) {
          const fieldErrors = error.error.fieldErrors.map((err: any) => 
            `${err.field}: ${err.errorCode}`
          ).join(', ');
          errorMessage = `Validation errors: ${fieldErrors}`;
        } else {
          errorMessage = JSON.stringify(error.error);
        }
      } else if (error.status === 404) {
        errorMessage = 'Resource not found. Please try again.';
      } else if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else {
        errorMessage = error.error?.message || 'An unexpected error occurred.';
      }
    }
    return throwError(() => errorMessage);
  }
}

export interface StoreOrderPOST {
  id: number;
  orderNumber: string;
  orderStatus: string;
  updatedAt: string;
  createdDate: string;
  amountTendered: number;
  totalAmount: string;
  quantity: number;
  customerId: number;
  branchId: number;
  discountId: number | null;
  paymentId: number | null;
  cashierId: number | null;
  orderItem: StoreOrderItemPOST[];
  deliveryFee: number;
  estimatedReadyTime: string;
  estimatedDeliveryTime: string;
  customerEmail: string;
  deliveryInfoId: number | null;
}

export interface StoreOrderItemPOST {
  id: number;
  totalPrice: number;
  quantity: number;
  productId: number;
  productVariantId: number | null;
  orderId: number | null;
}