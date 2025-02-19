import { businessType } from '../../variables-to-move-to-backend';
import { BusinessType } from './enums';
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
  // Date String Format: "2025-02-02T22:56:31.935Z"
  createdDate: string;

  createdBy: string | null;
  partNumber: string;
  tax: number;
  branch: string;
  variant?: string | null;
  discount: Discount;
  productCategory: ProductCategory;
  productImages: ProductImage[];
  variants: Variant[];
}

/**
 * There's some extra data we use with each product that wouldn't fit directly with the fetched data interface, `ProductJSONFormat`
 */
export interface ProductData extends ProductJSONFormat {
  // FIXME: REMOVE THIS "any" >~<
  supplier: any;
  // The total price of all instances of a single product in the cart
  cartPriceTotal: string;
  // The number of instances of a product in the cart
  count: number;
  // The total discount of all instances of a single product in the cart
  discountedPrice: number;

  selectedVariant: string;
}
export type HistoryData = Map<number, ProductData[]>;

export interface Discount {
  id: number;
  name: string;
  value: number;

  // Date String Format: "2025-02-02T22:56:31.935Z"
  startDate: string;
  endDate: string;

  minQuantity: number;
  discountType: number | string;
}

export interface ProductCategory {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface ProductImage {
  id: number;
  name: string;
  imgNo: string;
}

export interface Variant {
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

// TODO: Fill this up with the appropriate types
export interface InventoryProductDTO {
  // The inventory to be associated to
  inventoryId: number;
  // The product to be associated to
  productId: number;
  history: HistoryDTO;
}

export interface HistoryDTO {
  id: number;
  changeType: string;
  costPrice: number;
  quantity: number;
  change: ChangeDTO;
  totalCost: number;
}

export interface ChangeDTO {
  returnType: 'customer';
}
export type supplierData = {
  id: number;
  supplierName: string;
  contactPerson: string;
  email: string;
  phone: number;
  address: string;
  products: string;
  notes: string;
  agreeTerms: boolean;
  createdAt: Date;
};

/**
 * This is the interface that should be implemented by components that wish to change behaviour or UI based on the business type.
 *
 * @export
 * @interface Business
 * @typedef {Business}
 */
export interface Business {
  businessType: BusinessType;
}
