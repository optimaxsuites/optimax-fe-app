import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { StockMovementFormComponent } from './stock-movement-form.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { BranchInventory } from '../../../../domain/inventory/inventory.dto';

describe('StockMovementFormComponent', () => {
  let component: StockMovementFormComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const stockItem = (over: Partial<BranchInventory> = {}): BranchInventory => ({
    branchId: 'b1', productId: 'p1', quantity: 5, ...over
  } as BranchInventory);

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getBranchInventory', 'createMovement']);
    component = new StockMovementFormComponent(
      inventoryService,
      { navigate: jasmine.createSpy('navigate') } as any,
      { snapshot: { paramMap: { get: () => null }, queryParams: {} } } as any,
      { back: jasmine.createSpy('back') } as any,
      new FormBuilder()
    );

    component.movementForm.patchValue({
      movementType: 'TRANSFER', fromLocationType: 'BRANCH', fromLocationId: 'b1',
      toLocationType: 'BRANCH', toLocationId: 'b2'
    });
    const item = (component as any).createItemForm();
    item.patchValue({ productId: 'p1', productName: 'Widget', sku: 'W-1', quantity: 10 });
    component.items.push(item);
  });

  describe('onLocationIdChange: loading the source branch stock', () => {
    it('loads inventory when the "from" location is a real BRANCH', () => {
      inventoryService.getBranchInventory.and.returnValue(of([stockItem()]));
      component.onLocationIdChange('from', { target: { value: 'b1' } } as any);

      expect(inventoryService.getBranchInventory).toHaveBeenCalledWith('b1');
      expect(component.getAvailableStock('p1')).toBe(5);
    });

    it('does not treat a SUPPLIER/WAREHOUSE source as having checkable stock', () => {
      component.movementForm.patchValue({ fromLocationType: 'SUPPLIER' });
      component.onLocationIdChange('from', { target: { value: 'sup-1' } } as any);

      expect(inventoryService.getBranchInventory).not.toHaveBeenCalled();
      expect(component.getAvailableStock('p1')).toBeNull();
    });
  });

  describe('save(): stock-availability check', () => {
    it('blocks saving when quantity exceeds the source branch\'s real stock', () => {
      component.sourceInventory = [stockItem({ quantity: 3 })]; // only 3 available, item asks for 10
      component.save();

      expect(inventoryService.createMovement).not.toHaveBeenCalled();
      expect(component.error).toContain('Insufficient stock');
    });

    it('allows saving when quantity is within the real available stock', () => {
      component.sourceInventory = [stockItem({ quantity: 100 })];
      inventoryService.createMovement.and.returnValue(of({} as any));

      component.save();

      expect(inventoryService.createMovement).toHaveBeenCalled();
    });

    it('does not check stock at all for a non-BRANCH source (e.g. receiving a PURCHASE from a supplier)', () => {
      component.movementForm.patchValue({ fromLocationType: 'SUPPLIER', fromLocationId: 'sup-1' });
      component.sourceInventory = []; // nothing loaded, and nothing should be required
      inventoryService.createMovement.and.returnValue(of({} as any));

      component.save();

      expect(inventoryService.createMovement).toHaveBeenCalled();
    });
  });
});
