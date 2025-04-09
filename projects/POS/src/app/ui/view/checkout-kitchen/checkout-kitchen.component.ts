import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { ProductData } from '../../models/interface';

interface TableStatus {
  /**
   * Table number
   */
  no: number;
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
  waiterId: string;
  /**
   * To determine the prority of the order.
   *
   */
  orderedOn: Date;
  /**
   * An array of all the meals / drinks / whatever that were ordered
   */
  orders: TableOrder[];
}
type TableOrder = { foodItem: ProductData; amount: number };

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
  selectedOrder?: TableStatus; // store the order/card clicked

  #tableStatuses = signal<Map<number, TableStatus>>(new Map());

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
  // --- MODIFIED: Convert tableData to a signal ---
  tableData = signal<Map<string, OrderItem>>(new Map());

  // --- MODIFIED: Updated productCategories structure ---
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
    {
      name: 'Beverages',
      subCategories: [
        { name: 'Espresso', rate: 800 },
        { name: 'Latte', rate: 1000 },
        { name: 'Green Tea', rate: 600 },
        { name: 'Iced Tea', rate: 700 },
        { name: 'Orange Juice', rate: 900 },
        { name: 'Apple Juice', rate: 900 },
        { name: 'Milkshake (Vanilla)', rate: 1200 },
        { name: 'Bottled Water', rate: 500 },
        { name: 'Coca-Cola', rate: 600 },
        { name: 'Sprite', rate: 600 },
        { name: 'Energy Drink (Red Bull)', rate: 1500 },
        { name: 'Smoothie (Mango)', rate: 1300 },
        { name: 'Chapman', rate: 1000 },
        { name: 'Zobo Drink', rate: 700 },
      ],
    },
    {
      name: 'BBQ',
      subCategories: [
        { name: 'BBQ Chicken Wings', rate: 2500 },
        { name: 'BBQ Pork Ribs', rate: 3500 },
        { name: 'Grilled Corn', rate: 800 },
        { name: 'Beef Suya', rate: 2000 },
      ],
    },
    {
      name: 'Special',
      subCategories: [
        { name: "Chef's Special Pasta", rate: 2800 },
        { name: 'Seafood Platter', rate: 4500 },
        { name: 'Lamb Chops', rate: 4000 },
        { name: 'Special Fried Rice', rate: 2200 },
        { name: 'House Special Cocktail', rate: 1800 },
        { name: 'Weekend Brunch Special', rate: 3000 },
        { name: 'Daily Soup Special', rate: 1000 },
      ],
    },
    {
      name: 'Appetizer',
      subCategories: [
        { name: 'Spring Rolls', rate: 900 },
        { name: 'Samosa', rate: 900 },
        { name: 'Peppered Snails', rate: 3000 },
        { name: 'Gizzard Stir-fry', rate: 1500 },
        { name: 'Bruschetta', rate: 1200 },
      ],
    },
  ] as const;

  selectedSubCategories: Readonly<SubCategoryItem[]> =
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

  ngOnInit(): void {
    switch (this.mode) {
      case 'waiter':
      // Show all created orders from the waiter that have not yet been completed. Also add a button for creating orders too
      case 'chef':
        // Show all pending orders

        // Sample data
        this.createMultipleOrders([
          { tableNo: 21, orders: [] },
          { tableNo: 22, orders: [] },
          { tableNo: 23, orders: [] },
          { tableNo: 24, orders: [] },
          { tableNo: 25, orders: [] },
          { tableNo: 26, orders: [] },
          { tableNo: 27, orders: [] },
          { tableNo: 28, orders: [] },
          { tableNo: 29, orders: [] },
          { tableNo: 30, orders: [] },
          { tableNo: 31, orders: [] },
          { tableNo: 32, orders: [] },
          { tableNo: 33, orders: [] },
          { tableNo: 34, orders: [] },
          { tableNo: 35, orders: [] },
          { tableNo: 36, orders: [] },
          { tableNo: 37, orders: [] },
          { tableNo: 38, orders: [] },
          { tableNo: 39, orders: [] },
          { tableNo: 40, orders: [] },
          { tableNo: 41, orders: [] },
          { tableNo: 42, orders: [] },
          { tableNo: 43, orders: [] },
          { tableNo: 44, orders: [] },
          { tableNo: 45, orders: [] },
          { tableNo: 46, orders: [] },
          { tableNo: 47, orders: [] },
          { tableNo: 48, orders: [] },
          { tableNo: 49, orders: [] },
          { tableNo: 50, orders: [] },
        ]);
        break;
      case 'cashier':
      // Show all processing and ready orders
    }
  }

  openOrderDetails(table: TableStatus) {
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
    orders: TableOrder[],
    waiterIdd?: string,
    overwrite = false
  ) {
    const ids = ['0', '1'];
    // TODO: Get the waiter's id based on their login info
    const waiterId =
      waiterIdd ?? ids[Math.round(Math.random() * 100) % ids.length];

    if (this.#tableStatuses().has(tableNo) && !overwrite) return false;
    else {
      // update the signal by creating a new map
      this.#tableStatuses.update(
        (statuses) =>
          new Map(
            statuses.set(tableNo, {
              no: tableNo,
              orderedOn: new Date(),
              orders,
              status: 'Pending',
              waiterId,
            })
          )
      );

      return true;
    }
  }
  createMultipleOrders(
    tableOrderList: { tableNo: number; orders: TableOrder[] }[]
  ) {
    tableOrderList.forEach((orderObject) => {
      this.createOrder(orderObject.tableNo, orderObject.orders);
    });
  }
  toggleOrderStatus(tableOrder: TableStatus) {
    switch (tableOrder.status) {
      case 'Pending':
        tableOrder.status = 'Processing';
        break;
      case 'Processing':
        tableOrder.status = 'Ready';
        break;
      case 'Ready':
      //TODO: Get rid of the table order
    }
  }
  displayedTableStatuses = computed(() => {
    switch (this.testMode()) {
      case 'waiter':
        // TODO: Use the waiter's id as a comparison here
        return [...this.#tableStatuses().values()].filter(
          (tableStatus) => tableStatus.waiterId == '0'
        );
      case 'cashier':
      case 'chef':
        return [...this.#tableStatuses().values()];
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

  // selectCategory(categoryIndex: number) {
  //   if (categoryIndex >= 0 && categoryIndex < this.productCategories.length) {
  //     this.selectedSubCategories =
  //       this.productCategories[categoryIndex].subCategories;
  //   }
  // }
}
