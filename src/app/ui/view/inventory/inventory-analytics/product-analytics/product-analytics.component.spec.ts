import { of } from 'rxjs';

import { ProductAnalyticsComponent } from './product-analytics.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { Branch } from '../../../../domain/inventory/inventory.dto';

describe('ProductAnalyticsComponent', () => {
  let component: ProductAnalyticsComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getBranches', 'getBranchInventory']);
    component = new ProductAnalyticsComponent(
      inventoryService,
      { navigate: jasmine.createSpy('navigate') } as any,
      { snapshot: { paramMap: { get: () => 'p1' } } } as any,
      { back: jasmine.createSpy('back') } as any
    );
    component.productId = 'p1';
  });

  it('loadBranchInventory reuses the already-loaded branch list instead of re-fetching it', () => {
    component.branches = [{ id: 'b1', name: 'Branch 1' } as unknown as Branch];
    inventoryService.getBranchInventory.and.returnValue(of([]));

    component.loadBranchInventory();

    expect(inventoryService.getBranches).not.toHaveBeenCalled();
    expect(inventoryService.getBranchInventory).toHaveBeenCalledWith('b1');
  });

  it('does not crash when branches is empty', () => {
    component.branches = [];

    expect(() => component.loadBranchInventory()).not.toThrow();
    expect(component.branchInventory).toEqual([]);
  });
});
