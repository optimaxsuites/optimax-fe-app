import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { InventoryService } from './inventory.service';
import { MovementStatus, MovementType } from '../../domain/inventory/inventory.dto';
import { environment } from '../../shared-component/service/environments/environment';

const BASE = environment.apiBaseUrl + '/x/api/v2/commerce';

describe('InventoryService', () => {
  let service: InventoryService;
  let http: HttpTestingController;

  const inject = () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(InventoryService);
    http = TestBed.inject(HttpTestingController);
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    // getDashboardData forkJoins two requests; when one errors, forkJoin cancels the other
    // rather than waiting for it.
    http?.verify({ ignoreCancelled: true });
    localStorage.clear();
  });

  it('should be created', () => {
    inject();
    expect(service).toBeTruthy();
  });

  describe('constructor: dashboard backfill', () => {
    it('does not overwrite real cached branchSummaries/recentMovements on a later app load', () => {
      const realDashboard = {
        stats: {}, alerts: [], branchSummaries: [{ branchId: '99', branchName: 'Real Branch' }],
        recentMovements: [{ id: 999, productName: 'Real Movement' }], quickActions: [], topProducts: []
      };
      localStorage.setItem('inventory_dashboard', JSON.stringify(realDashboard));

      inject();

      const stored = JSON.parse(localStorage.getItem('inventory_dashboard') as string);
      expect(stored.branchSummaries[0].branchName).toBe('Real Branch');
      expect(stored.recentMovements[0].productName).toBe('Real Movement');
    });

    it('still backfills when branchSummaries/recentMovements are genuinely empty', () => {
      const emptyDashboard = { stats: {}, alerts: [], branchSummaries: [], recentMovements: [], quickActions: [], topProducts: [] };
      localStorage.setItem('inventory_dashboard', JSON.stringify(emptyDashboard));

      inject();

      const stored = JSON.parse(localStorage.getItem('inventory_dashboard') as string);
      expect(stored.branchSummaries.length).toBeGreaterThan(0);
      expect(stored.recentMovements.length).toBeGreaterThan(0);
    });
  });

  describe('dashboard read methods: real data, no crash on an empty cache', () => {
    beforeEach(inject);

    it('getDashboardAlerts does a real fetch instead of only reading the (possibly stale/absent) cache', () => {
      let result: any;
      service.getDashboardAlerts().subscribe(r => (result = r));
      http.expectOne(`${BASE}/inventory/alerts?tenantId=optimax`).flush([{ id: 1, type: 'LOW_STOCK' }]);
      expect(result.length).toBe(1);
    });

    it('getRecentMovements does a real fetch, most-recent-first, respecting the limit', () => {
      let result: any;
      service.getRecentMovements(5).subscribe(r => (result = r));
      http.expectOne(r => r.url === `${BASE}/inventory/movements`).flush([
        { id: 1, createdAt: '2026-01-01T00:00:00Z' },
        { id: 2, createdAt: '2026-01-02T00:00:00Z' }
      ]);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe(2); // most recent first
    });

    it('getQuickActions does not crash before any dashboard load has happened', () => {
      let result: any;
      service.getQuickActions().subscribe(r => (result = r));
      expect(result).toEqual([]);
    });
  });

  describe('getDashboardData: real Top Products, not a permanently frozen cache copy', () => {
    beforeEach(inject);

    it('merges live getTopProducts() data into the dashboard response', () => {
      let result: any;
      service.getDashboardData().subscribe(r => (result = r));

      http.expectOne(r => r.url === `${BASE}/inventory/dashboard`).flush({
        stats: { lastUpdated: '2026-01-01T00:00:00Z' }, alerts: [], recentMovements: [], branchSummaries: [], quickActions: []
      });
      http.expectOne(r => r.url === `${BASE}/inventory/dashboard/product-performance`).flush([
        { productId: '1', productName: 'Real Top Product', totalSold: 500 }
      ]);

      expect(result.topProducts.length).toBe(1);
      expect(result.topProducts[0].productName).toBe('Real Top Product');
    });
  });

  describe('updateMovement: completing a TRANSFER actually requires enough stock', () => {
    beforeEach(inject);

    const seedMovement = (id: number) => {
      localStorage.setItem('inventory_movements', JSON.stringify([{
        id, status: MovementStatus.IN_TRANSIT, movementType: MovementType.TRANSFER, quantity: 10,
        productId: 'p1', fromLocation: { type: 'BRANCH', id: 'b1' }, toLocation: { type: 'BRANCH', id: 'b2' }
      }]));
    };

    it('refuses to mark a transfer Completed when the source branch does not have enough stock', () => {
      seedMovement(1);
      localStorage.setItem('inventory_branch_inventory', JSON.stringify([
        { branchId: 'b1', productId: 'p1', quantity: 3, reorderPoint: 1, safetyStock: 1, sellingPrice: 0, costPrice: 0 }
      ]));

      let error: any;
      service.updateMovement(1, { status: MovementStatus.COMPLETED }).subscribe({ error: e => (error = e) });
      http.expectOne(r => r.url === `${BASE}/inventory/movements/1/status`).flush('boom', { status: 500, statusText: 'e' });

      expect(error).toBeTruthy();
      expect(error.message).toContain('Cannot mark this transfer Completed');
      // The movement must NOT have been silently marked Completed in local storage either.
      const stored = JSON.parse(localStorage.getItem('inventory_movements') as string);
      expect(stored[0].status).not.toBe(MovementStatus.COMPLETED);
    });

    it('completes and adjusts real stock when the source branch has enough', () => {
      seedMovement(2);
      localStorage.setItem('inventory_products', JSON.stringify([{ id: 'p1', sku: 'p1', name: 'Product 1' }]));
      localStorage.setItem('inventory_branch_inventory', JSON.stringify([
        { id: 101, branchId: 'b1', productId: 'p1', quantity: 50, reorderPoint: 1, safetyStock: 1, sellingPrice: 0, costPrice: 0 },
        { id: 102, branchId: 'b2', productId: 'p1', quantity: 5, reorderPoint: 1, safetyStock: 1, sellingPrice: 0, costPrice: 0 }
      ]));

      let result: any;
      service.updateMovement(2, { status: MovementStatus.COMPLETED }).subscribe(r => (result = r));
      http.expectOne(r => r.url === `${BASE}/inventory/movements/2/status`).flush('boom', { status: 500, statusText: 'e' });

      expect(result.status).toBe(MovementStatus.COMPLETED);

      // applyTransferStockAdjustment() fires two real writes (decrement source, increment dest).
      const sourceReq = http.expectOne(`${BASE}/inventory/stock/101`);
      expect(sourceReq.request.body.quantity).toBe(40); // 50 - 10
      sourceReq.flush(sourceReq.request.body);

      const destReq = http.expectOne(`${BASE}/inventory/stock/102`);
      expect(destReq.request.body.quantity).toBe(15); // 5 + 10
      destReq.flush(destReq.request.body);
    });
  });

  describe('approveRestockRequest / rejectRestockRequest: real signed-in user, not a hardcoded actor', () => {
    beforeEach(() => {
      inject();
      sessionStorage.setItem('userid', 'usr-99');
      sessionStorage.setItem('fullname', 'Grace Hopper');
    });

    afterEach(() => sessionStorage.clear());

    it('approve attributes the action to the real session user', () => {
      service.approveRestockRequest(1, 'Looks good').subscribe();
      const req = http.expectOne(`${BASE}/inventory/restock-requests/1/status`);
      expect(req.request.body.approvedById).toBe('usr-99');
      expect(req.request.body.approvedByName).toBe('Grace Hopper');
      req.flush({ id: 1 });
    });

    it('reject attributes the action to the real session user', () => {
      service.rejectRestockRequest(1, 'Not enough budget').subscribe();
      const req = http.expectOne(`${BASE}/inventory/restock-requests/1/status`);
      expect(req.request.body.approvedById).toBe('usr-99');
      expect(req.request.body.approvedByName).toBe('Grace Hopper');
      req.flush({ id: 1 });
    });
  });
});
