import { FormBuilder } from '@angular/forms';

import { BranchTransferHistoryComponent } from './branch-transfer-history.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { MovementStatus, MovementType, StockMovement } from '../../../../domain/inventory/inventory.dto';

describe('BranchTransferHistoryComponent', () => {
  let component: BranchTransferHistoryComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const movement = (over: Partial<StockMovement> = {}): StockMovement => ({
    id: 1, productId: 'p1', productName: 'Product', sku: 'SKU1',
    movementType: MovementType.TRANSFER, status: MovementStatus.COMPLETED,
    quantity: 5, createdAt: new Date('2026-01-01'),
    fromLocation: { type: 'BRANCH', id: 'b1', name: 'Branch 1' } as any,
    toLocation: { type: 'BRANCH', id: 'b2', name: 'Branch 2' } as any,
    ...over
  } as StockMovement);

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getMovements']);
    component = new BranchTransferHistoryComponent(inventoryService, { navigate: jasmine.createSpy('navigate') } as any, new FormBuilder());
    component.branchId = 'b1';
  });

  it('re-filters by branch client-side, so a backend outage cannot leak another branch\'s movements into the fallback list', () => {
    component.movements = [
      movement({ id: 1, fromLocation: { type: 'BRANCH', id: 'b1', name: 'Branch 1' } as any, toLocation: { type: 'BRANCH', id: 'b2', name: 'Branch 2' } as any }),
      movement({ id: 2, fromLocation: { type: 'BRANCH', id: 'other', name: 'Other' } as any, toLocation: { type: 'BRANCH', id: 'another', name: 'Another' } as any })
    ];

    component.applyFilters();

    expect(component.filteredMovements.length).toBe(1);
    expect(component.filteredMovements[0].id).toBe(1);
  });

  it('excludes cancelled movements from total/incoming/outgoing but still counts them separately', () => {
    component.movements = [
      movement({ id: 1, status: MovementStatus.COMPLETED, toLocation: { type: 'BRANCH', id: 'b1', name: 'Branch 1' } as any }),
      movement({ id: 2, status: MovementStatus.CANCELLED, toLocation: { type: 'BRANCH', id: 'b1', name: 'Branch 1' } as any })
    ];

    component.calculateStats();

    expect(component.stats.total).toBe(1);
    expect(component.stats.incoming).toBe(1);
    expect(component.stats.cancelled).toBe(1);
  });
});
