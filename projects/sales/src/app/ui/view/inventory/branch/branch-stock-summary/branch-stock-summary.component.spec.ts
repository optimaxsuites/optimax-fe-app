import { of } from 'rxjs';
import { SimpleChange } from '@angular/core';

import { BranchStockSummaryComponent } from './branch-stock-summary.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { BranchStockSummary } from '../../../../domain/inventory/inventory.dto';

describe('BranchStockSummaryComponent', () => {
  let component: BranchStockSummaryComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let router: jasmine.SpyObj<any>;

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getBranchAnalytics']);
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

  it('reloads the summary when branchId changes on a persistent instance', () => {
    inventoryService.getBranchAnalytics.and.returnValue(of({ branchId: '99' } as BranchStockSummary));
    component.branchId = '99';

    component.ngOnChanges({ branchId: new SimpleChange('42', '99', false) });

    expect(inventoryService.getBranchAnalytics).toHaveBeenCalledWith('99');
  });

  it('does not reload on the initial binding (ngOnInit already handles first load)', () => {
    component.ngOnChanges({ branchId: new SimpleChange(undefined, '42', true) });
    expect(inventoryService.getBranchAnalytics).not.toHaveBeenCalled();
  });
});
