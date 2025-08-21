
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CheckoutService } from '../../service/checkout.service';
import { MetadataService } from '../../service/metadata.service';
import { Router } from '@angular/router';
import { Order } from '../../models/interface';

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
  daysFilter: number = 0; // 0 means no filter
  sortBy: string = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';
  isViewPageOpen: boolean = false;
  activeOrder: Order = {} as Order;
  selectedCashier: string = 'All';
  isLoading: boolean = true; // Add isLoading property
  
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
    private router: Router
  ) { }
  
  ngOnInit(): void {
    this.loadOrders();
  }
  
  loadOrders(): void {
    this.isLoading = true; // Set loading to true when starting to load orders
    this.metadataService.orders$.subscribe(orders => {
      this.orders = orders;
      console.log('Loaded orders:', orders);
      this.isLoading = false; // Set loading to false when orders are loaded
      this.applyFiltersAndSort();
    });
  }
  
  viewOrderDetails(order: Order): void {
    this.isViewPageOpen = true;
    this.activeOrder = order;
  }
  
  closeViewDetail(){
    this.isViewPageOpen = false;
    this.activeOrder = {} as Order;
  }
  
  // Add method for Today/All buttons
  setDaysFilter(days: number): void {
    this.daysFilter = days;
    this.applyFiltersAndSort();
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
          order.createdDate[0],
          order.createdDate[1] - 1,
          order.createdDate[2]
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
