import { BusinessType } from './enums';
export interface ProductJSONFormat {
  id: number;
  name: string;
  code: string;
  description: string;
  sku: string;
  weight: number | null;
  originalPurchasePrice: string;
  currentPurchasePrice: string;

  // Date String Format: "2025-02-02T22:56:31.935Z"
  createdDate: string;

  createdBy: string | null;
  partNumber: string;
  tax: number;
  productBranch?: any;
  variant?: string | null;
  discount?: DiscountDTO;
  productCategory: ProductCategoryDTO;
  productImages: ProductImageDTO[];
  variants?: VariantDTO[];
  isBundle? : boolean;
  bundleItems?: any;
  measurementUnit?: any;
  reorderThreshold?: number | null;
}



/**
 * There's some extra data we use with each product that wouldn't fit directly with the fetched data interface, `ProductJSONFormat`
 */
export interface ProductData extends ProductJSONFormat {
showMenu: any;
  // FIXME: REMOVE THIS "any" >~<
  supplier: any;
  // The total price of all instances of a single product in the cart
  cartPriceTotal: string;
  // The number of instances of a product in the cart
  count: number;
  // The total discount of all instances of a single product in the cart
  discountedPrice: number;

  selectedVariants: VariantDTO[];

  pricingQuantity: any;
}
export type HistoryData = Map<number, ProductData[]>;

export interface DiscountDTO {
  id: number;
  name: string;
  value: number;

  // Date String Format: "2025-02-02T22:56:31.935Z"
  startDate: Date;
  endDate: Date;
  /**
   * The idea behind minimum quantity is when the discount only applies on quantity , for instance by 2 get 1
   */
  minQuantity: number;
  /**
   * Maybe named wrongly, but it just means if its cash/currency and not quantity. Also it can be `null` or `undefined` for some reason :p
   */
  discountType: DiscountTypeDTO;
}

export interface DiscountTypeDTO {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface ProductCategoryDTO {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface ProductImageDTO {
  id: number;
  name: string;
  /**
   * It's actually the image id. FOr example, "d03BR3TK6L3", which is used in constructing the appropriate image url.
   */
  imgNo: string;
}

export interface VariantDTO {
  id: number;
  name: string;
  price?: number;
  quantity?: number;
  sku: string;
  variantType?: number;
  selectedQuantity?: number;
  branches?: BranchDTO[];

  /**
   * Might revert this type to a regular `string`
   */
  color: (
    | 'Red'
    | 'Blue'
    | 'Green'
    | 'Yellow'
    | 'Black'
    | 'White'
    | 'Silver'
    | 'Gold'
    | 'Purple'
    | 'Orange'
    | 'Brown'
    | 'Pink'
    | 'Gray'
    | 'Beige'
    | 'Cyan'
    | 'Magenta'
    | 'Lime'
    | 'Teal'
    | 'Navy'
    | 'Maroon'
    | 'Olive'
    | 'Indigo'
    | 'Violet'
    | 'Rose'
    | 'Coral'
    | 'Turquoise'
    | 'Lavender'
    | 'Peach'
    | 'Khaki'
    | 'Tan'
    | 'Cream'
    | 'Ivory'
    | 'Fuchsia'
    | 'Aqua'
    | 'Mint'
    | 'Salmon'
    | 'Crimson'
    | 'Sienna'
    | 'Mauve'
    | 'Burgundy'
    | 'Cerulean'
    | 'Azure'
    | 'Periwinkle'
    | 'Mulberry'
    | 'Lilac'
    | 'Chartreuse'
    | 'Seafoam'
    | 'Forest'
    | 'Rust'
    | 'Bronze'
    | 'Copper'
    | 'Silver'
    | 'Gold'
    | 'Platinum'
    | 'Rainbow'
    | 'Multicolor'
    | 'Clear'
    | 'Transparent'
    | 'Opaque'
    | 'Matte'
    | 'Glossy'
    | 'Metallic'
    | 'Neon'
    | 'Pastel'
    | 'Dark'
    | 'Light'
    | 'Bright'
    | 'Pale'
    | 'Dusty'
    | 'Vintage'
    | 'Classic'
    | 'Modern'
    | 'Contemporary'
    | 'Trendy'
    | 'Minimalist'
    | 'Bold'
    | 'Subtle'
    | 'Neutral'
    | 'Warm'
    | 'Cool'
    | 'Earthy'
    | 'Natural'
    | 'Artificial'
    | 'Custom'
    | 'Other'
  )[];
  size: 'XXS' | 'XS' | 'Small' | 'Medium' | 'Regular' | 'Large' | 'XL' | 'XXL';
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
paymentModes: any;
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
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  loyaltyId?: string;
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
  id?: number;
  name: string;
  contactPerson: string;
  email: string;
  phoneNumber: number;
  address: string;
  products?: string;
  notes?: string;
  agreeTerms?: boolean;
  createdAt?: Date;
};

export type TaxDTO = {
  id?: number;
  name: string;
  rate: number;
  order?: number
}

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

/////

interface ProductDTO {
  id: number;
  name: string;
  code: string;
  description: string;
  sku: string;
  weight: number;
  createdDate: string;

  createdBy: string | null;
  partNumber: string;
  tax: number;

  /**
   * Each branch would be indexed by their name e.g (Headquarters, Wuse)
   */
  // branches: Map<string, BranchDTO>;
  branches: ProductBranchDTO[];
  discount: DiscountDTO;
  productCategory: ProductCategoryDTO;
  productImage: ProductImageDTO;
  variants: VariantDTO[];
}

interface ProductBranchDTO {
  branchId: BranchDTO;
  data: BranchDataDTO;
}

export interface BranchDTO {
  id: number;
  name: string;
  description: string;
  address: string;
  phoneNo: number;
}
interface BranchDataDTO {
  id: number;
  price: number;
  quantity: number;
  sku: string;
  supplierId: number;
  variants: VariantDTO[];
}

interface IndustryDTO {
  id: number;
  name: number;
  description: number;
}

interface SupplierDTO {
  id: number;
  name: string;
  address: string;
  description: string;
  phoneNo: number;
  email: string;
}

interface PharmacyProductDTO extends ProductDTO {
  expiryDate: Date;
  dosage: string;
  prescriptionRequired: boolean;
}

interface RestaurantProductDTO extends ProductDTO {
  ingredients: IngredientDTO[];
}

export interface IngredientDTO {
  id: number;
  name: string;
  code: string;
  sku: string;
  measurementUnit?: (typeof MeasurementUnit)[keyof typeof MeasurementUnit];
  supplier?: SupplierDTO;
  branches?: BranchDTO[]; 
  purchasePrice: number;
  currentStock: number; 
  reorderThreshold?: number; 
  // stockMovements: StockMovementDTO[];
}

export interface CustomerDTO {
  id: number;
  name: string;
  email?: string;
  phone: string;
  loyaltyPoints?: number; 
}
interface HotelProductDTO extends ProductDTO {}

// abstract class Product implements ProductDTO {
//   constructor(
//     public readonly id: number,
//     public readonly name: string,
//     public readonly code: string,
//     public readonly description: string,
//     public readonly sku: string,
//     public readonly weight: number | null,
//     public readonly createdBy: string | null,
//     public readonly partNumber: string,
//     public readonly tax: number,
//     public readonly branches: Map<string, BranchDTO>,
//     public readonly discount: DiscountDTO,
//     public readonly productCategory: ProductCategoryDTO,
//     public readonly productImages: ProductImageDTO[],
//     public readonly variants: VariantDTO[],
//     public readonly createdDate: string
//   ) {}

//   branchData(branchName: string) {
//     return this.branches.get(branchName) as BranchDTO;
//   }

//   effectiveQuantity(branchName: string) {
//     return this.branchData(branchName).regularQuantity;
//   }

//   effectivePrice(branchName: string) {
//     const price = this.branchData(branchName).regularPrice;

//     return (
//       price + (price * this.discount.value) / 100 + (price * this.tax) / 100
//     );
//   }

//   supplierId(branchName: string) {
//     return this.branchData(branchName).supplierId;
//   }
// }


export const  MeasurementUnit = {
  UNIT : "UNIT",
  PIECE : "Piece",
  PACK : "Pack",
  BOX : "Box",
  DOZEN : "Dozen",
  KG : "Kg",
  GRAM : "Gram",
  POUND : "Pound",
  TON : "Ton",
  LITER : "Liter",
  MILLILITER : "Milliliter",
  CUBIC_METER : "Cubic Meter",
  METER : "Meter",
  CENTIMETER : "Centimeter",
  INCH : "Inch",
  FOOT : "Foot",
  YARD : "Yard",
  PER_MINUTE : "Per Minute",
  PER_HOUR : "Per Hour",
  PER_DAY : "Per Day",
  PER_WEEK : "Per Week",
  PER_MONTH : "Per Month",
  PER_YEAR : "Per Year",
  PER_SESSION : "Per Session", 
  PER_VISIT : "Per Visit", 
  PER_USAGE : "Per Usage",
  PER_NIGHT : "Per Night",
  PER_PERSON : "Per Person",
  PER_ROOM : "Per Room",
  PER_KM : "Per Kilometer",
  PER_MILE : "Per Mile",
  PER_TRIP : "Per Trip",
}as const
