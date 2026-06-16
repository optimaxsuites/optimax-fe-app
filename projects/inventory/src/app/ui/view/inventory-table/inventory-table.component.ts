import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
// import { InventoryItem } from 'src/app/ui/shared/service/interface/data';
import { InventoryService } from '../../service/inventory/inventory.service';
import { DropdownService } from '../../sharedComponent/service/dropdown/dropdown.service';
import { InventoryItem } from '../../sharedComponent/service/interface/data';
// import { DropdownService } from 'src/app/ui/shared/service/dropdown/dropdown.service';


@Component({
  selector: 'app-inventory-table',
  templateUrl: './inventory-table.component.html',
  styleUrl: './inventory-table.component.scss',
  providers: [
    ConfirmationService, MessageService 
  ]
})
export class InventoryTableComponent implements OnInit{

  sidebarVisible2: boolean = false;
  selectedCurrency$: Observable<string | null>;
  
  items: InventoryItem[] = [];
  selectedItems: InventoryItem[] = [];
  visible: boolean = false;
  selectedItem: InventoryItem | null = null;
  position: any = '';

  constructor(
    private router: Router,
    private inventoryService: InventoryService,
    private dropdownService: DropdownService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {
    this.selectedCurrency$ = this.dropdownService.getSelectedItem$('currency');
  }

  ngOnInit() {
    this.inventoryService.getItem().subscribe(data => {
      this.items = data;
    });

  }

  extractCurrencyCode(currency: string | null | undefined): string {
    if (!currency) return '';
    const match = currency.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
  }

  navigateToForm() {
    this.router.navigate(['/inventory/inventory-form']);
  }

  editItem(id: string) {
    this.router.navigate(['/inventory/inventory-form', id]);
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
        this.inventoryService.deleteItem(id);
        this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Product Deleted', life: 3000 });
      },
      reject: () => {
        this.messageService.add({ severity: 'error', summary: 'Unsuccessful', detail: 'Product not Deleted', life: 3000 });
      }
    });
  }


  viewItem(item: any) {
    this.showDialog(item, 'right');
  }

  showDialog(item: InventoryItem, position: string = 'right'): void {
    this.selectedItem = item;
    this.position = position;
    this.visible = true;
  }


  deleteSelectedItems() {
    this.confirmationService.confirm({
        header: 'Confirmation',
        message: 'Are you sure you want to delete the selected product(s)?',
        acceptIcon: 'pi pi-check m-2',
        rejectIcon: 'pi pi-times m-2',
        rejectButtonStyleClass: 'p-button-sm m-2',
        acceptButtonStyleClass: 'p-button-outlined p-button-sm m-2',
        accept: () => {
            this.items = this.items.filter((val) => !this.selectedItems?.includes(val));
            this.selectedItems = [];
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Product(s) Deleted', life: 3000 });
        },
        reject: () => {
            this.messageService.add({ severity: 'error', summary: 'Unsuccessful', detail: 'Product(s) not Deleted', life: 3000 });
        }
    });
  }

}
