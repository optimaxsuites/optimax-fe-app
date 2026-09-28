import { FormBuilder } from '@angular/forms';

import { BranchInventoryTableComponent } from './branch-inventory-table.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { BranchInventory } from '../../../../domain/inventory/inventory.dto';

describe('BranchInventoryTableComponent', () => {
  let component: BranchInventoryTableComponent;

  const item = (over: Partial<BranchInventory> = {}): BranchInventory => ({
    id: 1, branchId: 'b1', productId: 'p1', productName: 'Product', sku: 'SKU1',
    quantity: 10, reorderPoint: 5, safetyStock: 2, sellingPrice: 100, costPrice: 50,
    ...over
  } as BranchInventory);

  beforeEach(() => {
    const inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getBranchInventory', 'saveBranchInventoryItem']);
    component = new BranchInventoryTableComponent(inventoryService, { navigate: jasmine.createSpy('navigate') } as any, new FormBuilder());
  });

  it('actually reorders rows by real stock-status severity when sorting by Status (not a no-op)', () => {
    // Before the fix, (a as any)['status'] was always undefined for both sides (BranchInventory
    // has no `status` field), so the icon flipped but filteredItems never actually reordered.
    component.filteredItems = [
      item({ id: 1, quantity: 100, reorderPoint: 10, safetyStock: 5 }),  // OVERSTOCK
      item({ id: 2, quantity: 0, reorderPoint: 10, safetyStock: 5 }),    // CRITICAL
      item({ id: 3, quantity: 12, reorderPoint: 10, safetyStock: 5 })    // NORMAL
    ];

    component.toggleSort('status');

    expect(component.filteredItems.map(i => i.id)).toEqual([2, 3, 1]);
  });

  it('reverses order on a second toggle of the same field', () => {
    component.filteredItems = [
      item({ id: 1, quantity: 0, reorderPoint: 10, safetyStock: 5 }),   // CRITICAL
      item({ id: 2, quantity: 100, reorderPoint: 10, safetyStock: 5 })  // OVERSTOCK
    ];

    component.toggleSort('status');
    component.toggleSort('status');

    expect(component.filteredItems.map(i => i.id)).toEqual([2, 1]);
  });
});
