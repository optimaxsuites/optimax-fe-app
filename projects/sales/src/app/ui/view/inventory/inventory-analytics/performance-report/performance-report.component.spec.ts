import { FormBuilder } from '@angular/forms';

import { PerformanceReportComponent } from './performance-report.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { Branch, BranchInventory, ProductPerformance } from '../../../../domain/inventory/inventory.dto';

describe('PerformanceReportComponent', () => {
  let component: PerformanceReportComponent;

  const inventoryItem = (over: Partial<BranchInventory> = {}): BranchInventory => ({
    branchId: 'b1', productId: 'p1', productName: 'Product 1', sku: 'SKU1',
    quantity: 10, sellingPrice: 100, costPrice: 50, reorderPoint: 5, safetyStock: 2,
    ...over
  } as BranchInventory);

  beforeEach(() => {
    const inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getBranches', 'getProducts', 'getMovements']);
    const route = { params: { pipe: () => ({ subscribe: () => { } }) } } as any;
    component = new PerformanceReportComponent(
      inventoryService, { navigate: jasmine.createSpy('navigate') } as any, route,
      { back: jasmine.createSpy('back') } as any, new FormBuilder(),
      { add: jasmine.createSpy('add') } as any
    );

    component.branches = [
      { id: 'b1', name: 'Lagos Main' } as unknown as Branch,
      { id: 'b2', name: 'Abuja Branch' } as unknown as Branch
    ];
    component.inventory = [
      inventoryItem({ branchId: 'b1', quantity: 5, sellingPrice: 100 }), // stock value 500
      inventoryItem({ branchId: 'b2', quantity: 50, sellingPrice: 100 }) // stock value 5000
    ];
    component.performance = [
      { productId: 'p1', productName: 'Product 1' } as unknown as ProductPerformance
    ];
    component.movements = [];
    component.products = [];
  });

  const formValue = () => ({
    name: 'Test Report', type: 'SUMMARY', format: 'PDF',
    dateRangeStart: '2026-01-01', dateRangeEnd: '2026-01-31',
    branches: [], products: [], categories: [],
    includeSummary: true, includeCharts: false, includeTables: false, includeRecommendations: false, includeDetails: false
  });

  it('labels the branch metric honestly as stock value, not a fabricated sales performance figure', () => {
    const result = (component as any).generateReportData(formValue());
    // b2 has the higher quantity*sellingPrice (stock value), so it should win the metric.
    expect(result.metadata.highestStockValueBranch).toBe('Abuja Branch');
  });

  it('attributes a generated report to the real signed-in user, not a hardcoded "Admin"', () => {
    sessionStorage.setItem('fullname', 'Grace Hopper');
    const result = (component as any).generateReportData(formValue());
    expect(result.config.createdBy).toBe('Grace Hopper');
    sessionStorage.clear();
  });
});
