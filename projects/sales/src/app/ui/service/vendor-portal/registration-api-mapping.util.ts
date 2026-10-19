// registration-api-mapping.util.ts
//
// The registration form uses lowercase snake_case values ('limited_liability'), the backend's Java
// enums use their constant names (LIMITED_LIABILITY) and rejects anything else with a 500
// (HttpMessageNotReadableException). These helpers convert every enum-valued field on the way out
// and back on the way in, so the form, its labels and drafts keep the lowercase values.

import {
  VendorRegistration, BusinessIdentity, ContactLocation, BankingFinance,
  CapabilitiesExperience, DocumentsDeclaration, UploadedDocument,
} from '../../domain/vendor-portal/vendor-registration.dto';

/** Form values whose backend constant isn't simply the uppercased value. */
const BUSINESS_TYPE_TO_API: Record<string, string> = { government_entity: 'GOVERNMENT' };
const BUSINESS_TYPE_FROM_API: Record<string, string> = { GOVERNMENT: 'government_entity' };

const toApi = (v: unknown, special: Record<string, string> = {}): any =>
  typeof v === 'string' && v ? (special[v] ?? v.toUpperCase()) : v;

const fromApi = (v: unknown, special: Record<string, string> = {}): any =>
  typeof v === 'string' && v ? (special[v] ?? v.toLowerCase()) : v;

const each = (list: unknown, fn: (v: unknown) => any): any => Array.isArray(list) ? list.map(fn) : list;

type Convert = (v: unknown, special?: Record<string, string>) => any;

function step1(s: BusinessIdentity | undefined, c: Convert, businessTypes: Record<string, string>): any {
  if (!s) return s;
  return { ...s, businessType: c(s.businessType, businessTypes), businessSize: c(s.businessSize), ownershipType: c(s.ownershipType) };
}

function step3(s: ContactLocation | undefined, c: Convert): any {
  return s && { ...s, deliveryRegions: each(s.deliveryRegions, v => c(v)) };
}

function step4(s: BankingFinance | undefined, c: Convert): any {
  return s && { ...s, primaryAccountType: c(s.primaryAccountType), secondaryAccountType: c(s.secondaryAccountType) };
}

function step5(s: CapabilitiesExperience | undefined, c: Convert): any {
  return s && { ...s, supplyCategories: each(s.supplyCategories, v => c(v)), primaryCategory: c(s.primaryCategory) };
}

function step6(s: DocumentsDeclaration | undefined, c: Convert): any {
  return s && {
    ...s,
    uploadedDocuments: each(s.uploadedDocuments, (d: any) => d && ({ ...d, type: c(d.type), status: c(d.status) }) as UploadedDocument),
  };
}

/** One step's body in the backend's enum spelling, ready for POST /vendors or PUT /vendors/{id}/stepN. */
export function registrationStepToApi(n: number, body: any): any {
  switch (n) {
    case 1: return step1(body, toApi, BUSINESS_TYPE_TO_API);
    case 3: return step3(body, toApi);
    case 4: return step4(body, toApi);
    case 5: return step5(body, toApi);
    case 6: return step6(body, toApi);
    default: return body;
  }
}

/** A registration read from the backend, with its enum fields back in the form's lowercase values. */
export function registrationFromApi<T extends Partial<VendorRegistration> | null | undefined>(reg: T): T {
  if (!reg) return reg;
  return {
    ...reg,
    step1: step1(reg.step1, fromApi, BUSINESS_TYPE_FROM_API),
    step3: step3(reg.step3, fromApi),
    step4: step4(reg.step4, fromApi),
    step5: step5(reg.step5, fromApi),
    step6: step6(reg.step6, fromApi),
  };
}

/** Normalises a single backend value for label lookups (LIMITED_LIABILITY → limited_liability). */
export function enumFromApi(value: string | undefined | null, field?: 'businessType'): string {
  return fromApi(value ?? '', field === 'businessType' ? BUSINESS_TYPE_FROM_API : {}) as string;
}
