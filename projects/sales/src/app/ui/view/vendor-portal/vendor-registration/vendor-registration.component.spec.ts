import { FormBuilder } from '@angular/forms';

import { VendorRegistrationComponent } from './vendor-registration.component';
import { VendorRegistrationService } from '../../../service/vendor-portal/vendor-registration.service';

describe('VendorRegistrationComponent', () => {
  let component: VendorRegistrationComponent;
  let regService: jasmine.SpyObj<VendorRegistrationService>;

  beforeEach(() => {
    regService = jasmine.createSpyObj<VendorRegistrationService>('VendorRegistrationService', ['getDraft']);
    regService.getDraft.and.returnValue(null);
    component = new VendorRegistrationComponent(new FormBuilder(), {} as any, regService);
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggle fields clear their dependent values, not just their validators', () => {
    it('turning off "previously blacklisted" wipes the details text instead of leaving it to be submitted', () => {
      component.form2.get('hasBeenBlacklisted')!.setValue(true);
      component.form2.get('blacklistedDetails')!.setValue('Some past dispute');
      component.form2.get('hasBeenBlacklisted')!.setValue(false);

      expect(component.form2.get('blacklistedDetails')!.value).toBeNull();
    });

    it('turning off "has own delivery fleet" wipes the fleet size', () => {
      component.form3.get('hasOwnDeliveryFleet')!.setValue(true);
      component.form3.get('fleetSize')!.setValue(12);
      component.form3.get('hasOwnDeliveryFleet')!.setValue(false);

      expect(component.form3.get('fleetSize')!.value).toBeNull();
    });

    it('turning off "accepts mobile money" wipes the mobile money number', () => {
      component.form4.get('acceptsMobileMoney')!.setValue(true);
      component.form4.get('mobileMoneyNumber')!.setValue('08012345678');
      component.form4.get('acceptsMobileMoney')!.setValue(false);

      expect(component.form4.get('mobileMoneyNumber')!.value).toBeNull();
    });

    it('marking the operating address "same as registered" wipes the entered operating address', () => {
      component.form3.get('operatingAddressSameAsRegistered')!.setValue(false);
      component.form3.get('operatingAddressLine1')!.setValue('123 Warehouse Rd');
      component.form3.get('operatingAddressSameAsRegistered')!.setValue(true);

      expect(component.form3.get('operatingAddressLine1')!.value).toBeNull();
    });
  });

  describe('delivery region options', () => {
    it('covers every Nigerian state, not just the first two dozen (previously stopped at Kaduna)', () => {
      const values = component.deliveryRegionOptions.map(r => r.value);
      ['ebonyi', 'sokoto', 'kebbi', 'zamfara', 'katsina', 'jigawa', 'yobe',
        'borno', 'adamawa', 'taraba', 'gombe', 'bauchi', 'niger'].forEach(state => {
        expect(values).toContain(state as any);
      });
    });

    it('still ends with nationwide and international', () => {
      const values = component.deliveryRegionOptions.map(r => r.value);
      expect(values[values.length - 2]).toBe('nationwide');
      expect(values[values.length - 1]).toBe('international');
    });
  });
});
