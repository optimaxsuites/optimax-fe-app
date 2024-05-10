import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';


@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss',
  providers: [
    TopProductService
  ]
})
export class InvoiceComponent {

  tableData: any[];


  constructor(private topProductsService: TopProductService) {
    this.tableData = [];
   }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }
}
