import { Observable, Subscribable } from "rxjs";
import { BusinessType } from "./enums";
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexGrid,
  ApexStroke,
  ApexTooltip,
  ApexPlotOptions,
  ApexFill,
  ApexLegend,
  ApexResponsive,
  ApexNonAxisChartSeries,
  ApexTitleSubtitle,
} from "ng-apexcharts";

/** Like `satisfies` but for types */
export type Satisfy<
  TTypeToSatisfy,
  TTypeToCheck extends TTypeToSatisfy
> = TTypeToCheck;

type DateString = string;
export type DateArray = ReadonlyArray<number> & {
  length: 1 | 2 | 3 | 4 | 5 | 6 | 7;
};
export type DateType = DateString | DateArray;

export interface BundleItemDTO {
  id: number;
  name: string;
  quantity: number; // Quantity of this item inside the bundle
  code?: string;
  sku?: string;
}

export interface ProductJSONFormat<TDateType extends "string" | "array"> {
  id: number;
  name: string;
  code: string;
  description: string;
  sku: string;
  weight: number | null;
  costPrice: string;
  sellingPrice?: string;
  quantity?: number;
  isAvailableInStore?: boolean;
  inventoryId?: number;
  __originalProduct?: ProductDTO | any;

  createdDate: TDateType extends "string" ? DateString : DateArray;
  expiryDate: TDateType extends "string" ? DateString : DateArray;
  createdBy: string | null;
  partNumber: string;
  tax: TaxDTO;
  productBranch?: any;
  variant?: string | null;
  discount?: DiscountDTO;
  productCategory: ProductCategoryPOST;
  productImages: ProductImageDTO[];
  variants: VariantDTO[];
  
  // Combo/Bundle Fields
  isBundle?: boolean;
  bundleItems?: BundleItemDTO[] | any[]; // Updated to support Bundle Content
  
  measurementUnit?: any;
  reorderThreshold?: number | null;
}

export type ProductJSONFormatPOST = ProductJSONFormat<"string">;
export type ProductJSONFormatGET = ProductJSONFormat<"array">;

type ProductDataShared = {
  productVariant: any;
  product: any;
  purchasePrice: any;
  branch: BranchDTO;
  branchDetails?: any;
  imageUrl$?: Observable<unknown> | Subscribable<unknown> | Promise<unknown>;
  showMenu: any;
  supplier: any;
  cartPriceTotal: string;
  count: number;
  discountedPrice: number;
  selectedVariants?: VariantDTO[];
  pricingQuantity: any;
  quantity: number;
};

export type ProductData = ProductJSONFormatPOST & ProductDataShared;
export type ProductDataGET = ProductJSONFormatGET & ProductDataShared;
export type HistoryData = Map<number, ProductData[]>;

export interface DiscountDTO {
  id: number;
  name: string;
  value: number;
  code?: string;
  description?: string;
  active?: boolean;
  discountType: any;
  discountValue?: number;
  startDate: Date;
  endDate: Date;
  minQuantity: number;
}

export interface DiscountTypeDTO {
  id: number;
  name: string;
  code: string;
  description: string;
}

interface ProductCategoryShared<TDateType extends "string" | "array"> {
  id: number;
  name: string;
  code: string;
  description: string;
  endDate: TDateType extends "string" ? DateString : DateArray;
}
export interface ProductCategoryPOST extends ProductCategoryShared<"string"> {}
export interface ProductCategoryGET extends ProductCategoryShared<"array"> {}

export interface ProductImageDTO {
  id: number;
  name: string;
  imgNo: string;
}

export interface VariantDTO {
  id: number;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  variantType?: number;
  selectedQuantity?: number;
  branches?: BranchDTO[];
  color: string;
  size: "XXS" | "XS" | "Small" | "Medium" | "Regular" | "Large" | "XL" | "XXL";
  code: string
}

export interface DiscountOption {
  label: string;
  value: number | string;
}

export interface SalesReportDTO {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  totalDiscounts: number;
  totalSalesPerBranch: BranchSalesDTO[];
  topSellingProducts: TopProductDTO[];
  paymentMethodBreakdown: PaymentMethodSummaryDTO[];
  breakdown: SalesReportBreakdownDTO[];
}

export interface BranchSalesDTO {
  branch: BranchDTO;
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
}

export interface TopProductDTO {
  product: ProductDTO;
  quantitySold: number;
  revenue: number;
}

export interface PaymentMethodSummaryDTO {
  paymentMethod: string;
  revenue: number;
  transactions: number;
}

export interface SalesReportBreakdownDTO {
  date: Date;
  branch: BranchDTO;
  cashier?: any;
  channel?: string;
  paymentMethod?: string;
  transactions: number;
  revenue: number;
  discounts: number;
}

export interface Order {
  isOnline: any;
  deliveryStatus: string;
  salesperson: any;
  branch: any; 
  payment: any;
  amountTendered: any; 
  orderItem: any; 
  customer: any;
  updatedAt: any; 
  orderStatus: any; 
  orderNumber: any; 
  totalAmount: any; 
  status: any;
  amount: any;
  createdDate: any; 
  timestamp: any;
  name: string;
  cartDiscount: number;
  state: string;
  total: number;
  cart: ProductJSONFormat<"array">[];
  id: string; 
  deliveryMethod?: DeliveryMethod | string;
  deliveryInfo?: DeliveryInfoDTO | null; 
  updatedBy?: string; 
  deliveryFee?: number;
}

export type ValidOrderStatus = 
  | 'CANCELLED' 
  | 'READY' 
  | 'DELIVERED' 
  | 'UNPAID' 
  | 'PENDING' 
  | 'PAID' 
  | 'CONFIRMED' 
  | 'PREPARING';

export type ValidDeliveryStatus = 
  | 'AWAITING_PAYMENT'
  | 'PENDING'
  | 'PROCESSING'
  | 'PACKAGED'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'PICKED_UP'
  | 'CANCELLED'
  | 'FAILED'
  | 'N/A';

export interface OrderUpdateDTO {
  id: number | string;
  orderNumber: string;
  orderStatus: ValidOrderStatus;
  deliveryStatus: string;
  updatedBy: string;
  totalAmount: number;
  quantity: number;
  
  customerId: number;
  branchId: number;
  isOnline: boolean;
  createdDate: string; // ISO String
  
  // Payment ID - CRITICAL for avoiding NullPointerException
  paymentId?: number | null;
  
  // Optional but often required fields
  deliveryInfoId?: number | null;
  customerEmail?: string;
  deliveryFee?: number;
  
  // Cancellation specific
  cancellationReason?: string;
  processChargeback?: boolean;
  
  // Item details for reconstruction
  orderItem?: any[];
}

export type PaymentModes = "card" | "mobile" | "cash" | "loyalty";
export type Cart = {
  id: string;
  orderId: number;
  paymentModes: PaymentModes[];
  total: number;
  discount: number;
  tax: number;
  subtotal: number;
  cartItems: ProductData[];
} & Partial<{
  customer: any;
  payment: any;
  amountTendered: number;
  orderNumber: any;
  totalAmount: number;
  orderStatus?: any;
  orderItem?: any;
  updatedAt?: [];
  changeOffered: any;
  paymentMethod: any;
  state: any;
  timestamp: any;
  cart: ProductData[];
  deliveryStatus: string; 
}>;

export interface NavigationState {
  cart: Cart;
  order: Cart;
}

export interface Refund {
  id?: any;
  orderNumber?: any;
  createdAt?: any;
  name: any;
  refundStatus: string;
  phoneNumber: string;
  emailAddress: string;
  timestamp: any;
  orderId: string;
  customerName: string;
  refundMeans: string;
  refundReason: string;
  refundMethod?: string;
  cashierComment: string;
  adminComment?: string;
  status: string;
  selectedItems: any;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  loyaltyId?: string;
  selectedRequest: Refund;
  royaltyAccountId: number;
  reason: any;
  refundableAmount: string | number;
  returnItems: any;
}

export interface SelectedRequest extends Refund {
  returnItems: any;
  refundableAmount: string | number;
  reason: any;
  royaltyAccountId: number;
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

export interface InventoryProductDTO {
  costPrice: string;
  sellingPrice: string;
  inventoryId: number;
  productId: number;
  history: HistoryDTO;
  name: string;
  sku: string;
  price: number;
  id: number | string;
  
  code?: string;
  description?: string;
  weight?: number;
  createdDate?: string;
  createdBy?: string | null;
  partNumber?: string;
  tax?: number;
  branches?: ProductBranchDTO[];
  discount?: DiscountDTO | null;
  productCategory?: ProductCategoryPOST | null;
  productImage?: ProductImageDTO | null;
  variants?: VariantDTO[];
  supplier?: supplierData;
  isBundle?: boolean;
  bundleItems?: BundleItemDTO[] | any[];
  category?: any;
  discountedUnits?: number;
  totalDiscountAmount?: number;
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
  returnType: "customer";
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
  order?: number;
  description?: string;
  length?: any;
  map?: any;
  reduce?: any
};

export interface Business {
  businessType: BusinessType;
}

export interface ProductDTO {
  sellingPrice: number;
  category: any;
  price: number;
  id: number;
  name: string;
  code: string;
  description: string;
  sku: string;
  weight: number;
  createdDate: string;
  discountedUnits?: number;
  totalDiscountAmount?: number;
  createdBy: string | null;
  partNumber: string;
  tax: number;
  branches: ProductBranchDTO[];
  discount: DiscountDTO;
  productCategory: ProductCategoryPOST;
  productImage: ProductImageDTO;
  variants: VariantDTO[];
  supplier?: supplierData; 
  
  // Combo fields for ProductDTO
  isBundle?: boolean;
  bundleItems?: BundleItemDTO[] | any[];
}

interface ProductBranchDTO {
  name: string;
  branchId: BranchDTO;
  data: BranchDataDTO;
}

export interface BranchDTO {
  location: any;
  id: number;
  name: string;
  description: string;
  address: string;
  phoneNo: number;
  manager?: string;
  contactInfo?: string;
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

export interface SupplierDTO {
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
}

export interface CustomerDTO {
  id?: number;
  name: string;
  email?: string;
  phoneNumber: string;
  loyaltyPoints?: number;
}
interface HotelProductDTO extends ProductDTO {}

export const MeasurementUnit = {
  UNIT: "UNIT",
  PIECE: "Piece",
  PACK: "Pack",
  BOX: "Box",
  DOZEN: "Dozen",
  KG: "Kg",
  GRAM: "Gram",
  POUND: "Pound",
  TON: "Ton",
  LITER: "Liter",
  MILLILITER: "Milliliter",
  CUBIC_METER: "Cubic Meter",
  METER: "Meter",
  CENTIMETER: "Centimeter",
  INCH: "Inch",
  FOOT: "Foot",
  YARD: "Yard",
  PER_MINUTE: "Per Minute",
  PER_HOUR: "Per Hour",
  PER_DAY: "Per Day",
  PER_WEEK: "Per Week",
  PER_MONTH: "Per Month",
  PER_YEAR: "Per Year",
  PER_SESSION: "Per Session",
  PER_VISIT: "Per Visit",
  PER_USAGE: "Per Usage",
  PER_NIGHT: "Per Night",
  PER_PERSON: "Per Person",
  PER_ROOM: "Per Room",
  PER_KM: "Per Kilometer",
  PER_MILE: "Per Mile",
  PER_TRIP: "Per Trip",
} as const;

export interface TableOrderStatusFullDTO {
  id?: number;
  tableNumber: string;
  status?: "PAID" | "UNPAID";
  waterId?: number;
  chefId?: number;
  orderedOn?: string;
  processedOn?: string;
  readyOn?: string;
  completedOn?: string;
  note?: string;
}

export interface OrderItemDTO {
  productVariant: any;
  totalPrice: any;
  sellingPrice: any;
  id: number;
  product: any;
  quantity: number;
  unitPrice: number;
}

export interface ReturnItemDTO {
  id: number;
  orderItem: OrderItemDTO;
  quantity: number;
}

interface BankDetailsDTO {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export enum RefundMethod {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  ROYALTY_TOPUP = "ROYALTY_POINTS",
  EXCHANGE = "EXCHANGE",
}

export enum ReturnStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PROCESSED = "PROCESSED",
}

export interface UserDTO {
  id: number;
  name: string;
  email?: string;
}

export interface ReturnDTO {
  orderId?: number;
  returnItems?: ReturnItemDTO[];
  royaltyAccountId?: number | undefined;
  id?: number;
  name: string;
  phoneNumber: string;
  royaltyAccount: CustomerDTO;
  order: Order;
  items: ReturnItemDTO[];
  reason: string;
  cashierComment: string;
  adminComment?: string;
  status: ReturnStatus;
  processedBy?: UserDTO;
  createdAt?: Date;
  refundableAmount: number;
  refundMethod: RefundMethod;
  bankDetails: BankDetailsDTO;
  exchangeFor: ProductData;
  refundStatus: RefundStatus;
}

export enum RefundStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
  PROCESSING = "Processing",
  CANCELED = "CANCELED",
  EXPIRED = "Expired",
  UNDER_REVIEW = "UnderReview",
  CHARGEBACK = "Chargeback",
}

export interface RefundDecisionRequest {
  refundStatus: RefundStatus;
  adminComment: string;
  orderId?: string;
}
export interface RefundUpdateRequest {
  refundRequest: RefundDecisionRequest;
}
export interface InventoryPayload {
  id: number;
  availableQuantity: number;
  status: "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK";
  productId: number;
  branchId: number;
  stockMovement: StockMovementPayload[];
}

export interface StockMovementPayload {
  id: number;
  quantity: number;
  reference: string;
  sellingPrice: string | number;
  purchasePrice: string | number;
  createdDate: string;
  createdById: number;
  supplier: {
    id: number;
  };
  ingredient: {
    id: number;
  };
  inventory?: {
    id: number;
    availableQuantity: number;
    status: "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK";
    product: ProductData;
    branch: BranchDTO;
    stockMovement: string[];
  };
  stockMovements?: {
    id: number;
    availableQuantity: number;
    status: "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK";
    product: ProductData;
    branch: BranchDTO;
    stockMovement: string[];
  };
}

export interface StockMovementsPayload {
  id: number;
  availableQuantity: number;
  status: "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK";
  product: ProductData;
  branch: BranchDTO;
  stockMovement: string[];
}

export interface LegacyInventoryPayload {
  id: number;
  availableQuantity: number;
  status: string;
  product: ProductData;
  branch: BranchDTO;
  stockMovement: StockMovementPayload[];
}

export interface CreateStockMovementPayload {
  id: number;
  quantity: number;
  reference: string;
  sellingPrice: string | number;
  purchasePrice: string | number;
  createdDate: string;
  createdById: number;
  supplier: {
    id: number;
  };
  ingredient: {
    id: number;
  };
}

export interface IngredientPayload {
  id: number;
  name: string;
  code: string;
  sku: string;
  purchasePrice: number;
  currentStock: number;
  reorderThreshold: number;
  measurementUnit: string;
  supplier: SupplierDTO;
  branch: BranchDTO;
  stockMovement: string[];
  recipe: RecipePayload;
}

export interface RecipePayload {
  id: number;
  createdDate: string;
  product: ProductData;
  ingredient: string[];
  createdById: number;
}

export interface StockMovementCreateDTO {
  quantity: number;
  reference: string;
  purchasePrice: number;
  sellingPrice: number;
  createdDate: string;
  supplierId?: number | null;
  ingredientId: number; 
  inventoryId: number;
  createdById?: number; 
}

export type InventoryStatus = "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK";

export interface InventoryCreatePayload {
  availableQuantity: number;
  status: InventoryStatus;
  branchId: number;
  productId?: number;
  ingredientId?: number;
  stockMovement?: StockMovementCreateForInventory[];
}

export interface StockMovementCreateStandalone {
  quantity: number;
  reference?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  createdDate: string;
  supplierId?: number | null;
  inventoryId: number;
}

export interface StockMovementCreateForInventory {
  quantity: number;
  reference?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  createdDate: string;
  supplierId?: number | null;
}

export interface InventoryUpdatePayload {
  id: number;
  availableQuantity: number;
  status: "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK";
  productId: number;
  branchId: number;
  stockMovement: StockMovementCreatePayload[];
}

export interface InventoryResponsePayload {
  id: number;
  availableQuantity: number;
  status: "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK";
  productId: number;
  branchId: number;
  stockMovement: StockMovementResponsePayload[];
  product?: ProductData;
  branch?: BranchDTO;
  createdDate?: string;
}

export interface StockMovementCreatePayload {
  quantity: number;
  reference: string;
  purchasePrice: number;
  sellingPrice: number;
  createdDate: string;
  supplierId?: number | null;
  ingredientId: number;
  inventoryId?: number;
}

export interface StockMovementResponsePayload {
  id: number;
  quantity: number;
  reference: string;
  purchasePrice: number;
  sellingPrice: number;
  createdDate: string;
  stockMovementsId?: number;
  createdById?: number;
  supplierId?: number;
  ingredientId: number;
  inventoryId: number;
}

export type StockMovementPostBody = {
  quantity: number;
  reference?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  createdDate: string;
  createdById?: number;
  supplierId?: number | null;
  ingredientId?: number | null;
  inventoryId?: number;
};
export interface StockMovementByInventory {
  id: number;
  quantity: number;
  reference?: string | null;
  purchasePrice?: number | null;
  sellingPrice?: number | null;
  createdDate: string | number[];
  supplierId?: number | null;
  inventoryId: number;
  createdById?: number | null;

  supplier?: {
    id: number;
    name: string;
    contactPerson: string;
    phoneNumber: string;
    email: string;
    address: string;
  } | null;
  ingredient?: any | null;
  inventory?: {
    id: number;
    availableQuantity: number;
    status: string;
    productId: number;
    branchId: number;
    stockMovement: StockMovementByInventory[];
  } | null;
}

export interface ProductPerformanceReportRequestDTO {
  startDate: string;
  endDate: string;
  branchIds?: number[];
  categoryIds?: number[];
  groupBy?: "product" | "category" | "variant";
}

export interface PromotionsReportRequestDTO {
  startDate: Date;
  endDate: Date;
  promotionIds?: string[];
}

export interface BranchReportRequestDTO {
  startDate: Date;
  endDate: Date;
  compareWithPrevious?: boolean;
}

export interface InventoryReportRequestDTO {
  startDate?: string;
  endDate?: string;
  branchIds?: number[];
  categoryIds?: number[];
  includeLowStock?: boolean;
}

export interface StockMovementReportRequestDTO extends InventoryReportRequestDTO {
  groupBy?: 'none' | 'day' | 'week' | 'month'; 
  productId?: number | null;
}

export interface CashierReportRequestDTO {
  startDate: string;
  endDate: string;
  branchIds?: number[];
  shift?: string;
}

export interface ProductPerformanceReportDTO {
  totalProductsSold: number;
  totalRevenue: number;
  bestsellers: ProductStatsDTO[];
  underperformers: ProductStatsDTO[];
  productPerformanceBreakdown: ProductPerformanceDTO[];
}

export interface PromotionsReportDTO {
  promotions: PromotionPerformanceDTO[];
}

export interface BranchReportDTO {
  branches: BranchPerformanceDTO[];
}

export interface InventoryReportDTO {
  inventory: InventoryItemDTO[];
}

export interface CashierReportDTO {
  cashiers: CashierPerformanceDTO[];
}

export interface ProductStatsDTO {
  product: ProductDTO;
  quantitySold: number;
  revenue: number;
  percentageOfTotal: number;
}

export interface ProductPerformanceDTO {
  product: ProductDTO;
  category: CategoryDTO;
  variant?: string;
  quantitySold: number;
  totalRevenue: number;
  grossMargin: number;
  branch?: BranchDTO;
}

export interface PromotionPerformanceDTO {
  promotion: DiscountDTO;
  usageCount: number;
  totalDiscountAmount: number;
  affectedProducts: ProductDTO[];
  startDate: Date;
  endDate: Date;
}

export interface BranchPerformanceDTO {
  branch: BranchDTO;
  totalRevenue: number;
  productMovement: number;
  customerFootfall?: number;
  previousRevenue?: number;
  revenueGrowthPercent: number;
}

export interface CashierPerformanceDTO {
  cashier: UserDTO;
  branch: BranchDTO;
  ordersHandled: number;
  revenueGenerated: number;
  refunds: number;
  discountsGiven: number;
}

export interface InventoryItemDTO {
  product: InventoryProductDTO | ProductDTO | any; 
  category: CategoryDTO;
  currentStock: number;
  soldQuantity: number;
  branch: BranchDTO;
  lowStockAlert: boolean;
}

export interface PaymentMethodDTO {
  id: string;
  name: string;
}

export type ChartOptions = {
  series?: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart?: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis | ApexYAxis[];
  dataLabels?: ApexDataLabels;
  grid?: ApexGrid;
  stroke?: ApexStroke;
  tooltip?: ApexTooltip;
  plotOptions?: ApexPlotOptions;
  fill?: ApexFill;
  legend?: ApexLegend;
  responsive?: ApexResponsive[];
  colors?: string[];
  title?: ApexTitleSubtitle;
  labels?: string[];
};

export interface CategoryDTO {
  code: string;
  endDate: null;
  id: number;
  name: string;
  description?: string;
}

export interface OrderDTO {
  id: number;
  orderNumber: string;
  orderStatus: string;
  updatedAt: string;
  createdDate: string;
  amountTendered: number;
  totalAmount: string;
  quantity: number;
  customerId: number;
  branchId: number;
  discountId: number;
  paymentId: number;
  cashierId: number;
  orderItem: OrderItemsDTO[];
  deliveryFee: number;
  estimatedReadyTime: string;
  estimatedDeliveryTime: string;
  customerEmail: string;
  deliveryInfoId: number;
  deliveryMethod?: 'DELIVERY' | 'PICKUP';
  deliveryInfo?: DeliveryInfoDTO;
  updatedBy?: string; 
}

export interface DeliveryInfoDTO {
  id: number;
  fullName: string;
  phoneNumber: string;
  address: string;
  email: string;
  instructions: string;
  deliveryStatus?: ValidDeliveryStatus;
}

export interface OrderItemsDTO {
  id: number;
  totalPrice: number;
  quantity: number;
  productId: number;
  productVariantId: number;
  orderId: number;
  productName?: string;
  unitPrice?: number;
  selectedVariants?: VariantDTO[];
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  PAID = 'PAID'
}

export enum DeliveryMethod {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP'
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  MOBILE = 'MOBILE'
}

export interface StockMovementReportItemDTO {
  productDisplayName: string;
  categoryName: any;
  id: number;
  createdDate: string; 
  quantity: number; 
  reference: string | null;
  purchasePrice: number | null;
  sellingPrice: number | null; 
  productName: string;
  productSku: string;
  productCategory: string;
  branchName: string;
  supplierName: string | null;
  productId: number;
  branchId: number;
}

export interface StockMovementReportDTO {
  movements: StockMovementReportItemDTO[];
  totalInflow: number;
  totalOutflow: number;
  netChange: number;
}