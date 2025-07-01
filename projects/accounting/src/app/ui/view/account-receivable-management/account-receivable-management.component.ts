import { Component } from '@angular/core';

@Component({
  selector: 'app-account-receivable-management',
  templateUrl: './account-receivable-management.component.html',
  styleUrl: './account-receivable-management.component.scss',
  providers: [],
})
export class AccountReceivableManagementComponent {
  tableData: any[];

  constructor() {
    this.tableData = [];
  }

  ngOnInit(): void {
    // this.tableData = this.topProductsService.initializeTopProduct();
  }
}
