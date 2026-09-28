import { FormBuilder } from '@angular/forms';

import { StockTurnoverComponent } from './stock-turnover.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';

describe('StockTurnoverComponent', () => {
  let component: StockTurnoverComponent;

  beforeEach(() => {
    const inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getProducts']);
    component = new StockTurnoverComponent(
      inventoryService,
      { navigate: jasmine.createSpy('navigate') } as any,
      { snapshot: { queryParams: {} } } as any,
      { back: jasmine.createSpy('back') } as any,
      new FormBuilder()
    );
  });

  it('treats a fully sold-out product as HIGH velocity, not the same 0 as a product that never sold anything', () => {
    component.products = [{ id: 'p1', name: 'Hot Seller', sku: 'HS-1', category: 'General' } as any];
    component.branchInventory = []; // zero stock anywhere — completely sold out
    component.performanceData = [{ productId: 'p1', totalSold: 40 } as any];

    (component as any).generateTurnoverData();

    const row = component.turnoverData.find(r => r.productId === 'p1')!;
    expect(row.turnoverRate).toBeGreaterThan(0);
    expect(row.sellThroughRate).toBe(100);
    expect(row.velocity).toBe('HIGH');
  });

  it('still reports 0 turnover for a product with zero stock AND zero sales (genuinely dead, not sold out)', () => {
    component.products = [{ id: 'p2', name: 'Dead Stock', sku: 'DS-1', category: 'General' } as any];
    component.branchInventory = [];
    component.performanceData = [];

    (component as any).generateTurnoverData();

    const row = component.turnoverData.find(r => r.productId === 'p2')!;
    expect(row.turnoverRate).toBe(0);
    expect(row.sellThroughRate).toBe(0);
  });

  it('defaults trend to STABLE (not a random UP/DOWN) when there is no real performance data for a product', () => {
    component.products = [{ id: 'p3', name: 'Unranked Product', sku: 'UP-1', category: 'General' } as any];
    component.branchInventory = [{ productId: 'p3', branchId: 'b1', quantity: 10, reorderPoint: 2, sellingPrice: 10 } as any];
    component.performanceData = []; // not in the top-100 performance list

    (component as any).generateTurnoverData();

    const row = component.turnoverData.find(r => r.productId === 'p3')!;
    expect(row.trend).toBe('STABLE');
  });
});
