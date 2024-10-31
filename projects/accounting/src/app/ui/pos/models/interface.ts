export interface Product {
    id: number;
    name: string;
    initialPrice: string;
    effectivePrice: string;
    initialQuantity: number;
    effectiveQuantity: number;
    cartPriceTotal: number;
    count: number;
    discount: number;
    discountType: string;
    discountValue: number;
    image: string;
    rating: {};
    category: string;
    description: string;
    code: string;
    sku: string;
    weight: number
    partNumber: string
    tax: number
    branch: string
    variant: string 
    productCategory: number
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
    id: string

  }

  export interface Cart {
    changeOffered: any;
    paymentMethod: any;
    state: any;
    timestamp: any;
    total: number;
    discount: number;
    tax: number;
    subtotal: number;
    cartItems: Product[];
    cart: Product[];
    id: string
  }
  
  export interface NavigationState {
    cart: Cart;
    order: Cart
  }

   
  export interface Refund {
    phoneNumber: string;
    emailAddress: string;
    timestamp: any;
    orderId: string,
    customerName: string,
    refundMeans: string,
    refundReason: string,
    cashierComment: string,
    status: string,
    selectedItems: any
  }

  export interface SelectedRequest {
    selectedRequest: Refund;
    phoneNumber: string;
    emailAddress: string;
    timestamp: any;
    orderId: string,
    customerName: string,
    refundMeans: string,
    refundReason: string,
    cashierComment: string,
    status: string,
    selectedItems: any
  }