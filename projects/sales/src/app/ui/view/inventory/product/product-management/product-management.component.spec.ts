import { of } from 'rxjs';

import { ProductManagementComponent } from './product-management.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';

describe('ProductManagementComponent', () => {
  let component: ProductManagementComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const page = (data: any[], total: number) => of({ data, total, page: 0, limit: 10, totalPages: 1 });

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getProducts']);
    component = new ProductManagementComponent(
      { add: jasmine.createSpy('add') } as any,
      inventoryService,
      { navigate: jasmine.createSpy('navigate') } as any,
      { snapshot: { queryParams: {} } } as any
    );
  });

  describe('onPageChange / onPageSizeChange: keeping currentPage/pageSize in sync', () => {
    it('updates currentPage, not just filters.page', () => {
      component.onPageChange(2);
      expect(component.currentPage).toBe(2);
      expect(component.filters.page).toBe(2);
    });

    it('resets currentPage to 0 and updates pageSize on a page-size change', () => {
      component.currentPage = 3;
      component.onPageSizeChange(50);
      expect(component.currentPage).toBe(0);
      expect(component.pageSize).toBe(50);
    });
  });

  describe('loadHeaderStats: real catalog-wide counts, not just the current page', () => {
    it('pulls each status count from its own catalog-wide query instead of the current page slice', () => {
      inventoryService.getProducts.and.callFake((filters: any) => {
        if (filters.status === 'ACTIVE') return page([], 120);
        if (filters.status === 'OUT_OF_STOCK') return page([], 7);
        if (filters.status === 'DISCONTINUED') return page([], 3);
        // The "ALL" catalog-wide fetch, used for the true total and totalValue.
        return page([{ unitPrice: 100, stockQuantity: 2 }, { unitPrice: 50, stockQuantity: 1 }], 130);
      });

      (component as any).loadHeaderStats();

      expect(component.stats.active).toBe(120);
      expect(component.stats.outOfStock).toBe(7);
      expect(component.stats.discontinued).toBe(3);
      expect(component.stats.total).toBe(130);
      expect(component.stats.totalValue).toBe(250); // 100*2 + 50*1
    });
  });
});
