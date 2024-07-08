import { Component } from '@angular/core';
import { TopProductService } from 'src/app/ui/dashboard/service/top-product/top-product.service';

@Component({
  selector: 'app-account-receivable-management',
  templateUrl: './account-receivable-management.component.html',
  styleUrl: './account-receivable-management.component.scss',
  providers: [TopProductService],
})
export class AccountReceivableManagementComponent {
  tableData: any[];

  constructor(private topProductsService: TopProductService) {
    this.tableData = [];
  }

  ngOnInit(): void {
    this.tableData = this.topProductsService.initializeTopProduct();
  }
}
