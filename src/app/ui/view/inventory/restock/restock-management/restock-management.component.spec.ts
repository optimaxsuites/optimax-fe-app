import { of } from 'rxjs';

import { RestockManagementComponent } from './restock-management.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { RestockRequest, RestockStatus } from '../../../../domain/inventory/inventory.dto';

describe('RestockManagementComponent', () => {
  let component: RestockManagementComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['approveRestockRequest', 'rejectRestockRequest']);
    component = new RestockManagementComponent(inventoryService, { navigate: jasmine.createSpy('navigate') } as any);
    spyOn(component, 'loadDashboardData' as any);
    component.selectedRequest = { id: 1 } as RestockRequest;
  });

  describe('submitApproval: rejection requires a real reason', () => {
    it('blocks rejecting with an empty reason', () => {
      component.approvalAction = 'reject';
      component.approvalNotes = '   ';

      component.submitApproval();

      expect(inventoryService.rejectRestockRequest).not.toHaveBeenCalled();
      expect(component.error).toBeTruthy();
    });

    it('allows rejecting once a real reason is given', () => {
      component.approvalAction = 'reject';
      component.approvalNotes = 'Budget exceeded this quarter';
      inventoryService.rejectRestockRequest.and.returnValue(of(undefined));

      component.submitApproval();

      expect(inventoryService.rejectRestockRequest).toHaveBeenCalledWith(1, 'Budget exceeded this quarter');
    });

    it('does not require a reason to approve', () => {
      component.approvalAction = 'approve';
      component.approvalNotes = '';
      inventoryService.approveRestockRequest.and.returnValue(of(undefined));

      component.submitApproval();

      expect(inventoryService.approveRestockRequest).toHaveBeenCalled();
    });
  });
});
