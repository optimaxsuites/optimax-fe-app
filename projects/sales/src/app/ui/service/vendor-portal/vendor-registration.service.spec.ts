import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { VendorRegistrationService, RegistrationSubmitError, hasUploadedDetails } from './vendor-registration.service';
import { VendorStatus } from '../../domain/vendor-management/vendor-management.dto';
import { environment } from '../../shared-component/service/environments/environment';

const BASE = environment.apiBaseUrl + '/x/api/v2/commerce';
const VENDORS_LIST = `${BASE}/vendor-management/vendors`;

describe('VendorRegistrationService.submit', () => {
  let service: VendorRegistrationService;
  let http: HttpTestingController;

  const doc = (id: string, type: string, label: string): any => ({
    id, type, label,
    fileName: `${id}.pdf`,
    fileSize: '1 KB',
    fileUrl: `blob:http://localhost/${id}`,
    uploadedDate: new Date('2026-01-10'),
    isRequired: true,
    status: 'pending',
    file: new File(['content'], `${id}.pdf`, { type: 'application/pdf' })
  });

  const makeReg = (): any => ({
    id: '42',
    status: 'submitted',
    step1: { businessName: 'Acme Ltd', businessType: 'limited_liability' },
    step2: { cacRegistrationNumber: 'RC1', tinNumber: 'T1', taxClearanceExpiryDate: '2027-03-01' },
    step3: { primaryContactEmail: 'a@acme.example', registeredAddressLine1: '1 Road' },
    step4: { primaryBankName: 'GTB', primaryAccountNumber: '0123456789' },
    step5: { supplyCategories: ['it'] },
    step6: {
      declarantName: 'Ada',
      uploadedDocuments: [doc('d1', 'cac_certificate', 'CAC Certificate'), doc('d2', 'tax_clearance', 'Tax Clearance')]
    }
  });

  const flushSteps = (id: string, steps: number[], status = 200) => {
    steps.forEach(n => http.expectOne(`${BASE}/vendors/${id}/step${n}`).flush({}, { status, statusText: status === 200 ? 'OK' : 'Error' }));
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(VendorRegistrationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Requests cancelled by forkJoin after a sibling failed are expected, not "left open".
    http.verify({ ignoreCancelled: true });
    localStorage.clear();
  });

  const run = (reg: any, status = VendorStatus.PENDING_ONBOARDING) => {
    const out: { done?: boolean; error?: any } = {};
    service.submit(reg, status).subscribe({ complete: () => (out.done = true), error: e => (out.error = e) });
    return out;
  };

  it('updates the existing vendor: saves every step, uploads the real files, then sends for review', () => {
    const out = run(makeReg());

    expect(http.match(`${BASE}/vendors`).length).toBe(0);   // never creates a second vendor

    const step6 = http.expectOne(`${BASE}/vendors/42/step6`);
    const sentDocs = step6.request.body.uploadedDocuments;
    expect(sentDocs.length).toBe(2);
    for (const d of sentDocs) {
      expect('file' in d).toBeFalse();       // a File would serialise to {}
      expect('fileUrl' in d).toBeFalse();    // a blob: URL means nothing outside this tab
      expect(d.label).toBeTruthy();
    }
    step6.flush({});
    flushSteps('42', [1, 2, 3, 4, 5]);

    // Documents: multipart, real File, real expiry only where the vendor entered one
    const uploads = http.match(`${BASE}/vendors/42/documents`);
    expect(uploads.length).toBe(2);
    for (const u of uploads) {
      expect(u.request.method).toBe('POST');
      expect(u.request.body instanceof FormData).toBeTrue();
      expect((u.request.body as FormData).get('file') instanceof File).toBeTrue();
    }
    const byLabel = (label: string) => uploads.find(u => (u.request.body as FormData).get('label') === label)!;
    expect((byLabel('CAC Certificate').request.body as FormData).get('expiryDate')).toBeNull();      // never invented
    expect((byLabel('Tax Clearance').request.body as FormData).get('expiryDate')).toContain('2027-03-01');
    uploads.forEach(u => u.flush({}));

    const submit = http.expectOne(`${BASE}/vendors/42/submit`);
    expect(submit.request.method).toBe('PATCH');
    submit.flush({});

    expect(out.done).toBeTrue();
    expect(out.error).toBeUndefined();
    expect(service.getDraft()).toBeNull();         // draft cleared after success
    expect(localStorage.length).toBe(0);           // nothing written locally
  });

  it('an approved vendor is not sent back for review: their edits just apply', () => {
    const reg = makeReg();
    reg.step6.uploadedDocuments = [];
    const out = run(reg, VendorStatus.ACTIVE);
    flushSteps('42', [1, 2, 3, 4, 5, 6]);

    expect(http.match(`${BASE}/vendors/42/submit`).length).toBe(0);
    expect(out.done).toBeTrue();
  });

  it('with no vendor record it is an error and nothing is sent — no vendor is created', () => {
    const reg = makeReg();
    delete reg.id;
    const out = run(reg);

    expect(out.error instanceof RegistrationSubmitError).toBeTrue();
    expect(out.error.message).toContain('vendor record');
    // http.verify() (afterEach) proves no requests were issued
  });

  it('sends enum fields in the backend\'s spelling (LIMITED_LIABILITY, not limited_liability)', () => {
    const reg = makeReg();
    reg.step1.businessType = 'government_entity';
    reg.step6.uploadedDocuments = [];
    run(reg);
    const step1 = http.expectOne(`${BASE}/vendors/42/step1`);
    expect(step1.request.body.businessType).toBe('GOVERNMENT');
    step1.flush({});
    const step5 = http.expectOne(`${BASE}/vendors/42/step5`);
    expect(step5.request.body.supplyCategories).toEqual(['IT']);
    step5.flush({});
    flushSteps('42', [2, 3, 4, 6]);
    http.expectOne(`${BASE}/vendors/42/submit`).flush({});
  });

  it('shows the server\'s reason instead of blaming the connection', () => {
    const reg = makeReg();
    reg.step6.uploadedDocuments = [];
    const out = run(reg);
    http.expectOne(`${BASE}/vendors/42/step1`).flush(
      { httpStatus: 500, message: 'JSON parse error: bad BusinessType' }, { status: 500, statusText: 'Server Error' });
    flushSteps('42', [2, 3, 4, 5, 6]);
    expect(out.error.message).toContain('bad BusinessType');
    expect(out.error.message).not.toContain('connection');
  });

  it('only mentions the connection when the request never reached the server', () => {
    const reg = makeReg();
    reg.step6.uploadedDocuments = [];
    const out = run(reg);
    [1, 2, 3, 4, 5, 6].forEach(n =>
      http.expectOne(`${BASE}/vendors/42/step${n}`).error(new ProgressEvent('error'), { status: 0 }));
    expect(out.error.message).toContain('check your connection');
  });

  it('includes vendorId in the step 2-6 bodies (the backend requires it there too)', () => {
    const reg = makeReg();
    reg.id = '15';
    reg.step6.uploadedDocuments = [];
    run(reg);
    flushSteps('15', [1]);
    [2, 3, 4, 5, 6].forEach(n => {
      const req = http.expectOne(`${BASE}/vendors/15/step${n}`);
      expect(req.request.body.vendorId).toBe(15);
      req.flush({});
    });
    http.expectOne(`${BASE}/vendors/15/submit`).flush({});
  });

  it('spells out validation errors that only come as fieldErrors', () => {
    const out = run(makeReg());
    http.expectOne(`${BASE}/vendors/42/step3`).flush(
      { httpStatus: 400, message: null, fieldErrors: [{ field: 'vendorId', errorCode: 'NotNull' }] }, { status: 400, statusText: 'Bad Request' });
    flushSteps('42', [1, 2, 4, 5, 6]);
    expect(out.error.message).toContain('Contact & Location: vendorId is required');
  });

  it('a failed step save stops the submit — the vendor is NOT sent for review', () => {
    const out = run(makeReg());
    http.expectOne(`${BASE}/vendors/42/step4`).flush({ message: 'bad account type' }, { status: 500, statusText: 'Server Error' });
    http.expectOne(`${BASE}/vendors/42/step5`).flush({ message: 'bad SupplyCategory' }, { status: 500, statusText: 'Server Error' });
    flushSteps('42', [1, 2, 3, 6]);

    expect(out.done).toBeUndefined();
    expect(out.error instanceof RegistrationSubmitError).toBeTrue();
    // Every failing step is named, with the server's reason — not just the first one.
    expect(out.error.message).toContain('could not be saved');
    expect(out.error.message).toContain('Banking & Finance: bad account type');
    expect(out.error.message).toContain('Capabilities & Experience: bad SupplyCategory');
    expect(http.match(`${BASE}/vendors/42/documents`).length).toBe(0);
    expect(http.match(`${BASE}/vendors/42/submit`).length).toBe(0);
  });

  it('a failed document upload names the document and blocks the submit', () => {
    const out = run(makeReg());
    flushSteps('42', [1, 2, 3, 4, 5, 6]);

    const uploads = http.match(`${BASE}/vendors/42/documents`);
    const tax = uploads.find(u => (u.request.body as FormData).get('label') === 'Tax Clearance')!;
    const cac = uploads.find(u => (u.request.body as FormData).get('label') === 'CAC Certificate')!;
    cac.flush({});
    tax.flush('nope', { status: 415, statusText: 'Unsupported Media Type' });

    expect(out.done).toBeUndefined();
    expect(out.error instanceof RegistrationSubmitError).toBeTrue();
    expect(out.error.failedDocuments).toEqual(['Tax Clearance']);
    expect(out.error.message).toContain('Tax Clearance');
    expect(http.match(`${BASE}/vendors/42/submit`).length).toBe(0);
  });

  it('retrying after a failure updates the SAME vendor and only re-uploads what failed', () => {
    const reg = makeReg();
    const first = run(reg);
    flushSteps('42', [1, 2, 3, 4, 5, 6]);
    const uploads = http.match(`${BASE}/vendors/42/documents`);
    uploads.find(u => (u.request.body as FormData).get('label') === 'CAC Certificate')!.flush({});
    uploads.find(u => (u.request.body as FormData).get('label') === 'Tax Clearance')!.flush('x', { status: 500, statusText: 'e' });
    expect(first.error).toBeTruthy();

    // Second attempt
    const second = run(reg);
    expect(http.match(`${BASE}/vendors`).length).toBe(0);            // no duplicate vendor
    flushSteps('42', [1, 2, 3, 4, 5, 6]);
    const retried = http.match(`${BASE}/vendors/42/documents`);
    expect(retried.length).toBe(1);                                  // the CAC certificate is not uploaded twice
    expect((retried[0].request.body as FormData).get('label')).toBe('Tax Clearance');
    retried[0].flush({});
    http.expectOne(`${BASE}/vendors/42/submit`).flush({});

    expect(second.done).toBeTrue();
    expect(service.getDraft()).toBeNull();
  });

  it('a failed send for review is an error, not a success', () => {
    const reg = makeReg();
    reg.step6.uploadedDocuments = [];
    const out = run(reg);
    flushSteps('42', [1, 2, 3, 4, 5, 6]);
    http.expectOne(`${BASE}/vendors/42/submit`).flush('x', { status: 500, statusText: 'e' });

    expect(out.done).toBeUndefined();
    expect(out.error instanceof RegistrationSubmitError).toBeTrue();
    expect(out.error.message).toContain('could not be sent for review');
    expect(localStorage.length).toBe(0);
  });

  it('checkStatus / loadRegistration no longer invent a result on error', () => {
    let statusErr: any, loadErr: any;
    service.checkStatus('42').subscribe({ error: e => (statusErr = e) });
    http.expectOne(`${BASE}/vendors/42`).flush('x', { status: 500, statusText: 'e' });
    service.loadRegistration('42').subscribe({ error: e => (loadErr = e) });
    http.expectOne(`${BASE}/vendors/42`).flush('x', { status: 500, statusText: 'e' });
    expect(statusErr).toBeTruthy();
    expect(loadErr).toBeTruthy();
  });
});

describe('VendorRegistrationService.loadOwnVendor', () => {
  let service: VendorRegistrationService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.setItem('email', 'Sales@Acme.example');
    sessionStorage.setItem('userid', '65');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(VendorRegistrationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('userid');
  });

  const load = () => {
    const out: { record?: any; error?: any } = {};
    service.loadOwnVendor().subscribe({ next: r => (out.record = r), error: e => (out.error = e) });
    return out;
  };
  const list = () => http.expectOne(r => r.url === VENDORS_LIST);

  it('finds the signup record by login email, ignoring case, and reads it by vendor id — never by user id', () => {
    const out = load();
    list().flush({ vendors: [{ id: 7, email: 'sales@acme.example', status: 'ACTIVE' }] });
    http.expectOne(`${VENDORS_LIST}/7`).flush({
      id: 7, email: 'sales@acme.example', status: 'ACTIVE',
      step2: { cacRegistrationNumber: 'RC1' },
    });

    expect(http.match(`${VENDORS_LIST}/65`).length).toBe(0);
    expect(out.record.vendorId).toBe('7');
    expect(out.record.status).toBe(VendorStatus.ACTIVE);
    expect(out.record.registration.step2.cacRegistrationNumber).toBe('RC1');
  });

  it('does not treat a partial email match as this vendor', () => {
    const out = load();
    list().flush({ vendors: [{ id: 7, email: 'presales@acme.example.ng', status: 'ACTIVE' }] });
    expect(out.record).toBeNull();
  });

  it('refuses to guess when several vendors share the email, so it can\'t overwrite the wrong one', () => {
    const out = load();
    list().flush({ vendors: [
      { id: 7, email: 'sales@acme.example', status: 'ACTIVE' },
      { id: 8, email: 'sales@acme.example', status: 'ACTIVE' },
    ] });
    expect(out.record).toBeNull();
  });

  it('asks for nothing when the login has no email', () => {
    sessionStorage.removeItem('email');
    const out = load();
    expect(out.record).toBeNull();
  });

  it('a failed lookup is an error, not "no record"', () => {
    const out = load();
    list().flush('x', { status: 403, statusText: 'Forbidden' });
    expect(out.error).toBeTruthy();
    expect(out.record).toBeUndefined();
  });
});

describe('hasUploadedDetails', () => {
  it('is false for a signup record, which only has a business name', () => {
    expect(hasUploadedDetails(undefined)).toBeFalse();
    expect(hasUploadedDetails({ step1: { businessName: 'Test Vendor' } as any })).toBeFalse();
  });

  it('is true once any later step has its required details', () => {
    expect(hasUploadedDetails({ step3: { primaryContactName: 'Ada' } as any })).toBeTrue();
  });
});
