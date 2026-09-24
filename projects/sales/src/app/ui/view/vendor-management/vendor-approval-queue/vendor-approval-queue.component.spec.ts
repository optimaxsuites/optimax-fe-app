import { FormBuilder } from '@angular/forms';
import { fakeAsync, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

import { VendorApprovalQueueComponent } from './vendor-approval-queue.component';
import { VendorService } from '../../../service/vendor-management/vendor-management.service';
import { Vendor, VendorStatus } from '../../../domain/vendor-management/vendor-management.dto';

describe('VendorApprovalQueueComponent (approval logic)', () => {
  let component: VendorApprovalQueueComponent;
  let vendorService: jasmine.SpyObj<VendorService>;
  let messages: jasmine.Spy;

  const vendor = (over: Partial<Vendor> = {}): Vendor => ({
    id: 7, companyName: 'Acme Ltd', registrationNumber: 'RC1', taxId: 'T1', email: 'a@acme.example', phone: '0800',
    status: VendorStatus.PENDING_ONBOARDING, documents: [], ...over
  } as unknown as Vendor);

  const page = (vendors: Vendor[], total = vendors.length, totalPages = 1) =>
    of({ vendors, total, page: 1, limit: 20, totalPages });

  beforeEach(() => {
    vendorService = jasmine.createSpyObj<VendorService>('VendorService',
      ['updateVendorStatus', 'getVendors', 'getOnboardingCopilotSession', 'confirmExtractedField', 'getDashboardStats']);
    vendorService.getVendors.and.returnValue(page([]));
    vendorService.getOnboardingCopilotSession.and.returnValue(throwError(() => new Error('no copilot')));
    vendorService.getDashboardStats.and.returnValue(of({ pendingOnboarding: 15, pendingReview: 10 } as any));

    const messageService = new MessageService();
    messages = spyOn(messageService, 'add');
    component = new VendorApprovalQueueComponent(vendorService, { navigate: jasmine.createSpy('navigate') } as any, new FormBuilder(), messageService);
  });

  const open = (action: 'approve' | 'reject', v = vendor()) => component.openReviewModal(v, action);

  describe('rejecting', () => {
    it('requires a reason and sends nothing without one', () => {
      open('reject');
      component.reviewNotes = '   ';
      component.submitReview();

      expect(vendorService.updateVendorStatus).not.toHaveBeenCalled();
      expect(component.reviewError).toContain('reason');
      expect(component.showReviewModal).toBeTrue();
    });

    it('sets REJECTED (not INACTIVE) and sends the reason', () => {
      vendorService.updateVendorStatus.and.returnValue(of({} as Vendor));
      open('reject');
      component.reviewNotes = '  Forged CAC certificate ';
      component.submitReview();

      expect(vendorService.updateVendorStatus).toHaveBeenCalledOnceWith('7', VendorStatus.REJECTED, 'Forged CAC certificate');
      expect(component.showReviewModal).toBeFalse();
      expect(vendorService.getVendors).toHaveBeenCalled();     // list refreshed
    });

    it('a failed reject keeps the modal open, says nothing changed, and leaves the reason to retry', () => {
      vendorService.updateVendorStatus.and.returnValue(throwError(() => new Error('500')));
      open('reject');
      component.reviewNotes = 'Bad documents';
      component.submitReview();

      expect(component.showReviewModal).toBeTrue();
      expect(component.isProcessing).toBeFalse();
      expect(component.reviewError).toContain('Nothing was changed');
      expect(component.reviewNotes).toBe('Bad documents');
    });
  });

  describe('approving', () => {
    it('sends ACTIVE with the note and refreshes the queue', () => {
      vendorService.updateVendorStatus.and.returnValue(of({} as Vendor));
      open('approve');
      component.reviewNotes = 'All documents verified';
      component.submitReview();

      expect(vendorService.updateVendorStatus).toHaveBeenCalledOnceWith('7', VendorStatus.ACTIVE, 'All documents verified');
      expect(component.showReviewModal).toBeFalse();
      expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    });

    it('a failed approve does not close the modal and does not claim success', () => {
      vendorService.updateVendorStatus.and.returnValue(throwError(() => new Error('403')));
      open('approve');
      component.submitReview();

      expect(component.showReviewModal).toBeTrue();
      expect(component.reviewError).toContain('Nothing was changed');
      expect(messages).not.toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
    });

    it('asks before approving an application with missing details, and respects "no"', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      open('approve', vendor({ taxId: 'Pending', registrationNumber: 'Pending' }));
      component.submitReview();

      expect(window.confirm).toHaveBeenCalled();
      expect((window.confirm as jasmine.Spy).calls.mostRecent().args[0]).toContain('tax ID');
      expect(vendorService.updateVendorStatus).not.toHaveBeenCalled();
    });

    it('does not ask when the application is complete', () => {
      spyOn(window, 'confirm');
      vendorService.updateVendorStatus.and.returnValue(of({} as Vendor));
      open('approve');
      component.submitReview();
      expect(window.confirm).not.toHaveBeenCalled();
    });

    it('ignores a second submit while one is in flight', () => {
      open('approve');
      component.isProcessing = true;
      component.submitReview();
      expect(vendorService.updateVendorStatus).not.toHaveBeenCalled();
    });
  });

  describe('getMissingApprovalData', () => {
    it('treats placeholders and blanks as missing', () => {
      const missing = component.getMissingApprovalData(vendor({
        companyName: 'Pending Registration (ID: 7)', registrationNumber: 'Pending', taxId: '', email: 'Pending', phone: '  '
      }));
      expect(missing).toEqual(['company name', 'registration number', 'tax ID', 'email', 'phone']);
    });

    it('reports nothing for a complete application', () => {
      expect(component.getMissingApprovalData(vendor())).toEqual([]);
    });
  });

  describe('bulk actions', () => {
    beforeEach(() => {
      component.vendors = [vendor({ id: 1 }), vendor({ id: 2 }), vendor({ id: 3 })];
      [1, 2, 3].forEach(id => component.selectedVendors.add(id));
      spyOn(window, 'confirm').and.returnValue(true);
    });

    it('waits for every request, reports the partial failure, clears the selection and refreshes once', () => {
      vendorService.updateVendorStatus.and.callFake((id: string) =>
        id === '2' ? throwError(() => new Error('boom')) : of({} as Vendor));

      component.bulkAction('approve');

      expect(vendorService.updateVendorStatus).toHaveBeenCalledTimes(3);
      expect(component.isProcessing).toBeFalse();
      expect(component.selectedVendors.size).toBe(0);
      expect(vendorService.getVendors).toHaveBeenCalledTimes(1);
      expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: '2 vendor(s) approved.' }));
      expect(messages).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: jasmine.stringContaining('1 of 3') }));
    });

    it('bulk reject needs a reason and uses REJECTED', () => {
      const prompt = spyOn(window, 'prompt');
      prompt.and.returnValue('   ');
      component.bulkAction('reject');
      expect(vendorService.updateVendorStatus).not.toHaveBeenCalled();

      prompt.and.returnValue('Incomplete applications');
      vendorService.updateVendorStatus.and.returnValue(of({} as Vendor));
      component.bulkAction('reject');
      expect(vendorService.updateVendorStatus).toHaveBeenCalledTimes(3);
      expect(vendorService.updateVendorStatus).toHaveBeenCalledWith('1', VendorStatus.REJECTED, 'Incomplete applications');
    });

    it('ignores a click while a bulk action is already running', () => {
      component.isProcessing = true;
      component.bulkAction('approve');
      expect(vendorService.updateVendorStatus).not.toHaveBeenCalled();
    });
  });

  describe('loading and filters', () => {
    it('defaults to pending + under review', () => {
      component.loadPendingVendors();
      const filters = vendorService.getVendors.calls.mostRecent().args[2] as any;
      expect(filters.statuses).toEqual([VendorStatus.PENDING_ONBOARDING, VendorStatus.UNDER_REVIEW]);
    });

    it('the Status filter narrows the queue (sent as `statuses`, which the service honours)', () => {
      component.onStatusFilterChange(VendorStatus.UNDER_REVIEW);
      const filters = vendorService.getVendors.calls.mostRecent().args[2] as any;
      expect(filters.statuses).toEqual([VendorStatus.UNDER_REVIEW]);
      expect('status' in filters).toBeFalse();
    });

    it('the Tier filter is applied', () => {
      component.onTierFilterChange('PREFERRED');
      expect((vendorService.getVendors.calls.mostRecent().args[2] as any).tier).toBe('PREFERRED');
    });

    it('only offers statuses that can appear in this queue', () => {
      expect(component.queueStatuses).toEqual([VendorStatus.PENDING_ONBOARDING, VendorStatus.UNDER_REVIEW]);
    });

    it('steps back a page when the last vendor on a later page was processed', () => {
      component.currentPage = 2;
      vendorService.getVendors.and.returnValues(page([], 5, 1), page([vendor()], 5, 1));
      component.loadPendingVendors();

      expect(vendorService.getVendors).toHaveBeenCalledTimes(2);
      expect(vendorService.getVendors.calls.mostRecent().args[0]).toBe(1);
      expect(component.vendors.length).toBe(1);
    });

    it('shows an error (not an empty "all caught up" queue) when loading fails', () => {
      vendorService.getVendors.and.returnValue(throwError(() => new Error('down')));
      component.loadPendingVendors();
      expect(component.error).toContain('Could not load');
      expect(component.isLoading).toBeFalse();
    });
  });

  describe('header stats', () => {
    it('pending / under-review counts come from the dashboard endpoint, matching what the Registry queue itself covers', () => {
      (component as any).loadHeaderStats();
      expect(component.stats.pending).toBe(15);
      expect(component.stats.underReview).toBe(10);
    });

    it('a successful approve/reject refreshes the header stats too', () => {
      vendorService.updateVendorStatus.and.returnValue(of({} as Vendor));
      open('approve');
      component.submitReview();
      expect(vendorService.getDashboardStats).toHaveBeenCalled();
    });
  });

    describe('search after Clear', () => {
    it('retyping the same term right after Clear still triggers a search', fakeAsync(() => {
      (component as any).setupSearch();
      component.onSearchInput({ target: { value: 'acme' } } as any);
      tick(400);
      const afterFirstSearch = vendorService.getVendors.calls.count();

      component.clearSearch();
      const afterClear = vendorService.getVendors.calls.count();
      expect(afterClear).toBe(afterFirstSearch + 1);

      component.onSearchInput({ target: { value: 'acme' } } as any);
      tick(400);
      expect(vendorService.getVendors.calls.count()).toBe(afterClear + 1);
    }));
  });

  describe('recovering from an emptied page', () => {
    it('steps back a page after the last vendor on a later page is approved/rejected', () => {
      component.currentPage = 2;
      vendorService.getVendors.and.returnValues(
        page([], 5, 1),
        page([vendor()])
      );
      component.loadPendingVendors();

      expect(vendorService.getVendors).toHaveBeenCalledTimes(2);
      expect(component.currentPage).toBe(1);
      expect(component.filteredVendors.length).toBe(1);
    });
  });

    describe('AI review panel', () => {
    it('says it is unavailable when it cannot load — never shows another vendor\'s data', () => {
      open('approve');
      expect(component.copilotSession).toBeNull();
      expect(component.copilotUnavailable).toBeTrue();
      expect(component.isLoadingCopilot).toBeFalse();
    });

    it('ignores a late response for a vendor whose modal was closed', () => {
      const late = new Subject<any>();
      vendorService.getOnboardingCopilotSession.and.returnValue(late);
      open('approve', vendor({ id: 7 }));
      component.closeReviewModal();
      late.next({ id: 'stale', extractedFields: [] });
      expect(component.copilotSession).toBeNull();
    });
  });
});
