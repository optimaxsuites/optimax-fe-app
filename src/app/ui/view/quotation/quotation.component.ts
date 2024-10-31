import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { QuotationDTO } from '../../domain/quotation.dto';

import { QuotationService } from '../../service/quotation/quotation.service';
import { TopProductService } from '../../service/top-product/top-product.service';
import { InventoryService } from '../../service/inventory/inventory.service';

@Component({
  selector: 'app-quotation',
  templateUrl: './quotation.component.html',
  styleUrl: './quotation.component.scss',
  providers: [
    TopProductService,
    ConfirmationService,
    MessageService
  ]
})
export class QuotationComponent implements OnInit {
  selectedItems: QuotationDTO[] = [];
  quotationData: QuotationDTO[] = [];
  visible: boolean = false;
  selectedItem: QuotationDTO | null = null;
  position: any = '';


  constructor(
    private quotationService: QuotationService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private inventoryService: InventoryService,
  ) {
  }

  ngOnInit(): void {
    // this.quotationService.getQuotation().subscribe(data => {
    //   this.quotationData = data;
    // });
  }

  getSeverity(status: string) {
    switch (status) {
        case "active":
            return "success";
        case "pending":
            return "warning";
        case "inactive":
            return "danger";
        default:
            return undefined; // or another default value
    }
}

  navigateToForm(){
    this.router.navigate(['/admin/accounting/234567thj/quotation-form']);
  }
  editItem(id: string) {
    this.router.navigate(['/admin/accounting/234567thj/quotation-form', id]);
  }

  deleteItem(id: string) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this product?',
      header: 'Confirmation',
      acceptIcon: 'pi pi-check m-2',
      rejectIcon: 'pi pi-times m-2',
      rejectButtonStyleClass: 'p-button-sm m-2',
      acceptButtonStyleClass: 'p-button-outlined p-button-sm m-2',
      accept:()=>{
        this.quotationService.deleteItem(id);
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Product Deleted', life: 3000 });
      },
      reject: () => {
        this.messageService.add({ severity: 'error', summary: 'Unsuccessful', detail: 'Product not Deleted', life: 3000 });
      }
    });
  }
  viewItem(item: any){
    this.showDialog(item, 'right');
  }

  showDialog(item: QuotationDTO, position: string = 'right'): void {
    this.selectedItem = item;
    this.position = position;
    this.visible = true;
  }


  deleteSelectedItems(){
    this.confirmationService.confirm({
      header: 'Confirmation',
      message: 'Are you sure you want to delete the selected product(s)?',
      acceptIcon: 'pi pi-check m-2',
      rejectIcon: 'pi pi-times m-2',
      rejectButtonStyleClass: 'p-button-sm m-2',
      acceptButtonStyleClass: 'p-button-outlined p-button-sm m-2',
      accept: () => {
          this.quotationData = this.quotationData.filter((val) => !this.selectedItems?.includes(val));
          this.selectedItems = [];
          this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Product(s) Deleted', life: 3000 });
      },
      reject: () => {
          this.messageService.add({ severity: 'error', summary: 'Unsuccessful', detail: 'Product(s) not Deleted', life: 3000 });
      }
  });
  }

}
