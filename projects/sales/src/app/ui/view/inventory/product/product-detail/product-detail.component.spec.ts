import { of } from 'rxjs';

import { ProductDetailComponent } from './product-detail.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { Branch, BranchInventory } from '../../../../domain/inventory/inventory.dto';

describe('ProductDetailComponent', () => {
  let component: ProductDetailComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getBranches', 'getBranchInventory']);
    component = new ProductDetailComponent(
      inventoryService,
      { navigate: jasmine.createSpy('navigate') } as any,
      { snapshot: { paramMap: { get: () => 'p1' } } } as any,
      { back: jasmine.createSpy('back') } as any
    );
    component.productId = 'p1';
  });

  it('loadBranchesAndInventory fetches the branch list once and reuses it, instead of calling getBranches() twice', () => {
    inventoryService.getBranches.and.returnValue(of([{ id: 'b1', name: 'Branch 1' } as unknown as Branch]));
    inventoryService.getBranchInventory.and.returnValue(of([{ productId: 'p1', branchId: 'b1' } as BranchInventory]));

    component.loadBranchesAndInventory();

    expect(inventoryService.getBranches).toHaveBeenCalledTimes(1);
    expect(component.branches.length).toBe(1);
    expect(component.branchInventory.length).toBe(1);
  });

  it('resets branchInventory before repopulating, so a refresh does not duplicate rows', () => {
    inventoryService.getBranches.and.returnValue(of([{ id: 'b1', name: 'Branch 1' } as unknown as Branch]));
    inventoryService.getBranchInventory.and.returnValue(of([{ productId: 'p1', branchId: 'b1' } as BranchInventory]));

    component.loadBranchesAndInventory();
    component.loadBranchesAndInventory();

    expect(component.branchInventory.length).toBe(1);
  });
});
