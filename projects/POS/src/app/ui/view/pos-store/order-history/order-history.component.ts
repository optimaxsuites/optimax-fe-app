// order-history.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface GuestOrder {
  id: string;
  orderNumber: string;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryMethod: 'delivery' | 'pickup';
  paymentMethod: string;
  deliveryInfo?: {
    fullName: string;
    phoneNumber: string;
    address: string;
    email?: string;
    instructions?: string;
  };
  orderDate: string;
  status: 'confirmed' | 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  branchId?: number;
}

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss']
})
export class OrderHistoryComponent implements OnInit {
  orders: GuestOrder[] = [];
  reversedOrders: GuestOrder[] = [];
  isLoading: boolean = true;

  // Storage keys - these match what's saved in StoreCartService
  private readonly ORDERS_STORAGE_KEY = 'store_orders';
  private readonly GUEST_ORDERS_KEY = 'guest_orders';

  // Dummy data for demonstration
  private dummyOrders: GuestOrder[] = [
    {
      id: '1',
      orderNumber: 'ORD-001',
      items: [
        {
          id: '1',
          product: {
            name: 'Classic Burger Meal',
            sellingPrice: 2500
          },
          quantity: 2,
          unitPrice: 2500,
          selectedVariants: [
            { name: 'Extra Cheese' },
            { name: 'No Onions' }
          ]
        },
        {
          id: '2',
          product: {
            name: 'French Fries',
            sellingPrice: 800
          },
          quantity: 1,
          unitPrice: 800,
          selectedVariants: []
        }
      ],
      subtotal: 5800,
      deliveryFee: 500,
      total: 6300,
      deliveryMethod: 'delivery',
      paymentMethod: 'card',
      deliveryInfo: {
        fullName: 'John Doe',
        phoneNumber: '+2348012345678',
        address: '123 Main Street, Lagos Island, Lagos',
        email: 'john.doe@example.com',
        instructions: 'Call before delivery'
      },
      orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed'
    },
    {
      id: '2',
      orderNumber: 'ORD-002',
      items: [
        {
          id: '3',
          product: {
            name: 'Chicken Pizza',
            sellingPrice: 4500
          },
          quantity: 1,
          unitPrice: 4500,
          selectedVariants: [
            { name: 'Extra Spicy' }
          ]
        },
        {
          id: '4',
          product: {
            name: 'Coca Cola',
            sellingPrice: 300
          },
          quantity: 2,
          unitPrice: 300,
          selectedVariants: []
        }
      ],
      subtotal: 5100,
      deliveryFee: 0,
      total: 5100,
      deliveryMethod: 'pickup',
      paymentMethod: 'cash',
      orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'preparing'
    },
    {
      id: '3',
      orderNumber: 'ORD-003',
      items: [
        {
          id: '5',
          product: {
            name: 'Vegetable Salad',
            sellingPrice: 1800
          },
          quantity: 1,
          unitPrice: 1800,
          selectedVariants: []
        },
        {
          id: '6',
          product: {
            name: 'Grilled Chicken',
            sellingPrice: 3200
          },
          quantity: 1,
          unitPrice: 3200,
          selectedVariants: [
            { name: 'Lemon Herb' }
          ]
        },
        {
          id: '7',
          product: {
            name: 'Garlic Bread',
            sellingPrice: 600
          },
          quantity: 3,
          unitPrice: 600,
          selectedVariants: []
        }
      ],
      subtotal: 6800,
      deliveryFee: 500,
      total: 7300,
      deliveryMethod: 'delivery',
      paymentMethod: 'card',
      deliveryInfo: {
        fullName: 'John Doe',
        phoneNumber: '+2348012345678',
        address: '123 Main Street, Lagos Island, Lagos',
        instructions: 'Leave at front desk'
      },
      orderDate: new Date().toISOString(),
      status: 'confirmed'
    },
    {
      id: '4',
      orderNumber: 'ORD-004',
      items: [
        {
          id: '8',
          product: {
            name: 'Seafood Pasta',
            sellingPrice: 5200
          },
          quantity: 1,
          unitPrice: 5200,
          selectedVariants: [
            { name: 'Cream Sauce' }
          ]
        }
      ],
      subtotal: 5200,
      deliveryFee: 500,
      total: 5700,
      deliveryMethod: 'delivery',
      paymentMethod: 'cash',
      deliveryInfo: {
        fullName: 'John Doe',
        phoneNumber: '+2348012345678',
        address: '123 Main Street, Lagos Island, Lagos'
      },
      orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'cancelled'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  /**
   * Load orders from localStorage or use dummy data for demonstration
   */
  loadOrders(): void {
    this.isLoading = true;
    
    setTimeout(() => {
      try {
        // Try to load from localStorage first
        const storeOrders = this.getOrdersFromStorage(this.ORDERS_STORAGE_KEY);
        const guestOrders = this.getOrdersFromStorage(this.GUEST_ORDERS_KEY);
        
        // Combine orders from both sources (remove duplicates by ID)
        const allOrders = [...storeOrders, ...guestOrders];
        const uniqueOrders = this.removeDuplicateOrders(allOrders);
        
        // If no orders found in localStorage, use dummy data for demonstration
        if (uniqueOrders.length === 0) {
          console.log('📦 Using dummy data for demonstration');
          this.orders = this.dummyOrders;
        } else {
          this.orders = uniqueOrders;
        }
        
        this.reversedOrders = [...this.orders].reverse();
        
        console.log('✅ Loaded orders:', this.orders.length);
        
      } catch (error) {
        console.error('❌ Error loading orders:', error);
        // Fallback to dummy data on error
        this.orders = this.dummyOrders;
        this.reversedOrders = [...this.orders].reverse();
      } finally {
        this.isLoading = false;
      }
    }, 1000);
  }

  /**
   * Get orders from specific localStorage key
   */
  private getOrdersFromStorage(key: string): GuestOrder[] {
    try {
      const storedData = localStorage.getItem(key);
      if (!storedData) {
        return [];
      }

      const parsed = JSON.parse(storedData);
      
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed && typeof parsed === 'object') {
        return [parsed];
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error parsing ${key}:`, error);
      return [];
    }
  }

  /**
   * Remove duplicate orders based on ID or orderNumber
   */
  private removeDuplicateOrders(orders: GuestOrder[]): GuestOrder[] {
    const seen = new Set<string>();
    return orders.filter(order => {
      const key = order.id || order.orderNumber;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Format status for display (capitalize first letter)
   */
  formatStatus(status: string): string {
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Format date to readable string
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(method: string): string {
    if (!method) return 'Cash';
    return method.charAt(0).toUpperCase() + method.slice(1);
  }

  /**
   * Format number with commas and 2 decimal places
   */
  formatNumber(value: number): string {
    if (!value && value !== 0) return '0.00';
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }

  /**
   * Format product name (truncate if too long)
   */
  formatProductName(name: string): string {
    if (!name) return 'Item';
    return name.length > 50 ? name.slice(0, 50) + '...' : name;
  }

  /**
   * Get CSS class for status badge - Updated with custom colors
   */
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'confirmed': 
        return 'bg-[#2E6276] bg-opacity-10 text-[#2E6276]';
      case 'preparing': 
        return 'bg-[#2EB270] bg-opacity-10 text-[#2EB270]';
      case 'ready': 
        return 'bg-[#2EB270] bg-opacity-20 text-[#2EB270]';
      case 'completed': 
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Navigate to order details/confirmation page
   */
  viewOrder(orderId: string): void {
    console.log('📋 Viewing order:', orderId);
    alert(`Viewing order details for: ${orderId}\n\nIn a real application, this would navigate to the order details page.`);
  }

  /**
   * Navigate back to store
   */
  goToStore(): void {
    this.router.navigate(['/store']);
  }

  /**
   * Clear all order history
   */
  clearOrders(): void {
    if (confirm('Are you sure you want to clear all order history? This action cannot be undone.')) {
      localStorage.removeItem(this.ORDERS_STORAGE_KEY);
      localStorage.removeItem(this.GUEST_ORDERS_KEY);
      
      this.orders = [];
      this.reversedOrders = [];
      
      console.log('🗑️ Order history cleared');
    }
  }

  /**
   * Calculate total spent across all orders
   */
  calculateTotalSpent(): string {
    const total = this.orders.reduce((sum, order) => sum + (order.total || 0), 0);
    return this.formatNumber(total);
  }

  /**
   * Calculate total items across all orders
   */
  calculateTotalItems(): number {
    return this.orders.reduce((sum, order) => {
      const itemCount = order.items?.reduce((itemSum: number, item: any) => 
        itemSum + (item.quantity || 0), 0) || 0;
      return sum + itemCount;
    }, 0);
  }

  /**
   * Reorder - add order items back to cart
   */
  reorderItems(order: GuestOrder): void {
    console.log('🔄 Reorder functionality - to be implemented');
    alert(`Adding ${order.items.length} items from order ${order.orderNumber} to cart!\n\nIn a real application, this would add all items to the shopping cart.`);
  }

  /**
   * Track order - navigate to tracking page
   */
  trackOrder(orderId: string): void {
    console.log('📍 Track order functionality - to be implemented');
    alert(`Tracking order: ${orderId}\n\nIn a real application, this would navigate to the order tracking page with real-time updates.`);
  }

  /**
   * Refresh orders from storage
   */
  refreshOrders(): void {
    this.loadOrders();
  }

  /**
   * Add dummy data to localStorage for testing
   */
  addDummyDataToStorage(): void {
    localStorage.setItem(this.ORDERS_STORAGE_KEY, JSON.stringify(this.dummyOrders));
    alert('Dummy data added to localStorage! Refresh the page to see it loaded from storage.');
    this.loadOrders();
  }
}