import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';

export interface GuestOrder {
  id: string;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryMethod: string;
  paymentMethod: string;
  deliveryInfo?: any;
  orderDate: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed';
}

@Injectable({
  providedIn: 'root'
})
export class GuestOrderService {
  private ordersKey = 'guest_orders';
  private currentOrderKey = 'current_guest_order';

  constructor() {}

  // Save order to localStorage
  saveOrder(order: GuestOrder): void {
    // Get existing orders
    const existingOrders = this.getOrders();
    
    // Add new order
    existingOrders.push(order);
    
    // Save back to localStorage
    localStorage.setItem(this.ordersKey, JSON.stringify(existingOrders));
    
    // Also save as current order for immediate access
    localStorage.setItem(this.currentOrderKey, JSON.stringify(order));
  }

  // Get all orders from localStorage
  getOrders(): GuestOrder[] {
    const ordersJson = localStorage.getItem(this.ordersKey);
    return ordersJson ? JSON.parse(ordersJson) : [];
  }

  // Get specific order by ID
  getOrder(orderId: string): GuestOrder | null {
    const orders = this.getOrders();
    return orders.find(order => order.id === orderId) || null;
  }

  // Get the most recent order (for confirmation page)
  getCurrentOrder(): GuestOrder | null {
    const orderJson = localStorage.getItem(this.currentOrderKey);
    return orderJson ? JSON.parse(orderJson) : null;
  }

  // Clear current order (after confirmation)
  clearCurrentOrder(): void {
    localStorage.removeItem(this.currentOrderKey);
  }

  // Update order status
  updateOrderStatus(orderId: string, status: GuestOrder['status']): void {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex !== -1) {
      orders[orderIndex].status = status;
      localStorage.setItem(this.ordersKey, JSON.stringify(orders));
    }
  }

  // Generate a unique order ID for guests
  generateOrderId(): string {
    return `GUEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}