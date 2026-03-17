import { Component } from '@angular/core';
@Component({
  selector: 'app-payment-receipts',
  templateUrl: './payment-receipts.component.html',
  styleUrl: './payment-receipts.component.scss',
  providers: [],
})
export class PaymentReceiptsComponent {
  tableData: any[];

  constructor() {
    this.tableData = [];
  }

  ngOnInit(): void {
  }
}
