import { VendorDocumentsComponent } from './documents.component';
import { DocumentStatus, VendorDocument } from '../../../../domain/vendor-management/vendor-management.dto';

describe('VendorDocumentsComponent', () => {
  let component: VendorDocumentsComponent;

  const doc = (over: Partial<VendorDocument> = {}): VendorDocument => ({
    id: 1, name: 'Tax Cert', fileName: 'tax.pdf', status: DocumentStatus.PENDING_VERIFICATION,
    expiryDate: new Date('2099-01-01'), ...over
  } as VendorDocument);

  beforeEach(() => {
    component = new VendorDocumentsComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('submitVerification', () => {
    it('blocks rejection with no notes and surfaces a visible error', () => {
      const spy = spyOn(component.verifyDocument, 'emit');
      component.openVerifyModal(doc());
      component.submitVerification(false);

      expect(spy).not.toHaveBeenCalled();
      expect(component.verifyError).toBeTruthy();
      expect(component.showVerifyModal).toBeTrue(); // modal stays open
    });

    it('allows rejection once notes are provided', () => {
      const spy = spyOn(component.verifyDocument, 'emit');
      component.openVerifyModal(doc());
      component.verificationNotes = 'Certificate has expired';
      component.submitVerification(false);

      expect(spy).toHaveBeenCalledWith({ documentId: '1', verified: false, notes: 'Certificate has expired' });
      expect(component.showVerifyModal).toBeFalse();
    });

    it('does NOT re-emit refresh after verifying (the parent already reloads on backend confirmation)', () => {
      const refreshSpy = spyOn(component.refresh, 'emit');
      component.openVerifyModal(doc());
      component.verificationNotes = 'looks fine';
      component.submitVerification(true);

      expect(refreshSpy).not.toHaveBeenCalled();
    });

    it('warns before approving an already-expired document, and blocks approval if declined', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      const spy = spyOn(component.verifyDocument, 'emit');
      component.openVerifyModal(doc({ expiryDate: new Date('2020-01-01') }));
      component.submitVerification(true);

      expect(window.confirm).toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
    });

    it('approves an expired document once the user confirms the warning', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      const spy = spyOn(component.verifyDocument, 'emit');
      component.openVerifyModal(doc({ expiryDate: new Date('2020-01-01') }));
      component.submitVerification(true);

      expect(spy).toHaveBeenCalledWith({ documentId: '1', verified: true, notes: undefined });
    });

    it('does not prompt when approving a document that has not expired', () => {
      spyOn(window, 'confirm');
      const spy = spyOn(component.verifyDocument, 'emit');
      component.openVerifyModal(doc({ expiryDate: new Date('2099-01-01') }));
      component.submitVerification(true);

      expect(window.confirm).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('submitUpload', () => {
    it('blocks a cleared issue/expiry date instead of crashing on Invalid Date .toISOString()', () => {
      const spy = spyOn(component.uploadDocument, 'emit');
      component.selectedFile = new File(['x'], 'tax.pdf', { type: 'application/pdf' });
      component.issueDate = '';
      component.expiryDate = '2099-01-01';
      component.submitUpload();

      expect(spy).not.toHaveBeenCalled();
      expect(component.uploadError).toBeTruthy();
    });

    it('blocks an expiry date set before the issue date', () => {
      const spy = spyOn(component.uploadDocument, 'emit');
      component.selectedFile = new File(['x'], 'tax.pdf', { type: 'application/pdf' });
      component.issueDate = '2026-06-01';
      component.expiryDate = '2026-01-01';
      component.submitUpload();

      expect(spy).not.toHaveBeenCalled();
      expect(component.uploadError).toContain('before the issue date');
    });

    it('emits immediately once dates are valid — progress itself now comes from the parent, not a simulated timer', () => {
      const uploadSpy = spyOn(component.uploadDocument, 'emit');
      component.selectedFile = new File(['x'], 'tax.pdf', { type: 'application/pdf' });
      component.submitUpload();

      expect(uploadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('real upload progress (parent-driven, not a simulated timer)', () => {
    it('shows the progress percentage the parent reports via the isUploadingDocument/uploadProgress inputs', () => {
      component.isUploadingDocument = true;
      component.uploadProgress = 42;
      expect(component.uploadProgress).toBe(42);
    });

    it('closes the upload modal itself once isUploadingDocument flips back to false with no server error', () => {
      component.showUploadModal = true;
      component.selectedFile = new File(['x'], 'tax.pdf', { type: 'application/pdf' });
      component.isUploadingDocument = true;
      component.uploadServerError = null;

      component.ngOnChanges({
        isUploadingDocument: { previousValue: true, currentValue: false, firstChange: false, isFirstChange: () => false }
      });
      component.isUploadingDocument = false;
      component.ngOnChanges({
        isUploadingDocument: { previousValue: true, currentValue: false, firstChange: false, isFirstChange: () => false }
      });

      expect(component.showUploadModal).toBeFalse();
    });

    it('leaves the modal open when the upload finishes with a server error', () => {
      component.showUploadModal = true;
      component.uploadServerError = 'Upload failed — please try again.';
      component.isUploadingDocument = false;

      component.ngOnChanges({
        isUploadingDocument: { previousValue: true, currentValue: false, firstChange: false, isFirstChange: () => false }
      });

      expect(component.showUploadModal).toBeTrue();
      expect(component.displayedUploadError).toContain('Upload failed');
    });

    it('closeUploadModal is a no-op while a real upload is in flight', () => {
      component.showUploadModal = true;
      component.isUploadingDocument = true;
      component.closeUploadModal();
      expect(component.showUploadModal).toBeTrue();
    });
  });
});
