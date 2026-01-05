import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectorRef } from "@angular/core";
import { DecimalPipe } from '@angular/common';
import { Observable, of, lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BranchDTO,
  ProductData,
} from "../../models/interface";
import {
  OrderGET,
  OrderItemGET,
  OrderItemPOST,
  OrderPOST,
  TableOrderStatusGET,
  TableOrderStatusPOST
} from "../../models/interfaces/kitchen";
import { CheckoutService } from "../../service/checkout.service";
import { ImageCacheService } from "../../service/image-cache.service";
import { PaymentServiceService } from "../../service/payment-service.service";
import { PosServiceService } from "../../service/pos-service.service";
import { ProductHelperService } from "../../service/product-helper.service";
import { UserService } from "../../service/user.service";
import { arrayToDate, dateToArray } from "../../shared";
import { isSuperUser, getUserPermissionsFor } from "../../../shared/pipes/helper";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
}

interface OrderItem extends MenuItem {
  qty: number;
  total: number;
  status?: string;
}

interface Order {
  table: number;
  orderNo: string;
  items: OrderItem[];
  status: 'PENDING' | 'PREPARING' | 'READY' | 'CONFIRMED' | 'CANCELLED' | 'AWAITING_CONFIRMATION';
  note?: string;
  date?: string;
  createdAt?: string;
  paymentMethod?: string;
  backendId?: number;
  orderId?: number;
  paymentId?: number;
  isPaid: boolean;
  paidAt?: string;
  paymentStatus: 'UNPAID' | 'PAID';
  transactionReference?: string;
  // Chef note box feature
  chefNote?: string;
  chefNoteTime?: string;
  // Staff tracking fields
  createdBy?: string;
  createdById?: string | number;
  createdByRole?: 'waiter' | 'chef' | 'cashier';
  preparedBy?: string;
  preparedById?: string | number;
  preparedByRole?: 'chef';
  servedBy?: string;
  servedById?: string | number;
  paidBy?: string;
  paidById?: string | number;
  paidByRole?: 'cashier';
  staffInvolved?: Array<{
    staffId: string | number;
    staffName: string;
    role: 'waiter' | 'chef' | 'cashier' | 'manager';
    action: 'created' | 'updated' | 'prepared' | 'served' | 'paid' | 'cancelled';
    timestamp: string;
  }>;
}

interface PaymentBreakdown {
  id?: number;
  amountPaid: number;
  transactionReference: string;
  paymentId?: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'CARD';
}

type TableOrder = Map<ProductData, number>;

interface StaffMember {
  id: string | number;
  name: string;
  role: 'waiter' | 'chef' | 'cashier' | 'manager';
  username?: string;
  email?: string;
}

@Component({
  selector: 'app-checkout-kitchen',
  templateUrl: './checkout-kitchen.component.html',
  styleUrls: ['./checkout-kitchen.component.scss']
})
export class CheckoutKitchenComponent implements OnInit {
  @Input() activePage: 'waiter' | 'chef' | 'cashier'| "history" = 'waiter';
  @Output() orderCompleted = new EventEmitter<Order>();

  waiterView: 'overview' | 'take-order' = 'overview';
  search = '';
  activeCategory = 'All';
  currentTable = 1;
  orderNote = '';
  orderNo = '#A' + Math.floor(1000 + Math.random() * 9000);
  isProcessingPayment = false;
  expandedOrder: Order | null = null;
  editingOrder: Order | null = null;
  originalOrderItems: OrderItem[] = [];
  originalOrderStatus: Order['status'] | null = null;

  menu: MenuItem[] = [];
  allOrders: Order[] = []; 
  orders: Order[] = []; 
  historyOrders: Order[] = [];
  orderItems: OrderItem[] = [];
  selectedOrder?: Order;

  isLoadingOrders = false;
  isServerDataAvailable = false;
  serverLoadError = false;

  chefNoteText: string = '';
  selectedChefNote: string = '';
  selectedChefNoteTime: string = '';
  showChefNoteModal: boolean = false;

  cashierFilter: 'all' | 'pending' | 'preparing' | 'ready' = 'all';

  showPaymentModal = false;
  selectedPaymentMethod?: 'CASH' | 'TRANSFER' | 'CARD';
  transferReference = '';
  cardReference = '';

  paymentMethods = [
    { 
      value: 'CASH' as const, 
      name: 'Cash', 
      icon: '💰', 
      description: 'Physical cash payment' 
    },
    { 
      value: 'TRANSFER' as const, 
      name: 'Bank Transfer', 
      icon: '🏦', 
      description: 'Bank transfer or mobile money' 
    },
    { 
      value: 'CARD' as const, 
      name: 'Card Payment', 
      icon: '💳', 
      description: 'Debit/Credit card payment' 
    }
  ];

  lowStockThreshold = 5;

  companyInfo = {
    name: 'Restaurant Name',
    address: 'Address will load from session storage',
    phone: 'Phone number',
    email: 'Email address',
    vatNumber: 'VAT-Number'
  };

  private imageCache = new Map<number, string>();

  orderPermissions = {
    canView: false,
    canEdit: false,
    canDelete: false,
    canCreate: false,
  };

  paymentPermissions = {
    canView: false,
    canEdit: false,
    canDelete: false,
    canCreate: false,
  };

  testMode: 'waiter' | 'chef' | 'cashier' | 'history' = 'waiter';
  tableData: TableOrder = new Map();
  selectedOrderSignal: TableOrderStatusGET | null = null;
  
  productCategories = new Map<string, ProductData[]>();
  currCategoryProducts: ProductData[] = [];

 
  isReceiptModalOpen = false;
  isCreateOrderModalOpen = false;
  isEditingOrder = false;
  isCreateOrderModalNoteDialogOpen = false;
  orderNoteSignal = "";
  isPaymentModalOpen = false;
  orderTableNumber = 1;

  private _productIdAndDataMap = new Map<number, ProductData>();
  private _fetchedBranches: BranchDTO[] = []; 
  private _tableStatuses = new Map<number, TableOrderStatusGET>();
  private readonly _dummyTableOrderStatus = 9999999;

  private readonly STORAGE_KEY = 'restaurant_orders_data';

  currentUser: StaffMember | null = null;
  availableStaff: StaffMember[] = [];

  constructor(
    private _posService: PosServiceService,
    private _checkoutService: CheckoutService,
    private _imageCacheService: ImageCacheService,
    private _paymentService: PaymentServiceService,
    private _productHelperService: ProductHelperService,
    private _userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('🚀 Kitchen component initialized');
    
  
    this.initializeCurrentUser();
    this.getCompanyInfoFromSessionStorage();
    this.loadFromLocalStorage();
    this.initializeCompanyData();
    
    if (isSuperUser()) {
      this.orderPermissions = {
        canView: true,
        canEdit: true,
        canDelete: true,
        canCreate: true,
      };
      this.paymentPermissions = {
        canView: true,
        canEdit: true,
        canDelete: true,
        canCreate: true,
      };
    } else {
      this.orderPermissions = getUserPermissionsFor('POS_KITCHEN_WAITER');
      this.paymentPermissions = getUserPermissionsFor('POS_KITCHEN_CASHIER');
    }

    this.testMode = this.orderPermissions.canCreate ? "waiter" : this.paymentPermissions.canCreate ? "cashier" : "chef";
    
    this.findNextAvailableTable();
    this.setupAutoRefresh();
  }
  private setupAutoRefresh() {
    setInterval(() => {
      if (this.activePage === 'chef') {
        this.refreshChefOrders();
      }
    }, 5000);
  }
  refreshChefOrders() {
    console.log('🔄 Manually refreshing chef orders...');
    this.cdr.detectChanges();
    
    const chefOrders = this.activeChefOrders;
    console.log(`👨‍🍳 Chef orders refreshed: ${chefOrders.length} orders`);
  }

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
        
        console.log('🏢 Company info loaded from session storage:', this.companyInfo);
      } else {
        console.warn('⚠️ No user data found in session storage, using default company info');
        this.setDefaultCompanyInfo();
      }
    } catch (error) {
      console.error('❌ Error getting company info from session storage:', error);
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
      const sessionUserDataStr = sessionStorage.getItem('userPrimaryInfoRegData');
      let userData: any = null;
      
      if (sessionUserDataStr) {
        userData = JSON.parse(sessionUserDataStr);
        console.log('📋 User data from session storage:', userData);
      }

      if (!userData) {
        userData = this._userService.getUserData();
        console.log('📋 User data from UserService:', userData);
      }
      
      if (userData) {
        let userName = '';
        let userRole: 'waiter' | 'chef' | 'cashier' | 'manager' = 'cashier';
        
        if (userData.fullName) {
          userName = userData.fullName;
        } else if (userData.name) {
          userName = userData.name;
        } else if (userData.firstName && userData.lastName) {
          userName = `${userData.firstName} ${userData.lastName}`;
        } else if (userData.username) {
          userName = userData.username;
        } else {
          userName = 'User';
        }
        
        const roleString = (userData.role || userData.userType || '').toLowerCase();
        if (roleString.includes('cashier')) {
          userRole = 'cashier';
        } else if (roleString.includes('chef') || roleString.includes('kitchen')) {
          userRole = 'chef';
        } else if (roleString.includes('waiter') || roleString.includes('server')) {
          userRole = 'waiter';
        } else if (roleString.includes('manager') || roleString.includes('admin')) {
          userRole = 'manager';
        }
        
        this.currentUser = {
          id: userData.id || userData.userId || userData.username || 'current-user',
          name: userName,
          role: userRole,
          username: userData.username,
          email: userData.email
        };
        
        console.log('👤 Current user initialized with REAL data:', this.currentUser);
     
        this.availableStaff = [this.currentUser];
        
      } else {
        console.warn('⚠️ No user data found, cannot initialize current user');
        this.currentUser = null;
      }
      
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      this.currentUser = null;
    }
  }

  saveChefNoteAndSetAwaiting() {
    if (!this.selectedOrder || !this.chefNoteText.trim()) return;
    
    this.selectedOrder.chefNote = this.chefNoteText;
    this.selectedOrder.chefNoteTime = new Date().toISOString();
    
    this.selectedOrder.status = 'AWAITING_CONFIRMATION';
    
    if (this.currentUser) {
      if (!this.selectedOrder.staffInvolved) {
        this.selectedOrder.staffInvolved = [];
      }
      
      this.selectedOrder.staffInvolved.push({
        staffId: this.currentUser.id,
        staffName: this.currentUser.name,
        role: this.currentUser.role,
        action: 'updated',
        timestamp: new Date().toISOString()
      });
      
      if (this.currentUser.role === 'chef') {
        this.selectedOrder.preparedBy = this.currentUser.name;
        this.selectedOrder.preparedById = this.currentUser.id;
        this.selectedOrder.preparedByRole = 'chef';
      }
    }
    
    this.saveToLocalStorage();
    
   
    this.chefNoteText = '';
    

    this.cdr.detectChanges();
  }

  confirmOrderChanges(order: Order) {

    order.status = 'PENDING';

    if (this.currentUser) {
      if (!order.staffInvolved) {
        order.staffInvolved = [];
      }
      
      order.staffInvolved.push({
        staffId: this.currentUser.id,
        staffName: this.currentUser.name,
        role: this.currentUser.role,
        action: 'updated',
        timestamp: new Date().toISOString()
      });
    }
    
    this.saveToLocalStorage();
    this.cdr.detectChanges();
  }

  cancelOrderByWaiter(order: Order) {
    order.status = 'CANCELLED';
    order.paymentStatus = 'UNPAID';
    order.isPaid = false;

    if (this.currentUser) {
      if (!order.staffInvolved) {
        order.staffInvolved = [];
      }
      
      order.staffInvolved.push({
        staffId: this.currentUser.id,
        staffName: this.currentUser.name,
        role: this.currentUser.role,
        action: 'cancelled',
        timestamp: new Date().toISOString()
      });
    }

    this.moveToHistory(order);
  
    if (this.expandedOrder === order) {
      this.expandedOrder = null;
    }
    
    this.cdr.detectChanges();
  }

  viewChefNote(note: string, time: string) {
    this.selectedChefNote = note;
    this.selectedChefNoteTime = time;
    this.showChefNoteModal = true;
  }

  closeChefNoteModal() {
    this.showChefNoteModal = false;
    this.selectedChefNote = '';
    this.selectedChefNoteTime = '';
  }

  setCashierFilter(filter: 'all' | 'pending' | 'preparing' | 'ready') {
    this.cashierFilter = filter;
  }

  getFilteredCashierOrders(): Order[] {
    switch (this.cashierFilter) {
      case 'pending':
        return this.getPendingAndAwaitingOrders();
      case 'preparing':
        return this.getPreparingOrders();
      case 'ready':
        return this.getReadyOrders();
      case 'all':
      default:
        return this.getAllActiveOrders();
    }
  }

  getAllActiveOrders(): Order[] {
  
    return this.orders
      .filter(o => !o.isPaid)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; 
      });
  }

  getPendingAndAwaitingOrders(): Order[] {
    return this.orders
      .filter(o => !o.isPaid && (o.status === 'PENDING' || o.status === 'AWAITING_CONFIRMATION'))
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; 
      });
  }

  getPreparingOrders(): Order[] {
    return this.orders
      .filter(o => !o.isPaid && o.status === 'PREPARING')
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  getReadyOrders(): Order[] {
    return this.orders
      .filter(o => !o.isPaid && o.status === 'READY')
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; 
      });
  }

  // ===== PAYMENT MODAL METHODS =====
  openPaymentModal() {
    if (!this.selectedOrder || this.selectedOrder.isPaid) return;
    
    this.showPaymentModal = true;
    this.selectedPaymentMethod = undefined;
    this.transferReference = '';
    this.cardReference = '';
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedPaymentMethod = undefined;
    this.transferReference = '';
    this.cardReference = '';
  }

  selectPaymentMethod(method: 'CASH' | 'TRANSFER' | 'CARD') {
    this.selectedPaymentMethod = method;
  }

  getPaymentIcon(method: 'CASH' | 'TRANSFER' | 'CARD'): string {
    const icons = {
      'CASH': '💰',
      'TRANSFER': '🏦',
      'CARD': '💳'
    };
    return icons[method];
  }

  getPaymentMethodDisplayName(method: 'CASH' | 'TRANSFER' | 'CARD'): string {
    const methodNames = {
      'CASH': 'Cash',
      'TRANSFER': 'Bank Transfer',
      'CARD': 'Card Payment'
    };
    return methodNames[method];
  }

  async confirmPayment() {
    if (!this.selectedOrder || !this.selectedPaymentMethod) return;

    try {
      this.isProcessingPayment = true;
      
      let transactionReference = '';
      if (this.selectedPaymentMethod === 'CASH') {
        transactionReference = `CASH-${Date.now()}`;
      } else if (this.selectedPaymentMethod === 'TRANSFER') {
        transactionReference = this.transferReference.trim();
      } else if (this.selectedPaymentMethod === 'CARD') {
        transactionReference = this.cardReference.trim();
      }

      this.selectedOrder.isPaid = true;
      this.selectedOrder.paymentStatus = 'PAID';
      this.selectedOrder.paidAt = new Date().toISOString();
      this.selectedOrder.paymentMethod = this.getPaymentMethodDisplayName(this.selectedPaymentMethod);
      this.selectedOrder.status = 'CONFIRMED';
      this.selectedOrder.transactionReference = transactionReference;
      
      if (this.currentUser) {
        if (!this.selectedOrder.staffInvolved) {
          this.selectedOrder.staffInvolved = [];
        }
        
        this.selectedOrder.staffInvolved.push({
          staffId: this.currentUser.id,
          staffName: this.currentUser.name,
          role: this.currentUser.role,
          action: 'paid',
          timestamp: new Date().toISOString()
        });
        
        this.selectedOrder.paidBy = this.currentUser.name;
        this.selectedOrder.paidById = this.currentUser.id;
        this.selectedOrder.paidByRole = this.currentUser.role === 'cashier' ? 'cashier' : 'cashier';
      }

      this.moveToHistory(this.selectedOrder);
      
      const paidOrder = { ...this.selectedOrder };
      
      this.closePaymentModal();
      this.selectedOrder = undefined;
      this.isProcessingPayment = false;
      
      this.cdr.detectChanges();
      
      setTimeout(() => {
        this.autoPrintInvoice(paidOrder);
      }, 300);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      this.isProcessingPayment = false;
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        this.allOrders = parsedData.allOrders || [];
        this.orders = parsedData.orders || [];
        this.historyOrders = parsedData.historyOrders || [];
        
        console.log('Loaded orders from localStorage:', {
          allOrders: this.allOrders.length,
          orders: this.orders.length,
          historyOrders: this.historyOrders.length
        });
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      this.allOrders = [];
      this.orders = [];
      this.historyOrders = [];
    }
  }

  private saveToLocalStorage(): void {
    try {
      const dataToSave = {
        allOrders: this.allOrders,
        orders: this.orders,
        historyOrders: this.historyOrders,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('💾 Saved orders to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  parseCustomDate(dateString: string): Date {
    if (!dateString) return new Date();
    
    try {
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

  changeTestMode(mode: "waiter" | "chef" | "cashier" | "history") {
    this.testMode = mode;
    this.activePage = mode;
    this.cdr.detectChanges(); 
  }

  onTableNumberChange(): void {
    if (this.currentTable < 1) {
      this.currentTable = 1;
    } else if (this.currentTable > 100) {
      this.currentTable = 100;
    }
    
    this.orderTableNumber = this.currentTable;
  }

  private findNextAvailableTable(): void {
    const usedTables = new Set<number>();

    this.orders.forEach(order => {
      if (order.table) {
        usedTables.add(order.table);
      }
    });
    
    this._tableStatuses.forEach(tableStatus => {
      const tableNum = this.convertStrToNum(tableStatus.tableNumber);
      if (tableNum > 0) {
        usedTables.add(tableNum);
      }
    });
    
    let nextTable = 1;
    while (usedTables.has(nextTable)) {
      nextTable++;
      
      if (nextTable > 100) {
        break;
      }
    }
    
    this.currentTable = nextTable;
    this.orderTableNumber = nextTable;
  }

  getStockStatus(item: MenuItem): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (!item.stockQuantity && item.stockQuantity !== 0) {
      return 'in-stock';
    }
    
    if (item.stockQuantity === 0) {
      return 'out-of-stock';
    }
    
    if (item.stockQuantity <= this.lowStockThreshold) {
      return 'low-stock';
    }
    
    return 'in-stock';
  }

  getItemStockStatus(item: OrderItem): 'in-stock' | 'low-stock' | 'out-of-stock' {
    const menuItem = this.menu.find(m => m.id === item.id);
    if (!menuItem) return 'in-stock';
    return this.getStockStatus(menuItem);
  }

  getStockBadgeText(item: MenuItem): string {
    const status = this.getStockStatus(item);
    
    switch (status) {
      case 'out-of-stock':
        return 'Out of Stock';
      case 'low-stock':
        return `Low Stock (${item.stockQuantity})`;
      default:
        return '';
    }
  }

  canAddToOrder(item: MenuItem): boolean {
    return this.getStockStatus(item) !== 'out-of-stock';
  }

  toggleOrderExpansion(order: Order): void {
    if (this.expandedOrder === order) {
      this.expandedOrder = null;
    } else {
      this.expandedOrder = order;
    }
    this.cdr.detectChanges();
  }

  updateOrderStatus(order: Order, newStatus: Order['status']): void {
    order.status = newStatus;
    
    this.saveToLocalStorage();
    this.cdr.detectChanges();
  }

  editOrder(order: Order): void {
    if (!this.canEditOrder(order)) {
      return;
    }
    
    this.editingOrder = order;
    this.originalOrderItems = [...order.items];
    this.originalOrderStatus = order.status;
 
    this.orderItems = [...order.items];
    this.currentTable = order.table;
    this.orderNo = order.orderNo;
    this.orderNote = order.note || '';
    this.waiterView = 'take-order';
    
    console.log('Editing order:', order);
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    if (this.editingOrder && this.originalOrderStatus) {
      this.editingOrder.items = [...this.originalOrderItems];
      this.editingOrder.status = this.originalOrderStatus;
      this.editingOrder = null;
      this.originalOrderItems = [];
      this.originalOrderStatus = null;
    }
    
    this.clearOrderForm();
    this.waiterView = 'overview';
    this.cdr.detectChanges();
  }

  updateExistingOrder(): void {
    if (!this.editingOrder) return;
    
    if (this.orderItems.length === 0) {
      return;
    }

    this.editingOrder.items = [...this.orderItems];
    this.editingOrder.note = this.orderNote;
  
    if (this.editingOrder.status === 'PREPARING' || this.editingOrder.status === 'READY') {
      this.editingOrder.status = 'PENDING';
    }
  
    if (this.currentUser) {
      if (!this.editingOrder.staffInvolved) {
        this.editingOrder.staffInvolved = [];
      }
      
      this.editingOrder.staffInvolved.push({
        staffId: this.currentUser.id,
        staffName: this.currentUser.name,
        role: this.currentUser.role,
        action: 'updated',
        timestamp: new Date().toISOString()
      });
      
      this.editingOrder.createdBy = this.currentUser.name;
      this.editingOrder.createdById = this.currentUser.id;
      this.editingOrder.createdByRole = this.currentUser.role === 'waiter' ? 'waiter' : 'waiter';
    }

    this.editingOrder = null;
    this.originalOrderItems = [];
    this.originalOrderStatus = null;

    this.saveToLocalStorage();
 
    this.clearOrderForm();
    this.waiterView = 'overview';
    
    this.cdr.detectChanges();
  }

  private clearOrderForm(): void {
    this.orderItems = [];
    this.orderNo = '#A' + Math.floor(1000 + Math.random() * 9000);
    this.orderNote = '';
    this.findNextAvailableTable();
  }

  getCashierName(): string {
    try {
      if (this.currentUser) {
        return this.currentUser.name || 'Cashier';
      }
      
      const userData = this._userService.getUserData() as any;
      
      if (userData) {
        return userData.username || 'Cashier';
      }
      
      return 'Cashier';
      
    } catch (error) {
      console.log('Error getting cashier name:', error);
      return 'Cashier';
    }
  }

  printInvoice() {
    if (!this.selectedOrder) return;
    
    const printContent = this.generateReceiptHTML(this.selectedOrder);
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice - ${this.selectedOrder.orderNo}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
                .no-print { display: none; }
              }
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
    }
  }

  private autoPrintInvoice(order: Order) {
    const tempOrder = { ...order };
    
    const printContent = this.generateReceiptHTML(tempOrder);
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice - ${tempOrder.orderNo}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
                .no-print { display: none; }
              }
              body { font-family: Arial, sans-serif; padding: 20px; }
              .invoice-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2EB270; padding-bottom: 10px; }
              .company-name { color: #2EB270; margin: 0; }
              .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th { background-color: #2EB270; color: white; padding: 10px; text-align: left; }
              td { padding: 8px; border-bottom: 1px solid #ddd; }
              .summary { margin-top: 20px; border-top: 2px solid #ddd; padding-top: 10px; }
              .grand-total { font-size: 1.2em; font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px; }
              .thank-you { text-align: center; margin-top: 30px; font-style: italic; color: #666; }
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
            <script>
              // Auto-print after page loads
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

 
  private generateReceiptHTML(order: Order): string {

    const staffInfo = [];
    if (order.createdBy) staffInfo.push({ role: 'Waiter', name: order.createdBy });
    if (order.preparedBy) staffInfo.push({ role: 'Chef', name: order.preparedBy });
    if (order.paidBy) staffInfo.push({ role: 'Cashier', name: order.paidBy });
    
    return `
      <div class="invoice-header">
        <h1 class="company-name">${this.companyInfo.name}</h1>
        <p>${this.companyInfo.address}</p>
        <p>📞 ${this.companyInfo.phone} | ✉️ ${this.companyInfo.email}</p>
        ${this.companyInfo.vatNumber ? `<p>📋 ${this.companyInfo.vatNumber}</p>` : ''}
      </div>
      
      <div class="invoice-details">
        <div>
          <h3>TAX INVOICE</h3>
          <p><strong>Invoice #:</strong> ${order.orderNo}</p>
          <p><strong>Date:</strong> ${this.formatDateForDisplay(order.paidAt || order.date || '')}</p>
          <p><strong>Generated By:</strong> ${this.getCashierName()}</p>
        </div>
        <div>
          <p><strong>Table:</strong> ${order.table}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod || 'Cash'}</p>
          <p><strong>Status:</strong> ${order.isPaid ? 'PAID' : 'UNPAID'}</p>
        </div>
      </div>
      
      ${staffInfo.length > 0 ? `
        <div style="background-color: #f0f9f4; padding: 10px; border-radius: 5px; margin: 10px 0;">
          <h4 style="margin: 0 0 10px 0; color: #2E6276;">Staff Information</h4>
          ${staffInfo.map(staff => `
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span><strong>${staff.role}:</strong></span>
              <span>${staff.name}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${order.chefNote ? `
        <div style="background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 3px solid #ffc107;">
          <h4 style="margin: 0 0 5px 0; color: #856404;">💬 Chef's Note</h4>
          <p style="margin: 0; color: #856404;">${order.chefNote}</p>
        </div>
      ` : ''}
      
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.name}</td>
              <td>${item.qty}</td>
              <td>₦${item.price.toLocaleString()}</td>
              <td>₦${item.total.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="summary">
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Subtotal:</span>
          <span>₦${this.getSubtotal(order)?.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Tax (5%):</span>
          <span>₦${this.getTax(order)?.toLocaleString()}</span>
        </div>
        <div class="grand-total" style="display: flex; justify-content: space-between; margin: 10px 0;">
          <span>TOTAL:</span>
          <span>₦${this.getGrandTotal(order)?.toLocaleString()}</span>
        </div>
      </div>
      
      ${order.note ? `<div style="margin-top: 20px;"><strong>Customer Note:</strong> ${order.note}</div>` : ''}
      
      <div class="thank-you">
        <p>Thank you for dining with us!</p>
        <p>This is a computer generated receipt. No signature required.</p>
        <p>For inquiries: ${this.companyInfo.phone} | ${this.companyInfo.email}</p>
        <p>${this.companyInfo.name} - ${this.companyInfo.address}</p>
      </div>
    `;
  }

  canEditOrder(order: Order): boolean {
    return (order.status === 'PENDING' || order.status === 'AWAITING_CONFIRMATION') && !order.isPaid;
  }

  private async initializeCompanyData() {
    this.isLoadingOrders = true;
    this.serverLoadError = false;
    this.isServerDataAvailable = false;
    
    try {
      console.log('🔄 Initializing company data...');

      console.log('📋 Fetching table order statuses...');
      const fetchedTableOrderStatuses = await lastValueFrom(
        this._posService.getTableOrderStatuses()
      );
      
      if (fetchedTableOrderStatuses && fetchedTableOrderStatuses.length > 0) {
        this.isServerDataAvailable = true;
        
        this._tableStatuses = new Map(
          fetchedTableOrderStatuses.map((tableOrderStatus) => [
            tableOrderStatus.id,
            tableOrderStatus,
          ])
        );
        
        console.log(`✅ Successfully loaded ${fetchedTableOrderStatuses.length} table orders from server`);

        if (this.allOrders.length === 0) {
          this.syncOrdersWithCompanyData();
        }
      } else {
        console.warn('⚠️ No table orders found from server, using local data');
        this.serverLoadError = true;
      }

      console.log('🛒 Fetching products...');
      const fetchedProducts = await lastValueFrom(
        this._posService.getProducts()
      );
      
      if (fetchedProducts && fetchedProducts.length > 0) {
        console.log(`✅ Successfully loaded ${fetchedProducts.length} products from server`);
        
        this.productCategories.clear();
        this.menu = [];
        
        fetchedProducts.forEach((fetchedProduct) => {
          const {
            productCategory: { name: category },
            variants: possibleVariants,
          } = fetchedProduct;
          
          const variantProducts = possibleVariants.reduce<ProductData[]>(
            (acc, val) => [
              ...acc,
              { ...fetchedProduct, selectedVariants: [val] },
            ],
            [],
          );

          if (this.productCategories.has(category)) {
            this.productCategories
              .get(category)!
              .push(fetchedProduct, ...variantProducts);
          } else {
            this.productCategories.set(category, [
              fetchedProduct,
              ...variantProducts,
            ]);
          }
          this._productIdAndDataMap.set(fetchedProduct.id, fetchedProduct);
        });

        this.currCategoryProducts = this.productCategories.values().next().value ?? [];
        
        await this.mapProductsToMenu(fetchedProducts);
        
      } else {
        console.warn('⚠️ No products found from server');
        this.currCategoryProducts = [];
        this.menu = [];
      }

      this.findNextAvailableTable();

      this.cdr.detectChanges();
      
    } catch (error: any) {
      console.error('❌ Error initializing company data:', error);
      console.error('📋 Error details:', error.message || 'Unknown error');
      this.serverLoadError = true;
      this.currCategoryProducts = [];
      this.menu = [];
    } finally {
      this.isLoadingOrders = false;
      this.cdr.detectChanges();
    }
  }

  private syncOrdersWithCompanyData() {
    const newAllOrders: Order[] = [];
    const newOrders: Order[] = [];
    const newHistoryOrders: Order[] = [];

    for (const tableStatus of this._tableStatuses.values()) {
      const localOrder = this.convertTableStatusToOrder(tableStatus);
      
      if (localOrder) {
        newAllOrders.push(localOrder);

        const isPaid = localOrder.paymentStatus === 'PAID' || localOrder.status === 'CONFIRMED';
        
        if (isPaid) {
          localOrder.isPaid = true;
          newHistoryOrders.push(localOrder);
        } else {
          localOrder.isPaid = false;
          newOrders.push(localOrder);
        }
      }
    }

    if (newAllOrders.length > 0) {
      console.log(`🔄 Syncing ${newAllOrders.length} orders from server with local data`);

      const localOnlyOrders = this.allOrders.filter(localOrder => 
        !newAllOrders.some(serverOrder => 
          serverOrder.backendId === localOrder.backendId
        )
      );

      this.allOrders = [...newAllOrders, ...localOnlyOrders];
      this.orders = [...newOrders, ...localOnlyOrders.filter(o => !o.isPaid)];
      this.historyOrders = [...newHistoryOrders, ...localOnlyOrders.filter(o => o.isPaid)];

      this.saveToLocalStorage();
      
      console.log('✅ Server data synced with local storage');

      this.cdr.detectChanges();
    } else {
      console.log('⚠️ No server orders to sync, using local data only');
    }

    this.findNextAvailableTable();
  }

  async sendToKitchenNew() {
    if (this.orderItems.length === 0) {
      return;
    }

    try {
      if (this.editingOrder) {
        return this.updateExistingOrder();
      }
      
      const newOrder: Order = {
        table: this.currentTable,
        orderNo: this.orderNo,
        items: [...this.orderItems],
        status: 'PENDING',
        note: this.orderNote,
        createdAt: new Date().toISOString(),
        paymentStatus: 'UNPAID',
        isPaid: false
      };

      if (this.currentUser) {
        newOrder.staffInvolved = [{
          staffId: this.currentUser.id,
          staffName: this.currentUser.name,
          role: this.currentUser.role,
          action: 'created',
          timestamp: new Date().toISOString()
        }];
        
        newOrder.createdBy = this.currentUser.name;
        newOrder.createdById = this.currentUser.id;
        newOrder.createdByRole = this.currentUser.role === 'waiter' ? 'waiter' : 'waiter';
      }
      
      this.orders.push(newOrder);
      this.allOrders.push(newOrder);

      this.saveToLocalStorage();

      this.clearOrderForm();
      this.waiterView = 'overview';
    
      this.cdr.detectChanges();
      
    } catch (error: any) {
      console.error('❌ Error sending order to kitchen:', error);
    }
  }

  async updateOrderByChef(order: Order, newStatus: 'PREPARING' | 'READY') {
    try {

      if (order.isPaid) {
        return;
      }
      
      order.status = newStatus;
      
      if (this.currentUser) {
        if (!order.staffInvolved) {
          order.staffInvolved = [];
        }
        
        order.staffInvolved.push({
          staffId: this.currentUser.id,
          staffName: this.currentUser.name,
          role: this.currentUser.role,
          action: newStatus === 'READY' ? 'prepared' : 'updated',
          timestamp: new Date().toISOString()
        });

        if (newStatus === 'READY') {
          order.preparedBy = this.currentUser.name;
          order.preparedById = this.currentUser.id;
          order.preparedByRole = 'chef';
        }
      }
      

      this.saveToLocalStorage();

      this.cdr.detectChanges();
      
    } catch (error) {
      console.error('❌ Error updating order status:', error);
    }
  }

  async updateCashierStatus(newStatus: 'PAID' | 'CANCELLED') {
    if (!this.selectedOrder) return;
    
    if (newStatus === 'CANCELLED') {
      this.selectedOrder.status = 'CANCELLED';
      this.selectedOrder.paymentStatus = 'UNPAID';
      this.selectedOrder.isPaid = false;
      if (this.currentUser) {
        if (!this.selectedOrder.staffInvolved) {
          this.selectedOrder.staffInvolved = [];
        }
        
        this.selectedOrder.staffInvolved.push({
          staffId: this.currentUser.id,
          staffName: this.currentUser.name,
          role: this.currentUser.role,
          action: 'cancelled',
          timestamp: new Date().toISOString()
        });
      }
      
      this.moveToHistory(this.selectedOrder);
      this.selectedOrder = undefined;
      this.cdr.detectChanges();
    }

  }

  moveToHistory(order: Order) {
    this.orders = this.orders.filter(o => o !== order);
    
    if (!this.historyOrders.find(h => h.orderNo === order.orderNo && h.table === order.table)) {
      this.historyOrders.push(order);
    }
    
    const index = this.allOrders.findIndex(o => o === order);
    if (index !== -1) {
      this.allOrders[index] = order;
    }
    this.saveToLocalStorage();
    
    this.orderCompleted.emit(order);
    this.cdr.detectChanges();
  }

  get activeChefOrders(): Order[] {
    const chefOrders = this.orders
      .filter(o => 
        !o.isPaid && 
        (o.status === 'PENDING' || 
         o.status === 'AWAITING_CONFIRMATION' ||
         o.status === 'PREPARING' || 
         o.status === 'READY')
      )
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    
    console.log(`👨‍🍳 Chef orders calculated: ${chefOrders.length} orders`);
    
    if (this.activePage === 'chef') {
      setTimeout(() => this.cdr.markForCheck(), 0);
    }
    
    return chefOrders;
  }

  get activeWaiterOrders(): Order[] {
    return this.orders
      .filter(o => 
        !o.isPaid && 
        (o.status === 'PENDING' || 
         o.status === 'AWAITING_CONFIRMATION' ||
         o.status === 'PREPARING' || 
         o.status === 'READY')
      )
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; 
      });
  }

  // ===== HELPER METHODS =====
  private determineEffectiveStatus(tableStatus: TableOrderStatusGET): string {
    if (tableStatus.status === 'PAID') {
      return 'CONFIRMED';
    }
    
    if (tableStatus.order?.orderStatus === 'PAID') {
      return 'CONFIRMED';
    }
    
    return tableStatus.status || 'PENDING';
  }

  private convertTableStatusToOrder(tableStatus: TableOrderStatusGET): any {
    const orderItems: OrderItem[] = [];

    if (tableStatus.order?.orderItem ) {
      for (const item of tableStatus.order.orderItem) {
        if (item.product) {
          const productData = this.getProductData(item.product);
          const imageUrl = this.getProductImageUrl(item.product);
          
          orderItems.push({
            name: this.getProductData(item.product).name,
            price: this.convertStrToNum(productData.sellingPrice || "0"),
            image: imageUrl,
            category: item.product.productCategory?.name || 'Uncategorized',
            qty: item.quantity,
            total: item.totalPrice,
            ...item,
            id: item.product.id,
          });
        }
      }
    }

    const paymentMethod = (tableStatus.order as any)?.['paymentMethod'] || 
                         (tableStatus.order?.payment as any)?.['paymentMethod'] || 
                         'Cash';

    const effectiveStatus = this.determineEffectiveStatus(tableStatus);
  
    let formattedDate = '';
    if (tableStatus.orderedOn) {
      if (Array.isArray(tableStatus.orderedOn)) {
        const [year, month, day, hour = 0, minute = 0, second = 0] = tableStatus.orderedOn;
        formattedDate = `${year}-${month}-${day}-${hour}-${minute}-${second}`;
      } else if (typeof tableStatus.orderedOn === 'string') {
        formattedDate = tableStatus.orderedOn;
      }
    }

    const paymentStatus = effectiveStatus === 'CONFIRMED' ? 'PAID' : 'UNPAID';
    const isPaid = paymentStatus === 'PAID';

    return {
      table: this.convertStrToNum(tableStatus.tableNumber),
      orderNo: tableStatus.order?.orderNumber || 'N/A',
      items: orderItems,
      status: this.mapCompanyStatusToLocal(effectiveStatus),
      paymentStatus: paymentStatus,
      isPaid: isPaid,
      paidAt: isPaid ? formattedDate : undefined,
      note: tableStatus.note,
      date: formattedDate,
      createdAt: formattedDate,
      paymentMethod: paymentMethod,
      backendId: tableStatus.id,
      orderId: tableStatus.order?.id,
    };
  }

  private mapCompanyStatusToLocal(backendStatus: string): Order['status'] {
    switch (backendStatus?.toUpperCase()) {
      case 'PAID': 
      case 'CONFIRMED': 
        return 'CONFIRMED';
      case 'UNPAID': 
      case 'PENDING': 
      case 'AWAITING': 
      case 'WAITING':
        return 'PENDING';
      case 'PREPARING': 
        return 'PREPARING';
      case 'READY': 
        return 'READY';
      case 'CANCELLED': 
        return 'CANCELLED';
      default: 
        return 'PENDING';
    }
  }

  private async mapProductsToMenu(fetchedProducts: ProductData[]) {
    const menuItems: MenuItem[] = [];
    
    for (const product of fetchedProducts) {
      const productData = this.getProductData(product);
      const imageUrl = await this.resolveProductImage(product);
      
      const stockQuantity = await this.getProductStockQuantity(product.id);
      
      menuItems.push({
        category: product.productCategory?.name || 'Uncategorized',
        ...product,
        price: this.convertStrToNum(productData.sellingPrice || "0"),
        image: imageUrl,
        stockQuantity: stockQuantity,
        lowStockThreshold: this.lowStockThreshold
      });
    }

    this.menu = menuItems;
    this.cdr.detectChanges();
  }

  private async getProductStockQuantity(productId: number): Promise<number> {
    try {
      const random = Math.random();
      let mockStock: number;
      
      if (random < 0.1) {
        mockStock = 0;
      } else if (random < 0.4) {
        mockStock = Math.floor(Math.random() * this.lowStockThreshold) + 1;
      } else {
        mockStock = Math.floor(Math.random() * 20) + 6;
      }
      
      return mockStock;
      
    } catch (error) {
      console.warn('⚠️ Could not fetch stock quantity for product:', productId, error);
      return 10;
    }
  }

  addToOrder(item: MenuItem) {
    if (!this.canAddToOrder(item)) {
      return;
    }

    const existing = this.orderItems.find(i => i.id === item.id);
    if (existing) {
      if (item.stockQuantity && (existing.qty + 1) > item.stockQuantity) {
        return;
      }
      existing.qty++;
      existing.total = existing.qty * existing.price;
    } else {
      this.orderItems.push({ ...item, qty: 1, total: item.price });
    }
    
    this.cdr.detectChanges();
  }

  private async resolveProductImage(product: ProductData): Promise<string> {
    if (this.imageCache.has(product.id)) {
      return this.imageCache.get(product.id)!;
    }

    try {
      const imageUrl = await lastValueFrom(
        this._imageCacheService.getProductImage(product)
      );
      const finalUrl = imageUrl || this.getDefaultImageUrl();
      
      this.imageCache.set(product.id, finalUrl);
      return finalUrl;
    } catch (error: any) {
      console.warn('⚠️ Error getting product image for:', product.name, error);
      const defaultUrl = this.getDefaultImageUrl();
      this.imageCache.set(product.id, defaultUrl);
      return defaultUrl;
    }
  }

  getDefaultImageUrl(): string {
    return '/assets/images/default-product.png';
  }

  getProductImageUrl(product: ProductData): string {
    return this.imageCache.get(product.id) || this.getDefaultImageUrl();
  }

  getRandomIntInclusive(min: number, max:number) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); 
  }

  changeQty(tableNo: number, itemId: number, delta: number) {
    const order = this.orders.find(o => o.table === tableNo);
    if (!order) return;
    const item = order.items.find(i => i.id === itemId);
    if (!item) return;

    item.qty += delta;
    item.total = item.qty * item.price;

    if (item.qty <= 0) order.items = order.items.filter(i => i.id !== itemId);
 
    this.saveToLocalStorage();
    this.cdr.detectChanges();
  }

  changeQtySingle(itemId: number, delta: number) {
    const item = this.orderItems.find(i => i.id === itemId);
    if (!item) return;

    item.qty += delta;
    item.total = item.qty * item.price;

    if (item.qty <= 0) this.orderItems = this.orderItems.filter(i => i.id !== itemId);
    
    this.cdr.detectChanges();
  }

  getOrderTotal(order: Order): number {
    return order.items.reduce((sum, i) => sum + i.total, 0);
  }

  getSubtotal(order?: Order): number {
    if (!order) return 0;
    return order.items.reduce((sum, i) => sum + i.total, 0);
  }

  getTax(order?: Order): number {
    return this.getSubtotal(order) * 0.05;
  }

  getGrandTotal(order?: Order): number {
    return this.getSubtotal(order) + this.getTax(order);
  }

  get filteredMenu(): MenuItem[] {
    let filtered = this.menu.filter(m => 
      m.name.toLowerCase().includes(this.search.toLowerCase())
    );
    if (this.activeCategory !== 'All') {
      filtered = filtered.filter(m => m.category === this.activeCategory);
    }
    return filtered;
  }

  get categories(): string[] {
    const uniqueCategories = new Set(this.menu.map(item => item.category));
    return ['All', ...Array.from(uniqueCategories)];
  }

  get total(): number {
    return this.orderItems.reduce((sum, item) => sum + item.total, 0);
  }

  takeOrder() {
    this.waiterView = 'take-order';
    this.findNextAvailableTable();
    this.cdr.detectChanges();
  }

  goToOverview() {
    if (this.editingOrder) {
      this.cancelEdit();
    } else {
      this.waiterView = 'overview';
      this.clearOrderForm();
    }
    this.cdr.detectChanges();
  }

  deleteOrder(index: number) {
    const order = this.orders[index];
  
    if (this.currentUser) {
      if (!order.staffInvolved) {
        order.staffInvolved = [];
      }
      
      order.staffInvolved.push({
        staffId: this.currentUser.id,
        staffName: this.currentUser.name,
        role: this.currentUser.role,
        action: 'cancelled',
        timestamp: new Date().toISOString()
      });
    }

    this.orders.splice(index, 1);
    this.allOrders = this.allOrders.filter(o => o !== order);
    this.historyOrders = this.historyOrders.filter(o => o !== order);
  
    this.saveToLocalStorage();
    
    this.cdr.detectChanges();
  }

  selectOrder(order: Order) {
    this.selectedOrder = this.selectedOrder === order ? undefined : order;
    if (this.selectedOrder) {
      this.chefNoteText = this.selectedOrder.chefNote || '';
    }
    this.cdr.detectChanges();
  }

  formatOrderItems(order: Order): string {
    return order.items.map(i => `${i.name} x${i.qty}`).join(', ');
  }

  getProductData(product: ProductData) {
    return this._productHelperService.getData(product);
  }

  convertStrToNum(str: string) {
    return parseFloat(str);
  }

  getProductById(id: number): ProductData | undefined {
    return this._productIdAndDataMap.get(id);
  }

  openOrderDetails(table: TableOrderStatusGET) {
    this.selectedOrderSignal = table;
    
    const localOrder = this.convertTableStatusToOrder(table);
    this.selectedOrder = localOrder;
    this.cdr.detectChanges();
  }

  addFoodItemToOrder(foodItem: ProductData) {
    if (this.tableData.has(foodItem)) {
      this.tableData.set(foodItem, this.tableData.get(foodItem)! + 1);
    } else {
      this.tableData.set(foodItem, 1);
    }
    this.tableData = new Map(this.tableData);
    this.cdr.detectChanges();
  }

  reduceFoodItemQtyInOrder(foodItem: ProductData) {
    if (this.tableData.has(foodItem)) {
      const orderItem = this.tableData.get(foodItem)!;
      if (orderItem - 1 <= 0) {
        this.tableData.delete(foodItem);
      } else {
        this.tableData.set(foodItem, orderItem - 1);
      }
    }
    this.tableData = new Map(this.tableData);
    this.cdr.detectChanges();
  }

  clearTableData() {
    this.tableData.clear();
    this.tableData = new Map(this.tableData);
    this.cdr.detectChanges();
  }

  setOrderNote(note: string) {
    this.orderNoteSignal = note;
    this.orderNote = note;
    this.cdr.detectChanges();
  }
  removeItemFromOrder(index: number): void {
    this.orderItems.splice(index, 1);
    this.cdr.detectChanges();
  }

  clearAllOrders(): void {
    this.allOrders = [];
    this.orders = [];
    this.historyOrders = [];
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ All orders cleared');
    this.cdr.detectChanges();
  }
  forceChefOrdersDisplay() {
    console.log('🔧 Force chef orders display');
    this.cdr.detectChanges();
    const chefOrders = this.activeChefOrders;
    console.log(`👨‍🍳 Displaying ${chefOrders.length} chef orders`);
  }
}