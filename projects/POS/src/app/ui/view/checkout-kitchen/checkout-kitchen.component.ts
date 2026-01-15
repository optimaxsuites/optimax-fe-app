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

// Updated interfaces with proper status structure
interface MenuItem {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  stockQuantity?: number; // Add stock quantity
  lowStockThreshold?: number; // Add low stock threshold
}

interface OrderItem extends MenuItem {
  qty: number;
  total: number;
  status?: string;
}

// CORRECTED STATUS STRUCTURE FOR ORDER FLOW
interface Order {
  table: number;
  orderNo: string;
  items: OrderItem[];
  status: 'PENDING' | 'PREPARING' | 'READY' | 'CONFIRMED' | 'CANCELLED' | 'AWAITING_CONFIRMATION' | 'UNPAID' | 'PAID';
  note?: string;
  date?: string;
  createdAt?: string;
  paymentMethod?: string;
  backendId?: number;
  orderId?: number;
  paymentId?: number;
  orderStatus: 'UNPAID' | 'PAID'
}

// Company types from v17
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
  // ===== ORIGINAL PAGES ONLY =====
  @Input() activePage: 'waiter' | 'chef' | 'cashier' | 'history' = 'waiter';
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
  editingOrder: Order | null = null;
  originalOrderItems: OrderItem[] = [];
  originalOrderStatus: Order['status'] | null = null;



  // ===== DATA =====
  menu: MenuItem[] = [];
  orders: Order[] = [];
  historyOrders: Order[] = [];
  orderItems: OrderItem[] = [];
  selectedOrder?: Order;

  // ===== STOCK MANAGEMENT =====
  lowStockThreshold = 5; // Items with less than 5 in stock are considered low

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
  private readonly _dummyTableOrderStatus = 9999999; // For optimistic updates

  currentUser: StaffMember | null = null;



  constructor(
    private _posService: PosServiceService,
    private _checkoutService: CheckoutService,
    private _imageCacheService: ImageCacheService,
    private _paymentService: PaymentServiceService,
    private _productHelperService: ProductHelperService,
    private _userService: UserService,
  ) {}

  ngOnInit() {
    this.initializeCompanyData();
    this.initializeCurrentUser()
    
    // Set permissions
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
      this.orderPermissions = getUserPermissionsFor('kitchen_order');
      this.paymentPermissions = getUserPermissionsFor('kitchen_payment');
    }

    this.testMode = this.orderPermissions.canCreate ? "waiter" : this.paymentPermissions.canCreate ? "cashier" : "chef";
    
    // Initialize with next available table
    this.findNextAvailableTable();
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
     
        // this.availableStaff = [this.currentUser];
        
      } else {
        console.warn('⚠️ No user data found, cannot initialize current user');
        this.currentUser = null;
      }
      
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      this.currentUser = null;
    }
  }

  // ===== CHANGE TEST MODE =====
  changeTestMode(mode: "waiter" | "chef" | "cashier" | "history") {
    this.testMode = mode;
    this.activePage = mode;
    console.log('Mode changed to:', mode);
  }

  // ===== TABLE NUMBER INPUT HANDLER =====
  onTableNumberChange(): void {
    // Validate table number
    if (this.currentTable < 1) {
      this.currentTable = 1;
    } else if (this.currentTable > 100) {
      this.currentTable = 100;
    }
    
    // Update the order table number to match
    this.orderTableNumber = this.currentTable;
    
    console.log(`🔄 Table number changed to: ${this.currentTable}`);
  }

  // ===== FIXED TABLE NUMBER INCREMENTATION =====
  private findNextAvailableTable(): void {
    console.log('🔍 Finding next available table...');
    
    // Get all currently used table numbers from active orders
    const usedTables = new Set<number>();
    
    // Check local orders
    this.orders.forEach(order => {
      if (order.table) {
        usedTables.add(order.table);
      }
    });
    
    // Also check table statuses from backend
    this._tableStatuses.forEach(tableStatus => {
      const tableNum = this.convertStrToNum(tableStatus.tableNumber);
      if (tableNum > 0) {
        usedTables.add(tableNum);
      }
    });
    
    console.log('📊 Used tables:', Array.from(usedTables).sort((a, b) => a - b));
    
    // Find the first available table number starting from 1
    let nextTable = 1;
    while (usedTables.has(nextTable)) {
      nextTable++;
      
      // Safety check to prevent infinite loop
      if (nextTable > 100) {
        console.warn('⚠️ Reached max table search limit');
        break;
      }
    }
    
    // Update current table
    const oldTable = this.currentTable;
    this.currentTable = nextTable;
    this.orderTableNumber = nextTable;
    
    console.log(`🔄 Table updated: ${oldTable} → ${this.currentTable}`);
  }

  // ===== STOCK MANAGEMENT METHODS =====
  getStockStatus(item: MenuItem): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (!item.stockQuantity && item.stockQuantity !== 0) {
      return 'in-stock'; // If no stock data, assume it's available
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
    console.log(`Order ${order.orderNo} status updated to: ${newStatus}`);
  }

  private async initializeCompanyData() {
    try {
      // Fetch table statuses and store them
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
        
        // Sync local orders with company data
        this.syncOrdersWithCompanyData();
      }

      // Skip branches loading to avoid 500 error
      console.log('Skipping branch loading to avoid backend 500 error');
      this._fetchedBranches = [];

      // Fetch products
      const fetchedProducts = await lastValueFrom(
        this._posService.getProducts()
      );
      
      if (fetchedProducts && fetchedProducts.length > 0) {
        // Clear existing data
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
        
        // Map company products to menu items with resolved images and stock data
        await this.mapProductsToMenu(fetchedProducts);
        
      } else {
        console.warn('No products fetched or products array is empty');
        this.currCategoryProducts = [];
        this.menu = [];
      }

      // Update table number after data is loaded
      this.findNextAvailableTable();
      
    } catch (error: any) {
      console.error('Error initializing company data:', error);
      this.currCategoryProducts = [];
      this.menu = [];
    }
  }

  // ===== SYNC ORDERS WITH COMPANY DATA =====
  private syncOrdersWithCompanyData() {
    // Clear existing orders
    this.orders = [];
    this.historyOrders = [];

    // Convert company table statuses to local orders
    for (const tableStatus of this._tableStatuses.values()) {
      const localOrder = this.convertTableStatusToOrder(tableStatus);
      
      if (localOrder) {
        // Only add to history if status is CONFIRMED or CANCELLED
        if (localOrder.status === 'CONFIRMED' || localOrder.status === 'CANCELLED') {
          this.historyOrders.push(localOrder);
        } else {
          this.orders.push(localOrder);
        }
      }
    }

    // Update table number whenever orders change
    this.findNextAvailableTable();
  }

  // ===== SIMPLIFIED CREATE ORDER - FIXED FOR KITCHEN FLOW =====
  async sendToKitchenNew() {
    if (this.orderItems.length === 0) {
      alert('Add items before sending to kitchen');
      return;
    }

    try {
      console.log('🍳 Sending order to kitchen...');
      
      // Create a simple local order first for immediate display
      const newOrder: Order = {
        table: this.currentTable,
        orderNo: this.orderNo,
        items: [...this.orderItems],
        status: 'UNPAID', // Start as UNPAID - chef will see this immediately
        note: this.orderNote,
        createdAt: new Date().toISOString(),
        orderStatus: 'UNPAID'
      };

      // Add to orders array (will appear in chef page as UNPAID)
      this.orders.push(newOrder);
      
      console.log('✅ Order created locally with status UNPAID:', newOrder);

      // Clear the current order form
      this.orderItems = [];
      this.orderNo = '#A' + Math.floor(1000 + Math.random() * 9000);
      this.orderNote = '';
      this.waiterView = 'overview';
      
      // Find next available table
      this.findNextAvailableTable();
      
      alert(`✅ Order for Table ${newOrder.table} sent to kitchen successfully! Chef can now see it.`);
      
    } catch (error: any) {
      console.error('Error sending order to kitchen:', error);
      alert('Error creating order. Please try again.');
    }
  }

  // ===== CHEF ORDER PROCESSING =====
  async updateOrderByChef(order: Order, newStatus: 'PREPARING' | 'READY' | 'CONFIRMED') {
    try {
      console.log(`👨‍🍳 Chef updating order ${order.orderNo} from ${order.status} to: ${newStatus}`);
      
      // Update local status - chef can process UNPAID orders
      order.status = newStatus;

      console.log(`✅ Order ${order.orderNo} status updated to: ${newStatus}`);
      
      // If order is confirmed, move to history
      if (newStatus === 'CONFIRMED') {
        this.moveToHistory(order);
        this.selectedOrder = undefined;
        alert('Order completed and moved to history!');
      } else if (newStatus === 'READY') {
        alert('Order marked as ready! Cashier can now process payment.');
      } else if (newStatus === 'PREPARING') {
        alert('Order is now being prepared!');
      }
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status. Please try again.');
    }
  }

  // ===== CASHIER PAYMENT PROCESSING =====
  async updateCashierStatus(newStatus: 'PAID' | 'CANCELLED') {
    if (!this.selectedOrder) return;
    
    if (newStatus === 'PAID') {
      try {
        this.isProcessingPayment = true;
        console.log('💰 Processing payment for order:', this.selectedOrder.orderNo);
        
        // Update order status to PAID (only cashier can do this)
        this.selectedOrder.status = 'PAID';
        this.selectedOrder.paymentMethod = 'Cash'; // Default payment method
        
        console.log('✅ Payment processed for order:', this.selectedOrder.orderNo);
        
        // Wait a moment to show processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.selectedOrder = undefined;
        this.isProcessingPayment = false;
        
        alert('✅ Payment completed! Order is now paid.');
        
      } catch (error: any) {
        console.error('❌ Payment error:', error);
        this.isProcessingPayment = false;
        alert('Error processing payment. Please try again.');
      }
    } else if (newStatus === 'CANCELLED') {
      this.selectedOrder.status = 'CANCELLED';
      this.moveToHistory(this.selectedOrder);
      this.selectedOrder = undefined;
      alert('Order cancelled.');
    }
  }

  // ===== ORDER FLOW METHODS =====
  moveToHistory(order: Order) {
    this.orders = this.orders.filter(o => o !== order);
    
    if (!this.historyOrders.find(h => h.orderNo === order.orderNo && h.table === order.table)) {
      this.historyOrders.push(order);
    }
    
    this.orderCompleted.emit(order);
  }

  // ===== CORRECTED ORDER FILTERING BY PAGE =====
  get activeWaiterOrders(): Order[] {
    // Waiter sees all UNPAID orders (new orders)
    console.log(this.orders)
    return this.orders.filter(o => o.status === 'UNPAID');
  }

  get activeChefOrders(): Order[] {
    // Chef sees UNPAID orders (incoming) and PREPARING/READY orders (in progress)
    return this.orders.filter(o => 
      o.status === 'UNPAID' || 
      o.status === 'PREPARING' || 
      o.status === 'READY'
    );
  }

  get activeCashierOrders(): Order[] {
    // Cashier sees READY orders (ready for payment) and PAID orders (completed payments)
    return this.orders.filter(o => o.status === 'READY' || o.status === 'PAID');
  }

 // ===== HELPER METHODS =====
  private determineEffectiveStatus(tableStatus: TableOrderStatusGET): string {
    if (tableStatus.status === 'PAID') {
      return 'PAID';
    }
    
    if (tableStatus.order?.orderStatus === 'PAID') {
      return 'PAID';
    }
    
    return tableStatus.status || 'UNPAID';
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

    return {
      table: this.convertStrToNum(tableStatus.tableNumber),
      orderNo: tableStatus.order?.orderNumber || 'N/A',
      items: orderItems,
      status: this.mapCompanyStatusToLocal(effectiveStatus),
      note: tableStatus.note,
      date: tableStatus.orderedOn?.join('-'),
      createdAt: tableStatus.orderedOn?.join('-'),
      paymentMethod: paymentMethod,
      backendId: tableStatus.id, // TableOrderStatus ID
      orderId: tableStatus.order?.id, // Order ID
      waiterId: tableStatus.waterId,
      chefId: tableStatus.chefId,
      orderStatus: tableStatus.order.orderStatus,
    };
  }

  // ===== STATUS MAPPING =====
  private mapCompanyStatusToLocal(backendStatus: string): Order['status'] {
    switch (backendStatus?.toUpperCase()) {
      case 'PAID': return 'PAID';
      case 'UNPAID': return 'UNPAID';
      case 'PREPARING': return 'PREPARING';
      case 'READY': return 'READY';
      case 'CONFIRMED': return 'CONFIRMED';
      case 'CANCELLED': return 'CANCELLED';
      default: return 'UNPAID';
    }
  }

  // ===== PRODUCT AND STOCK METHODS =====
  private async mapProductsToMenu(fetchedProducts: ProductData[]) {
    const menuItems: MenuItem[] = [];
    
    for (const product of fetchedProducts) {
      const productData = this.getProductData(product);
      const imageUrl = await this.resolveProductImage(product);
      
      // Get stock data from backend
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
    console.log('Mapped company products to menu with stock data:', this.menu);
  }

  // Method to get product stock quantity from backend
  private async getProductStockQuantity(productId: number): Promise<number> {
    try {
      // TODO: Replace this with your actual stock API call
      // Example: return await lastValueFrom(this._inventoryService.getStockQuantity(productId));
      
      // Mock data for demonstration - replace with real API call
      // This creates realistic stock data: 30% chance of low stock, 10% chance of out of stock
      const random = Math.random();
      let mockStock: number;
      
      if (random < 0.1) {
        mockStock = 0; // 10% out of stock
      } else if (random < 0.4) {
        mockStock = Math.floor(Math.random() * this.lowStockThreshold) + 1; // 30% low stock (1-5)
      } else {
        mockStock = Math.floor(Math.random() * 20) + 6; // 60% normal stock (6-25)
      }
      
      console.log(`📦 Product ${productId} stock: ${mockStock}`);
      return mockStock;
      
    } catch (error) {
      console.warn('Could not fetch stock quantity for product:', productId, error);
      return 10; // Default stock if API fails
    }
  }

  // ===== UPDATED ADD TO ORDER WITH STOCK VALIDATION =====
  addToOrder(item: MenuItem) {
    if (!this.canAddToOrder(item)) {
      alert(`Sorry, ${item.name} is out of stock!`);
      return;
    }

    const existing = this.orderItems.find(i => i.id === item.id);
    if (existing) {
      // Check if adding more would exceed available stock
      if (item.stockQuantity && (existing.qty + 1) > item.stockQuantity) {
        alert(`Sorry, only ${item.stockQuantity} ${item.name} available in stock!`);
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

  printInvoice() {
    window.print();
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
    // Ensure we have the latest table number when taking a new order
    this.findNextAvailableTable();
  }

  goToOverview() {
    this.waiterView = 'overview';
  }

  deleteOrder(index: number) {
    if (confirm('Are you sure you want to delete this order?')) this.orders.splice(index, 1);
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
    
    // Convert to local order format
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
    console.log('🗑️ Item removed from order');
  }
}

formatDateString(dateStr: string): any {
  if (!dateStr) return null;

  const parts = dateStr.split('-');

  const dateObj = new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1, 
    parseInt(parts[2]),
    parseInt(parts[3]),
    parseInt(parts[4]),
    parseInt(parts[5])
  );

  return isNaN(dateObj.getTime()) ? null : dateObj;
}

 canEditOrder(order: Order): boolean {
    return (order.status === 'PENDING' || order.status === 'AWAITING_CONFIRMATION') && order.orderStatus !== 'PAID';
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
    // this.cdr.detectChanges();
  }

   confirmOrderChanges(order: Order) {

    order.status = 'PENDING';

    if (this.currentUser) {
      // if (!order.staffInvolved) {
      //   order.staffInvolved = [];
      // }
      
      // // order.staffInvolved.push({
      //   staffId: this.currentUser.id,
      //   staffName: this.currentUser.name,
      //   role: this.currentUser.role,
      //   action: 'updated',
      //   timestamp: new Date().toISOString()
      // // });
    }
    
    // this.saveToLocalStorage();
    // this.cdr.detectChanges();
  }


  cancelOrderByWaiter(order: Order) {
    // order.status = 'CANCELLED';
    // order.paymentStatus = 'UNPAID';
    // order.isPaid = false;

    // if (this.currentUser) {
    //   if (!order.staffInvolved) {
    //     order.staffInvolved = [];
    //   }
      
    //   order.staffInvolved.push({
    //     staffId: this.currentUser.id,
    //     staffName: this.currentUser.name,
    //     role: this.currentUser.role,
    //     action: 'cancelled',
    //     timestamp: new Date().toISOString()
    //   });
    // }

    // this.moveToHistory(order);
  
    // if (this.expandedOrder === order) {
    //   this.expandedOrder = null;
    // }
    
    // this.cdr.detectChanges();
  }



}