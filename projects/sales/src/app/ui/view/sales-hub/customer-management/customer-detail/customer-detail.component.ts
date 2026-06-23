// src/app/ui/view/sales-module/customer-detail/customer-detail.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer } from '../../../../domain/sales/sales.dto';
import { BackButtonComponent } from '../../../../shared-component/view/back-button/back-button.component';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BackButtonComponent],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.scss']
})
export class CustomerDetailComponent implements OnInit, OnDestroy {
  
  customer: Customer | null = null;
  isLoading = true;
  customerId: string = '';
  
  // UI State
  showDeleteConfirm = false;
  
  // Order history (mock)
  orderHistory: any[] = [];
  isLoadingOrders = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private salesService: SalesService
  ) {}

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('id') || '';
    if (this.customerId) {
      this.loadCustomer();
      this.loadOrderHistory();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCustomer(): void {
    this.isLoading = true;
    this.salesService.getCustomerById(this.customerId).subscribe({
      next: (customer: Customer | null) => {
        this.customer = customer;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading customer:', error);
        this.isLoading = false;
        alert('Failed to load customer. Please try again.');
        this.goBack();
      }
    });
  }

  private loadOrderHistory(): void {
    this.isLoadingOrders = true;
    // Mock data - replace with actual service call
    setTimeout(() => {
      this.orderHistory = [
        {
          id: 'ORD-001',
          date: new Date('2026-06-10'),
          total: 500000,
          status: 'COMPLETED',
          items: 3
        },
        {
          id: 'ORD-002',
          date: new Date('2026-06-05'),
          total: 1250000,
          status: 'PROCESSING',
          items: 2
        },
        {
          id: 'ORD-003',
          date: new Date('2026-05-28'),
          total: 350000,
          status: 'DELIVERED',
          items: 1
        }
      ];
      this.isLoadingOrders = false;
    }, 500);
  }

  editCustomer(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/customers', this.customerId, 'edit', uuid]);
    } else {
      this.router.navigate(['/admin/sales/customers', this.customerId, 'edit']);
    }
  }

  createQuote(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/quotes/new', uuid] : ['/admin/sales/quotes/new'];
    this.router.navigate(path, { queryParams: { customerId: this.customerId } });
  }

  createInvoice(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/invoices/new', uuid] : ['/admin/sales/invoices/new'];
    this.router.navigate(path, { queryParams: { customerId: this.customerId } });
  }

  deleteCustomer(): void {
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    // Call service to delete customer
    alert(`Customer ${this.customer?.name} has been deleted`);
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
    }
  }

  viewOrder(orderId: string): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/orders', orderId, uuid]);
    } else {
      this.router.navigate(['/admin/sales/orders', orderId]);
    }
  }

  goBack(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
    }
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'ACTIVE': 'status-active',
      'INACTIVE': 'status-inactive',
      'BLACKLISTED': 'status-blacklisted'
    };
    return classes[status] || 'status-active';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ACTIVE': 'Active',
      'INACTIVE': 'Inactive',
      'BLACKLISTED': 'Blacklisted'
    };
    return labels[status] || status;
  }

  getOrderStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'status-pending',
      'PROCESSING': 'status-processing',
      'SHIPPED': 'status-shipped',
      'DELIVERED': 'status-delivered',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  }

  getOrderStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Pending',
      'PROCESSING': 'Processing',
      'SHIPPED': 'Shipped',
      'DELIVERED': 'Delivered',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  formatCurrency(amount: number): string {
    const currency = 'NGN';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  formatDateShort(date: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getCustomerLifetimeValue(): number {
    return this.customer?.totalSpent || 0;
  }

  getAverageOrderValue(): number {
    if (!this.customer || this.customer.totalOrders === 0) return 0;
    return this.customer.totalSpent / this.customer.totalOrders;
  }

  getCustomerNotes(): string | undefined {
    return (this.customer as any)?.notes;
  }

  viewOrderHistory(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/sales-hub', uuid]);
    } else {
      this.router.navigate(['/admin/sales/sales-hub']);
    }
  }
}