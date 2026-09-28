import { of } from 'rxjs';
import { StockMovementDetailComponent } from './stock-movement-detail.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { StockMovement, MovementStatus } from '../../../../domain/inventory/inventory.dto';

describe('StockMovementDetailComponent', () => {
  let component: StockMovementDetailComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const movement = (status: MovementStatus): StockMovement => ({ id: 1, status } as StockMovement);

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['updateMovement']);
    component = new StockMovementDetailComponent(
      inventoryService,
      { navigate: jasmine.createSpy('navigate') } as any,
      { snapshot: { paramMap: { get: () => null } } } as any,
      { back: jasmine.createSpy('back') } as any
    );
  });

  describe('canEdit', () => {
    it('only allows editing a still-PENDING movement (not an already-approved IN_TRANSIT one)', () => {
      component.movement = movement(MovementStatus.PENDING);
      expect(component.canEdit()).toBeTrue();

      component.movement = movement(MovementStatus.IN_TRANSIT);
      expect(component.canEdit()).toBeFalse();

      component.movement = movement(MovementStatus.COMPLETED);
      expect(component.canEdit()).toBeFalse();
    });
  });

  describe('statusOptions: restricted to valid transitions', () => {
    it('offers only IN_TRANSIT/CANCELLED for a PENDING movement — not a direct jump to COMPLETED', () => {
      component.movement = movement(MovementStatus.PENDING);
      const values = component.statusOptions.map(o => o.value);

      expect(values).toContain(MovementStatus.IN_TRANSIT);
      expect(values).toContain(MovementStatus.CANCELLED);
      expect(values).not.toContain(MovementStatus.COMPLETED);
    });

    it('offers COMPLETED only once a movement is already IN_TRANSIT (i.e. already approved)', () => {
      component.movement = movement(MovementStatus.IN_TRANSIT);
      const values = component.statusOptions.map(o => o.value);
      expect(values).toContain(MovementStatus.COMPLETED);
    });

    it('offers nothing for a terminal (COMPLETED/CANCELLED) movement', () => {
      component.movement = movement(MovementStatus.COMPLETED);
      expect(component.statusOptions.length).toBe(0);
    });
  });

  describe('updateStatus: defensive guard against an invalid transition', () => {
    it('refuses to send a PENDING -> COMPLETED update even if selectedStatus is somehow set to it', () => {
      component.movement = movement(MovementStatus.PENDING);
      component.selectedStatus = MovementStatus.COMPLETED;

      component.updateStatus();

      expect(inventoryService.updateMovement).not.toHaveBeenCalled();
      expect(component.error).toContain('Cannot move');
    });
  });

  describe('updateStatus: the "Note (Optional)" textarea is actually sent', () => {
    it('appends a typed note to the update payload instead of discarding it', () => {
      component.movement = movement(MovementStatus.PENDING);
      component.selectedStatus = MovementStatus.IN_TRANSIT;
      component.statusNote = 'Approved by warehouse lead';
      inventoryService.updateMovement.and.returnValue(of({ id: 1 } as any));

      component.updateStatus();

      expect(inventoryService.updateMovement).toHaveBeenCalledWith(1, jasmine.objectContaining({
        status: MovementStatus.IN_TRANSIT,
        notes: jasmine.stringContaining('Approved by warehouse lead')
      }));
    });

    it('preserves the movement\'s existing notes rather than overwriting them with the new note', () => {
      component.movement = { id: 1, status: MovementStatus.PENDING, notes: 'Original request notes' } as StockMovement;
      component.selectedStatus = MovementStatus.IN_TRANSIT;
      component.statusNote = 'Stock confirmed available';
      inventoryService.updateMovement.and.returnValue(of({ id: 1 } as any));

      component.updateStatus();

      const payload = inventoryService.updateMovement.calls.mostRecent().args[1] as any;
      expect(payload.notes).toContain('Original request notes');
      expect(payload.notes).toContain('Stock confirmed available');
    });

    it('leaves notes untouched when no note was typed', () => {
      component.movement = { id: 1, status: MovementStatus.PENDING, notes: 'Original request notes' } as StockMovement;
      component.selectedStatus = MovementStatus.IN_TRANSIT;
      component.statusNote = '';
      inventoryService.updateMovement.and.returnValue(of({ id: 1 } as any));

      component.updateStatus();

      expect(inventoryService.updateMovement).toHaveBeenCalledWith(1, jasmine.objectContaining({ notes: 'Original request notes' }));
    });
  });
});
