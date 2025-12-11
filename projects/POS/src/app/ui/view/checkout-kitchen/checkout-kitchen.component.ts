import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { DecimalPipe } from '@angular/common';
import { Observable, of, lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

// Import all your company interfaces and services
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

// Updated interfaces with isPaid and staff tracking fields
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

// UPDATED: Added isPaid, paymentStatus, and staff tracking fields
interface Order {
  table: number;
  orderNo: string;
  items: OrderItem[];
  status: 'PENDING' | 'PREPARING' | 'READY' | 'CONFIRMED' | 'CANCELLED';
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
  transactionReference?: string; // Added transaction reference
  // NEW: Staff tracking fields for history page
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
  // For detailed staff involvement tracking
  staffInvolved?: Array<{
    staffId: string | number;
    staffName: string;
    role: 'waiter' | 'chef' | 'cashier' | 'manager';
    action: 'created' | 'updated' | 'prepared' | 'served' | 'paid' | 'cancelled';
    timestamp: string;
  }>;
}

// Payment Breakdown Interface based on endpoint
interface PaymentBreakdown {
  id?: number;
  amountPaid: number;
  transactionReference: string;
  paymentId?: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'CARD';
}

// Company types from v17
type TableOrder = Map<ProductData, number>;

@Component({
  selector: 'app-checkout-kitchen',
  templateUrl: './checkout-kitchen.component.html',
  styleUrls: ['./checkout-kitchen.component.scss']
})
export class CheckoutKitchenComponent implements OnInit {
  // ===== ORIGINAL PAGES ONLY =====
  @Input() activePage: 'waiter' | 'chef' | 'cashier'| "history" = 'waiter';
  @Output() orderCompleted = new EventEmitter<Order>();

  // ===== STATE =====
  waiterView: 'overview' | 'take-order' = 'overview';
  search = '';
  activeCategory = 'All';
  currentTable = 1;
  orderNote = '';
  orderNo = '#A' + Math.floor(1000 + Math.random() * 9000);
  isProcessingPayment = false;
  expandedOrder: Order | null = null;

  // ===== EDIT FUNCTIONALITY =====
  editingOrder: Order | null = null;
  originalOrderItems: OrderItem[] = [];
  originalOrderStatus: Order['status'] | null = null;

  // ===== DATA =====
  menu: MenuItem[] = [];
  allOrders: Order[] = []; // Store all orders (both paid and unpaid)
  orders: Order[] = []; // Active orders (unpaid)
  historyOrders: Order[] = []; // Paid orders
  orderItems: OrderItem[] = [];
  selectedOrder?: Order;

  // ===== PAYMENT MODAL STATE =====
  showPaymentModal = false;
  selectedPaymentMethod?: 'CASH' | 'TRANSFER' | 'CARD';
  transferReference = '';
  cardReference = '';

  // Payment methods configuration
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

  // ===== STOCK MANAGEMENT =====
  lowStockThreshold = 5;

  // ===== UPDATED: COMPANY INFORMATION FROM SESSION STORAGE =====
  companyInfo = {
    name: 'Restaurant Name',
    address: 'Address will load from session storage',
    phone: 'Phone number',
    email: 'Email address',
    vatNumber: 'VAT-Number'
  };

  // Image cache to store resolved image URLs
  private imageCache = new Map<number, string>();

  // ===== COMPANY V17 PROPERTIES =====
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

  // Company modal states
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

  // Local storage key for persisting orders
  private readonly STORAGE_KEY = 'restaurant_orders_data';

  // Current user
  currentUser: any = null;

  constructor(
    private _posService: PosServiceService,
    private _checkoutService: CheckoutService,
    private _imageCacheService: ImageCacheService,
    private _paymentService: PaymentServiceService,
    private _productHelperService: ProductHelperService,
    private _userService: UserService,
  ) {}

  ngOnInit() {
    // Initialize current user
    this.initializeCurrentUser();
    
    // UPDATED: Get company info from session storage FIRST
    this.getCompanyInfoFromSessionStorage();
    
    // First load from localStorage to maintain persistence
    this.loadFromLocalStorage();
    
    // Then initialize company data
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
      const userData = this._userService.getUserData() as any;
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
          username: userData.username,
          email: userData.email,
        };
        console.log('👤 Current user initialized:', this.currentUser);
      } else {
        // Fallback for testing
        this.currentUser = {
          id: 'user-1',
          name: 'John Doe',
          username: 'john',
          email: 'john@restaurant.com',
        };
      }
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      // Default user for testing
      this.currentUser = {
        id: 'user-1',
        name: 'John Doe',
        username: 'john',
      };
    }
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

  // NEW: Get payment icon for display
  getPaymentIcon(method: 'CASH' | 'TRANSFER' | 'CARD'): string {
    const icons = {
      'CASH': '💰',
      'TRANSFER': '🏦',
      'CARD': '💳'
    };
    return icons[method];
  }

  // UPDATED: Get payment method display name
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
    
    // Validate reference numbers for non-cash payments
    if (this.selectedPaymentMethod === 'TRANSFER' && !this.transferReference.trim()) {
      alert('Please enter transaction reference for bank transfer');
      return;
    }
    
    if (this.selectedPaymentMethod === 'CARD' && !this.cardReference.trim()) {
      alert('Please enter transaction reference for card payment');
      return;
    }

    try {
      this.isProcessingPayment = true;
      
      // Create transaction reference based on payment method
      let transactionReference = '';
      if (this.selectedPaymentMethod === 'CASH') {
        transactionReference = `CASH-${Date.now()}`;
      } else if (this.selectedPaymentMethod === 'TRANSFER') {
        transactionReference = this.transferReference.trim();
      } else if (this.selectedPaymentMethod === 'CARD') {
        transactionReference = this.cardReference.trim();
      }

      // Mark order as paid locally
      this.selectedOrder.isPaid = true;
      this.selectedOrder.paymentStatus = 'PAID';
      this.selectedOrder.paidAt = new Date().toISOString();
      this.selectedOrder.paymentMethod = this.getPaymentMethodDisplayName(this.selectedPaymentMethod);
      this.selectedOrder.status = 'CONFIRMED';
      this.selectedOrder.transactionReference = transactionReference;
      
      // TRACK STAFF: Mark who processed the payment
      if (this.currentUser) {
        if (!this.selectedOrder.staffInvolved) {
          this.selectedOrder.staffInvolved = [];
        }
        
        this.selectedOrder.staffInvolved.push({
          staffId: this.currentUser.id || 'cashier',
          staffName: this.currentUser.name || 'Cashier',
          role: 'cashier',
          action: 'paid',
          timestamp: new Date().toISOString()
        });
        
        this.selectedOrder.paidBy = this.currentUser.name || 'Cashier';
        this.selectedOrder.paidById = this.currentUser.id || 'cashier';
        this.selectedOrder.paidByRole = 'cashier';
      }

      // Move to history and remove from active orders
      this.moveToHistory(this.selectedOrder);
      
      // Store order for printing
      const paidOrder = { ...this.selectedOrder };
      
      // Close modals and clear selection
      this.closePaymentModal();
      this.selectedOrder = undefined;
      this.isProcessingPayment = false;
      
      // Automatically print invoice
      setTimeout(() => {
        this.autoPrintInvoice(paidOrder);
      }, 300);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      this.isProcessingPayment = false;
      alert('Error processing payment. Please try again.');
    }
  }

  // ===== LOCAL STORAGE METHODS =====
  private loadFromLocalStorage(): void {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Load all orders from storage
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
      // Reset to empty arrays if there's an error
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

  // ===== DATE PARSING METHODS =====
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

  // ===== CHANGE TEST MODE =====
  changeTestMode(mode: "waiter" | "chef" | "cashier" | "history") {
    this.testMode = mode;
    this.activePage = mode;
  }

  // ===== TABLE NUMBER INPUT HANDLER =====
  onTableNumberChange(): void {
    if (this.currentTable < 1) {
      this.currentTable = 1;
    } else if (this.currentTable > 100) {
      this.currentTable = 100;
    }
    
    this.orderTableNumber = this.currentTable;
  }

  // ===== FIXED TABLE NUMBER INCREMENTATION =====
  private findNextAvailableTable(): void {
    const usedTables = new Set<number>();
    
    // Only consider unpaid orders for table assignment
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

  // ===== STOCK MANAGEMENT METHODS =====
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

  // ===== WAITER ACCORDION METHODS =====
  toggleOrderExpansion(order: Order): void {
    if (this.expandedOrder === order) {
      this.expandedOrder = null;
    } else {
      this.expandedOrder = order;
    }
  }

  updateOrderStatus(order: Order, newStatus: Order['status']): void {
    order.status = newStatus;
    
    this.saveToLocalStorage(); // Save after status update
  }

  // ===== EDIT ORDER METHODS - UPDATED =====
  editOrder(order: Order): void {
    this.editingOrder = order;
    this.originalOrderItems = [...order.items];
    this.originalOrderStatus = order.status;
    
    // Switch to take-order view with existing items
    this.orderItems = [...order.items];
    this.currentTable = order.table;
    this.orderNo = order.orderNo;
    this.orderNote = order.note || '';
    this.waiterView = 'take-order';
  }

  cancelEdit(): void {
    if (this.editingOrder && this.originalOrderStatus) {
      // Restore original items and status
      this.editingOrder.items = [...this.originalOrderItems];
      this.editingOrder.status = this.originalOrderStatus;
      this.editingOrder = null;
      this.originalOrderItems = [];
      this.originalOrderStatus = null;
    }
    
    this.clearOrderForm();
    this.waiterView = 'overview';
  }

  updateExistingOrder(): void {
    if (!this.editingOrder) return;
    
    if (this.orderItems.length === 0) {
      return;
    }
    
    // Update the existing order with new items
    this.editingOrder.items = [...this.orderItems];
    this.editingOrder.note = this.orderNote;
    
    // IMPORTANT: If order was being prepared, reset status to PENDING
    // so chef knows there are new items to prepare
    if (this.editingOrder.status === 'PREPARING' || this.editingOrder.status === 'READY') {
      this.editingOrder.status = 'PENDING';
    }
    
    // TRACK STAFF: Mark who updated the order
    if (this.currentUser) {
      if (!this.editingOrder.staffInvolved) {
        this.editingOrder.staffInvolved = [];
      }
      
      this.editingOrder.staffInvolved.push({
        staffId: this.currentUser.id || 'waiter',
        staffName: this.currentUser.name || 'Waiter',
        role: 'waiter',
        action: 'updated',
        timestamp: new Date().toISOString()
      });
      
      this.editingOrder.createdBy = this.currentUser.name || 'Waiter';
      this.editingOrder.createdById = this.currentUser.id || 'waiter';
      this.editingOrder.createdByRole = 'waiter';
    }
    
    // Clear editing state
    this.editingOrder = null;
    this.originalOrderItems = [];
    this.originalOrderStatus = null;
    
    // Save to localStorage
    this.saveToLocalStorage();
    
    // Clear form and return to overview
    this.clearOrderForm();
    this.waiterView = 'overview';
  }

  // Helper method to clear order form
  private clearOrderForm(): void {
    this.orderItems = [];
    this.orderNo = '#A' + Math.floor(1000 + Math.random() * 9000);
    this.orderNote = '';
    this.findNextAvailableTable();
  }

  // ===== CASHIER/RECEIPT METHODS =====
  getCashierName(): string {
    try {
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

  // Auto print method (used after payment)
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

  // UPDATED: Generate receipt HTML with company info from session storage
  private generateReceiptHTML(order: Order): string {
    // NEW: Staff information
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

  // ===== CHECK IF ORDER CAN BE EDITED =====
  canEditOrder(order: Order): boolean {
    // Waiters can edit PENDING orders only AND order must be unpaid
    return order.status === 'PENDING' && !order.isPaid;
  }

  private async initializeCompanyData() {
    try {
      const fetchedTableOrderStatuses = await lastValueFrom(
        this._posService.getTableOrderStatuses()
      );
      
      if (fetchedTableOrderStatuses) {
        this._tableStatuses = new Map(
          fetchedTableOrderStatuses.map((tableOrderStatus) => [
            tableOrderStatus.id,
            tableOrderStatus,
          ])
        );
        
        // Only sync backend data if we don't have local data
        if (this.allOrders.length === 0) {
          this.syncOrdersWithCompanyData();
        }
      }

      this._fetchedBranches = [];

      const fetchedProducts = await lastValueFrom(
        this._posService.getProducts()
      );
      
      if (fetchedProducts && fetchedProducts.length > 0) {
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
        this.currCategoryProducts = [];
        this.menu = [];
      }

      this.findNextAvailableTable();
      
    } catch (error: any) {
      console.error('Error initializing company data:', error);
      this.currCategoryProducts = [];
      this.menu = [];
    }
  }

  // ===== SYNC ORDERS WITH COMPANY DATA =====
  private syncOrdersWithCompanyData() {
    // Clear existing arrays
    const newAllOrders: Order[] = [];
    const newOrders: Order[] = [];
    const newHistoryOrders: Order[] = [];

    for (const tableStatus of this._tableStatuses.values()) {
      const localOrder = this.convertTableStatusToOrder(tableStatus);
      
      if (localOrder) {
        newAllOrders.push(localOrder);
        
        // Determine if order is paid based on payment status
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

    // Only replace arrays if we have data from backend
    // This prevents overwriting local data if backend has no orders
    if (newAllOrders.length > 0) {
      this.allOrders = newAllOrders;
      this.orders = newOrders;
      this.historyOrders = newHistoryOrders;
      
      // Save to localStorage
      this.saveToLocalStorage();
    }

    this.findNextAvailableTable();
  }

  // ===== SIMPLIFIED CREATE ORDER - UPDATED =====
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

      // TRACK STAFF: Mark who created this order
      if (this.currentUser) {
        newOrder.staffInvolved = [{
          staffId: this.currentUser.id || 'waiter',
          staffName: this.currentUser.name || 'Waiter',
          role: 'waiter',
          action: 'created',
          timestamp: new Date().toISOString()
        }];
        
        newOrder.createdBy = this.currentUser.name || 'Waiter';
        newOrder.createdById = this.currentUser.id || 'waiter';
        newOrder.createdByRole = 'waiter';
      }
      
      this.orders.push(newOrder);
      this.allOrders.push(newOrder);

      // Save to localStorage
      this.saveToLocalStorage();

      this.clearOrderForm();
      this.waiterView = 'overview';
      
    } catch (error: any) {
      console.error('Error sending order to kitchen:', error);
    }
  }

  // ===== CHEF ORDER PROCESSING - UPDATED =====
  async updateOrderByChef(order: Order, newStatus: 'PREPARING' | 'READY') {
    try {
      // Chef can only update status if order is not paid
      if (order.isPaid) {
        alert('Cannot update status of paid order');
        return;
      }
      
      order.status = newStatus;
      
      // TRACK STAFF: Mark who prepared this order
      if (newStatus === 'READY') {
        if (!order.staffInvolved) {
          order.staffInvolved = [];
        }
        
        order.staffInvolved.push({
          staffId: 'chef',
          staffName: 'Chef',
          role: 'chef',
          action: 'prepared',
          timestamp: new Date().toISOString()
        });
        
        order.preparedBy = 'Chef';
        order.preparedById = 'chef';
        order.preparedByRole = 'chef';
      }
      
      // Save to localStorage
      this.saveToLocalStorage();
      
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  }

  // ===== CASHIER PAYMENT PROCESSING - UPDATED =====
  async updateCashierStatus(newStatus: 'PAID' | 'CANCELLED') {
    if (!this.selectedOrder) return;
    
    if (newStatus === 'CANCELLED') {
      this.selectedOrder.status = 'CANCELLED';
      this.selectedOrder.paymentStatus = 'UNPAID';
      this.selectedOrder.isPaid = false;
      
      // TRACK STAFF: Mark who cancelled the order
      if (this.currentUser) {
        if (!this.selectedOrder.staffInvolved) {
          this.selectedOrder.staffInvolved = [];
        }
        
        this.selectedOrder.staffInvolved.push({
          staffId: this.currentUser.id || 'cashier',
          staffName: this.currentUser.name || 'Cashier',
          role: 'cashier',
          action: 'cancelled',
          timestamp: new Date().toISOString()
        });
      }
      
      // Move cancelled orders to history immediately
      this.moveToHistory(this.selectedOrder);
      this.selectedOrder = undefined;
    }
    // For PAID, we now use the payment modal
  }

  // ===== ORDER FLOW METHODS =====
  moveToHistory(order: Order) {
    // Remove from active orders array
    this.orders = this.orders.filter(o => o !== order);
    
    // Add to history if not already there
    if (!this.historyOrders.find(h => h.orderNo === order.orderNo && h.table === order.table)) {
      this.historyOrders.push(order);
    }
    
    // Update in allOrders
    const index = this.allOrders.findIndex(o => o === order);
    if (index !== -1) {
      this.allOrders[index] = order;
    }
    
    // Save to localStorage
    this.saveToLocalStorage();
    
    this.orderCompleted.emit(order);
  }

  // ===== UPDATED ORDER FILTERING BY PAGE (SORTED IN DESCENDING ORDER) =====
  get activeWaiterOrders(): Order[] {
    // Waiter sees PENDING, PREPARING, READY orders that are NOT paid
    return this.orders
      .filter(o => 
        !o.isPaid && 
        (o.status === 'PENDING' || 
         o.status === 'PREPARING' || 
         o.status === 'READY')
      )
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Descending order
      });
  }

  get activeChefOrders(): Order[] {
    // Chef sees PENDING, PREPARING, and READY orders that are NOT paid
    return this.orders
      .filter(o => 
        !o.isPaid && 
        (o.status === 'PENDING' || 
         o.status === 'PREPARING' || 
         o.status === 'READY')
      )
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Descending order
      });
  }

  get activeCashierOrders(): Order[] {
    // Cashier sees READY orders that are NOT paid
    return this.orders
      .filter(o => 
        !o.isPaid && 
        o.status === 'READY'
      )
      .sort((a, b) => {
        // Sort by createdAt in descending order (newest first)
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Descending order
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
    
    // Format date properly
    let formattedDate = '';
    if (tableStatus.orderedOn) {
      if (Array.isArray(tableStatus.orderedOn)) {
        // Convert array to date string
        const [year, month, day, hour = 0, minute = 0, second = 0] = tableStatus.orderedOn;
        formattedDate = `${year}-${month}-${day}-${hour}-${minute}-${second}`;
      } else if (typeof tableStatus.orderedOn === 'string') {
        formattedDate = tableStatus.orderedOn;
      }
    }

    // Determine payment status and isPaid
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

  // ===== UPDATED STATUS MAPPING =====
  private mapCompanyStatusToLocal(backendStatus: string): Order['status'] {
    switch (backendStatus?.toUpperCase()) {
      case 'PAID': 
      case 'CONFIRMED': 
        return 'CONFIRMED';
      case 'UNPAID': 
      case 'PENDING': 
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

  // ===== PRODUCT AND STOCK METHODS =====
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
  }

  // Method to get product stock quantity from backend
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
      console.warn('Could not fetch stock quantity for product:', productId, error);
      return 10;
    }
  }

  // ===== UPDATED ADD TO ORDER WITH STOCK VALIDATION =====
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
      console.warn('Error getting product image for:', product.name, error);
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

  // ===== EXISTING UI INTERACTION METHODS =====
  changeQty(tableNo: number, itemId: number, delta: number) {
    const order = this.orders.find(o => o.table === tableNo);
    if (!order) return;
    const item = order.items.find(i => i.id === itemId);
    if (!item) return;

    item.qty += delta;
    item.total = item.qty * item.price;

    if (item.qty <= 0) order.items = order.items.filter(i => i.id !== itemId);
    
    // Save changes
    this.saveToLocalStorage();
  }

  changeQtySingle(itemId: number, delta: number) {
    const item = this.orderItems.find(i => i.id === itemId);
    if (!item) return;

    item.qty += delta;
    item.total = item.qty * item.price;

    if (item.qty <= 0) this.orderItems = this.orderItems.filter(i => i.id !== itemId);
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
  }

  goToOverview() {
    if (this.editingOrder) {
      if (confirm('You have unsaved changes. Cancel editing?')) {
        this.cancelEdit();
      }
    } else {
      this.waiterView = 'overview';
      this.clearOrderForm();
    }
  }

  deleteOrder(index: number) {
    if (confirm('Are you sure you want to delete this order?')) {
      const order = this.orders[index];
      
      // TRACK STAFF: Mark who deleted the order
      if (this.currentUser) {
        if (!order.staffInvolved) {
          order.staffInvolved = [];
        }
        
        order.staffInvolved.push({
          staffId: this.currentUser.id || 'waiter',
          staffName: this.currentUser.name || 'Waiter',
          role: 'waiter',
          action: 'cancelled',
          timestamp: new Date().toISOString()
        });
      }
      
      // Remove from all arrays
      this.orders.splice(index, 1);
      this.allOrders = this.allOrders.filter(o => o !== order);
      this.historyOrders = this.historyOrders.filter(o => o !== order);
      
      // Save to localStorage
      this.saveToLocalStorage();
    }
  }

  selectOrder(order: Order) {
    this.selectedOrder = this.selectedOrder === order ? undefined : order;
  }

  formatOrderItems(order: Order): string {
    return order.items.map(i => `${i.name} x${i.qty}`).join(', ');
  }

  // ===== COMPANY SERVICE METHODS =====
  getProductData(product: ProductData) {
    return this._productHelperService.getData(product);
  }

  convertStrToNum(str: string) {
    return parseFloat(str);
  }

  getProductById(id: number): ProductData | undefined {
    return this._productIdAndDataMap.get(id);
  }

  // ===== ADDITIONAL COMPANY METHODS FOR COMPATIBILITY =====
  openOrderDetails(table: TableOrderStatusGET) {
    this.selectedOrderSignal = table;
    
    const localOrder = this.convertTableStatusToOrder(table);
    this.selectedOrder = localOrder;
  }

  addFoodItemToOrder(foodItem: ProductData) {
    if (this.tableData.has(foodItem)) {
      this.tableData.set(foodItem, this.tableData.get(foodItem)! + 1);
    } else {
      this.tableData.set(foodItem, 1);
    }
    this.tableData = new Map(this.tableData);
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
  }

  clearTableData() {
    this.tableData.clear();
    this.tableData = new Map(this.tableData);
  }

  setOrderNote(note: string) {
    this.orderNoteSignal = note;
    this.orderNote = note;
  }

  // ===== REMOVE ITEM FROM ORDER =====
  removeItemFromOrder(index: number): void {
    if (confirm('Are you sure you want to remove this item from the order?')) {
      this.orderItems.splice(index, 1);
    }
  }

  // ===== CLEAR ALL ORDERS (for testing/debugging) =====
  clearAllOrders(): void {
    if (confirm('Are you sure you want to clear ALL orders? This cannot be undone.')) {
      this.allOrders = [];
      this.orders = [];
      this.historyOrders = [];
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('All orders cleared');
    }
  }
}