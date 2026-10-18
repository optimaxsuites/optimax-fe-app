import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { DeliveryNoteFormComponent } from './delivery-note-form.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { Customer, SalesDeliveryNote } from '../../../../domain/sales/sales.dto';

describe('DeliveryNoteFormComponent', () => {
  let component: DeliveryNoteFormComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const customer = (over: Partial<Customer> = {}): Customer => ({
    id: 1, customerId: 'CUST-1', name: 'Acme Co', email: 'a@acme.com', phone: '', address: ['1 Main St'], deliverAddress: ['1 Main St'], ...over
  } as Customer);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', [
      'getCustomers', 'getProducts', 'getMyMerchantInfo', 'getDeliveryNoteById',
      'getOrCreateDeliveryNote', 'createCustomer', 'createDeliveryNote', 'updateDeliveryNote'
    ]);
    salesService.getCustomers.and.returnValue(of({ data: [customer()], total: 1 } as any));
    salesService.getProducts.and.returnValue(of({ data: [], total: 0 } as any));
    salesService.getMyMerchantInfo.and.returnValue(of({ id: 1, name: 'Merchant' } as any));

    component = new DeliveryNoteFormComponent(
      new FormBuilder(),
      { snapshot: { paramMap: { get: () => null }, queryParamMap: { get: () => null } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      salesService,
      {} as any,
      { add: jasmine.createSpy('add') } as any
    );
  });

  it('starts with one blank item row and a generated number when created from scratch', () => {
    component.ngOnInit();

    expect(component.items.length).toBe(1);
    expect(component.generatedNumber).toContain('DN-');
    expect(component.fromOrder).toBeFalse();
  });

  describe('onCustomerChange: fills the ship-to address from the customer\'s own address when blank', () => {
    it('auto-fills customerAddress the first time a customer is picked', () => {
      component.ngOnInit();
      component.deliveryNoteForm.patchValue({ customerId: '1' });

      component.onCustomerChange();

      expect(component.deliveryNoteForm.get('customerAddress')?.value).toBe('1 Main St');
    });

    it('does not overwrite an address the user already typed', () => {
      component.ngOnInit();
      component.deliveryNoteForm.patchValue({ customerId: '1', customerAddress: 'Custom warehouse address' });

      component.onCustomerChange();

      expect(component.deliveryNoteForm.get('customerAddress')?.value).toBe('Custom warehouse address');
    });
  });

  describe('items', () => {
    it('addItem/removeItem manage the FormArray, never leaving it empty', () => {
      component.ngOnInit();
      expect(component.items.length).toBe(1);

      component.addItem();
      expect(component.items.length).toBe(2);

      component.removeItem(0);
      expect(component.items.length).toBe(1);

      component.removeItem(0);
      expect(component.items.length).toBe(1); // last row can't be removed
    });
  });

  describe('goToStep: validates before allowing forward navigation', () => {
    it('blocks moving to step 2 when required fields are missing', () => {
      component.ngOnInit();
      component.goToStep(2);
      expect(component.currentStep).toBe(1);
    });

    it('allows moving to step 2 once required fields are filled', () => {
      component.ngOnInit();
      component.deliveryNoteForm.patchValue({ customerId: '1', customerAddress: '1 Main St' });
      component.items.at(0).patchValue({ productName: 'Widget' });

      component.goToStep(2);

      expect(component.currentStep).toBe(2);
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.ngOnInit();
      component.deliveryNoteForm.patchValue({ customerId: '1', customerAddress: '1 Main St' });
      component.items.at(0).patchValue({ productName: 'Widget', quantity: 3, unit: 'pcs' });
    });

    it('creates a new delivery note when not in edit mode', () => {
      salesService.createDeliveryNote.and.returnValue(of({ id: 42 } as SalesDeliveryNote));

      component.onSubmit();

      expect(salesService.createDeliveryNote).toHaveBeenCalledWith(jasmine.objectContaining({
        customerId: 1,
        customerAddress: '1 Main St',
        status: 'PENDING',
        items: jasmine.arrayContaining([jasmine.objectContaining({ productName: 'Widget', quantity: 3, unit: 'pcs' })])
      }));
    });

    it('updates the existing record when in edit mode', () => {
      component.isEditMode = true;
      component.deliveryNoteId = '7';
      salesService.updateDeliveryNote.and.returnValue(of({ id: 7 } as SalesDeliveryNote));

      component.onSubmit();

      expect(salesService.updateDeliveryNote).toHaveBeenCalledWith('7', jasmine.any(Object));
      expect(salesService.createDeliveryNote).not.toHaveBeenCalled();
    });

    it('keeps fields the form does not edit in the full-record PUT', () => {
      (component as any).populateForm({
        id: 7, deliveryNumber: 'DN-7', status: 'PENDING', customerId: 1, customerAddress: '1 Main St',
        quoteId: 3, lpoId: 9, templateId: 'minimal', attention: 'J. Okafor',
        items: [{ id: 50, productName: 'Widget', quantity: 2, unit: 'pcs', productId: 'P-1', orderedQuantity: 5 }]
      } as SalesDeliveryNote);
      component.isEditMode = true;
      component.deliveryNoteId = '7';
      component.items.at(0).patchValue({ quantity: 3 });
      salesService.updateDeliveryNote.and.returnValue(of({ id: 7 } as SalesDeliveryNote));

      component.onSubmit();

      const body = salesService.updateDeliveryNote.calls.mostRecent().args[1];
      expect(body).toEqual(jasmine.objectContaining({ quoteId: 3, lpoId: 9, templateId: 'minimal', attention: 'J. Okafor' }));
      expect(body.items![0]).toEqual(jasmine.objectContaining({ id: 50, productId: 'P-1', orderedQuantity: 5, quantity: 3 }));
      expect((body.items![0] as any).source).toBeUndefined();
    });

    it('does not submit when required fields are missing', () => {
      component.deliveryNoteForm.patchValue({ customerAddress: '' });

      component.onSubmit();

      expect(salesService.createDeliveryNote).not.toHaveBeenCalled();
    });
  });

  describe('loadFromOrder: pre-fills from an existing order via getOrCreateDeliveryNote', () => {
    it('marks fromOrder and switches to edit mode when a note already exists for that order', () => {
      (component as any).sourceOrderId = '55';
      salesService.getOrCreateDeliveryNote.and.returnValue(of({
        id: 3, deliveryNumber: 'DN-3', status: 'PENDING', items: [], customerAddress: 'Warehouse A',
        salesOrderId: 55, customerId: 1
      } as SalesDeliveryNote));

      (component as any).loadFromOrder('55');

      expect(component.fromOrder).toBeTrue();
      expect(component.isEditMode).toBeTrue();
      expect(component.deliveryNoteId).toBe('3');
      expect(component.deliveryNoteForm.get('customerAddress')?.value).toBe('Warehouse A');
    });
  });
});
