import { BranchStockSummaryComponent } from './branch-stock-summary.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { BranchStockSummary } from '../../../../domain/inventory/inventory.dto';

describe('BranchStockSummaryComponent', () => {
  let component: BranchStockSummaryComponent;
  let router: jasmine.SpyObj<any>;

  beforeEach(() => {
    const inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getBranchAnalytics']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    component = new BranchStockSummaryComponent(inventoryService, router);
    component.summary = { branchId: '42', branchName: 'Lagos Main' } as BranchStockSummary;
  });

  it('navigateToBranch actually navigates instead of being a no-op stub', () => {
    component.navigateToBranch();
    expect(router.navigate).toHaveBeenCalledWith(['/admin/sales/commerce/inventory/branches', '42']);
  });

  it('navigateToInventory navigates to the branch, deep-linked to its inventory tab', () => {
    component.navigateToInventory();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/admin/sales/commerce/inventory/branches', '42'],
      { queryParams: { tab: 'inventory' } }
    );
  });

  it('does nothing if the summary has not loaded yet (nothing to navigate to)', () => {
    component.summary = null;
    component.navigateToBranch();
    component.navigateToInventory();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
