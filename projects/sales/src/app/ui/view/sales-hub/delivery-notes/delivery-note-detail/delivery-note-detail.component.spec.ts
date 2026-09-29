import { of, Subject } from 'rxjs';

import { DeliveryNoteDetailComponent } from './delivery-note-detail.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { DeliveryNote } from '../../../../domain/sales/sales.dto';

describe('DeliveryNoteDetailComponent', () => {
  let component: DeliveryNoteDetailComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const note = (over: Partial<DeliveryNote> = {}): DeliveryNote => ({
    id: 1, deliveryNumber: 'DN-1', status: 'PENDING', items: [], customerAddress: '', ...over
  } as DeliveryNote);

  const activatedRoute = (paramMap$: any = of({ get: () => null } as any)) => ({
    paramMap: paramMap$,
    snapshot: { paramMap: { get: () => null } }
  } as any);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['getDeliveryNoteById', 'updateDeliveryNoteStatus', 'getCustomers', 'getMyMerchantInfo']);
    salesService.getDeliveryNoteById.and.returnValue(of(null));
    salesService.getCustomers.and.returnValue(of({ data: [{ id: 1, name: 'Acme Co' }], total: 1 } as any));
    salesService.getMyMerchantInfo.and.returnValue(of({ id: 1, name: 'Merchant' } as any));
    component = new DeliveryNoteDetailComponent(
      activatedRoute(),
      { navigate: jasmine.createSpy('navigate') } as any,
      salesService,
      { add: jasmine.createSpy('add') } as any
    );
  });

  describe('status guards', () => {
    it('only a PENDING note can be edited or marked dispatched', () => {
      component.note = note({ status: 'PENDING' });
      expect(component.canEdit()).toBeTrue();
      expect(component.canMarkDispatched()).toBeTrue();
      expect(component.canMarkDelivered()).toBeFalse();
    });

    it('only a DISPATCHED note can be marked delivered', () => {
      component.note = note({ status: 'DISPATCHED' });
      expect(component.canEdit()).toBeFalse();
      expect(component.canMarkDispatched()).toBeFalse();
      expect(component.canMarkDelivered()).toBeTrue();
    });

    it('a DELIVERED note allows none of these actions', () => {
      component.note = note({ status: 'DELIVERED' });
      expect(component.canEdit()).toBeFalse();
      expect(component.canMarkDispatched()).toBeFalse();
      expect(component.canMarkDelivered()).toBeFalse();
    });
  });

  describe('updateStatus', () => {
    it('updates the local note status on success', () => {
      component.note = note({ id: 1, status: 'PENDING' });
      salesService.updateDeliveryNoteStatus.and.returnValue(of(note({ id: 1, status: 'DISPATCHED' })));

      component.updateStatus('DISPATCHED');

      expect(salesService.updateDeliveryNoteStatus).toHaveBeenCalledWith(1, 'DISPATCHED');
      expect(component.note?.status).toBe('DISPATCHED');
      expect(component.isUpdatingStatus).toBeFalse();
    });
  });

  describe('navigation staleness: reloads when the route id actually changes', () => {
    it('calls getDeliveryNoteById again for a second id pushed through the same paramMap subscription', () => {
      const paramMap$ = new Subject<any>();
      salesService.getDeliveryNoteById.and.returnValue(of(note({ id: 1 })));
      const c = new DeliveryNoteDetailComponent(
        activatedRoute(paramMap$.asObservable()),
        { navigate: jasmine.createSpy('navigate') } as any,
        salesService,
        { add: jasmine.createSpy('add') } as any
      );

      c.ngOnInit();
      paramMap$.next({ get: () => '1' } as any);
      expect(salesService.getDeliveryNoteById).toHaveBeenCalledWith('1');

      paramMap$.next({ get: () => '2' } as any);
      expect(salesService.getDeliveryNoteById).toHaveBeenCalledWith('2');
      expect(salesService.getDeliveryNoteById).toHaveBeenCalledTimes(2);
    });
  });

  describe('customerName: looks up the customer by id from the loaded customers list', () => {
    it('reads .name off the matching customer', () => {
      component.customers = [{ id: 1, name: 'Acme Co' } as any];
      component.note = note({ customerId: 1 });
      expect(component.customerName).toBe('Acme Co');
    });

    it('falls back to a sensible default when no matching customer is present', () => {
      component.customers = [];
      component.note = note({ customerId: 99 });
      expect(component.customerName).toBe('Customer');
    });
  });
});
