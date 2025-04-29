import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';

// Interfaces
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
  guestDisplay?: string;
}

interface CustomLaundryItem {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  processingTime: number; // in hours
}

interface OrderDetails {
  pickupDate: Date | string;
  deliveryDate?: Date | string;
  notes: string;
  paymentMethod: string;
}

interface ExternalCustomer {
  name: string;
  phone?: string;
}

interface LaundryOrder {
  id: string;
  roomNumber?: number;
  guestId?: string;
  externalCustomer?: ExternalCustomer;
  items: CustomLaundryItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  orderDate: Date;
  completionDate?: Date;
  pickupDate?: Date;
  deliveryDate?: Date;
  notes?: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
}

interface OrderTab {
  id: string;
  name: string;
}

@Component({
  selector: 'app-laundry-service',
  templateUrl: './laundry-service.component.html',
  styleUrls: ['./laundry-service.component.scss'],
})
export class LaundryServiceComponent implements OnInit {
  // Math reference for template usage
  Math = Math;

  taxRate: number = 0.08; // 8% tax

  // State variables
  activeView: 'laundry' | 'orders' = 'laundry';
  isExternalCustomer: boolean = false;
  selectedGuest: number | null = null;
  occupiedRooms: Room[] = [];
  allRooms: Room[] = [];
  orders: LaundryOrder[] = [];
  activeTab: string = 'pending';
  showReceiptModal: boolean = false;
  selectedReceipt: LaundryOrder | null = null;
  selectedItems: CustomLaundryItem[] = [];

  itemOptions = [
    { label: 'Headtie', value: 'Headtie' },
    { label: 'Cap', value: 'Cap' },
    { label: 'Jean', value: 'Jean' },
    { label: 'Shirt', value: 'Shirt' },
    { label: 'Polo', value: 'Polo' },
  ];

  // New order item form
  newOrderItem: {
    name: string[];
    description: string;
    price: number;
    quantity: number;
  } = {
    name: [],
    description: '',
    price: 0.0,
    quantity: 1,
  };

  // Form tracking
  orderDetails: OrderDetails = {
    pickupDate: '',
    notes: '',
    paymentMethod: 'room-charge',
  };

  // Order tabs
  orderTabs: OrderTab[] = [
    { id: 'pending', name: 'Pending' },
    { id: 'processing', name: 'Processing' },
    { id: 'completed', name: 'Completed' },
    { id: 'all', name: 'All Orders' },
  ];

  // External customer
  externalCustomer: ExternalCustomer = {
    name: '',
    phone: '',
  };

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.loadRoomsFromLocalStorage();
    this.loadOrders();

    // Get only occupied rooms
    this.updateOccupiedRooms();

    // Set default pickup date to now
    this.orderDetails.pickupDate = new Date();
  }

  // Get filtered orders based on active tab
  get filteredOrders(): LaundryOrder[] {
    if (this.activeTab === 'all') {
      return this.orders;
    }
    return this.orders.filter((order) => order.status === this.activeTab);
  }

  addCustomItemToOrder(): void {
    if (!this.isCustomItemValid()) return;

    this.newOrderItem.name.forEach((itemName) => {
      const newItem: CustomLaundryItem = {
        id: 'item_' + new Date().getTime() + '_' + itemName, // Unique id
        name: itemName, // individual name
        description: this.newOrderItem.description,
        price: this.newOrderItem.price,
        quantity: this.newOrderItem.quantity,
        processingTime: 24, // Default processing time
      };
      this.selectedItems.push(newItem);
    });

    // Reset the form
    this.newOrderItem = {
      name: [],
      description: '',
      price: 0.0,
      quantity: 1,
    };

    this.messageService.add({
      severity: 'success',
      summary: 'Items Added',
      detail: `Selected items added to order.`,
    });
  }

  isCustomItemValid(): boolean {
    return (
      this.newOrderItem.name &&
      this.newOrderItem.name.length > 0 &&
      this.newOrderItem.price > 0 &&
      this.newOrderItem.quantity > 0
    );
  }

  // Update item quantity in selected items
  updateSelectedItemQuantity(itemId: string, change: number): void {
    const item = this.selectedItems.find((item) => item.id === itemId);
    if (item) {
      item.quantity = Math.max(1, item.quantity + change);
    }
  }

  // Remove item from selected items
  removeSelectedItem(itemId: string): void {
    this.selectedItems = this.selectedItems.filter(
      (item) => item.id !== itemId
    );
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

        // Add guest display property for dropdown
        if (room.guest) {
          room.guestDisplay = `${room.guest.firstName} ${room.guest.lastName}`;
        }
      });
    } else {
      // Fallback to empty array if no rooms in local storage
      this.allRooms = [];
    }
  }

  // Load orders from local storage
  loadOrders(): void {
    const storedOrders = localStorage.getItem('laundryOrders');
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
        if (order.pickupDate && typeof order.pickupDate === 'string') {
          order.pickupDate = new Date(order.pickupDate);
        }
        if (order.deliveryDate && typeof order.deliveryDate === 'string') {
          order.deliveryDate = new Date(order.deliveryDate);
        }
      });
    } else {
      this.orders = [];
    }
  }

  // Save orders to local storage
  saveOrders(): void {
    localStorage.setItem('laundryOrders', JSON.stringify(this.orders));
  }

  // Update occupied rooms list
  updateOccupiedRooms(): void {
    this.occupiedRooms = this.allRooms.filter(
      (room) => room.status === 'occupied' && room.guest
    );
  }

  // Toggle customer type
  toggleCustomerType(): void {
    if (!this.isExternalCustomer) {
      this.externalCustomer = { name: '', phone: '' };
    }
  }

  // Calculate subtotal
  getSubtotal(): number {
    return this.selectedItems.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }

  // Calculate tax amount
  getTaxAmount(): number {
    return this.getSubtotal() * this.taxRate;
  }

  // Calculate total amount
  getTotal(): number {
    return this.getSubtotal() + this.getTaxAmount();
  }

  // Check if there are items in the order
  hasItems(): boolean {
    return this.selectedItems.length > 0;
  }

  // Get estimated delivery date
  getEstimatedDeliveryDate(): Date {
    // If no items or pickup date, return null
    if (!this.selectedItems.length || !this.orderDetails.pickupDate) {
      return new Date();
    }

    // Find maximum processing time
    const maxProcessingTime = Math.max(
      ...this.selectedItems.map((item) => item.processingTime)
    );

    // Create new date based on pickup date
    const pickupDate = new Date(this.orderDetails.pickupDate);
    return new Date(pickupDate.getTime() + maxProcessingTime * 60 * 60 * 1000);
  }

  // Check if form is valid for submission
  isFormValid(): boolean {
    // Check if items selected
    if (!this.hasItems()) {
      return false;
    }

    // Check if customer is selected
    if (!this.isExternalCustomer && !this.selectedGuest) {
      return false;
    }

    // Check if external customer has name
    if (this.isExternalCustomer && !this.externalCustomer.name.trim()) {
      return false;
    }

    // Check if pickup date is set
    if (!this.orderDetails.pickupDate) {
      return false;
    }

    return true;
  }

  // Submit order
  submitOrder(): void {
    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Form Invalid',
        detail: 'Please complete all required fields',
      });
      return;
    }

    // Create new order
    const newOrder: LaundryOrder = {
      id: 'order_' + new Date().getTime().toString(),
      items: [...this.selectedItems],
      subtotal: this.getSubtotal(),
      tax: this.getTaxAmount(),
      totalAmount: this.getTotal(),
      status: 'pending',
      orderDate: new Date(),
      pickupDate: new Date(this.orderDetails.pickupDate),
      deliveryDate: this.getEstimatedDeliveryDate(),
      notes: this.orderDetails.notes,
      paymentStatus: 'pending',
      paymentMethod: this.orderDetails.paymentMethod,
    };

    // Add customer information
    if (this.isExternalCustomer) {
      newOrder.externalCustomer = { ...this.externalCustomer };
    } else if (this.selectedGuest) {
      newOrder.roomNumber = this.selectedGuest;
      const selectedRoom = this.occupiedRooms.find(
        (room) => room.number === this.selectedGuest
      );
      if (selectedRoom && selectedRoom.guest) {
        newOrder.guestId = selectedRoom.guest.id;
      }
    }

    // Add to orders and save
    this.orders.push(newOrder);
    this.saveOrders();

    // Reset form
    this.resetForm();

    this.messageService.add({
      severity: 'success',
      summary: 'Order Submitted',
      detail: `Order #${newOrder.id} created successfully`,
    });
  }

  // Reset form after submission
  resetForm(): void {
    this.selectedItems = [];
    this.newOrderItem = {
      name: [],
      description: '',
      price: 0.0,
      quantity: 1,
    };
    this.orderDetails = {
      pickupDate: new Date(),
      notes: '',
      paymentMethod: 'room-charge',
    };
    if (this.isExternalCustomer) {
      this.externalCustomer = { name: '', phone: '' };
    } else {
      this.selectedGuest = null;
    }
  }

  // Get guest name for a room number
  getGuestNameForRoom(roomNumber: number): string {
    const room = this.allRooms.find((room) => room.number === roomNumber);
    if (room && room.guest) {
      return `${room.guest.firstName} ${room.guest.lastName}`;
    }
    return 'Guest not found';
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

  // Update order status
  updateOrderStatus(
    orderId: string,
    newStatus: 'processing' | 'completed' | 'cancelled'
  ): void {
    const orderIndex = this.orders.findIndex((order) => order.id === orderId);
    if (orderIndex !== -1) {
      this.orders[orderIndex].status = newStatus;

      // Update completion date if completed
      if (newStatus === 'completed') {
        this.orders[orderIndex].completionDate = new Date();
        this.orders[orderIndex].paymentStatus = 'paid';
      }

      this.saveOrders();

      this.messageService.add({
        severity: 'success',
        summary: 'Status Updated',
        detail: `Order #${orderId} is now ${newStatus}`,
      });
    }
  }

  // Print receipt
  printReceipt(order: LaundryOrder): void {
    this.selectedReceipt = order;
    this.showReceiptModal = true;

    // In a real application, this might open a modal or redirect to a print view
    // For now, we'll just log to console
    console.log('Printing receipt for order:', order);

    // Show toast
    this.messageService.add({
      severity: 'info',
      summary: 'Receipt',
      detail: `Receipt for order #${order.id} opened`,
    });
  }

  // Show order details in modal
  selectedOrderDetails: LaundryOrder | null = null;
  showDetailsModal = false;

  showDetails(order: LaundryOrder): void {
    this.selectedOrderDetails = order;
    this.showDetailsModal = true;
  }

  // Print receipt

  // Close modal
  closeModal(): void {
    this.showDetailsModal = false;
    this.showReceiptModal = false;
    this.selectedOrderDetails = null;
    this.selectedReceipt = null;
  }
}
