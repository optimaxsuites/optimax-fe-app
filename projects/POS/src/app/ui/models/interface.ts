export interface ProductJSONFormat {
  id: number;
  name: string;
  code: string;
  description: string;
  sku: string;
  weight: number | null;
  initialPrice: string;
  effectivePrice: string;
  initialQuantity: number;
  effectiveQuantity: number;
  createdDate: number[];
  createdBy: string;
  partNumber: string;
  tax: number;
  branch: string;
  variant: null;
  discount: Discount;
  productCategory: ProductCategory;
  productImages: ProductImage[];
  variants: Variant[];
}

export interface ProductData extends ProductJSONFormat {
  cartPriceTotal: string;
  count: number;
}

interface Discount {
  id: number;
  name: string;
  value: number;
  startDate: null;
  endDate: null;
  minQuantity: null;
  type: string;
}

interface ProductCategory {
  id: number;
  name: string;
  code: string;
  description: string;
}

interface ProductImage {
  id: number;
  name: string;
  imgNo: string;
}

interface Variant {
  id: number;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  variantType: null;
}

export interface DiscountOption {
  label: string;
  value: number | string;
}

export interface Order {
  timestamp: any;
  name: string;
  cartDiscount: number;
  state: string;
  total: number;
  cart: ProductJSONFormat[];
  id: string;
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
  cartItems: ProductData[];
  cart: ProductData[];
  id: string;
}

export interface NavigationState {
  cart: Cart;
  order: Cart;
}

export interface Refund {
  phoneNumber: string;
  emailAddress: string;
  timestamp: any;
  orderId: string;
  customerName: string;
  refundMeans: string;
  refundReason: string;
  cashierComment: string;
  status: string;
  selectedItems: any;
}

export interface SelectedRequest {
  selectedRequest: Refund;
  phoneNumber: string;
  emailAddress: string;
  timestamp: any;
  orderId: string;
  customerName: string;
  refundMeans: string;
  refundReason: string;
  cashierComment: string;
  status: string;
  selectedItems: any;
}
