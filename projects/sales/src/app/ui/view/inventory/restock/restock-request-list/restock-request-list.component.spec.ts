import { of, throwError } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { RestockRequestListComponent } from './restock-request-list.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';

describe('RestockRequestListComponent', () => {
  let component: RestockRequestListComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['approveRestockRequest', 'rejectRestockRequest']);
    component = new RestockRequestListComponent(
      inventoryService,
      { navigate: jasmine.createSpy('navigate') } as any,
      { snapshot: { queryParams: {} } } as any,
      new FormBuilder()
    );
    spyOn(component, 'loadRequests' as any);
    spyOn(window, 'confirm').and.returnValue(true);
    [1, 2, 3].forEach(id => component.selectedRequestIds.add(id));
  });

  describe('bulk approve/reject', () => {
    it('waits for every request and clears selection/reloads once all have settled, even with a failure', () => {
      inventoryService.approveRestockRequest.and.callFake((id: any) =>
        id === 2 ? throwError(() => new Error('500')) : of(undefined)
      );

      component.bulkAction('approve');

      // The old hand-rolled counter only incremented on `next`, so one failure meant the
      // success path (clear selection, reload, isProcessing=false) never ran at all.
      expect(component.isProcessing).toBeFalse();
      expect(component.selectedRequestIds.size).toBe(0);
      expect(component.error).toContain('2 of 3');
    });

    it('reports total failure distinctly from partial failure', () => {
      inventoryService.rejectRestockRequest.and.returnValue(throwError(() => new Error('500')));

      component.bulkAction('reject');

      expect(component.error).toContain('Failed to reject any');
    });

    it('shows no error when every request succeeds', () => {
      inventoryService.approveRestockRequest.and.returnValue(of(undefined));

      component.bulkAction('approve');

      expect(component.error).toBeNull();
    });
  });

  describe('submitApproval: single-item rejection requires a reason', () => {
    beforeEach(() => {
      component.selectedRequest = { id: 1 } as any;
    });

    it('blocks an empty rejection reason', () => {
      component.approvalAction = 'reject';
      component.approvalNotes = '';

      component.submitApproval();

      expect(inventoryService.rejectRestockRequest).not.toHaveBeenCalled();
      expect(component.error).toBeTruthy();
    });
  });

  describe('clearFilters: no redundant reload', () => {
    it('does not route the reset through searchSubject, avoiding a second loadRequests() call once the debounce elapses', () => {
      const nextSpy = spyOn(component.searchSubject, 'next');

      component.clearFilters();

      expect(nextSpy).not.toHaveBeenCalled();
      expect((component.loadRequests as any).calls.count()).toBe(1);
    });
  });
});
