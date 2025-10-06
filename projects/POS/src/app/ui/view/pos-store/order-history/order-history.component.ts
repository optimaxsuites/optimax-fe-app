import { Component, OnInit } from '@angular/core';
import { GuestOrderService } from '../../../service/guest-order.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss']
})
export class OrderHistoryComponent implements OnInit {
  orders: any[] = [];
  reversedOrders: any[] = [];
  isLoading: boolean = true;

  constructor(
    private guestOrderService: GuestOrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.orders = this.guestOrderService.getOrders();
    this.reversedOrders = [...this.orders].reverse();
    this.isLoading = false;
  }

  // Helper methods to replace pipes
  formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      // month: 'medium',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPaymentMethod(method: string): string {
    return method.charAt(0).toUpperCase() + method.slice(1);
  }

  formatNumber(value: number): string {
    return value.toLocaleString('en-US');
  }

  formatProductName(name: string): string {
    if (!name) return 'Item';
    return name.length > 20 ? name.slice(0, 20) + '...' : name;
  }

  viewOrder(orderId: string): void {
    this.router.navigate(['/order-confirmation', orderId]);
  }

  goToStore(): void {
    this.router.navigate(['/store']);
  }

  clearOrders(): void {
    if (confirm('Are you sure you want to clear all order history?')) {
      localStorage.removeItem('guest_orders');
      this.orders = [];
      this.reversedOrders = [];
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}