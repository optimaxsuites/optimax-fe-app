import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';

import { ProductManagementFormComponent } from './product-management-form.component';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import { MeasurementUnit, Supplier } from '../../../../domain/inventory/inventory.dto';

describe('ProductManagementFormComponent', () => {
  let component: ProductManagementFormComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const unit = (over: Partial<MeasurementUnit> = {}): MeasurementUnit => ({
    id: 1, name: 'Kilogram', code: 'KG', createdAt: new Date(), updatedAt: new Date(), ...over
  } as MeasurementUnit);

  const supplier = (over: Partial<Supplier> = {}): Supplier => ({
    id: 7, name: 'Delta Steel', ...over
  } as unknown as Supplier);

  beforeEach(() => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getProduct']);
    component = new ProductManagementFormComponent(
      { add: jasmine.createSpy('add') } as any,
      new FormBuilder(),
      { snapshot: { paramMap: { get: () => '5' } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      inventoryService
    );
  });

  describe('loadProduct: unit/supplier lookup on edit', () => {
    it('resolves the real unit by code, not by comparing a numeric id against the unitOfMeasure code string', () => {
      component.measurementUnits = [unit({ id: 1, code: 'KG', name: 'Kilogram' }), unit({ id: 2, code: 'PCS', name: 'Each' })];
      component.suppliers = [];
      inventoryService.getProduct.and.returnValue(of({
        id: 5, name: 'Iron Rod', unitOfMeasure: 'KG', supplierIds: []
      } as any));

      component.loadProduct();

      expect(component.productForm.get('measurementUnit')?.value).toBe('Kilogram');
    });

    it('maps the EACH unit code to the PCS unit record (existing productToApiPayload convention)', () => {
      component.measurementUnits = [unit({ id: 2, code: 'PCS', name: 'Each' })];
      component.suppliers = [];
      inventoryService.getProduct.and.returnValue(of({
        id: 5, name: 'Cement', unitOfMeasure: 'EACH', supplierIds: []
      } as any));

      component.loadProduct();

      expect(component.productForm.get('measurementUnit')?.value).toBe('Each');
    });

    it('resolves the real supplier instead of always leaving the field blank (which then wiped the product\'s supplier on save)', () => {
      component.measurementUnits = [];
      component.suppliers = [supplier({ id: 7, name: 'Delta Steel' })];
      inventoryService.getProduct.and.returnValue(of({
        id: 5, name: 'Iron Rod', unitOfMeasure: 'KG', supplierIds: ['7']
      } as any));

      component.loadProduct();

      expect(component.productForm.get('supplier')?.value).toBe('Delta Steel');
    });

    it('leaves the supplier blank (not a wrong match) when the product genuinely has none', () => {
      component.measurementUnits = [];
      component.suppliers = [supplier({ id: 7, name: 'Delta Steel' })];
      inventoryService.getProduct.and.returnValue(of({
        id: 5, name: 'Iron Rod', unitOfMeasure: 'KG', supplierIds: []
      } as any));

      component.loadProduct();

      expect(component.productForm.get('supplier')?.value).toBe('');
    });
  });
});
