import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InventoryItem } from 'src/app/ui/shared/domain/interface/data';
import { InventoryService } from '../../service/inventory/inventory.service';
import { DropdownService } from 'src/app/ui/shared/service/dropdown/dropdown.service';


@Component({
  selector: 'app-inventory-table',
  templateUrl: './inventory-table.component.html',
  styleUrl: './inventory-table.component.scss',
  providers: [
    ConfirmationService, MessageService 
  ]
})
export class InventoryTableComponent implements OnInit{


  // sidebarVisible2: boolean = false;
  // // selectedItem: any; // Holds the selected item for displaying details in the sidebar
  // // inventory: any[] = [];
  // selectedCurrency$: Observable<string | null>;
  // items: InventoryItem[] = [];

  // constructor(
  //   private router: Router,
  //   private inventoryService: InventoryService,
  //   private dropdownService: DropdownService
    
  // ) {
  //   this.selectedCurrency$ = this.dropdownService.getSelectedItem$('currency');
  // }

  // // ngOnInit() {
  // //   this.inventoryService.getItem().subscribe(data => {
  // //     this.items = data;
  // //     // this.items = [
  // //     //   {
  // //     //     id: "NLJEYduajI",
  // //     //     itemName: "ONeTLyjObcjpaXo",
  // //     //     partNo: "RNaTnbTq",
  // //     //     taxRate: 15.95,
  // //     //     description: "mnycpLmAcwStjWZYnmYHFwwSseENHgOfQWuDDFQACRfyCRYfFx",
  // //     //     images: [
  // //     //       "https://example.com/image72.jpg",
  // //     //       "https://example.com/image56.jpg",
  // //     //       "https://example.com/image11.jpg",
  // //     //       "https://example.com/image70.jpg",
  // //     //       "https://example.com/image54.jpg"
  // //     //     ],
  // //     //     buyingPrice: 420.35,
  // //     //     sellingPrice: 278.93,
  // //     //     initialStock: 452,
  // //     //     totalSoldQuantity: 931,
  // //     //     totalPurchaseQuantity: 121
  // //     //   }
  // //     // ];
  // //   });
  // // }


  // ngOnInit() {
  //   const savedItems = sessionStorage.getItem('items');
  //   if (savedItems) {
  //     this.items = JSON.parse(savedItems);
  //   } else {
  //     this.inventoryService.getItem().subscribe(data => {
  //       this.items = data;
  //       sessionStorage.setItem('items', JSON.stringify(this.items));
  //     });
  //   }
  // }

  // extractCurrencyCode(currency: string | null | undefined): string {
  //   if (!currency) return '';
  //   const match = currency.match(/\(([^)]+)\)/);
  //   return match ? match[1] : '';
  // }

  // navigateToForm() {
  //   this.router.navigate(['/inventory/inventory-form']);
  // }

  // editItem(id: string) {
  //   this.router.navigate(['/inventory/inventory-form', id]);
  // }

  // deleteItem(id: string) {
  //   this.inventoryService.deleteItem(id);
  // }
  // viewItem(item: any) {
  //   this.showDialog(item, 'right');
  // }
  
  
  
  // visible: boolean = false;
  // selectedItem: InventoryItem | null = null;
  // position: any = '';

  // showDialog(item: InventoryItem, position: string = 'right'): void {
  //   this.selectedItem = item;
  //   this.position = position;
  //   this.visible = true;
  // }





























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
    this.inventoryService.deleteItem(id);
  }


  // deleteItem(id: string) {
  //   this.inventoryService.deleteItem(id).subscribe(() => {
  //     this.items = this.items.filter(item => item.id !== id);
  //     this.saveItemsToSession();
  //   });
  // }

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
        message: 'Are you sure you want to delete the selected products?',
        header: 'Confirm',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
            this.items = this.items.filter((val) => !this.selectedItems?.includes(val));
            this.selectedItems = [];
            this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Products Deleted', life: 3000 });
        }
    });
  }

}
