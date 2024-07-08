import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TopProductService } from 'src/app/ui/dashboard/service/top-product/top-product.service';


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
