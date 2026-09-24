import { FormBuilder } from '@angular/forms';
import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { VendorManagementListComponent } from './vendor-management-list.component';
import { VendorService } from '../../../service/vendor-management/vendor-management.service';
import { Vendor, VendorStatus } from '../../../domain/vendor-management/vendor-management.dto';

describe('VendorManagementListComponent (load errors and bulk actions)', () => {
  let component: VendorManagementListComponent;
  let vendorService: jasmine.SpyObj<VendorService>;

  const vendor = (id: number): Vendor => ({ id, companyName: `Vendor ${id}`, status: VendorStatus.ACTIVE } as unknown as Vendor);
  const page = (vendors: Vendor[]) => of({ vendors, total: vendors.length, page: 1, limit: 20, totalPages: 1 });

  beforeEach(() => {
    vendorService = jasmine.createSpyObj<VendorService>('VendorService', [
      'getVendors', 'updateVendorStatus', 'deleteVendor', 'getRiskTrajectories', 'getFraudFlags', 'getDashboardStats'
    ]);
    vendorService.getVendors.and.returnValue(page([vendor(1), vendor(2), vendor(3)]));
    vendorService.getRiskTrajectories.and.returnValue(of([]));
    vendorService.getFraudFlags.and.returnValue(of([]));
    vendorService.getDashboardStats.and.returnValue(of({
      totalVendors: 200, activeVendors: 14, highRiskVendors: 1, vendorsByTier: { preferred: 3, approved: 10, conditional: 1 }
    } as any));
    component = new VendorManagementListComponent(vendorService, { navigate: jasmine.createSpy('navigate') } as any, new FormBuilder());
    spyOn(window, 'confirm').and.returnValue(true);
    [1, 2, 3].forEach(id => component.selectedVendors.add(id));
  });

  it('shows an error (not an empty directory) when the list cannot load, and clears it on success', () => {
    vendorService.getVendors.and.returnValue(throwError(() => new Error('500')));
    component.loadVendors();
    expect(component.error).toContain('Could not load');
    expect(component.isLoading).toBeFalse();

    vendorService.getVendors.and.returnValue(page([vendor(1)]));
    component.loadVendors();
    expect(component.error).toBeNull();
  });

  it('header stats come from the dashboard endpoint (real cross-dataset counts), not the current page', () => {
    (component as any).loadHeaderStats();
    expect(component.stats.total).toBe(200);
    expect(component.stats.active).toBe(14);
    expect(component.stats.preferred).toBe(3);
    expect(component.stats.highRisk).toBe(1);
  });

  it('refresh() reloads both the list and the header stats', () => {
    component.refresh();
    expect(vendorService.getVendors).toHaveBeenCalled();
    expect(vendorService.getDashboardStats).toHaveBeenCalled();
  });

    it('the Directory still only asks for approved-state vendors by default', () => {
    component.loadVendors();
    const filters = vendorService.getVendors.calls.mostRecent().args[2] as any;
    expect(filters.statuses).not.toContain(VendorStatus.PENDING_ONBOARDING);
    expect(filters.statuses).not.toContain(VendorStatus.UNDER_REVIEW);
  });

  describe('bulk actions', () => {
    it('bulk delete waits for all, reports the failures, does not drop failed rows locally, and reloads once', () => {
      vendorService.deleteVendor.and.callFake((id: string) => id === '2' ? throwError(() => new Error('x')) : of(void 0));
      component.vendors = [vendor(1), vendor(2), vendor(3)];
      component.filteredVendors = [vendor(1), vendor(2), vendor(3)];

      component.bulkAction('delete');

      expect(vendorService.deleteVendor).toHaveBeenCalledTimes(3);
      expect(vendorService.getVendors).toHaveBeenCalledTimes(1);
      expect(component.selectedVendors.size).toBe(0);
      expect(component.error).toContain('1 of 3');
      expect(component.error).toContain('deleted');
    });

    it('when every one fails it says none were changed', () => {
      vendorService.updateVendorStatus.and.returnValue(throwError(() => new Error('403')));
      component.bulkAction('suspend');
      expect(component.error).toContain('None of the 3');
    });

    it('a fully successful bulk suspend shows no error and sends SUSPENDED for each vendor', () => {
      vendorService.updateVendorStatus.and.returnValue(of({} as Vendor));
      component.bulkAction('suspend');
      expect(vendorService.updateVendorStatus).toHaveBeenCalledWith('1', VendorStatus.SUSPENDED);
      expect(vendorService.updateVendorStatus).toHaveBeenCalledWith('3', VendorStatus.SUSPENDED);
      expect(component.error).toBeNull();
    });

    it('declining the confirmation does nothing', () => {
      (window.confirm as jasmine.Spy).and.returnValue(false);
      component.bulkAction('delete');
      expect(vendorService.deleteVendor).not.toHaveBeenCalled();
      expect(component.selectedVendors.size).toBe(3);
    });

    it('confirms with a real verb ("activate"/"suspend"), not the bare status noun ("active"/"suspended")', () => {
      vendorService.updateVendorStatus.and.returnValue(of({} as Vendor));
      component.bulkAction('activate');
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to activate 3 vendor(s)?');

      [1, 2, 3].forEach(id => component.selectedVendors.add(id));
      component.bulkAction('suspend');
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to suspend 3 vendor(s)?');
    });
  });

  describe('search after Clear', () => {
    it('retyping the same term right after Clear still triggers a search (no distinctUntilChanged block)', fakeAsync(() => {
      (component as any).setupSearch();
      component.onSearchInput({ target: { value: 'acme' } } as any);
      tick(400);
      const afterFirstSearch = vendorService.getVendors.calls.count();

      component.clearSearch(); // a direct load — bypasses the search subject entirely
      const afterClear = vendorService.getVendors.calls.count();
      expect(afterClear).toBe(afterFirstSearch + 1);

      component.onSearchInput({ target: { value: 'acme' } } as any); // same term as before Clear
      tick(400);
      expect(vendorService.getVendors.calls.count()).toBe(afterClear + 1); // must not be swallowed
    }));
  });

  describe('recovering from an emptied page', () => {
    it('steps back a page instead of showing "No vendors found" while vendors remain on earlier pages', () => {
      component.currentPage = 2;
      vendorService.getVendors.and.returnValues(
        of({ vendors: [], total: 5, page: 2, limit: 20, totalPages: 1 }),
        page([vendor(1)])
      );
      component.loadVendors();

      expect(vendorService.getVendors).toHaveBeenCalledTimes(2);
      expect(component.currentPage).toBe(1);
      expect(component.filteredVendors.length).toBe(1);
    });

    it('does not loop when the whole result set is genuinely empty', () => {
      component.currentPage = 1;
      vendorService.getVendors.and.returnValue(of({ vendors: [], total: 0, page: 1, limit: 20, totalPages: 1 }));
      component.loadVendors();
      expect(vendorService.getVendors).toHaveBeenCalledTimes(1);
      expect(component.filteredVendors.length).toBe(0);
    });
  });

  describe('sorting by a Date field', () => {
    it('joinedDate actually reorders instead of always comparing equal', () => {
      const older = { ...vendor(1), joinedDate: new Date('2020-01-01') } as any;
      const newer = { ...vendor(2), joinedDate: new Date('2024-01-01') } as any;
      component.filteredVendors = [newer, older];
      component.sortField = 'joinedDate';
      component.sortDirection = 'asc';
      (component as any).sortVendors();
      expect(component.filteredVendors[0]).toBe(older);
      expect(component.filteredVendors[1]).toBe(newer);
    });

    it('a reload re-applies the active sort instead of silently reverting to server order', () => {
      component.sortField = 'companyName';
      component.sortDirection = 'desc';
      vendorService.getVendors.and.returnValue(page([vendor(1), vendor(3), vendor(2)]));
      component.loadVendors();
      const names = component.filteredVendors.map(v => v.companyName);
      expect(names).toEqual([...names].sort().reverse());
    });
  });

    it('a failed single delete is reported and the row is not removed', () => {
    vendorService.deleteVendor.and.returnValue(throwError(() => new Error('x')));
    component.deleteVendor(vendor(5));
    expect(component.error).toContain('Could not delete Vendor 5');
  });
});
