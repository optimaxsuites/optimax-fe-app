import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StoreOrderService } from '../../../../service/store-order.service';
import { Order } from '../../../../models/interface';
import { HttpErrorResponse } from '@angular/common/http';
import { CancellationEvent } from '../../sales-details/sales-details.component';
import { MetadataService } from '../../../../service/metadata.service';

@Component({
  selector: 'app-estore-orders-list',
  templateUrl: './estore-orders-list.component.html',
  styleUrls: ['./estore-orders-list.component.scss']
})
export class EStoreOrdersListComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  isLoading = false;
  total = 0;
  selectedOrder: Order | undefined; 
  showDetails = false;
  errorMessage = '';

  filterForm: FormGroup;
  private destroy$ = new Subject<void>();
  currentBranchId: number = 1;

  dateRanges = [
    { label: 'Today', value: 1 },
    { label: 'Last 3 Days', value: 3 },
    { label: 'Last Week', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'All Time', value: 0 }, 
  ];

  statuses = [
    { label: 'All', value: 'ALL' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Unpaid', value: 'UNPAID' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Cancelled', value: 'CANCELLED' }, 
  ];

  deliveryStatuses = [
    { label: 'All', value: 'ALL' },
    { label: 'Awaiting Payment', value: 'AWAITING_PAYMENT' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Packaged', value: 'PACKAGED' },
    { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Failed', value: 'FAILED' },
  ];

  constructor(
    private fb: FormBuilder,
    private storeOrderService: StoreOrderService,
    private metadataService: MetadataService
  ) {
    this.filterForm = this.fb.group({
      dateRange: [0], // Default to All Time
      customDays: [null],
      status: ['ALL'],
      deliveryStatus: ['ALL'],
      search: [''],
      page: [0],
      size: [25]
    });
  }

  ngOnInit(): void {
    // Watch for branch changes
    this.metadataService.selectedBranchId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((branchId) => {
        if (branchId) {
          this.currentBranchId = branchId;
          console.log('🏪 Branch changed to:', branchId);
          this.loadOrders();
        }
      });

    // Watch for filter changes
    this.filterForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterForm.patchValue({ page: 0 }, { emitEvent: false });
        this.loadOrders();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    const formValues = this.filterForm.value;
    console.log('📦 Loading orders with filters:', formValues);

    this.storeOrderService.getEStoreOrders({ 
      branchId: this.currentBranchId,
      page: 1,
      size: 100 // Load more, filter client-side
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (allOrders: Order[]) => {
        console.log(`✅ Received ${allOrders.length} orders from service`);
        
        // Apply client-side filters
        let filtered = this.applyClientFilters(allOrders, formValues);
        
        console.log(`🔍 Filtered to ${filtered.length} orders`);
        
        this.orders = filtered;
        this.total = filtered.length;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Failed to load E-Store orders:', err);
        
        // Set user-friendly error message
        if (err.status === 401) {
          this.errorMessage = 'Authentication failed. Please log in again.';
        } else if (err.status === 403) {
          this.errorMessage = 'You do not have permission to view these orders.';
        } else if (err.status === 404) {
          this.errorMessage = 'Orders endpoint not found. Please contact support.';
        } else if (err.status === 0) {
          this.errorMessage = 'Cannot connect to server. Check your internet connection.';
        } else {
          this.errorMessage = typeof err.error === 'string' 
            ? err.error 
            : 'Failed to load orders. Please try again.';
        }
        
        this.orders = [];
        this.total = 0;
        this.isLoading = false;
      }
    });
  }

  private applyClientFilters(orders: Order[], filters: any): Order[] {
    let filtered = [...orders];

    // Filter by order status
    if (filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter(order => order.orderStatus === filters.status);
    }

    // Filter by delivery status
    if (filters.deliveryStatus && filters.deliveryStatus !== 'ALL') {
      filtered = filtered.filter(order => 
        (order.deliveryStatus || 'PENDING') === filters.deliveryStatus
      );
    }

    // Filter by date range
    if (filters.dateRange && filters.dateRange > 0) {
      const cutoffDate = new Date();
      if (filters.dateRange === 1) {
        // Today only
        cutoffDate.setHours(0, 0, 0, 0);
      } else {
        // Go back N days
        cutoffDate.setDate(cutoffDate.getDate() - filters.dateRange);
        cutoffDate.setHours(0, 0, 0, 0);
      }

      filtered = filtered.filter(order => {
        if (!order.createdDate || !Array.isArray(order.createdDate)) {
          return false;
        }

        const orderDate = new Date(
          order.createdDate[0],
          order.createdDate[1] - 1,
          order.createdDate[2]
        );
        
        return orderDate >= cutoffDate;
      });
    }

    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(searchLower)) ||
        (order.customer?.email && order.customer.email.toLowerCase().includes(searchLower)) ||
        (order.customer?.phoneNumber && order.customer.phoneNumber.includes(searchLower))
      );
    }

    return filtered;
  }

  formatCurrency(amount: number): string {
    if (amount == null) return '0.00';
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
  
  formatDate(dateArray: any[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    const [year, month, day, hour, minute, second] = dateArray;
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  viewOrderDetails(order: Order): void {
    console.log('👁️ Viewing order:', order.orderNumber);
    this.selectedOrder = order;
    this.showDetails = true;
  }

  goBackToOrders(): void {
    this.showDetails = false;
    this.selectedOrder = undefined;
  }
  
  handleCancellation(event: CancellationEvent): void {
    if (!event.orderId || !this.selectedOrder) {
      console.error('Cancellation failed: Order ID is missing.');
      alert('Error: Order ID is missing');
      return;
    }

    console.log('🚫 Cancelling order:', event.orderId);

    this.storeOrderService.cancelOrder(
      this.selectedOrder, 
      event.reason,
      event.chargeback
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        console.log('✅ Order cancelled successfully:', res);
        alert(`Order ${event.orderId} successfully cancelled.`);
        this.goBackToOrders();
        this.loadOrders(); // Reload to reflect changes
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Cancellation failed:', err);
        const message = typeof err.error === 'string' 
          ? err.error 
          : (err.message || 'Server Error');
        alert(`Cancellation Failed: ${message}`); 
      }
    });
  }

  onPageChange(pageIndex: number, pageSize: number): void {
    this.filterForm.patchValue({ 
      page: pageIndex, 
      size: pageSize 
    }, { emitEvent: false });
    
    // For now, we're loading all and filtering client-side
    // If you want true server-side pagination, adjust the service call
    console.log('📄 Page changed:', { pageIndex, pageSize });
  }

  /**
   * ✅ NEW: Get status badge class for styling
   */
  getStatusBadgeClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'PAID': 'badge-success',
      'UNPAID': 'badge-warning',
      'PENDING': 'badge-info',
      'CANCELLED': 'badge-danger'
    };
    return classMap[status] || 'badge-secondary';
  }

 
  getDeliveryStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'AWAITING_PAYMENT': 'Awaiting Payment',
      'PENDING': 'Pending',
      'PACKAGED': 'Packaged',
      'OUT_FOR_DELIVERY': 'Out for Delivery',
      'DELIVERED': 'Delivered',
      'FAILED': 'Failed',
      'N/A': 'N/A'
    };
    return statusMap[status] || status;
  }

  getDeliveryStatusBadgeClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'AWAITING_PAYMENT': 'badge-warning',
      'PENDING': 'badge-info',
      'PACKAGED': 'badge-primary',
      'OUT_FOR_DELIVERY': 'badge-info',
      'DELIVERED': 'badge-success',
      'FAILED': 'badge-danger',
      'N/A': 'badge-secondary'
    };
    return classMap[status] || 'badge-secondary';
  }

  retryLoad(): void {
    this.errorMessage = '';
    this.loadOrders();
  }
}