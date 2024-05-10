import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';


@Component({
  selector: 'app-proforma-invoice',
  templateUrl: './proforma-invoice.component.html',
  styleUrl: './proforma-invoice.component.scss',
  providers: [
    TopProductService
  ]
})
export class ProformaInvoiceComponent {
  tableData: any[];


  constructor(private topProductsService: TopProductService) {
    this.tableData = [];
   }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }

}
