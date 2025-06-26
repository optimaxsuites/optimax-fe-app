import { Component, computed, Input, OnInit, signal } from "@angular/core";
import {
  BranchDTO,
  ProductCategoryPOST,
  ProductData,
  Satisfy,
} from "../../models/interface";
import { PosServiceService } from "../../service/pos-service.service";
import { lastValueFrom } from "rxjs";
import { CheckoutService } from "../../service/checkout.service";
import {
  OrderGET,
  OrderItemGET,
  OrderItemPOST,
  OrderPOST,
  TableOrderStatusGET,
} from "../../models/interfaces/kitchen";
import { arrayToDate, dateToArray } from "../../shared";
import { ImageCacheService } from "../../service/image-cache.service";
import { PaymentServiceService } from "../../service/payment-service.service";
import { ProductHelperService } from "../../service/product-helper.service";

/* `TableOrderStatus` stuff is basically all the relevant data about the customer's orders of that *table* as well as the staff who attended to that order. This `TableOrderStatus` can be broken down into a collection of orders (`Table Order`) and other date like the state of the order (UNPAID or PAID), the ids of the waiter, chef, cashier, etc. */

/** All the food ordered by a table. Each key is a food item / product and its value is simply the amount of aforementioned product */
type TableOrder = Map<ProductData, number>;

type TableOrderStatusTimeStamps = Partial<{
  orderedOn: Date;
  processedOn: Date;
  completedOn: Date;
  readyOn: Date;
}>;

type OrderStatus = {
  pending: boolean;
  processing: boolean;
  completed: boolean;
  ready: boolean;
};
type OrderStatusPending = Satisfy<
  OrderStatus,
  { pending: true; completed: false; processing: false; ready: false }
>;
type OrderStatusProcessing = Satisfy<
  OrderStatus,
  { pending: false; completed: false; processing: true; ready: false }
>;
type OrderStatusCompleted = Satisfy<
  OrderStatus,
  { pending: false; completed: true; processing: false; ready: false }
>;
type OrderStatusReady = Satisfy<
  OrderStatus,
  { pending: false; completed: false; processing: false; ready: true }
>;
type OrderStatusNone = Satisfy<
  OrderStatus,
  { pending: false; completed: false; processing: false; ready: false }
>;
/** Used to know where an order is pending, processing, completed, or ready */
type OrderStatusUnion =
  | OrderStatusCompleted
  | OrderStatusPending
  | OrderStatusProcessing
  | OrderStatusReady
  | OrderStatusNone;

@Component({
  selector: "app-checkout-kitchen",
  templateUrl: "./checkout-kitchen.component.html",
  styleUrls: ["./checkout-kitchen.component.scss"],
})
// Used for both the cashier and kitchen
export class CheckoutKitchenComponent implements OnInit {
  /** The table number that is set by the waiter when creating a new order */
  orderTableNumber = 1;
  isOrderDetailsOpen = false;
  /*
   *the order/card clicked
   */
  selectedOrder = signal<TableOrderStatusGET | null>(null);
  selectedOrderStatus = computed<OrderStatusUnion>(() => {
    const order = this.selectedOrder();

    if (!order)
      return {
        completed: false,
        pending: false,
        processing: false,
        ready: false,
      };

    if (order.readyOn) {
      return {
        completed: false,
        pending: false,
        processing: false,
        ready: true,
      };
    }

    if (order.completedOn) {
      return {
        completed: true,
        pending: false,
        processing: false,
        ready: false,
      };
    }

    if (order.processedOn) {
      return {
        completed: false,
        pending: false,
        processing: true,
        ready: false,
      };
    }

    return {
      completed: false,
      pending: true,
      processing: false,
      ready: false,
    };
  });

  /**
   * The status (and orders) of all the tables in the restaurant. It is indexed with the `id`
   */
  tableStatuses = signal<Map<number, TableOrderStatusGET>>(new Map());

  testMode = signal<typeof this.mode>("chef");

  changeTestMode(e: Event) {
    this.testMode.update(() => (e.target as HTMLInputElement).value as any);
  }

  /**
   * This is a collection of all the items in an order for the currently viewed table
   */
  tableData = signal<TableOrder>(new Map());

  /** Each key is a category name, e.g "Drink", "Main Meal", while each value is an array of products **and their variants** that has the aforementioned category */
  productCategories = new Map<string, ProductData[]>();

  currCategoryProducts: ProductData[] = [];

  get mode(): "waiter" | "chef" | "cashier" {
    //TODO: Determine the mode to use from the logged in user's id. For now though, just use a toggle to change this
    return this.testMode() ?? "chef";
  }

  isReceiptModalOpen = false;
  isCreateOrderModalOpen = signal(false);
  /**
   * This is only true if a waiter accidentally tries to overwrite an order.
   *
   * If `true`, it will display a dialog showing the waiter the details of the order and a button to explicitly overwrite it.
   */
  isCreateOrderModalOrderExistsDialogOpen = false;
  /**
   * If true, then the modal for creating orders will overwrite an order if it exists
   */
  isEditingOrder = false;
  /**
   * Toggles the note modal / dialog for adding additional information to an order.
   */
  isCreateOrderModalNoteDialogOpen = false;
  /**
   * Temporarily stores the note of an order
   */
  orderNote = signal("");

  /**
   * Used to keep track of product id and their data
   */
  private _productIdAndDataMap = new Map<number, ProductData>();
  /** TODO */
  private _fetchedBranches!: BranchDTO[];
  private readonly _dummyTableOrderStatus = 9999999;

  isPaymentModalOpen = false;

  constructor(
    private _posService: PosServiceService,
    private _checkoutService: CheckoutService,
    private _imageCacheService: ImageCacheService,
    private _paymentService: PaymentServiceService,
    private _productHelperService: ProductHelperService,
  ) {}

  ngOnInit() {
    (async () => {
      // Fetch the table statuses.
      // TODO: Implement a skeleton loader while these are getting fetched
      this._posService.getTableOrderStatuses().subscribe(async (data) => {
        this.tableStatuses.update((_) => {
          return new Map(
            data.map((tableOrderStatus) => [
              tableOrderStatus.id,
              tableOrderStatus,
            ]),
          );
        });
        console.log("Fetch table statuses are: ");
        console.log(this.tableStatuses());
      });

      // Fetch and store the branches
      this._fetchedBranches = await lastValueFrom(
        this._posService.getBranches(),
      );

      const fetchedProducts: ProductData[] = await lastValueFrom(
        this._posService.getProducts(),
      );

      fetchedProducts.forEach((fetchedProduct) => {
        const {
          productCategory: { name: category },
          variants: possibleVariants,
        } = fetchedProduct;
        // Create separate "products" for each possible variant.
        const variantProducts = possibleVariants.reduce<ProductData[]>(
          (acc, val) => [
            ...acc,
            { ...fetchedProduct, selectedVariants: [val] },
          ],
          [],
        );

        if (this.productCategories.has(category)) {
          this.productCategories
            .get(category)!
            .push(fetchedProduct, ...variantProducts);
        } else {
          this.productCategories.set(category, [
            fetchedProduct,
            ...variantProducts,
          ]);
        }
        this._productIdAndDataMap.set(fetchedProduct.id, fetchedProduct);
      });

      this.currCategoryProducts =
        this.productCategories.values().next().value ?? [];
    })();
  }

  openOrderDetails(table: TableOrderStatusGET) {
    // When a table-card is clicked, set the order details
    this.selectedOrder.set(table);
    this.isOrderDetailsOpen = true;
  }

  /**
   * @param tableNo
   * @param orders
   * @param waiterIdd - Dummy. I'll get rid of it later
   * @param overwrite - If true, then the order will be overwritten if it already exists
   * @returns `true` if an order is added successfully, otherwise `false` if an order already exists
   */
  async createOrder(
    tableNo: number,
    orders: TableOrder,
    waiterIdd?: string,
    note?: string,
    overwrite = false,
    timeStamps?: TableOrderStatusTimeStamps,
  ) {
    if (!orders.size) return;

    // const ids = [0, 1];
    // TODO: Get the waiter's id based on their login info
    const waiterId = 0;

    let isTableNumberUsed = false;
    /** THis will only have a value if `isTableNumberUsed` is true */
    let tableStatusToOverwrite: null | TableOrderStatusGET = null;
    for (const [, tableStatus] of this.tableStatuses()) {
      if (tableStatus.tableNumber == `${tableNo}`) {
        isTableNumberUsed = true;
        tableStatusToOverwrite = tableStatus;
        break;
      }
    }

    if (timeStamps?.readyOn) {
      // If it's ready, we're done with it
      this.deleteTable(tableStatusToOverwrite!);
      return;
    }

    if (isTableNumberUsed && !overwrite) {
      this.isCreateOrderModalOrderExistsDialogOpen = true;
      return false;
    } else {
      const creationDate = new Date().toISOString();

      const orderItems: OrderItemPOST[] = [];
      let amountTendered = 0;

      orders.forEach((qty, order) => {
        const possibleVariantData = this.getProductData(order);
        const totalPrice =
          qty * this.convertStrToNum(possibleVariantData.sellingPrice ?? "1");

        amountTendered += totalPrice;
        orderItems.push({
          id: 0,
          orderId: null,
          productId: order.id,
          productVariantId: order.selectedVariants?.[0].id ?? null,
          quantity: qty,
          totalPrice,
        });
      });

      if (overwrite) {
        // Get the previous order's timestamps
        const { completedOn, orderedOn, processedOn, readyOn } =
          tableStatusToOverwrite!;

        timeStamps = {
          completedOn: completedOn ? arrayToDate(completedOn) : undefined,
          orderedOn: orderedOn ? arrayToDate(orderedOn) : undefined,
          processedOn: processedOn ? arrayToDate(processedOn) : undefined,
          readyOn: readyOn ? arrayToDate(readyOn) : undefined,
        };

        // Just remove the old one :p
        // TODO: Refresh the view.
        this.deleteTable(tableStatusToOverwrite!);
      }

      // Create a dummy order since these requests could take a while
      this._createDummyOrder(
        this._dummyTableOrderStatus,
        tableNo,
        amountTendered,
        orderItems,
        timeStamps,
      );
      // update the details panel, if need be
      this.openOrderDetails(
        this.tableStatuses().get(this._dummyTableOrderStatus)!,
      );

      // Build up a new `TableOrderStatusPOST`, then send it to the backend and retrieve the created object by getting it by id
      const uploadedOrder = await lastValueFrom(
        this._checkoutService.saveOrder({
          id: 0,
          amountTendered: amountTendered,
          branchId: this._fetchedBranches[0].id,
          cashierId: null,
          createdDate: creationDate,
          customerId: null,
          discountId: null,
          orderNumber: `${0}`,
          orderStatus: timeStamps?.readyOn?.toISOString() ? "PAID" : "UNPAID",
          paymentId: null,
          quantity: 1,
          updatedAt: creationDate,
          totalAmount: `${1}`,
          orderItem: orderItems,
        }),
      );

      const uploadedTableOrderStatus = await lastValueFrom(
        this._posService.addTableOrderStatus({
          id: 0,
          chefId: 0,
          completedOn: timeStamps?.completedOn?.toISOString() ?? "",
          note: note ?? "",
          orderId: uploadedOrder.id,
          orderedOn: timeStamps?.orderedOn?.toISOString() ?? creationDate,
          processedOn: timeStamps?.processedOn?.toISOString() ?? "",
          readyOn: timeStamps?.readyOn?.toISOString() ?? "",
          status: timeStamps?.readyOn?.toISOString() ? "PAID" : "UNPAID",
          tableNumber: `${tableNo}`,
          waterId: waiterId,
        }),
      );

      const actualTableOrderStatus = await lastValueFrom(
        this._posService.getTableOrderStatusById(uploadedTableOrderStatus.id),
      );

      // delete the dummy product and replace it
      this._removeDummyOrder(this._dummyTableOrderStatus);

      if (actualTableOrderStatus.status == "PAID") {
        // Get rid of the table. This is done here since I can be sure that the separate order is already created
        this.deleteTable(actualTableOrderStatus);
      } else {
        // update the details panel, if need be
        this.openOrderDetails(actualTableOrderStatus);

        // update the signal by creating a new map
        this.tableStatuses.update(
          (statuses) =>
            new Map(
              statuses.set(actualTableOrderStatus.id, actualTableOrderStatus),
            ),
        );

        console.log("After adding an order, the table statuses are:");
        console.log(this.tableStatuses());
      }

      this.isCreateOrderModalOrderExistsDialogOpen = false;
      return true;
    }
  }

  createMultipleOrders(
    tableOrderList: { tableNo: number; orders: TableOrder }[],
  ) {
    tableOrderList.forEach((orderObject) => {
      this.createOrder(orderObject.tableNo, orderObject.orders);
    });
  }

  toggleOrderStatus(tableOrderStatus: TableOrderStatusGET) {
    const dateArray = dateToArray(new Date());
    const tableOrders = this._getTableOrdersFromGETPayload(
      tableOrderStatus.order.orderItem,
    );

    let orderedOn = arrayToDate(tableOrderStatus.orderedOn!),
      processedOn = tableOrderStatus.processedOn?.length
        ? arrayToDate(tableOrderStatus.processedOn)
        : undefined,
      completedOn = tableOrderStatus.completedOn?.length
        ? arrayToDate(tableOrderStatus.completedOn)
        : undefined,
      readyOn = tableOrderStatus.readyOn?.length
        ? arrayToDate(tableOrderStatus.readyOn)
        : undefined;

    console.log("Ordered on string: ", orderedOn);
    console.log("Ordered on array: ", tableOrderStatus.orderedOn);

    if (!tableOrderStatus.processedOn) {
      tableOrderStatus.processedOn = dateArray;
      processedOn = new Date();
    } else if (!tableOrderStatus.completedOn) {
      tableOrderStatus.completedOn = dateArray;
      completedOn = new Date();
    } else if (!tableOrderStatus.readyOn) {
      tableOrderStatus.readyOn = dateArray;
      tableOrderStatus.status = "PAID";
      readyOn = new Date();
      //TODO: Get rid of the table order
    }

    this.createOrder(
      this.convertStrToNum(tableOrderStatus.tableNumber),
      tableOrders,
      `${tableOrderStatus.waterId}`,
      tableOrderStatus.note,
      true,
      { orderedOn, processedOn, completedOn, readyOn },
    );
  }

  displayedTableStatuses = computed(() => {
    switch (this.testMode()) {
      case "waiter":
        // TODO: Use the waiter's id as a comparison here
        return [...this.tableStatuses().values()]
          .filter((tableStatus) => tableStatus.waterId == 0)
          .sort((a, b) => {
            if (a.orderedOn && b.orderedOn) {
              //@ts-expect-error
              return new Date(...a.orderedOn) > new Date(...b.orderedOn)
                ? 1
                : -1;
            }
            return 0;
          });
      case "cashier":
      case "chef":
        return [...this.tableStatuses().values()].sort((a, b) => {
          if (a.orderedOn && b.orderedOn) {
            //@ts-expect-error
            return new Date(...a.orderedOn) > new Date(...b.orderedOn) ? 1 : -1;
          }
          return 0;
        });
    }
  });

  addFoodItemToOrder(foodItem: ProductData) {
    this.tableData.update((currentData) => {
      // Create a new map to trigger change detection
      const newData = new Map(currentData);

      if (newData.has(foodItem)) {
        newData.set(foodItem, newData.get(foodItem)! + 1);
      } else {
        // Use the rate from the passed foodItem object
        newData.set(foodItem, 1);
      }
      return newData;
    });
  }

  /** The subtotal, tax, discount, and total amounts of `this.tableData()` */
  orderPriceData = computed(() => {
    const priceData = { discount: 0, subTotal: 0, tax: 0, total: 0 };

    if (this.isCreateOrderModalOpen()) {
      this.tableData().forEach((qty, product) => {
        priceData.discount +=
          qty * this._productHelperService.getDiscount(product);
        priceData.subTotal +=
          qty * this._productHelperService.getPrice(product);
        priceData.tax += qty * this._productHelperService.getTax(product);
        priceData.total += qty * this._productHelperService.getRate(product);
      });
    } else {
      // The Cashier is viewing the order or something so default back to checking the `selectedOrder`
      this.productsInTableOrder().forEach((product) => {
        priceData.discount += this._productHelperService.getDiscount(product);
        priceData.subTotal += this._productHelperService.getPrice(product);
        priceData.tax += this._productHelperService.getTax(product);
        priceData.total += this._productHelperService.getRate(product);
      });
    }

    return priceData;
  });

  /**
   * Whenever a table's order should be edited, call this with the table status to enforce
   */
  overwriteTableOrderData(tableStatus: TableOrderStatusGET) {
    const clone = structuredClone(tableStatus);
    this._updateTableDataFromOrderGET(clone.order);
    this.setOrderNote(clone.note ?? "");
    this.orderTableNumber = this.convertStrToNum(clone.tableNumber);
  }

  setOrderNote(note: string) {
    this.orderNote.update((_) => note);
  }

  reduceFoodItemQtyInOrder(foodItem: ProductData) {
    this.tableData.update((val) => {
      if (val.has(foodItem)) {
        const orderItem = val.get(foodItem)!;

        if (orderItem - 1 <= 0) {
          val.delete(foodItem);
        } else {
          val.set(foodItem, orderItem - 1);
        }
      }

      return new Map(val);
    });
  }

  deleteTable(tableStatus: TableOrderStatusGET) {
    this._posService
      .deleteTableOrderStatusById(tableStatus.id)
      .subscribe((data) => {
        console.log("This should be null: ", data);
      });

    this.tableStatuses.update((val) => {
      val.delete(tableStatus.id);
      return new Map(val);
    });

    this.isOrderDetailsOpen = false;
  }

  proceedToOverwriteTableConflict(tableNumber: number) {
    this.isCreateOrderModalOrderExistsDialogOpen = false;
    this.isCreateOrderModalOpen.set(true);
    this.isEditingOrder = true;
    const order = this.tableStatuses().get(tableNumber)?.order;
    if (order) this._updateTableDataFromOrderGET(order);
  }

  convertStrToNum(str: string) {
    return parseFloat(str);
  }

  private _updateTableDataFromOrderGET(orderToConvert: OrderGET) {
    this.tableData.update((_) => {
      const orderItems = orderToConvert.orderItem;

      return new Map(
        orderItems.map((item) => {
          console.log("Updating table date from 'OrderGET'", item);
          return [item.product, item.quantity];
        }),
      );
    });
  }

  /** For optimistically updating the UI while the request is getting fetched. It will be deleted when the data is eventually fetched */
  private _createDummyOrder(
    id: number,
    tableNo: number,
    amountTendered: number,
    orderItems: OrderItemPOST[],
    timeStamps?: TableOrderStatusTimeStamps,
  ) {
    this.tableStatuses.update((val) => {
      val.set(id, {
        id: id,
        chefId: 0,
        completedOn: timeStamps?.completedOn
          ? dateToArray(timeStamps!.completedOn!)
          : [],
        note: "",
        orderedOn: timeStamps?.orderedOn
          ? dateToArray(timeStamps!.orderedOn!)
          : [],
        processedOn: timeStamps?.processedOn
          ? dateToArray(timeStamps!.processedOn!)
          : [],
        readyOn: timeStamps?.readyOn ? dateToArray(timeStamps!.readyOn!) : [],
        status: timeStamps?.readyOn ? "PAID" : "UNPAID",
        tableNumber: `${tableNo}`,
        waterId: 0,
        order: {
          amountTendered: amountTendered,
          branch: {},
          cashierId: 0,
          createdDate: 1,
          customer: {},
          discount: {},
          id: 0,
          orderNumber: "0",
          orderStatus: timeStamps?.readyOn ? "PAID" : "UNPAID",
          payment: {},
          tax: {},
          updatedAt: 1,
          totalAmount: amountTendered,
          orderItem: orderItems.map((orderItem) => {
            return {
              id: orderItem.id,
              product: this._productIdAndDataMap.get(orderItem.productId),
              productVariant: null,
            } as OrderItemGET;
          }),
        },
      });

      return new Map(val);
    });
  }

  /** Cleanup for `this.createDummyOrder()` */
  private _removeDummyOrder(id: number) {
    this.tableStatuses.update((val) => {
      val.delete(id);
      return new Map(val);
    });
  }

  private _getTableOrdersFromGETPayload(
    fetchedOrderItems: OrderItemGET[],
  ): TableOrder {
    return new Map(
      fetchedOrderItems.map((item) => [item.product, item.quantity]),
    );
  }

  productsInTableOrder(
    tableOrderStatus = this.selectedOrder() ?? ("" as const),
  ): ProductData[] {
    if (typeof tableOrderStatus == "string") return [];

    return tableOrderStatus.order.orderItem
      .map((orderItem) =>
        new Array<ProductData>(orderItem.quantity).fill(orderItem.product),
      )
      .flat();
  }

  getProductImage(product: ProductData) {
    return this._imageCacheService.getProductImage(product);
  }

  /** Use this if you the product data has a `selectedVariant`, and you want to access the variant's data easily for display.
   *
   * NOTE: **DO NOT SEND THE RESULT OF THIS TO THE SERVER FOR ANY REASON**
   */
  getProductData(product: ProductData) {
    return this._productHelperService.getData(product);
  }

  processPayment(
    paymentModes: Parameters<
      PaymentServiceService["processPayment"]
    >[0]["paymentModes"],
  ) {
    const products = this.productsInTableOrder();
    const { discount, subTotal, tax, total } = products.reduce<{
      discount: number;
      subTotal: number;
      tax: number;
      total: number;
    }>(
      (acc, val) => {
        const {
          discount: prevDiscount,
          subTotal: prevSubTotal,
          tax: prevTax,
          total: prevTotal,
        } = acc;

        const variantData = this._productHelperService.isVariant(val);
        const variants = variantData.isVariant
          ? variantData.variants[0]
          : undefined;

        const discount = this._productHelperService.getDiscount(val, variants);
        const tax = this._productHelperService.getTax(val, variants);
        const subtotal = this._productHelperService.getPrice(val, variants);
        const total = this._productHelperService.getRate(val, variants);

        return {
          discount: prevDiscount + discount,
          subTotal: prevSubTotal + subtotal,
          tax: prevTax + tax,
          total: prevTotal + total,
        };
      },
      { discount: 0, subTotal: 0, tax: 0, total: 0 },
    );

    this._paymentService.processPayment({
      paymentModes,
      cartItems: products,
      discount,
      subTotal,
      tax,
      total,
    });
  }
}
