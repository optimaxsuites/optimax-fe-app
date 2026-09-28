import { of, throwError } from 'rxjs';

import { InventoryDashboardComponent } from './inventory-dashboard.component';
import { InventoryService } from '../../../service/inventory/inventory.service';

describe('InventoryDashboardComponent', () => {
  let component: InventoryDashboardComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const dashboardData = () => ({
    stats: {}, alerts: [], recentMovements: [], branchSummaries: [], quickActions: [], topProducts: []
  } as any);

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getDashboardData', 'getQuickActions', 'resolveAlert']);
    inventoryService.getQuickActions.and.returnValue(of([]));
    component = new InventoryDashboardComponent(inventoryService, { navigate: jasmine.createSpy('navigate') } as any);
  });

  it('hasLoadedOnce flips true after the first successful load, and stays true across a refresh', () => {
    inventoryService.getDashboardData.and.returnValue(of(dashboardData()));

    expect(component.hasLoadedOnce).toBeFalse();
    component.loadDashboardData();
    expect(component.hasLoadedOnce).toBeTrue();

    // A subsequent auto-refresh / manual refresh must not reset it back to false — that's what
    // used to tear the whole dashboard down into a full-page spinner on every 60s tick.
    component.loadDashboardData();
    expect(component.hasLoadedOnce).toBeTrue();
  });

  it('a failed load leaves hasLoadedOnce false on the very first attempt (so the loading state, not stale content, shows)', () => {
    inventoryService.getDashboardData.and.returnValue(throwError(() => new Error('500')));
    component.loadDashboardData();
    expect(component.hasLoadedOnce).toBeFalse();
    expect(component.isLoading).toBeFalse();
  });

  it('resolveAlert recomputes lowStockItems and outOfStockItems independently instead of folding one into the other', () => {
    inventoryService.resolveAlert.and.returnValue(of(undefined));
    component.alerts = [
      { id: 1, type: 'LOW_STOCK' } as any,
      { id: 2, type: 'OUT_OF_STOCK' } as any,
      { id: 3, type: 'OUT_OF_STOCK' } as any
    ];
    component.stats = { lowStockItems: 0, outOfStockItems: 0 } as any;

    component.resolveAlert(1);

    expect(component.stats!.lowStockItems).toBe(0);
    expect(component.stats!.outOfStockItems).toBe(2);
  });
});
