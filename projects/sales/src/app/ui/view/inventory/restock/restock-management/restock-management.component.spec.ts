import { of } from 'rxjs';

import { RestockManagementComponent } from './restock-management.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { RestockRequest, RestockStatus } from '../../../../domain/inventory/inventory.dto';

describe('RestockManagementComponent', () => {
  let component: RestockManagementComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['approveRestockRequest', 'rejectRestockRequest', 'getRestockRequests', 'getBranches']);
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

  describe('background auto-refresh does not disrupt an actively browsing user', () => {
    it('applyFilters(true) — a background refresh — does not reset currentPage back to page 1', () => {
      component.restockRequests = [];
      component.currentPage = 3;

      component.applyFilters(true);

      expect(component.currentPage).toBe(3);
    });

    it('applyFilters() — a real filter change — does reset currentPage', () => {
      component.restockRequests = [];
      component.currentPage = 3;

      component.applyFilters();

      expect(component.currentPage).toBe(0);
    });

    it('loadDashboardData(true) does not flip isLoading true, so the table stays visible during a background tick', () => {
      (component.loadDashboardData as any).and.callThrough();
      inventoryService.getRestockRequests.and.returnValue(of({ data: [], total: 0, totalPages: 0 } as any));
      inventoryService.getBranches.and.returnValue(of([]));
      component.isLoading = false;

      component.loadDashboardData(true);

      expect(component.isLoading).toBeFalse();
    });
  });
});
