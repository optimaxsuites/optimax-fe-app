import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PosServiceService } from '../../service/pos-service.service';
import { CheckoutService } from '../../service/checkout.service';
import { Subscription } from 'rxjs';
import { UserService } from '../../service/user.service';
import { ImageCacheService } from '../../service/image-cache.service';
import { lastValueFrom } from 'rxjs';

// Use the existing TableOrderStatusGET interface from your imports
import { TableOrderStatusGET } from "../../models/interfaces/kitchen";
import { ProductData } from "../../models/interface";

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
  table: number;
  orderNo: string;
  items: OrderItem[];
  status: string;
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
  // NEW: Staff tracking fields
  createdBy?: string;
  createdById?: string | number;
  preparedBy?: string;
  preparedById?: string | number;
  servedBy?: string;
  servedById?: string | number;
  paidBy?: string;
  paidById?: string | number;
  staffInvolved?: StaffInvolved[];
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
  searchText: string = '';
  selectedDate: string = '';
  statusFilter: string = '';
  paymentMethodFilter: string = '';
  
  // NEW: Staff filtering properties
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

  // For timeline view
  selectedOrderForTimeline: Order | null = null;

  // For receipt/print functionality
  selectedOrderForReceipt: Order | null = null;
  isPrinting: boolean = false;

  // UPDATED: Company information from session storage
  companyInfo = {
    name: 'Restaurant Name',
    address: 'Address will load from session storage',
    phone: 'Phone number',
    email: 'Email address',
    vatNumber: 'VAT-Number'
  };

  // Image cache
  private imageCache = new Map<number, string>();

  // Make Math available in template
  Math = Math;

  // Cached statistics for performance
  private _todayOrders: Order[] = [];
  private _todayRevenue: number = 0;
  private _totalRevenue: number = 0;

  // ADDED: Local storage key to match cashier page
  private readonly CASHIER_STORAGE_KEY = 'restaurant_orders_data';
  
  // NEW: Staff data
  availableStaff: StaffMember[] = [];
  currentUser: StaffMember | null = null;
  private readonly STAFF_STORAGE_KEY = 'restaurant_staff_data';

  constructor(
    private posService: PosServiceService,
    private checkoutService: CheckoutService,
    private cdr: ChangeDetectorRef,
    private userService: UserService,
    private imageCacheService: ImageCacheService
  ) {}

  ngOnInit() {
    console.log('🚀 History component initialized');
    
    // UPDATED: Get company info from session storage FIRST
    this.getCompanyInfoFromSessionStorage();
    
    this.initializeCurrentUser();
    this.loadStaffData();
    this.loadPaidOrders();
  }

  // ===== NEW: GET COMPANY INFO FROM SESSION STORAGE =====
  private getCompanyInfoFromSessionStorage(): void {
    try {
      const userDataStr = sessionStorage.getItem('userPrimaryInfoRegData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        
        // Extract company information
        this.companyInfo = {
          name: userData.companyName || 'Restaurant Name',
          address: this.formatAddress(userData),
          phone: userData.phoneNumber || 'Not specified',
          email: userData.email || 'Not specified',
          vatNumber: userData.vatNumber || `VAT-${userData.id || '000000'}`
        };
        
        console.log('🏢 Company info loaded from session storage in history:', this.companyInfo);
      } else {
        console.warn('⚠️ No user data found in session storage (history), using default company info');
        this.setDefaultCompanyInfo();
      }
    } catch (error) {
      console.error('❌ Error getting company info from session storage:', error);
      this.setDefaultCompanyInfo();
    }
  }

  // Helper method to format address from session storage data
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

  // Set default company info if session storage fails
  private setDefaultCompanyInfo(): void {
    this.companyInfo = {
      name: 'Restaurant Name',
      address: '123 Main Street, City, Country',
      phone: '+234 123 456 7890',
      email: 'info@restaurant.com',
      vatNumber: 'VAT-123456789'
    };
  }

  // ===== NEW: INITIALIZE CURRENT USER =====
  private initializeCurrentUser() {
    try {
      // Use type assertion to avoid import issues
      const userData = this.userService.getUserData() as any;
      if (userData) {
        // Extract name from user data - handle different possible structures
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
      }
    } catch (error) {
      console.error('❌ Error getting current user:', error);
    }
  }

  // ===== NEW: DETERMINE USER ROLE =====
  private determineUserRole(userData: any): 'waiter' | 'chef' | 'cashier' {
    if (!userData) return 'waiter';
    
    // Check role from user data
    const role = userData.role || userData.userType || '';
    
    if (role.toLowerCase().includes('cashier')) return 'cashier';
    if (role.toLowerCase().includes('chef') || role.toLowerCase().includes('kitchen')) return 'chef';
    if (role.toLowerCase().includes('waiter') || role.toLowerCase().includes('server')) return 'waiter';
    
    // Default based on permissions
    return 'waiter';
  }

  // ===== NEW: LOAD STAFF DATA =====
  private async loadStaffData() {
    try {
      // First try to get from localStorage (populated by POS system)
      const savedStaff = localStorage.getItem(this.STAFF_STORAGE_KEY);
      if (savedStaff) {
        this.availableStaff = JSON.parse(savedStaff);
        console.log('👥 Loaded staff from localStorage:', this.availableStaff.length);
      }
      
      // If no staff in localStorage, create sample data
      if (this.availableStaff.length === 0) {
        this.availableStaff = this.createSampleStaff();
        this.saveStaffToLocalStorage();
      }
      
      // Add current user if not in list
      if (this.currentUser && !this.availableStaff.find(s => s.id === this.currentUser?.id)) {
        this.availableStaff.push(this.currentUser);
      }
      
    } catch (error) {
      console.error('❌ Error loading staff data:', error);
      this.availableStaff = this.createSampleStaff();
    }
  }

  // ===== NEW: CREATE SAMPLE STAFF DATA =====
  private createSampleStaff(): StaffMember[] {
    return [
      { id: 'waiter-1', name: 'John Doe', role: 'waiter', username: 'john', email: 'john@restaurant.com' },
      { id: 'waiter-2', name: 'Jane Smith', role: 'waiter', username: 'jane', email: 'jane@restaurant.com' },
      { id: 'chef-1', name: 'Chef Gordon', role: 'chef', username: 'gordon', email: 'gordon@restaurant.com' },
      { id: 'chef-2', name: 'Chef Maria', role: 'chef', username: 'maria', email: 'maria@restaurant.com' },
      { id: 'cashier-1', name: 'Cashier Mike', role: 'cashier', username: 'mike', email: 'mike@restaurant.com' },
      { id: 'cashier-2', name: 'Cashier Sarah', role: 'cashier', username: 'sarah', email: 'sarah@restaurant.com' }
    ];
  }

  // ===== NEW: SAVE STAFF TO LOCALSTORAGE =====
  private saveStaffToLocalStorage() {
    try {
      localStorage.setItem(this.STAFF_STORAGE_KEY, JSON.stringify(this.availableStaff));
    } catch (error) {
      console.error('Error saving staff data:', error);
    }
  }

  // FIXED: Make this method public for template access
  getStaffById(staffId: string | number): StaffMember | undefined {
    return this.availableStaff.find(staff => 
      staff.id === staffId || staff.id?.toString() === staffId?.toString()
    );
  }

  // ===== UPDATED: MAIN ORDER LOADING METHOD =====
  loadPaidOrders() {
    this.isLoading = true;
    this.errorMessage = '';
    
    // FIRST: Load from localStorage (where cashier saves paid orders)
    const localStorageOrders = this.getLocalStoragePaidOrders();
    console.log('📦 Found paid orders in localStorage:', localStorageOrders.length);
    
    // SECOND: Also fetch from backend API
    const startTime = performance.now();
    console.log('📡 Fetching paid orders from backend...');
    
    this.ordersSubscription = this.posService.getTableOrderStatuses().subscribe({
      next: (tableOrders: TableOrderStatusGET[]) => {
        console.log('📋 Raw API orders from backend:', tableOrders);
        console.log(`📊 Total orders from backend: ${tableOrders.length}`);
        
        // Convert backend orders
        const backendOrders = this.filterAndConvertPaidOrders(tableOrders);
        console.log(`💰 Paid orders from backend: ${backendOrders.length}`);
        
        // MERGE: Combine both sources, prioritizing localStorage (more recent)
        this.orders = this.mergeOrders(backendOrders, localStorageOrders);
        
        // NEW: Enrich orders with staff information
        this.enrichOrdersWithStaffData();
        
        console.log('✅ Combined paid orders:', this.orders);
        console.log(`✅ Final paid orders count: ${this.orders.length}`);
        
        // Update statistics and filters
        this.updateStatistics();
        this.applyFilters();
        this.isLoading = false;
        this.trackPerformance('Load paid orders', startTime);
        
        // Save to localStorage as backup
        // this.saveOrdersToLocalStorage();

        this.cdr.detectChanges();
        // Save combined results to local storage as backup
        this.saveCombinedOrdersToLocalStorage();
      },
      error: (error) => {
        console.error('❌ Error loading orders from backend:', error);
        this.errorMessage = 'Failed to load orders from server. Using local data.';
        
        // Use localStorage as primary source if backend fails
        this.orders = localStorageOrders;
        this.enrichOrdersWithStaffData();
        this.updateStatistics();
        this.applyFilters();
        this.isLoading = false;
        this.trackPerformance('Load paid orders (with error)', startTime);
      }
    });
  }

  // NEW: Enrich orders with staff data
  private enrichOrdersWithStaffData() {
    this.orders.forEach(order => {
      // Try to extract staff information from order data
      if (!order.staffInvolved) {
        order.staffInvolved = this.extractStaffFromOrder(order);
      }
      
      // Set individual fields for easier filtering
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

  // NEW: Extract staff from order data
  private extractStaffFromOrder(order: Order): StaffInvolved[] {
    const staffInvolved: StaffInvolved[] = [];
    
    // Check if we have timeline data
    const timeline = this.getOrderTimeline(order.orderNo);
    
    timeline.forEach(event => {
      if (event.performedBy && event.role) {
        staffInvolved.push({
          staffId: event.performedById || event.performedBy.toLowerCase().replace(' ', '-'),
          staffName: event.performedBy,
          role: event.role,
          action: event.action,
          timestamp: event.timestamp
        });
      }
    });
    
    // If no timeline data, infer from order properties
    if (staffInvolved.length === 0) {
      // Infer waiter from order creation
      if (!order.createdBy) {
        staffInvolved.push({
          staffId: 'waiter-1',
          staffName: 'John Doe',
          role: 'waiter',
          action: 'Order created',
          timestamp: order.createdAt || order.date || new Date().toISOString()
        });
      }
      
      // Infer chef if order is prepared/completed
      if (order.status === 'completed' || order.status === 'confirmed') {
        staffInvolved.push({
          staffId: 'chef-1',
          staffName: 'Chef Gordon',
          role: 'chef',
          action: 'Order prepared',
          timestamp: order.paidAt || order.date || new Date().toISOString()
        });
      }
      
      // Infer cashier if order is paid
      if (order.isPaid || order.paymentStatus === 'PAID') {
        staffInvolved.push({
          staffId: 'cashier-1',
          staffName: 'Cashier Mike',
          role: 'cashier',
          action: 'Payment processed',
          timestamp: order.paidAt || order.date || new Date().toISOString()
        });
      }
    }
    
    return staffInvolved;
  }

  // ===== NEW: GET PAID ORDERS FROM LOCALSTORAGE (CASHIER PAGE) =====
  private getLocalStoragePaidOrders(): Order[] {
    try {
      const savedData = localStorage.getItem(this.CASHIER_STORAGE_KEY);
      if (!savedData) {
        console.log('📭 No localStorage data found');
        return [];
      }
      
      const parsedData = JSON.parse(savedData);
      console.log('📖 Parsed localStorage data:', {
        allOrders: parsedData.allOrders?.length || 0,
        orders: parsedData.orders?.length || 0,
        historyOrders: parsedData.historyOrders?.length || 0
      });
      
      // Get all orders that are marked as paid from all arrays
      const allPaidOrders: Order[] = [];
      
      // Check historyOrders first (these should be paid)
      if (parsedData.historyOrders && Array.isArray(parsedData.historyOrders)) {
        parsedData.historyOrders.forEach((order: any) => {
          if (this.isOrderPaid(order)) {
            const convertedOrder = this.convertLocalStorageOrder(order);
            // Try to extract staff info from local storage order
            this.enrichLocalStorageOrder(convertedOrder, order);
            allPaidOrders.push(convertedOrder);
          }
        });
      }
      
      // Check allOrders
      if (parsedData.allOrders && Array.isArray(parsedData.allOrders)) {
        parsedData.allOrders.forEach((order: any) => {
          if (this.isOrderPaid(order) && !allPaidOrders.some(o => o.orderNo === order.orderNo)) {
            const convertedOrder = this.convertLocalStorageOrder(order);
            this.enrichLocalStorageOrder(convertedOrder, order);
            allPaidOrders.push(convertedOrder);
          }
        });
      }
      
      console.log(`💰 Found ${allPaidOrders.length} paid orders in localStorage`);
      return allPaidOrders;
      
    } catch (error) {
      console.error('❌ Error reading localStorage:', error);
      return [];
    }
  }

  // NEW: Enrich localStorage order with staff data
  private enrichLocalStorageOrder(order: Order, originalData: any) {
    // Try to get staff info from original data
    if (originalData.createdBy) {
      order.createdBy = originalData.createdBy;
    }
    if (originalData.preparedBy) {
      order.preparedBy = originalData.preparedBy;
    }
    if (originalData.paidBy) {
      order.paidBy = originalData.paidBy;
    }
    if (originalData.servedBy) {
      order.servedBy = originalData.servedBy;
    }
    
    // Try to find staff IDs
    if (order.createdBy) {
      const staff = this.getStaffByName(order.createdBy);
      if (staff) {
        order.createdById = staff.id;
      }
    }
    if (order.preparedBy) {
      const staff = this.getStaffByName(order.preparedBy);
      if (staff) {
        order.preparedById = staff.id;
      }
    }
    if (order.paidBy) {
      const staff = this.getStaffByName(order.paidBy);
      if (staff) {
        order.paidById = staff.id;
      }
    }
  }

  // NEW: Get staff member by name
  private getStaffByName(staffName: string): StaffMember | undefined {
    return this.availableStaff.find(staff => 
      staff.name.toLowerCase().includes(staffName.toLowerCase()) ||
      staff.username?.toLowerCase().includes(staffName.toLowerCase())
    );
  }

  // ===== NEW: CHECK IF ORDER IS PAID =====
  private isOrderPaid(order: any): boolean {
    return (
      order.isPaid === true || 
      order.paymentStatus === 'PAID' ||
      order.status === 'CONFIRMED' ||
      (order.paidAt && order.paidAt !== '') ||
      (order.paymentMethod && order.paymentMethod !== '')
    );
  }

  // ===== NEW: CONVERT LOCALSTORAGE ORDER TO HISTORY FORMAT =====
  private convertLocalStorageOrder(localOrder: any): Order {
    // Ensure date is properly formatted
    let orderDate = localOrder.date || localOrder.createdAt || localOrder.paidAt || '';
    if (!orderDate && localOrder.paidAt) {
      orderDate = localOrder.paidAt;
    }
    
    // Determine payment method
    let paymentMethod = localOrder.paymentMethod || 'Cash';
    if (!paymentMethod && localOrder.isPaid) {
      paymentMethod = 'Cash';
    }
    
    // Convert items format if needed
    const items: OrderItem[] = localOrder.items ? localOrder.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.qty,
      total: item.total,
      image: item.image,
      category: item.category
    })) : [];
    
    return {
      table: localOrder.table || 1,
      orderNo: localOrder.orderNo || `LOCAL-${Date.now()}`,
      items: items,
      status: localOrder.status || 'confirmed',
      payment: paymentMethod,
      date: orderDate,
      createdAt: orderDate,
      note: localOrder.note || '',
      backendId: localOrder.backendId,
      orderId: localOrder.orderId,
      paymentMethod: paymentMethod,
      isPaid: localOrder.isPaid,
      paymentStatus: localOrder.paymentStatus || 'PAID',
      paidAt: localOrder.paidAt,
      // Staff fields
      createdBy: localOrder.createdBy,
      createdById: localOrder.createdById,
      preparedBy: localOrder.preparedBy,
      preparedById: localOrder.preparedById,
      servedBy: localOrder.servedBy,
      servedById: localOrder.servedById,
      paidBy: localOrder.paidBy,
      paidById: localOrder.paidById,
      staffInvolved: localOrder.staffInvolved
    };
  }

  // ===== NEW: MERGE ORDERS FROM BOTH SOURCES =====
  private mergeOrders(backendOrders: Order[], localStorageOrders: Order[]): Order[] {
    const orderMap = new Map<string, Order>();
    
    // Add backend orders first
    backendOrders.forEach(order => {
      if (order.orderNo) {
        orderMap.set(order.orderNo, order);
      }
    });
    
    // Add localStorage orders (overwrite if same orderNo, as they're more recent)
    localStorageOrders.forEach(order => {
      if (order.orderNo) {
        // If order already exists from backend, check dates to see which is more recent
        const existingOrder = orderMap.get(order.orderNo);
        if (existingOrder) {
          const existingDate = this.parseCustomDate(existingOrder.date || '');
          const newDate = this.parseCustomDate(order.date || '');
          
          // Keep the more recent order
          if (newDate.getTime() > existingDate.getTime()) {
            orderMap.set(order.orderNo, order);
          }
        } else {
          orderMap.set(order.orderNo, order);
        }
      }
    });
    
    // Convert map back to array
    const mergedOrders = Array.from(orderMap.values());
    
    console.log(`🔄 Merged ${backendOrders.length} backend + ${localStorageOrders.length} local = ${mergedOrders.length} total orders`);
    
    return mergedOrders;
  }

  // ===== NEW: SAVE COMBINED ORDERS TO LOCALSTORAGE =====
  private saveCombinedOrdersToLocalStorage() {
    try {
      const backupData = {
        combinedOrders: this.orders,
        lastSynced: new Date().toISOString(),
        source: 'history-component'
      };
      localStorage.setItem('kitchenHistoryCombinedOrders', JSON.stringify(backupData));
      console.log('💾 Saved combined orders to localStorage as backup');
    } catch (error) {
      console.error('❌ Error saving combined orders:', error);
    }
  }

  // ===== DATE PARSING METHODS =====
  parseCustomDate(dateString: string): Date {
    if (!dateString) return new Date();
    
    try {
      // Handle the format: "2025-11-27-4-0-51-210000000"
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

  // FIXED: Improved filtering for PAID orders
  private filterAndConvertPaidOrders(tableOrders: TableOrderStatusGET[]): Order[] {
    if (!tableOrders || !Array.isArray(tableOrders)) {
      console.warn('⚠️ No table orders found or invalid data format');
      return [];
    }

    console.log('🔍 Filtering for PAID orders from backend...');
    
    const paidOrders = tableOrders.filter(tableOrder => {
      const status = tableOrder.status?.toUpperCase();
      const orderStatus = tableOrder.order?.orderStatus?.toUpperCase();
      
      const isPaid = status === 'PAID' || orderStatus === 'PAID';
      const hasPayment = tableOrder.order?.payment || 
                         (tableOrder.order as any)?.['paymentMethod'];
      
      return isPaid || hasPayment;
    });

    console.log(`✅ Found ${paidOrders.length} paid orders from ${tableOrders.length} total backend orders`);
    
    return paidOrders.map(tableOrder => this.convertToLocalOrder(tableOrder));
  }

  // Convert TableOrderStatusGET to your local Order format
  private convertToLocalOrder(tableOrder: TableOrderStatusGET): Order {
    const order = tableOrder.order || {};
    
    // Determine effective status
    let effectiveStatus = tableOrder.status?.toUpperCase();
    if (effectiveStatus === 'PAID') {
      effectiveStatus = 'PAID';
    } else if (order.orderStatus === 'PAID') {
      effectiveStatus = 'PAID';
    } else if (order.payment) {
      effectiveStatus = 'PAID';
    }
    
    // Format date properly
    let formattedDate = '';
    if (tableOrder.orderedOn) {
      if (Array.isArray(tableOrder.orderedOn)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = tableOrder.orderedOn;
        formattedDate = `${year}-${month}-${day}-${hour}-${minute}-${second}`;
      } else if (typeof tableOrder.orderedOn === 'string') {
        formattedDate = tableOrder.orderedOn;
      }
    }
    
    // Try to extract staff information from backend order
    let createdBy = '';
    let preparedBy = '';
    let paidBy = '';
    
    // This would depend on your backend structure
    const anyOrder = order as any;
    if (anyOrder.createdBy) {
      createdBy = anyOrder.createdBy;
    }
    
    const localOrder: Order = {
      table: this.convertTableNumber(tableOrder.tableNumber),
      orderNo: order.orderNumber || `T${tableOrder.tableNumber}-${tableOrder.id}`,
      items: this.convertOrderItems(order.orderItem || []),
      status: effectiveStatus?.toLowerCase() || 'unknown',
      payment: this.getPaymentMethod(order),
      date: formattedDate,
      createdAt: formattedDate,
      note: tableOrder.note || '',
      backendId: tableOrder.id,
      orderId: order.id,
      paymentMethod: this.getPaymentMethod(order),
      isPaid: true,
      paymentStatus: 'PAID',
      // Staff fields
      createdBy: createdBy,
      preparedBy: preparedBy,
      paidBy: paidBy
    };

    console.log('🔄 Converted backend order:', {
      orderNo: localOrder.orderNo,
      table: localOrder.table,
      status: localOrder.status,
      createdBy: localOrder.createdBy
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
        category: product.productCategory?.name || '',
        product: product
      };
    });
  }

  // Get payment method from order
  private getPaymentMethod(order: any): string {
    if (order.paymentMethod) return order.paymentMethod;
    if (order.payment?.paymentMethod) return order.payment.paymentMethod;
    if (order.orderStatus === 'PAID' || order.status === 'PAID') {
      return 'Cash';
    }
    return 'Unknown';
  }

  // Convert table number string to number
  private convertTableNumber(tableNumber: string): number {
    if (!tableNumber) return 1;
    const num = parseInt(tableNumber.replace(/\D/g, ''));
    return isNaN(num) ? 1 : num;
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
      if (!order.date) return false;
      const orderDate = this.parseCustomDate(order.date);
      return orderDate.toDateString() === today.toDateString();
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

  // ===== UPDATED FILTERING AND PAGINATION METHODS =====
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
      
      // NEW: Staff role filter
      const matchesRole = !this.selectedRoleFilter || this.doesOrderInvolveRole(order, this.selectedRoleFilter);
      
      // NEW: Specific staff filter
      const matchesStaff = !this.selectedStaffFilter || this.doesOrderInvolveStaff(order, this.selectedStaffFilter);
      
      // NEW: Show only my activities
      const matchesMyActivities = !this.showOnlyMyActivities || this.doesOrderInvolveCurrentUser(order);
      
      return matchesSearch && matchesDate && matchesStatus && 
             matchesPayment && matchesRole && matchesStaff && matchesMyActivities;
    });
    
    console.log(`✅ Filtered orders: ${this.filteredOrders.length} of ${this.orders.length}`);
    
    this.sortOrders();
    this.currentPage = 1;
  }

  // NEW: Check if order involves a specific role
  private doesOrderInvolveRole(order: Order, role: string): boolean {
    if (!role) return true;
    
    // Check direct fields
    if (role === 'waiter' && order.createdBy) return true;
    if (role === 'chef' && order.preparedBy) return true;
    if (role === 'cashier' && order.paidBy) return true;
    
    // Check staffInvolved array
    if (order.staffInvolved && order.staffInvolved.some(staff => staff.role === role)) {
      return true;
    }
    
    // Fallback: Check timeline
    const timeline = this.getOrderTimeline(order.orderNo);
    if (timeline.some(event => event.role === role)) {
      return true;
    }
    
    return false;
  }

  // NEW: Check if order involves specific staff
  private doesOrderInvolveStaff(order: Order, staffId: string | number): boolean {
    if (!staffId) return true;
    
    // Check direct fields
    const staffIdStr = staffId.toString();
    if (order.createdById?.toString() === staffIdStr || 
        order.preparedById?.toString() === staffIdStr || 
        order.paidById?.toString() === staffIdStr || 
        order.servedById?.toString() === staffIdStr) {
      return true;
    }
    
    // Check staffInvolved array
    if (order.staffInvolved && order.staffInvolved.some(staff => staff.staffId?.toString() === staffIdStr)) {
      return true;
    }
    
    // Check by name
    const staff = this.getStaffById(staffId);
    if (staff) {
      if (order.createdBy === staff.name || order.preparedBy === staff.name || 
          order.paidBy === staff.name || order.servedBy === staff.name) {
        return true;
      }
    }
    
    return false;
  }

  // NEW: Check if order involves current user
  private doesOrderInvolveCurrentUser(order: Order): boolean {
    if (!this.currentUser) return true;
    
    return this.doesOrderInvolveStaff(order, this.currentUser.id);
  }

  // NEW: Apply staff filter only
  applyStaffFilter() {
    console.log('👤 Applying staff filter...');
    this.applyFilters();
  }

  // NEW: Show only my activities
  showMyActivitiesOnly() {
    this.showOnlyMyActivities = true;
    this.selectedRoleFilter = '';
    this.selectedStaffFilter = '';
    this.applyFilters();
  }

  // NEW: Clear staff filters
  clearStaffFilters() {
    this.selectedRoleFilter = '';
    this.selectedStaffFilter = '';
    this.showOnlyMyActivities = false;
    this.applyFilters();
  }

  private sortOrders() {
    // Sort by date (newest first)
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
    this.clearStaffFilters(); // NEW: Clear staff filters too
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
    const orderDate = this.parseCustomDate(dateString);
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

  // ===== STATISTICS METHODS =====
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

  // ===== RECEIPT/PRINT METHODS =====
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

  // UPDATED: Generate receipt HTML with company info from session storage
  private generateReceiptHTML(order: Order): string {
    const subtotal = this.getOrderTotal(order);
    const tax = subtotal * 0.05;
    const grandTotal = subtotal + tax;
    
    // Determine source for display
    const source = order.backendId ? 'Backend System' : 'Local System (Cashier)';
    
    // NEW: Staff information section
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
                <td style="text-align: right;">₦${item.price.toLocaleString()}</td>
                <td style="text-align: right;">₦${item.total.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₦${subtotal.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Tax (5%):</span>
            <span>₦${tax.toLocaleString()}</span>
          </div>
          <div class="summary-row total-row">
            <span>TOTAL:</span>
            <span>₦${grandTotal.toLocaleString()}</span>
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

  // ===== ICON METHODS =====
  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid': return 'fa-check-circle';
      case 'confirmed': return 'fa-check-circle';
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
    console.log('👁️ View order details:', order);
    // Show detailed modal or navigate to details page
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
      this.getOrderTotal(order).toFixed(2),
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

  // ===== NEW: FORCE SYNC WITH CASHIER PAGE =====
  forceSyncWithCashier() {
    console.log('🔄 Force syncing with cashier page data...');
    
    // Clear any cached data
    localStorage.removeItem('kitchenHistoryCombinedOrders');
    
    // Reload orders
    this.loadPaidOrders();
    
    // Show success message
    alert('Successfully synced with cashier page data!');
  }

  // ===== NEW: CHECK DATA SOURCES =====
  debugDataSources() {
    console.log('🔍 Debugging data sources...');
    
    // Check cashier localStorage
    const cashierData = localStorage.getItem(this.CASHIER_STORAGE_KEY);
    console.log('Cashier localStorage data:', cashierData ? JSON.parse(cashierData) : 'No data');
    
    // Check history backup
    const historyBackup = localStorage.getItem('kitchenHistoryCombinedOrders');
    console.log('History backup data:', historyBackup ? JSON.parse(historyBackup) : 'No data');
    
    // Show summary
    alert(`Data Sources Debug:
      - Cashier localStorage: ${cashierData ? 'Found' : 'Not found'}
      - History backup: ${historyBackup ? 'Found' : 'Not found'}
      - Current orders: ${this.orders.length}
      - Filtered orders: ${this.filteredOrders.length}
      - Current user: ${this.currentUser?.name || 'Not set'}
      - Available staff: ${this.availableStaff.length}
    `);
  }

  // ===== NEW: ADD STAFF MANUALLY (for testing) =====
  addTestStaff() {
    const testStaff: StaffMember = {
      id: `test-${Date.now()}`,
      name: `Test Staff ${this.availableStaff.length + 1}`,
      role: 'waiter',
      username: `test${this.availableStaff.length + 1}`,
      email: `test${this.availableStaff.length + 1}@restaurant.com`
    };
    
    this.availableStaff.push(testStaff);
    this.saveStaffToLocalStorage();
    alert(`Added test staff: ${testStaff.name}`);
  }

  ngOnDestroy() {
    console.log('🛑 History component destroyed');
    
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
  }
}