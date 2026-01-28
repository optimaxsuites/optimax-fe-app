import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, from, of } from 'rxjs';
import { catchError, switchMap, tap, map } from 'rxjs/operators';
import { environment } from '../sharedComponent/service/environments/environment';
import { PaystackService, PaystackPaymentData } from './paystack.service';
import { StoreCustomerService } from './store-customer.service';
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
  deliveryMethod?: string;
  deliveryFee?: number;
  paymentId?: number;
  deliveryInfoId?: number;
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
  deliverTypeId?: number | null; 
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
    private paystackService: PaystackService,
    private storeCustomerService: StoreCustomerService
  ) {}

  calculateTaxes(orderItems: StoreOrderItemPOST[], products: Map<string, any>): TaxCalculation {
    const taxBreakdown: TaxBreakdownItem[] = [];
    let subtotal = 0;
    let taxAmount = 0;
    
    const taxGroups = new Map<number, { rate: number; name: string; taxableAmount: number }>();
    
    orderItems.forEach(item => {
      const product = products.get(item.productId.toString());
      const itemTotal = item.totalPrice || (product?.sellingPrice * item.quantity);
      subtotal += itemTotal;
      
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

    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  private getCurrentUser(): string {
    const sessionUserInfo = sessionStorage.getItem('userPrimaryInfoRegData');
    if (sessionUserInfo) {
      try {
        const parsed = JSON.parse(sessionUserInfo);
        if (parsed.fullname) return parsed.fullname;
      } catch (e) {
        console.warn('Error parsing userPrimaryInfoRegData', e);
      }
    }

    const sessionUsername = sessionStorage.getItem('username');
    if (sessionUsername) return sessionUsername;

    const localUser = localStorage.getItem('user') || localStorage.getItem('currentUser');
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        return parsed.name || parsed.username || 'Admin';
      } catch (e) {
        return localUser; 
      }
    }
    return 'System';
  }

  getAllOrdersAsOrderType(filters?: any): Observable<ComponentOrder[]> {
    const params = this.buildQueryParams(filters || {});
    const endpoint = '/x/api/v2/pos/orders';

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
      catchError(this.handleError)
    );
  }

  getAllOrders(filters?: any): Observable<ComponentOrder[]> {
    return this.getAllOrdersAsOrderType(filters);
  }

  getEStoreOrders(filters?: any): Observable<ComponentOrder[]> {
    const branchId = filters?.branchId;
    
    let params = new HttpParams()
      .set('isOnline', 'true')
      .set('page', (filters?.page || 1).toString())
      .set('size', (filters?.size || 10).toString());

    const endpoint = `/x/api/v2/pos/orders/get/order/from/eStore/${branchId}`;
    
    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { 
        params: params,
        headers: this.getHeaders()
      }
    ).pipe(
      map((orderDTOs: OrderDTO[]) => {
        if (!Array.isArray(orderDTOs)) return [];

        const orders = orderDTOs.map(dto => this.convertOrderDTOToComponentOrder(dto));

        const filteredOrders = orders.filter(order => {
          const customerName = (order.customer?.name || order.name || '').toLowerCase();
          if (customerName === 'walk-in') return false;
          
          const hasOnlineFlag = order.isOnline === true;
          const hasDeliveryInfo = order.deliveryInfo != null;
          const isPickup = (order as any).deliveryFee === 0 || order.deliveryMethod === 'PICKUP';
          
          if (!hasOnlineFlag && !hasDeliveryInfo && !isPickup) return false;
          return true;
        });

        return this.sortOrdersByDate(filteredOrders);
      }),
      catchError(this.handleError)
    );
  }

  private sortOrdersByDate(orders: ComponentOrder[]): ComponentOrder[] {
    return orders.sort((a, b) => {
      const timeA = this.getTimestampFromOrder(a);
      const timeB = this.getTimestampFromOrder(b);
      return timeB - timeA;
    });
  }

  private getTimestampFromOrder(order: ComponentOrder): number {
    if (Array.isArray(order.createdDate) && order.createdDate.length >= 3) {
      return new Date(
        order.createdDate[0], 
        order.createdDate[1] - 1, 
        order.createdDate[2], 
        order.createdDate[3] || 0, 
        order.createdDate[4] || 0, 
        order.createdDate[5] || 0
      ).getTime();
    }
    
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
    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { params: params, headers: this.getHeaders() }
    ).pipe(
      map((orders: OrderDTO[]) => {
        const posOrders = orders.filter(order => !order.isOnline);
        posOrders.forEach(order => { order.isOnline = false; });
        return posOrders;
      }),
      catchError(this.handleError)
    );
  }

  getOrdersByStatus(orderStatus: string, filters?: any): Observable<OrderDTO[]> {
    const params = this.buildQueryParams(filters || {});
    const endpoint = `/x/api/v2/pos/orders/get/by/orderstatus/${orderStatus}`;
    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { params: params, headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  getOrdersByBranch(branchId: number, filters?: any): Observable<OrderDTO[]> {
    const params = this.buildQueryParams(filters || {});
    const endpoint = `/x/api/v2/pos/orders/get/by/branch/id/${branchId}`;
    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { params: params, headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  getOrderById(orderId: number): Observable<OrderDTO> {
    const endpoint = `/x/api/v2/pos/orders/${orderId}`;
    return this.http.get<OrderDTO>(
      this.getBaseApiUrl() + endpoint,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  getOrdersByOrderNumber(orderNumber: string): Observable<OrderDTO[]> {
    const endpoint = `/x/api/v2/pos/orders/get/by/orderNumer?orderNumber=${orderNumber}`;
    return this.http.get<OrderDTO[]>(
      this.getBaseApiUrl() + endpoint,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  getPaymentKeys(): Observable<PaymentKey[]> {
    if (this.paymentKeysCache) {
      return of(this.paymentKeysCache);
    }
    const endpoint = '/x/api/v2/pos/paymentKeyss';
    return this.http.get<PaymentKey[]>(
      this.getBaseApiUrl() + endpoint,
      { headers: this.getHeaders() }
    ).pipe(
      tap((keys) => { this.paymentKeysCache = keys; }),
      catchError((error) => of([]))
    );
  }

  getPublicKeyForBranch(branchId: number = 1): Observable<string> {
    return this.getPaymentKeys().pipe(
      map((keys: PaymentKey[]) => {
        const key = keys.find(k => k.branchId === branchId) || keys[0];
        if (!key) throw new Error('No payment keys available');
        return key.publicKey;
      }),
      catchError((error) => throwError(() => new Error('Unable to retrieve payment key')))
    );
  }

  isPaystackAvailable(branchId: number = 1): Observable<boolean> {
    return this.getPaymentKeys().pipe(
      map((keys: PaymentKey[]) => {
        const key = keys.find(k => k.branchId === branchId) || keys[0];
        return !!key && !!key.publicKey;
      }),
      catchError(() => of(false))
    );
  }

  processPaystackPayment(email: string, amount: number, orderNumber: string, branchId: number = 1): Observable<any> {
    return this.getPublicKeyForBranch(branchId).pipe(
      switchMap((publicKey: string) => {
        this.paystackService.setPublicKey(publicKey);
        const paymentData: PaystackPaymentData = {
          email: email,
          amount: amount,
          reference: this.paystackService.generateReference(),
          metadata: {
            custom_fields: [{ display_name: 'Order Number', variable_name: 'order_number', value: orderNumber }]
          }
        };
        return from(this.paystackService.processPayment(paymentData));
      }),
      catchError((error) => throwError(() => 'Payment service unavailable. Please use cash or bank transfer.'))
    );
  }

  createOrderWithPayment(
    orderData: StoreOrderPOST,
    paymentMethod: string,
    paymentReference: string,
    deliveryInfo?: any,
    customerInfo?: any, 
  ): Observable<any> {
    const isDeliveryType = orderData.deliverTypeId === 1 || orderData.deliveryTypeId === 1;
    const isPickup = !deliveryInfo || !isDeliveryType;
    const initialDeliveryStatus = 'PENDING';

    const baseOrder: StoreOrderPOST = {
        ...orderData,
        deliveryStatus: initialDeliveryStatus
    };
    
    return this.createPaymentRecord(
      baseOrder.totalAmount,
      baseOrder.orderNumber,
      paymentMethod === 'card' ? 'PAID' : 'PENDING',
      this.mapPaymentMethod(paymentMethod),
      paymentReference
    ).pipe(
      switchMap((paymentResponse: any) => {
        const paymentId = paymentResponse.id;
        if (!paymentId || paymentId === 0) throw new Error('Payment record creation failed');

        // Orchestrate Customer Resolution -> Delivery Info -> Finalize Order
        // Only skip resolution if a valid registered customerId (> 1) explicitly passed
        const customerObs = (baseOrder.customerId && baseOrder.customerId > 1)
          ? of(baseOrder.customerId)
          : this.resolveOrderCustomer(customerInfo);

        return customerObs.pipe(
          switchMap((customerId: number) => {
            const orderWithPayment = {
              ...baseOrder,
              paymentId: paymentId,
              customerId: customerId,
              orderStatus: paymentMethod === 'card' ? 'PAID' : 'PENDING'
            };

            if (deliveryInfo && !isPickup) {
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
                  return this.finalizeOrderCreation(orderWithDelivery);
                }),
                catchError((error) => {
                  console.error('❌ Delivery info creation failed:', error);
                  return throwError(() => 'Failed to create delivery information');
                })
              );
            } else {
              return this.finalizeOrderCreation(orderWithPayment);
            }
          })
        );
      }),
      catchError((error) => {
        console.error('❌ Order creation with payment failed:', error);
        return this.handleError(error);
      })
    );
  }

  /**
   * Resolves a Customer ID for the order.
   * If customerInfo matches an existing record, it returns that ID.
   * Otherwise, it creates a new record. This replaces the default ID 1 fallback.
   */
  private resolveOrderCustomer(customerInfo: any): Observable<number> {
    // If absolutely no info (rare), create a generic Guest record
    if (!customerInfo || (!customerInfo.email && !customerInfo.phoneNumber)) {
      console.log('⚠️ No specific customer info provided, creating/finding generic Guest record...');
      customerInfo = { name: 'Guest Customer', email: 'guest@example.com', phoneNumber: '0000000000' };
    }

    const email = customerInfo.email?.trim();
    const phone = customerInfo.phoneNumber?.trim();
    const name = customerInfo.name?.trim() || 'Guest Customer';

    console.log('🔍 Resolving order identity for:', { name, email, phone });

    // 1. Try finding by phone
    // DIRECT CREATE STRATEGY (As requested)
    // We skip lookups (get/by/phone, get/by/email) and directly attempt to create/map the customer.
    // This assumes the backend 'create' endpoint handles checking or is the primary path.
    
    const finalPhone = phone || '0000000000';
    console.log('🆕 Creating/Mapping POS identity record (Direct)...', { name, email, phone: finalPhone });

    return this.storeCustomerService.createCustomer({
      name: name,
      email: email || '',
      phoneNumber: finalPhone,
      loyaltyPoints: 0
    }).pipe(
      map(res => {
        const newId = this.extractIdFromResponse(res);
        console.log('✅ POS identity record created/mapped with ID:', newId);
        return newId;
      }),
      catchError(err => {
        console.error('❌ Failed to create POS identity (Raw API Error):', err);
        return throwError(() => err);
      })
    );
  }

  createCashOrder(orderData: StoreOrderPOST, deliveryInfo?: any, customerInfo?: any): Observable<any> {
    return this.createOrderWithPayment(orderData, 'cash', `CASH-${orderData.orderNumber}`, deliveryInfo, customerInfo);
  }

  updateOrder(order: ComponentOrder, updateData: Partial<OrderUpdateDTO>): Observable<OrderDTO> {
    const endpoint = `/x/api/v2/pos/orders`;
    const completeOrderPayload = this.buildCompleteOrderPayload(order, updateData);
    console.log('🔄 Updating order payload:', completeOrderPayload);

    return this.http.post<OrderDTO>(
      this.getBaseApiUrl() + endpoint,
      completeOrderPayload,
      { headers: this.getHeaders() }
    ).pipe(catchError(error => this.handleError(error)));
  }

  updateDeliveryStatus(order: ComponentOrder, status: string, currentUser: string): Observable<OrderDTO> {
    const isPickupOrder = this.isPickupOrder(order);
    let orderStatus = order.orderStatus;
    let backendStatus = status;

    // Map Frontend Labels to Backend Enums
    if (status === 'READY_FOR_PICKUP') {
        backendStatus = 'OUT_FOR_DELIVERY';
    } else if (status === 'PICKED_UP') {
        backendStatus = 'DELIVERED';
    }

    // CRITICAL FIX: Ensure payment exists before proceeding
    const hasValidPayment = (order.payment && order.payment.id && order.payment.id > 0) || 
                            ((order as any).paymentId && (order as any).paymentId > 0);

    // If no payment exists and order isn't already PAID, create a payment record first
    if (!hasValidPayment && order.orderStatus !== 'PAID') {
      console.warn('⚠️ No payment record exists. Creating payment record first...');
      
      // Create payment record before updating status
      return this.createPaymentRecord(
        order.totalAmount.toString(),
        order.orderNumber,
        'PENDING',
        'CASH',
        `CASH-${order.orderNumber}-${Date.now()}`
      ).pipe(
        switchMap((paymentResponse: any) => {
          const paymentId = paymentResponse.id;
          console.log('✅ Payment record created with ID:', paymentId);
          
          // Update order object with payment ID
          (order as any).paymentId = paymentId;
          if (!order.payment) {
            order.payment = {
              id: paymentId,
              totalAmount: order.totalAmount,
              transactionDate: new Date().toISOString(),
              status: 'PENDING',
              paymentBreakdown: []
            };
          }
          
          // Now proceed with status update
          return this.performStatusUpdate(order, backendStatus, orderStatus, isPickupOrder, currentUser, hasValidPayment || paymentId > 0);
        }),
        catchError((error) => {
          console.error('❌ Failed to create payment record:', error);
          return throwError(() => 'Failed to create payment record before status update');
        })
      );
    }

    // Proceed with normal status update if payment exists
    return this.performStatusUpdate(order, backendStatus, orderStatus, isPickupOrder, currentUser, hasValidPayment);
  }

  private performStatusUpdate(
    order: ComponentOrder,
    backendStatus: string,
    orderStatus: string,
    isPickupOrder: boolean,
    currentUser: string,
    hasValidPayment: boolean
  ): Observable<OrderDTO> {
    
    // Apply Rules for Order Status
    let validOrderStatus: string = 'PENDING';
    
    if (isPickupOrder) {
      if (backendStatus === 'OUT_FOR_DELIVERY') { // Frontend: READY_FOR_PICKUP
         // Use READY instead of PROCESSING (which is invalid)
         validOrderStatus = 'READY'; 
      } else if (backendStatus === 'DELIVERED') { // Frontend: PICKED_UP
         if (hasValidPayment) {
            validOrderStatus = 'PAID';
            console.log('✅ Pickup completed & Payment exists - Status set to PAID');
         } else {
            console.warn('⚠️ Pickup completed but NO PAYMENT RECORD found.');
            validOrderStatus = 'UNPAID';
         }
      } else if (backendStatus === 'CANCELLED') {
         validOrderStatus = 'CANCELLED';
      }
    } else {
      // Delivery Logic
      if (backendStatus === 'DELIVERED') {
        if (hasValidPayment) {
           validOrderStatus = 'PAID';
        } else {
           console.warn('⚠️ Delivery completed but NO PAYMENT RECORD found.');
           validOrderStatus = 'UNPAID';
        }
      } else if (backendStatus === 'CANCELLED') {
        validOrderStatus = 'CANCELLED';
      } else if (backendStatus === 'PENDING') {
        validOrderStatus = 'PENDING';
      } else if (backendStatus === 'PROCESSING') {
        // Map PROCESSING to PREPARING (valid backend enum)
        validOrderStatus = 'PREPARING';
      }
    }

    const payload: OrderUpdateDTO = {
      id: order.id,
      orderNumber: order.orderNumber,
      deliveryStatus: backendStatus,
      orderStatus: validOrderStatus as any,
      updatedBy: currentUser,
      totalAmount: order.totalAmount,
      quantity: this.calculateQuantity(order),
      customerId: order.customer?.id,
      branchId: order.branch?.id,
      isOnline: order.isOnline,
      createdDate: this.formatDateForBackend(order.createdDate)
    };
  
    return this.updateOrder(order, payload);
  }

  cancelOrder(order: ComponentOrder, reason: string, requireChargeback: boolean): Observable<OrderDTO> {
    const currentUser = this.getCurrentUser();

    const payload: OrderUpdateDTO = {
      id: order.id, 
      orderNumber: order.orderNumber,
      orderStatus: 'CANCELLED',
      cancellationReason: reason,
      processChargeback: requireChargeback,
      totalAmount: order.totalAmount,
      quantity: this.calculateQuantity(order), 
      deliveryStatus: 'CANCELLED',
      customerId: order.customer?.id,
      branchId: order.branch?.id,
      customerEmail: order.customer?.email,
      updatedBy: currentUser,
      isOnline: order.isOnline,
      createdDate: this.formatDateForBackend(order.createdDate)
    };
    
    console.log(`Cancelling order with Admin: ${currentUser}`, payload);
    return this.updateOrder(order, payload);
  }

  private buildCompleteOrderPayload(order: ComponentOrder, updates: Partial<OrderUpdateDTO>): any {
    const getValidId = (id: any) => (id && id > 0) ? id : null;
    
    // Ensure we always have a valid payment ID
    let paymentId = getValidId(updates.paymentId || order.payment?.id || (order as any).paymentId);
    
    // If no payment ID and order is PAID or being marked as PAID, this is an error
    if (!paymentId && (order.orderStatus === 'PAID' || updates.orderStatus === 'PAID')) {
      console.error('❌ CRITICAL: Attempting to mark order as PAID without payment ID');
      paymentId = null; 
    }
    
    const rawDeliveryId = order.deliveryInfo?.id || (order as any).deliveryInfoId;
    const deliveryInfoId = getValidId(rawDeliveryId);

    let deliveryStatus = updates.deliveryStatus || order.deliveryStatus;
    
    if (deliveryStatus === 'READY_FOR_PICKUP') deliveryStatus = 'OUT_FOR_DELIVERY';
    if (deliveryStatus === 'PICKED_UP') deliveryStatus = 'DELIVERED';
    if (!deliveryStatus) deliveryStatus = 'PENDING';

    return {
      id: Number(order.id) || 0, 
      orderNumber: order.orderNumber,
      orderStatus: updates.orderStatus || order.orderStatus,
      deliveryStatus: deliveryStatus, 
      updatedBy: updates.updatedBy ? updates.updatedBy : (order.updatedBy || 'System'),
      totalAmount: updates.totalAmount || order.totalAmount,
      quantity: this.calculateQuantity(order),
      customerId: order.customer?.id || 1,
      branchId: order.branch?.id || (order as any).branchId,
      paymentId: paymentId, 
      deliveryInfoId: deliveryInfoId,
      isOnline: order.isOnline,
      createdDate: this.formatDateForBackend(order.createdDate),
      orderItem: (order.orderItem || []).map((item: any) => ({
        id: item.id || 0,
        totalPrice: item.totalPrice || 0,
        quantity: item.quantity || 1,
        productId: item.product?.id || item.productId || 0,
        productVariantId: item.productVariant?.id || item.productVariantId || null,
        orderId: Number(order.id) || 0
      }))
    };
  }

  private calculateQuantity(order: ComponentOrder): number {
    if (order.orderItem && order.orderItem.length > 0) {
      return order.orderItem.reduce((acc: any, item: { quantity: any; }) => acc + (item.quantity || 0), 0);
    }
    return 1; 
  }

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
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    }
    return params;
  }

  private parseDateToArray(dateInput: any): number[] {
    if (!dateInput) return [0, 0, 0, 0, 0, 0];
    if (Array.isArray(dateInput)) return [dateInput[0]||0, dateInput[1]||0, dateInput[2]||0, dateInput[3]||0, dateInput[4]||0, dateInput[5]||0];
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return [0, 0, 0, 0, 0, 0];
      return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
    } catch { return [0, 0, 0, 0, 0, 0]; }
  }

  private isPickupOrder(order: ComponentOrder | OrderDTO): boolean {
    const hasNoDeliveryInfo = !order.deliveryInfo;
    const isPickupType = (order as any).deliverTypeId === 2 || (order as any).deliveryTypeId === 2;
    const isPickupMethod = order.deliveryMethod === 'PICKUP';
    
    // An order is a pickup if it has no delivery info OR is explicitly marked as pickup
    return hasNoDeliveryInfo || isPickupType || isPickupMethod;
  }

  private convertOrderDTOToComponentOrder(orderDTO: OrderDTO): ComponentOrder {
    const createdDateArray = this.parseDateToArray(orderDTO.createdDate);
    const totalAmountNum = orderDTO.totalAmount || 0;
    
    let isOnline = orderDTO.isOnline === true;
    if (!isOnline && orderDTO.deliveryInfo) isOnline = true;

    const isPickup = this.isPickupOrder(orderDTO);
    
    let orderStatus = orderDTO.orderStatus || 'PENDING';
    let deliveryStatus = orderDTO.deliveryStatus || 'PENDING';
    
    if (isOnline && isPickup) {
      if (deliveryStatus === 'OUT_FOR_DELIVERY') {
        deliveryStatus = 'READY_FOR_PICKUP';
        //  Cannot show as PENDING if ready for pickup
        if (orderStatus === 'PENDING') {
          orderStatus = 'PROCESSING';
        }
      } else if (deliveryStatus === 'DELIVERED') {
        deliveryStatus = 'PICKED_UP';
        // STRICT RULE: Must be PAID when picked up
        orderStatus = 'PAID';
      }
    } else if (isOnline) {
      deliveryStatus = orderDTO.deliveryStatus || 'PENDING';
    } else {
      deliveryStatus = 'N/A';
    }

    // Payment Status Consistency
    let payment = orderDTO.payment;
    if (orderStatus === 'PAID') {
        if (!payment || !payment.id || payment.id === 0) {
            // Create virtual payment object
            payment = {
                id: (orderDTO as any).paymentId || 0,
                totalAmount: totalAmountNum,
                transactionDate: orderDTO.updatedAt || new Date().toISOString(),
                status: 'PAID',
                paymentBreakdown: []
            };
        } else {
            payment = { ...payment, status: 'PAID' };
        }
    }

    // UpdatedBy persistence and priority
    let updatedBy = 'System';
    
    // Priority 1: updatedBy field (most recent update)
    if (orderDTO.updatedBy && orderDTO.updatedBy.trim() !== '' && orderDTO.updatedBy !== 'System') {
        updatedBy = orderDTO.updatedBy;
    } 
    // Priority 2: salesperson (original creator/processor)
    else if (orderDTO.salesperson?.name && orderDTO.salesperson.name !== 'System') {
        updatedBy = orderDTO.salesperson.name;
    }

    return {
      id: (orderDTO.id) ? orderDTO.id.toString() : orderDTO.orderNumber,
      orderNumber: orderDTO.orderNumber, 
      orderStatus: orderStatus,
      updatedAt: orderDTO.updatedAt,
      createdDate: createdDateArray,
      totalAmount: totalAmountNum,
      salesperson: orderDTO.salesperson || null,
      branch: orderDTO.branch || null,
      orderItem: orderDTO.orderItem || [],
      customer: orderDTO.customer || null,
      isOnline: isOnline,
      payment: payment || null,
      amountTendered: totalAmountNum,
      status: orderStatus,
      deliveryStatus: deliveryStatus,
      deliveryInfo: orderDTO.deliveryInfo || null,
      amount: totalAmountNum, 
      timestamp: createdDateArray,
      name: orderDTO.customer?.name || 'Walk-in',
      cartDiscount: 0,
      state: 'COMPLETED', 
      total: totalAmountNum,
      cart: [], 
      deliveryMethod: isPickup ? 'PICKUP' : 'DELIVERY',
      updatedBy: updatedBy,
      deliveryFee: orderDTO.deliveryFee,
      taxSummary: (orderDTO as any).taxSummary || [],
      totalTax: (orderDTO as any).totalTax || 0
    };
  }

  public createPaymentRecord(totalAmount: string, orderNumber: string, status: string, method: string, reference: string): Observable<any> {
    const amount = parseFloat(totalAmount);
    const paymentData = { 
      status, 
      method, 
      amount, 
      totalAmount: amount, 
      transactionDate: new Date().toISOString(), 
      reference, 
      paymentReference: reference 
    };
    
    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/payments',
      paymentData,
      { headers: this.getHeaders() }
    ).pipe(
      map((response) => ({ 
        id: this.extractIdFromResponse(response), 
        originalResponse: response 
      })), 
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
    
    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/deliveryinfo',
      deliveryData,
      { headers: this.getHeaders() }
    ).pipe(
      map((response) => ({ 
        id: this.extractIdFromResponse(response), 
        originalResponse: response 
      })), 
      catchError(this.handleError)
    );
  }

  private finalizeOrderCreation(orderData: StoreOrderPOST): Observable<any> {
    const sanitizedOrderData = this.sanitizeOrderData(orderData);
    if (sanitizedOrderData.deliveryFee > 0 || sanitizedOrderData.deliveryInfoId) {
      sanitizedOrderData.isOnline = true;
    }
    console.log('🚀 [StoreOrderService] Sending Order Payload to Backend:', JSON.stringify(sanitizedOrderData, null, 2));
    
    return this.http.post<any>(
      this.getBaseApiUrl() + '/x/api/v2/pos/orders',
      sanitizedOrderData,
      { headers: this.getHeaders() }
    ).pipe(catchError(this.handleError));
  }

  private sanitizeOrderData(orderData: StoreOrderPOST): any {
    let status = orderData.deliveryStatus || 'PENDING';
    
    if (status === 'READY_FOR_PICKUP') status = 'PENDING';
    if (status === 'PICKED_UP') status = 'DELIVERED';

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
      customerId: orderData.customerId,
      branchId: orderData.branchId,
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
      deliveryTypeId: (orderData.deliveryTypeId || orderData.deliverTypeId || (orderData.deliveryFee > 0 ? 1 : null)),
      deliveryStatus: status 
    };
  }

  private extractIdFromResponse(response: any): number {
    if (typeof response === 'number') return response;
    if (response && typeof response.id === 'number') return response.id;
    if (response) return Number(response) || 0;
    return 0;
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
      url: error.url,
      serverError: error.error 
    });
    
    let errorMessage = 'An unknown error occurred!';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      if (error.status === 400 && error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 500) {
        if (error.error?.message && error.error.message.includes('NullPointerException')) {
          errorMessage = 'System Error: Missing required data (payment record may be missing).';
        } else if (error.error?.message && error.error.message.includes('JSON parse error')) {
          errorMessage = 'System Error: Invalid status value sent to server.';
        } else {
          errorMessage = error.error?.message || 'Internal Server Error';
        }
      } else {
        errorMessage = error.error?.message || error.message || 'Server Error';
      }
    }
    
    console.error('📤 Throwing error:', errorMessage);
    return throwError(() => errorMessage);
  }
}