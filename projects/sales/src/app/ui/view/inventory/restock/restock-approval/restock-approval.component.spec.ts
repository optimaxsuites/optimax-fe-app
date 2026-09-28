import { of, throwError, Subject } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { RestockApprovalComponent } from './restock-approval.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { RestockRequest, RestockStatus } from '../../../../domain/inventory/inventory.dto';

describe('RestockApprovalComponent', () => {
  let component: RestockApprovalComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const request = (over: Partial<RestockRequest> = {}): RestockRequest => ({
    id: 1, productName: 'Cement', status: RestockStatus.PENDING, ...over
  } as RestockRequest);

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['updateRestockRequest']);
    component = new RestockApprovalComponent(
      inventoryService,
      { navigate: jasmine.createSpy('navigate') } as any,
      { snapshot: { paramMap: { get: () => null } } } as any,
      { back: jasmine.createSpy('back') } as any,
      new FormBuilder()
    );
    component.requests = [];
    component.selectedRequest = request();
  });

  describe('submitApproval', () => {
    it('does not report success or close the modal until the real backend write actually resolves', () => {
      const subject = new Subject<RestockRequest>();
      inventoryService.updateRestockRequest.and.returnValue(subject.asObservable());
      const emitSpy = spyOn(component.approvalComplete, 'emit');
      component.showApproveModal = true;

      component.submitApproval();
      // The old version wrapped this in a setTimeout and called .subscribe() with no handler at
      // all, reporting success before (and regardless of) any real response.
      expect(component.isSubmitting).toBeTrue();
      expect(emitSpy).not.toHaveBeenCalled();
      expect(component.showApproveModal).toBeTrue();

      subject.next(request({ status: RestockStatus.APPROVED }));
      subject.complete();

      expect(component.isSubmitting).toBeFalse();
      expect(emitSpy).toHaveBeenCalled();
      expect(component.showApproveModal).toBeFalse();
    });

    it('surfaces a visible error and keeps the modal open when the write actually fails', () => {
      inventoryService.updateRestockRequest.and.returnValue(throwError(() => new Error('500')));
      component.showApproveModal = true;

      component.submitApproval();

      expect(component.isSubmitting).toBeFalse();
      expect(component.error).toBeTruthy();
      expect(component.showApproveModal).toBeTrue();
    });
  });

  describe('submitRejection', () => {
    it('requires a reason and does not call the service without one', () => {
      const spy = inventoryService.updateRestockRequest;
      component.rejectForm.patchValue({ reason: '' });

      component.submitRejection();

      expect(spy).not.toHaveBeenCalled();
    });

    it('waits for the real response before closing the modal', () => {
      inventoryService.updateRestockRequest.and.returnValue(of(request({ status: RestockStatus.REJECTED })));
      component.rejectForm.patchValue({ reason: 'Out of budget this quarter' });
      component.showRejectModal = true;

      component.submitRejection();

      expect(component.showRejectModal).toBeFalse(); // synchronous `of()` resolves immediately in this test
      expect(inventoryService.updateRestockRequest).toHaveBeenCalled();
    });
  });
});
