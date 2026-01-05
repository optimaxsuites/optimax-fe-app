import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Order as ComponentOrder } from '../../../models/interface'; 
import { MetadataService } from '../../../service/metadata.service';
import { StoreOrderService } from '../../../service/store-order.service'; 
import { CancellationEvent } from '../sales-details/sales-details.component'; 
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-e-store-sales',
  templateUrl: './e-store-sales.component.html',
  styleUrls: ['./e-store-sales.component.scss'], 
})
export class EStoreSalesComponent implements OnInit, OnDestroy {
  orders: ComponentOrder[] = []; 
  filteredOrders: ComponentOrder[] = []; 
  paginatedOrders: ComponentOrder[] = []; 
  searchText: string = '';
  statusFilter: string = 'ALL';
  daysFilter: number = 1;
  sortBy: string = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';
  isViewPageOpen: boolean = false;
  activeOrder: ComponentOrder = {} as ComponentOrder; 
  
  // Renamed from selectedCashier to selectedSalesperson
  selectedSalesperson: string = 'All';
  isLoading: boolean = true;
  deliveryStatusFilter: string = 'ALL'; 
  errorMessage: string = '';
  
  currentBranchId: number = 1;
  private destroy$ = new Subject<void>();

  deliveryStatusOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'AWAITING_PAYMENT', label: 'Awaiting Payment' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PACKAGED', label: 'Packaged' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'FAILED', label: 'Failed Delivery' }
  ];

  dateRangeOptions = [
    { value: 1, label: 'Today' },
    { value: 3, label: 'Last 3 Days' },
    { value: 7, label: 'Last Week' },
    { value: 30, label: 'Last Month' },
    { value: 0, label: 'All Time' }
  ];
  selectedDateRange: number = 1; 
  customDaysFilter: number | null = null;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  statusOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'PAID', label: 'Paid' },
    { value: 'UNPAID', label: 'Unpaid' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  // Dynamic list instead of hardcoded
  salespersons: string[] = ['All'];

  constructor(
    private metadataService: MetadataService,
    private storeOrderService: StoreOrderService,
    private router: Router
  ) { }
  
  ngOnInit(): void {
    this.metadataService.selectedBranchId$
      .pipe(takeUntil(this.destroy$))
      .subscribe((branchId) => {
        if (branchId) {
          this.currentBranchId = branchId;
          console.log('🏪 Branch changed to:', branchId);
          this.loadOrders();
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadOrders(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('📦 Loading E-Store orders for branch:', this.currentBranchId);
    
    this.storeOrderService.getEStoreOrders({ 
      branchId: this.currentBranchId,
      page: 1,
      size: 100 
    }).subscribe({
      next: (orders: ComponentOrder[]) => { 
        console.log(`✅ Successfully loaded ${orders.length} E-Store orders`);
        
        this.orders = orders;
        
        // Populate the dynamic salesperson dropdown
        this.extractSalespersons(orders);

        this.isLoading = false;
        this.applyFiltersAndSort();
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Failed to load E-Store orders:', err);
        
        if (err.status === 401) {
          this.errorMessage = 'Authentication failed. Please log in again.';
        } else if (err.status === 403) {
          this.errorMessage = 'You do not have permission to view these orders.';
        } else if (err.status === 404) {
          this.errorMessage = 'E-Store orders endpoint not found. Please contact support.';
        } else if (err.status === 0) {
          this.errorMessage = 'Cannot connect to server. Please check your internet connection.';
        } else {
          this.errorMessage = typeof err.error === 'string' 
            ? err.error 
            : 'Failed to load orders. Please try again.';
        }
        
        this.isLoading = false;
        this.orders = [];
        this.filteredOrders = [];
      }
    });
  }

  // NEW: Helper to extract unique admin names
  extractSalespersons(orders: ComponentOrder[]): void {
    const admins = new Set<string>();
    orders.forEach(o => {
      // Only add if it's not null, not undefined, and not the default 'System' if you want to exclude it
      if (o.updatedBy && o.updatedBy !== 'System' && o.updatedBy !== 'N/A') {
        admins.add(o.updatedBy);
      }
    });
    // Always keep 'All' at the top, then sort the rest
    this.salespersons = ['All', ...Array.from(admins).sort()];
  }
  
  handleCancellation(event: CancellationEvent): void {
    if (!event.orderId) {
      alert('Error: Order ID is missing');
      return;
    }

    // 1. Find the full order object. 
    // We check activeOrder (if detail view is open) or find it in the list.
    let orderToCancel: ComponentOrder | undefined;

    if (this.isViewPageOpen && this.activeOrder && this.activeOrder.id == event.orderId) {
        orderToCancel = this.activeOrder;
    } else {
        orderToCancel = this.orders.find(o => o.id == event.orderId);
    }

    if (!orderToCancel) {
        console.error('Order object not found for ID:', event.orderId);
        alert('Internal Error: Could not find order details to process cancellation.');
        return;
    }

    // 2. Pass the FULL order object to the service
    this.storeOrderService.cancelOrder(orderToCancel, event.reason, event.chargeback)
      .subscribe({
        next: (res) => {
          alert(`Order ${event.orderId} successfully cancelled.`);
          this.closeViewDetail();
          this.loadOrders(); 
        },
        error: (err: HttpErrorResponse) => {
          console.error('Cancellation Error:', err);
          const message = typeof err.error === 'string' ? err.error : (err.message || 'Server Error');
          
          // Helper for field validation errors
          if (err.error && err.error.fieldErrors) {
             const fields = err.error.fieldErrors.map((f: any) => f.field).join(', ');
             alert(`Validation Failed: Missing fields (${fields})`);
          } else {
             alert(`Cancellation Failed: ${message}`);
          }
        }
      });
  }

  applyFiltersAndSort(): void {
    this.currentPage = 1;
    let filtered = [...this.orders];
    
    console.log('🔍 Applying filters:', {
      total: filtered.length,
      statusFilter: this.statusFilter,
      deliveryStatusFilter: this.deliveryStatusFilter,
      daysFilter: this.daysFilter,
      searchText: this.searchText,
      selectedSalesperson: this.selectedSalesperson
    });
    
    // Filter by order status
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.orderStatus === this.statusFilter);
      console.log(`  → After status filter: ${filtered.length} orders`);
    }
    
    // Filter by delivery status
    if (this.deliveryStatusFilter !== 'ALL') {
      filtered = filtered.filter(order => 
        (order.deliveryStatus || 'PENDING') === this.deliveryStatusFilter
      );
      console.log(`  → After delivery status filter: ${filtered.length} orders`);
    }

    // NEW: Filter by Salesperson (Processed By)
    if (this.selectedSalesperson !== 'All') {
      filtered = filtered.filter(order => 
        order.updatedBy === this.selectedSalesperson
      );
      console.log(`  → After salesperson filter: ${filtered.length} orders`);
    }
    
    // Filter by date range
    if (this.daysFilter > 0) {
      const cutoffDate = new Date();
      if (this.daysFilter === 1) {
        // Today only
        cutoffDate.setHours(0, 0, 0, 0);
      } else {
        // Go back N days
        cutoffDate.setDate(cutoffDate.getDate() - this.daysFilter);
        cutoffDate.setHours(0, 0, 0, 0);
      }
      
      filtered = filtered.filter(order => {
        if (!order.createdDate || !Array.isArray(order.createdDate) || order.createdDate.length < 3) {
          return false;
        }
        
        const orderDate = new Date(
          order.createdDate[0],
          order.createdDate[1] - 1,
          order.createdDate[2],
          order.createdDate[3] || 0,
          order.createdDate[4] || 0,
          order.createdDate[5] || 0
        );
        
        return orderDate >= cutoffDate;
      });
      console.log(`  → After date filter (${this.daysFilter} days): ${filtered.length} orders`);
    }
    
    // Search filter - Updated to check delivery name too
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        (this.getCustomerName(order).toLowerCase().includes(searchLower)) ||
        (order.customer?.email && order.customer.email.toLowerCase().includes(searchLower)) ||
        (order.customer?.phoneNumber && order.customer.phoneNumber.toLowerCase().includes(searchLower))
      );
      console.log(`  → After search filter: ${filtered.length} orders`);
    }
    
    // Sort orders
    filtered = this.sortOrders(filtered);
    
    console.log(`✅ Final filtered result: ${filtered.length} orders`);
    
    this.filteredOrders = filtered;
    this.updatePagination();
  }


  private sortOrders(orders: ComponentOrder[]): ComponentOrder[] {
    return orders.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.sortBy) {
        case 'id':
        case 'orderNumber':
          aValue = a.orderNumber;
          bValue = b.orderNumber;
          break;
          
        case 'customer':
          // Updated sorting to use new customer name logic
          aValue = this.getCustomerName(a);
          bValue = this.getCustomerName(b);
          break;
          
        case 'totalAmount':
          aValue = a.totalAmount || 0;
          bValue = b.totalAmount || 0;
          break;
          
        case 'tax':
          aValue = this.calculateOrderTax(a);
          bValue = this.calculateOrderTax(b);
          break;
          
        case 'totalWithTax':
          aValue = this.calculateOrderTotalWithTax(a);
          bValue = this.calculateOrderTotalWithTax(b);
          break;
          
        case 'orderStatus':
          aValue = a.orderStatus;
          bValue = b.orderStatus;
          break;
          
        case 'deliveryStatus':
          aValue = a.deliveryStatus || 'N/A';
          bValue = b.deliveryStatus || 'N/A';
          break;

        case 'salesperson':
          aValue = this.getSalespersonName(a);
          bValue = this.getSalespersonName(b);
          break;
          
        case 'date':
        default:
          // Convert date arrays to timestamps for proper sorting
          aValue = this.getOrderTimestamp(a);
          bValue = this.getOrderTimestamp(b);
          break;
      }
      
      // Perform comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }
      
      // Numeric comparison
      if (aValue < bValue) { 
        return this.sortDirection === 'asc' ? -1 : 1; 
      }
      if (aValue > bValue) { 
        return this.sortDirection === 'asc' ? 1 : -1; 
      }
      return 0;
    });
  }

 
  private getOrderTimestamp(order: ComponentOrder): number {
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
    return 0;
  }

  calculateOrderTax(order: ComponentOrder): number {
    if (!order.orderItem || !order.orderItem.length) return 0;
    return order.orderItem.reduce((totalTax: number, item: any) => {
      const quantity = item.quantity || 0;
      const variantPrice = item.productVariant?.price;
      const productPrice = parseFloat(item.product?.sellingPrice || '0') || item.product?.price || 0; 
      const unitPrice = variantPrice || productPrice;
      const subtotal = unitPrice * quantity;
      const taxRate = item.product?.tax?.rate || 5; 
      return totalTax + ((taxRate / 100) * subtotal);
    }, 0);
  }

  calculateOrderTotalWithTax(order: ComponentOrder): number {
    return (order.totalAmount || 0) + this.calculateOrderTax(order);
  }
  
  onDateRangeChange(): void {
    if (this.selectedDateRange !== null) {
      this.daysFilter = this.selectedDateRange;
      this.customDaysFilter = null;
      this.applyFiltersAndSort();
    }
  }

  onCustomDaysChange(): void {
    if (this.customDaysFilter !== null && this.customDaysFilter > 0) {
      this.daysFilter = this.customDaysFilter;
      this.selectedDateRange = -1; 
      this.applyFiltersAndSort();
    }
  }

  viewOrderDetails(order: ComponentOrder): void {
    console.log('👁️ Viewing order:', order.orderNumber);
    this.isViewPageOpen = true;
    this.activeOrder = { ...order }; 
  }
  
  closeViewDetail(): void {
    this.isViewPageOpen = false;
    this.activeOrder = {} as ComponentOrder;
  }
  
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
    this.totalPages = Math.max(1, this.totalPages); 
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedOrders = this.filteredOrders.slice(startIndex, endIndex);
    
    console.log('📄 Pagination:', {
      currentPage: this.currentPage,
      itemsPerPage: this.itemsPerPage,
      totalPages: this.totalPages,
      showing: this.paginatedOrders.length,
      total: this.filteredOrders.length
    });
  }
  
  onPageChange(event: any): void {
    this.currentPage = event.page + 1; 
    this.itemsPerPage = event.rows;
    this.updatePagination();
  }
  
  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }
  
  sort(column: string): void {
    console.log('🔄 Sorting by:', column);
    
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = column === 'date' ? 'desc' : 'asc'; // Default to desc for dates
    }
    
    this.applyFiltersAndSort();
  }
  
  getSortIcon(column: string): string {
    return this.sortBy !== column 
      ? 'fa-sort' 
      : (this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
  }
  
  formatDate(dateArray: any[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    const [year, month, day, hour, minute, second] = dateArray;
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    
    // Format: Dec 16, 2025 2:30 PM
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  // UPDATED: Show 'System' for pending, otherwise the Admin Name
  getSalespersonName(order: ComponentOrder): string {
    if (order.updatedBy && order.updatedBy !== 'System') {
        return order.updatedBy;
    }
    return 'System'; // Or 'Pending Assignment'
  }

  // UPDATED: Prioritize Delivery Name for E-Store Orders
  getCustomerName(order: ComponentOrder): string {
    // 1. Check Delivery Info (This is the online shopper's name)
    if (order.deliveryInfo && order.deliveryInfo.fullName) {
        return order.deliveryInfo.fullName;
    }
    
    // 2. Check Customer Profile (exclude 'Walk-in')
    if (order.customer && order.customer.name && order.customer.name.toLowerCase() !== 'walk-in') {
        return order.customer.name;
    }
    
    // 3. Fallback
    return order.name || 'Guest'; 
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

  getStatusBadgeClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'PAID': 'badge-success',
      'UNPAID': 'badge-warning',
      'PENDING': 'badge-info',
      'CANCELLED': 'badge-danger'
    };
    return classMap[status] || 'badge-secondary';
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

  get Math() {
    return Math;
  }
}