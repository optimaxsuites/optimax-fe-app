import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, switchMap, tap, map } from 'rxjs/operators';
import { environment } from '../sharedComponent/service/environments/environment';
import { PaystackService, PaystackPaymentData } from './paystack.service';
import { Order as ComponentOrder } from "../models/interface";

export interface PaymentKey {
  id: number;
  publicKey: string;
  branchId: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  loyaltyPoints: number;
}

export interface Salesperson {
  id: number;
  name: string;
}

export interface Branch {
  id: number;
  name: string;
  description: string;
  address: string;
  phoneNo: number;
  longitude: string;
  latitude: string;
}

export interface OrderItem {
  id: number;
  totalPrice: number;
  quantity: number;
  product: any;
  productVariant: any; 
  productId?: number;
  productVariantId?: number | null;
  orderId?: number | null;
}

export interface PaymentBreakdown {
}

export interface OrderPayment {
  id: number;
  totalAmount: number;
  transactionDate: string;
  status: string; 
  paymentBreakdown: PaymentBreakdown[];
}

export interface Discount {
}

export interface Tax {
}

export interface DeliveryInfo {
  id: number;
  fullName: string;
  phoneNumber: string;
  address: string;
  email: string;
  instructions: string;
}

export interface OrderDTO {
  id: number;
  orderNumber: string;
  orderStatus: string;
  updatedAt: string;
  createdDate: any; // Changed to 'any' to handle both String and Array input
  createdDateArray?: number[]; 
  cashierId: number;
  totalAmount: number;
  isOnline?: boolean; 
  customer: Customer;
  salesperson?: Salesperson;
  branch: Branch;
  orderItem: OrderItem[];
  diveryStatus?: string;
}

export interface StoreOrderPOST {
  id: number;
  orderNumber: string;
  orderStatus: string;
  updatedAt: string;
  createdDate: string;
  amountTendered: number;
  totalAmount: string; 
  isOnline: boolean;
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
  deliverTypeId: number | null;
  deliveryStatus: string;
}

export interface StoreOrderItemPOST {
  id: number;
  totalPrice: number;
  quantity: number;
  productId: number;
  productVariantId: number | null;
  orderId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class StoreOrderService {
  private paymentKeysCache: PaymentKey[] | null = null;

  constructor(
    private http: HttpClient,
    private paystackService: PaystackService
  ) {}

  getAllOrdersAsOrderType(filters?: any): Observable<ComponentOrder[]> {
    const params = this.buildQueryParams(filters || {});
    const endpoint = '/x/api/v2/pos/orders';
    console.log(`📋 Fetching all orders as Order[] from: ${endpoint}`, params);

    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { 
        params: params,
        headers: this.getHeaders()
      }
    ).pipe(
      map((orderDTOs: OrderDTO[]) => {
        return orderDTOs.map(orderDTO => this.convertOrderDTOToComponentOrder(orderDTO));
      }),
      tap((orders) => {
        console.log(`✅ Converted ${orders?.length || 0} orders to ComponentOrder[] type`);
      }),
      catchError(this.handleError)
    );
  }

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  private getHeaders(): HttpHeaders {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      return headers.set('X-Tenant-ID', tenantId);
    }
    
    return headers;
  }

  getAllOrders(filters?: any): Observable<ComponentOrder[]> {
    const params = this.buildQueryParams(filters || {});
    const endpoint = '/x/api/v2/pos/orders';
    console.log(`📋 Fetching all orders from: ${endpoint}`, params);
    
    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { 
        params: params,
        headers: this.getHeaders()
      }
    ).pipe(
      tap((orderDTOs) => {
        console.log(`Retrieved ${orderDTOs?.length || 0} raw Order DTOs`);
      }),
      map((orderDTOs: OrderDTO[]) => {
        const orders = orderDTOs.map(orderDTO => this.convertOrderDTOToComponentOrder(orderDTO));
        console.log(`Converted ${orders.length} Order DTOs to ComponentOrder interface`);
        return orders;
      }),
      catchError(this.handleError)
    );
  }

  getEStoreOrders(filters?: any): Observable<ComponentOrder[]> {
    const params = this.buildQueryParams(filters || {});
    
    const branchId = filters?.branchId || 1;
    const endpoint = `/x/api/v2/pos/orders/get/order/from/eStore/${branchId}`;
    
    console.log(` Fetching eStore orders from: ${endpoint}`, params);

    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { 
        params: params,
        headers: this.getHeaders()
      }
    ).pipe(
      tap((orderDTOs) => {
        console.log(`Retrieved ${orderDTOs?.length || 0} eStore Order DTOs`);
      }),
      map((orderDTOs: OrderDTO[]) => {
        const orders = orderDTOs.map(orderDTO => {
          orderDTO.isOnline = true;
          return this.convertOrderDTOToComponentOrder(orderDTO);
        });
        console.log(` Converted ${orders.length} eStore Order DTOs to ComponentOrder interface`);
        return orders;
      }),
      catchError(this.handleError)
    );
  }

  getPosOrders(filters?: any): Observable<OrderDTO[]> {
    const params = this.buildQueryParams({
      ...filters,
    });
    
    const endpoint = '/x/api/v2/pos/orders';
    console.log(`🏪 Fetching POS orders from: ${endpoint}`, params);

    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { 
        params: params,
        headers: this.getHeaders()
      }
    ).pipe(
      map((orders: OrderDTO[]) => {
        const posOrders = orders.filter(order => !order.isOnline);
        console.log(`✅ Retrieved ${posOrders.length} POS orders (filtered from ${orders.length} total)`);
        
        posOrders.forEach(order => {
          order.isOnline = false;
        });
        
        return posOrders;
      }),
      catchError(this.handleError)
    );
  }

  getOrdersByStatus(orderStatus: string, filters?: any): Observable<OrderDTO[]> {
    const params = this.buildQueryParams(filters || {});
    const endpoint = `/x/api/v2/pos/orders/get/by/orderstatus/${orderStatus}`;
    
    console.log(`📊 Fetching orders by status ${orderStatus} from: ${endpoint}`, params);

    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { 
        params: params,
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getOrdersByBranch(branchId: number, filters?: any): Observable<OrderDTO[]> {
    const params = this.buildQueryParams(filters || {});
    const endpoint = `/x/api/v2/pos/orders/get/by/branch/id/${branchId}`;
    
    console.log(`🏬 Fetching orders by branch ${branchId} from: ${endpoint}`, params);

    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { 
        params: params,
        headers: this.getHeaders()
      }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getOrderById(orderId: number): Observable<OrderDTO> {
    const endpoint = `/x/api/v2/pos/orders/${orderId}`;
    console.log(`🔍 Fetching order ${orderId} from: ${endpoint}`);

    return this.http.get<OrderDTO>(
      this.getBaseApiUrl() + endpoint,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getOrdersByOrderNumber(orderNumber: string): Observable<OrderDTO[]> {
    const endpoint = `/x/api/v2/pos/orders/get/by/orderNumer?orderNumber=${orderNumber}`;
    
    console.log(`🔎 Searching orders by order number ${orderNumber} from: ${endpoint}`);

    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getPaymentKeys(): Observable<PaymentKey[]> {
    if (this.paymentKeysCache) {
      return of(this.paymentKeysCache);
    }

    const endpoint = '/x/api/v2/pos/paymentKeyss';
    console.log('🔑 Fetching payment keys from:', endpoint);

    return this.http.get<PaymentKey[]>(
      this.getBaseApiUrl() + endpoint,
      { headers: this.getHeaders() }
    ).pipe(
      tap((keys) => {
        console.log('✅ Payment keys fetched successfully:', keys);
        this.paymentKeysCache = keys;
      }),
      catchError((error) => {
        console.error('❌ Failed to fetch payment keys:', error);
        return of([]);
      })
    );
  }

  getPublicKeyForBranch(branchId: number = 1): Observable<string> {
    return this.getPaymentKeys().pipe(
      map((keys: PaymentKey[]) => {
        const key = keys.find(k => k.branchId === branchId) || keys[0];
        
        if (!key) {
          throw new Error('No payment keys available');
        }

        console.log('🔑 Using public key for branch:', branchId, key.publicKey.substring(0, 20) + '...');
        return key.publicKey;
      }),
      catchError((error) => {
        console.error('❌ Failed to get public key:', error);
        return throwError(() => new Error('Unable to retrieve payment key'));
      })
    );
  }

  processPaystackPayment(
    email: string,
    amount: number,
    orderNumber: string
  ): Observable<any> {
    return this.getPublicKeyForBranch().pipe(
      switchMap((publicKey: string) => {
        this.paystackService.setPublicKey(publicKey);

        const paymentData: PaystackPaymentData = {
          email: email,
          amount: amount,
          reference: this.paystackService.generateReference(),
          metadata: {
            custom_fields: [
              {
                display_name: 'Order Number',
                variable_name: 'order_number',
                value: orderNumber
              }
            ]
          }
        };

        console.log('💳 Processing Paystack payment with dynamic key:', {
          email: paymentData.email,
          amount: paymentData.amount,
          reference: paymentData.reference,
          publicKey: publicKey.substring(0, 20) + '...'
        });
        
        return from(this.paystackService.processPayment(paymentData));
      }),
      catchError((error) => {
        console.error('❌ Paystack payment initialization failed:', error);
        return throwError(() => 'Payment service unavailable');
      })
    );
  }

  createOrderWithPayment(
    orderData: StoreOrderPOST,
    paymentMethod: string,
    paymentReference: string,
    deliveryInfo?: any
  ): Observable<any> {
    console.log('🔄 Starting order creation with payment...');
    console.log('Payment method:', paymentMethod);
    console.log('Payment reference:', paymentReference);
    
    const baseOrder: StoreOrderPOST = {
        ...orderData,
        deliveryStatus: orderData.deliveryStatus || 'PENDING'
    };
    
    return this.createPaymentRecord(
      baseOrder.totalAmount,
      baseOrder.orderNumber,
      paymentMethod === 'card' ? 'PAID' : 'PENDING',
      this.mapPaymentMethod(paymentMethod),
      paymentReference
    ).pipe(
      tap((paymentResponse: any) => {
        console.log('✅ Payment record created successfully:', paymentResponse);
        console.log('Payment ID:', paymentResponse.id);
      }),
      switchMap((paymentResponse: any) => {
        const paymentId = paymentResponse.id;
        
        if (!paymentId || paymentId === 0) {
          console.error('❌ Payment response invalid - no ID found:', paymentResponse);
          throw new Error('Payment record creation failed - no valid payment ID returned');
        }

        const orderWithPayment = {
          ...baseOrder,
          paymentId: paymentId,
          orderStatus: paymentMethod === 'card' ? 'PAID' : 'PENDING'
        };

        console.log('📦 Order with payment ID attached:', {
          orderId: orderWithPayment.id,
          paymentId: orderWithPayment.paymentId,
          orderStatus: orderWithPayment.orderStatus,
          deliveryStatus: orderWithPayment.deliveryStatus 
        });

        if (deliveryInfo && baseOrder.deliveryFee > 0) {
          console.log('🚚 Creating delivery info...');
          return this.createDeliveryInfo(deliveryInfo).pipe(
            tap((deliveryResponse: any) => {
              console.log('✅ Delivery info created:', deliveryResponse);
            }),
            switchMap((deliveryResponse: any) => {
              const deliveryId = this.extractIdFromResponse(deliveryResponse);
              const orderWithDelivery = {
                ...orderWithPayment,
                deliveryInfoId: deliveryId,
                customerEmail: deliveryInfo.email || baseOrder.customerEmail,
              };
              console.log('📦 Final order data with delivery:', orderWithDelivery);
              return this.finalizeOrderCreation(orderWithDelivery);
            }),
            catchError((error) => {
              console.error('❌ Delivery info creation failed:', error);
              return throwError(() => 'Failed to create delivery information');
            })
          );
        } else {
          const pickupOrder = {
            ...orderWithPayment,
          };
          console.log('📦 Final pickup order data:', pickupOrder);
          return this.finalizeOrderCreation(pickupOrder);
        }
      }),
      catchError((error) => {
        console.error('❌ Order creation with payment failed:', error);
        return this.handleError(error);
      })
    );
  }

  createCashOrder(
    orderData: StoreOrderPOST,
    deliveryInfo?: any
  ): Observable<any> {
    console.log('💵 Creating cash order...');
    return this.createOrderWithPayment(
      orderData,
      'cash',
      `CASH-${orderData.orderNumber}`,
      deliveryInfo
    );
  }

  cancelOrder(orderId: number, reason: string, requireChargeback: boolean): Observable<any> {
    const endpoint = `/x/api/v2/pos/orders/${orderId}/cancel`;
    const payload = {
      reason: reason,
      processChargeback: requireChargeback
    };
    
    console.log(`Cancelling order ${orderId} with payload:`, payload);

    return this.http.post<any>(
      this.getBaseApiUrl() + endpoint,
      payload
    ).pipe(
      catchError(this.handleError)
    );
  }

  private buildQueryParams(filters: any): any {
    const params: any = {};
    
    for (const key in filters) {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        if (typeof value === 'string' && value.trim() === '') {
          continue;
        }
        params[key] = value;
      }
    }

    return params;
  }

  // =========================================================
  // CRITICAL FIX: Robust Date Parsing for both Arrays and Strings
  // =========================================================
  private parseDateToArray(dateInput: any): number[] {
    // 1. If it is null or undefined
    if (!dateInput) return [0, 0, 0, 0, 0, 0];

    // 2. If it's already an array (e.g. [2025, 12, 10, ...])
    if (Array.isArray(dateInput)) {
      // Just return it, ensuring we have at least year/month/day
      return [
        dateInput[0] || 0,
        dateInput[1] || 0,
        dateInput[2] || 0,
        dateInput[3] || 0,
        dateInput[4] || 0,
        dateInput[5] || 0
      ];
    }

    // 3. If it is a string or timestamp number
    try {
      const date = new Date(dateInput);
      
      // Check if Date is invalid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date received:', dateInput);
        return [0, 0, 0, 0, 0, 0];
      }

      return [
        date.getFullYear(),
        date.getMonth() + 1, // Store as 1-based index to match standard array convention
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
        date.getSeconds()
      ];
    } catch (error) {
      console.error('Error parsing date:', dateInput, error);
      return [0, 0, 0, 0, 0, 0];
    }
  }

  private convertOrderDTOToComponentOrder(orderDTO: OrderDTO): ComponentOrder {
    const createdDateArray = this.parseDateToArray(orderDTO.createdDate);
    const totalAmountNum = orderDTO.totalAmount || 0;
    
    // Explicitly check isOnline, do not guess based on delivery status
    const isOnline = orderDTO.isOnline === true;

    return {
      id: orderDTO.orderNumber, 
      orderNumber: orderDTO.orderNumber, 
      orderStatus: orderDTO.orderStatus || 'PENDING',
      updatedAt: orderDTO.updatedAt,
      createdDate: createdDateArray,
      totalAmount: totalAmountNum,
      salesperson: orderDTO.salesperson || null,
      branch: orderDTO.branch || null,
      orderItem: orderDTO.orderItem || [],
      customer: orderDTO.customer || null,
      isOnline: isOnline,
      payment: null,
      amountTendered: totalAmountNum,
      status: orderDTO.orderStatus || 'PENDING',
      deliveryStatus: orderDTO.diveryStatus || (isOnline ? 'PENDING' : 'N/A'), 
      amount: totalAmountNum, 
      timestamp: createdDateArray,
      name: orderDTO.customer?.name || 'Walk-in',
      cartDiscount: 0,
      state: 'COMPLETED', 
      total: totalAmountNum,
      cart: [], 
      deliveryMethod: isOnline ? 'DELIVERY' : 'PICKUP', 
      deliveryInfo: null, 
    };
  }

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

    console.log('💳 Creating payment record with data:', JSON.stringify(paymentData, null, 2));

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/payments',
      paymentData,
      { headers: this.getHeaders() }
    ).pipe(
      tap((response) => {
        console.log('✅ Payment API raw response:', response);
        console.log('Response type:', typeof response);
        this.debugPaymentResponse(response);
      }),
      map((response) => {
        const paymentId = this.extractIdFromResponse(response);
        
        if (!paymentId) {
          console.error('❌ Could not extract payment ID from response:', response);
          throw new Error('Invalid payment response format - no ID found');
        }
        
        console.log('✅ Extracted Payment ID:', paymentId);
        
        return {
          id: paymentId,
          originalResponse: response
        };
      }),
      catchError((error) => {
        console.error('❌ Payment record creation failed:', error);
        console.error('Request payload was:', paymentData);
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

    console.log('🚚 Creating delivery info:', deliveryData);

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/deliveryinfo',
      deliveryData,
      { headers: this.getHeaders() }
    ).pipe(
      map((response) => {
        const deliveryId = this.extractIdFromResponse(response);
        return {
          id: deliveryId,
          originalResponse: response
        };
      }),
      catchError(this.handleError)
    );
  }

  private finalizeOrderCreation(orderData: StoreOrderPOST): Observable<any> {
    console.log('🔍 Validating order data before finalization...');
    console.log('Payment ID:', orderData.paymentId);
    console.log('Order Status:', orderData.orderStatus);
    
    if (!orderData.paymentId || orderData.paymentId === 0) {
      console.error('❌ Payment ID is missing or invalid!');
      console.error('Full order data:', JSON.stringify(orderData, null, 2));
      return throwError(() => 'Payment record must be created before order');
    }

    const sanitizedOrderData = this.sanitizeOrderData(orderData);

    console.log('🚀 Sending final order data to API:', JSON.stringify(sanitizedOrderData, null, 2));

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/orders',
      sanitizedOrderData,
      { headers: this.getHeaders() }
    ).pipe(
      tap((response) => {
        console.log('✅ Order created successfully:', response);
      }),
      catchError((error) => {
        console.error('❌ Order creation API call failed:', error);
        console.error('Request payload was:', sanitizedOrderData);
        return this.handleError(error);
      })
    );
  }

  private sanitizeOrderData(orderData: StoreOrderPOST): any {
    const sanitized = {
      id: 0,
      orderNumber: orderData.orderNumber,
      orderStatus: orderData.orderStatus,
      updatedAt: orderData.updatedAt,
      createdDate: orderData.createdDate,
      amountTendered: orderData.amountTendered || 0,
      totalAmount: orderData.totalAmount,
      quantity: orderData.quantity,
      customerId: orderData.customerId || 1,
      branchId: orderData.branchId || 1,
      discountId: orderData.discountId && orderData.discountId > 0 ? orderData.discountId : null,
      paymentId: orderData.paymentId,
      cashierId: orderData.cashierId && orderData.cashierId > 0 ? orderData.cashierId : null,
      orderItem: orderData.orderItem.map((item: StoreOrderItemPOST) => ({
        id: 0,
        totalPrice: item.totalPrice,
        quantity: item.quantity,
        productId: item.productId,
        productVariantId: item.productVariantId && item.productVariantId > 0 ? item.productVariantId : null,
        orderId: null
      })),
      deliveryFee: orderData.deliveryFee || 0,
      estimatedReadyTime: orderData.estimatedReadyTime,
      estimatedDeliveryTime: orderData.estimatedDeliveryTime,
      customerEmail: orderData.customerEmail,
      deliveryInfoId: orderData.deliveryInfoId && orderData.deliveryInfoId > 0 ? orderData.deliveryInfoId : null,
      deliverTypeId: orderData.deliverTypeId && orderData.deliverTypeId > 0 ? orderData.deliverTypeId : null,
      deliveryStatus: orderData.deliveryStatus || 'PENDING',
      isOnline: true
    };

    console.log('🔍 Sanitized order data with fixed deliveryStatus:', JSON.stringify(sanitized, null, 2));
    
    if (!sanitized.paymentId) {
      console.error('❌ CRITICAL: paymentId is null in sanitized data!');
      console.error('Original paymentId was:', orderData.paymentId);
    }

  return sanitized;
}
  private extractIdFromResponse(response: any): number {
    if (typeof response === 'number') {
      return response;
    } else if (response && typeof response.id === 'number') {
      return response.id;
    } else if (response && typeof response === 'object') {
      const id = response.paymentId || response.deliveryInfoId || response.ID;
      if (typeof id === 'number') return id;
    } 
    if (response) {
      const id = Number(response);
      return isNaN(id) ? 0 : id;
    }
    return 0;
  }

  private debugPaymentResponse(response: any): void {
    console.log('🔍 DEBUG - Payment Response Analysis:');
    console.log('Response:', response);
    console.log('Type:', typeof response);
    console.log('Is number:', typeof response === 'number');
    console.log('Is object:', typeof response === 'object');
    
    if (typeof response === 'object') {
      console.log('Keys:', Object.keys(response));
      console.log('Has id property:', 'id' in response);
      console.log('Has paymentId property:', 'paymentId' in response);
    }
  }

  private mapPaymentMethod(storeMethod: string): string {
    const methodMap: { [key: string]: string } = {
      'cash': 'CASH',
      'transfer': 'TRANSFER',
      'card': 'CARD',
      'mobile': 'MOBILE_MONEY'
    };
    const mapped = methodMap[storeMethod] || 'CASH';
    console.log(`Mapped payment method: ${storeMethod} -> ${mapped}`);
    return mapped;
  }

  private handleError(error: HttpErrorResponse) {
    console.error('❌ API Error Details:', {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      error: error.error,
      url: error.url
    });
    
    let errorMessage = 'An unknown error occurred!';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 400:
          errorMessage = this.parseValidationErrors(error.error);
          break;
        case 401:
          errorMessage = 'Authentication failed. Please check your credentials.';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 0:
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
          break;
        default:
          if (error.message?.includes('Payment record creation failed')) {
            errorMessage = 'Payment processing failed. Please try a different payment method.';
          } else if (error.message?.includes('Invalid payment response format')) {
            errorMessage = 'Payment service returned an unexpected response. Please contact support.';
          } else if (error.message?.includes('No payment keys available') || 
                      error.message?.includes('Unable to retrieve payment key')) {
            errorMessage = 'Payment service is currently unavailable. Please try another payment method.';
          } else {
            errorMessage = this.extractErrorMessage(error.error) || 'An unexpected error occurred. Please try again.';
          }
      }
    }
    
    console.error('📤 Throwing error:', errorMessage);
    return throwError(() => errorMessage);
  }

  private parseValidationErrors(error: any): string {
    if (error.fieldErrors) {
      const fieldErrors = error.fieldErrors.map((err: any) =>
        `${err.field}: ${err.errorCode || err.message}`
      ).join(', ');
      return `Validation errors: ${fieldErrors}`;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'Invalid data provided. Please check your input.';
  }

  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    if (error?.message) {
      return error.message;
    }
    if (error?.error) {
      return this.extractErrorMessage(error.error);
    }
    return 'An unexpected error occurred. Please try again.';
  }
}