import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';
import { Router } from '@angular/router';


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
    this.router.navigate(['/sales/invoice/invoice-form']);
  }
  editItem(id: string) {
  }
  deleteItem(id: string) {
  }
  viewItem(id: string){
  }
}
