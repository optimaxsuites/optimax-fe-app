import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TopProductService } from 'src/app/ui/dashboard/service/top-product/top-product.service';

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
