export interface Product {
    id: number;
    name: string;
    price: number;
    cartPriceTotal: number;
    count: number;
    discount: number;
    discountType: string;
    discountValue: number;
  }
  
  export interface DiscountOption {
    label: string ;
    value: number | string;
  }
  
  export interface Order {
timestamp: any;
    name: string;
    cartDiscount: number;
    state: string;
    total: number
    cart: Product[];
  }

  export interface Cart {
    total: number;
    discount: number;
    tax: number;
    subtotal: number;
    cartItems: Product[];
  }
  
  export interface NavigationState {
    cart: Cart;
  }