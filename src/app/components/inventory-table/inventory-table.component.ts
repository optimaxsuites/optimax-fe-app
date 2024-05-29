import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../../services/inventory/inventory.service';

@Component({
  selector: 'app-inventory-table',
  templateUrl: './inventory-table.component.html',
  styleUrl: './inventory-table.component.scss'
})
export class InventoryTableComponent {

  inventory: any[] = [];

  constructor(
    private router: Router,
    private inventoryService: InventoryService
  ) {}

  ngOnInit() {
    this.inventoryService.getInventory().subscribe(data => {
      this.inventory = data;
    });
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
