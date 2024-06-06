import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
// import { MatPaginator, PageEvent } from '@angular/material/paginator';
// import { MatTableDataSource } from '@angular/material/table';
import { InventoryService } from '../../services/inventory/inventory.service';

interface InventoryItem {
  itemName: string;
  partNo: string;
  image: string;
  description: string;
  initialStock: number;
  buyingPrice: number;
  sellingPrice: number;
  inventoryLedger: string;
  purchaseLedger: string;
  salesLedger: string;
  taxRate: number;
  hsn: string;
  currentStock: number;
  totalSoldQuantity: number;
  totalPurchaseQuantity: number;
  tag: string;
}

@Component({
  selector: 'app-managed-inventory-table',
  templateUrl: './managed-inventory-table.component.html',
  styleUrl: './managed-inventory-table.component.scss'
})
export class ManagedInventoryTableComponent {

  // inventory: any[] = [];
  inventory: InventoryItem[] = [];
  paginatedInventory: InventoryItem[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  

  constructor(
    private router: Router,
    private inventoryService: InventoryService
  ) {}

  ngOnInit() {
    this.inventoryService.getInventory().subscribe(data => {
      this.inventory = data;
    });
  }

}
