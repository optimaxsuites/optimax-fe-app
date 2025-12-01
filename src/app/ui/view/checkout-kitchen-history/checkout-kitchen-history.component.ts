import { Component, OnInit, OnDestroy } from '@angular/core';
import { PosServiceService } from '../../service/pos-service.service';
import { CheckoutService } from '../../service/checkout.service';
import { Subscription } from 'rxjs';

// Use the existing TableOrderStatusGET interface from your imports
import { TableOrderStatusGET } from "../../models/interfaces/kitchen";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  total: number;
  image?: string;
  category?: string;
}

interface Order {
  table: number;
  orderNo: string;
  items: OrderItem[];
  status: string;
  payment?: string;
  date?: string;
  createdAt?: string;
  note?: string;
}

interface TimelineEvent {
  orderNo: string;
  action: string;
  timestamp: string;
  performedBy?: string;
}

@Component({
  selector: 'app-checkout-kitchen-history',
  templateUrl: './checkout-kitchen-history.component.html',
  styleUrls: ['./checkout-kitchen-history.component.scss']
})
export class CheckoutKitchenHistoryComponent implements OnInit, OnDestroy {
  searchText: string = '';
  selectedDate: string = '';
  statusFilter: string = '';
  paymentMethodFilter: string = '';
  
  filteredOrders: Order[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  orders: Order[] = [];
  private ordersSubscription!: Subscription;
  isLoading: boolean = false;
  errorMessage: string = '';

  // For timeline view
  selectedOrderForTimeline: Order | null = null;

  // Make Math available in template
  Math = Math;

  // Auto-refresh
  private refreshInterval: any;

  // Cached statistics for performance
  private _todayOrders: Order[] = [];
  private _todayRevenue: number = 0;
  private _totalRevenue: number = 0;

  constructor(
    private posService: PosServiceService,
    private checkoutService: CheckoutService
  ) {}

  ngOnInit() {
    console.log('🚀 History component initialized');
    this.loadPaidOrders();
    this.startAutoRefresh();
  }

  startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      if (!this.isLoading) {
        console.log('🔄 Auto-refreshing data...');
        this.loadPaidOrders();
      }
    }, 30000);
  }

  loadPaidOrders() {
    this.isLoading = true;
    this.errorMessage = '';
    
    const startTime = performance.now();
    console.log('📡 Fetching paid orders from backend...');
    
    this.ordersSubscription = this.posService.getTableOrderStatuses().subscribe({
      next: (tableOrders: TableOrderStatusGET[]) => {
        console.log('📋 Raw API orders from backend:', tableOrders);
        console.log(`📊 Total orders received: ${tableOrders.length}`);
        
        // Filter for PAID orders using the correct backend status field
        this.orders = this.filterAndConvertPaidOrders(tableOrders);
        // this.orders = tableOrders
        
        console.log('💰 Processed paid orders from backend:', this.orders);
        console.log(`✅ Final paid orders count: ${this.orders.length}`);
        
        // UPDATE STATISTICS AFTER DATA LOADS
        this.updateStatistics();
        
        this.applyFilters();
        this.isLoading = false;
        this.trackPerformance('Load paid orders', startTime);
        
        // Save to localStorage as backup
        this.saveOrdersToLocalStorage();
      },
      error: (error) => {
        console.error('❌ Error loading orders from backend:', error);
        this.errorMessage = 'Failed to load orders. Please check your connection and try again.';
        this.isLoading = false;
        this.trackPerformance('Load paid orders (with error)', startTime);
        // Only use localStorage as LAST RESORT fallback
        this.loadFallbackData();
      }
    });
  }

  private updateStatistics() {
    console.log('📊 Updating statistics...');
    
    // Calculate total revenue
    this._totalRevenue = this.orders.reduce((sum, order) => 
      sum + this.getOrderTotal(order), 0
    );
    
    // Calculate today's orders and revenue
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-GB');
    
    this._todayOrders = this.orders.filter(order => {
      const orderDate = order.date || order.createdAt || '';
      const matches = orderDate.includes(todayStr);
      if (matches) {
        console.log(`📅 Found today's order: ${order.orderNo}`);
      }
      return matches;
    });
    
    this._todayRevenue = this._todayOrders.reduce((sum, order) => 
      sum + this.getOrderTotal(order), 0
    );
    
    console.log(`📊 Statistics Updated:
      Total Orders: ${this.orders.length}
      Total Revenue: ₦${this._totalRevenue.toFixed(2)}
      Today's Orders: ${this._todayOrders.length}
      Today's Revenue: ₦${this._todayRevenue.toFixed(2)}
    `);
  }

  private trackPerformance(operation: string, startTime: number) {
    const duration = performance.now() - startTime;
    console.log(`⏱️ ${operation} completed in ${duration.toFixed(2)}ms`);
  }

  // Filter for PAID status orders from backend
  private filterAndConvertPaidOrders(tableOrders: TableOrderStatusGET[]): Order[] {
    if (!tableOrders || !Array.isArray(tableOrders)) {
      console.warn('⚠️ No table orders found or invalid data format');
      return [];
    }

    console.log('🔍 Filtering for PAID orders...');
    
    const paidOrders = tableOrders
    // .filter(tableOrder => {
    //   const isPaid = tableOrder.status === 'PAID';
    //   console.log(`Table ${tableOrder.tableNumber}: status="${tableOrder.status}", isPaid=${isPaid}`);
    //   return isPaid;
    // });

    console.log(`✅ Found ${paidOrders.length} paid orders from ${tableOrders.length} total orders`);
    
    return paidOrders.map(tableOrder => this.convertToLocalOrder(tableOrder));
  }

  // Convert TableOrderStatusGET to your local Order format
  private convertToLocalOrder(tableOrder: TableOrderStatusGET): Order {
    const order = tableOrder.order || {};
    
    const localOrder: Order = {
      table: this.convertTableNumber(tableOrder.tableNumber),
      orderNo: order.orderNumber || `T${tableOrder.tableNumber}-${tableOrder.id}`,
      items: this.convertOrderItems(order.orderItem || []),
      status: tableOrder.status?.toLowerCase() || 'Unknown', // Since we filtered for PAID orders
      payment: this.getPaymentMethod(order),
      date: this.formatDate(tableOrder.orderedOn),
      createdAt: this.formatDate(tableOrder.orderedOn),
      note: tableOrder.note || ''
    };

    console.log('🔄 Converted order:', {
      orderNo: localOrder.orderNo,
      table: localOrder.table,
      itemsCount: localOrder.items.length,
      total: this.getOrderTotal(localOrder)
    });
    
    return localOrder;
  }

  // Convert order items from backend format
  private convertOrderItems(orderItems: any[]): OrderItem[] {
    if (!orderItems || !Array.isArray(orderItems)) {
      console.warn('⚠️ No order items found');
      return [];
    }

    return orderItems.map(item => {
      const product = item.product || {};
      const quantity = item.quantity || 1;
      const unitPrice = item.unitPrice || 0;
      const totalPrice = item.totalPrice || (quantity * unitPrice);

      return {
        id: product.id || item.id || 0,
        name: product.name || 'Unknown Item',
        price: unitPrice,
        qty: quantity,
        total: totalPrice,
        image: product.imageUrl || '',
        category: product.productCategory?.name || ''
      };
    });
  }

  // Get payment method from order
  private getPaymentMethod(order: any): string {
    // Check different possible locations for payment method
    if (order.paymentMethod) return order.paymentMethod;
    if (order.payment?.paymentMethod) return order.payment.paymentMethod;
    return 'Cash'; // Default assumption for paid orders
  }

  // Format the date array to readable format
  private formatDate(dateArray: number[] | null): string {
    if (!dateArray || !Array.isArray(dateArray) || dateArray.length < 3) {
      return new Date().toLocaleString('en-GB');
    }
    
    try {
      // Assuming format [year, month, day, hour, minute, second?]
      const [year, month, day, hour = 0, minute = 0] = dateArray;
      
      // Create date object (months are 0-indexed in JavaScript)
      const date = new Date(year, month - 1, day, hour, minute);
      
      // Format as DD/MM/YYYY HH:MM
      const dayStr = day.toString().padStart(2, '0');
      const monthStr = month.toString().padStart(2, '0');
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      
      return `${dayStr}/${monthStr}/${year} ${hourStr}:${minuteStr}`;
    } catch (error) {
      console.error('❌ Error formatting date:', error, dateArray);
      return new Date().toLocaleString('en-GB');
    }
  }

  // Convert table number string to number
  private convertTableNumber(tableNumber: string): number {
    if (!tableNumber) return 1;
    
    // Remove non-numeric characters and convert
    const num = parseInt(tableNumber.replace(/\D/g, ''));
    return isNaN(num) ? 1 : num;
  }

  // Fallback method if API fails
  private loadFallbackData() {
    try {
      const savedOrders = localStorage.getItem('kitchenHistoryOrders');
      if (savedOrders) {
        console.warn('⚠️ Using fallback data from localStorage');
        this.orders = JSON.parse(savedOrders);
        this.updateStatistics();
        this.applyFilters();
      } else {
        console.warn('⚠️ No fallback data available');
        this.orders = [];
        this.updateStatistics();
      }
    } catch (error) {
      console.error('❌ Error loading fallback data:', error);
      this.orders = [];
      this.updateStatistics();
    }
  }

  // Save orders to local storage as backup
  private saveOrdersToLocalStorage() {
    try {
      localStorage.setItem('kitchenHistoryOrders', JSON.stringify(this.orders));
      console.log('💾 Saved orders to localStorage as backup');
    } catch (error) {
      console.error('❌ Error saving orders to local storage:', error);
    }
  }

  // ===== FILTERING AND PAGINATION METHODS =====
  applyFilters() {
    console.log('🔍 Applying filters...');
    
    this.filteredOrders = this.orders.filter(order => {
      const matchesSearch = !this.searchText || 
        order.table.toString().includes(this.searchText) ||
        order.orderNo.toLowerCase().includes(this.searchText.toLowerCase()) ||
        order.items.some(item => item.name.toLowerCase().includes(this.searchText.toLowerCase()));
      
      const matchesDate = !this.selectedDate || 
        (order.date && order.date.includes(this.selectedDate));
      
      const matchesStatus = !this.statusFilter || 
        order.status.toLowerCase().includes(this.statusFilter.toLowerCase());
      
      const matchesPayment = !this.paymentMethodFilter || 
        (order.payment || 'Unknown').toLowerCase() === this.paymentMethodFilter.toLowerCase();
      
      return matchesSearch && matchesDate && matchesStatus && matchesPayment;
    });
    
    console.log(`✅ Filtered orders: ${this.filteredOrders.length} of ${this.orders.length}`);
    
    this.sortOrders();
    this.currentPage = 1;
  }

  private sortOrders() {
    // Sort by date (newest first)
    this.filteredOrders.sort((a, b) => {
      const dateA = this.parseDate(a.date || a.createdAt || '');
      const dateB = this.parseDate(b.date || b.createdAt || '');
      return dateB.getTime() - dateA.getTime();
    });
  }

  private parseDate(dateString: string): Date {
    try {
      // Handle DD/MM/YYYY format
      if (dateString.includes('/')) {
        const [datePart, timePart] = dateString.split(' ');
        const [day, month, year] = datePart.split('/');
        if (timePart) {
          const [hour, minute] = timePart.split(':');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        }
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      // Handle other formats or return current date
      return new Date(dateString) || new Date();
    } catch {
      return new Date();
    }
  }

  clearFilters() {
    this.searchText = '';
    this.selectedDate = '';
    this.statusFilter = '';
    this.paymentMethodFilter = '';
    this.applyFilters();
  }

  onItemsPerPageChange() {
    this.currentPage = 1;
  }

  // ===== ORDER METHODS =====
  getOrderTotal(order: Order): number {
    if (!order || !order.items) return 0;
    return order.items.reduce((sum, item) => sum + (item.total || 0), 0);
  }

  isToday(dateString?: string): boolean {
    if (!dateString) return false;
    const orderDate = this.parseDate(dateString);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  }

  // ===== PAGINATION METHODS =====
  get totalPages(): number {
    return Math.ceil(this.filteredOrders.length / this.itemsPerPage);
  }

  get paginatedOrders(): Order[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredOrders.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getVisiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // ===== STATISTICS METHODS (Using cached values) =====
  getTotalRevenue(): number {
    return this._totalRevenue;
  }

  get todayOrders(): Order[] {
    return this._todayOrders;
  }

  get todayRevenue(): number {
    return this._todayRevenue;
  }

  // Get unique payment methods for filtering
  get paymentMethods(): string[] {
    const methods = new Set(this.orders.map(order => order.payment || 'Unknown'));
    return Array.from(methods);
  }

  // ===== TIMELINE METHODS =====
  getDetailedOrderHistory(): TimelineEvent[] {
    try {
      const history = localStorage.getItem('orderHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('❌ Error reading detailed order history:', error);
      return [];
    }
  }

  getOrderTimeline(orderNo: string): TimelineEvent[] {
    const fullHistory = this.getDetailedOrderHistory();
    return fullHistory
      .filter(entry => entry.orderNo === orderNo)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  showOrderTimeline(order: Order) {
    this.selectedOrderForTimeline = this.selectedOrderForTimeline === order ? null : order;
  }

  // ===== ICON METHODS =====
  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid': return 'fa-check-circle';
      case 'completed': return 'fa-check-double';
      case 'pending': return 'fa-clock';
      default: return 'fa-circle';
    }
  }

  getPaymentIcon(payment?: string): string {
    switch ((payment || '').toLowerCase()) {
      case 'cash': return 'fa-money-bill';
      case 'card': return 'fa-credit-card';
      case 'transfer': return 'fa-exchange-alt';
      default: return 'fa-wallet';
    }
  }

  getTimelineIcon(action: string): string {
    switch (action.toLowerCase()) {
      case 'created': return 'fa-plus-circle';
      case 'paid': return 'fa-money-bill-wave';
      case 'completed': return 'fa-check-circle';
      case 'served': return 'fa-utensils';
      default: return 'fa-circle';
    }
  }

  // ===== ACTION METHODS =====
  refreshOrders() {
    console.log('🔄 Manual refresh triggered');
    this.loadPaidOrders();
  }

  viewOrderDetails(order: Order) {
    // Implement order details view logic
    console.log('👁️ View order details:', order);
    // You can navigate to a details page or show a modal
  }

  exportToCSV() {
    console.log('📥 Exporting to CSV...');
    
    const headers = [
      'Table', 'Order No', 'Date', 'Status', 'Payment Method', 
      'Total Amount', 'Items Count', 'Items Details'
    ];
    
    const csvData = this.orders.map(order => [
      order.table,
      `"${order.orderNo}"`,
      `"${order.date || ''}"`,
      order.status,
      order.payment || 'Unknown',
      this.getOrderTotal(order).toFixed(2),
      order.items.length,
      `"${order.items.map(item => `${item.name} (x${item.qty})`).join('; ')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    this.downloadCSV(csvContent, `orders-history-${new Date().toISOString().split('T')[0]}.csv`);
  }

  private downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ CSV downloaded:', filename);
  }

  printOrder(order: Order) {
    const printContent = `
      <html>
        <head>
          <title>Order Receipt - ${order.orderNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .order-info { margin-bottom: 20px; }
            .order-items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .order-items th, .order-items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .order-items th { background-color: #f2f2f2; }
            .total { font-weight: bold; font-size: 1.2em; text-align: right; }
            .footer { margin-top: 30px; text-align: center; font-size: 0.9em; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Order Receipt</h1>
            <h2>${order.orderNo}</h2>
          </div>
          
          <div class="order-info">
            <p><strong>Table:</strong> ${order.table}</p>
            <p><strong>Date:</strong> ${order.date}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            <p><strong>Payment Method:</strong> ${order.payment}</p>
            ${order.note ? `<p><strong>Note:</strong> ${order.note}</p>` : ''}
          </div>
          
          <table class="order-items">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.qty}</td>
                  <td>₦${item.price.toFixed(2)}</td>
                  <td>₦${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            <p>Total: ₦${this.getOrderTotal(order).toFixed(2)}</p>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  }

  ngOnDestroy() {
    console.log('🛑 History component destroyed');
    
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}