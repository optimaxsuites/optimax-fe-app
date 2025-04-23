import { Component, Input, input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  ingredients?: string[];
  isAvailable: boolean;
  imageUrl?: string;
  quantity: number;
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
  tableNumber: string;
}

interface KitchenOrder {
  id: string;
  serviceType: 'kitchen';
  roomNumber?: number;
  guestId?: string;
  externalCustomer?: {
    tableNumber: string;
  };
  items: {
    id: string;
    name: string;
    description: string;
    price: number;
    quantity: number;
    category: string;
    specialRequests?: string;
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

@Component({
  selector: 'app-room-service',
  templateUrl: './room-service.component.html',
  styleUrls: ['./room-service.component.scss'],
})
export class RoomServiceComponent implements OnInit {
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
  kitchenOrders: KitchenOrder[] = [];
  @Input() selectedRooms: Room[] | null = null; // For external customers
  // Receipt modal
  showReceiptModal: boolean = false;
  selectedReceipt: KitchenOrder | null = null;

  // Menu categories
  menuCategories: MenuCategory[] = [
    { id: 'all', name: 'All Items' },
    { id: 'breakfast', name: 'Breakfast' },
    { id: 'lunch', name: 'Lunch' },
    { id: 'dinner', name: 'Dinner' },
    { id: 'appetizers', name: 'Appetizers' },
    { id: 'desserts', name: 'Desserts' },
    { id: 'beverages', name: 'Beverages' },
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

  constructor(private router: Router, private messageService: MessageService) {}

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

  // Load rooms from local storage instead of mock data
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
      // Breakfast items
      {
        id: 'k1',
        name: 'Continental Breakfast',
        description: 'Croissant, pastries, fruit, yogurt, coffee or tea',
        price: 5000, // Changed to Naira
        category: 'breakfast',
        tags: ['breakfast', 'vegetarian'],
        preparationTime: 10,
        isAvailable: true,
        quantity: 0,
      },
      {
        id: 'k2',
        name: 'American Breakfast',
        description:
          'Eggs any style, bacon, toast, hash browns, coffee or juice',
        price: 6500, // Changed to Naira
        category: 'breakfast',
        tags: ['breakfast', 'protein'],
        preparationTime: 15,
        isAvailable: true,
        quantity: 0,
      },
      {
        id: 'k3',
        name: 'Eggs Benedict',
        description:
          'Poached eggs, Canadian bacon, hollandaise on English muffin',
        price: 7500, // Changed to Naira
        category: 'breakfast',
        tags: ['breakfast', 'signature'],
        preparationTime: 20,
        isAvailable: true,
        quantity: 0,
      },
      {
        id: 'k4',
        name: 'Vegetable Omelette',
        description: 'Three egg omelette with seasonal vegetables and cheese',
        price: 6000, // Changed to Naira
        category: 'breakfast',
        tags: ['breakfast', 'vegetarian'],
        preparationTime: 15,
        isAvailable: true,
        quantity: 0,
      },

      // Lunch items
      {
        id: 'k5',
        name: 'Classic Club Sandwich',
        description:
          'Triple-decker with turkey, bacon, lettuce, tomato, served with fries',
        price: 7000, // Changed to Naira
        category: 'lunch',
        tags: ['lunch', 'sandwich'],
        preparationTime: 15,
        isAvailable: true,
        quantity: 0,
      },
      {
        id: 'k6',
        name: 'Caesar Salad',
        description: 'Romaine lettuce, croutons, parmesan, and Caesar dressing',
        price: 6000, // Changed to Naira
        category: 'lunch',
        tags: ['lunch', 'salad', 'vegetarian'],
        preparationTime: 10,
        isAvailable: true,
        quantity: 0,
      },
      {
        id: 'k7',
        name: 'Grilled Chicken Wrap',
        description:
          'Grilled chicken, mixed greens, tomato, and aioli in a flour tortilla',
        price: 6500, // Changed to Naira
        category: 'lunch',
        tags: ['lunch', 'wrap'],
        preparationTime: 15,
        isAvailable: true,
        quantity: 0,
      },
      {
        id: 'k8',
        name: 'Angus Beef Burger',
        description:
          '8oz beef patty, lettuce, tomato, cheese, and special sauce, with fries',
        price: 8000, // Changed to Naira
        category: 'lunch',
        tags: ['lunch', 'burger'],
        preparationTime: 18,
        isAvailable: true,
        quantity: 0,
      },

      // Dinner items
      {
        id: 'k9',
        name: 'Grilled Salmon',
        description:
          'Fresh salmon with lemon butter sauce, seasonal vegetables, and rice',
        price: 12000, // Changed to Naira
        category: 'dinner',
        tags: ['dinner', 'seafood'],
        preparationTime: 25,
        isAvailable: true,
        quantity: 0,
      },
      {
        id: 'k10',
        name: 'Filet Mignon',
        description:
          '8oz tender filet with mashed potatoes and grilled asparagus',
        price: 15000, // Changed to Naira
        category: 'dinner',
        tags: ['dinner', 'steak', 'signature'],
        preparationTime: 30,
        isAvailable: true,
        quantity: 0,
      },

      // Appetizers
      {
        id: 'k11',
        name: 'Bruschetta',
        description:
          'Toasted baguette with fresh tomatoes, basil, and balsamic glaze',
        price: 5000, // Changed to Naira
        category: 'appetizers',
        tags: ['appetizer', 'vegetarian'],
        preparationTime: 10,
        isAvailable: true,
        quantity: 0,
      },

      // Desserts
      {
        id: 'k12',
        name: 'Chocolate Lava Cake',
        description:
          'Warm chocolate cake with a molten center, served with ice cream',
        price: 4000, // Changed to Naira
        category: 'desserts',
        tags: ['dessert', 'chocolate'],
        preparationTime: 15,
        isAvailable: true,
        quantity: 0,
      },

      // Beverages
      {
        id: 'k13',
        name: 'Fresh Orange Juice',
        description: 'Freshly squeezed orange juice',
        price: 2500, // Changed to Naira
        category: 'beverages',
        tags: ['beverage', 'juice'],
        preparationTime: 5,
        isAvailable: true,
        quantity: 0,
      },
      {
        id: 'k14',
        name: 'Premium Coffee',
        description: 'Premium arabica coffee, freshly brewed',
        price: 2000, // Changed to Naira
        category: 'beverages',
        tags: ['beverage', 'coffee'],
        preparationTime: 5,
        isAvailable: true,
        quantity: 0,
      },
    ];
  }

  // Load order data (mock data for now)
  loadOrders(): void {
    this.kitchenOrders = [
      {
        id: 'KO-2025-001',
        serviceType: 'kitchen',
        roomNumber: 101,
        guestId: 'g1',
        items: [
          {
            id: 'k1',
            name: 'Continental Breakfast',
            description: 'Croissant, pastries, fruit, yogurt, coffee or tea',
            price: 5000,
            quantity: 2,
            category: 'breakfast',
          },
          {
            id: 'k13',
            name: 'Fresh Orange Juice',
            description: 'Freshly squeezed orange juice',
            price: 2500,
            quantity: 2,
            category: 'beverages',
          },
        ],
        subtotal: 15000,
        tax: 1200,
        totalAmount: 16200,
        status: 'completed',
        orderDate: new Date('2025-04-17T08:30:00'),
        completionDate: new Date('2025-04-17T09:15:00'),
        paymentStatus: 'paid',
        paymentMethod: 'room-charge',
      },
      {
        id: 'KO-2025-002',
        serviceType: 'kitchen',
        externalCustomer: {
          tableNumber: '12',
        },
        items: [
          {
            id: 'k8',
            name: 'Angus Beef Burger',
            description:
              '8oz beef patty, lettuce, tomato, cheese, and special sauce, with fries',
            price: 8000,
            quantity: 2,
            category: 'lunch',
          },
          {
            id: 'k14',
            name: 'Premium Coffee',
            description: 'Premium arabica coffee, freshly brewed',
            price: 2000,
            quantity: 2,
            category: 'beverages',
          },
        ],
        subtotal: 20000,
        tax: 1600,
        totalAmount: 21600,
        status: 'pending',
        orderDate: new Date('2025-04-18T12:45:00'),
        paymentStatus: 'pending',
        paymentMethod: 'credit-card',
      },
      {
        id: 'KO-2025-003',
        serviceType: 'kitchen',
        roomNumber: 301,
        guestId: 'g4',
        items: [
          {
            id: 'k9',
            name: 'Grilled Salmon',
            description:
              'Fresh salmon with lemon butter sauce, seasonal vegetables, and rice',
            price: 12000,
            quantity: 1,
            category: 'dinner',
          },
          {
            id: 'k10',
            name: 'Filet Mignon',
            description:
              '8oz tender filet with mashed potatoes and grilled asparagus',
            price: 15000,
            quantity: 1,
            category: 'dinner',
          },
          {
            id: 'k12',
            name: 'Chocolate Lava Cake',
            description:
              'Warm chocolate cake with a molten center, served with ice cream',
            price: 4000,
            quantity: 2,
            category: 'desserts',
          },
        ],
        subtotal: 35000,
        tax: 2800,
        totalAmount: 37800,
        status: 'processing',
        orderDate: new Date('2025-04-18T18:30:00'),
        paymentStatus: 'pending',
        paymentMethod: 'room-charge',
        notes: 'Medium rare for the filet mignon. No nuts in dessert please.',
      },
    ];
  }

  // Filter occupied rooms
  updateOccupiedRooms(): void {
    this.occupiedRooms = this.allRooms.filter(
      (room) => room.status === 'occupied'
    );
  }

  // Set active category
  setActiveCategory(categoryId: string): void {
    this.activeCategory = categoryId;
    this.filterItems();
  }

  // Filter menu items based on search term and active category
  filterItems(): void {
    if (this.activeCategory === 'all' && !this.searchTerm) {
      this.filteredItems = [...this.menuItems];
      return;
    }

    this.filteredItems = this.menuItems.filter((item) => {
      // Filter by category if not "all"
      const categoryMatch =
        this.activeCategory === 'all' || item.category === this.activeCategory;

      // Filter by search term
      const searchMatch =
        !this.searchTerm ||
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        item.description
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        item.tags.some((tag) =>
          tag.toLowerCase().includes(this.searchTerm.toLowerCase())
        );

      return categoryMatch && searchMatch;
    });
  }

  // Toggle customer type
  toggleCustomerType(): void {
    this.cart.isExternal = this.isExternalCustomer;

    // Reset fields when switching
    if (this.isExternalCustomer) {
      this.selectedRoom = null;
      this.cart.paymentMethod = 'cash'; // Default for external customers
    } else {
      this.externalCustomer.tableNumber = '';
    }
  }

  // Add item to cart
  addToCart(item: MenuItem): void {
    // Check if item is already in cart
    const existingItemIndex = this.cart.items.findIndex(
      (cartItem) => cartItem.item.id === item.id
    );

    if (existingItemIndex > -1) {
      // Update quantity
      this.cart.items[existingItemIndex].quantity++;
      this.cart.items[existingItemIndex].subtotal = this.calculateSubtotal(
        this.cart.items[existingItemIndex].item.price,
        this.cart.items[existingItemIndex].quantity
      );
    } else {
      // Add new item to cart
      this.cart.items.push({
        item: { ...item },
        quantity: 1,
        subtotal: item.price,
      });
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Item Added',
      detail: `${item.name} added to cart`,
    });
  }

  // Remove item from cart
  removeFromCart(index: number): void {
    const removedItem = this.cart.items.splice(index, 1);
    this.messageService.add({
      severity: 'info',
      summary: 'Item Removed',
      detail: `${removedItem[0].item.name} removed from cart`,
    });
  }

  // Update cart item quantity
  updateCartItemQuantity(cartItem: CartItem, change: number): void {
    const newQuantity = cartItem.quantity + change;

    if (newQuantity <= 0) {
      // Find item index to remove it
      const index = this.cart.items.findIndex(
        (item) => item.item.id === cartItem.item.id
      );
      if (index !== -1) {
        this.removeFromCart(index);
      }
    } else {
      cartItem.quantity = newQuantity;
      cartItem.subtotal = this.calculateSubtotal(
        cartItem.item.price,
        cartItem.quantity
      );
    }
  }

  // Calculate subtotal for an item
  calculateSubtotal(price: number, quantity: number): number {
    return price * quantity;
  }

  // Get cart subtotal
  getSubtotal(): number {
    return this.cart.items.reduce((total, item) => total + item.subtotal, 0);
  }

  // Get tax amount
  getTaxAmount(): number {
    return this.getSubtotal() * this.taxRate;
  }

  // Get cart total with tax
  getCartTotal(): number {
    return this.getSubtotal() + this.getTaxAmount();
  }

  // Check if order is valid to submit
  isOrderValid(): boolean {
    if (this.cart.items.length === 0) {
      return false;
    }

    if (this.isExternalCustomer) {
      return !!this.externalCustomer.tableNumber;
    } else {
      return !!this.selectedRoom;
    }
  }

  // Submit order
  submitOrder(): void {
    if (!this.isOrderValid()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Order',
        detail: 'Please complete all required fields',
      });
      return;
    }

    // Create new kitchen order
    const newOrder: KitchenOrder = {
      id: `KO-2025-${this.generateOrderId()}`,
      serviceType: 'kitchen',
      items: this.cart.items.map((cartItem) => ({
        id: cartItem.item.id,
        name: cartItem.item.name,
        description: cartItem.item.description,
        price: cartItem.item.price,
        quantity: cartItem.quantity,
        category: cartItem.item.category,
        specialRequests: cartItem.specialRequests,
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

    // Add customer details
    if (this.isExternalCustomer) {
      newOrder.externalCustomer = {
        tableNumber: this.externalCustomer.tableNumber,
      };
    } else if (this.selectedRoom) {
      newOrder.roomNumber = this.selectedRoom.number;
      if (this.selectedRoom.guest) {
        newOrder.guestId = this.selectedRoom.guest.id;
      }
    }

    // Add to orders and reset cart
    this.kitchenOrders.unshift(newOrder);

    this.messageService.add({
      severity: 'success',
      summary: 'Order Submitted',
      detail: `Order ${newOrder.id} has been submitted successfully`,
    });

    // Reset cart
    this.resetCart();
  }

  // Generate a unique order ID
  generateOrderId(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Reset cart after order
  resetCart(): void {
    this.cart = {
      items: [],
      isExternal: this.isExternalCustomer,
      paymentMethod: 'cash',
    };

    if (!this.isExternalCustomer) {
      this.selectedRoom = null;
    } else {
      this.externalCustomer.tableNumber = '';
    }
  }

  // Get CSS class for order status
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

  // Update order status
  updateOrderStatus(
    orderId: string,
    newStatus: 'pending' | 'processing' | 'completed' | 'cancelled'
  ): void {
    const orderIndex = this.kitchenOrders.findIndex(
      (order) => order.id === orderId
    );

    if (orderIndex !== -1) {
      this.kitchenOrders[orderIndex].status = newStatus;

      // Set completion date if completed
      if (newStatus === 'completed') {
        this.kitchenOrders[orderIndex].completionDate = new Date();
        this.kitchenOrders[orderIndex].paymentStatus = 'paid';
      }

      this.messageService.add({
        severity: 'info',
        summary: 'Status Updated',
        detail: `Order ${orderId} is now ${newStatus}`,
      });
    }
  }

  // Open receipt modal
  printReceipt(order: KitchenOrder): void {
    this.selectedReceipt = order;
    this.showReceiptModal = true;
  }

  // Close receipt modal
  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.selectedReceipt = null;
  }

  // Get guest name for receipt display
  getGuestNameForRoom(roomNumber?: number): string {
    if (!roomNumber) return 'N/A';

    const room = this.allRooms.find((r) => r.number === roomNumber);
    if (room && room.guest) {
      return `${room.guest.firstName} ${room.guest.lastName}`;
    }
    return 'N/A';
  }

  // Get payment method display name
  getPaymentMethodDisplay(method?: string): string {
    switch (method) {
      case 'room-charge':
        return 'Room Charge';
      case 'cash':
        return 'Cash';
      case 'credit-card':
        return 'Credit Card';
      default:
        return 'Unknown';
    }
  }

  // Calculate receipt subtotal
  getReceiptSubtotal(): number {
    if (!this.selectedReceipt) return 0;

    return this.selectedReceipt.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  // Calculate receipt tax
  getReceiptTax(): number {
    if (!this.selectedReceipt) return 0;
    return this.selectedReceipt.tax;
  }

  // Download receipt as PDF
  downloadReceipt(): void {
    if (!this.selectedReceipt) return;

    const content = document.getElementById('receipt-content');
    if (!content) return;

    const options = {
      margin: 10,
      filename: `receipt-${this.selectedReceipt.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
  }

  // Print receipt
  printReceiptPdf(): void {
    if (!this.selectedReceipt) return;

    const content = document.getElementById('receipt-content');
    if (!content) return;

    const options = {
      margin: 10,
      filename: `receipt-${this.selectedReceipt.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
  }
}
