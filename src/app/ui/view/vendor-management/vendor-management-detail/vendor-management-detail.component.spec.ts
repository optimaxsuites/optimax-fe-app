import { of, throwError, Subject } from 'rxjs';

import { VendorManagementDetailComponent } from './vendor-management-detail.component';
import { VendorService } from '../../../service/vendor-management/vendor-management.service';
import { Vendor, VendorStatus } from '../../../domain/vendor-management/vendor-management.dto';

describe('VendorManagementDetailComponent (status flow and load errors)', () => {
  let component: VendorManagementDetailComponent;
  let vendorService: jasmine.SpyObj<VendorService>;

  const vendor = (status: VendorStatus, over: Partial<Vendor> = {}): Vendor => ({
    id: 7, companyName: 'Acme Ltd', status, documents: [], lifecycleHistory: [], riskAlerts: [], ...over
  } as unknown as Vendor);

  beforeEach(() => {
    vendorService = jasmine.createSpyObj<VendorService>('VendorService', [
      'getVendorById', 'getVendorDocuments', 'getVendorPerformance', 'getLifecycleHistory',
      'getRiskAlerts', 'updateVendorStatus', 'uploadDocument'
    ]);
    // Object.assign keeps the `selectedVendor$` stream the component subscribes to in ngOnInit out of play.
    component = new VendorManagementDetailComponent(
      { params: of({}), queryParams: of({}), snapshot: {} } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      { back: jasmine.createSpy('back') } as any,
      vendorService
    );
    component.vendorId = '7';
  });

  const setStatus = (s: VendorStatus) => (component.vendor = vendor(s));

  describe('which status changes are offered', () => {
    const cases: [VendorStatus, VendorStatus[]][] = [
      [VendorStatus.PENDING_ONBOARDING, [VendorStatus.UNDER_REVIEW, VendorStatus.ACTIVE, VendorStatus.REJECTED]],
      [VendorStatus.UNDER_REVIEW, [VendorStatus.ACTIVE, VendorStatus.REJECTED]],
      [VendorStatus.ACTIVE, [VendorStatus.CONDITIONAL, VendorStatus.SUSPENDED, VendorStatus.INACTIVE, VendorStatus.OFFBOARDED]],
      [VendorStatus.SUSPENDED, [VendorStatus.ACTIVE, VendorStatus.INACTIVE, VendorStatus.OFFBOARDED]],
      [VendorStatus.REJECTED, [VendorStatus.UNDER_REVIEW]],
      [VendorStatus.OFFBOARDED, []]
    ];
    cases.forEach(([from, expected]) => {
      it(`${from} -> ${expected.length ? expected.join(', ') : 'nothing (final)'}`, () => {
        setStatus(from);
        expect(component.getStatusOptions()).toEqual(expected);
      });
    });

    it('a pending vendor cannot be suspended, and a rejected/offboarded vendor cannot jump to ACTIVE', () => {
      setStatus(VendorStatus.PENDING_ONBOARDING);
      expect(component.getStatusOptions()).not.toContain(VendorStatus.SUSPENDED);
      setStatus(VendorStatus.REJECTED);
      expect(component.getStatusOptions()).not.toContain(VendorStatus.ACTIVE);
      setStatus(VendorStatus.OFFBOARDED);
      expect(component.getStatusOptions()).not.toContain(VendorStatus.ACTIVE);
    });

    it('offers nothing without a loaded vendor', () => {
      component.vendor = null;
      expect(component.getStatusOptions()).toEqual([]);
    });
  });

  describe('changing status', () => {
    beforeEach(() => {
      vendorService.updateVendorStatus.and.returnValue(of({} as Vendor));
      vendorService.getVendorById.and.returnValue(of(vendor(VendorStatus.SUSPENDED)));
      vendorService.getLifecycleHistory.and.returnValue(of([]));
    });

    it('suspending asks for a reason first and calls nothing yet', () => {
      setStatus(VendorStatus.ACTIVE);
      component.changeStatus(VendorStatus.SUSPENDED);

      expect(component.showConfirmDialog).toBeTrue();
      expect(component.confirmAction).toBe('status');
      expect(vendorService.updateVendorStatus).not.toHaveBeenCalled();
      expect(component.canConfirmStatusChange).toBeFalse();
    });

    it('confirming without a reason does nothing', () => {
      setStatus(VendorStatus.ACTIVE);
      component.changeStatus(VendorStatus.SUSPENDED);
      component.statusReason = '   ';
      component.confirmDialogAction();
      expect(vendorService.updateVendorStatus).not.toHaveBeenCalled();
    });

    it('confirming with a reason sends it, closes the dialog and reloads what was really saved', () => {
      setStatus(VendorStatus.ACTIVE);
      component.changeStatus(VendorStatus.SUSPENDED);
      component.statusReason = ' Late deliveries ';
      expect(component.canConfirmStatusChange).toBeTrue();
      component.confirmDialogAction();

      expect(vendorService.updateVendorStatus).toHaveBeenCalledOnceWith('7', VendorStatus.SUSPENDED, 'Late deliveries');
      expect(component.showConfirmDialog).toBeFalse();
      expect(component.isSaving).toBeFalse();
      expect(vendorService.getVendorById).toHaveBeenCalledWith('7');       // re-read from the backend
      expect(vendorService.getLifecycleHistory).toHaveBeenCalledWith('7'); // activity refreshed
      expect(component.vendor!.status).toBe(VendorStatus.SUSPENDED);
    });

    it('statuses that need no reason apply straight away', () => {
      setStatus(VendorStatus.SUSPENDED);
      component.changeStatus(VendorStatus.ACTIVE);
      expect(component.showConfirmDialog).toBeFalse();
      expect(vendorService.updateVendorStatus).toHaveBeenCalledOnceWith('7', VendorStatus.ACTIVE, undefined);
    });

    it('a failed change reports it, changes nothing locally, and does not reload as if it worked', () => {
      vendorService.updateVendorStatus.and.returnValue(throwError(() => new Error('403')));
      setStatus(VendorStatus.ACTIVE);
      component.changeStatus(VendorStatus.SUSPENDED);
      component.statusReason = 'Reason';
      component.confirmDialogAction();

      expect(component.actionError).toContain('Nothing was changed');
      expect(component.vendor!.status).toBe(VendorStatus.ACTIVE);
      expect(component.isSaving).toBeFalse();
      expect(component.showConfirmDialog).toBeFalse();
      expect(vendorService.getVendorById).not.toHaveBeenCalled();
    });

    it('selecting the current status, or clicking while a change is running, is ignored', () => {
      setStatus(VendorStatus.ACTIVE);
      component.changeStatus(VendorStatus.ACTIVE);
      component.isSaving = true;
      component.changeStatus(VendorStatus.SUSPENDED);
      expect(vendorService.updateVendorStatus).not.toHaveBeenCalled();
      expect(component.showConfirmDialog).toBeFalse();
    });

    it('cancelling the dialog clears the pending change and reason', () => {
      setStatus(VendorStatus.ACTIVE);
      component.changeStatus(VendorStatus.OFFBOARDED);
      component.statusReason = 'x';
      component.cancelDialog();
      expect(component.pendingStatus).toBeNull();
      expect(component.statusReason).toBe('');
      expect(component.showConfirmDialog).toBeFalse();
    });
  });

  describe('loading', () => {
    const loadOk = () => {
      vendorService.getVendorById.and.returnValue(of(vendor(VendorStatus.ACTIVE, {
        documents: [{ id: 1 } as any], lifecycleHistory: [{ id: 9 } as any], riskAlerts: [{ id: 3 } as any]
      })));
      vendorService.getVendorDocuments.and.returnValue(of([]));
      vendorService.getVendorPerformance.and.returnValue(of({ metrics: {} } as any));
      vendorService.getLifecycleHistory.and.returnValue(of([]));
      vendorService.getRiskAlerts.and.returnValue(of([]));
    };

    it('shows the load error state when the vendor cannot be loaded', () => {
      vendorService.getVendorById.and.returnValue(throwError(() => new Error('404')));
      component.loadVendorData();
      expect(component.error).toBeTruthy();
      expect(component.vendor).toBeNull();
      expect(component.isLoading).toBeFalse();
    });

    it('a failing tab is reported (not shown as empty data) and the others still load', () => {
      loadOk();
      vendorService.getVendorPerformance.and.returnValue(throwError(() => new Error('500')));
      vendorService.getRiskAlerts.and.returnValue(throwError(() => new Error('500')));
      component.loadVendorData();

      expect(component.failedSections).toEqual(['performance', 'risk alerts']);
      expect(component.performance).toBeNull();
    });

    it('keeps the vendor\'s own documents/history/alerts when the dedicated endpoint fails', () => {
      loadOk();
      vendorService.getVendorDocuments.and.returnValue(throwError(() => new Error('500')));
      vendorService.getLifecycleHistory.and.returnValue(throwError(() => new Error('500')));
      vendorService.getRiskAlerts.and.returnValue(throwError(() => new Error('500')));
      component.loadVendorData();

      expect(component.documents.length).toBe(1);
      expect(component.lifecycleHistory.length).toBe(1);
      expect(component.riskAlerts.length).toBe(1);
      expect(component.failedSections).toContain('documents');
    });

    it('retrying clears the failure notice when the calls succeed', () => {
      loadOk();
      vendorService.getVendorPerformance.and.returnValue(throwError(() => new Error('500')));
      component.loadVendorData();
      expect(component.failedSections.length).toBe(1);

      vendorService.getVendorPerformance.and.returnValue(of({ metrics: {} } as any));
      component.loadRelatedData();
      expect(component.failedSections).toEqual([]);
    });
  });

  describe('status dropdown outside-click', () => {
    it('closes when a click reaches the document (the dropdown wrapper stops propagation for clicks inside it)', () => {
      component.showStatusDropdown = true;
      component.closeStatusDropdownOnOutsideClick();
      expect(component.showStatusDropdown).toBeFalse();
    });
  });

  describe('handleDocumentUpload (real progress, not simulated)', () => {
    const uploadEvent = { file: new File(['x'], 'tax.pdf'), category: 'REGISTRATION' as any, issueDate: new Date(), expiryDate: new Date() };

    it('tracks progress events as they arrive, then reloads on completion', () => {
      const upload$ = new Subject<any>();
      vendorService.uploadDocument.and.returnValue(upload$.asObservable());
      vendorService.getVendorDocuments.and.returnValue(of([]));
      vendorService.getVendorPerformance.and.returnValue(of({ metrics: {} } as any));
      vendorService.getLifecycleHistory.and.returnValue(of([]));
      vendorService.getRiskAlerts.and.returnValue(of([]));

      component.handleDocumentUpload(uploadEvent);
      expect(component.isUploadingDocument).toBeTrue();

      upload$.next({ type: 'progress', progress: 40 });
      expect(component.uploadProgress).toBe(40);
      expect(component.isUploadingDocument).toBeTrue(); // still in flight

      upload$.next({ type: 'complete', document: { id: 1 } });
      expect(component.isUploadingDocument).toBeFalse();
      expect(vendorService.getVendorDocuments).toHaveBeenCalled();
    });

    it('reports a server error and stops uploading without pretending it reloaded', () => {
      vendorService.uploadDocument.and.returnValue(throwError(() => new Error('500')));
      component.handleDocumentUpload(uploadEvent);

      expect(component.isUploadingDocument).toBeFalse();
      expect(component.uploadServerError).toBeTruthy();
    });
  });
});
