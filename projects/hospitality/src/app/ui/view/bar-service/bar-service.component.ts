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
  abv?: number; // Alcohol by volume for drinks
  isAlcoholic?: boolean;
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
  tableNumber: string;
  dateOfBirth?: Date;
}

interface BarOrder {
  id: string;
  serviceType: 'bar';
  roomNumber?: number;
  guestId?: string;
  externalCustomer?: {
    tableNumber: string;
    dateOfBirth?: Date;
    isAgeVerified?: boolean;
  };
  items: {
    id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    category: string;
    specialRequests?: string;
    isAlcoholic?: boolean;
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
  selector: 'app-bar-service',
  templateUrl: './bar-service.component.html',
  styleUrl: './bar-service.component.scss',
})
export class BarServiceComponent implements OnInit {
  taxRate: number = 0.08; // 8% tax
  legalDrinkingAge: number = 18; // Minimum drinking age

  // State variables
  activeCategory: string = 'all';
  searchTerm: string = '';
  isExternalCustomer: boolean = false;
  selectedRoom: Room | null = null;
  occupiedRooms: Room[] = [];
  allRooms: Room[] = [];
  menuItems: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  barOrders: BarOrder[] = [];
  activeTab: string = 'pending';
  showAgeVerification: boolean = false;
  isAgeVerified: boolean = false;
  ageVerificationMessage: string = '';

  // Receipt modal
  showReceiptModal: boolean = false;
  selectedReceipt: BarOrder | null = null;

  // Menu categories
  menuCategories: MenuCategory[] = [
    { id: 'all', name: 'All Items' },
    { id: 'beers', name: 'Beers' },
    { id: 'wines', name: 'Wines' },
    { id: 'cocktails', name: 'Cocktails' },
    { id: 'spirits', name: 'Spirits' },
    { id: 'non-alcoholic', name: 'Non-Alcoholic' },
    { id: 'snacks', name: 'Bar Snacks' },
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
    tableNumber: '',
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

  // Get filtered orders based on active tab
  get filteredOrders(): BarOrder[] {
    if (this.activeTab === 'all') {
      return this.barOrders;
    }
    return this.barOrders.filter((order) => order.status === this.activeTab);
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
      // Beers
      {
        id: 'b1',
        name: 'Premium Lager',
        description: 'Imported premium lager beer',
        price: 2500,
        category: 'beers',
        tags: ['beer', 'alcoholic'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        abv: 5.0,
        isAlcoholic: true,
      },
      {
        id: 'b2',
        name: 'Stout',
        description: 'Dark rich stout with coffee notes',
        price: 2800,
        category: 'beers',
        tags: ['beer', 'alcoholic'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        abv: 6.5,
        isAlcoholic: true,
      },
      {
        id: 'b3',
        name: 'Local Craft Beer',
        description: 'Brewed locally with special hops',
        price: 3000,
        category: 'beers',
        tags: ['beer', 'alcoholic', 'local'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        abv: 5.5,
        isAlcoholic: true,
      },

      // Wines
      {
        id: 'w1',
        name: 'House Red Wine',
        description: 'Glass of our signature red wine blend',
        price: 3500,
        category: 'wines',
        tags: ['wine', 'alcoholic'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        abv: 13.5,
        isAlcoholic: true,
      },
      {
        id: 'w2',
        name: 'Premium White Wine',
        description: 'Glass of imported chardonnay',
        price: 4000,
        category: 'wines',
        tags: ['wine', 'alcoholic'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        abv: 12.0,
        isAlcoholic: true,
      },

      // Cocktails
      {
        id: 'c1',
        name: 'Margarita',
        description: 'Tequila, triple sec, lime juice, salt rim',
        price: 4500,
        category: 'cocktails',
        tags: ['cocktail', 'alcoholic'],
        preparationTime: 5,
        isAvailable: true,
        quantity: 0,
        abv: 15.0,
        isAlcoholic: true,
      },
      {
        id: 'c2',
        name: 'Mojito',
        description: 'White rum, mint, lime, soda water',
        price: 4200,
        category: 'cocktails',
        tags: ['cocktail', 'alcoholic'],
        preparationTime: 6,
        isAvailable: true,
        quantity: 0,
        abv: 12.0,
        isAlcoholic: true,
      },

      // Spirits
      {
        id: 's1',
        name: 'Whiskey Single',
        description: 'Single measure of premium whiskey',
        price: 5000,
        category: 'spirits',
        tags: ['spirit', 'alcoholic'],
        preparationTime: 1,
        isAvailable: true,
        quantity: 0,
        abv: 40.0,
        isAlcoholic: true,
      },
      {
        id: 's2',
        name: 'Vodka Shot',
        description: 'Single measure of imported vodka',
        price: 4500,
        category: 'spirits',
        tags: ['spirit', 'alcoholic'],
        preparationTime: 1,
        isAvailable: true,
        quantity: 0,
        abv: 40.0,
        isAlcoholic: true,
      },

      // Non-alcoholic
      {
        id: 'n1',
        name: 'Virgin Mojito',
        description: 'Mint, lime, soda water - no alcohol',
        price: 2500,
        category: 'non-alcoholic',
        tags: ['mocktail', 'non-alcoholic'],
        preparationTime: 5,
        isAvailable: true,
        quantity: 0,
        isAlcoholic: false,
      },
      {
        id: 'n2',
        name: 'Fresh Juice',
        description: 'Seasonal fresh fruit juice',
        price: 2000,
        category: 'non-alcoholic',
        tags: ['juice', 'non-alcoholic'],
        preparationTime: 3,
        isAvailable: true,
        quantity: 0,
        isAlcoholic: false,
      },

      // Bar snacks
      {
        id: 'sn1',
        name: 'Mixed Nuts',
        description: 'Assorted roasted nuts',
        price: 1500,
        category: 'snacks',
        tags: ['snack', 'non-alcoholic'],
        preparationTime: 2,
        isAvailable: true,
        quantity: 0,
        isAlcoholic: false,
      },
      {
        id: 'sn2',
        name: 'Spicy Chicken Wings',
        description: 'Crispy chicken wings with spicy sauce',
        price: 3500,
        category: 'snacks',
        tags: ['snack', 'non-alcoholic'],
        preparationTime: 10,
        isAvailable: true,
        quantity: 0,
        isAlcoholic: false,
      },
      {
        id: 'sn3',
        name: 'Cheese Platter',
        description: 'Selection of local and imported cheeses',
        price: 4500,
        category: 'snacks',
        tags: ['snack', 'non-alcoholic'],
        preparationTime: 7,
        isAvailable: true,
        quantity: 0,
        isAlcoholic: false,
      },
    ];
  }

  // Load orders from local storage
  loadOrders(): void {
    const storedOrders = localStorage.getItem('barOrders');
    if (storedOrders) {
      this.barOrders = JSON.parse(storedOrders);
      // Process dates if needed
      this.barOrders.forEach((order) => {
        if (typeof order.orderDate === 'string') {
          order.orderDate = new Date(order.orderDate);
        }
        if (order.completionDate && typeof order.completionDate === 'string') {
          order.completionDate = new Date(order.completionDate);
        }
      });
    } else {
      this.barOrders = [];
    }
  }

  // Save orders to local storage
  saveOrders(): void {
    localStorage.setItem('barOrders', JSON.stringify(this.barOrders));
  }

  // Update occupied rooms list
  updateOccupiedRooms(): void {
    this.occupiedRooms = this.allRooms.filter(
      (room) => room.status === 'occupied' && room.guest
    );
  }

  // Filter items based on search term and category
  filterItems(): void {
    this.filteredItems = this.menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategory =
        this.activeCategory === 'all' || item.category === this.activeCategory;
      return matchesSearch && matchesCategory && item.isAvailable;
    });
  }

  // Set active category
  setActiveCategory(categoryId: string): void {
    this.activeCategory = categoryId;
    this.filterItems();
  }

  // Toggle customer type
  toggleCustomerType(): void {
    this.cart.isExternal = this.isExternalCustomer;
    if (!this.isExternalCustomer) {
      this.externalCustomer = { tableNumber: '' };
      this.showAgeVerification = false;
      this.isAgeVerified = false;
      this.ageVerificationMessage = '';
    }
  }

  // Add item to cart
  addToCart(item: MenuItem): void {
    // Check if the item is alcoholic and customer is external
    if (item.isAlcoholic && this.isExternalCustomer && !this.isAgeVerified) {
      this.showAgeVerification = true;
      this.messageService.add({
        severity: 'warn',
        summary: 'Age Verification Required',
        detail: 'Please verify age for alcoholic beverages',
      });
      return;
    }

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

  // Verify age for external customer
  verifyAge(): void {
    if (!this.externalCustomer.dateOfBirth) {
      this.isAgeVerified = false;
      this.ageVerificationMessage = 'Please enter date of birth';
      return;
    }

    const birthDate = new Date(this.externalCustomer.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    this.isAgeVerified = age >= this.legalDrinkingAge;
    this.ageVerificationMessage = this.isAgeVerified
      ? 'Age verified - eligible to purchase alcohol'
      : 'Must be at least 18 years old to purchase alcohol';
  }

  // Check if cart contains alcoholic items
  hasAlcoholicItems(): boolean {
    return this.cart.items.some((item) => item.item.isAlcoholic);
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

    // For alcoholic orders to external customers, age must be verified
    if (
      this.hasAlcoholicItems() &&
      this.isExternalCustomer &&
      !this.isAgeVerified
    ) {
      return false;
    }

    // For room orders, a room must be selected
    if (!this.isExternalCustomer && !this.selectedRoom) {
      return false;
    }

    // For external customers, table number must be provided
    if (this.isExternalCustomer && !this.externalCustomer.tableNumber) {
      return false;
    }

    return true;
  }

  // Submit order
  submitOrder(): void {
    if (!this.isOrderValid()) return;

    const newOrder: BarOrder = {
      id: 'BAR-' + Math.floor(100000 + Math.random() * 900000),
      serviceType: 'bar',
      items: this.cart.items.map((item) => ({
        id: item.item.id,
        name: item.item.name,
        description: item.item.description,
        price: item.item.price,
        quantity: item.quantity,
        category: item.item.category,
        specialRequests: item.specialRequests,
        isAlcoholic: item.item.isAlcoholic,
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
        tableNumber: this.externalCustomer.tableNumber,
        dateOfBirth: this.externalCustomer.dateOfBirth,
        isAgeVerified: this.isAgeVerified,
      };
    } else if (this.selectedRoom) {
      newOrder.roomNumber = this.selectedRoom.number;
      newOrder.guestId = this.selectedRoom.guest?.id;
    }

    this.barOrders.unshift(newOrder);
    this.saveOrders();

    // Reset cart
    this.cart.items = [];
    this.cart.notes = '';
    if (this.isExternalCustomer) {
      this.externalCustomer.tableNumber = '';
      this.externalCustomer.dateOfBirth = undefined;
      this.isAgeVerified = false;
      this.ageVerificationMessage = '';
      this.showAgeVerification = false;
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
    const order = this.barOrders.find((o) => o.id === orderId);
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
  printReceipt(order: BarOrder): void {
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

  // Check if order has alcoholic drinks
  hasAlcoholicDrinks(order?: BarOrder | null): boolean {
    if (!order) return false;
    return order.items.some((item) => item.isAlcoholic);
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
