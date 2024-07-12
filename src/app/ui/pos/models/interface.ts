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