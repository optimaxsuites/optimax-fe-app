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


    this.items = [
      {
        itemName: 'Widget A',
        partNo: 'WA1234',
        initialStock: 100,
        buyingPrice: 10.00,
        sellingPrice: 15.00,
        taxRate: 0.05,
        totalSoldQuantity: 50,
        totalPurchaseQuantity: 150
      },
      {
        itemName: 'Gadget B',
        partNo: 'GB5678',
        initialStock: 200,
        buyingPrice: 20.00,
        sellingPrice: 30.00,
        taxRate: 0.10,
        totalSoldQuantity: 100,
        totalPurchaseQuantity: 250
      },
      {
        itemName: 'Widget C',
        partNo: 'WC9101',
        initialStock: 150,
        buyingPrice: 12.00,
        sellingPrice: 18.00,
        taxRate: 0.08,
        totalSoldQuantity: 75,
        totalPurchaseQuantity: 175
      },
      {
        itemName: 'Gadget D',
        partNo: 'GD1121',
        initialStock: 50,
        buyingPrice: 25.00,
        sellingPrice: 35.00,
        taxRate: 0.12,
        totalSoldQuantity: 25,
        totalPurchaseQuantity: 75
      },
      {
        itemName: 'Widget E',
        partNo: 'WE3141',
        initialStock: 120,
        buyingPrice: 11.00,
        sellingPrice: 16.00,
        taxRate: 0.06,
        totalSoldQuantity: 60,
        totalPurchaseQuantity: 160
      },
      {
        itemName: 'Gadget F',
        partNo: 'GF5161',
        initialStock: 180,
        buyingPrice: 22.00,
        sellingPrice: 32.00,
        taxRate: 0.11,
        totalSoldQuantity: 90,
        totalPurchaseQuantity: 210
      },
      {
        itemName: 'Widget G',
        partNo: 'WG7181',
        initialStock: 90,
        buyingPrice: 13.00,
        sellingPrice: 19.00,
        taxRate: 0.07,
        totalSoldQuantity: 45,
        totalPurchaseQuantity: 135
      },
      {
        itemName: 'Gadget H',
        partNo: 'GH9201',
        initialStock: 160,
        buyingPrice: 24.00,
        sellingPrice: 34.00,
        taxRate: 0.13,
        totalSoldQuantity: 80,
        totalPurchaseQuantity: 240
      },
      {
        itemName: 'Widget I',
        partNo: 'WI1221',
        initialStock: 110,
        buyingPrice: 14.00,
        sellingPrice: 20.00,
        taxRate: 0.09,
        totalSoldQuantity: 55,
        totalPurchaseQuantity: 165
      },
      {
        itemName: 'Gadget J',
        partNo: 'GJ3241',
        initialStock: 140,
        buyingPrice: 26.00,
        sellingPrice: 36.00,
        taxRate: 0.14,
        totalSoldQuantity: 70,
        totalPurchaseQuantity: 190
      },
      {
        itemName: 'Widget K',
        partNo: 'WK5261',
        initialStock: 130,
        buyingPrice: 15.00,
        sellingPrice: 21.00,
        taxRate: 0.10,
        totalSoldQuantity: 65,
        totalPurchaseQuantity: 170
      },
      {
        itemName: 'Gadget L',
        partNo: 'GL7281',
        initialStock: 170,
        buyingPrice: 27.00,
        sellingPrice: 37.00,
        taxRate: 0.15,
        totalSoldQuantity: 85,
        totalPurchaseQuantity: 230
      },
      {
        itemName: 'Widget M',
        partNo: 'WM9301',
        initialStock: 80,
        buyingPrice: 16.00,
        sellingPrice: 22.00,
        taxRate: 0.11,
        totalSoldQuantity: 40,
        totalPurchaseQuantity: 120
      },
      {
        itemName: 'Gadget N',
        partNo: 'GN1321',
        initialStock: 150,
        buyingPrice: 28.00,
        sellingPrice: 38.00,
        taxRate: 0.16,
        totalSoldQuantity: 75,
        totalPurchaseQuantity: 195
      },
      {
        itemName: 'Widget O',
        partNo: 'WO3341',
        initialStock: 140,
        buyingPrice: 17.00,
        sellingPrice: 23.00,
        taxRate: 0.12,
        totalSoldQuantity: 70,
        totalPurchaseQuantity: 180
      },
      {
        itemName: 'Gadget P',
        partNo: 'GP5361',
        initialStock: 190,
        buyingPrice: 29.00,
        sellingPrice: 39.00,
        taxRate: 0.17,
        totalSoldQuantity: 95,
        totalPurchaseQuantity: 240
      },
      {
        itemName: 'Widget Q',
        partNo: 'WQ7381',
        initialStock: 70,
        buyingPrice: 18.00,
        sellingPrice: 24.00,
        taxRate: 0.13,
        totalSoldQuantity: 35,
        totalPurchaseQuantity: 105
      },
      {
        itemName: 'Gadget R',
        partNo: 'GR9401',
        initialStock: 200,
        buyingPrice: 30.00,
        sellingPrice: 40.00,
        taxRate: 0.18,
        totalSoldQuantity: 100,
        totalPurchaseQuantity: 260
      },
      {
        itemName: 'Widget S',
        partNo: 'WS1421',
        initialStock: 100,
        buyingPrice: 19.00,
        sellingPrice: 25.00,
        taxRate: 0.14,
        totalSoldQuantity: 50,
        totalPurchaseQuantity: 140
      },
      {
        itemName: 'Gadget T',
        partNo: 'GT3441',
        initialStock: 180,
        buyingPrice: 31.00,
        sellingPrice: 41.00,
        taxRate: 0.19,
        totalSoldQuantity: 90,
        totalPurchaseQuantity: 230
      },
      {
        itemName: 'Widget U',
        partNo: 'WU5461',
        initialStock: 60,
        buyingPrice: 20.00,
        sellingPrice: 26.00,
        taxRate: 0.15,
        totalSoldQuantity: 30,
        totalPurchaseQuantity: 90
      },
      {
        itemName: 'Gadget V',
        partNo: 'GV7481',
        initialStock: 170,
        buyingPrice: 32.00,
        sellingPrice: 42.00,
        taxRate: 0.20,
        totalSoldQuantity: 85,
        totalPurchaseQuantity: 210
      },
      {
        itemName: 'Widget W',
        partNo: 'WW9501',
        initialStock: 130,
        buyingPrice: 21.00,
        sellingPrice: 27.00,
        taxRate: 0.16,
        totalSoldQuantity: 65,
        totalPurchaseQuantity: 160
      },
      {
        itemName: 'Gadget X',
        partNo: 'GX1521',
        initialStock: 90,
        buyingPrice: 33.00,
        sellingPrice: 43.00,
        taxRate: 0.21,
        totalSoldQuantity: 45,
        totalPurchaseQuantity: 130
      },
      {
        itemName: 'Widget Y',
        partNo: 'WY3541',
        initialStock: 200,
        buyingPrice: 22.00,
        sellingPrice: 28.00,
        taxRate: 0.17,
        totalSoldQuantity: 100,
        totalPurchaseQuantity: 220
      },
      {
        itemName: 'Gadget Z',
        partNo: 'GZ5561',
        initialStock: 110,
        buyingPrice: 34.00,
        sellingPrice: 44.00,
        taxRate: 0.22,
        totalSoldQuantity: 55,
        totalPurchaseQuantity: 140
      },
    ]
    
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
