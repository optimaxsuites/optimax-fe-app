import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { CustomerFormComponent } from './customer-form.component';
import { SalesService } from '../../../../service/sales/sales.service';

describe('CustomerFormComponent', () => {
  let component: CustomerFormComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['createCustomer', 'updateCustomer']);
    component = new CustomerFormComponent(
      new FormBuilder(),
      { snapshot: { paramMap: { get: () => null } } } as any,
      salesService,
      { add: jasmine.createSpy('add') } as any,
      { navigate: jasmine.createSpy('navigate') } as any
    );
  });

  describe('City/State: used to have no formControlName at all and were silently discarded', () => {
    it('folds City and State into the submitted address instead of dropping them', () => {
      salesService.createCustomer.and.returnValue(of({} as any));
      component.customerForm.patchValue({
        name: 'Acme Co', email: 'acme@example.com', phone: '+2348000000000',
        address: '12 Broad Street', city: 'Lagos', state: 'Lagos State'
      });

      component.onSubmit();

      expect(salesService.createCustomer).toHaveBeenCalledWith(jasmine.objectContaining({
        address: ['12 Broad Street, Lagos, Lagos State']
      }));
    });

    it('still submits a valid string[] address when City/State are left blank', () => {
      salesService.createCustomer.and.returnValue(of({} as any));
      component.customerForm.patchValue({
        name: 'Acme Co', email: 'acme@example.com', phone: '+2348000000000',
        address: '12 Broad Street', city: '', state: ''
      });

      component.onSubmit();

      expect(salesService.createCustomer).toHaveBeenCalledWith(jasmine.objectContaining({
        address: ['12 Broad Street']
      }));
    });
  });
});
