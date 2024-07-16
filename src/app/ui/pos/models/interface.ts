export interface Product {
    id: number;
    name: string;
    price: number;
    cartPriceTotal: number;
    count: number;
    discount: number;
  }
  
  export interface DiscountOption {
    label: string ;
    value: number | string;
  }
  
  export interface Order {
    name: string;
    cartDiscount: number;
    state: string;
    total: number
    cart: Product[];
  }