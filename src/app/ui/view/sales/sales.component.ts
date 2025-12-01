import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CheckoutService } from '../../service/checkout.service';
import { MetadataService } from '../../service/metadata.service';
import { Router } from '@angular/router';
import { Order } from '../../models/interface';
import { StoreOrderService } from '../../service/store-order.service'; // NEW IMPORT

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss'],
})
export class SalesComponent implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  paginatedOrders: Order[] = [];
  searchText: string = '';
  statusFilter: string = 'ALL';
  daysFilter: number = 1; // Default to Today (1 day)
  sortBy: string = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';
  isViewPageOpen: boolean = false;
  activeOrder: Order = {} as Order;
  selectedCashier: string = 'All';
  isLoading: boolean = true;
  
  // New properties for date range filtering
  dateRangeOptions = [
    { value: 1, label: 'Today' },
    { value: 3, label: 'Last 3 Days' },
    { value: 7, label: 'Last Week' },
    { value: 30, label: 'Last Month' },
    { value: 0, label: 'All Time' }
  ];
  selectedDateRange: number = 1; // Default to Today
  customDaysFilter: number | null = null;

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  statusOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'PAID', label: 'Paid' },
    { value: 'UNPAID', label: 'Unpaid' },
    { value: 'PENDING', label: 'Pending' }
  ];

  cashiers: string[] = ['All', 'John', 'Ben', 'Winifred', 'Conrad'];

  constructor(
    private metadataService: MetadataService,
    private storeOrderService: StoreOrderService, // NEW INJECTION
    private router: Router
  ) { }
  
  ngOnInit(): void {
    this.loadOrders();
  }
  
  loadOrders(): void {
    this.isLoading = true;
    
    // CHANGED: Use the dedicated POS/Walk-in Orders API (general endpoint)
    this.storeOrderService.getPosOrders({}).subscribe({
      next: (orders) => {
         // Filter: Assuming POS/Walk-in orders do NOT have deliveryInfo set
         const posOrders = orders.filter((order: any) => !order.deliveryInfo);

         this.orders = posOrders;
         console.log('Sales: Loaded POS/Walk-in orders from dedicated API.');
         this.isLoading = false;
         this.applyFiltersAndSort();
      },
      error: (err: any) => {
         console.error('❌ Failed to load POS orders:', err);
         this.isLoading = false;
         // Handle error
      }
    });
  }
  
  // New methods for calculating tax and total with tax
  calculateOrderTax(order: Order): number {
    if (!order.orderItem || !order.orderItem.length) return 0;
    
    return order.orderItem.reduce((totalTax: number, item: any) => {
      const quantity = item.quantity || 0;
      const variantPrice = item.productVariant?.price;
      const productPrice = parseFloat(item.product?.sellingPrice || '0');
      const unitPrice = variantPrice || productPrice;
      
      const subtotal = unitPrice * quantity;
      const taxRate = item.product?.tax?.rate || 5; // Default 5% tax if none specified
      const itemTax = (taxRate / 100) * subtotal;
      
      return totalTax + itemTax;
    }, 0);
  }

  calculateOrderTotalWithTax(order: Order): number {
    const subtotal = order.totalAmount || 0;
    const tax = this.calculateOrderTax(order);
    return subtotal + tax;
  }
  
  // New methods for date range filtering
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
      this.selectedDateRange = -1; // Use a value not in the options to indicate custom
      this.applyFiltersAndSort();
    }
  }

  viewOrderDetails(order: Order): void {
    this.isViewPageOpen = true;
    this.activeOrder = { ...order }; // Create a copy to avoid reference issues
    console.log('Viewing order details:', this.activeOrder);
  }
  
  closeViewDetail(){
    this.isViewPageOpen = false;
    this.activeOrder = {} as Order;
  }
  
  applyFiltersAndSort(): void {
    // Reset to first page when filters change
    this.currentPage = 1;
    
    // Apply filters
    let filtered = [...this.orders];
    
    // Status filter
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.orderStatus === this.statusFilter);
    }
    
    // Days filter
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
    
    // Cashier filter
    if (this.selectedCashier && this.selectedCashier !== 'All') {
      filtered = filtered.filter(order => 
        order.salesperson?.name === this.selectedCashier
      );
    }
    
    // Search filter
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(searchLower)) ||
        (order.salesperson?.name && order.salesperson.name.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (this.sortBy) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'orderNumber':
          aValue = a.orderNumber;
          bValue = b.orderNumber;
          break;
        case 'customer':
          aValue = a.customer?.name || '';
          bValue = b.customer?.name || '';
          break;
        case 'totalAmount':
          aValue = a.totalAmount;
          bValue = b.totalAmount;
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
        case 'date':
          aValue = new Date(a.createdDate[0], a.createdDate[1] - 1, a.createdDate[2]).getTime();
          bValue = new Date(b.createdDate[0], b.createdDate[1] - 1, b.createdDate[2]).getTime();
          break;
        case 'salesperson':
          aValue = a.salesperson?.name || '';
          bValue = b.salesperson?.name || '';
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }
      
      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    this.filteredOrders = filtered;
    this.updatePagination();
  }
  
  // Pagination methods
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
    this.totalPages = Math.max(1, this.totalPages); // Ensure at least 1 page
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedOrders = this.filteredOrders.slice(startIndex, endIndex);
  }
  
  // PrimeNG pagination event handler
  onPageChange(event: any): void {
    this.currentPage = event.page + 1; // PrimeNG uses 0-based index
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
    const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
    return date.toLocaleString();
  }
  
  getSalespersonName(order: Order): string {
    return order.salesperson?.name || 'N/A';
  }

  // Add Math to template access
  get Math() {
    return Math;
  }
}