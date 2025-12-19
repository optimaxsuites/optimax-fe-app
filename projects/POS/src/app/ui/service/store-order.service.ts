import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, switchMap, tap, map } from 'rxjs/operators';
import { environment } from '../sharedComponent/service/environments/environment';
import { PaystackService, PaystackPaymentData } from './paystack.service';
import { Order as ComponentOrder, OrderUpdateDTO } from "../models/interface";

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
  createdDate: any; 
  createdDateArray?: number[]; 
  cashierId: number;
  totalAmount: number;
  isOnline?: boolean; 
  customer: Customer;
  salesperson?: Salesperson;
  branch: Branch;
  orderItem: OrderItem[];
  deliveryStatus?: string;
  payment?: OrderPayment;
  deliveryInfo?: DeliveryInfo;
  updatedBy?: string;
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

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      headers = headers.set('X-Tenant-ID', tenantId);
    }

    // Add Authorization header if available
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

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
    const branchId = filters?.branchId || 1;
    
    // Build query parameters for the specialized endpoint
    let params = new HttpParams()
      .set('isOnline', 'true')
      .set('page', (filters?.page || 1).toString())
      .set('size', (filters?.size || 10).toString());

    const endpoint = `/x/api/v2/pos/orders/get/order/from/eStore/${branchId}`;
    
    console.log('🛒 Fetching E-Store orders from specialized endpoint:', {
      endpoint,
      branchId,
      params: params.toString()
    });

    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { 
        params: params,
        headers: this.getHeaders()
      }
    ).pipe(
      map((orderDTOs: OrderDTO[]) => {
        if (!Array.isArray(orderDTOs)) {
          console.warn('⚠️ Unexpected response format, expected array:', orderDTOs);
          return [];
        }

        console.log(`📦 Received ${orderDTOs.length} e-store orders from API`);

        // Convert DTOs to ComponentOrder
        const orders = orderDTOs.map(dto => this.convertOrderDTOToComponentOrder(dto));

        // Additional client-side filtering to ensure data quality
        const filteredOrders = orders.filter(order => {
          const customerName = (order.customer?.name || order.name || '').toLowerCase();
          
          // Exclude walk-in customers (they should be POS only)
          if (customerName === 'walk-in') {
            console.log(`🚫 Filtering out walk-in order: ${order.orderNumber}`);
            return false;
          }

          // Must be marked as online OR have delivery info
          const hasOnlineFlag = order.isOnline === true;
          const hasDeliveryInfo = order.deliveryInfo != null;
          
          if (!hasOnlineFlag && !hasDeliveryInfo) {
            console.log(`🚫 Filtering out non-online order: ${order.orderNumber}`);
            return false;
          }

          return true;
        });

        console.log(`✅ Filtered to ${filteredOrders.length} valid e-store orders`);

        // Sort by creation date (newest first)
        const sortedOrders = this.sortOrdersByDate(filteredOrders);

        console.log('📊 E-Store orders loaded and sorted:', {
          total: sortedOrders.length,
          firstOrder: sortedOrders[0]?.orderNumber,
          lastOrder: sortedOrders[sortedOrders.length - 1]?.orderNumber
        });

        return sortedOrders;
      }),
      catchError((error) => {
        console.error('❌ Failed to fetch e-store orders:', error);
        
        // If the specialized endpoint fails, provide helpful error message
        if (error.status === 404) {
          console.warn('⚠️ Specialized e-store endpoint not found, check API documentation');
        } else if (error.status === 401 || error.status === 403) {
          console.error('🔒 Authentication/Authorization failed - check token and tenant ID');
        }
        
        return this.handleError(error);
      })
    );
  }

  private sortOrdersByDate(orders: ComponentOrder[]): ComponentOrder[] {
    return orders.sort((a, b) => {
      const timeA = this.getTimestampFromOrder(a);
      const timeB = this.getTimestampFromOrder(b);
      
      // Sort descending (newest first)
      return timeB - timeA;
    });
  }

  private getTimestampFromOrder(order: ComponentOrder): number {
    if (Array.isArray(order.createdDate) && order.createdDate.length >= 3) {
      return new Date(
        order.createdDate[0], 
        order.createdDate[1] - 1, // Month is 0-indexed
        order.createdDate[2], 
        order.createdDate[3] || 0, 
        order.createdDate[4] || 0, 
        order.createdDate[5] || 0
      ).getTime();
    }
    
    // Fallback to timestamp property
    if (order.timestamp) {
      if (Array.isArray(order.timestamp)) {
        return new Date(
          order.timestamp[0],
          order.timestamp[1] - 1,
          order.timestamp[2],
          order.timestamp[3] || 0,
          order.timestamp[4] || 0,
          order.timestamp[5] || 0
        ).getTime();
      }
      return new Date(order.timestamp).getTime();
    }
    
    return 0;
  }

  getPosOrders(filters?: any): Observable<OrderDTO[]> {
    const params = this.buildQueryParams(filters || {});
    
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

        console.log('💳 Processing Paystack payment:', {
          email: paymentData.email,
          amount: paymentData.amount,
          reference: paymentData.reference
        });
        
        return from(this.paystackService.processPayment(paymentData));
      }),
      catchError((error) => {
        console.error('❌ Paystack payment failed:', error);
        return throwError(() => 'Payment service unavailable. Please use cash or bank transfer.');
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
    
    const baseOrder: StoreOrderPOST = {
        ...orderData,
        // Only set deliveryStatus to PENDING if payment is successful
        deliveryStatus: paymentMethod === 'card' && orderData.orderStatus === 'PAID' 
          ? 'PENDING' 
          : 'AWAITING_PAYMENT'
    };
    
    return this.createPaymentRecord(
      baseOrder.totalAmount,
      baseOrder.orderNumber,
      paymentMethod === 'card' ? 'PAID' : 'PENDING',
      this.mapPaymentMethod(paymentMethod),
      paymentReference
    ).pipe(
      tap((paymentResponse: any) => {
        console.log(' Payment record created:', paymentResponse);
      }),
      switchMap((paymentResponse: any) => {
        const paymentId = paymentResponse.id;
        
        if (!paymentId || paymentId === 0) {
          throw new Error('Payment record creation failed - no valid payment ID');
        }

        const orderWithPayment = {
          ...baseOrder,
          paymentId: paymentId,
          orderStatus: paymentMethod === 'card' ? 'PAID' : 'PENDING'
        };

        if (deliveryInfo && baseOrder.deliveryFee > 0) {
          return this.createDeliveryInfo(deliveryInfo).pipe(
            switchMap((deliveryResponse: any) => {
              const deliveryId = this.extractIdFromResponse(deliveryResponse);
              const orderWithDelivery = {
                ...orderWithPayment,
                deliveryInfoId: deliveryId,
                customerEmail: deliveryInfo.email || baseOrder.customerEmail,
              };
              return this.finalizeOrderCreation(orderWithDelivery);
            })
          );
        } else {
          return this.finalizeOrderCreation(orderWithPayment);
        }
      }),
      catchError(this.handleError)
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


  updateOrder(orderId: number | string, updateData: OrderUpdateDTO): Observable<OrderDTO> {
    const endpoint = `/x/api/v2/pos/orders/${orderId}`;
    console.log(`🔄 Updating order ${orderId} via PUT:`, updateData);

    return this.http.put<OrderDTO>(
      this.getBaseApiUrl() + endpoint,
      updateData,
      { headers: this.getHeaders() }
    ).pipe(
      tap(res => console.log('✅ Order updated successfully', res)),
      catchError(error => this.handleError(error))
    );
  }

  cancelOrder(order: ComponentOrder, reason: string, requireChargeback: boolean): Observable<OrderDTO> {
    // must map the ComponentOrder back to the backend DTO format 
    // to satisfy @NotNull constraints on totalAmount, quantity, deliveryStatus
    const payload: OrderUpdateDTO = {
      id: order.id,
      orderNumber: order.orderNumber,
      
      // The crucial change: Update status
      orderStatus: 'CANCELLED',
      cancellationReason: reason,
      processChargeback: requireChargeback,
      
      // Include mandatory fields to pass validation
      totalAmount: order.totalAmount,
      quantity: this.calculateQuantity(order), // Helper to ensure quantity is present
      deliveryStatus: order.deliveryStatus || 'PENDING',
      
      // Map other necessary fields
      customerId: order.customer?.id,
      branchId: order.branch?.id,
      customerEmail: order.customer?.email,
      
      // Preserve existing data
      updatedBy: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').name : 'System',
      isOnline: order.isOnline,
      createdDate: this.formatDateForBackend(order.createdDate)
    };
    
    console.log(`🚫 Cancelling order ${order.id} with full payload:`, payload);

    return this.updateOrder(order.id, payload);
  }


  updateDeliveryStatus(order: ComponentOrder, status: string, currentUser: string): Observable<OrderDTO> {
    const payload: OrderUpdateDTO = {
      id: order.id,
      orderNumber: order.orderNumber,
      
      // The crucial change
      deliveryStatus: status,
      updatedBy: currentUser,
      
      // Include mandatory fields to pass validation
      orderStatus: order.orderStatus,
      totalAmount: order.totalAmount,
      quantity: this.calculateQuantity(order),
      
      customerId: order.customer?.id,
      branchId: order.branch?.id,
      isOnline: order.isOnline,
      createdDate: this.formatDateForBackend(order.createdDate)
    };

    console.log(`🚚 Updating delivery status for order ${order.id} with payload:`, payload);

    return this.updateOrder(order.id, payload);
  }

  // Helper to ensure quantity is not null
  private calculateQuantity(order: ComponentOrder): number {
    if (order.orderItem && order.orderItem.length > 0) {
      return order.orderItem.reduce((acc: any, item: { quantity: any; }) => acc + (item.quantity || 0), 0);
    }
    // Fallback if orderItem is missing but we need a number for validation
    return 1; 
  }

  // Helper to handle date format for PUT if backend requires ISO string
  private formatDateForBackend(dateInput: any): string {
    if (Array.isArray(dateInput)) {
       const [year, month, day, hour, minute, second] = dateInput;
       return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).toISOString();
    }
    if (typeof dateInput === 'string') return dateInput;
    return new Date().toISOString();
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

  private parseDateToArray(dateInput: any): number[] {
    if (!dateInput) return [0, 0, 0, 0, 0, 0];

    if (Array.isArray(dateInput)) {
      return [
        dateInput[0] || 0,
        dateInput[1] || 0,
        dateInput[2] || 0,
        dateInput[3] || 0,
        dateInput[4] || 0,
        dateInput[5] || 0
      ];
    }

    // String or timestamp
    try {
      const date = new Date(dateInput);
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateInput);
        return [0, 0, 0, 0, 0, 0];
      }

      return [
        date.getFullYear(),
        date.getMonth() + 1,
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
    
    // Determine if online
    let isOnline = orderDTO.isOnline === true;
    if (!isOnline && orderDTO.deliveryInfo) {
      isOnline = true;
    }

    // Determine delivery status based on payment status
    let deliveryStatus = 'N/A';
    
    if (isOnline) {
      // Check payment status to determine delivery status
      const isPaid = orderDTO.orderStatus === 'PAID' || 
                     (orderDTO.payment && orderDTO.payment.status === 'PAID');
      
      if (orderDTO.deliveryStatus && orderDTO.deliveryStatus !== 'N/A') {
        // Use existing delivery status if available
        deliveryStatus = orderDTO.deliveryStatus;
      } else if (isPaid) {
        // If paid but no delivery status, set to PENDING
        deliveryStatus = 'PENDING';
      } else {
        // If not paid, awaiting payment
        deliveryStatus = 'AWAITING_PAYMENT';
      }
    }

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
      payment: orderDTO.payment || null,
      amountTendered: totalAmountNum,
      status: orderDTO.orderStatus || 'PENDING',
      deliveryStatus: deliveryStatus,
      deliveryInfo: orderDTO.deliveryInfo || null,
      amount: totalAmountNum, 
      timestamp: createdDateArray,
      name: orderDTO.customer?.name || 'Walk-in',
      cartDiscount: 0,
      state: 'COMPLETED', 
      total: totalAmountNum,
      cart: [], 
      deliveryMethod: isOnline ? 'DELIVERY' : 'PICKUP',
      updatedBy: orderDTO.updatedBy || 'System'
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

    console.log('Creating payment record:', paymentData);

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/payments',
      paymentData,
      { headers: this.getHeaders() }
    ).pipe(
      map((response) => {
        const paymentId = this.extractIdFromResponse(response);
        
        if (!paymentId) {
          throw new Error('Invalid payment response - no ID found');
        }
        
        return {
          id: paymentId,
          originalResponse: response
        };
      }),
      catchError(this.handleError)
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
    if (!orderData.paymentId || orderData.paymentId === 0) {
      return throwError(() => 'Payment record must be created before order');
    }

    const sanitizedOrderData = this.sanitizeOrderData(orderData);
    
    // Ensure isOnline is true for e-store orders
    if (sanitizedOrderData.deliveryFee > 0 || sanitizedOrderData.deliveryInfoId) {
      sanitizedOrderData.isOnline = true;
    }

    console.log('🚀 Creating order:', sanitizedOrderData);

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/orders',
      sanitizedOrderData,
      { headers: this.getHeaders() }
    ).pipe(
      tap((response) => {
        console.log(' Order created:', response);
      }),
      catchError(this.handleError)
    );
  }

  private sanitizeOrderData(orderData: StoreOrderPOST): any {
    return {
      id: 0,
      orderNumber: orderData.orderNumber,
      orderStatus: orderData.orderStatus,
      updatedAt: orderData.updatedAt,
      createdDate: orderData.createdDate,
      amountTendered: orderData.amountTendered || 0,
      totalAmount: orderData.totalAmount,
      isOnline: orderData.isOnline,
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
      deliveryStatus: orderData.deliveryStatus || 'PENDING'
    };
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
    console.error('❌ API Error Details:', {
      status: error.status,
      message: error.message,
      url: error.url,
      serverError: error.error // This contains the SQL exception details
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
          // Check for specific backend exception messages if exposed
          if (error.error && error.error.exception === 'InvalidDataAccessResourceUsageException') {
             errorMessage = 'Database Schema Error: The server is trying to access a missing column/table.';
          } else {
             errorMessage = 'Server error (500). Please check backend logs or database connection.';
          }
          break;
        case 0:
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
          break;
        default:
          errorMessage = this.extractErrorMessage(error.error) || 'An unexpected error occurred.';
      }
    }
    
    console.error('📤 Throwing error message:', errorMessage);
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