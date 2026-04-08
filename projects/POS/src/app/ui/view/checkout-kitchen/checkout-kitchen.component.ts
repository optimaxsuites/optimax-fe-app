import { Component, Input, Output, EventEmitter, OnInit } from "@angular/core";
import { DecimalPipe } from '@angular/common';
import { Observable, of, lastValueFrom, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

// Import all your company interfaces and services
import {
  BranchDTO,
  CustomerDTO,
  ProductData,
  ProductDTO,
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
import { MetadataService } from "../../service/metadata.service";
import { MessageService } from "primeng/api";
import { CustomerService } from "../../service/customer.service";

// Updated interfaces with proper status structure
interface MenuItem {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  stockQuantity?: number; // Add stock quantity
  lowStockThreshold?: number;
   // Add low stock threshold
}

interface OrderItem extends ProductData  {
  productId?: any;
  qty: number;
  total: number;
  status?: string;
 
}

// CORRECTED STATUS STRUCTURE FOR ORDER FLOW
interface Order {
  table: number;
  orderNo: string;
  items: OrderItem[];
  status: 'PENDING' | 'PREPARING' | 'READY' | 'CONFIRMED' | 'CANCELLED' | 'AWAITING_CONFIRMATION' | 'UNPAID' | 'PAID' | 'DELIVERED';
  note?: string;
  date?: string;
  createdAt?: string;
  paymentMethod?: string;
  backendId?: number;
  orderId?: number;
  paymentId?: number;
  orderStatus: 'UNPAID' | 'PAID',
  orderedOn: any,
  grandTotal: number,
  total: number,
  tax: number,
  waiterId: any,
  chefId: any,
  cashierId: any,
  waiterName: string,
  chefName: string,
  cashierName: string,
  processedOn: string,
  readyOn: string, 
  completedOn: string

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

export type PaymentModes = "card" | "mobile" | "cash" | "loyalty";



@Component({
  selector: 'app-checkout-kitchen',
  templateUrl: './checkout-kitchen.component.html',
  styleUrls: ['./checkout-kitchen.component.scss']
})
export class CheckoutKitchenComponent implements OnInit {
// getItemStockStatus(_t249: OrderItem) {
// throw new Error('Method not implemented.');
// }

  // ===== ORIGINAL PAGES ONLY =====
  @Input() activePage: 'waiter' | 'chef' | 'cashier' | 'history' = 'waiter';
  @Output() orderCompleted = new EventEmitter<Order>();
  cashierFilter: 'all' | 'pending' | 'preparing' | 'ready' = 'all';
  showPaymentModal: boolean = false
  showPaymentFlow: boolean = false
  selectedPaymentModes: PaymentModes[] = [];
  customerSearch: string = ""
    customerFound: CustomerDTO | null = null;
    customerNotFound: boolean = false;
    showCreateCustomerModal: boolean = false;
    isLoading: boolean = false
    paymentValues: Record<PaymentModes, number | null> = {
      cash: null,
      card: null,
      loyalty: null,
      mobile: null,
    };
  priceOptionsMap: Record<PaymentModes, Array<{ label: string; value: number }>> = {
      cash: [],
      card: [],
      loyalty: [],
      mobile: [],
    };
  newCustomer: CustomerDTO = {
    id: 0,
    name: "",
    phoneNumber: "",
    email: "",
    loyaltyPoints: 0,
  };
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
  menu: ProductData[] = [];
  orders: Order[] = [];
  historyOrders: Order[] = [];
  orderItems: OrderItem[] = [];
  selectedOrder?: Order 
  cashierOrderRowClass = (order: Order) => ({
    'order-row': true,
    selected: this.selectedOrder === order
  });


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
  private _tableStatuses: TableOrderStatusGET[] = [] 
  private readonly _dummyTableOrderStatus = 9999999; // For optimistic updates

  private readonly statusWeights: { [key: string]: number } = {
  'READY': 1,      // Top
  'PENDING': 2,
  'PREPARING': 3,
  'SERVED': 4,
  'CANCELLED': 5   // Bottom
};

  currentUser: StaffMember | null = null;
chefNoteText: string = "";


companyInfo = {
    name: 'Restaurant Name',
    address: 'Address will load from session storage',
    phone: 'Phone number',
    email: 'Email address',
    // vatNumber: 'VAT-Number'
  };


  constructor(
    private _posService: PosServiceService,
    private _checkoutService: CheckoutService,
    private _imageCacheService: ImageCacheService,
    private _paymentService: PaymentServiceService,
    private _productHelperService: ProductHelperService,
    private _userService: UserService,
    private metadataServices: MetadataService,
    private messageService: MessageService,
    private customerService: CustomerService
  ) {}

  ngOnInit() {
    this.initializeCompanyData();
    this.initializeCurrentUser()
    this.getCompanyInfoFromSessionStorage()
    
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
      let userId = sessionStorage.getItem('userid') || 0
      
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
          id: +userId,
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
  getStockStatus(item: ProductData): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (!item.quantity && item.quantity !== 0) {
      return 'in-stock'; // If no stock data, assume it's available
    }
    
    if (item.quantity === 0) {
      return 'out-of-stock';
    }
    
    if (item.quantity <= this.lowStockThreshold) {
      return 'low-stock';
    }
    
    return 'in-stock';
  }

  getStockBadgeText(item: ProductData): string {
    const status = this.getStockStatus(item);
    
    switch (status) {
      case 'out-of-stock':
        return 'Out of Stock';
      case 'low-stock':
        return `Low Stock (${item.quantity})`;
      default:
        return '';
    }
  }

  canAddToOrder(item: ProductData): boolean {
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
        this._tableStatuses = fetchedTableOrderStatuses
        
        
        // Sync local orders with company data
        this.syncOrdersWithCompanyData();
      }

      // Skip branches loading to avoid 500 error
      // console.log('Skipping branch loading to avoid backend 500 error');
      // this._fetchedBranches = [];

      // Fetch products
      // const fetchedProducts = this.metadataServices.enrichedProduct$
      
      // if (fetchedProducts && fetchedProducts.length > 0) {
      //   // Clear existing data
      //   this.productCategories.clear();
      //   this.menu = [];
        
      //   fetchedProducts.forEach((fetchedProduct) => {
      //     const {
      //       productCategory: { name: category },
      //       variants: possibleVariants,
      //     } = fetchedProduct;
          
      //     const variantProducts = possibleVariants.reduce<ProductData[]>(
      //       (acc, val) => [
      //         ...acc,
      //         { ...fetchedProduct, selectedVariants: [val] },
      //       ],
      //       [],
      //     );

      //     if (this.productCategories.has(category)) {
      //       this.productCategories
      //         .get(category)!
      //         .push(fetchedProduct, ...variantProducts);
      //     } else {
      //       this.productCategories.set(category, [
      //         fetchedProduct,
      //         ...variantProducts,
      //       ]);
      //     }
      //     this._productIdAndDataMap.set(fetchedProduct.id, fetchedProduct);
      //   });

      //   this.currCategoryProducts = this.productCategories.values().next().value ?? [];
        
      //   // Map company products to menu items with resolved images and stock data
      //   await this.mapProductsToMenu(fetchedProducts);
        
      // } else {
      //   console.warn('No products fetched or products array is empty');
      //   this.currCategoryProducts = [];
      //   this.menu = [];
      // }

      // Update table number after data is loaded
       this.metadataServices.enrichedProduct$.subscribe(async (data) => {
      if (data) {
        console.log(data);
        const p = data.sort((a: any, b: any) => {
          const dateA = new Date(
            a.createdDate[0],
            a.createdDate[1] - 1,
            a.createdDate[2],
            a.createdDate[3],
            a.createdDate[4],
            a.createdDate[5],
          );
          const dateB = new Date(
            b.createdDate[0],
            b.createdDate[1] - 1,
            b.createdDate[2],
            b.createdDate[3],
            b.createdDate[4],
            b.createdDate[5],
          );
          return dateB.getTime() - dateA.getTime();
        }) as any[];
      
      // Sort products: in-stock first, then out-of-stock
      p.sort((a, b) => {
        const aInStock = a.quantity > 0 ? 1 : 0;
        const bInStock = b.quantity > 0 ? 1 : 0;
        return bInStock - aInStock;
      });
      
      this.menu = [...p];
      
      }
    });
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
    

    this._tableStatuses.sort((a, b) => {
    // A. First Sort by Status Weight
    const weightA = this.statusWeights[a.status] || 99;
    const weightB = this.statusWeights[b.status] || 99;
    
    if (weightA !== weightB) {
      return weightA - weightB;
    }

    // B. If statuses are the same, Sort by Date (Most Recent first)
    // Convert arrays [2026, 1, 18...] to Date objects for comparison
    const dateA = arrayToDate(a.orderedOn).getTime();
    const dateB = arrayToDate(b.orderedOn).getTime();
    
    return  dateA - dateB; // Descending: Newest orders first within the same status
  });

  for (const tableStatus of this._tableStatuses) {
      const localOrder = this.convertTableStatusToOrder(tableStatus);
      
      if (localOrder) {
        // Only add to history if status is CONFIRMED or CANCELLED
        if (localOrder.status === 'CONFIRMED' ) {
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
  // async sendToKitchenNew() {
  //   if (this.orderItems.length === 0) {
  //     alert('Add items before sending to kitchen');
  //     return;
  //   }

  //   try {
  //     console.log('🍳 Sending order to kitchen...');
      
  //     // Create a simple local order first for immediate display
  //     const newOrder: Order = {
  //       table: this.currentTable,
  //       orderNo: this.orderNo,
  //       items: [...this.orderItems],
  //       status: 'UNPAID', // Start as UNPAID - chef will see this immediately
  //       note: this.orderNote,
  //       createdAt: new Date().toISOString(),
  //       orderStatus: 'UNPAID'
  //     };

  //     // Add to orders array (will appear in chef page as UNPAID)
  //     this.orders.push(newOrder);
      
  //     console.log('✅ Order created locally with status UNPAID:', newOrder);

  //     // Clear the current order form
  //     this.orderItems = [];
  //     this.orderNo = '#A' + Math.floor(1000 + Math.random() * 9000);
  //     this.orderNote = '';
  //     this.waiterView = 'overview';
      
  //     // Find next available table
  //     this.findNextAvailableTable();
      
  //     alert(`✅ Order for Table ${newOrder.table} sent to kitchen successfully! Chef can now see it.`);
      
  //   } catch (error: any) {
  //     console.error('Error sending order to kitchen:', error);
  //     alert('Error creating order. Please try again.');
  //   }
  // }

  async sendToKitchenNew() {
  if (this.orderItems.length === 0) {
    alert('Add items before sending to kitchen');
    return;
  }

  try {
    // this.isProcessingPayment = true; // Visual loader
    const paymentPayload = {
      // "id": 0,
      totalAmount: this.getGrandTotal(),   
      transactionDate: new Date().toISOString(),
      status: "PENDING",
    }

    const createdPayment = await lastValueFrom(this._checkoutService.makePayment(paymentPayload));

    console.log('🍳 Initiating Order Creation...');
    let branchId 
    this.metadataServices.selectedBranchId$.subscribe(data => branchId = data);
    // 1. Prepare Order Payload
    const orderPayload: any = {
      id: 0,
      orderNumber: this.orderNo,
      orderStatus: 'UNPAID', // Start as unpaid for kitchen
      totalAmount: this.total.toString(),
      branchId: branchId, // Fallback if branch list is empty
      orderItem: this.orderItems.map(item => ({
        productId: item.id,
        quantity: item.qty,
        totalPrice: item.total,
        // productVariantId: 0,
      })),
      cashierId: this.currentUser?.id || 0,
      isOnline: false,
      totalTax: this.getTax(),
      grandTotal: this.getGrandTotal(),
      quantity: 0,
      deliveryStatus: "CONFIRMED",
      createdDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentId: createdPayment
    };

    // 2. Call Order Endpoint
    // Note: Assuming your service method is createOrder or similar
    const createdOrder = await lastValueFrom(this._posService.createOrder(orderPayload));
    console.log('✅ Order Created:', createdOrder);

    // 3. Prepare Table Order Status Payload using createdOrder.id
    const tableOrderPayload = {
      tableNumber: this.currentTable.toString(),
      status: 'PENDING',
      waterId: this.currentUser?.id || 0,
      orderedOn: new Date().toISOString(),
      note: this.formatNoteEntry(this.orderNote),
      orderId: createdOrder.id,
      chefId: 0,
      cashierId:  0,
    };

    // 4. Call Table Order Status Endpoint
    await lastValueFrom(this._posService.addTableOrderStatus(tableOrderPayload));
    console.log('✅ Table Status Updated');

    // 5. Cleanup UI
    this.orderItems = [];
    this.orderNo = '#A' + Math.floor(1000 + Math.random() * 9000);
    this.orderNote = '';
    this.waiterView = 'overview';
    
    // Refresh the list to show the new backend-driven order
    await this.initializeCompanyData();
    // alert(`✅ Order for Table ${this.currentTable} sent to kitchen!`);
    this.messageService.add({
        severity: "success",
        summary: "Sent to kitchen",
        detail: `Order for Table ${this.currentTable} sent to kitchen!`,
        key: "tl",
        life: 3000,
      });

  } catch (error: any) {
    console.error('❌ Error in waiter flow:', error);
    // alert('Failed to send order. Please check connection.');
    this.messageService.add({
        severity: "error",
        summary: "Not sent to kitchen",
        detail: `Failed to send order. Please check connection.`,
        key: "tl",
        life: 3000,
      });
  } finally {
    this.isProcessingPayment = false;
  }
}

  // ===== CHEF ORDER PROCESSING =====
  async updateOrderByChef(order: Order, newStatus: 'PREPARING' | 'READY' | 'CONFIRMED') {
    try {
      console.log(`👨‍🍳 Chef updating order ${order.waiterId} from ${order.status} to: ${newStatus}`);
      
      // Update local status - chef can process UNPAID orders

      
      

      console.log(`✅ Order ${order} status updated to: ${newStatus}`);
      
      const payload = {
          id: order.backendId,
          status: newStatus,
          chefId: this.currentUser?.id,
          note: order.note,
          tableNumber: String(order.table),
          waterId: order.waiterId || 0,
          orderedOn: arrayToDate(order.orderedOn).toISOString(),
          orderId: order.orderId,
          processedOn: newStatus == "PREPARING" ? new Date().toISOString() : order.processedOn ? order.processedOn : null,
          readyOn: newStatus == "READY" ? new Date().toISOString() : order.readyOn ? order.readyOn : null,
          completedOn: newStatus == "CONFIRMED" ? new Date().toISOString() : order.completedOn ? order.completedOn : null,
      };

      await lastValueFrom(this._posService.addTableOrderStatus(payload));
      order.status = newStatus;

        await this.initializeCompanyData(); 

        this.messageService.add({
        severity: "success",
        summary: "Updated Successfully",
        detail: `Order has been updated`,
        key: "tl",
        life: 3000,
      });
      
    } catch (error) {
      console.error("Update failed", error);
        this.chefNoteText = ""
        this.messageService.add({
                severity: "error",
                summary: "An error occurred",
                detail: `Cannot update order, try again`,
                key: "tl",
                life: 3000,
              });
    }
  }

  // ===== CASHIER PAYMENT PROCESSING =====
  async updateCashierStatus(newStatus: 'PAID' | 'CANCELLED' | 'DELIVERED' = 'DELIVERED') {
    if (!this.selectedOrder || this.selectedOrder.status === 'READY' && this.selectedOrder.orderStatus === 'UNPAID' || this.selectedOrder.status === 'DELIVERED'  && this.selectedOrder.orderStatus === 'UNPAID') return;
    try {
      
      const payload = {
          id: this.selectedOrder?.backendId,
          status: newStatus,
          chefId: this.selectedOrder?.chefId || 0,
          note: this.selectedOrder?.note,
          cashierId: this.currentUser?.id,
          tableNumber: String(this.selectedOrder?.table),
          waterId: this.selectedOrder?.waiterId || 0,
          orderedOn: arrayToDate(this.selectedOrder?.orderedOn).toISOString(),
          orderId: this.selectedOrder?.orderId 
      };

      await lastValueFrom(this._posService.addTableOrderStatus(payload));
      this.selectedOrder.status = newStatus;

        await this.initializeCompanyData(); 

        this.messageService.add({
        severity: "success",
        summary: "Updated Successfully",
        detail: `Order has been updated`,
        key: "tl",
        life: 3000,
      });
      
    } catch (error) {
      console.error("Update failed", error);
        this.chefNoteText = ""
        this.messageService.add({
                severity: "error",
                summary: "An error occurred",
                detail: `Cannot update order, try again`,
                key: "tl",
                life: 3000,
              });
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

 
  get activeChefOrders(): Order[] {
    // Chef sees UNPAID orders (incoming) and PREPARING/READY orders (in progress)
    return this.orders.filter(o => 
      o.status === 'PENDING' || 
      o.status === 'PREPARING' || 
      o.status === 'READY' || o.status === 'AWAITING_CONFIRMATION'
    );
  }

  get activeCashierOrders(): Order[] {
    // Cashier sees READY orders (ready for payment) and PAID orders (completed payments)
    return this.orders.filter(o => o.status === 'READY' || o.status === 'PAID');
  }

 // ===== HELPER METHODS =====
  // private determineEffectiveStatus(tableStatus: TableOrderStatusGET): string {
  //   if (tableStatus.status === 'PAID') {
  //     return 'PAID';
  //   }
    
  //   if (tableStatus.order?.orderStatus === 'PAID') {
  //     return 'PAID';
  //   }
    
  //   return tableStatus.status || 'UNPAID';
  // }

  private convertTableStatusToOrder(tableStatus: TableOrderStatusGET): any {
    const orderItems: any[] = [];

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
            id: item.id,
            productId: item.product.id
          });
        }
      }
    }

    const paymentMethod = (tableStatus.order as any)?.['paymentMethod'] || 
                         (tableStatus.order?.payment as any)?.['paymentMethod'] || 
                         'Cash';

    // const effectiveStatus = this.determineEffectiveStatus(tableStatus);
    // const localStatus = this.mapCompanyStatusToLocal(effectiveStatus);

    // Convert the array to a Date object safely for the UI display
    const dateObj = arrayToDate(tableStatus.orderedOn);

    return {
      table: this.convertStrToNum(tableStatus.tableNumber),
      orderNo: tableStatus.order?.orderNumber || 'N/A',
      items: orderItems,
      status: tableStatus.status,
      note: tableStatus.note,
      date: dateObj.toLocaleString(),
      createdAt: dateObj.toLocaleString(),
      paymentMethod: paymentMethod,
      backendId: tableStatus.id, // TableOrderStatus ID
      orderId: tableStatus.order?.id, // Order ID
      waiterId: tableStatus.water?.id,
      chefId: tableStatus.chef?.id,
      waiterName: tableStatus.water?.username,
      chefName: tableStatus.chef?.username,
      cashierId: tableStatus.cashier?.id,
      cashierName: tableStatus.cashier?.username,
      orderStatus: tableStatus.order.orderStatus,
      orderedOn: tableStatus.orderedOn,
      grandTotal: tableStatus.order?.grandTotal,
      tax: tableStatus.order.tax,
      total: tableStatus.order.totalAmount,
      
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
      case 'PENDING': return 'PENDING'
      default: return 'UNPAID';
    }
  }

  // ===== PRODUCT AND STOCK METHODS =====
  // private async mapProductsToMenu(fetchedProducts: ProductData[]) {
  //   const ProductDatas: ProductData[] = [];
    
  //   for (const product of fetchedProducts) {
  //     const productData = this.getProductData(product);
  //     const imageUrl = await this.resolveProductImage(product);
      
  //     // Get stock data from backend
  //     const stockQuantity = await this.getProductStockQuantity(product.id);
      
  //     ProductDatas.push({
  //       category: product.productCategory?.name || 'Uncategorized',
  //       ...product,
  //       price: this.convertStrToNum(productData.sellingPrice || "0"),
  //       image: imageUrl,
  //       stockQuantity: stockQuantity,
  //       lowStockThreshold: this.lowStockThreshold
  //     });
  //   }

  //   this.menu = ProductDatas;
  //   console.log('Mapped company products to menu with stock data:', this.menu);
  // }

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
  addToOrder(item: ProductData) {
    if (!this.canAddToOrder(item)) {
      alert(`Sorry, ${item.name} is out of stock!`);
      return;
    }

    const existing = this.orderItems.find(i => i.id === item.id);
    if (existing) {
      // Check if adding more would exceed available stock
      if (item.quantity && (existing.qty + 1) > item.quantity) {
        alert(`Sorry, only ${item.quantity} ${item.name} available in stock!`);
        return;
      }
      existing.qty++;
      existing.total = existing.qty * Number(existing.sellingPrice);
    } else {
      this.orderItems.push({ ...item, qty: 1, total: Number(item.sellingPrice) });
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
    item.total = item.qty * Number(item.sellingPrice);

    if (item.qty <= 0) order.items = order.items.filter(i => i.id !== itemId);
  }

  changeQtySingle(itemId: number, delta: number) {
    const item = this.orderItems.find(i => i.id === itemId);
    if (!item) return;

    item.qty += delta;
    item.total = item.qty * Number(item.sellingPrice);

    if (item.qty <= 0) this.orderItems = this.orderItems.filter(i => i.id !== itemId);
  }

  getOrderTotal(order: Order): number {
    return order.items.reduce((sum, i) => sum + i.total, 0);
  }

  getSubtotal(): number {
    if (!this.orderItems) return 0;
    return this.orderItems.reduce((sum, i) => sum + i.total, 0);
  }

  getTax(order?: Order): number {
    return this.orderItems.reduce((sum, item) => {
      let itemTotal = (item.count ?? 0) * parseFloat(item.sellingPrice || "0");

      let variantsTotal = (item.selectedVariants ?? []).reduce(
        (variantAcc, variant) =>
          variantAcc +
          (variant.selectedQuantity ?? 0) * (Number(variant.price) || 0),
        0,
      );

      let subtotal = itemTotal + variantsTotal;

      let taxRate = item.tax?.rate || item.product?.tax?.rate || 0;

      return sum + (taxRate / 100) * subtotal;
    }, 0);
  }

  getGrandTotal(order?: Order): number {
    return this.getSubtotal() + this.getTax(order);
  }

  // printInvoice() {
  //   window.print();
  // }

  get filteredMenu(): ProductData[] {
    let filtered = this.menu.filter(m => 
      m.name.toLowerCase().includes(this.search.toLowerCase())
    );
    if (this.activeCategory !== 'All') {
      filtered = filtered.filter(m => m.name === this.activeCategory);
    }
    return filtered;
  }

  get categories(): any[] {
    let uniqueCategories: any [] = []
    this.metadataServices.category$.subscribe(data => uniqueCategories = [...data])
    return [{name: "All"}, ...Array.from(uniqueCategories)];
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
    return (order.status === 'PENDING' || order.status === 'AWAITING_CONFIRMATION' || order.status === 'UNPAID') && order.orderStatus !== 'PAID';
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

   async updateOrderByWaiter(order: Order, newStatus: 'PENDING' | 'DELIVERED' | 'CONFIRMED') {
    try {

       const existingNote = order.note || '';
        
        const newEntry = this.formatNoteEntry(this.orderNote);
        
        const updatedNote = existingNote ? `${existingNote}\n${newEntry}` : newEntry;
      
      const payload = {
          id: order.backendId,
          status: newStatus,
          chefId: order.chefId || 0,
          note: updatedNote,
          tableNumber: String(order.table),
          waterId: this.currentUser?.id,
          orderedOn: arrayToDate(order.orderedOn).toISOString(),
          orderId: order.orderId 
      };

      await lastValueFrom(this._posService.addTableOrderStatus(payload));
      order.status = newStatus;

        await this.initializeCompanyData(); 

        this.messageService.add({
        severity: "success",
        summary: "Updated Successfully",
        detail: `Order has been updated`,
        key: "tl",
        life: 3000,
      });
      
    } catch (error) {
      console.error("Update failed", error);
        this.chefNoteText = ""
        this.messageService.add({
                severity: "error",
                summary: "An error occurred",
                detail: `Cannot update order, try again`,
                key: "tl",
                life: 3000,
              });
    }
  }


  cancelOrderByWaiter(order: Order) {
    order.status = 'CANCELLED';
    const tableOrderPayload = {
      id: order.backendId,
      tableNumber: String(order.table),
      status: 'CANCELLED',
      waterId: this.currentUser?.id || 0,
      orderedOn: arrayToDate(order.orderedOn).toISOString(),
      note: order.note,
      orderId: order.orderId 
    }
    console.log(tableOrderPayload)
    this._posService.addTableOrderStatus(tableOrderPayload).subscribe({
      next: (data) => {
        this.messageService.add({
        severity: "success",
        summary: "Cancelled Successfully",
        detail: `Order has been cancelled`,
        key: "tl",
        life: 3000,
      });
      },
      error: (error) => {
        console.log(error)
        this.messageService.add({
        severity: "error",
        summary: "An error occurred",
        detail: `Cannot cancel order, try again`,
        key: "tl",
        life: 3000,
      });
      }
    })
    // this.cdr.detectChanges();
  }

  private formatNoteEntry(message: string): string {
  if (!message || message.trim() === '') return '';
  
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  
  // Example: "chef: Food is ready (18/1/2026 05:53pm)"
  const role = this.testMode.toLowerCase(); // 'waiter', 'chef', or 'cashier'
  return `\n${role}: ${message} (${dateStr} ${timeStr})`;
}

async saveChefNoteAndSetAwaiting(order: Order) {
    if( this.chefNoteText.length === 0) return
   try {
    const existingNote = order.note || '';
        
        // Format the new comment
        const newEntry = this.formatNoteEntry(this.chefNoteText || `Status changed to Awaiting_Confirmation`);
        
        // Combine them with a newline for the textarea
        const updatedNote = existingNote ? `${existingNote}\n${newEntry}` : newEntry;

        const payload = {
          id: order.backendId,
          status: "AWAITING_CONFIRMATION",
          chefId: this.currentUser?.id,
          note: updatedNote,
          tableNumber: String(order.table),
          waterId: order.chefId|| 0,
          orderedOn: arrayToDate(order.orderedOn).toISOString(),
          orderId: order.orderId 
        };

        await lastValueFrom(this._posService.addTableOrderStatus(payload));
        await this.initializeCompanyData(); 
        this.chefNoteText = ""
        this.messageService.add({
        severity: "success",
        summary: "Updated Successfully",
        detail: `Order has been updated`,
        key: "tl",
        life: 3000,
      });
      } catch (error) {
        console.error("Update failed", error);
        this.chefNoteText = ""
        this.messageService.add({
                severity: "error",
                summary: "An error occurred",
                detail: `Cannot update order, try again`,
                key: "tl",
                life: 3000,
              });
      }
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

   setCashierFilter(filter: 'all' | 'pending' | 'preparing' | 'ready') {
    this.cashierFilter = filter;
  }


   getPendingAndAwaitingOrders(): Order[] {
    return this.orders
      .filter(o => o.orderStatus === "PAID" && (o.status === 'PENDING' || o.status === 'AWAITING_CONFIRMATION'))
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; 
      });
  }

  getPreparingOrders(): Order[] {
    return this.orders
      .filter(o => o.orderStatus === "PAID" && o.status === 'PREPARING')
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  getReadyOrders(): Order[] {
    return this.orders
      .filter(o => o.orderStatus === "PAID" && o.status === 'READY' ||  o.status === 'DELIVERED')
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; 
      });
  }
 getAllActiveOrders(): Order[] {
  
    return this.orders
      .filter(o => o.orderStatus === "UNPAID" && o.status !== 'CANCELLED')
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; 
      });
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
          email: userData.email || 'Not specified'
        };
        
        console.log('🏢 Company info loaded from session storage:', this.companyInfo);
      } else {
        console.warn('⚠️ No user data found in session storage, using default company info');
        // this.setDefaultCompanyInfo();
      }
    } catch (error) {
      console.error('❌ Error getting company info from session storage:', error);
      // this.setDefaultCompanyInfo();
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
openPaymentModal() {
    if (!this.selectedOrder || this.selectedOrder.orderStatus == 'PAID') return;
      this.showPaymentFlow = false
    this.showPaymentModal = true;
  }



   onPaymentsConfirmed(modes: PaymentModes[]) {
      this.selectedPaymentModes = modes;
      this.showPaymentModal = false;
      this.showPaymentFlow = true


      console.log(this.selectedPaymentModes)
    }

  
findCustomer() {
    if (!this.customerSearch) return;

    this.isLoading = true;

    this.customerService.getCustomerByPhone(this.customerSearch).subscribe({
      next: (customer) => {
        this.customerFound = customer;
        this.customerNotFound = false;
        this.paymentValues["loyalty"] = customer.loyaltyPoints || null;
        this.isLoading = false;
      },
      error: (err) => {
        console.error("Customer lookup failed:", err);
        this.customerFound = null;
        this.customerNotFound = true;
        this.isLoading = false;
      },
    });
  }

   openCreateCustomerModal(): void {
    this.showCreateCustomerModal = true;
    this.newCustomer = {
      id: 0,
      name: "",
      phoneNumber: this.customerSearch,
      email: "",
      loyaltyPoints: 0,
    };
  }
  createCustomer(): void {
    if (!this.newCustomer.name || !this.newCustomer.phoneNumber) return;

    this.customerService.createCustomer(this.newCustomer).subscribe(
      (customer) => {
        this.customerFound = customer;
        this.customerNotFound = false;
        this.showCreateCustomerModal = false;
        this.messageService.add({
          severity: "success",
          summary: "Success",
          detail: "Customer created successfully",
          key: "tl",
          life: 3000,
        });
      },
      (error) => {
        this.messageService.add({
          severity: "warn",
          summary: "Error",
          detail: "Failed to create customer",
          key: "tl",
          life: 3000,
        });
        console.error("Customer creation error:", error);
      }
    );
  }

  getPaymentLabel(mode: string): string {
    const labels: { [key: string]: string } = {
      cash: "Cash Tendered",
      card: "Amount Charged to Card",
      loyalty: "Loyalty Charge",
      mobile: "Mobile"
    };
    return labels[mode] || "Payment Amount";
  }

  get totalPaid() {
    return (
      (this.paymentValues.cash ?? 0) +
      (this.paymentValues.card ?? 0) +
      (this.paymentValues.loyalty ?? 0) +
      (this.paymentValues.mobile ?? 0) 
    );
  }

  get balanceLeft() {
    return Math.max(0, (this.selectedOrder?.total || 0) - this.totalPaid);
  }

    getLoyaltyMax(mode: string): number | null {
    return mode === "loyalty" && this.customerFound?.loyaltyPoints != null
      ? this.customerFound.loyaltyPoints
      : null;
  }

  removePaymentMode(modeToRemove: PaymentModes) {
      this.paymentValues[modeToRemove] = null;
      this.selectedPaymentModes = this.selectedPaymentModes.filter(
        (mode) => mode !== modeToRemove);
      this.updatePriceOptions();
    }

  updatePriceOptions() {
    const balance = this.balanceLeft;
    const commonOptions = [
      { label: "Balance", value: balance },
      { label: "10000", value: 10000 },
      { label: "20000", value: 20000 },
    ];

    this.priceOptionsMap.cash = commonOptions;
    this.priceOptionsMap.card = commonOptions;
    this.priceOptionsMap.loyalty = commonOptions;
    this.priceOptionsMap.mobile = commonOptions;
  }

   getPriceOptions(mode: PaymentModes) {
    const commonOptions = [
      { label: "Balance", value: this.balanceLeft },
      { label: "10000", value: 10000 },
      { label: "20000", value: 20000 },
    ];
  
    if (mode === 'loyalty' && this.customerFound?.loyaltyPoints) {
      const loyaltyAmount = Math.min(this.customerFound.loyaltyPoints, this.balanceLeft);
      return [{ label: `Loyalty Points (${loyaltyAmount})`, value: loyaltyAmount }, ...commonOptions];
    }
    return commonOptions;
  }

   private getBackendPaymentMethod(mode: string): string {
    const map: Record<string, string> = {
      cash: "CASH",
      card: "CARD",
      loyalty: "LOYALTY_POINTS",
      mobile: "MOBILE_MONEY",
    };
    return map[mode] || mode.toUpperCase();
  }
 async processCashPayment(){
    this.isProcessingPayment = true
    this.showPaymentFlow = false

    console.log(this.selectedOrder)

    const now = new Date().toISOString();
    const onlinePaymentPayload = { id: this.selectedOrder?.paymentId, totalAmount: this.selectedOrder?.total, transactionDate: now, status: "PAID", };
    this._checkoutService.makePayment(onlinePaymentPayload).subscribe(
        { next: (paymentId) => {
          // if (!paymentId) return this.showError("Missing payment ID from response"); 
          const paymentBreakdownPayloads = this.selectedPaymentModes.map((mode) => (
            { id: 0, 
              amountPaid: this.paymentValues[mode], 
              transactionRefernce: "", 
              paymentMethod: this.getBackendPaymentMethod(mode), 
              paymentId: paymentId, 
            }
          )); 
        let breakdownCount = 0; 
        for (const breakdown of paymentBreakdownPayloads) { 
          this._checkoutService.savePaymentBreakdown(breakdown).subscribe({
            next: () => {
              breakdownCount++; 
              if (breakdownCount === paymentBreakdownPayloads.length) { 
                this.updateOrder(paymentId); 
              } 
              }, 
            error: () => this.messageService.add({
        severity: "error",
        summary: "Payment Error",
        detail: `Failed to process payment`,
        key: "tl",
        life: 3000,
      }) 
            }); 
            } 
          },
            
          error: () => this.messageService.add({
        severity: "error",
        summary: "Payment Error",
        detail: `Failed to process payment`,
        key: "tl",
        life: 3000,
      }) 
        });
  
  }


  async updateOrder(paymentId?: number) {
    const branchId = await firstValueFrom(this.metadataServices.selectedBranchId$);
    
    const orderPayload: any = {
          id: this.selectedOrder?.orderId,
          orderNumber: this.selectedOrder?.orderNo,
          orderStatus: 'PAID', 
          totalAmount: this.selectedOrder?.total,
          branchId: branchId, 
          orderItem: this.selectedOrder?.items.map(item => ({
            id: item.id,
            productId: item.productId,
            quantity: item.qty,
            totalPrice: item.total,
            // productVariantId: 0,
          })),
          isOnline: false,
          totalTax: this.selectedOrder?.tax,
          grandTotal: this.selectedOrder?.grandTotal,
          quantity: 0,
          deliveryStatus: "CONFIRMED",
          cashierId: this.currentUser?.id || 0,
          paymentId: paymentId ? paymentId : this.selectedOrder?.paymentId
        };

      try{
     await lastValueFrom(this._posService.createOrder(orderPayload));
        this.isProcessingPayment = false
        this.messageService.add({
        severity: "success",
        summary: "Paid Successfully",
        detail: `Order has been completed`,
        key: "tl",
        life: 3000,
      });
      }
      catch{
        this.isProcessingPayment = false
        this.messageService.add({
        severity: "error",
        summary: "Update Error",
        detail: `Failed to update order`,
        key: "tl",
        life: 3000,
      });
      }
  }

   printInvoice() {
  if (!this.selectedOrder) return;

  const printContent = this.generateReceiptHTML(this.selectedOrder);
  
  // 1. Create a unique ID for the print frame
  const frameId = 'receipt-print-frame';
  let printFrame = document.getElementById(frameId) as HTMLIFrameElement;

  // 2. Remove existing frame if it exists to clear old data
  if (printFrame) {
    document.body.removeChild(printFrame);
  }

  // 3. Create a new hidden iframe
  printFrame = document.createElement('iframe');
  printFrame.id = frameId;
  printFrame.style.position = 'fixed';
  printFrame.style.right = '0';
  printFrame.style.bottom = '0';
  printFrame.style.width = '0';
  printFrame.style.height = '0';
  printFrame.style.border = 'none';
  document.body.appendChild(printFrame);

  // 4. Write the content to the iframe
  const doc = printFrame.contentWindow?.document || printFrame.contentDocument;
  if (doc) {
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Invoice - ${this.selectedOrder.orderNo}</title>
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
        </body>
      </html>
    `);
    doc.close();

    // 5. Trigger the print dialog from the iframe context
    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    }, 500);
  }
}
 
  private generateReceiptHTML(order: Order): string {

    const staffInfo = [];
    if (order.waiterId) staffInfo.push({ role: 'Waiter', name: order.waiterId });
    if (order.chefId) staffInfo.push({ role: 'Chef', name: order.chefId });
    if (order.cashierId) staffInfo.push({ role: 'Cashier', name: order.cashierId });
    
    return `
      <div class="invoice-header">
        <h1 class="company-name">${this.companyInfo.name}</h1>
        <p>${this.companyInfo.address}</p>
        <p>📞 ${this.companyInfo.phone} | ✉️ ${this.companyInfo.email}</p>
      </div>
      
      <div class="invoice-details">
        <div>
          <h3>TAX INVOICE</h3>
          <p><strong>Invoice #:</strong> ${order.orderNo}</p>
          <p><strong>Date:</strong> ${order.date }</p>
          <p><strong>Generated By:</strong> ${this.getCashierName()}</p>
        </div>
        <div>
          <p><strong>Table:</strong> ${order.table}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod || 'Cash'}</p>
          <p><strong>Status:</strong> PAID</p>
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
              <td>₦${item.sellingPrice?.toLocaleString()}</td>
              <td>₦${item.total.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="summary">
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Subtotal:</span>
          <span>₦${order.total}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Tax(s):</span>
          <span>₦${order.tax}</span>
        </div>
        <div class="grand-total" style="display: flex; justify-content: space-between; margin: 10px 0;">
          <span>TOTAL:</span>
          <span>₦${order.grandTotal}</span>
        </div>
      </div>
      
      
      <div class="thank-you">
        <p>Thank you for dining with us!</p>
        <p>This is a computer generated receipt. No signature required.</p>
        <p>For inquiries: ${this.companyInfo.phone} | ${this.companyInfo.email}</p>
        <p>${this.companyInfo.name} - ${this.companyInfo.address}</p>
      </div>
    `;
  }


}
