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
  searchText: string = '';
  statusFilter: string = 'ALL';
  sortBy: string = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';
  isViewPageOpen: boolean = false;
  activeOrder: Order = {} as Order;
  selectedCashier!: string; 
  selectedSummary!: string;
  statusOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'PAID', label: 'Paid' },
    { value: 'UNPAID', label: 'Unpaid' },
    { value: 'PENDING', label: 'Pending' }
  ];

  summaryOptions: string[] = [
    'Today',
    'Yesterday',
    'This Week',
    'Last Week',
    'This Month',
    'Last Month',
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
    this.metadataService.orders$.subscribe(orders => {
      this.orders = orders;
      console.log(orders);
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
  
  applyFiltersAndSort(): void {
    // Apply filters
    let filtered = [...this.orders];
    
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.orderStatus === this.statusFilter);
    }
    
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.customer.name.toLowerCase().includes(searchLower) ||
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
          aValue = a.customer.name;
          bValue = b.customer.name;
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
}