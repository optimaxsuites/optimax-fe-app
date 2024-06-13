import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../../services/inventory/inventory.service';
import { Observable } from 'rxjs';
import { DropdownService } from '../../services/dropdown/dropdown.service';
import { InventoryItem } from '../../interface/data';

@Component({
  selector: 'app-inventory-table',
  templateUrl: './inventory-table.component.html',
  styleUrl: './inventory-table.component.scss'
})
export class InventoryTableComponent {

  // inventory: any[] = [];
  selectedCurrency$: Observable<string | null>;
  items: InventoryItem[] = [];

  constructor(
    private router: Router,
    private inventoryService: InventoryService,
    private dropdownService: DropdownService
    
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

}
