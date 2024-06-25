import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';
import { Router } from '@angular/router';


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
    this.router.navigate(['/sales/proformer-invoice/proformer-invoice-form']);
  }
  editItem(id: string) {
  }
  deleteItem(id: string) {
  }
  viewItem(id: string){
  }

}
