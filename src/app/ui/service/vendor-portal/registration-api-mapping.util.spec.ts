import { employeeCountFromApi, employeeCountToApi, enumFromApi, registrationFromApi, registrationStepToApi } from './registration-api-mapping.util';

describe('registration API enum mapping', () => {
  it('uppercases step 1 enums, mapping government_entity to GOVERNMENT', () => {
    const body = registrationStepToApi(1, { businessName: 'Acme', businessType: 'limited_liability', businessSize: 'small', ownershipType: 'indigenous', currency: 'NGN' });
    expect(body).toEqual(jasmine.objectContaining({ businessName: 'Acme', businessType: 'LIMITED_LIABILITY', businessSize: 'SMALL', ownershipType: 'INDIGENOUS', currency: 'NGN' }));
    expect(registrationStepToApi(1, { businessType: 'government_entity' }).businessType).toBe('GOVERNMENT');
  });

  it('uppercases list and account-type enums in later steps, leaving step 2 alone', () => {
    expect(registrationStepToApi(3, { deliveryRegions: ['lagos', 'cross_river'] }).deliveryRegions).toEqual(['LAGOS', 'CROSS_RIVER']);
    expect(registrationStepToApi(4, { primaryAccountType: 'current' }).primaryAccountType).toBe('CURRENT');
    expect(registrationStepToApi(5, { supplyCategories: ['oil_gas'], primaryCategory: 'other' }))
      .toEqual(jasmine.objectContaining({ supplyCategories: ['OIL_GAS'], primaryCategory: 'OTHER' }));
    expect(registrationStepToApi(6, { uploadedDocuments: [{ type: 'tax_clearance', status: 'pending' }] }).uploadedDocuments[0])
      .toEqual(jasmine.objectContaining({ type: 'TAX_CLEARANCE', status: 'PENDING' }));
    const step2 = { tinNumber: 'abc' };
    expect(registrationStepToApi(2, step2)).toBe(step2);
  });

  it('does not touch the draft it was given', () => {
    const step1: any = { businessType: 'limited_liability' };
    registrationStepToApi(1, step1);
    expect(step1.businessType).toBe('limited_liability');
  });

  it('maps backend values back to the form\'s values', () => {
    const reg: any = registrationFromApi({
      step1: { businessType: 'GOVERNMENT', businessSize: 'SMALL', ownershipType: 'GOVERNMENT' },
      step5: { supplyCategories: ['OIL_GAS'], primaryCategory: 'OTHER' }
    } as any);
    expect(reg.step1).toEqual(jasmine.objectContaining({ businessType: 'government_entity', businessSize: 'small', ownershipType: 'government' }));
    expect(reg.step5.supplyCategories).toEqual(['oil_gas']);
    expect(registrationFromApi(undefined)).toBeUndefined();
  });

  it('normalises single values for label lookups', () => {
    expect(enumFromApi('LIMITED_LIABILITY', 'businessType')).toBe('limited_liability');
    expect(enumFromApi('GOVERNMENT', 'businessType')).toBe('government_entity');
    expect(enumFromApi('limited_liability')).toBe('limited_liability');
  });

  it('sends the employee range as a whole number (the backend field is an Integer)', () => {
    expect(registrationStepToApi(1, { numberOfEmployees: '6–10' }).numberOfEmployees).toBe(6);
    expect(employeeCountToApi('1,001–5,000')).toBe(1001);
    expect(employeeCountToApi('5,000+')).toBe(5001);
    expect(employeeCountToApi('')).toBe('');
    expect('numberOfEmployees' in registrationStepToApi(1, { businessName: 'x' })).toBeFalse();
  });

  it('reads a stored employee count back as the range that holds it', () => {
    expect(employeeCountFromApi(6)).toBe('6–10');
    expect(employeeCountFromApi(8)).toBe('6–10');
    expect(employeeCountFromApi(5000)).toBe('1,001–5,000');
    expect(employeeCountFromApi(5001)).toBe('5,000+');
    expect(employeeCountFromApi('6–10')).toBe('6–10');
    expect((registrationFromApi({ step1: { numberOfEmployees: 26 } } as any) as any).step1.numberOfEmployees).toBe('26–50');
  });
});
