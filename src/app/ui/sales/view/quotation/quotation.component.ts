import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TopProductService } from 'src/app/ui/dashboard/service/top-product/top-product.service';

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
export class QuotationComponent {
  selectedItems?: any[] = [];
  quotationData: any[] = [];
  visible: boolean = false;
  selectedItem: any | null = null;
  position: any = '';


  constructor(
    private topProductsService: TopProductService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
  }

  ngOnInit(): void {
    this.topProductsService.getItem().subscribe(data => {
      this.quotationData = data;
    });
  }

  navigateToForm(){
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
      accept:()=>{
        this.topProductsService.deleteItem(id);
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Product Deleted', life: 3000 });
      },
      reject: () => {
        this.messageService.add({ severity: 'error', summary: 'Unsuccessful', detail: 'Product not Deleted', life: 3000 });
      }
    });
  }
  viewItem(item: string){
    this.showDialog(item, 'right');
  }

  showDialog(item: any, position: string = 'right'): void {
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
