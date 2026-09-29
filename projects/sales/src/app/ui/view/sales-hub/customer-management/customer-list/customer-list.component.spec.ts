import { of, Subject } from 'rxjs';

import { CustomerListComponent } from './customer-list.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer } from '../../../../domain/sales/sales.dto';

describe('CustomerListComponent', () => {
  let component: CustomerListComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const customer = (over: Partial<Customer> = {}): Customer => ({
    id: 1, customerId: 'CUST-1', name: 'Acme', ...over
  } as Customer);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['getCustomers', 'deleteCustomer']);
    salesService.getCustomers.and.returnValue(of({ data: [], total: 0 } as any));
    component = new CustomerListComponent(
      { add: jasmine.createSpy('add') } as any,
      salesService,
      { navigate: jasmine.createSpy('navigate') } as any,
      { snapshot: { paramMap: { get: () => null } } } as any
    );
  });

  describe('toggleSelectAll: consistent with per-row checkbox state', () => {
    it('selects using the same id field toggleSelection()/isSelected() use (customer.id), not the separate customerId field', () => {
      component.customers = [customer({ id: 1 }), customer({ id: 2 })];

      component.toggleSelectAll({ target: { checked: true } } as any);

      expect(component.selectedCustomerIds).toEqual([1, 2]);
      // Every row's own checkbox must now agree that it's selected.
      expect(component.isSelected(1)).toBeTrue();
      expect(component.isSelected(2)).toBeTrue();
    });

    it('clears selection when unchecked', () => {
      component.selectedCustomerIds = [1, 2];
      component.toggleSelectAll({ target: { checked: false } } as any);
      expect(component.selectedCustomerIds).toEqual([]);
    });
  });

  describe('bulkDeleteCustomers', () => {
    beforeEach(() => spyOn(window, 'confirm').and.returnValue(true));

    it('had no handler before — now actually calls deleteCustomer for every selected id', () => {
      salesService.deleteCustomer.and.returnValue(of(true));
      component.selectedCustomerIds = [1, 2];

      component.bulkDeleteCustomers();

      expect(salesService.deleteCustomer).toHaveBeenCalledTimes(2);
      expect(salesService.deleteCustomer).toHaveBeenCalledWith(1);
      expect(salesService.deleteCustomer).toHaveBeenCalledWith(2);
    });

    it('does nothing when nothing is selected', () => {
      component.selectedCustomerIds = [];
      component.bulkDeleteCustomers();
      expect(salesService.deleteCustomer).not.toHaveBeenCalled();
    });
  });

  describe('loadCustomers: stale response guard on rapid search typing', () => {
    it('a slower earlier search does not overwrite a faster, more recent one', () => {
      const first$ = new Subject<any>();
      const second$ = new Subject<any>();
      let call = 0;
      salesService.getCustomers.and.callFake(() => (call++ === 0 ? first$ : second$).asObservable());

      component.loadCustomers(); // request 1 (slow, e.g. searching "a")
      component.loadCustomers(); // request 2 (fast, e.g. searching "ab", resolves first)

      second$.next({ data: [customer({ id: 2, name: 'Second' })], total: 1 });
      second$.complete();
      expect(component.customers[0].name).toBe('Second');

      first$.next({ data: [customer({ id: 1, name: 'First' })], total: 1 });
      first$.complete();

      expect(component.customers[0].name).toBe('Second');
    });
  });
});
