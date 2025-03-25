import { Component, Input, OnInit } from '@angular/core';
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
  @Input() mode: 'waiter' | 'chef' | 'cashier' = 'chef';

  tableStatuses: TableStatus[] = [];

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
    // TODO: Get the waiter's id based on their login info
    const waiterId = '0';

    this.tableStatuses.push({
      no: tableNo,
      orderedOn: new Date(),
      orders: orders,
      status: 'Pending',
      waiterId: waiterId,
    });
  }
  createMultipleOrders(
    tableOrderList: { tableNo: number; orders: TableOrder[] }[]
  ) {
    tableOrderList.forEach((orderObject) => {
      this.createOrder(orderObject.tableNo, orderObject.orders);
    });
  }
}
