import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Order } from '../../models/interface';
import { RegisterService } from '../../service/register.service';
import { NavigationLinksService } from '../../sharedComponent/service/navigation-links/navigation-links.service';
import { MetadataService } from '../../service/metadata.service';
import { OfflineService } from '../../service/offline.service';
import { firstValueFrom, lastValueFrom, Observable } from 'rxjs';
import { CheckoutService } from '../../service/checkout.service';

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
  openOfflineOrder: boolean = false;
  selectedOrder: any = null
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
    private offlineService: OfflineService,
    private checkoutService: CheckoutService
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

  this.offlineService.getPendingPayments().subscribe((records) => {
      this.offlineRecords$ = records;
    })
   console.log(this.offlineRecords$)
  
    this.setRangeToToday();
    this.isLoading = false;
  }

  // Tax calculation methods (copied from sales component)
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

  toggleShowOfflineRecords(order?: any){
    console.log(order)
    this.openOfflineOrder = !this.openOfflineOrder
    this.selectedOrder = order
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
  if (this.activeFilter === 'today') {
    // For "today", use exact date range from midnight to end of day
    const from = new Date(this.dateFrom).getTime();
    const to = new Date(this.dateTo).getTime();
    filtered = filtered.filter(o => {
      const d = this.formatDate(o.updatedAt);
      if (!d) return false;
      const t = d.getTime();
      return t >= from && t <= to;
    });
  } else if (this.daysFilter > 0) {
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

filtered.sort((a, b) => {
  const dateA = this.formatDate(a.updatedAt);
  const dateB = this.formatDate(b.updatedAt);
  if (!dateA || !dateB) return 0;
  return dateB.getTime() - dateA.getTime(); ``
});

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
    console.log(order)
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

syncOrder(order?: any) {
  if (order) {
    this.offlineService.getPendingPayment(order.__dbKey).subscribe((payment) => {
      if (payment) {
        this.syncOfflinePayments([payment]); 
      }
    });
  } else {
    this.offlineService.getPendingPayments().subscribe((payments) => {
      if (payments.length > 0) {
        this.syncOfflinePayments(payments);
      }
    });
  }
}

  private async syncOfflinePayments(pendingPayment: any) {
      console.log("🌐 You are now online, preparing to sync...");
    
      await new Promise((resolve) => setTimeout(resolve, 3000));
    
      console.log("🔄 Syncing offline payments:", pendingPayment);

    const OUT_OF_STOCK_ERROR_MESSAGE = "Insuffient order to service your request..."; 
    
      for (const payment of pendingPayment) {
        const now = new Date().toISOString();
        const onlinePaymentPayload = {
          id: payment.id,
          totalAmount: payment.totalAmount,
          transactionDate: payment.transactionDate,
          status: payment.status,
        };
    
        this.checkoutService.makePayment(onlinePaymentPayload).subscribe({
          next: (paymentId) => {
            let breakdownCount = 0;
    
            for (const breakdown of payment.breakdowns) {
              breakdown.paymentId = paymentId;
              this.checkoutService.savePaymentBreakdown(breakdown).subscribe({
                next: () => {
                  breakdownCount++;
                  if (breakdownCount === payment.breakdowns.length) {
                    payment.order.paymentId = paymentId;
                    this.checkoutService.saveOrder(payment.order).subscribe({
                      next: async () => {
                        console.log("✅ Offline payment synced:", payment);
    
                        await this.offlineService.removePendingPayment(payment.order.orderNumber);
                      },
                      error: async (err) => {
                      console.log(err)
                                        // **ERROR PATH: Check for Out-of-Stock Failure**
                                        const errorMessage = typeof err === 'string' ? err : err.message || JSON.stringify(err);

                                        if (errorMessage.includes(OUT_OF_STOCK_ERROR_MESSAGE)) {
                                            console.warn(`⚠️ Sync failed for order ${payment.order.orderNumber}: Out of Stock conflict. Flagging for manual resync.`);
                                            
                                            // Flag the local record for manual inspection/resync
                                            const flaggedPayment = {
                                                ...payment,
                                                syncFailed: true,
                                                failureReason: `One or more items were out of stock during sync. Resolve inventory before retrying.`,
                                                // Include the primary key to ensure the update hits the right record
                                                __dbKey: payment.__dbKey 
                                            };
                                            
                                            // Use update to save the flagged state and keep the record
                                            await lastValueFrom(this.offlineService.updatePendingPayment(flaggedPayment)); 
                                            
                                        } else {
                                            console.error(`❌ Failed to sync order ${payment.order.orderNumber} due to unhandled error:`, err);
                                        }
                                    },
                    });
                  }
                },
                error: (err) =>
                  console.error("❌ Failed to sync payment breakdown:", err),
              });
            }
          },
          error: (err) => console.error("❌ Failed to sync payment:", err),
        });
      }
  }
}