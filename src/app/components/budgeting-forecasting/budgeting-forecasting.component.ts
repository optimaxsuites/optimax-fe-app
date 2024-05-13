import { Component } from '@angular/core';
import { TopProductService } from '../../services/top-product/top-product.service';

@Component({
  selector: 'app-budgeting-forecasting',
  templateUrl: './budgeting-forecasting.component.html',
  styleUrl: './budgeting-forecasting.component.scss',
  providers: [TopProductService],
})
export class BudgetingForecastingComponent {
  tableData: any[];

  constructor(private topProductsService: TopProductService) {
    this.tableData = [];
  }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }
}
