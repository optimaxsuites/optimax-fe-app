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
  serviceType: 'kitchen' | 'pastry';
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
  tableNumber?: string;
  dateOfBirth?: Date;
}

interface Order {
  id: string;
  serviceType: 'kitchen' | 'pastry';
  roomNumber?: number;
  guestId?: string;
  externalCustomer?: ExternalCustomer;
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
  selector: 'app-room-service',
  templateUrl: './room-service.component.html',
  styleUrls: ['./room-service.component.scss'],
})
export class RoomServiceComponent implements OnInit {
  taxRate: number = 0.08; // 8% tax

  // State variables
  activeView: 'kitchen' | 'pastry' | 'orders' = 'kitchen';
  activeKitchenCategory: string = 'all';
  activePastryCategory: string = 'all';
  kitchenSearchTerm: string = '';
  pastrySearchTerm: string = '';
  isExternalCustomer: boolean = false;
  selectedRoom: Room | null = null;
  occupiedRooms: Room[] = [];
  allRooms: Room[] = [];
  kitchenItems: MenuItem[] = [];
  pastryItems: MenuItem[] = [];
  filteredKitchenItems: MenuItem[] = [];
  filteredPastryItems: MenuItem[] = [];
  orders: Order[] = [];
  activeTab: string = 'pending';
  showReceiptModal: boolean = false;
  selectedReceipt: Order | null = null;

  // Menu categories
  kitchenCategories: MenuCategory[] = [
    { id: 'all', name: 'All Items' },
    { id: 'breakfast', name: 'Breakfast' },
    { id: 'main', name: 'Main Courses' },
    { id: 'soups', name: 'Soups' },
    { id: 'salads', name: 'Salads' },
    { id: 'desserts', name: 'Desserts' },
    { id: 'kids', name: 'Kids Menu' },
  ];

  pastryCategories: MenuCategory[] = [
    { id: 'all', name: 'All Items' },
    { id: 'cakes', name: 'Cakes' },
    { id: 'pastries', name: 'Pastries' },
    { id: 'cookies', name: 'Cookies' },
    { id: 'breads', name: 'Breads' },
    { id: 'desserts', name: 'Desserts' },
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

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.loadMenuItems();
    this.loadRoomsFromLocalStorage();
    this.loadOrders();

    // Initial filtering
    this.filteredKitchenItems = [...this.kitchenItems];
    this.filteredPastryItems = [...this.pastryItems];

    // Get only occupied rooms
    this.updateOccupiedRooms();
  }

  // Get filtered orders based on active tab
  get filteredOrders(): Order[] {
    if (this.activeTab === 'all') {
      return this.orders;
    }
    return this.orders.filter((order) => order.status === this.activeTab);
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
    // Kitchen items
    this.kitchenItems = [
      {
        id: 'k1',
        name: 'Continental Breakfast',
        description: 'Eggs, toast, bacon, and coffee',
        price: 4500,
        category: 'breakfast',
        tags: ['breakfast', 'eggs'],
        preparationTime: 15,
        isAvailable: true,
        quantity: 0,
        serviceType: 'kitchen',
      },
      {
        id: 'k2',
        name: 'Pancake Stack',
        description: 'Fluffy pancakes with maple syrup',
        price: 3500,
        category: 'breakfast',
        tags: ['breakfast', 'sweet'],
        preparationTime: 10,
        isAvailable: true,
        quantity: 0,
        serviceType: 'kitchen',
      },
      {
        id: 'k3',
        name: 'Grilled Salmon',
        description: 'Fresh salmon with vegetables',
        price: 6500,
        category: 'main',
        tags: ['main', 'seafood'],
        preparationTime: 20,
        isAvailable: true,
        quantity: 0,
        allergens: 'Fish',
        serviceType: 'kitchen',
      },
      {
        id: 'k4',
        name: 'Chicken Caesar Salad',
        description: 'Romaine lettuce, croutons, parmesan',
        price: 5000,
        category: 'salads',
        tags: ['salad', 'chicken'],
        preparationTime: 12,
        isAvailable: true,
        quantity: 0,
        allergens: 'Dairy, Gluten',
        serviceType: 'kitchen',
      },
      {
        id: 'k5',
        name: 'Tomato Soup',
        description: 'Creamy tomato soup with basil',
        price: 3000,
        category: 'soups',
        tags: ['soup', 'vegetarian'],
        preparationTime: 8,
        isAvailable: true,
        quantity: 0,
        serviceType: 'kitchen',
      },
      {
        id: 'k6',
        name: 'Kids Burger Meal',
        description: 'Beef burger with fries and juice',
        price: 3500,
        category: 'kids',
        tags: ['kids', 'burger'],
        preparationTime: 15,
        isAvailable: true,
        quantity: 0,
        serviceType: 'kitchen',
      },
    ];

    // Pastry items
    this.pastryItems = [
      {
        id: 'p1',
        name: 'Chocolate Cake Slice',
        description: 'Rich chocolate cake with ganache',
        price: 2500,
        category: 'cakes',
        tags: ['cake', 'chocolate'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Dairy, Gluten',
        serviceType: 'pastry',
      },
      {
        id: 'p2',
        name: 'Croissant',
        description: 'Buttery French croissant',
        price: 1500,
        category: 'pastries',
        tags: ['pastry', 'breakfast'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Dairy, Gluten',
        serviceType: 'pastry',
      },
      {
        id: 'p3',
        name: 'Chocolate Chip Cookie',
        description: 'Freshly baked cookie with chocolate chips',
        price: 800,
        category: 'cookies',
        tags: ['cookie', 'sweet'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Dairy, Gluten',
        serviceType: 'pastry',
      },
      {
        id: 'p4',
        name: 'Sourdough Bread',
        description: 'Artisan sourdough loaf',
        price: 2000,
        category: 'breads',
        tags: ['bread', 'artisan'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Gluten',
        serviceType: 'pastry',
      },
      {
        id: 'p5',
        name: 'Tiramisu',
        description: 'Classic Italian dessert',
        price: 3000,
        category: 'desserts',
        tags: ['dessert', 'coffee'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Dairy, Alcohol',
        serviceType: 'pastry',
      },
      {
        id: 'p6',
        name: 'Fruit Tart',
        description: 'Seasonal fruits on pastry cream',
        price: 2800,
        category: 'desserts',
        tags: ['dessert', 'fruit'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        allergens: 'Dairy, Gluten',
        serviceType: 'pastry',
      },
    ];
  }

  // Load orders from local storage
  loadOrders(): void {
    const storedOrders = localStorage.getItem('foodOrders');
    if (storedOrders) {
      this.orders = JSON.parse(storedOrders);
      // Process dates if needed
      this.orders.forEach((order) => {
        if (typeof order.orderDate === 'string') {
          order.orderDate = new Date(order.orderDate);
        }
        if (order.completionDate && typeof order.completionDate === 'string') {
          order.completionDate = new Date(order.completionDate);
        }
      });
    } else {
      this.orders = [];
    }
  }

  // Save orders to local storage
  saveOrders(): void {
    localStorage.setItem('foodOrders', JSON.stringify(this.orders));
  }

  // Update occupied rooms list
  updateOccupiedRooms(): void {
    this.occupiedRooms = this.allRooms.filter(
      (room) => room.status === 'occupied' && room.guest
    );
  }

  // Filter kitchen items based on search term and category
  filterKitchenItems(): void {
    this.filteredKitchenItems = this.kitchenItems.filter((item) => {
      const matchesSearch =
        item.name
          .toLowerCase()
          .includes(this.kitchenSearchTerm.toLowerCase()) ||
        item.description
          .toLowerCase()
          .includes(this.kitchenSearchTerm.toLowerCase());
      const matchesCategory =
        this.activeKitchenCategory === 'all' ||
        item.category === this.activeKitchenCategory;
      return matchesSearch && matchesCategory && item.isAvailable;
    });
  }

  // Filter pastry items based on search term and category
  filterPastryItems(): void {
    this.filteredPastryItems = this.pastryItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(this.pastrySearchTerm.toLowerCase()) ||
        item.description
          .toLowerCase()
          .includes(this.pastrySearchTerm.toLowerCase());
      const matchesCategory =
        this.activePastryCategory === 'all' ||
        item.category === this.activePastryCategory;
      return matchesSearch && matchesCategory && item.isAvailable;
    });
  }

  // Set active kitchen category
  setActiveKitchenCategory(categoryId: string): void {
    this.activeKitchenCategory = categoryId;
    this.filterKitchenItems();
  }

  // Set active pastry category
  setActivePastryCategory(categoryId: string): void {
    this.activePastryCategory = categoryId;
    this.filterPastryItems();
  }

  // Toggle customer type
  toggleCustomerType(): void {
    this.cart.isExternal = this.isExternalCustomer;
    if (!this.isExternalCustomer) {
      this.externalCustomer = { name: '' };
    }
  }

  // Add item to cart
  addToCart(item: MenuItem): void {
    const existingItem = this.cart.items.find(
      (cartItem) => cartItem.item.id === item.id
    );
    if (existingItem) {
      existingItem.quantity += 1;
      existingItem.subtotal = existingItem.item.price * existingItem.quantity;
    } else {
      this.cart.items.push({
        item: item,
        quantity: 1,
        subtotal: item.price,
        specialRequests: '',
      });
    }
  }

  // Remove item from cart
  removeFromCart(index: number): void {
    this.cart.items.splice(index, 1);
  }

  // Update cart item quantity
  updateCartItemQuantity(cartItem: CartItem, change: number): void {
    const newQuantity = cartItem.quantity + change;
    if (newQuantity > 0) {
      cartItem.quantity = newQuantity;
      cartItem.subtotal = cartItem.item.price * cartItem.quantity;
    } else {
      this.removeFromCart(this.cart.items.indexOf(cartItem));
    }
  }

  // Get cart subtotal
  getSubtotal(): number {
    return this.cart.items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  // Get tax amount
  getTaxAmount(): number {
    return this.getSubtotal() * this.taxRate;
  }

  // Get cart total
  getCartTotal(): number {
    return this.getSubtotal() + this.getTaxAmount();
  }

  // Check if order is valid
  isOrderValid(): boolean {
    if (this.cart.items.length === 0) return false;

    // For room orders, a room must be selected
    if (!this.isExternalCustomer && !this.selectedRoom) {
      return false;
    }

    // For external customers, name must be provided
    if (this.isExternalCustomer && !this.externalCustomer.name) {
      return false;
    }

    return true;
  }

  // Submit order
  submitOrder(): void {
    if (!this.isOrderValid()) return;

    // Determine service type based on items in cart
    const serviceType = this.cart.items[0].item.serviceType;

    const newOrder: Order = {
      id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      serviceType: serviceType,
      items: this.cart.items.map((item) => ({
        id: item.item.id,
        name: item.item.name,
        description: item.item.description,
        price: item.item.price,
        quantity: item.quantity,
        category: item.item.category,
        specialRequests: item.specialRequests,
        allergens: item.item.allergens,
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

    if (this.isExternalCustomer) {
      newOrder.externalCustomer = {
        name: this.externalCustomer.name,
      };
    } else if (this.selectedRoom) {
      newOrder.roomNumber = this.selectedRoom.number;
      newOrder.guestId = this.selectedRoom.guest?.id;
    }

    this.orders.unshift(newOrder);
    this.saveOrders();

    // Reset cart
    this.cart.items = [];
    this.cart.notes = '';
    if (this.isExternalCustomer) {
      this.externalCustomer.name = '';
    } else {
      this.selectedRoom = null;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Order Submitted',
      detail: `Order #${newOrder.id} has been placed successfully`,
    });
  }

  // Update order status
  updateOrderStatus(
    orderId: string,
    newStatus: 'pending' | 'processing' | 'completed' | 'cancelled'
  ): void {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      order.status = newStatus;
      if (newStatus === 'completed') {
        order.completionDate = new Date();
        order.paymentStatus = 'paid';
      }
      this.saveOrders();
    }
  }

  // Get status class for styling
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
  printReceipt(order: Order): void {
    this.selectedReceipt = order;
    this.showReceiptModal = true;
  }

  // Close receipt modal
  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.selectedReceipt = null;
  }

  // Get receipt subtotal
  getReceiptSubtotal(): number {
    if (!this.selectedReceipt) return 0;
    return this.selectedReceipt.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }

  // Get receipt tax
  getReceiptTax(): number {
    return this.getReceiptSubtotal() * this.taxRate;
  }

  // Get payment method display text
  getPaymentMethodDisplay(method?: string): string {
    switch (method) {
      case 'room-charge':
        return 'Charge to Room';
      case 'cash':
        return 'Cash';
      case 'credit-card':
        return 'Credit Card';
      default:
        return 'Not specified';
    }
  }

  // Get guest name for room
  getGuestNameForRoom(roomNumber: number): string {
    const room = this.allRooms.find((r) => r.number === roomNumber);
    if (room && room.guest) {
      return `${room.guest.firstName} ${room.guest.lastName}`;
    }
    return 'Unknown guest';
  }

  // Download receipt as PDF
  downloadReceipt(): void {
    // In a real app, this would generate and download a PDF
    // For now, we'll just show a message
    this.messageService.add({
      severity: 'info',
      summary: 'Receipt Download',
      detail: 'Receipt download would be initiated here',
    });
  }

  // Print receipt
  printReceiptPdf(): void {
    // In a real app, this would print the receipt
    // For now, we'll just show a message
    this.messageService.add({
      severity: 'info',
      summary: 'Print Receipt',
      detail: 'Receipt would be printed here',
    });
  }
}
