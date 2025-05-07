import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { ProductCategoryDTO, ProductData } from '../../models/interface';
import { PosServiceService } from '../../service/pos-service.service';
import { lastValueFrom } from 'rxjs';

/**
 * Data Transfer Object representing the status of a table order.
 */
export interface TableOrderStatusDTO {
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
  status: 'PAID' | 'UNPAID';

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
   * @type {string}
   * @format date-time
   */
  orderedOn: string;

  /**
   * Timestamp when the order began processing.
   * @type {string}
   * @format date-time
   */
  processedOn: string;

  /**
   * Timestamp when the order was ready.
   * @type {string}
   * @format date-time
   */
  readyOn: string;

  /**
   * Timestamp when the order was completed.
   * @type {string}
   * @format date-time
   */
  completedOn: string;

  /**
   * Optional note attached to the order.
   * @type {string}
   * @minLength 0
   * @maxLength 255
   */
  note: string;

  /**
   * Identifiers of the items in this order.
   * @type {Array<number>}
   */
  orderItemsId: number[];
}

interface TableOrderStatusNEW extends TableOrderStatusDTO {
  orders: TableOrder;
}

interface TableStatus {
  /**
   * Table number
   */
  tableNumber: number;
  /**
   * `Ready`: Order has been completed. All that's left is to take the prepared meal to the customer.
   *
   * `Processing`: Order is currently being prepared by the kitchen.
   *
   * `Pending`: Order has been taken by the waiter and is waiting to be prepared by the kitchen.
   */
  status: 'Ready' | 'Processing' | 'Pending';
  /**
   * To know the waiter that took / created this order
   */
  waterId: string;
  /**
   * To determine the prority of the order.
   *
   */
  orderedOn: string;
  /**
   * A collection of all the meals / drinks / whatever that were ordered
   */
  orders: TableOrder;
  /**
   * Extra details about the order
   */
  note?: string;
}
// type TableOrder = { foodItem: ProductData; amount: number };
/**
 * A collection of all the items in an order
 */
type TableOrder = Map<string, OrderItem>;

interface OrderItem {
  qty: number;
  rate: number;
}

interface SubCategoryItem {
  name: string;
  rate: number;
}

@Component({
  selector: 'app-checkout-kitchen',
  templateUrl: './checkout-kitchen.component.html',
  styleUrls: ['./checkout-kitchen.component.scss'],
})
// Used for both the cashier and kitchen
export class CheckoutKitchenComponent implements OnInit {
  /** The table number that is set by the waiter when creating a new order */
  orderTableNumber = 1;
  isOrderDetailsOpen = false;
  /*
   *the order/card clicked
   */
  selectedOrder?: TableOrderStatusNEW;

  /**
   * The status (and orders) of all the tables in the restaurant. It is indexed with te table number
   */
  tableStatuses = signal<Map<number, TableOrderStatusNEW>>(new Map());

  testMode = signal<typeof this.mode>('chef');

  changeTestMode(e: Event) {
    this.testMode.update(() => (e.target as HTMLInputElement).value as any);
  }
  // Replace this with the actual orders
  data = [
    { item: 'Jollof Rice', qty: 1, rate: 'N2,000', amount: 'N2,000' },
    { item: 'Chicken', qty: 2, rate: 'N1,500', amount: 'N3,000' },
    { item: 'Chapman', qty: 1, rate: 'N1,000', amount: 'N1,000' },
    { item: 'Cat Fish', qty: 1, rate: 'N2,000', amount: 'N2,000' },
  ];

  /**
   * This is a collection of all the items in an order for a particular table
   */
  tableData = signal<Map<string, OrderItem>>(new Map());

  // Dummy data
  productCategories = [
    {
      name: 'Food',
      subCategories: [
        { name: 'Chicken', rate: 1500 },
        { name: 'Beef', rate: 1800 },
        { name: 'Pork', rate: 1700 },
        { name: 'Fish (Tilapia)', rate: 2000 },
        { name: 'Fish (Catfish)', rate: 2200 },
        { name: 'Vegetable Stir-fry', rate: 1200 },
        { name: 'Fruit Salad', rate: 800 },
        { name: 'Mixed Nuts', rate: 600 },
        { name: 'Egusi Soup', rate: 1300 },
        { name: 'Vegetable Soup', rate: 1100 },
        { name: 'Caesar Salad', rate: 1400 },
        { name: 'Club Sandwich', rate: 1600 },
        { name: 'Chocolate Cake Slice', rate: 900 },
        { name: 'French Fries', rate: 700 },
        { name: 'Plantain (Fried)', rate: 500 },
      ],
    },
  ];

  selectedSubCategories: SubCategoryItem[] =
    this.productCategories[0].subCategories;

  productList = [
    { name: 'Product A', subCategory: 'Sub-Category' },
    { name: 'Product B', subCategory: 'Sub-Category' },
    { name: 'Product C', subCategory: 'Sub-Category' },
    { name: 'Product D', subCategory: 'Sub-Category' },
    { name: 'Product E', subCategory: 'Sub-Category' },
    { name: 'Product F', subCategory: 'Sub-Category' },
    { name: 'Product G', subCategory: 'Sub-Category' },
    { name: 'Product H', subCategory: 'Sub-Category' },
    { name: 'Product I', subCategory: 'Sub-Category' },
    { name: 'Product A', subCategory: 'Sub-Category' },
    { name: 'Product B', subCategory: 'Sub-Category' },
    { name: 'Product C', subCategory: 'Sub-Category' },
    { name: 'Product D', subCategory: 'Sub-Category' },
    { name: 'Product E', subCategory: 'Sub-Category' },
    { name: 'Product F', subCategory: 'Sub-Category' },
    { name: 'Product G', subCategory: 'Sub-Category' },
    { name: 'Product H', subCategory: 'Sub-Category' },
    { name: 'Product I', subCategory: 'Sub-Category' },
  ];

  // categoryList = ['Main Meal', 'Drinks', 'BBQ', 'Sides', 'Appetizer'];

  get mode(): 'waiter' | 'chef' | 'cashier' {
    //TODO: Determine the mode to use from the logged in user's id. For now though, just use a toggle to change this
    return this.testMode() ?? 'chef';
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
  orderNote = signal('');

  /**
   * Used to keep track of all the products and their ids
   */
  private productNameAndIdMap = new Map<string, number>();

  constructor(private posService: PosServiceService) {}

  ngOnInit() {
    (async () => {
      const fetchedProducts: ProductData[] = await lastValueFrom(
        this.posService.getProducts()
      );

      let a = new Map<string, { name: string; rate: number }[]>();
      fetchedProducts.forEach((d) => {
        const category = d.productCategory.name;

        if (!a.has(category)) {
          a.set(category, [
            { name: d.name, rate: parseInt(d.sellingPrice ?? '0') },
          ]);
        } else {
          const b = a.get(category)!;
          // Dedupe by name
          if (b.find((x) => x.name === d.name)) {
            return;
          }
          b.push({ name: d.name, rate: parseInt(d.sellingPrice ?? '0') });
          a.set(category, b);
        }
        this.productNameAndIdMap.set(d.name, d.id);
      });
      // Overwrite the categories
      this.productCategories = [...a.entries()].map(
        ([category, subCategories]) => {
          return { name: category, subCategories };
        }
      );
      this.selectedSubCategories = this.productCategories[0].subCategories;

      // Fetch the table statuses

      // FIXME: CHange this once the API is alright
      this.tableStatuses.update((_) => {
        const parsedMap = new Map<number, TableOrderStatusNEW>(
          JSON.parse(localStorage.getItem('tableStatuses') ?? '[]')
        );
        parsedMap.forEach((tableOrderStatus) => {
          tableOrderStatus.orderItemsId.forEach((id) => {
            const originProduct = fetchedProducts.find((p) => p.id == id);

            if (originProduct) {
              // Be sure that this is a map
              if (!tableOrderStatus.orders?.size)
                tableOrderStatus.orders = new Map();

              if (!tableOrderStatus.orders.has(originProduct.name)) {
                tableOrderStatus.orders.set(originProduct.name, {
                  qty: 1,
                  rate: parseInt(originProduct.sellingPrice ?? '1'),
                });
              } else {
                tableOrderStatus.orders.set(originProduct.name, {
                  qty:
                    (tableOrderStatus.orders.get(originProduct.name)?.qty ??
                      0) + 1,
                  rate: parseInt(originProduct.sellingPrice ?? '1'),
                });
              }
            }
          });
        });

        return parsedMap;
      });
      // const fetchedTableOrderStatuses = await lastValueFrom(
      //   this.posService.getTableOrderStatuses()
      // );
      // console.log(fetchedTableOrderStatuses);
      // this.tableStatuses.update(_=>{
      //   const parsedMap = new Map<number, TableOrderStatusNEW>();
      //   fetchedTableOrderStatuses.forEach(d=>{
      //     const parsedTableOrder = new Map<string, TableOrder>()

      //     d.orderItemsId.forEach(itemId=>{
      //       const originProduct = fetchedProducts.find(p=>p.id == itemId)

      //       if (originProduct){
      //         parsedTableOrder.set(originProduct.name,)
      //       }
      //     })
      //   })

      //   return parsedMap
      // })
    })();

    // switch (this.mode) {
    //   case 'waiter':
    //   // Show all created orders from the waiter that have not yet been completed. Also add a button for creating orders too
    //   case 'chef':
    //     // Show all pending orders

    //     // Sample data
    //     this.createMultipleOrders([
    //       { tableNo: 21 },
    //       { tableNo: 22 },
    //       { tableNo: 23 },
    //       { tableNo: 24 },
    //       { tableNo: 25 },
    //       { tableNo: 26 },
    //       { tableNo: 27 },
    //       { tableNo: 28 },
    //       { tableNo: 29 },
    //       { tableNo: 30 },
    //       { tableNo: 31 },
    //       { tableNo: 32 },
    //       { tableNo: 33 },
    //       { tableNo: 34 },
    //       { tableNo: 35 },
    //       { tableNo: 36 },
    //       { tableNo: 37 },
    //       { tableNo: 38 },
    //       { tableNo: 39 },
    //       { tableNo: 40 },
    //       { tableNo: 41 },
    //       { tableNo: 42 },
    //       { tableNo: 43 },
    //       { tableNo: 44 },
    //       { tableNo: 45 },
    //       { tableNo: 46 },
    //       { tableNo: 47 },
    //       { tableNo: 48 },
    //       { tableNo: 49 },
    //       { tableNo: 50 },
    //     ]);
    //     break;
    //   case 'cashier':
    //   // Show all processing and ready orders
    // }
  }

  openOrderDetails(table: TableOrderStatusNEW) {
    // When a table-card is clicked, set the order details
    this.selectedOrder = table;
    this.isOrderDetailsOpen = true;
  }

  getStatusSeverity(status: any) {
    return 'success' as const;
  }

  /**
   * @param tableNo
   * @param orders
   * @param waiterIdd - Dummy. I'll get rid of it later
   * @param overwrite - If true, then the order will be overwritten if it already exists
   * @returns `true` if an order is added succesfully, otherwise `false` if an order already exists
   */
  createOrder(
    tableNo: number,
    orders: TableOrder,
    waiterIdd?: string,
    note?: string,
    overwrite = false
  ) {
    const ids = ['0', '1'];
    // TODO: Get the waiter's id based on their login info
    const waiterId =
      waiterIdd ?? ids[Math.round(Math.random() * 100) % ids.length];

    if (this.tableStatuses().has(tableNo) && !overwrite) return false;
    else {
      const creationDate = new Date().toISOString();
      const orderItemIds = [...orders.keys()]
        .map((prodName) => {
          if (orders.get(prodName)!.qty > 1) {
            const arr: number[] = [];
            arr.length = orders.get(prodName)!.qty;
            arr.fill(this.productNameAndIdMap.get(prodName)!);
            return arr;
          } else {
            return this.productNameAndIdMap.get(prodName)!;
          }
        })
        .flat();
      // update the signal by creating a new map
      this.tableStatuses.update(
        (statuses) =>
          new Map(
            statuses.set(tableNo, {
              id: tableNo,
              tableNumber: tableNo.toString(),
              orderedOn: creationDate,
              processedOn: '',
              completedOn: '',
              readyOn: '',
              orders: structuredClone(orders),
              orderItemsId: orderItemIds,
              status: 'UNPAID',
              note: note ?? '',
              waterId: parseInt(waiterId),
              // FIXME: Get the actual Chef Id
              chefId: parseInt(waiterId),
            })
          )
      );

      // SECTION: Push to backend
      // Convert our data to a format that can be sent to the backend
      const newTableStatus = this.tableStatuses().get(tableNo)!;
      const tableOrderStatusDTO: TableOrderStatusDTO = {
        id: newTableStatus.id,
        tableNumber: newTableStatus.tableNumber,
        status: newTableStatus.status,
        waterId: newTableStatus.waterId,
        chefId: newTableStatus.chefId,
        orderedOn: newTableStatus.orderedOn,
        processedOn: newTableStatus.processedOn,
        readyOn: newTableStatus.readyOn,
        completedOn: newTableStatus.completedOn,
        note: newTableStatus.note,
        orderItemsId: newTableStatus.orderItemsId,
      };

      this.posService.addTableOrderStatus(tableOrderStatusDTO);
      console.log(JSON.stringify(tableOrderStatusDTO));

      // this.posService.addTableOrderStatus()
      localStorage.setItem(
        'tableStatuses',
        JSON.stringify([...this.tableStatuses()])
      );
      // !SECTION

      return true;
    }
  }
  createMultipleOrders(
    tableOrderList: { tableNo: number; orders?: TableOrder }[]
  ) {
    tableOrderList.forEach((orderObject) => {
      this.createOrder(orderObject.tableNo, orderObject.orders ?? new Map());
    });
  }
  toggleOrderStatus(tableOrder: TableOrderStatusNEW) {
    if (!tableOrder.processedOn) {
      tableOrder.processedOn = new Date().toISOString();
    } else if (!tableOrder.completedOn) {
      tableOrder.completedOn = new Date().toISOString();
    } else if (!tableOrder.readyOn) {
      tableOrder.readyOn = new Date().toISOString();
      tableOrder.status = 'PAID';
      //TODO: Get rid of the table order
    }
    // switch (tableOrder.status) {
    //   case 'Pending':
    //     tableOrder.status = 'Processing';
    //     break;
    //   case 'Processing':
    //     tableOrder.status = 'Ready';
    //     break;
    //   case 'Ready':
    //   //TODO: Get rid of the table order
    // }
  }
  displayedTableStatuses = computed(() => {
    switch (this.testMode()) {
      case 'waiter':
        // TODO: Use the waiter's id as a comparison here
        return [...this.tableStatuses().values()].filter(
          (tableStatus) => tableStatus.waterId == 0
        );
      case 'cashier':
      case 'chef':
        return [...this.tableStatuses().values()];
    }
  });

  addFoodItemToOrder(foodItem: SubCategoryItem) {
    this.tableData.update((currentData) => {
      const newData = new Map(currentData); // Create a new map to trigger change detection
      if (newData.has(foodItem.name)) {
        const currentItem = newData.get(foodItem.name)!;
        newData.set(foodItem.name, {
          qty: currentItem.qty + 1,
          rate: currentItem.rate, // Keep the original rate when incrementing
        });
      } else {
        // Use the rate from the passed foodItem object
        newData.set(foodItem.name, { qty: 1, rate: foodItem.rate });
      }
      return newData;
    });
  }

  orderSubTotal = computed(() => {
    let subTotal = 0;
    // Read the signal's value
    this.tableData().forEach((val) => {
      subTotal += val.qty * val.rate;
    });
    return subTotal;
  });

  /**
   * Whenever a table's order should be edited, call this with the table status to enforce
   */
  overwriteTableOrderData(tableStatus: TableOrderStatusNEW) {
    const clone = structuredClone(tableStatus);
    this.tableData.update((_) => {
      return clone.orders;
    });
    this.setOrderNote(clone.note ?? '');
    this.orderTableNumber = this.convertStrToNum(clone.tableNumber);
  }

  setOrderNote(note: string) {
    this.orderNote.update((_) => note);
  }

  reduceFoodItemQtyInOrder(key: string) {
    this.tableData.update((val) => {
      if (val.has(key)) {
        const orderItem = val.get(key)!;

        orderItem.qty--;
        if (orderItem.qty <= 0) {
          val.delete(key);
        }
      }

      return val;
    });
  }

  deleteTable(tableStatus: TableOrderStatusNEW) {
    this.tableStatuses.update((val) => {
      val.delete(this.convertStrToNum(tableStatus.tableNumber));

      return new Map(val);
    });

    localStorage.setItem(
      'tableStatuses',
      JSON.stringify([...this.tableStatuses()])
    );
  }

  proceedToOverwriteTableConflict(tableNumber: number) {
    this.isCreateOrderModalOrderExistsDialogOpen = false;
    this.isCreateOrderModalOpen = true;
    this.isEditingOrder = true;
    this.tableData.update((_) => {
      return (
        structuredClone(this.tableStatuses().get(tableNumber)?.orders) ??
        new Map()
      );
    });
  }

  convertStrToNum(str: string) {
    return parseInt(str);
  }
}
