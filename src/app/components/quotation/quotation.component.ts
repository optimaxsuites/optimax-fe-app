import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';

@Component({
  selector: 'app-quotation',
  templateUrl: './quotation.component.html',
  styleUrl: './quotation.component.scss',
  providers: [
    TopProductService
  ]
})
export class QuotationComponent {
  tableData: any[];


  constructor(private topProductsService: TopProductService) {
    this.tableData = [];
   }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }

}
