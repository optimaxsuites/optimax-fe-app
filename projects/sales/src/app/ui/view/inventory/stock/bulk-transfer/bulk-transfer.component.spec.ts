import { of, throwError, Subject } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { BulkTransferComponent } from './bulk-transfer.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { StockMovement } from '../../../../domain/inventory/inventory.dto';

describe('BulkTransferComponent', () => {
  let component: BulkTransferComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const addItem = (productId: string, quantity: number, sourceStock: number) => {
    const group = (component as any).createItemForm();
    group.patchValue({ productId, productName: productId, sku: productId, quantity, sourceStock });
    component.items.push(group);
  };

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['createMovement']);
    component = new BulkTransferComponent(inventoryService, { navigate: jasmine.createSpy('navigate') } as any, new FormBuilder());
    component.bulkForm.patchValue({ sourceBranchId: 'b1', destinationBranchId: 'b2' });
    component.currentStep = 3;
  });

  it('does not report success (or navigate) until every real createMovement() call has actually resolved', () => {
    const subjects = [new Subject<StockMovement>(), new Subject<StockMovement>()];
    let call = 0;
    inventoryService.createMovement.and.callFake(() => subjects[call++].asObservable());
    addItem('p1', 5, 10);
    addItem('p2', 3, 10);

    const completedSpy = spyOn(component.completed, 'emit');
    component.submitTransfer();

    // Real HTTP calls haven't resolved yet — the old bug flipped isSubmitting back to false and
    // navigated away right here, before any response had arrived.
    expect(component.isSubmitting).toBeTrue();
    expect(completedSpy).not.toHaveBeenCalled();

    subjects[0].next({ id: 1 } as StockMovement);
    subjects[0].complete();
    expect(component.isSubmitting).toBeTrue(); // still waiting on the second one

    subjects[1].next({ id: 2 } as StockMovement);
    subjects[1].complete();

    expect(component.isSubmitting).toBeFalse();
    expect(completedSpy).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }] as any);
  });

  it('reports a partial failure and removes only the succeeded items, so a resubmit cannot duplicate them', () => {
    inventoryService.createMovement.and.callFake((m: any) =>
      m.productId === 'p1' ? of({ id: 1, productId: 'p1' } as any) : throwError(() => new Error('boom'))
    );
    addItem('p1', 5, 10);
    addItem('p2', 3, 10);

    component.submitTransfer();

    expect(component.isSubmitting).toBeFalse();
    expect(component.error).toContain('1 of 2');
    expect(component.items.length).toBe(1);
    expect(component.items.at(0).get('productId')?.value).toBe('p2');
  });

  it('blocks submission client-side when a quantity exceeds source stock, before any request is sent', () => {
    addItem('p1', 20, 10);
    component.submitTransfer();

    expect(inventoryService.createMovement).not.toHaveBeenCalled();
    expect(component.error).toContain('Insufficient stock');
    expect(component.isSubmitting).toBeFalse();
  });
});
