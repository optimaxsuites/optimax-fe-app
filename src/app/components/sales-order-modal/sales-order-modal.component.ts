import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';

@Component({
  selector: 'app-sales-order-modal',
  templateUrl: './sales-order-modal.component.html',
  styleUrl: './sales-order-modal.component.scss',
  providers: [TopProductService],
})
export class SalesOrderModalComponent {
  tableData: any[];

  constructor(private topProductsService: TopProductService) {
    this.tableData = [];
  }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }
}
