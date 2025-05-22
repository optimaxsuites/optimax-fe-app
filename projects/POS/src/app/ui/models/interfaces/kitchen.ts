import { ProductData } from "../interface";

// NOTE: Dates are sent as ISO strings, `new Date().toISOString()` and are received as arrays that can be converted back to a Date using `new Date(...dateArray)
interface TableOrderStatusShared<TDateType> {
  /**
   * Unique identifier.
   * @type {number}
   * @format int64
   */
  id: number;

  /**
   * Table number.
   * @type {string}
   * @minLength 0
   * @maxLength 255
   * @required
   */
  tableNumber: string;

  /**
   * Current status of the order.
   * @type {string}
   */
  status: "PAID" | "UNPAID";

  /**
   * Identifier for the waiter.
   * @type {number}
   * @format int32
   */
  waterId: number;

  /**
   * Identifier for the chef.
   * @type {number}
   * @format int32
   */
  chefId: number;

  /**
   * Timestamp when the order was placed.
   */
  orderedOn: TDateType | null;

  /**
   * Timestamp when the order began processing.
   */
  processedOn: TDateType | null;

  /**
   * Timestamp when the order was ready.
   */
  readyOn: TDateType | null;

  /**
   * Timestamp when the order was completed.
   */
  completedOn: TDateType | null;

  /**
   * Optional note attached to the order.
   * @type {string}
   * @minLength 0
   * @maxLength 255
   */
  note: string;
}

/**
 * Data Transfer Object representing the status of a table order that we upload to the server.
 */
export interface TableOrderStatusPOST extends TableOrderStatusShared<string> {
  /**
   * Identifiers of the order specific to the table. Basically an id of an existing `OrderGET` (aka `OrderGET["id"]1)
   */
  orderId: number;
}
/**
 * Data Transfer Object representing the status of a table order that we get to the server.
 */
export interface TableOrderStatusGET extends TableOrderStatusShared<number[]> {
  order: OrderGET;
}

interface OrderShared<TDateType> {
  id: number;
  /**
   * @minLength 0
   * @maxLength 12
   */
  orderNumber: string;
  orderStatus: "PAID" | "UNPAID";
  /**
   * @format date-time
   */
  updatedAt: TDateType;
  /**
   * @format date-time
   */
  createdDate: TDateType;
  amountTendered: number;
}

export interface OrderPOST extends OrderShared<string> {
  totalAmount: `${number}`;
  quantity: number;
  customerId: number | null;
  branchId: number | null;
  discountId: number | null;
  paymentId: number | null;
  cashierId: number | null;
  orderItem: OrderItemPOST[];
}

export interface OrderGET extends OrderShared<number> {
  totalAmount: number;
  // TODO: Create the full customer interface
  customer: Record<string, any>;
  // TODO: Create the full branch interface
  branch: Record<string, any>;
  // TODO: Create the full discount interface
  discount: Record<string, any>;
  // TODO: Create the full tax interface
  tax: Record<string, any>;
  // TODO: Create the full payment interface
  payment: Record<string, any>;
  cashierId: number;
  orderItem: OrderItemGET[];
}

interface OrderItemShared {
  id: number;
  totalPrice: number;
  quantity: number;
}

export interface OrderItemPOST extends OrderItemShared {
  productId: number;
  productVariantId: number | null;
  orderId: number | null;
}

export interface OrderItemGET extends OrderItemShared {
  // TODO: Create the full product interface
  product: ProductData;
  // TODO: Create the full product variant interface
  productVariant: Record<string, any> | null;
}
