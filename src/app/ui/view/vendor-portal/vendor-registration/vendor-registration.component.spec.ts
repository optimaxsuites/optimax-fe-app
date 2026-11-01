import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { VendorRegistrationComponent } from './vendor-registration.component';
import { VendorRegistrationService } from '../../../service/vendor-portal/vendor-registration.service';
import { VendorStatus } from '../../../domain/vendor-management/vendor-management.dto';

describe('VendorRegistrationComponent', () => {
  let component: VendorRegistrationComponent;
  let regService: jasmine.SpyObj<VendorRegistrationService>;

  beforeEach(() => {
    regService = jasmine.createSpyObj<VendorRegistrationService>(
      'VendorRegistrationService', ['getDraft', 'loadOwnVendor', 'submit', 'saveStep1']);
    regService.getDraft.and.returnValue(null);
    regService.loadOwnVendor.and.returnValue(of({ vendorId: '7', status: VendorStatus.ACTIVE }));
    component = new VendorRegistrationComponent(new FormBuilder(), {} as any, regService);
    component.ngOnInit();
  });

  describe('what the page shows', () => {
    const saved: any = {
      step1: { businessName: 'Acme Ltd' },
      step2: { cacRegistrationNumber: 'RC1' },
      step3: { primaryContactName: 'Ada', deliveryRegions: ['lagos'] },
      step5: { supplyCategories: ['it'], majorClients: [{ id: 'c1', companyName: 'Client A' }] },
    };
    const reload = (result: any) => {
      regService.loadOwnVendor.and.returnValue(result);
      component.ngOnInit();
    };
    const savedRecord = () => of({ vendorId: '7', status: VendorStatus.ACTIVE, registration: saved });

    it('a vendor with only a signup record gets the blank form', () => {
      expect(component.viewState).toBe('first-time');
    });

    it('a vendor who already uploaded sees their saved details, read-only', () => {
      reload(savedRecord());
      expect(component.viewState).toBe('saved');
      expect(component.isReadOnly).toBeTrue();
      expect(component.form1.get('businessName')!.value).toBe('Acme Ltd');
      expect(component.selectedRegions).toEqual(['lagos'] as any);
    });

    it('a login with no matching vendor record gets no form to fill in', () => {
      reload(of(null));
      expect(component.viewState).toBe('no-record');
      expect(component.showForm).toBeFalse();
    });

    it('a failed load gets no form either, so an empty form can\'t overwrite real details', () => {
      reload(throwError(() => new Error('down')));
      expect(component.viewState).toBe('load-error');
      expect(component.showForm).toBeFalse();
    });

    it('Edit unlocks the fields, and Cancel puts every value back', () => {
      reload(savedRecord());
      component.startEditing();
      expect(component.isReadOnly).toBeFalse();

      component.form1.get('businessName')!.setValue('Changed Ltd');
      component.selectedRegions.push('abuja' as any);
      component.majorClients[0].companyName = 'Changed Client';
      component.cancelEditing();

      expect(component.viewState).toBe('saved');
      expect(component.form1.get('businessName')!.value).toBe('Acme Ltd');
      expect(component.selectedRegions).toEqual(['lagos'] as any);
      expect(component.majorClients[0].companyName).toBe('Client A');
    });

    it('edits aren\'t saved while moving between steps — only on Save', () => {
      reload(savedRecord());
      component.startEditing();
      component.nextStep();
      expect(component.currentStep).toBe(2);
      expect(regService.saveStep1).not.toHaveBeenCalled();
      expect(regService.submit).not.toHaveBeenCalled();
    });

    it('any step can be opened directly once details exist, but not on a first upload', () => {
      component.goToStep(4);
      expect(component.currentStep).toBe(1);
      reload(savedRecord());
      component.goToStep(4);
      expect(component.currentStep).toBe(4);
    });

    it('Save with a problem opens the step to fix and sends nothing', () => {
      reload(savedRecord());
      component.startEditing();
      component.onSubmit();
      expect(component.currentStep).toBe(1);   // the saved step 1 is missing required fields
      expect(regService.submit).not.toHaveBeenCalled();
    });
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

  describe('step 2 free text fits the backend\'s 255-character columns', () => {
    it('rejects declaration details over 255 characters, and still requires them when the box is ticked', () => {
      const details = component.form2.get('litigationDetails')!;
      component.form2.get('hasLitigationPending')!.setValue(true);
      details.setValue('');
      expect(details.hasError('required')).toBeTrue();
      details.setValue('x'.repeat(256));
      expect(details.hasError('maxlength')).toBeTrue();
      details.setValue('x'.repeat(255));
      expect(details.valid).toBeTrue();
    });

    it('keeps the limit after the box is unticked and ticked again', () => {
      component.form2.get('hasBeenBlacklisted')!.setValue(true);
      component.form2.get('hasBeenBlacklisted')!.setValue(false);
      component.form2.get('hasBeenBlacklisted')!.setValue(true);
      const details = component.form2.get('blacklistedDetails')!;
      details.setValue('x'.repeat(300));
      expect(details.hasError('maxlength')).toBeTrue();
    });

    it('limits the other licences and certifications fields too', () => {
      component.form2.get('otherLicences')!.setValue('x'.repeat(256));
      component.form2.get('otherCertifications')!.setValue('x'.repeat(256));
      expect(component.form2.get('otherLicences')!.hasError('maxlength')).toBeTrue();
      expect(component.form2.get('otherCertifications')!.hasError('maxlength')).toBeTrue();
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
