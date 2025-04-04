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
@Component({
  selector: 'app-checkout-kitchen',
  templateUrl: './checkout-kitchen.component.html',
  styleUrls: ['./checkout-kitchen.component.scss'],
})
// Used for both the cashier and kitchen
export class CheckoutKitchenComponent implements OnInit {
  isOrderDetailsOpen = false;
  selectedOrder?: TableStatus; // store the order/card clicked

  #tableStatuses = signal<TableStatus[]>([]);

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

  categoryList = ['Main Meal', 'Drinks', 'BBQ', 'Sides', 'Appetizer'];

  get mode(): 'waiter' | 'chef' | 'cashier' {
    //TODO: Determine the mode to use from the logged in user's id. For now though, just use a toggle to change this
    return this.testMode() ?? 'chef';
  }

  isReceiptModalOpen = false;
  isCreateOrderModalOpen = false;

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

  createOrder(tableNo: number, orders: TableOrder[]) {
    const ids = ['0', '1'];
    // TODO: Get the waiter's id based on their login info
    const waiterId = ids[Math.round(Math.random() * 100) % ids.length];

    // update the signal by creating a new array
    this.#tableStatuses.update((statuses) => [
      ...statuses,
      {
        no: tableNo,
        orderedOn: new Date(),
        orders,
        status: 'Pending',
        waiterId,
      },
    ]);
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
        return this.#tableStatuses().filter(
          (tableStatus) => tableStatus.waiterId == '0'
        );
      case 'cashier':
      case 'chef':
        return this.#tableStatuses();
    }
  });
}
