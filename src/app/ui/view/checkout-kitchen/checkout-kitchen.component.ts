import { Component, computed, Input, OnInit, signal } from "@angular/core";
import {
  BranchDTO,
  ProductCategoryDTO,
  ProductData,
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

/* `TableOrderStatus` stuff is basically all the relevant data about the customer's orders of that *table* as well as the staff who attended to that order. This `TableOrderStatus` can be broken down into a collection of orders (`Table Order`) and other date like the state of the order (UNPAID or PAID), the ids of the waiter, chef, cashier, etc. */

/** All the food ordered by a table. Each key is a food item / product and its value is simply the amount of aforementioned product */
type TableOrder = Map<ProductData, number>;

type TableOrderStatusTimeStamps = Partial<{
  orderedOn: Date;
  processedOn: Date;
  completedOn: Date;
  readyOn: Date;
}>;

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
  selectedOrder?: TableOrderStatusGET;

  /**
   * The status (and orders) of all the tables in the restaurant. It is indexed with the `id`
   */
  tableStatuses = signal<Map<number, TableOrderStatusGET>>(new Map());

  testMode = signal<typeof this.mode>("chef");

  changeTestMode(e: Event) {
    this.testMode.update(() => (e.target as HTMLInputElement).value as any);
  }
  // Replace this with the actual orders
  data = [
    { item: "Jollof Rice", qty: 1, rate: "N2,000", amount: "N2,000" },
    { item: "Chicken", qty: 2, rate: "N1,500", amount: "N3,000" },
    { item: "Chapman", qty: 1, rate: "N1,000", amount: "N1,000" },
    { item: "Cat Fish", qty: 1, rate: "N2,000", amount: "N2,000" },
  ];

  /**
   * This is a collection of all the items in an order for the currently viewed table
   */
  tableData = signal<TableOrder>(new Map());

  /** Each key is a cateogry name, e.g "Drink", "Main Meal", while each value is an array of products that has the aforementioned category */
  productCategories = new Map<string, ProductData[]>();

  currCategoryProducts: ProductData[] = [];

  productList = [
    { name: "Product A", subCategory: "Sub-Category" },
    { name: "Product B", subCategory: "Sub-Category" },
    { name: "Product C", subCategory: "Sub-Category" },
    { name: "Product D", subCategory: "Sub-Category" },
    { name: "Product E", subCategory: "Sub-Category" },
    { name: "Product F", subCategory: "Sub-Category" },
    { name: "Product G", subCategory: "Sub-Category" },
    { name: "Product H", subCategory: "Sub-Category" },
    { name: "Product I", subCategory: "Sub-Category" },
    { name: "Product A", subCategory: "Sub-Category" },
    { name: "Product B", subCategory: "Sub-Category" },
    { name: "Product C", subCategory: "Sub-Category" },
    { name: "Product D", subCategory: "Sub-Category" },
    { name: "Product E", subCategory: "Sub-Category" },
    { name: "Product F", subCategory: "Sub-Category" },
    { name: "Product G", subCategory: "Sub-Category" },
    { name: "Product H", subCategory: "Sub-Category" },
    { name: "Product I", subCategory: "Sub-Category" },
  ];

  // categoryList = ['Main Meal', 'Drinks', 'BBQ', 'Sides', 'Appetizer'];

  get mode(): "waiter" | "chef" | "cashier" {
    //TODO: Determine the mode to use from the logged in user's id. For now though, just use a toggle to change this
    return this.testMode() ?? "chef";
  }

  isReceiptModalOpen = false;
  isCreateOrderModalOpen = false;
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

  /** Indexed with the Product Data's id and the value is the url */
  productImgMap = new Map<number, string>();

  isPaymentModalOpen = false;

  constructor(
    private posService: PosServiceService,
    private checkoutService: CheckoutService,
    private imageCacheService: ImageCacheService,
  ) {}

  ngOnInit() {
    (async () => {
      // Fetch the table statuses.
      // TODO: Implement a skeleton loader while these are getting fetched
      this.posService.getTableOrderStatuses().subscribe(async (data) => {
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
        this.posService.getBranches(),
      );

      const fetchedProducts: ProductData[] = await lastValueFrom(
        this.posService.getProducts(),
      );

      fetchedProducts.forEach((fetchedProduct) => {
        const category = fetchedProduct.productCategory.name;

        if (this.productCategories.has(category)) {
          this.productCategories.get(category)!.push(fetchedProduct);
        } else {
          this.productCategories.set(category, [fetchedProduct]);
        }
        this._productIdAndDataMap.set(fetchedProduct.id, fetchedProduct);

        // Cache product images
        const remoteImageUrl = `https://be.optimaxsuites.com/x/api/v2/pos/products/images/${fetchedProduct.productImages[0].imgNo}`;
        this.imageCacheService.getImage(remoteImageUrl).subscribe((url) => {
          this.productImgMap.set(fetchedProduct.id, url);
        });
      });
      this.currCategoryProducts =
        this.productCategories.values().next().value ?? [];
    })();
  }

  openOrderDetails(table: TableOrderStatusGET) {
    // When a table-card is clicked, set the order details
    this.selectedOrder = table;
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

    if (isTableNumberUsed && !overwrite) {
      this.isCreateOrderModalOrderExistsDialogOpen = true;
      return false;
    } else {
      const creationDate = new Date().toISOString();

      const orderItems: OrderItemPOST[] = [];
      let amountTendered = 0;

      orders.forEach((qty, order) => {
        const totalPrice = qty * parseInt(order.sellingPrice ?? "1");

        amountTendered += totalPrice;
        orderItems.push({
          id: 0,
          orderId: null,
          productId: order.id,
          productVariantId: null,
          quantity: qty,
          totalPrice: qty * parseInt(order.sellingPrice ?? "1"),
        });
      });

      if (overwrite) {
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
        this.checkoutService.saveOrder({
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
        this.posService.addTableOrderStatus({
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
        this.posService.getTableOrderStatusById(uploadedTableOrderStatus.id),
      );

      // delete the dummy product and replace it
      this._removeDummyOrder(this._dummyTableOrderStatus);

      if (actualTableOrderStatus.status == "PAID") {
        // Get rid of the table. This is done here since I can be sure that the seperate order is already created
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
      parseInt(tableOrderStatus.tableNumber),
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

  orderSubTotal = computed(() => {
    let subTotal = 0;
    // Read the signal's value
    this.tableData().forEach((qty, product) => {
      subTotal += qty * parseInt(product.sellingPrice ?? "1");
    });
    return subTotal;
  });

  /**
   * Whenever a table's order should be edited, call this with the table status to enforce
   */
  overwriteTableOrderData(tableStatus: TableOrderStatusGET) {
    const clone = structuredClone(tableStatus);
    this.updateTableDataFromOrderGET(clone.order);
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

      return val;
    });
  }

  deleteTable(tableStatus: TableOrderStatusGET) {
    this.posService
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
    this.isCreateOrderModalOpen = true;
    this.isEditingOrder = true;
    const order = this.tableStatuses().get(tableNumber)?.order;
    if (order) this.updateTableDataFromOrderGET(order);
  }

  convertStrToNum(str: string) {
    return parseInt(str);
  }

  private updateTableDataFromOrderGET(orderToConvert: OrderGET) {
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
        status: "UNPAID",
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
          orderStatus: "UNPAID",
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
    tableOrderStatus = this.selectedOrder ?? ("" as const),
  ): ProductData[] {
    if (typeof tableOrderStatus == "string") return [];

    return tableOrderStatus.order.orderItem.map(
      (orderItem) => orderItem.product,
    );
  }
}
