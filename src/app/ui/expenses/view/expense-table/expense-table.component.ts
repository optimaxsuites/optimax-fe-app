// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-expense-table',
//   templateUrl: './expense-table.component.html',
//   styleUrl: './expense-table.component.scss'
// })
// export class ExpenseTableComponent {

// }

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TopProductService } from 'src/app/ui/dashboard/service/top-product/top-product.service';
import { InventoryService } from 'src/app/ui/inventory/service/inventory/inventory.service';
import { QuotationService } from 'src/app/ui/sales/service/quotation/quotation.service';

@Component({
  selector: 'app-expense-table',
  templateUrl: './expense-table.component.html',
  styleUrl: './expense-table.component.scss',
  providers: [TopProductService, ConfirmationService, MessageService],
})
export class ExpenseTableComponent implements OnInit {
deleteSelectedItems() {
throw new Error('Method not implemented.');
}
  visible: boolean = false;
  position: any = '';

  constructor(
    private quotationService: QuotationService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {}

  getSeverity(status: string) {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'inactive':
        return 'danger';
      default:
        return undefined; // or another default value
    }
  }

  navigateToForm() {
    this.router.navigate(['/sales/quotation/quotation-form']);
  }
  editItem(id: string) {
    this.router.navigate(['/sales/quotation/quotation-form', id]);
  }

  deleteItem(id: string) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this product?',
      header: 'Confirmation',
      acceptIcon: 'pi pi-check m-2',
      rejectIcon: 'pi pi-times m-2',
      rejectButtonStyleClass: 'p-button-sm m-2',
      acceptButtonStyleClass: 'p-button-outlined p-button-sm m-2',
      accept: () => {
        this.quotationService.deleteItem(id);
        this.messageService.add({
          severity: 'success',
          summary: 'Successful',
          detail: 'Product Deleted',
          life: 3000,
        });
      },
      reject: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Unsuccessful',
          detail: 'Product not Deleted',
          life: 3000,
        });
      },
    });
  }
  // viewItem(item: any) {
  //   this.showDialog(item, 'right');
  // }

  // showDialog(item: QuotationData, position: string = 'right'): void {
  //   this.selectedItem = item;
  //   this.position = position;
  //   this.visible = true;
  // }

  // deleteSelectedItems() {
  //   this.confirmationService.confirm({
  //     header: 'Confirmation',
  //     message: 'Are you sure you want to delete the selected product(s)?',
  //     acceptIcon: 'pi pi-check m-2',
  //     rejectIcon: 'pi pi-times m-2',
  //     rejectButtonStyleClass: 'p-button-sm m-2',
  //     acceptButtonStyleClass: 'p-button-outlined p-button-sm m-2',
  //     accept: () => {
  //       this.quotationData = this.quotationData.filter(
  //         (val) => !this.selectedItems?.includes(val)
  //       );
  //       this.selectedItems = [];
  //       this.messageService.add({
  //         severity: 'success',
  //         summary: 'Successful',
  //         detail: 'Product(s) Deleted',
  //         life: 3000,
  //       });
  //     },
  //     reject: () => {
  //       this.messageService.add({
  //         severity: 'error',
  //         summary: 'Unsuccessful',
  //         detail: 'Product(s) not Deleted',
  //         life: 3000,
  //       });
  //     },
  //   });
  // }
}
