import { Component } from '@angular/core';
// import { TopProductService } from 'src/app/ui/dashboard/service/top-product/top-product.service';
@Component({
  selector: 'app-budgeting-forecasting',
  templateUrl: './budgeting-forecasting.component.html',
  styleUrl: './budgeting-forecasting.component.scss',
  providers: [],
})
export class BudgetingForecastingComponent {
  tableData: any[];

  constructor() {
    this.tableData = [];
  }

  ngOnInit(): void {
    // this.tableData = this.topProductsService.initializeTopProduct();
  }
}
