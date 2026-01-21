import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CheckoutService } from '../../service/checkout.service';
import { MetadataService } from '../../service/metadata.service';
import { Router } from '@angular/router';
import { Order } from '../../models/interface';
import { StoreOrderService, OrderDTO } from '../../service/store-order.service'; 
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

interface OrderWithSalesType extends Order {
  salesType: 'ONLINE' | 'IN-STORE';
  isOnline: boolean;
  cashierId?: number;
}

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss'],
})
export class SalesComponent implements OnInit {
  orders: OrderWithSalesType[] = [];
  filteredOrders: OrderWithSalesType[] = [];
  paginatedOrders: OrderWithSalesType[] = [];
  searchText: string = '';
  statusFilter: string = 'ALL';
  daysFilter: number = 1;
  sortBy: string = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';
  isViewPageOpen: boolean = false;
  activeOrder: OrderWithSalesType = {} as OrderWithSalesType;
  selectedCashier: string = 'All';
  selectedSalesType: string = 'ALL';
  isLoading: boolean = true;
  
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
    { value: 'PENDING', label: 'Pending' }
  ];

  salesTypeOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'IN-STORE', label: 'In-store' }
  ];

  cashiers: string[] = ['All', 'John', 'Ben', 'Winifred', 'Conrad'];

  constructor(
    private metadataService: MetadataService,
    private storeOrderService: StoreOrderService,
    private router: Router
  ) { }
  
  ngOnInit(): void {
    this.loadOrders();
  }
  
  loadOrders(): void {
    this.isLoading = true;

    this.storeOrderService.getAllOrdersAsOrderType({}).subscribe({
      next: (orders: Order[]) => {
        this.orders = orders.map(order => ({
          ...order,
          // Trust the isOnline flag from the fixed service
          salesType: (order as any).isOnline ? 'ONLINE' : 'IN-STORE',
          isOnline: (order as any).isOnline || false
        })) as OrderWithSalesType[];

        console.log(`Sales: Loaded ${this.orders.length} total orders`);
        this.isLoading = false;
        this.applyFiltersAndSort();
      },
      error: (err: any) => {
        console.error('❌ Failed to load orders:', err);
        this.isLoading = false;
      }
    });
  }
  
  getDisplaySalesType(order: OrderWithSalesType): string {
    return order.salesType === 'ONLINE' ? 'Online' : 'In-store';
  }
  
  getSalesTypeBadge(order: OrderWithSalesType): { text: string, class: string } {
    const displayType = this.getDisplaySalesType(order);
    if (displayType === 'Online') {
      return { text: 'Online', class: 'bg-green-100 text-green-800' };
    } else {
      return { text: 'In-store', class: 'bg-blue-100 text-blue-800' };
    }
  }
  
  calculateOrderTax(order: Order): number {
    // Use totalTax provided by backend
    // Calculate from taxSummary if totalTax is null
    const totalTax = (order as any).totalTax;
    if (totalTax !== null && totalTax !== undefined) {
      return totalTax;
    }
    
    // Fallback: sum up taxSummary array
    const taxSummary = (order as any).taxSummary || [];
    return taxSummary.reduce((sum: number, tax: any) => sum + (tax.value || 0), 0);
  }

  calculateOrderTotalWithTax(order: Order): number {
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

  viewOrderDetails(order: OrderWithSalesType): void {
    this.isViewPageOpen = true;
    this.activeOrder = { ...order };
  }
  
  closeViewDetail(){
    this.isViewPageOpen = false;
    this.activeOrder = {} as OrderWithSalesType;
  }
  
  applyFiltersAndSort(): void {
    this.currentPage = 1;
    
    let filtered = [...this.orders];
    
    // Status filter
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.orderStatus === this.statusFilter);
    }
    
    // Sales Type filter
    if (this.selectedSalesType && this.selectedSalesType !== 'ALL') {
      filtered = filtered.filter(order => {
        const displayType = this.getDisplaySalesType(order).toUpperCase();
        const filterType = this.selectedSalesType.toUpperCase();
        return displayType === filterType;
      });
    }
    
    // Date Logic
    if (this.daysFilter > 0) {
      const cutoffDate = new Date();
      // If today (1), subtract 0 days. If Week (7), subtract 6 days.
      const daysToSubtract = this.daysFilter === 1 ? 0 : this.daysFilter;
      
      cutoffDate.setDate(cutoffDate.getDate() - daysToSubtract);
      cutoffDate.setHours(0, 0, 0, 0); // Start of that day
      
      filtered = filtered.filter(order => {
        // Include orders with null createdDate
        if (!order.createdDate || order.createdDate.length < 3) return true;
        
        // Month is 0-indexed in JS Date, but stored as 1-based in Array
        const orderDate = new Date(
          Number(order.createdDate[0]),
          Number(order.createdDate[1]) - 1, 
          Number(order.createdDate[2]),
          Number(order.createdDate[3] || 0),
          Number(order.createdDate[4] || 0),
          Number(order.createdDate[5] || 0)
        );
        
        if (isNaN(orderDate.getTime())) return false;

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
      filtered = filtered.filter(order => {
        if (order.orderNumber?.toLowerCase().includes(searchLower)) return true;
        if (order.customer?.name?.toLowerCase().includes(searchLower)) return true;
        if (order.salesperson?.name?.toLowerCase().includes(searchLower)) return true;
        const displayType = this.getDisplaySalesType(order).toLowerCase();
        if (displayType.includes(searchLower)) return true;
        return false;
      });
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.sortBy) {
        case 'id':
          aValue = a.id; bValue = b.id; break;
        case 'orderNumber':
          aValue = a.orderNumber; bValue = b.orderNumber; break;
        case 'customer':
          aValue = a.customer?.name || ''; bValue = b.customer?.name || ''; break;
        case 'salesperson':
          aValue = a.salesperson?.name || ''; bValue = b.salesperson?.name || ''; break;
        case 'salesType':
          aValue = this.getDisplaySalesType(a); bValue = this.getDisplaySalesType(b); break;
        case 'totalAmount':
          aValue = a.totalAmount; bValue = b.totalAmount; break;
        case 'tax':
          aValue = this.calculateOrderTax(a); bValue = this.calculateOrderTax(b); break;
        case 'totalWithTax':
          aValue = this.calculateOrderTotalWithTax(a); bValue = this.calculateOrderTotalWithTax(b); break;
        case 'orderStatus':
          aValue = a.orderStatus; bValue = b.orderStatus; break;
        case 'date':
          aValue = new Date(a.createdDate[0], a.createdDate[1] - 1, a.createdDate[2]).getTime();
          bValue = new Date(b.createdDate[0], b.createdDate[1] - 1, b.createdDate[2]).getTime();
          break;
        default:
          aValue = a.id; bValue = b.id;
      }
      
      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    this.filteredOrders = filtered;
    this.updatePagination();
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
    if (this.sortBy !== column) return 'fa-sort';
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

  get Math() {
    return Math;
  }
}