import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';
import { Router } from '@angular/router';

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


  constructor(
    private topProductsService: TopProductService,
    private router: Router,
  ) {
    this.tableData = [];
  }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }

  navigateToForm(){
    this.router.navigate(['/sales/quotation/quotation-form']);
  }
  editItem(id: string) {
  }
  deleteItem(id: string) {
  }
  viewItem(id: string){
  }

}
