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
  diveryStatus?: string;
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
  taxId: number | null;
  orderItem: StoreOrderItemPOST[];
  deliveryFee: number;
  estimatedReadyTime: string;
  estimatedDeliveryTime: string;
  customerEmail: string;
  deliveryInfoId: number | null;
  deliveryTypeId: number | null;
  deliverTypeId?: number | null; // Keep both for compatibility
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

// NEW Add Ons for Tax Calculation from Code A
export interface TaxCalculation {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxBreakdown: TaxBreakdownItem[];
}

export interface TaxBreakdownItem {
  taxName: string;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
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

  // ========== TAX CALCULATION METHODS FROM CODE A ==========
  calculateTaxes(orderItems: StoreOrderItemPOST[], products: Map<string, any>): TaxCalculation {
    const taxBreakdown: TaxBreakdownItem[] = [];
    let subtotal = 0;
    let taxAmount = 0;
    
    // Group items by tax rate for calculation
    const taxGroups = new Map<number, { rate: number; name: string; taxableAmount: number }>();
    
    orderItems.forEach(item => {
      const product = products.get(item.productId.toString());
      const itemTotal = item.totalPrice || (product?.sellingPrice * item.quantity);
      subtotal += itemTotal;
      
      // Get tax info from product
      const productTax = product?.tax;
      if (productTax && typeof productTax === 'object' && 'rate' in productTax) {
        const taxId = productTax.id;
        const taxRate = productTax.rate || 0;
        const taxName = productTax.name || `Tax ${taxRate}%`;
        
        if (!taxGroups.has(taxId)) {
          taxGroups.set(taxId, { rate: taxRate, name: taxName, taxableAmount: 0 });
        }
        
        const group = taxGroups.get(taxId)!;
        group.taxableAmount += itemTotal;
      }
    });
    
    // Calculate tax for each group
    taxGroups.forEach((group, taxId) => {
      const taxAmt = (group.taxableAmount * group.rate) / 100;
      taxAmount += taxAmt;
      
      taxBreakdown.push({
        taxName: group.name,
        rate: group.rate,
        taxableAmount: group.taxableAmount,
        taxAmount: taxAmt
      });
    });
    
    const total = subtotal + taxAmount;
    
    return {
      subtotal,
      taxAmount,
      total,
      taxBreakdown
    };
  }

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

    // Add Authorization header if available (from Code B)
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  getAllOrdersAsOrderType(filters?: any): Observable<ComponentOrder[]> {
    const params = this.buildQueryParams(filters || {});
    const endpoint = '/x/api/v2/pos/orders';
    console.log(` Fetching all orders as Order[] from: ${endpoint}`, params);

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
        console.log(` Converted ${orders?.length || 0} orders to ComponentOrder[] type`);
      }),
      catchError(this.handleError)
    );
  }

  getAllOrders(filters?: any): Observable<ComponentOrder[]> {
    const params = this.buildQueryParams(filters || {});
    const endpoint = '/x/api/v2/pos/orders';
    console.log(` Fetching all orders from: ${endpoint}`, params);
    
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
    
    // Build query parameters for the specialized endpoint (from Code B)
    let params = new HttpParams()
      .set('isOnline', 'true')
      .set('page', (filters?.page || 1).toString())
      .set('size', (filters?.size || 10).toString());

    const endpoint = `/x/api/v2/pos/orders/get/order/from/eStore/${branchId}`;
    
    console.log(' Fetching E-Store orders from specialized endpoint:', {
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
          console.warn(' Unexpected response format, expected array:', orderDTOs);
          return [];
        }

        console.log(` Received ${orderDTOs.length} e-store orders from API`);

        // Convert DTOs to ComponentOrder
        const orders = orderDTOs.map(dto => this.convertOrderDTOToComponentOrder(dto));

        // Additional client-side filtering to ensure data quality (from Code B)
        const filteredOrders = orders.filter(order => {
          const customerName = (order.customer?.name || order.name || '').toLowerCase();
          
          // Exclude walk-in customers (they should be POS only)
          if (customerName === 'walk-in') {
            console.log(`Filtering out walk-in order: ${order.orderNumber}`);
            return false;
          }

          // Must be marked as online OR have delivery info
          const hasOnlineFlag = order.isOnline === true;
          const hasDeliveryInfo = order.deliveryInfo != null;
          
          if (!hasOnlineFlag && !hasDeliveryInfo) {
            console.log(` Filtering out non-online order: ${order.orderNumber}`);
            return false;
          }

          return true;
        });

        console.log(` Filtered to ${filteredOrders.length} valid e-store orders`);

        // Sort by creation date (newest first) - from Code B
        const sortedOrders = this.sortOrdersByDate(filteredOrders);

        console.log(' E-Store orders loaded and sorted:', {
          total: sortedOrders.length,
          firstOrder: sortedOrders[0]?.orderNumber,
          lastOrder: sortedOrders[sortedOrders.length - 1]?.orderNumber
        });

        return sortedOrders;
      }),
      catchError((error) => {
        console.error(' Failed to fetch e-store orders:', error);
        
        // If the specialized endpoint fails, provide helpful error message
        if (error.status === 404) {
          console.warn(' Specialized e-store endpoint not found, check API documentation');
        } else if (error.status === 401 || error.status === 403) {
          console.error(' Authentication/Authorization failed - check token and tenant ID');
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
    console.log(` Fetching POS orders from: ${endpoint}`, params);

    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { 
        params: params,
        headers: this.getHeaders()
      }
    ).pipe(
      map((orders: OrderDTO[]) => {
        const posOrders = orders.filter(order => !order.isOnline);
        console.log(` Retrieved ${posOrders.length} POS orders (filtered from ${orders.length} total)`);
        
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
    
    console.log(`Fetching orders by status ${orderStatus} from: ${endpoint}`, params);

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
    
    console.log(` Fetching orders by branch ${branchId} from: ${endpoint}`, params);

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
    console.log(`Fetching order ${orderId} from: ${endpoint}`);

    return this.http.get<OrderDTO>(
      this.getBaseApiUrl() + endpoint,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getOrdersByOrderNumber(orderNumber: string): Observable<OrderDTO[]> {
    const endpoint = `/x/api/v2/pos/orders/get/by/orderNumer?orderNumber=${orderNumber}`;
    
    console.log(` Searching orders by order number ${orderNumber} from: ${endpoint}`);

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
    console.log(' Fetching payment keys from:', endpoint);

    return this.http.get<PaymentKey[]>(
      this.getBaseApiUrl() + endpoint,
      { headers: this.getHeaders() }
    ).pipe(
      tap((keys) => {
        console.log('Payment keys fetched successfully:', keys);
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

        console.log('Using public key for branch:', branchId, key.publicKey.substring(0, 20) + '...');
        return key.publicKey;
      }),
      catchError((error) => {
        console.error('Failed to get public key:', error);
        return throwError(() => new Error('Unable to retrieve payment key'));
      })
    );
  }

  // ========== PAYSTACK METHODS (Enhanced from Code A) ==========
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

        console.log('Processing Paystack payment:', {
          email: paymentData.email,
          amount: paymentData.amount,
          reference: paymentData.reference,
          publicKey: publicKey.substring(0, 20) + '...'
        });
        
        return from(this.paystackService.processPayment(paymentData));
      }),
      catchError((error) => {
        console.error('Paystack payment failed:', error);
        return throwError(() => 'Payment service unavailable. Please use cash or bank transfer.');
      })
    );
  }

  // ========== ORDER CREATION METHODS (Enhanced with cartItems support) ==========
  createOrderWithPayment(
    orderData: StoreOrderPOST,
    paymentMethod: string,
    paymentReference: string,
    deliveryInfo?: any,
    cartItems?: Map<string, any>, // Added from Code A
  ): Observable<any> {
    console.log('Starting order creation with payment...');
    
    const baseOrder: StoreOrderPOST = {
        ...orderData,
        // Only set deliveryStatus to PENDING for all payment statuses
        deliveryStatus: 'PENDING'
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
              return this.finalizeOrderCreation(orderWithDelivery, cartItems); // Pass cartItems
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
          return this.finalizeOrderCreation(pickupOrder, cartItems); // Pass cartItems
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
    cartItems?: Map<string, any>, // Added from Code A
    deliveryInfo?: any
  ): Observable<any> {
    console.log(' Creating cash order...');
    return this.createOrderWithPayment(
      orderData,
      'cash',
      `CASH-${orderData.orderNumber}`,
      deliveryInfo,
      cartItems // Pass cartItems
    ).pipe(
      map((response: any) => {
        // 🔥 IMPORTANT: Ensure we're returning the backend response (from Code A)
        console.log('🎯 Backend response structure:', response);
        
        // The response should contain the backend-generated ID
        if (response && response.id) {
          return {
            id: response.id,
            orderNumber: response.orderNumber || orderData.orderNumber,
            status: response.orderStatus || orderData.orderStatus,
            totalAmount: response.totalAmount || orderData.totalAmount,
            createdDate: response.createdDate || orderData.createdDate,
            // Include other fields from response
            ...response
          };
        }
        
        // Fallback to local data if backend response is incomplete
        return {
          id: response?.id || 0,
          orderNumber: orderData.orderNumber,
          status: orderData.orderStatus,
          totalAmount: orderData.totalAmount,
          createdDate: orderData.createdDate,
          ...response
        };
      })
    );
  }

  // ========== ORDER UPDATE METHODS FROM CODE B ==========
  updateOrder(
    order: ComponentOrder,
    updateData: Partial<OrderUpdateDTO>
  ): Observable<OrderDTO> {

    const endpoint = `/x/api/v2/pos/orders`;
    const completeOrderPayload = this.buildCompleteOrderPayload(order, updateData);

    console.log('✏️ Updating order via POST:', completeOrderPayload);

    return this.http.post<OrderDTO>(
      this.getBaseApiUrl() + endpoint,
      completeOrderPayload,
      { headers: this.getHeaders() }
    ).pipe(
      tap(res => console.log('✅ Order updated successfully', res)),
      catchError(error => this.handleError(error))
    );
  }

  private buildCompleteOrderPayload(order: ComponentOrder, updates: Partial<OrderUpdateDTO>): any {
    return {
      id: Number(order.id) || 0, 
      orderNumber: order.orderNumber,
      orderStatus: updates.orderStatus || order.orderStatus,
      deliveryStatus: updates.deliveryStatus || order.deliveryStatus,
      updatedBy: updates.updatedBy || 'System',
      totalAmount: updates.totalAmount || order.totalAmount,
      quantity: this.calculateQuantity(order),
      customerId: order.customer?.id || 1,
      branchId: order.branch?.id || 1,
      deliveryInfoId: order.deliveryInfo?.id || null,
      isOnline: order.isOnline,
      createdDate: this.formatDateForBackend(order.createdDate),
      
      // Map order items ensuring types are correct
      orderItem: (order.orderItem || []).map((item: { id: any; totalPrice: any; quantity: any; product: { id: any; }; productId: any; productVariant: { id: any; }; productVariantId: any; }) => ({
        id: item.id || 0,
        totalPrice: item.totalPrice || 0,
        quantity: item.quantity || 1,
        productId: item.product?.id || item.productId || 0,
        productVariantId: item.productVariant?.id || item.productVariantId || null,
        orderId: Number(order.id) || 0
      }))
    };
  }

  cancelOrder(order: ComponentOrder, reason: string, requireChargeback: boolean): Observable<OrderDTO> {
    // Construct payload with required fields
    const payload: OrderUpdateDTO = {
      id: order.id, 
      orderNumber: order.orderNumber,
      
      orderStatus: 'CANCELLED',
      cancellationReason: reason,
      processChargeback: requireChargeback,
      
      // Include mandatory fields to pass validation
      totalAmount: order.totalAmount,
      quantity: this.calculateQuantity(order), 
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
    
    console.log(`Cancelling order ${order.orderNumber} (ID: ${order.id}) with full payload:`, payload);

    //  Passing the full 'order' object, not 'order.id', because updateOrder expects ComponentOrder
    return this.updateOrder(order, payload);
  }

  updateDeliveryStatus(order: ComponentOrder, status: string, currentUser: string): Observable<OrderDTO> {
    const payload: OrderUpdateDTO = {
      id: order.id,
      orderNumber: order.orderNumber,
      
      deliveryStatus: status,
      updatedBy: currentUser,
      
      orderStatus: order.orderStatus,
      totalAmount: order.totalAmount,
      quantity: this.calculateQuantity(order),
      
      customerId: order.customer?.id,
      branchId: order.branch?.id,
      isOnline: order.isOnline,
      createdDate: this.formatDateForBackend(order.createdDate)
    };

    console.log(`Updating delivery status for order ${order.orderNumber} to ${status}`);

    //Passing the full 'order' object, not 'order.id'
    return this.updateOrder(order, payload);
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
    
    // Determine if online (enhanced from Code B)
    let isOnline = orderDTO.isOnline === true;
    if (!isOnline && orderDTO.deliveryInfo) {
      isOnline = true;
    }

    // Determine delivery status based on payment status (from Code B)
    let deliveryStatus = 'N/A';
    
    if (isOnline) {
      // Check payment status to determine delivery status
      const isPaid = orderDTO.orderStatus === 'PAID' || 
                     (orderDTO.payment && orderDTO.payment.status === 'PAID');
      
      if (orderDTO.deliveryStatus && orderDTO.deliveryStatus !== 'N/A') {
        // Use existing delivery status if available
        deliveryStatus = orderDTO.deliveryStatus;
      } else if (orderDTO.diveryStatus && orderDTO.diveryStatus !== 'N/A') {
        // Check alternate spelling from Code A
        deliveryStatus = orderDTO.diveryStatus;
      } else if (isPaid) {
        // If paid but no delivery status, set to PENDING
        deliveryStatus = 'PENDING';
      } else {
        // If not paid, set to PENDING (awaiting payment)
        deliveryStatus = 'PENDING';
      }
    }

    return {
      // FIXED: Use the database ID (number) cast to string if present, 
      // otherwise fallback to orderNumber. This ensures updates target the correct PK. (from Code B)
      id: (orderDTO.id) ? orderDTO.id.toString() : orderDTO.orderNumber,
      
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
      updatedBy: orderDTO.updatedBy || 'System' // From Code B
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

  private finalizeOrderCreation(orderData: StoreOrderPOST, cartItems?: Map<string, any>): Observable<any> {
    console.log('🔍 Validating order data before finalization...');
    
    // Calculate taxes if cartItems are provided (from Code A)
    let taxCalculation: TaxCalculation | undefined;
    if (cartItems) {
      const orderItemsForTax = orderData.orderItem.map(item => ({
        ...item,
        totalPrice: item.totalPrice
      }));
      taxCalculation = this.calculateTaxes(orderItemsForTax, cartItems);
      
      // Update order totals with tax
      orderData.totalAmount = (taxCalculation.total + orderData.deliveryFee).toFixed(2);
    }
    
    console.log('📊 Tax calculation:', taxCalculation);
    
    if (!orderData.paymentId || orderData.paymentId === 0) {
      return throwError(() => 'Payment record must be created before order');
    }

    const sanitizedOrderData = this.sanitizeOrderData(orderData);
    
    // Ensure isOnline is true for e-store orders
    if (sanitizedOrderData.deliveryFee > 0 || sanitizedOrderData.deliveryInfoId) {
      sanitizedOrderData.isOnline = true;
    }

    console.log('🚀 Sending final order data to API:', JSON.stringify(sanitizedOrderData, null, 2));

    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/orders',
      sanitizedOrderData,
      { headers: this.getHeaders() }
    ).pipe(
      map((response) => {
        console.log('✅ Order created successfully:', response);
        
        // 🔥 IMPORTANT: Use the backend-generated ID, not our local one (from Code A)
        if (response && response.id) {
          console.log('🎯 Using backend order ID:', response.id);
          return {
            ...response,
            taxCalculation: taxCalculation, // Include tax calculation in response
            useBackendId: true // Flag to indicate we're using backend ID
          };
        }
        
        return response;
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
      isOnline: orderData.isOnline,
      quantity: orderData.quantity,
      customerId: orderData.customerId || 1,
      branchId: orderData.branchId || 1,
      discountId: orderData.discountId && orderData.discountId > 0 ? orderData.discountId : null,
      paymentId: orderData.paymentId,
      cashierId: orderData.cashierId && orderData.cashierId > 0 ? orderData.cashierId : null,
      taxId: orderData.taxId && orderData.taxId > 0 ? orderData.taxId : null,
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
      deliveryTypeId: orderData.deliveryTypeId && orderData.deliveryTypeId > 0 ? orderData.deliveryTypeId : null,
      deliverTypeId: orderData.deliverTypeId && orderData.deliverTypeId > 0 ? orderData.deliverTypeId : null, // Keep both
      deliveryStatus: orderData.deliveryStatus || 'PENDING'
    };

    // 🔥 CRITICAL VALIDATIONS from Code A
    console.log('🔍 Sanitized order validation:', {
      isOnline: sanitized.isOnline,
      orderStatus: sanitized.orderStatus,
      paymentId: sanitized.paymentId,
      totalAmount: sanitized.totalAmount
    });
    
    if (!sanitized.paymentId) {
      console.error('❌ CRITICAL: paymentId is null in sanitized data!');
      console.error('Original paymentId was:', orderData.paymentId);
    }

    if (!sanitized.isOnline && (sanitized.deliveryFee > 0 || sanitized.deliveryInfoId)) {
      console.warn('⚠️ WARNING: isOnline flag is false but delivery info/fee present!');
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
          // Check for specific backend exception messages if exposed (from Code B)
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
          // Enhanced error messages from Code A
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