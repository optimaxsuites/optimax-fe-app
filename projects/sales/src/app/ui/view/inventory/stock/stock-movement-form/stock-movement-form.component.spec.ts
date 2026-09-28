import { of, throwError } from 'rxjs';
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
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getBranchInventory', 'createMovement', 'updateMovement']);
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

  describe('save(): multiple items', () => {
    beforeEach(() => {
      // The default beforeEach already pushed one item (p1); add a second so items.length === 2.
      const item2 = (component as any).createItemForm();
      item2.patchValue({ productId: 'p2', productName: 'Gadget', sku: 'G-1', quantity: 4 });
      component.items.push(item2);
      // fromLocationType is BRANCH (set in the outer beforeEach), so save() runs a real stock
      // check against sourceInventory first — give both items enough stock to pass it.
      component.sourceInventory = [stockItem({ productId: 'p1', quantity: 100 }), stockItem({ productId: 'p2', quantity: 100 })];
    });

    it('creates one movement per item instead of silently dropping every item after the first', () => {
      inventoryService.createMovement.and.returnValue(of({ id: 1 } as any));

      component.save();

      expect(inventoryService.createMovement).toHaveBeenCalledTimes(2);
      expect(inventoryService.createMovement).toHaveBeenCalledWith(jasmine.objectContaining({ productId: 'p1', quantity: 10 }));
      expect(inventoryService.createMovement).toHaveBeenCalledWith(jasmine.objectContaining({ productId: 'p2', quantity: 4 }));
    });

    it('removes only the items that failed on a partial failure, so a resubmit does not duplicate the ones that already saved', () => {
      let call = 0;
      inventoryService.createMovement.and.callFake(() => {
        call++;
        return call === 1 ? of({ id: 1 } as any) : throwError(() => new Error('500'));
      });

      component.save();

      expect(component.items.length).toBe(1);
      expect(component.items.at(0).get('productId')?.value).toBe('p2');
      expect(component.error).toContain('1 of 2');
    });

    it('in edit mode, updates the existing record for the first item and creates new movements for the rest', () => {
      component.mode = 'edit';
      component.movementId = '42';
      component.movement = { id: 42, status: 'PENDING' } as any;
      inventoryService.updateMovement.and.returnValue(of({ id: 42 } as any));
      inventoryService.createMovement.and.returnValue(of({ id: 2 } as any));

      component.save();

      expect(inventoryService.updateMovement).toHaveBeenCalledWith('42', jasmine.objectContaining({ productId: 'p1' }));
      expect(inventoryService.createMovement).toHaveBeenCalledWith(jasmine.objectContaining({ productId: 'p2' }));
    });
  });
});
