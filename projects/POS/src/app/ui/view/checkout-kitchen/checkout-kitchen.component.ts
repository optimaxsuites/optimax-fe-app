import { Component } from '@angular/core';

@Component({
  selector: 'app-checkout-kitchen',
  templateUrl: './checkout-kitchen.component.html',
  styleUrls: ['./checkout-kitchen.component.scss'],
})
// Used for both the cahsier and kitchen
export class CheckoutKitchenComponent {
  isOrderDetailsOpen = false;
  selectedOrder: any = null; // store the order/card clicked

  // Sample data
  tableStatuses = [
    { status: 'Ready', table: 'Table 21' },
    { status: 'Processing', table: 'Table 22' },
    { status: 'Pending', table: 'Table 23' },
    { status: 'Pending', table: 'Table 24' },
    { status: 'Pending', table: 'Table 25' },
    { status: 'Pending', table: 'Table 26' },
    { status: 'Pending', table: 'Table 27' },
    { status: 'Pending', table: 'Table 28' },
    { status: 'Pending', table: 'Table 29' },
    { status: 'Pending', table: 'Table 30' },
    { status: 'Pending', table: 'Table 31' },
    { status: 'Pending', table: 'Table 32' },
    { status: 'Pending', table: 'Table 33' },
    { status: 'Pending', table: 'Table 34' },
    { status: 'Pending', table: 'Table 35' },
    { status: 'Pending', table: 'Table 36' },
    { status: 'Pending', table: 'Table 37' },
    { status: 'Pending', table: 'Table 38' },
    { status: 'Pending', table: 'Table 39' },
    { status: 'Pending', table: 'Table 40' },
    { status: 'Pending', table: 'Table 41' },
    { status: 'Pending', table: 'Table 42' },
    { status: 'Pending', table: 'Table 43' },
    { status: 'Pending', table: 'Table 44' },
    { status: 'Pending', table: 'Table 45' },
    { status: 'Pending', table: 'Table 46' },
    { status: 'Pending', table: 'Table 47' },
    { status: 'Pending', table: 'Table 48' },
    { status: 'Pending', table: 'Table 49' },
    { status: 'Pending', table: 'Table 50' },
  ];

  openOrderDetails(item: any) {
    // When a table-card is clicked, set the order details
    this.selectedOrder = item;
    this.isOrderDetailsOpen = true;
  }

  getStatusSeverity(status: any) {
    return 'success' as const;
  }
}
