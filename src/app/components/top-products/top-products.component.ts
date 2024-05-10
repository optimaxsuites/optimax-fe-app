import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';



@Component({
  selector: 'app-top-products',
  templateUrl: './top-products.component.html',
  styleUrls: ['./top-products.component.scss'],
  providers: [
    TopProductService
  ]
})
export class TopProductsComponent {
  tableData: any[];


  constructor(private topProductsService: TopProductService) {
    this.tableData = [];
   }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }


}
