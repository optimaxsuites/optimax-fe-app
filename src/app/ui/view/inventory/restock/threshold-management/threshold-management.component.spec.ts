import { of, throwError } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { ThresholdManagementComponent } from './threshold-management.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { Branch, BranchInventory } from '../../../../domain/inventory/inventory.dto';

describe('ThresholdManagementComponent', () => {
  let component: ThresholdManagementComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const item = (over: Partial<BranchInventory> = {}): BranchInventory => ({
    branchId: 'b1', productId: 'p1', quantity: 10, reorderPoint: 5, safetyStock: 2,
    reorderQuantity: 20, sellingPrice: 100, costPrice: 50, ...over
  } as BranchInventory);

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['saveBranchInventoryItem']);
    component = new ThresholdManagementComponent(inventoryService, { navigate: jasmine.createSpy('navigate') } as any, new FormBuilder());
    component.selectedBranch = { id: 'b1', name: 'Branch 1' } as unknown as Branch;
    component.openBulkEdit();
  });

  it('actually calls the backend for every matching item instead of just showing a fake success toast', () => {
    inventoryService.saveBranchInventoryItem.and.callFake((data: any) => of({ ...data } as BranchInventory));
    component.inventoryItems = [item({ productId: 'p1', reorderPoint: 5, safetyStock: 2 }), item({ productId: 'p2', reorderPoint: 8, safetyStock: 4 })];
    component.bulkForm.patchValue({ applyTo: 'ALL', multiplier: '2' });

    component.applyBulkEdit();

    expect(inventoryService.saveBranchInventoryItem).toHaveBeenCalledTimes(2);
    expect(inventoryService.saveBranchInventoryItem).toHaveBeenCalledWith(jasmine.objectContaining({ productId: 'p1', reorderPoint: 10, safetyStock: 4 }));
    expect(component.success).toContain('2 item(s)');
  });

  it('only applies to items matching the selected urgency filter', () => {
    inventoryService.saveBranchInventoryItem.and.callFake((data: any) => of({ ...data } as BranchInventory));
    // quantity 1, safetyStock 5 -> CRITICAL; quantity 100, reorderPoint 5 -> NORMAL/OVERSTOCK
    component.inventoryItems = [
      item({ productId: 'critical-item', quantity: 1, reorderPoint: 5, safetyStock: 5 }),
      item({ productId: 'healthy-item', quantity: 100, reorderPoint: 5, safetyStock: 2 })
    ];
    component.bulkForm.patchValue({ applyTo: 'CRITICAL', multiplier: '2' });

    component.applyBulkEdit();

    expect(inventoryService.saveBranchInventoryItem).toHaveBeenCalledTimes(1);
    expect(inventoryService.saveBranchInventoryItem).toHaveBeenCalledWith(jasmine.objectContaining({ productId: 'critical-item' }));
  });

  it('reports a real failure instead of a blanket success when a save fails', () => {
    inventoryService.saveBranchInventoryItem.and.returnValue(throwError(() => new Error('500')));
    component.inventoryItems = [item()];
    component.bulkForm.patchValue({ applyTo: 'ALL', multiplier: '2' });

    component.applyBulkEdit();

    expect(component.isBulkSaving).toBeFalse();
    expect(component.error).toBeTruthy();
    expect(component.success).toBeNull();
  });
});
