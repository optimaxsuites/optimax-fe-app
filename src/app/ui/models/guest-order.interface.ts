// interface for the guest order
export interface GuestOrder {
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

export type OrderStatus = 'confirmed' | 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';