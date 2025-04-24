import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';

// Interfaces
interface MenuCategory {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  preparationTime: number; // in minutes
  isAvailable: boolean;
  quantity: number;
  allergens?: string;
}

interface Guest {
  id?: string;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  idNumber: string;
  gender: string;
  dateOfBirth?: Date;
}

interface Room {
  id: number;
  number: number;
  type: string;
  status: string;
  floor?: number;
  guest?: Guest;
  rate: number;
  beds?: number;
  maxOccupancy?: number;
  amenities?: string[];
  bookingDetails?: {
    checkinDate: Date | string;
    checkoutDate: Date | string;
  };
}

interface CartItem {
  item: MenuItem;
  quantity: number;
  subtotal: number;
  specialRequests?: string;
}

interface Cart {
  items: CartItem[];
  isExternal: boolean;
  roomNumber?: number;
  paymentMethod?: string;
  notes?: string;
}

interface ExternalCustomer {
  name: string;
}

interface PastryOrder {
  id: string;
  serviceType: 'pastry';
  roomNumber?: number;
  guestId?: string;
  externalCustomer?: {
    name: string;
  };
  items: {
    id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    category: string;
    specialRequests?: string;
    allergens?: string;
  }[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  orderDate: Date;
  completionDate?: Date;
  notes?: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
}

interface OrderTab {
  id: string;
  name: string;
}

@Component({
  selector: 'app-pastry-service',
  templateUrl: './pastry-service.component.html',
  styleUrl: './pastry-service.component.scss',
})
export class PastryServiceComponent implements OnInit {
  taxRate: number = 0.08; // 8% tax

  // State variables
  activeCategory: string = 'all';
  searchTerm: string = '';
  isExternalCustomer: boolean = false;
  selectedRoom: Room | null = null;
  occupiedRooms: Room[] = [];
  allRooms: Room[] = [];
  menuItems: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  pastryOrders: PastryOrder[] = [];
  activeTab: string = 'pending';

  // Receipt modal
  showReceiptModal: boolean = false;
  selectedReceipt: PastryOrder | null = null;

  // Menu categories
  menuCategories: MenuCategory[] = [
    { id: 'all', name: 'All Items' },
    { id: 'pastries', name: 'Pastries' },
    { id: 'cakes', name: 'Cakes' },
    { id: 'cookies', name: 'Cookies' },
    { id: 'breads', name: 'Breads' },
    { id: 'desserts', name: 'Desserts' },
    { id: 'beverages', name: 'Beverages' },
  ];

  // Order tabs
  orderTabs: OrderTab[] = [
    { id: 'pending', name: 'Pending' },
    { id: 'processing', name: 'Processing' },
    { id: 'completed', name: 'Completed' },
    { id: 'all', name: 'All Orders' },
  ];

  // Cart
  cart: Cart = {
    items: [],
    isExternal: false,
    paymentMethod: 'cash',
  };

  // External customer
  externalCustomer: ExternalCustomer = {
    name: '',
  };

  activeView: 'products' | 'orders' = 'products';

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    // Load data
    this.loadMenuItems();
    this.loadRoomsFromLocalStorage();
    this.loadOrders();

    // Initial filtering
    this.filteredItems = [...this.menuItems];

    // Get only occupied rooms
    this.updateOccupiedRooms();
  }

  get filteredOrders(): PastryOrder[] {
    if (this.activeTab === 'all') {
      return this.pastryOrders;
    }
    return this.pastryOrders.filter((order) => order.status === this.activeTab);
  }

  // Set active tab
  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }

  // Load rooms from local storage
  loadRoomsFromLocalStorage(): void {
    const storedRooms = localStorage.getItem('rooms');
    if (storedRooms) {
      this.allRooms = JSON.parse(storedRooms);
      // Process dates if needed
      this.allRooms.forEach((room) => {
        if (room.bookingDetails) {
          if (typeof room.bookingDetails.checkinDate === 'string') {
            room.bookingDetails.checkinDate = new Date(
              room.bookingDetails.checkinDate
            );
          }
          if (typeof room.bookingDetails.checkoutDate === 'string') {
            room.bookingDetails.checkoutDate = new Date(
              room.bookingDetails.checkoutDate
            );
          }
        }
      });
    } else {
      // Fallback to empty array if no rooms in local storage
      this.allRooms = [];
    }
  }

  // Load menu items
  loadMenuItems(): void {
    this.menuItems = [
      // Pastries
      {
        id: 'p1',
        name: 'Croissant',
        description: 'Buttery flaky French pastry',
        price: 1500,
        category: 'pastries',
        tags: ['breakfast', 'bakery'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat, Dairy',
      },
      {
        id: 'p2',
        name: 'Chocolate Danish',
        description: 'Flaky pastry with chocolate filling',
        price: 1800,
        category: 'pastries',
        tags: ['sweet', 'bakery'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat, Dairy, Eggs',
      },
      {
        id: 'p3',
        name: 'Apple Turnover',
        description: 'Puff pastry with apple cinnamon filling',
        price: 2000,
        category: 'pastries',
        tags: ['fruity', 'bakery'],
        preparationTime: 3,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat, Dairy',
      },

      // Cakes
      {
        id: 'c1',
        name: 'Chocolate Cake Slice',
        description: 'Rich chocolate cake with ganache',
        price: 2500,
        category: 'cakes',
        tags: ['dessert', 'chocolate'],
        preparationTime: 1,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat, Dairy, Eggs',
      },
      {
        id: 'c2',
        name: 'Cheesecake Slice',
        description: 'New York style cheesecake',
        price: 2800,
        category: 'cakes',
        tags: ['dessert', 'cream'],
        preparationTime: 1,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat, Dairy, Eggs',
      },

      // Cookies
      {
        id: 'ck1',
        name: 'Chocolate Chip Cookie',
        description: 'Classic cookie with chocolate chips',
        price: 800,
        category: 'cookies',
        tags: ['snack', 'chocolate'],
        preparationTime: 1,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat, Dairy, Eggs',
      },
      {
        id: 'ck2',
        name: 'Oatmeal Raisin Cookie',
        description: 'Hearty oatmeal cookie with raisins',
        price: 700,
        category: 'cookies',
        tags: ['snack', 'healthy'],
        preparationTime: 1,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat, Eggs',
      },

      // Breads
      {
        id: 'b1',
        name: 'Baguette',
        description: 'Traditional French bread',
        price: 1200,
        category: 'breads',
        tags: ['bread', 'artisan'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat',
      },
      {
        id: 'b2',
        name: 'Sourdough Loaf',
        description: 'Artisan sourdough bread',
        price: 1500,
        category: 'breads',
        tags: ['bread', 'artisan'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat',
      },

      // Desserts
      {
        id: 'd1',
        name: 'Tiramisu',
        description: 'Italian coffee-flavored dessert',
        price: 3000,
        category: 'desserts',
        tags: ['dessert', 'coffee'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat, Dairy, Eggs',
      },
      {
        id: 'd2',
        name: 'Fruit Tart',
        description: 'Pastry crust with custard and fresh fruit',
        price: 3200,
        category: 'desserts',
        tags: ['dessert', 'fruit'],
        preparationTime: 3,
        isAvailable: true,
        quantity: 0,
        allergens: 'Wheat, Dairy, Eggs',
      },

      // Beverages
      {
        id: 'bev1',
        name: 'Cappuccino',
        description: 'Espresso with steamed milk foam',
        price: 2000,
        category: 'beverages',
        tags: ['coffee', 'hot'],
        preparationTime: 5,
        isAvailable: true,
        quantity: 0,
        allergens: 'Dairy',
      },
      {
        id: 'bev2',
        name: 'Iced Tea',
        description: 'Freshly brewed iced tea',
        price: 1500,
        category: 'beverages',
        tags: ['tea', 'cold'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
      },
    ];
  }

  filterItems(): void {
    this.filteredItems = this.menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategory =
        this.activeCategory === 'all' || item.category === this.activeCategory;
      return matchesSearch && matchesCategory;
    });
  }

  // Set active category and filter items
  setActiveCategory(categoryId: string): void {
    this.activeCategory = categoryId;
    this.filterItems();
  }

  // Add item to cart
  addToCart(item: MenuItem): void {
    const existingItem = this.cart.items.find(
      (cartItem) => cartItem.item.id === item.id
    );

    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.subtotal = existingItem.quantity * existingItem.item.price;
    } else {
      this.cart.items.push({
        item: item,
        quantity: 1,
        subtotal: item.price,
        specialRequests: '',
      });
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Added to cart',
      detail: `${item.name} has been added to your order`,
    });
  }

  // Update cart item quantity
  updateCartItemQuantity(cartItem: CartItem, change: number): void {
    const newQuantity = cartItem.quantity + change;

    if (newQuantity < 1) {
      this.removeFromCart(this.cart.items.indexOf(cartItem));
      return;
    }

    cartItem.quantity = newQuantity;
    cartItem.subtotal = newQuantity * cartItem.item.price;
  }

  // Remove item from cart
  removeFromCart(index: number): void {
    const removedItem = this.cart.items.splice(index, 1)[0];
    this.messageService.add({
      severity: 'warn',
      summary: 'Removed from cart',
      detail: `${removedItem.item.name} has been removed from your order`,
    });
  }

  // Calculate cart subtotal
  getSubtotal(): number {
    return this.cart.items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  // Calculate tax amount
  getTaxAmount(): number {
    return this.getSubtotal() * this.taxRate;
  }

  // Calculate cart total
  getCartTotal(): number {
    return this.getSubtotal() + this.getTaxAmount();
  }

  // Toggle customer type
  toggleCustomerType(): void {
    this.cart.isExternal = this.isExternalCustomer;
    this.selectedRoom = null;
  }

  // Update occupied rooms list
  updateOccupiedRooms(): void {
    this.occupiedRooms = this.allRooms.filter(
      (room) => room.status === 'occupied'
    );
  }

  // Check if order is valid for submission
  isOrderValid(): boolean {
    if (this.cart.items.length === 0) return false;
    if (this.isExternalCustomer) {
      return !!this.externalCustomer.name;
    } else {
      return !!this.selectedRoom;
    }
  }

  // Submit order
  submitOrder(): void {
    if (!this.isOrderValid()) return;

    const newOrder: PastryOrder = {
      id: `PS-${Date.now()}`,
      serviceType: 'pastry',
      roomNumber: this.isExternalCustomer
        ? undefined
        : this.selectedRoom?.number,
      externalCustomer: this.isExternalCustomer
        ? this.externalCustomer
        : undefined,
      items: this.cart.items.map((cartItem) => ({
        id: cartItem.item.id,
        name: cartItem.item.name,
        description: cartItem.item.description,
        price: cartItem.item.price,
        quantity: cartItem.quantity,
        category: cartItem.item.category,
        specialRequests: cartItem.specialRequests,
        allergens: cartItem.item.allergens,
      })),
      subtotal: this.getSubtotal(),
      tax: this.getTaxAmount(),
      totalAmount: this.getCartTotal(),
      status: 'pending',
      orderDate: new Date(),
      paymentStatus: 'pending',
      paymentMethod: this.cart.paymentMethod,
      notes: this.cart.notes,
    };

    this.pastryOrders.push(newOrder);
    this.saveOrders();

    // Reset cart
    this.cart.items = [];
    this.cart.notes = '';

    this.messageService.add({
      severity: 'success',
      summary: 'Order Submitted',
      detail: 'Your pastry order has been placed successfully',
    });
  }

  // Load orders from localStorage
  loadOrders(): void {
    const storedOrders = localStorage.getItem('pastryOrders');
    if (storedOrders) {
      this.pastryOrders = JSON.parse(storedOrders);
      // Convert string dates back to Date objects
      this.pastryOrders.forEach((order) => {
        order.orderDate = new Date(order.orderDate);
        if (order.completionDate) {
          order.completionDate = new Date(order.completionDate);
        }
      });
    }
  }

  // Save orders to localStorage
  saveOrders(): void {
    localStorage.setItem('pastryOrders', JSON.stringify(this.pastryOrders));
  }

  // Update order status
  updateOrderStatus(
    orderId: string,
    newStatus: 'pending' | 'processing' | 'completed' | 'cancelled'
  ): void {
    const order = this.pastryOrders.find((o) => o.id === orderId);
    if (order) {
      order.status = newStatus;
      if (newStatus === 'completed') {
        order.completionDate = new Date();
        order.paymentStatus = 'paid';
      }
      this.saveOrders();

      this.messageService.add({
        severity: 'success',
        summary: 'Order Updated',
        detail: `Order status changed to ${newStatus}`,
      });
    }
  }

  // Get CSS class for order status badge
  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Open receipt modal
  printReceipt(order: PastryOrder): void {
    this.selectedReceipt = order;
    this.showReceiptModal = true;
  }

  // Close receipt modal
  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.selectedReceipt = null;
  }

  // Get guest name for room
  getGuestNameForRoom(roomNumber: number): string {
    const room = this.allRooms.find((r) => r.number === roomNumber);
    if (room && room.guest) {
      return `${room.guest.firstName} ${room.guest.lastName}`;
    }
    return 'Unknown Guest';
  }

  // Calculate receipt subtotal
  getReceiptSubtotal(): number {
    return this.selectedReceipt?.subtotal || 0;
  }

  // Calculate receipt tax
  getReceiptTax(): number {
    return this.selectedReceipt?.tax || 0;
  }

  // Get payment method display text
  getPaymentMethodDisplay(method?: string): string {
    switch (method) {
      case 'room-charge':
        return 'Charge to Room';
      case 'credit-card':
        return 'Credit Card';
      case 'cash':
        return 'Cash';
      default:
        return 'Not specified';
    }
  }

  // Download receipt as PDF
  downloadReceipt(): void {
    // In a real implementation, this would generate and download a PDF
    console.log('Downloading receipt...');
    this.messageService.add({
      severity: 'info',
      summary: 'Receipt Download',
      detail: 'Receipt download would be implemented in a real application',
    });
  }

  // Print receipt
  printReceiptPdf(): void {
    // In a real implementation, this would print the receipt
    console.log('Printing receipt...');
    this.messageService.add({
      severity: 'info',
      summary: 'Print Receipt',
      detail: 'Receipt printing would be implemented in a real application',
    });
  }
}
