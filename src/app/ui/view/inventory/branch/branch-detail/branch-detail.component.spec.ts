import { Subject } from 'rxjs';

import { BranchDetailComponent } from './branch-detail.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { Branch, BranchInventory, BranchStockSummary, StockAlert, StockMovement } from '../../../../domain/inventory/inventory.dto';

describe('BranchDetailComponent', () => {
  let component: BranchDetailComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', [
      'getBranch', 'getBranchInventory', 'getBranchAnalytics', 'getDashboardAlerts', 'getRecentMovements'
    ]);
    inventoryService.getBranchInventory.and.returnValue(new Subject<BranchInventory[]>().asObservable());
    inventoryService.getBranchAnalytics.and.returnValue(new Subject<BranchStockSummary | null>().asObservable());
    inventoryService.getDashboardAlerts.and.returnValue(new Subject<StockAlert[]>().asObservable());
    inventoryService.getRecentMovements.and.returnValue(new Subject<StockMovement[]>().asObservable());
    component = new BranchDetailComponent(
      { params: new Subject(), queryParams: new Subject() } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      { back: jasmine.createSpy('back') } as any,
      inventoryService
    );
  });

  it('a slower response for a branch the user has since switched away from cannot overwrite the current one', () => {
    const branchA$ = new Subject<Branch>();
    const branchB$ = new Subject<Branch>();
    inventoryService.getBranch.and.returnValues(branchA$.asObservable(), branchB$.asObservable());

    component.branchId = 'A';
    component.loadBranchData(); // user opens branch A

    component.branchId = 'B';
    component.loadBranchData(); // user quickly switches to branch B before A's response lands

    // B's (later) request resolves first...
    branchB$.next({ id: 'B', name: 'Branch B' } as unknown as Branch);
    expect(component.branch?.name).toBe('Branch B');

    // ...then A's slower, now-stale response finally arrives. It must not un-set branch B.
    branchA$.next({ id: 'A', name: 'Branch A' } as unknown as Branch);
    expect(component.branch?.name).toBe('Branch B');
  });
});
