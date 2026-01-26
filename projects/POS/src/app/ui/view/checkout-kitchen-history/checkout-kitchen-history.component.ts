import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PosServiceService } from '../../service/pos-service.service';
import { CheckoutService } from '../../service/checkout.service';
import { Subscription } from 'rxjs';
import { UserService } from '../../service/user.service';
import { ImageCacheService } from '../../service/image-cache.service';
import { TableOrderStatusGET } from "../../models/interfaces/kitchen";
import { UserModule } from "../../../user/user.module";

interface OrderItem {
  id: number;
  name: string;
  price: number;
  qty: number;
  total: number;
  image?: string;
  category?: string;
  product?: any;
}

interface Order {
  id: number | undefined;
  table: number;
  orderNo: string;
  items: OrderItem[];
  payment?: string;
  date?: string;
  createdAt?: string;
  note?: string;
  backendId?: number;
  orderId?: number;
  paymentMethod?: string;
  isPaid?: boolean;
  paymentStatus?: string;
  paidAt?: string;
  createdBy?: string;
  createdById?: string | number;
  preparedBy?: string;
  preparedById?: string | number;
  servedBy?: string;
  servedById?: string | number;
  paidBy?: string;
  paidById?: string | number;
  staffInvolved?: StaffInvolved[];
  status: 'PENDING' | 'PREPARING' | 'READY' | 'CONFIRMED' | 'CANCELLED' | 'AWAITING_CONFIRMATION' | 'UNPAID' | 'PAID' | 'DELIVERED';
  paymentId?: number;
  orderStatus: 'UNPAID' | 'PAID',
  orderedOn: any,
  grandTotal: number,
  total: number,
  tax: number,
  waiterId: any,
  chefId: any,
  cashierId: any
  order: any
  waiter: any
  cashier: any
  chef: any

}


interface StaffInvolved {
  staffId: string | number;
  staffName: string;
  role: 'waiter' | 'chef' | 'cashier';
  action: string;
  timestamp: string;
}

interface TimelineEvent {
  orderNo: string;
  action: string;
  timestamp: string;
  performedBy?: string;
  performedById?: string | number;
  role?: 'waiter' | 'chef' | 'cashier';
}

interface StaffMember {
  id: string | number;
  name: string;
  role: 'waiter' | 'chef' | 'cashier';
  username?: string;
  email?: string;
}

@Component({
  selector: 'app-checkout-kitchen-history',
  templateUrl: './checkout-kitchen-history.component.html',
  styleUrls: ['./checkout-kitchen-history.component.scss'],
})
export class CheckoutKitchenHistoryComponent implements OnInit, OnDestroy {
  // ===== NAVIGATION PROPERTIES =====
  logoUrl: string = 'assets/images/logo.png';
  profileImgUrl: string = 'assets/images/default-profile.png';
  userRegData: any = {};
  mode: 'waiter' | 'chef' | 'cashier' = 'cashier';
  showCloseRegisterModal: boolean = false;
  openingAmount: number = 0;
  closingAmount: number = 0;
  
  // ===== PAGE PROPERTIES =====
  searchText: string = '';
  selectedDate: string = '';
  statusFilter: string = '';
  paymentMethodFilter: string = '';
  
  selectedRoleFilter: string = '';
  selectedStaffFilter: string = '';
  showOnlyMyActivities: boolean = false;
  
  filteredOrders: Order[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  
  orders: Order[] = [];
  private ordersSubscription!: Subscription;
  isLoading: boolean = false;
  errorMessage: string = '';

  selectedOrderForTimeline: Order | null = null;
  selectedOrderForReceipt: Order | null = null;
  isPrinting: boolean = false;

  // For view details modal
  selectedOrderForDetails: Order | null = null;
  showDetailsModal: boolean = false;

  companyInfo = {
    name: 'Restaurant Name',
    address: 'Address will load from session storage',
    phone: 'Phone number',
    email: 'Email address',
    vatNumber: 'VAT-Number'
  };

  private imageCache = new Map<number, string>();
  Math = Math;

  private _todayOrders: Order[] = [];
  private _todayRevenue: number = 0;
  private _totalRevenue: number = 0;

  // Updated storage keys to match cashier component
  private readonly CASHIER_STORAGE_KEY = 'restaurant_orders_data';
  private readonly HISTORY_BACKUP_KEY = 'restaurant_history_backup';
  
  availableStaff: StaffMember[] = [];
  currentUser: StaffMember | null = null;
  private readonly STAFF_STORAGE_KEY = 'restaurant_staff_data';

  constructor(
    private posService: PosServiceService,
    private checkoutService: CheckoutService,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private imageCacheService: ImageCacheService,
    private router: Router
  ) {}

  // ===== NAVIGATION METHODS =====
  setMode(mode: 'waiter' | 'chef' | 'cashier'): void {
    console.log('Setting mode to:', mode);
    this.mode = mode;
    
    // Navigate to the kitchen page
    this.router.navigate(['/checkout-kitchen']).then(success => {
      if (success) {
        console.log('Navigation successful to kitchen');
      } else {
        console.error('Navigation failed');
      }
    });
  }

  onToggleSidebar(): void {
    console.log('Toggle sidebar clicked');
    const sidebar = document.querySelector('.sidebar') as HTMLElement;
    if (sidebar) {
      sidebar.classList.toggle('active');
    }
  }

  closeRegister(): void {
    console.log('Close register clicked');
    this.showCloseRegisterModal = true;
  }

  cancelCloseRegister(): void {
    this.showCloseRegisterModal = false;
  }

  finalizeRegister(data: any): void {
    console.log('Finalizing register with data:', data);
    this.showCloseRegisterModal = false;
  }

  logout(): void {
    console.log('Logout clicked');
    sessionStorage.clear();
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  ngOnInit() {
    console.log('🚀 History component initialized');
    
    // Initialize navbar user data
    this.initializeUserData();
    
    // Load company info
    this.getCompanyInfoFromSessionStorage();
    this.initializeCurrentUser();
    this.loadStaffData();
    
    // Load orders from cashier localStorage
    this.loadPaidOrders();
    
    // Set up interval to check for new orders every 10 seconds
    // setInterval(() => {
    //   this.checkForNewOrders();
    // }, 10000);
  }

  private checkForNewOrders() {
    this.loadPaidOrders()
  }

  private initializeUserData(): void {
    try {
      const userDataStr = sessionStorage.getItem('userPrimaryInfoRegData');
      if (userDataStr) {
        this.userRegData = JSON.parse(userDataStr);
        console.log('👤 User data loaded:', this.userRegData);
        
        // Set mode based on user role
        const userRole = (this.userRegData.role || '').toLowerCase();
        if (userRole.includes('cashier')) {
          this.mode = 'cashier';
        } else if (userRole.includes('chef') || userRole.includes('kitchen')) {
          this.mode = 'chef';
        } else if (userRole.includes('waiter')) {
          this.mode = 'waiter';
        }
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      this.userRegData = {
        username: 'User',
        accountId: '001',
        uuid: 'default-uuid'
      };
    }
  }

  // ===== HELPER METHODS FOR NUMBER FORMATTING =====
  formatAmount(amount: number): string {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatAmountNoDecimals(amount: number): string {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  // ===== STAFF FILTERING METHODS =====
  getFilteredStaffByRole(): StaffMember[] {
    if (!this.selectedRoleFilter) {
      return this.availableStaff;
    }
    
    return this.availableStaff.filter(staff => 
      staff.role.toLowerCase() === this.selectedRoleFilter.toLowerCase()
    );
  }

  // ===== COMPANY INFO METHODS =====
  private getCompanyInfoFromSessionStorage(): void {
    try {
      const userDataStr = sessionStorage.getItem('userPrimaryInfoRegData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        
        this.companyInfo = {
          name: userData.companyName || 'Restaurant Name',
          address: this.formatAddress(userData),
          phone: userData.phoneNumber || 'Not specified',
          email: userData.email || 'Not specified',
          vatNumber: userData.vatNumber || `VAT-${userData.id || '000000'}`
        };
        
        console.log('🏢 Company info loaded:', this.companyInfo);
      } else {
        this.setDefaultCompanyInfo();
      }
    } catch (error) {
      console.error('❌ Error getting company info:', error);
      this.setDefaultCompanyInfo();
    }
  }

  private formatAddress(userData: any): string {
    const addressParts = [];
    
    if (userData.address) addressParts.push(userData.address);
    if (userData.city) addressParts.push(userData.city);
    if (userData.state) addressParts.push(userData.state);
    if (userData.country) addressParts.push(userData.country);
    if (userData.postalCode) addressParts.push(userData.postalCode);
    
    return addressParts.length > 0 ? 
      addressParts.join(', ') : 
      'Address not specified';
  }

  private setDefaultCompanyInfo(): void {
    this.companyInfo = {
      name: 'Restaurant Name',
      address: '123 Main Street, City, Country',
      phone: '+234 123 456 7890',
      email: 'info@restaurant.com',
      vatNumber: 'VAT-123456789'
    };
  }

  private initializeCurrentUser() {
    try {
      const userData = this.userService.getUserData() as any;
      if (userData) {
        let userName = 'Current User';
        if (userData.name) {
          userName = userData.name;
        } else if (userData.username) {
          userName = userData.username;
        } else if (userData.firstName && userData.lastName) {
          userName = `${userData.firstName} ${userData.lastName}`;
        } else if (userData.fullName) {
          userName = userData.fullName;
        }
        
        this.currentUser = {
          id: (userData.id || userData.username || 'current-user').toString(),
          name: userName,
          role: this.determineUserRole(userData),
          username: userData.username,
          email: userData.email
        };
        console.log('👤 Current user:', this.currentUser);
        
        this.availableStaff = [this.currentUser];
      }
    } catch (error) {
      console.error('❌ Error getting current user:', error);
    }
  }

  private determineUserRole(userData: any): 'waiter' | 'chef' | 'cashier' {
    if (!userData) return 'cashier';
    
    const role = userData.role || userData.userType || '';
    
    if (role.toLowerCase().includes('cashier')) return 'cashier';
    if (role.toLowerCase().includes('chef') || role.toLowerCase().includes('kitchen')) return 'chef';
    if (role.toLowerCase().includes('waiter') || role.toLowerCase().includes('server')) return 'waiter';
    
    return 'cashier';
  }

  private async loadStaffData() {
    try {
      if (this.currentUser) {
        this.availableStaff = [this.currentUser];
      }
      
    } catch (error) {
      console.error('❌ Error loading staff data:', error);
    }
  }



  getStaffById(staffId: string | number): StaffMember | undefined {
    return this.availableStaff.find(staff => 
      staff.id === staffId || staff.id?.toString() === staffId?.toString()
    );
  }

  // ===== MAIN ORDER LOADING =====
  loadPaidOrders() {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Load from cashier localStorage FIRST (this is where new orders are saved)
    
    this.ordersSubscription = this.posService.getTableOrderStatuses().subscribe({
      next: (tableOrders: any[]) => {

        
        const backendOrders = this.filterAndConvertPaidOrders(tableOrders);
        
        this.orders = backendOrders

        console.log(this.orders)
        
        this.debugTodayOrders();
        
        this.updateStatistics();
        this.applyFilters();
        this.isLoading = false;

      },
      error: (error) => {
        console.error('❌ Error loading orders from backend:', error);
        this.errorMessage = 'Failed to load orders from server. Using local data.';
        
        
        
        this.enrichOrdersWithStaffData();
        this.debugTodayOrders();
        this.updateStatistics();
        this.applyFilters();
        this.isLoading = false;
      }
    });
  }




  private enrichOrdersWithStaffData() {
    this.orders.forEach(order => {
      if (!order.staffInvolved) {
        order.staffInvolved = this.extractStaffFromOrder(order);
      }
      
      // Ensure staff fields are populated from staffInvolved
      if (order.staffInvolved && order.staffInvolved.length > 0) {
        order.staffInvolved.forEach(staff => {
          switch (staff.role) {
            case 'waiter':
              if (!order.createdBy) {
                order.createdBy = staff.staffName;
                order.createdById = staff.staffId;
              }
              break;
            case 'chef':
              if (!order.preparedBy) {
                order.preparedBy = staff.staffName;
                order.preparedById = staff.staffId;
              }
              break;
            case 'cashier':
              if (!order.paidBy) {
                order.paidBy = staff.staffName;
                order.paidById = staff.staffId;
              }
              break;
          }
        });
      }
    });
  }

  private extractStaffFromOrder(order: Order): StaffInvolved[] {
    const staffInvolved: StaffInvolved[] = [];
    
    // Add staff from order fields
    if (order.createdBy) {
      staffInvolved.push({
        staffId: order.createdById || order.createdBy.toLowerCase().replace(' ', '-'),
        staffName: order.createdBy,
        role: 'waiter',
        action: 'created',
        timestamp: order.createdAt || order.date || new Date().toISOString()
      });
    }
    
    if (order.preparedBy) {
      staffInvolved.push({
        staffId: order.preparedById || order.preparedBy.toLowerCase().replace(' ', '-'),
        staffName: order.preparedBy,
        role: 'chef',
        action: 'prepared',
        timestamp: order.paidAt || order.date || new Date().toISOString()
      });
    }
    
    if (order.paidBy) {
      staffInvolved.push({
        staffId: order.paidById || order.paidBy.toLowerCase().replace(' ', '-'),
        staffName: order.paidBy,
        role: 'cashier',
        action: 'paid',
        timestamp: order.paidAt || order.date || new Date().toISOString()
      });
    }
    
    return staffInvolved;
  }

  private mergeAllOrders(backendOrders: Order[], cashierOrders: Order[]): Order[] {
    const orderMap = new Map<string, Order>();
    
    // Add backend orders first
    backendOrders.forEach(order => {
      if (order.orderNo) {
        orderMap.set(order.orderNo, order);
      }
    });
    
    // Add/update with cashier orders (these are more recent)
    cashierOrders.forEach(order => {
      if (order.orderNo) {
        const existingOrder = orderMap.get(order.orderNo);
        
        if (existingOrder) {
          // Check which order is more recent
          const existingDate = this.parseCustomDate(existingOrder.date || '');
          const newDate = this.parseCustomDate(order.date || '');
          
          // Always prefer cashier orders as they're from today
          orderMap.set(order.orderNo, order);
        } else {
          orderMap.set(order.orderNo, order);
        }
      }
    });
    
    const mergedOrders = Array.from(orderMap.values());
    
    console.log(`🔄 Merged ${backendOrders.length} backend + ${cashierOrders.length} cashier = ${mergedOrders.length} total orders`);
    
    return mergedOrders;
  }


  private debugTodayOrders() {
    const today = new Date();
    const todayOrders = this.orders.filter(order => {
      if (!order.date) return false;
      const orderDate = this.parseCustomDate(order.date);
      return orderDate.toDateString() === today.toDateString();
    });
    
    console.log(`📅 Today's orders (${today.toLocaleDateString()}):`, todayOrders.length);
    
    if (todayOrders.length > 0) {
      console.log('📋 Today\'s order details:', todayOrders.map(order => ({
        orderNo: order.orderNo,
        table: order.table,
        paymentMethod: order.paymentMethod,
        total: this.getOrderTotal(order),
        date: order.date,
        source: order.backendId ? 'Backend' : 'Cashier'
      })));
    }
  }

  private filterAndConvertPaidOrders(tableOrders: Order[]): Order[] {
    
    if (!tableOrders || !Array.isArray(tableOrders)) {
      console.warn('⚠️ No table orders found or invalid data format');
      return [];
    }

    console.log('🔍 Filtering for PAID orders from backend...');
    
    

    // console.log(`✅ Found ${paidOrders.length} paid orders from ${tableOrders.length} total backend orders`);
    
    return tableOrders.map(tableOrder => this.convertToLocalOrder(tableOrder));
  }

  private convertToLocalOrder(tableOrder: any) {
    const order = tableOrder.order || {};
    
    let formattedDate = '';
    if (tableOrder.orderedOn) {
      if (Array.isArray(tableOrder.orderedOn)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = tableOrder.orderedOn;
        formattedDate = `${year}-${month}-${day}-${hour}-${minute}-${second}`;
      } else if (typeof tableOrder.orderedOn === 'string') {
        formattedDate = tableOrder.orderedOn;
      }
    }
    
    const localOrder: Order = {
      table: tableOrder.tableNumber,
      orderNo: order.orderNumber,
      items: this.convertOrderItems(order.orderItem || []),
      status: tableOrder.status,
      payment: order.orderStatus,
      date: formattedDate,
      createdAt: formattedDate,
      note: tableOrder.note || '',
      backendId: tableOrder.id,
      orderId: order.id,
      paymentMethod: this.getPaymentMethod(order),
      isPaid: true,
      total: order.total,
      grandTotal: order.grandTotal,
      tax: order.tax,
      waiter: order.water,
      chef: order.chef,
      cashier: order.cashier,
      waiterId: order.water?.id,
      cashierId: order.cashier?.id,
      chefId: order.chef?.id
      // paymentStatus: 'PAID'
      
    }as Order;
    
    return localOrder;
  }

  private convertOrderItems(orderItems: any[]): OrderItem[] {
    if (!orderItems || !Array.isArray(orderItems)) {
      console.warn('⚠️ No order items found');
      return [];
    }

    return orderItems.map(item => {
      const product = item.product || {};
      const quantity = item.quantity || 1;
      const unitPrice = product.sellingPrice || 0;
      const totalPrice = item.totalPrice || (quantity * unitPrice);

      return {
        id: product.id || item.id || 0,
        name: product.name || 'Unknown Item',
        price: unitPrice,
        qty: quantity,
        total: totalPrice,
        image: product.imageUrl || '',
        category: product.productCategory?.name || '',
        product: product
      };
    });
  }

  private getPaymentMethod(order: any): string {
    if (order.paymentMethod) return order.paymentMethod;
    if (order.payment?.paymentMethod) return order.payment.paymentMethod;
    if (order.orderStatus === 'PAID' || order.status === 'PAID' || order.orderStatus === 'CONFIRMED') {
      return 'Cash';
    }
    return 'Unknown';
  }

  private convertTableNumber(tableNumber: string): number {
    if (!tableNumber) return 1;
    const num = parseInt(tableNumber.replace(/\D/g, ''));
    return isNaN(num) ? 1 : num;
  }

  // ===== VIEW DETAILS METHODS =====
  viewOrderDetails(order: Order) {
    console.log('👁️ View order details:', order);
    this.selectedOrderForDetails = order;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.selectedOrderForDetails = null;
    this.showDetailsModal = false;
  }

  parseCustomDate(dateString: string): Date {
    if (!dateString) return new Date();
    
    try {
      // Handle various date formats
      if (dateString.includes('-')) {
        const parts = dateString.split('-');
        
        if (parts.length >= 6) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const hour = parseInt(parts[3], 10) || 0;
          const minute = parseInt(parts[4], 10) || 0;
          const second = parseInt(parts[5], 10) || 0;
          
          return new Date(year, month, day, hour, minute, second);
        }
      }
      
      // Try ISO string
      return new Date(dateString);
    } catch (error) {
      console.error('Error parsing date:', dateString, error);
      return new Date();
    }
  }

  formatDateForDisplay(dateString: string): string {
    const date = this.parseCustomDate(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private trackPerformance(operation: string, startTime: number) {
    const duration = performance.now() - startTime;
    console.log(`⏱️ ${operation} completed in ${duration.toFixed(2)}ms`);
  }

  get paidOrders (){
    const paidOrders = this.orders.filter(tableOrder => {
      const status = tableOrder.status?.toUpperCase();
      const orderStatus = tableOrder.payment;
      
      const isPaid =  orderStatus === 'PAID' 
      
      return isPaid;
    });

    console.log(paidOrders)

    return paidOrders
  }

  private updateStatistics() {
    console.log('📊 Updating statistics...');
    
    this._totalRevenue = this.paidOrders.reduce((sum, order) => 
      sum + order.total, 0
    );
    
    const today = new Date();
    this._todayOrders = this.orders.filter(order => {
      if (!order.date) return false;
      const orderDate = this.parseCustomDate(order.date);
      return orderDate.toDateString() === today.toDateString();
    });
    
    this._todayRevenue = this._todayOrders.reduce((sum, order) => 
      sum + this.getOrderTotal(order), 0
    );
    
    console.log(`📊 Statistics Updated:
      Total Orders: ${this.orders.length}
      Total Revenue: ₦${this.formatAmount(this._totalRevenue)}
      Today's Orders: ${this._todayOrders.length}
      Today's Revenue: ₦${this.formatAmount(this._todayRevenue)}
    `);
  }

  applyFilters() {
    console.log('🔍 Applying filters...');
    
    this.filteredOrders = this.orders.filter(order => {
      const matchesSearch = !this.searchText || 
        order.table.toString().includes(this.searchText) ||
        order.orderNo.toLowerCase().includes(this.searchText.toLowerCase()) ||
        order.items.some(item => item.name.toLowerCase().includes(this.searchText.toLowerCase()));
      
      const matchesDate = !this.selectedDate || 
        (order.date && this.formatDateForDisplay(order.date).includes(this.selectedDate));
      
      const matchesStatus = !this.statusFilter || 
        order.status.toLowerCase().includes(this.statusFilter.toLowerCase());
      
      const matchesPayment = !this.paymentMethodFilter || 
        (order.payment || 'Unknown').toLowerCase() === this.paymentMethodFilter.toLowerCase();
      
      const matchesRole = !this.selectedRoleFilter || this.doesOrderInvolveRole(order, this.selectedRoleFilter);
      
      const matchesStaff = !this.selectedStaffFilter || this.doesOrderInvolveStaff(order, this.selectedStaffFilter);
      
      const matchesMyActivities = !this.showOnlyMyActivities || this.doesOrderInvolveCurrentUser(order);
      
      return matchesSearch && matchesDate && matchesStatus && 
             matchesPayment && matchesRole && matchesStaff && matchesMyActivities;
    });
    
    console.log(`✅ Filtered orders: ${this.filteredOrders.length} of ${this.orders.length}`);
    
    this.sortOrders();
    this.currentPage = 1;
  }

  private doesOrderInvolveRole(order: Order, role: string): boolean {
    if (!role) return true;
    
    if (role === 'waiter' && order.createdBy) return true;
    if (role === 'chef' && order.preparedBy) return true;
    if (role === 'cashier' && order.paidBy) return true;
    
    if (order.staffInvolved && order.staffInvolved.some(staff => staff.role === role)) {
      return true;
    }
    
    return false;
  }

  private doesOrderInvolveStaff(order: Order, staffId: string | number): boolean {
    if (!staffId) return true;
    
    const staffIdStr = staffId.toString();
    if (order.createdById?.toString() === staffIdStr || 
        order.preparedById?.toString() === staffIdStr || 
        order.paidById?.toString() === staffIdStr || 
        order.servedById?.toString() === staffIdStr) {
      return true;
    }
    
    if (order.staffInvolved && order.staffInvolved.some(staff => staff.staffId?.toString() === staffIdStr)) {
      return true;
    }
    
    const staff = this.getStaffById(staffId);
    if (staff) {
      if (order.createdBy === staff.name || order.preparedBy === staff.name || 
          order.paidBy === staff.name || order.servedBy === staff.name) {
        return true;
      }
    }
    
    return false;
  }

  private doesOrderInvolveCurrentUser(order: Order): boolean {
    if (!this.currentUser) return true;
    
    return this.doesOrderInvolveStaff(order, this.currentUser.id);
  }

  applyStaffFilter() {
    console.log('👤 Applying staff filter...');
    
    if (this.selectedRoleFilter && this.selectedStaffFilter) {
      const selectedStaff = this.getStaffById(this.selectedStaffFilter);
      if (selectedStaff && selectedStaff.role.toLowerCase() !== this.selectedRoleFilter.toLowerCase()) {
        this.selectedStaffFilter = '';
      }
    }
    
    this.applyFilters();
  }

  showMyActivitiesOnly() {
    this.showOnlyMyActivities = true;
    this.selectedRoleFilter = '';
    this.selectedStaffFilter = '';
    this.applyFilters();
  }

  clearStaffFilters() {
    this.selectedRoleFilter = '';
    this.selectedStaffFilter = '';
    this.showOnlyMyActivities = false;
    this.applyFilters();
  }

  private sortOrders() {
    this.filteredOrders.sort((a, b) => {
      const dateA = this.parseCustomDate(a.date || a.createdAt || '');
      const dateB = this.parseCustomDate(b.date || b.createdAt || '');
      return dateB.getTime() - dateA.getTime();
    });
  }

  clearFilters() {
    this.searchText = '';
    this.selectedDate = '';
    this.statusFilter = '';
    this.paymentMethodFilter = '';
    this.clearStaffFilters();
  }

  onItemsPerPageChange() {
    this.currentPage = 1;
  }

  getOrderTotal(order: Order): number {
    if (!order || !order.items) return 0;
    return order.items.reduce((sum, item) => sum + (item.total || 0), 0);
  }

  isToday(dateString?: string): boolean {
    if (!dateString) return false;
    const orderDate = this.parseCustomDate(dateString);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  }

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
        pages.push('...');
        pages.push(this.totalPages);
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

  getTotalRevenue(): number {
    return this._totalRevenue;
  }

  get todayOrders(): Order[] {
    return this._todayOrders;
  }

  get todayRevenue(): number {
    return this._todayRevenue;
  }

  get paymentMethods(): string[] {
    const methods = new Set(this.orders.map(order => order.payment || 'Unknown'));
    return Array.from(methods);
  }

  // getDetailedOrderHistory(): TimelineEvent[] {
  //   try {
  //     const history = localStorage.getItem('orderHistory');
  //     return history ? JSON.parse(history) : [];
  //   } catch (error) {
  //     console.error('❌ Error reading detailed order history:', error);
  //     return [];
  //   }
  // }

  // getOrderTimeline(orderNo: string): TimelineEvent[] {
  //   const fullHistory = this.getDetailedOrderHistory();
  //   return fullHistory
  //     .filter(entry => entry.orderNo === orderNo)
  //     .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  // }

  showOrderTimeline(order: Order) {
    this.selectedOrderForTimeline = this.selectedOrderForTimeline === order ? null : order;
  }

  printOrder(order: Order) {
    this.selectedOrderForReceipt = order;
    this.isPrinting = true;
    
    const printContent = this.generateReceiptHTML(order);
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice - ${order.orderNo}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
                .no-print { display: none; }
              }
              body { font-family: Arial, sans-serif; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2EB270; padding-bottom: 10px; }
              .company-name { color: #2EB270; margin: 0; font-size: 24px; }
              .company-info { margin: 5px 0; font-size: 12px; }
              .invoice-info { display: flex; justify-content: space-between; margin: 20px 0; }
              .invoice-details p { margin: 5px 0; }
              .staff-info { background-color: #f0f9f4; padding: 10px; border-radius: 5px; margin: 10px 0; }
              .staff-row { display: flex; justify-content: space-between; margin: 5px 0; }
              .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .items-table th { background-color: #2EB270; color: white; padding: 10px; text-align: left; }
              .items-table td { padding: 8px; border-bottom: 1px solid #ddd; }
              .summary { border-top: 2px solid #ddd; padding-top: 10px; margin-top: 20px; }
              .summary-row { display: flex; justify-content: space-between; margin: 5px 0; }
              .total-row { font-size: 1.2em; font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px; }
              .footer { margin-top: 30px; text-align: center; font-style: italic; color: #666; font-size: 12px; }
              .payment-method { background-color: #f0f9f4; padding: 10px; border-radius: 5px; margin: 10px 0; }
            </style>
          </head>
          <body>
            ${printContent}
            <div class="no-print" style="margin-top: 20px; text-align: center;">
              <button onclick="window.print()" style="background: #2EB270; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 10px;">
                🖨 Print Receipt
              </button>
              <button onclick="window.close()" style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 10px;">
                Close
              </button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        this.isPrinting = false;
      }, 500);
    } else {
      this.isPrinting = false;
    }
  }

  private generateReceiptHTML(order: Order): string {
    const subtotal = this.getOrderTotal(order);
    const tax = subtotal * 0.05;
    const grandTotal = subtotal + tax;
    
    const source = order.backendId ? 'Backend System' : 'Cashier System';
    
    const staffInfo = [];
    if (order.createdBy) staffInfo.push({ role: 'Waiter', name: order.createdBy });
    if (order.preparedBy) staffInfo.push({ role: 'Chef', name: order.preparedBy });
    if (order.paidBy) staffInfo.push({ role: 'Cashier', name: order.paidBy });
    if (order.servedBy) staffInfo.push({ role: 'Server', name: order.servedBy });
    
    return `
      <div style="padding: 20px;">
        <div class="header">
          <h1 class="company-name">${this.companyInfo.name}</h1>
          <p class="company-info">${this.companyInfo.address}</p>
          <p class="company-info">📞 ${this.companyInfo.phone} | ✉️ ${this.companyInfo.email}</p>
          ${this.companyInfo.vatNumber ? `<p class="company-info">📋 ${this.companyInfo.vatNumber}</p>` : ''}
          <p class="company-info" style="font-size: 10px; color: #666;">Source: ${source}</p>
        </div>
        
        <div class="invoice-info">
          <div class="invoice-details">
            <h3 style="margin: 0; color: #2E6276;">TAX INVOICE</h3>
            <p><strong>Invoice #:</strong> ${order.orderNo}</p>
            <p><strong>Date:</strong> ${this.formatDateForDisplay(order.date || '')}</p>
            ${order.paidAt ? `<p><strong>Paid At:</strong> ${this.formatDateForDisplay(order.paidAt)}</p>` : ''}
          </div>
          <div class="invoice-details">
            <p><strong>Table:</strong> ${order.table}</p>
            <p><strong>Order Status:</strong> ${order.status}</p>
          </div>
        </div>
        
        ${staffInfo.length > 0 ? `
          <div class="staff-info">
            <h4 style="margin: 0 0 10px 0; color: #2E6276;">Staff Information</h4>
            ${staffInfo.map(staff => `
              <div class="staff-row">
                <span><strong>${staff.role}:</strong></span>
                <span>${staff.name}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="payment-method">
          <p><strong>Payment Method:</strong> ${order.payment || 'Cash'}</p>
          <p><strong>Payment Status:</strong> ${order.paymentStatus || 'PAID'}</p>
        </div>
        
        ${order.note ? `
          <div style="background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>Order Note:</strong> ${order.note}</p>
          </div>
        ` : ''}
        
        <table class="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td style="text-align: center;">${item.qty}</td>
                <td style="text-align: right;">₦${this.formatAmount(item.price)}</td>
                <td style="text-align: right;">₦${this.formatAmount(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₦${this.formatAmount(subtotal)}</span>
          </div>
          <div class="summary-row">
            <span>Tax (5%):</span>
            <span>₦${this.formatAmount(tax)}</span>
          </div>
          <div class="summary-row total-row">
            <span>TOTAL:</span>
            <span>₦${this.formatAmount(grandTotal)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for dining with us!</p>
          <p>This is a computer generated receipt</p>
          <p>For inquiries: ${this.companyInfo.phone} | ${this.companyInfo.email}</p>
          <p>${this.companyInfo.name} - ${this.companyInfo.address}</p>
          <p>Generated on ${this.formatDateForDisplay(new Date().toISOString())}</p>
        </div>
      </div>
    `;
  }

  getCashierName(): string {
    try {
      const userData = this.userService.getUserData() as any;
      
      if (userData) {
        return userData.username || 'Cashier';
      }
      
      return 'Cashier';
      
    } catch (error) {
      console.log('Error getting cashier name:', error);
      return 'Cashier';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'ready': return 'fa-check-circle';
      case 'confirmed': return 'fa-check-circle';
      case 'delivered': return 'fa-check-double';
      case 'pending': return 'fa-clock';
      default: return 'fa-circle';
    }
  }

   getPaymentStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid': return 'fa-check-circle';
      case 'unpaid': return 'fa-clock';
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

  refreshOrders() {
    console.log('🔄 Manual refresh triggered');
    this.loadPaidOrders();
  }

  exportToCSV() {
    console.log('📥 Exporting to CSV...');
    
    const headers = [
      'Order No', 'Table', 'Date', 'Status', 'Payment Method', 
      'Total Amount', 'Items Count', 'Waiter', 'Chef', 'Cashier',
      'Items Details', 'Note'
    ];
    
    const csvData = this.filteredOrders.map(order => [
      `"${order.orderNo}"`,
      order.table,
      `"${this.formatDateForDisplay(order.date || '')}"`,
      order.status,
      order.payment || 'Unknown',
      this.formatAmount(this.getOrderTotal(order)),
      order.items.length,
      `"${order.createdBy || ''}"`,
      `"${order.preparedBy || ''}"`,
      `"${order.paidBy || ''}"`,
      `"${order.items.map(item => `${item.name} (x${item.qty})`).join('; ')}"`,
      `"${order.note || ''}"`
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

  forceSyncWithCashier() {
    console.log('🔄 Force syncing with cashier page data...');
    
    // Clear any cached data
    // localStorage.removeItem(this.HISTORY_BACKUP_KEY);
    
    // Reload from cashier localStorage
    this.loadPaidOrders();
    
    console.log('✅ Successfully synced with cashier page data!');
  }

  ngOnDestroy() {
    console.log('🛑 History component destroyed');
    
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
  }
}