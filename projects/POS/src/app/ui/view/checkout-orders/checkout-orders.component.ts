import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Order } from '../../models/interface';
import { RegisterService } from '../../service/register.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { MetadataService } from '../../service/metadata.service';
import { OfflineService } from '../../service/offline.service';
import { firstValueFrom, Observable } from 'rxjs';

@Component({
  selector: 'app-checkout-orders',
  templateUrl: './checkout-orders.component.html',
  styleUrls: ['./checkout-orders.component.scss'],
})
export class CheckoutOrdersComponent implements OnInit {
  allOrders: Order[] = [];
  filteredOrders: Order[] = [];
  statusFilter: string = 'ALL';
  groupedOrders: Array<{ key: string; label: string; items: any[] }> = [];
   showOfflineRecord: boolean = false;
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
  
  // pagination - using PrimeNG's built-in pagination
  rowsPerPage = 15;

  statusOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'PAID', label: 'Paid' },
    { value: 'UNPAID', label: 'Unpaid' },
    { value: 'PENDING', label: 'Pending' }
  ];

  offlineRecords$:any[] =[];

  
  // filters
  daysFilter = 1; // Default to Today
  searchText = '';
  activeFilter: 'today' | 'all' | 'custom' = 'today';
  isLoading = true;

  dateFrom!: string;
  dateTo!: string;

  constructor(
    private router: Router,
    public navigationLink: NavigationLinksService,
    private registerService: RegisterService,
    private metadataService: MetadataService,
    private offlineService: OfflineService
  ) {}

  async ngOnInit(): Promise<void> {
    if(navigator.onLine){
    this.metadataService.fetchMetaData();
    this.metadataService.orders$.subscribe((data: Order[]) => {
      this.allOrders = Array.isArray(data) ? [...data] : [];
      this.applyFilters();
    });
  }else{
    this.showOfflineRecord = true
  }

   this.offlineRecords$ = await firstValueFrom(this.offlineService.getPendingPayments())
   console.log(this.offlineRecords$)
  
    this.setRangeToToday();
    this.isLoading = false;



  }

  // New methods for date range filtering
  onDateRangeChange(): void {
    if (this.selectedDateRange !== null) {
      if (this.selectedDateRange === 0) {
        this.showAllOrders();
      } else if (this.selectedDateRange === 1) {
        this.setRangeToToday();
      } else {
        this.daysFilter = this.selectedDateRange;
        this.customDaysFilter = null;
        this.activeFilter = 'custom';
        this.applyFilters();
      }
    }
  }

  onCustomDaysChange(): void {
    if (this.customDaysFilter !== null && this.customDaysFilter > 0) {
      this.daysFilter = this.customDaysFilter;
      this.selectedDateRange = -1; // Use a value not in the options to indicate custom
      this.activeFilter = 'custom';
      this.applyFilters();
    }
  }

  setRangeToToday(): void {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date();   end.setHours(23, 59, 59, 999);
    this.dateFrom = start.toISOString();
    this.dateTo = end.toISOString();
    this.daysFilter = 1;
    this.selectedDateRange = 1;
    this.customDaysFilter = null;
    this.activeFilter = 'today';
    this.applyFilters();
  }

  showAllOrders(): void {
    this.dateFrom = '1970-01-01T00:00:00.000Z';
    this.dateTo = new Date().toISOString();
    this.daysFilter = 0;
    this.selectedDateRange = 0;
    this.customDaysFilter = null;
    this.activeFilter = 'all';
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.allOrders];

    // Apply date filter
    if (this.daysFilter > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.daysFilter);
      filtered = filtered.filter(order => {
        const orderDate = this.formatDate(order.updatedAt);
        return orderDate && orderDate >= cutoffDate;
      });
    } else {
      const from = new Date(this.dateFrom).getTime();
      const to = new Date(this.dateTo).getTime();
      filtered = filtered.filter(o => {
        const d = this.formatDate(o.updatedAt);
        if (!d) return false;
        const t = d.getTime();
        return t >= from && t <= to;
      });
    }

    // Apply status filter
    if (this.statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.orderStatus === this.statusFilter);
    }

    // Apply search filter
    if (this.searchText) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber?.toLowerCase().includes(searchLower) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(searchLower)) ||
        order.totalAmount?.toString().includes(searchLower)
      );
    }

    this.filteredOrders = filtered;
  }
  
  get isGroupedView(): boolean {
    return this.activeFilter === 'all' && !this.daysFilter && !this.dateFrom && !this.dateTo;
  }
  
  formatDate(parts: any): Date | null {
    if (!parts) return null;
    if (Array.isArray(parts)) return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
    if (typeof parts === 'string' || parts instanceof Date) {
      const d = new Date(parts);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  reOpenCart(order: Order) {
    const checkoutLink = this.navigationLink.getLink('checkoutLink');
    this.router.navigate([checkoutLink], { state: { order } });
  }
  
  orderDetails(order: Order) {
    const detailsLink = this.navigationLink.getLink('orderDetails');
    this.router.navigate([detailsLink], { state: { order } });
  }
  
  closeRegister() {
    this.registerService.triggerCloseRegister();
  }
}