import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../../service/sales/sales.service';
import { SharedOverlayModule } from '../../../../../shared-overlay.module';
import { SalesOrdersDetailComponent } from '../sales-orders-detail/sales-orders-detail.component';


export type OrderStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'PROCESSING' 
  | 'SHIPPED' 
  | 'DELIVERED' 
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  quoteId?: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  notes?: string;
  shippingAddress?: string;  
}

@Component({
  selector: 'app-sales-orders',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SharedOverlayModule, SalesOrdersDetailComponent],
  templateUrl: './sales-orders-list.component.html',
  styleUrls: ['./sales-orders-list.component.scss']
})
export class SalesOrdersListComponent implements OnInit, OnDestroy {

  protected readonly Math = Math;
  
  orders: SalesOrder[] = [];
  isLoading = true;
  selectedOrderIds: string[] = [];

  showOrderDetail = false;
  selectedOrderId?: string;
  
  // Filters
  filters = {
    status: 'ALL',
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    page: 0,
    size: 10
  };
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  // Stats
  stats = {
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0
  };
  
  statusOptions: { value: OrderStatus | 'ALL'; label: string; color: string }[] = [
    { value: 'ALL', label: 'All Orders', color: 'gray' },
    { value: 'PENDING', label: 'Pending', color: 'yellow' },
    { value: 'CONFIRMED', label: 'Confirmed', color: 'blue' },
    { value: 'PROCESSING', label: 'Processing', color: 'indigo' },
    { value: 'SHIPPED', label: 'Shipped', color: 'cyan' },
    { value: 'DELIVERED', label: 'Delivered', color: 'green' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'red' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private salesService: SalesService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    this.isLoading = true;
    
    this.salesService.getSalesOrders(this.filters).subscribe({
      next: (response: any) => {
        this.orders = response.data;
        this.totalElements = response.total;
        this.totalPages = Math.ceil(response.total / this.filters.size);
        this.calculateStats();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading orders:', error);
        this.setMockOrders();
        this.calculateStats();
        this.isLoading = false;
      }
    });
  }

  private calculateStats(): void {
    const delivered = this.orders.filter(o => o.status === 'DELIVERED');
    const cancelled = this.orders.filter(o => o.status === 'CANCELLED');
    const revenue = delivered.reduce((sum, o) => sum + o.totalAmount, 0);
    
    this.stats = {
      total: this.orders.length,
      pending: this.orders.filter(o => o.status === 'PENDING').length,
      processing: this.orders.filter(o => o.status === 'PROCESSING' || o.status === 'CONFIRMED').length,
      shipped: this.orders.filter(o => o.status === 'SHIPPED').length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      totalRevenue: revenue
    };
  }

  applyFilters(): void {
    this.filters.page = 0;
    this.loadOrders();
  }

  resetFilters(): void {
    this.filters = {
      status: 'ALL',
      searchTerm: '',
      dateFrom: '',
      dateTo: '',
      page: 0,
      size: 10
    };
    this.loadOrders();
  }

  onPageChange(page: number): void {
    this.filters.page = page;
    this.loadOrders();
  }

  onPageSizeChange(size: number): void {
    this.filters.size = size;
    this.filters.page = 0;
    this.loadOrders();
  }

  toggleSelection(orderId: string, event: any): void {
    if (event.target.checked) {
      this.selectedOrderIds.push(orderId);
    } else {
      this.selectedOrderIds = this.selectedOrderIds.filter(id => id !== orderId);
    }
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedOrderIds = this.orders.map(o => o.id);
    } else {
      this.selectedOrderIds = [];
    }
  }

  isSelected(orderId: string): boolean {
    return this.selectedOrderIds.includes(orderId);
  }

  isAllSelected(): boolean {
    return this.orders.length > 0 && this.selectedOrderIds.length === this.orders.length;
  }

  getStatusBadgeClass(status: OrderStatus): string {
    const classes: Record<OrderStatus, string> = {
      'PENDING': 'status-pending',
      'CONFIRMED': 'status-confirmed',
      'PROCESSING': 'status-processing',
      'SHIPPED': 'status-shipped',
      'DELIVERED': 'status-delivered',
      'CANCELLED': 'status-cancelled'
    };
    return classes[status] || 'status-pending';
  }

  getStatusLabel(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      'PENDING': 'Pending',
      'CONFIRMED': 'Confirmed',
      'PROCESSING': 'Processing',
      'SHIPPED': 'Shipped',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  getStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      'PENDING': '#f59e0b',
      'CONFIRMED': '#3b82f6',
      'PROCESSING': '#6366f1',
      'SHIPPED': '#06b6d4',
      'DELIVERED': '#22c55e',
      'CANCELLED': '#ef4444'
    };
    return colors[status] || '#6c757d';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  }

  // ✅ FIXED: Accept Date | undefined
  formatDate(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(date: Date | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ✅ FIXED: Accept Date | undefined
  isOverdue(deliveryDate: Date | undefined): boolean {
    if (!deliveryDate) return false;
    const today = new Date();
    const delivery = new Date(deliveryDate);
    return delivery < today && delivery.toDateString() !== today.toDateString();
  }

  viewOrder(orderId: string): void {
    this.openOrderDetail(orderId);
  }

  openOrderDetail(orderId: string): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/orders', orderId, uuid]);
    } else {
      this.router.navigate(['/admin/sales/orders', orderId]);
    }
  }

  closeOrderDetail(): void {
    this.showOrderDetail = false;
    this.selectedOrderId = undefined;
    this.loadOrders();
  }

  deleteOrder(order: SalesOrder): void {
    if (confirm(`Delete order ${order.orderNumber}? This action cannot be undone.`)) {
      this.salesService.deleteSalesOrder(order.id).subscribe({
        next: () => {
          alert(`Order ${order.orderNumber} deleted successfully`);
          this.loadOrders();
        },
        error: (error) => console.error('Error deleting order:', error)
      });
    }
  }

  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);
    
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    
    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  processOrder(order: SalesOrder): void {
    if (confirm(`Process order ${order.orderNumber}?`)) {
      this.salesService.updateSalesOrder(order.id, { status: 'PROCESSING' }).subscribe({
        next: () => {
          alert(`Order ${order.orderNumber} is now processing`);
          this.loadOrders();
        },
        error: (error) => console.error('Error processing order:', error)
      });
    }
  }

  shipOrder(order: SalesOrder): void {
    if (confirm(`Ship order ${order.orderNumber}?`)) {
      this.salesService.updateSalesOrder(order.id, { status: 'SHIPPED' }).subscribe({
        next: () => {
          alert(`Order ${order.orderNumber} has been shipped`);
          this.loadOrders();
        },
        error: (error) => console.error('Error shipping order:', error)
      });
    }
  }

  deliverOrder(order: SalesOrder): void {
    if (confirm(`Mark order ${order.orderNumber} as delivered?`)) {
      this.salesService.updateSalesOrder(order.id, { status: 'DELIVERED', actualDeliveryDate: new Date() }).subscribe({
        next: () => {
          alert(`Order ${order.orderNumber} has been delivered`);
          this.loadOrders();
        },
        error: (error) => console.error('Error delivering order:', error)
      });
    }
  }

  // Mock data for development
  private setMockOrders(): void {
    this.orders = [
      {
        id: '1',
        orderNumber: 'SO-001',
        customerId: 'CUST-001',
        customerName: 'Mama Nkechi Enterprises',
        items: [
          { id: 'i1', productId: 'P1', productName: 'Executive Office Chair', description: 'Ergonomic chair', quantity: 10, unitPrice: 50000, discount: 0, total: 500000 }
        ],
        subtotal: 500000,
        taxAmount: 37500,
        discountAmount: 0,
        totalAmount: 537500,
        currency: 'NGN',
        status: 'DELIVERED',
        orderDate: new Date('2026-06-10'),
        expectedDeliveryDate: new Date('2026-06-20'),
        actualDeliveryDate: new Date('2026-06-18'),
        shippingAddress: 'Lagos, Nigeria'
      },
      {
        id: '2',
        orderNumber: 'SO-002',
        customerId: 'CUST-002',
        customerName: 'Tech Solutions Ltd',
        items: [
          { id: 'i2', productId: 'P2', productName: 'Laptop - Dell XPS', description: 'Dell XPS 13', quantity: 1, unitPrice: 850000, discount: 0, total: 850000 }
        ],
        subtotal: 850000,
        taxAmount: 63750,
        discountAmount: 0,
        totalAmount: 913750,
        currency: 'NGN',
        status: 'SHIPPED',
        orderDate: new Date('2026-06-09'),
        expectedDeliveryDate: new Date('2026-06-25'),
        shippingAddress: 'Abuja, Nigeria'
      },
      {
        id: '3',
        orderNumber: 'SO-003',
        customerId: 'CUST-003',
        customerName: 'Global Services NG',
        items: [
          { id: 'i3', productId: 'P3', productName: 'Printer - HP LaserJet', description: 'HP printer', quantity: 2, unitPrice: 150000, discount: 0, total: 300000 }
        ],
        subtotal: 300000,
        taxAmount: 22500,
        discountAmount: 0,
        totalAmount: 322500,
        currency: 'NGN',
        status: 'PROCESSING',
        orderDate: new Date('2026-06-08'),
        expectedDeliveryDate: new Date('2026-06-28'),
        shippingAddress: 'Port Harcourt, Nigeria'
      },
      {
        id: '4',
        orderNumber: 'SO-004',
        customerId: 'CUST-004',
        customerName: 'Aliko Dangote Wholesale',
        items: [
          { id: 'i4', productId: 'P4', productName: 'Conference Table', description: 'Large conference table', quantity: 2, unitPrice: 250000, discount: 0, total: 500000 }
        ],
        subtotal: 500000,
        taxAmount: 37500,
        discountAmount: 0,
        totalAmount: 537500,
        currency: 'NGN',
        status: 'PENDING',
        orderDate: new Date('2026-06-07'),
        expectedDeliveryDate: new Date('2026-06-30'),
        shippingAddress: 'Kano, Nigeria'
      },
      {
        id: '5',
        orderNumber: 'SO-005',
        customerId: 'CUST-005',
        customerName: 'Obinna Electronics',
        items: [
          { id: 'i5', productId: 'P5', productName: 'Office Chairs', description: 'Standard office chairs', quantity: 15, unitPrice: 40000, discount: 0, total: 600000 }
        ],
        subtotal: 600000,
        taxAmount: 45000,
        discountAmount: 0,
        totalAmount: 645000,
        currency: 'NGN',
        status: 'CANCELLED',
        orderDate: new Date('2026-06-01'),
        expectedDeliveryDate: new Date('2026-06-15'),
        shippingAddress: 'Onitsha, Nigeria'
      }
    ];
    this.totalElements = this.orders.length;
    this.totalPages = 1;
  }
}