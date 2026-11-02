import { Subject, of } from 'rxjs';

import { ApprovalInboxComponent } from './approval-inbox/approval-inbox.component';
import { RequestForQuotationListComponent } from './request-for-quotation-list/request-for-quotation-list.component';

// The newest (id 60) deliberately isn't first, and sits past the first page: this is the order the
// backend really returns, and createdAt really comes back as a number of seconds.
const REQUESTS: any[] = [
  { id: 10, title: 'Old', procurementType: 'PRODUCT', createdAt: 1786360198 },
  { id: 2, title: 'Oldest', procurementType: 'SERVICE', createdAt: 1785394431 },
  { id: 58, title: 'Recent', procurementType: 'PRODUCT', createdAt: 1792000000 },
  { id: 60, title: 'Newest', procurementType: 'PRODUCT', createdAt: 1793000000 },
];

describe('Request for Quotations table order', () => {
  let component: any;
  let getRequests: jasmine.Spy;

  beforeEach(() => {
    getRequests = jasmine.createSpy('getRequests').and.callFake(() => of({ data: [...REQUESTS], totalElements: 4 }));
    component = Object.create(RequestForQuotationListComponent.prototype);
    Object.assign(component, {
      sortField: 'createdAt', sortAsc: false, currentPage: 0, pageSize: 2, selectedRequests: [],
      destroy$: new Subject<void>(),
      filterForm: { get: () => ({ value: null }) },
      procurementRequestService: { getRequests },
      loadDashboardData: () => {},
    });
    component.loadRequests();
  });

  const ids = () => component.allRows.map((r: any) => r.id);

  it('shows the newest requests first, even when the backend returns them later on', () => {
    expect(ids()).toEqual([60, 58]);
  });

  it('asks for every request, because the backend can\'t sort them', () => {
    expect(getRequests.calls.mostRecent().args[0].size).toBe(1000);
  });

  it('keeps going in the same order on the next page, without fetching again', () => {
    getRequests.calls.reset();
    component.onPageChange(1);
    expect(ids()).toEqual([10, 2]);
    expect(getRequests).not.toHaveBeenCalled();
  });

  it('counts every request for the paging controls', () => {
    expect(component.totalElements).toBe(4);
    expect(component.totalPages).toBe(2);
  });

  it('a column sort applies to every request, not only the visible page', () => {
    component.setSort('title');
    expect(ids()).toEqual([60, 10]);
  });

  it('a smaller result doesn\'t strand the table on a page that no longer exists', () => {
    component.onPageChange(1);
    getRequests.and.callFake(() => of({ data: [REQUESTS[0]], totalElements: 1 }));
    component.loadRequests();
    expect(component.currentPage).toBe(0);
    expect(ids()).toEqual([10]);
  });
});

describe('Request dates', () => {
  // What the backend really sends: 1 Aug 2026 09:49:58 UTC, and a deadline of midnight UTC on 10 Aug 2026.
  const CREATED = 1785577798.868622;
  const DEADLINE = 1786320000;

  [RequestForQuotationListComponent, ApprovalInboxComponent].forEach((type: any) => {
    describe(type.name, () => {
      const component = Object.create(type.prototype);

      it('reads seconds as the real date, not January 1970', () => {
        expect(component.formatDate(CREATED)).toContain('2026');
        expect(component.formatDate(CREATED)).toContain('Aug');
        expect(component.formatDate(CREATED)).not.toContain('1970');
      });

      it('shows the time on created dates', () => {
        expect(component.formatDate(CREATED)).toMatch(/\d:\d{2}/);
      });

      it('shows deadlines as the date alone, without shifting the day', () => {
        const text = component.formatDeadline(DEADLINE);
        expect(text).toContain('10');
        expect(text).toContain('Aug');
        expect(text).not.toMatch(/\d:\d{2}/);
      });

      it('still reads dates sent as text', () => {
        expect(component.formatDate('2026-06-01T12:00:00Z')).toContain('2026');
      });

      it('shows a placeholder instead of a wrong date when there is none', () => {
        expect(component.formatDate(null)).not.toContain('1970');
        expect(component.formatDeadline(undefined)).not.toContain('1970');
      });
    });
  });

  it('the deadline warning works with seconds', () => {
    const list = Object.create(RequestForQuotationListComponent.prototype);
    const inTwoDays = Date.now() / 1000 + 2 * 24 * 60 * 60;
    expect(list.isDeadlineSoon(inTwoDays)).toBeTrue();
    expect(list.isDeadlineSoon(Date.now() / 1000 + 30 * 24 * 60 * 60)).toBeFalse();
  });
});

describe('Approval inbox order', () => {
  let component: any;

  beforeEach(() => {
    component = Object.create(ApprovalInboxComponent.prototype);
    Object.assign(component, { requests: [...REQUESTS], filterType: 'ALL', searchTerm: '', currentPage: 0, pageSize: 10 });
  });

  describe('pagination', () => {
    const pagedIds = () => component.pagedRequests.map((r: any) => r.id);

    beforeEach(() => {
      component.pageSize = 2;
      component.applyFilters();
    });

    it('shows one page at a time, newest first', () => {
      expect(pagedIds()).toEqual([60, 58]);
      expect(component.totalPages).toBe(2);
      expect(component.pageRangeEnd).toBe(2);
    });

    it('shows the rest on the next page', () => {
      component.currentPage = 1;
      expect(pagedIds()).toEqual([10, 2]);
      expect(component.pageRangeEnd).toBe(4);
    });

    it('a new filter goes back to the first page', () => {
      component.currentPage = 1;
      component.filterType = 'PRODUCT';
      component.applyFilters();
      expect(component.currentPage).toBe(0);
      expect(pagedIds()).toEqual([60, 58]);
    });

    it('reloading after an approval keeps the reviewer on the same page', () => {
      component.currentPage = 1;
      component.requests = REQUESTS.filter(r => r.id !== 60);
      component.refreshList();
      expect(component.currentPage).toBe(1);
      expect(pagedIds()).toEqual([2]);
    });

    it('moves back a page if approving the last request emptied this one', () => {
      component.currentPage = 1;
      component.requests = [REQUESTS[3]];
      component.refreshList();
      expect(component.currentPage).toBe(0);
      expect(pagedIds()).toEqual([60]);
    });
  });

  const ids = () => component.filtered.map((r: any) => r.id);

  it('shows the newest requests first', () => {
    component.applyFilters();
    expect(ids()).toEqual([60, 58, 10, 2]);
  });

  it('stays newest first when filtered', () => {
    component.filterType = 'PRODUCT';
    component.applyFilters();
    expect(ids()).toEqual([60, 58, 10]);
  });

  it('handles dates sent as text too', () => {
    component.requests = [
      { id: 1, createdAt: '2026-01-01T00:00:00Z' },
      { id: 2, createdAt: '2026-06-01T00:00:00Z' },
    ];
    component.applyFilters();
    expect(ids()).toEqual([2, 1]);
  });
});
