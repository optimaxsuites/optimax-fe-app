import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { StockMovementComponent } from './stock-movement.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { StockMovement, MovementStatus } from '../../../../domain/inventory/inventory.dto';

describe('StockMovementComponent', () => {
  let component: StockMovementComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const movement = (over: Partial<StockMovement> = {}): StockMovement => ({
    id: 1, status: MovementStatus.PENDING, notes: '', ...over
  } as StockMovement);

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService',
      ['updateMovement', 'recordApprovalAction']);
    component = new StockMovementComponent(inventoryService, { navigate: jasmine.createSpy('navigate') } as any, new FormBuilder());
    spyOn(component, 'loadMovements' as any);
    sessionStorage.setItem('userid', 'usr-42');
    sessionStorage.setItem('fullname', 'Ada Lovelace');
  });

  afterEach(() => sessionStorage.clear());

  describe('confirmApproveMovement', () => {
    it('attributes the approval to the real signed-in user, not a hardcoded actor', () => {
      component.actionTargetMovement = movement();
      inventoryService.updateMovement.and.returnValue(of(movement({ status: MovementStatus.IN_TRANSIT })));

      component.confirmApproveMovement();

      expect(inventoryService.updateMovement).toHaveBeenCalledWith(1, jasmine.objectContaining({
        approvedBy: 'usr-42', approvedByName: 'Ada Lovelace'
      }));
    });

    it('records the action in the shared approval-history log, like Movement Approvals already does', () => {
      component.actionTargetMovement = movement();
      inventoryService.updateMovement.and.returnValue(of(movement({ status: MovementStatus.IN_TRANSIT })));

      component.confirmApproveMovement();

      expect(inventoryService.recordApprovalAction).toHaveBeenCalledWith(
        jasmine.objectContaining({ movementId: '1', action: 'APPROVE', approvedBy: 'usr-42' })
      );
    });
  });

  describe('confirmRejectMovement', () => {
    it('attributes the rejection to the real signed-in user and records history', () => {
      component.actionTargetMovement = movement();
      component.rejectReason = 'Wrong branch';
      inventoryService.updateMovement.and.returnValue(of(movement({ status: MovementStatus.CANCELLED })));

      component.confirmRejectMovement();

      expect(inventoryService.updateMovement).toHaveBeenCalledWith(1, jasmine.objectContaining({ approvedBy: 'usr-42' }));
      expect(inventoryService.recordApprovalAction).toHaveBeenCalledWith(
        jasmine.objectContaining({ action: 'REJECT', comments: 'Wrong branch' })
      );
    });
  });

  describe('confirmRequestChanges', () => {
    it('records the request-changes action with the real user', () => {
      component.actionTargetMovement = movement();
      component.changesReason = 'Please recheck the quantity';
      inventoryService.updateMovement.and.returnValue(of(movement()));

      component.confirmRequestChanges();

      expect(inventoryService.recordApprovalAction).toHaveBeenCalledWith(
        jasmine.objectContaining({ action: 'REQUEST_CHANGES', approvedBy: 'usr-42', comments: 'Please recheck the quantity' })
      );
    });
  });
});
