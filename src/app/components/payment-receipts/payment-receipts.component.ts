import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';

@Component({
  selector: 'app-payment-receipts',
  templateUrl: './payment-receipts.component.html',
  styleUrl: './payment-receipts.component.scss',
  providers: [TopProductService],
})
export class PaymentReceiptsComponent {
  tableData: any[];

  constructor(private topProductsService: TopProductService) {
    this.tableData = [];
  }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }
}
