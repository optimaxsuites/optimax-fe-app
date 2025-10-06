// guest-order.service.ts - UPDATED
import { Injectable } from '@angular/core';
import { GuestOrder, OrderStatus } from '../models/guest-order.interface';

@Injectable({
  providedIn: 'root'
})
export class GuestOrderService {
  private readonly STORAGE_KEY = 'guest_orders';

  saveOrder(order: GuestOrder): void {
    const orders = this.getOrders();
    orders.push(order);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
  }

  getOrders(): GuestOrder[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  getOrder(orderId: string): GuestOrder | undefined {
    const orders = this.getOrders();
    return orders.find(order => order.id === orderId);
  }

  updateOrderStatus(orderId: string, status: OrderStatus): void {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex > -1) {
      orders[orderIndex].status = status;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
    }
  }

  clearCurrentOrder(): void {
    // Keep order history but clear current session data if needed
  }

  generateOrderId(): string {
    return `GST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}