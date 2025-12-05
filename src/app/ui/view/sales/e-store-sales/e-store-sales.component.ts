import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Order as ComponentOrder } from '../../../models/interface'; // Alias 'Order' from interface.ts as ComponentOrder
import { MetadataService } from '../../../service/metadata.service';
import { StoreOrderService } from '../../../service/store-order.service'; // Needed for cancelOrder and loadOrders
import { CancellationEvent } from '../sales-details/sales-details.component'; // Interface for the cancel event

@Component({
  selector: 'app-e-store-sales',
  templateUrl: './e-store-sales.component.html',
  styleUrls: ['./e-store-sales.component.scss'], 
})
export class EStoreSalesComponent implements OnInit {
  // Mirrored Properties
  orders: ComponentOrder[] = []; // Use ComponentOrder
  filteredOrders: ComponentOrder[] = []; // Use ComponentOrder
  paginatedOrders: ComponentOrder[] = []; // Use ComponentOrder
  searchText: string = '';
  statusFilter: string = 'ALL';
  daysFilter: number = 1; 
  sortBy: string = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';
  isViewPageOpen: boolean = false;
  activeOrder: ComponentOrder = {} as ComponentOrder; // Use ComponentOrder
  selectedCashier: string = 'All';
  isLoading: boolean = true;
  deliveryStatusFilter: string = 'ALL'; 

  // Delivery Status Options
  deliveryStatusOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PACKAGED', label: 'Packaged' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'FAILED', label: 'Failed Delivery' }
  ];

  // Rest of mirrored properties
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

  cashiers: string[] = ['All', 'John', 'Ben', 'Winifred', 'Conrad'];

  constructor(
    private metadataService: MetadataService,
    private storeOrderService: StoreOrderService, // Injected for cancellation logic and fetching
    private router: Router
  ) { }
  
  ngOnInit(): void {
    this.loadOrders();
  }
  
  loadOrders(): void {
    this.isLoading = true;
    
    // storeOrderService.getEStoreOrders now returns ComponentOrder[]
    this.storeOrderService.getEStoreOrders({}).subscribe({
      next: (orders: ComponentOrder[]) => { // Expect ComponentOrder[]
        this.orders = orders;
        console.log('EStoreSales: Loaded E-Store orders from dedicated API.');
        this.isLoading = false;
        this.applyFiltersAndSort();
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Failed to load E-Store orders:', err);
        this.isLoading = false;
        // Handle error (e.g., set an error flag)
      }
    });
  }
  
  handleCancellation(event: CancellationEvent): void {
    if (!event.orderId) {
      console.error('Cancellation failed: Order ID is missing.');
      return; 
    }

    this.storeOrderService.cancelOrder(
      event.orderId as number, 
      event.reason,
      event.chargeback
    ).subscribe({
      next: (res) => {
        console.log('Order cancelled successfully:', res);
        alert(`Order ${event.orderId} successfully cancelled.`);
        
        this.closeViewDetail();
        this.loadOrders(); 
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Failed to cancel order:', err);
        const message = typeof err.error === 'string' ? err.error : (err.message || 'Server Error');
        alert(`Cancellation Failed: ${message}`); 
      }
    });
  }


  applyFiltersAndSort(): void {
    this.currentPage = 1;
    let filtered = [...this.orders];
    
    // Order Status filter
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.orderStatus === this.statusFilter);
    }

    //  Delivery Status filter
    if (this.deliveryStatusFilter !== 'ALL') {
      filtered = filtered.filter(order => 
        (order.deliveryStatus || 'PENDING') === this.deliveryStatusFilter
      );
    }
    
    if (this.daysFilter > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.daysFilter);
      
      filtered = filtered.filter(order => {
        if (!order.createdDate || order.createdDate.length < 3) return false;
        
        const orderDate = new Date(
          Number(order.createdDate[0]),
          Number(order.createdDate[1]) - 1,
          Number(order.createdDate[2])
        );
        
        return orderDate >= cutoffDate;
      });
    }
    
    // 4. Cashier filter
    if (this.selectedCashier && this.selectedCashier !== 'All') {
      filtered = filtered.filter(order => 
        order.salesperson?.name === this.selectedCashier
      );
    }
    
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(searchLower)) ||
        (order.salesperson?.name && order.salesperson.name.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply sorting (unchanged)
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.sortBy) {
        case 'id': 
        case 'orderNumber': aValue = a.orderNumber; bValue = b.orderNumber; break;
        case 'customer': aValue = a.customer?.name || ''; bValue = b.customer?.name || ''; break;
        case 'totalAmount': aValue = a.totalAmount; bValue = b.totalAmount; break;
        // Tax/TotalWithTax are calculated fields, logic is fine as long as orderItem exists
        case 'tax': aValue = this.calculateOrderTax(a); bValue = this.calculateOrderTax(b); break;
        case 'totalWithTax': aValue = this.calculateOrderTotalWithTax(a); bValue = this.calculateOrderTotalWithTax(b); break;
        case 'orderStatus': aValue = a.orderStatus; bValue = b.orderStatus; break;
        case 'date': 
          aValue = new Date(a.createdDate[0], a.createdDate[1] - 1, a.createdDate[2]).getTime(); 
          bValue = new Date(b.createdDate[0], b.createdDate[1] - 1, b.createdDate[2]).getTime(); 
          break;
        case 'salesperson': aValue = a.salesperson?.name || ''; bValue = b.salesperson?.name || ''; break;
        default: aValue = a.orderNumber; bValue = b.orderNumber; // Fallback to orderNumber (string)
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }
      
      if (aValue < bValue) { return this.sortDirection === 'asc' ? -1 : 1; }
      if (aValue > bValue) { return this.sortDirection === 'asc' ? 1 : -1; }
      return 0;
    });
    
    this.filteredOrders = filtered;
    this.updatePagination();
  }

  calculateOrderTax(order: ComponentOrder): number {
    if (!order.orderItem || !order.orderItem.length) return 0;
    
    return order.orderItem.reduce((totalTax: number, item: any) => {
      const quantity = item.quantity || 0;
      const variantPrice = item.productVariant?.price;
      const productPrice = parseFloat(item.product?.sellingPrice || '0') || item.product?.price || 0; // Fallback to product.price
      const unitPrice = variantPrice || productPrice;
      
      const subtotal = unitPrice * quantity;
      const taxRate = item.product?.tax?.rate || 5; 
      const itemTax = (taxRate / 100) * subtotal;
      
      return totalTax + itemTax;
    }, 0);
  }

  calculateOrderTotalWithTax(order: ComponentOrder): number {
    const subtotal = order.totalAmount || 0;
    const tax = this.calculateOrderTax(order);
    return subtotal + tax;
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
    this.isViewPageOpen = true;
    this.activeOrder = { ...order }; 
    console.log('Viewing order details:', this.activeOrder);
  }
  
  closeViewDetail(){
    this.isViewPageOpen = false;
    this.activeOrder = {} as ComponentOrder;
  }
  
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
    this.totalPages = Math.max(1, this.totalPages); 
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedOrders = this.filteredOrders.slice(startIndex, endIndex);
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
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndSort();
  }
  
  getSortIcon(column: string): string {
    if (this.sortBy !== column) {
      return 'fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }
  
  formatDate(dateArray: any[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    const [year, month, day, hour, minute, second] = dateArray;
    // month is 1-indexed in the array, Date constructor expects 0-indexed
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    return date.toLocaleString();
  }
  
  getSalespersonName(order: ComponentOrder): string {
    return order.salesperson?.name || 'N/A';
  }

  get Math() {
    return Math;
  }
}