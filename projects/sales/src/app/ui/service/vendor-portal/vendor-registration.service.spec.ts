import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { VendorRegistrationService, RegistrationSubmitError } from './vendor-registration.service';
import { environment } from '../../shared-component/service/environments/environment';

const BASE = environment.apiBaseUrl + '/x/api/v2/commerce';

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

  const run = (reg: any) => {
    const out: { result?: any; error?: any } = {};
    service.submit(reg).subscribe({ next: r => (out.result = r), error: e => (out.error = e) });
    return out;
  };

  it('creates the vendor, saves every step, uploads the real files, then submits', () => {
    const out = run(makeReg());

    const create = http.expectOne(`${BASE}/vendors`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body.businessName).toBe('Acme Ltd');
    create.flush({ id: 42 });

    // Steps 2-6 (step 1 was the POST body for a new vendor)
    const step6 = http.expectOne(`${BASE}/vendors/42/step6`);
    const sentDocs = step6.request.body.uploadedDocuments;
    expect(sentDocs.length).toBe(2);
    for (const d of sentDocs) {
      expect('file' in d).toBeFalse();       // a File would serialise to {}
      expect('fileUrl' in d).toBeFalse();    // a blob: URL means nothing outside this tab
      expect(d.label).toBeTruthy();
    }
    step6.flush({});
    flushSteps('42', [2, 3, 4, 5]);

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
    submit.flush({ applicationNumber: 'APP-2026-9' });

    expect(out.result).toEqual({ applicationNumber: 'APP-2026-9' });
    expect(out.error).toBeUndefined();
    expect(service.getDraft()).toBeNull();         // draft cleared after success
    expect(localStorage.length).toBe(0);           // nothing written locally
  });

  it('falls back to the vendor id as the reference when the submit response has none', () => {
    const reg = makeReg();
    reg.step6.uploadedDocuments = [];
    const out = run(reg);
    http.expectOne(`${BASE}/vendors`).flush({ id: 42 });
    flushSteps('42', [2, 3, 4, 5, 6]);
    http.expectOne(`${BASE}/vendors/42/submit`).flush(null);
    expect(out.result).toEqual({ applicationNumber: '42' });
  });

  it('a failed POST /vendors is an error — no fake APP- record, no local store, nothing else is sent', () => {
    const out = run(makeReg());
    http.expectOne(`${BASE}/vendors`).flush('down', { status: 500, statusText: 'Server Error' });

    expect(out.result).toBeUndefined();
    expect(out.error instanceof RegistrationSubmitError).toBeTrue();
    expect(localStorage.length).toBe(0);
    // http.verify() (afterEach) proves no PUT/PATCH/document requests were issued
  });

  it('sends enum fields in the backend\'s spelling (LIMITED_LIABILITY, not limited_liability)', () => {
    const reg = makeReg();
    reg.step1.businessType = 'government_entity';
    reg.step6.uploadedDocuments = [];
    run(reg);
    const create = http.expectOne(`${BASE}/vendors`);
    expect(create.request.body.businessType).toBe('GOVERNMENT');
    create.flush({ id: 42 });
    const step5 = http.expectOne(`${BASE}/vendors/42/step5`);
    expect(step5.request.body.supplyCategories).toEqual(['IT']);
    step5.flush({});
    flushSteps('42', [2, 3, 4, 6]);
    http.expectOne(`${BASE}/vendors/42/submit`).flush({});
  });

  it('shows the server\'s reason instead of blaming the connection', () => {
    const out = run(makeReg());
    http.expectOne(`${BASE}/vendors`).flush(
      { httpStatus: 500, message: 'JSON parse error: bad BusinessType' }, { status: 500, statusText: 'Server Error' });
    expect(out.error.message).toContain('bad BusinessType');
    expect(out.error.message).not.toContain('connection');
  });

  it('only mentions the connection when the request never reached the server', () => {
    const out = run(makeReg());
    http.expectOne(`${BASE}/vendors`).error(new ProgressEvent('error'), { status: 0 });
    expect(out.error.message).toContain('check your connection');
  });

  it('rejects a create response with no id', () => {
    const out = run(makeReg());
    http.expectOne(`${BASE}/vendors`).flush({});
    expect(out.error instanceof RegistrationSubmitError).toBeTrue();
    expect(out.error.message).toContain('reference');
  });

  it('a failed step save stops the submit — the application is NOT marked submitted', () => {
    const out = run(makeReg());
    http.expectOne(`${BASE}/vendors`).flush({ id: 42 });
    http.expectOne(`${BASE}/vendors/42/step4`).flush('bad', { status: 400, statusText: 'Bad Request' });

    expect(out.result).toBeUndefined();
    expect(out.error instanceof RegistrationSubmitError).toBeTrue();
    expect(out.error.message).toContain('could not be saved');
    // The other in-flight step saves were cancelled rather than left running.
    expect(http.match(`${BASE}/vendors/42/step2`).every(r => r.cancelled)).toBeTrue();
    expect(http.match(`${BASE}/vendors/42/submit`).length).toBe(0);
    expect(http.match(`${BASE}/vendors/42/documents`).length).toBe(0);
  });

  it('a failed document upload names the document and blocks the submit', () => {
    const out = run(makeReg());
    http.expectOne(`${BASE}/vendors`).flush({ id: 42 });
    flushSteps('42', [2, 3, 4, 5, 6]);

    const uploads = http.match(`${BASE}/vendors/42/documents`);
    const tax = uploads.find(u => (u.request.body as FormData).get('label') === 'Tax Clearance')!;
    const cac = uploads.find(u => (u.request.body as FormData).get('label') === 'CAC Certificate')!;
    cac.flush({});
    tax.flush('nope', { status: 415, statusText: 'Unsupported Media Type' });

    expect(out.result).toBeUndefined();
    expect(out.error instanceof RegistrationSubmitError).toBeTrue();
    expect(out.error.failedDocuments).toEqual(['Tax Clearance']);
    expect(out.error.message).toContain('Tax Clearance');
    expect(http.match(`${BASE}/vendors/42/submit`).length).toBe(0);
  });

  it('retrying after a failure continues the SAME vendor and only re-uploads what failed', () => {
    const reg = makeReg();
    const first = run(reg);
    http.expectOne(`${BASE}/vendors`).flush({ id: 42 });
    flushSteps('42', [2, 3, 4, 5, 6]);
    const uploads = http.match(`${BASE}/vendors/42/documents`);
    uploads.find(u => (u.request.body as FormData).get('label') === 'CAC Certificate')!.flush({});
    uploads.find(u => (u.request.body as FormData).get('label') === 'Tax Clearance')!.flush('x', { status: 500, statusText: 'e' });
    expect(first.error).toBeTruthy();

    // Second attempt
    const second = run(reg);
    expect(http.match(`${BASE}/vendors`).length).toBe(0);            // no duplicate vendor
    flushSteps('42', [1, 2, 3, 4, 5, 6]);                            // step 1 now saved via PUT too
    const retried = http.match(`${BASE}/vendors/42/documents`);
    expect(retried.length).toBe(1);                                  // the CAC certificate is not uploaded twice
    expect((retried[0].request.body as FormData).get('label')).toBe('Tax Clearance');
    retried[0].flush({});
    http.expectOne(`${BASE}/vendors/42/submit`).flush({ applicationNumber: 'APP-1' });

    expect(second.result).toEqual({ applicationNumber: 'APP-1' });
    expect(service.getDraft()).toBeNull();
  });

  it('a failed final submit is an error, not a success', () => {
    const reg = makeReg();
    reg.step6.uploadedDocuments = [];
    const out = run(reg);
    http.expectOne(`${BASE}/vendors`).flush({ id: 42 });
    flushSteps('42', [2, 3, 4, 5, 6]);
    http.expectOne(`${BASE}/vendors/42/submit`).flush('x', { status: 500, statusText: 'e' });

    expect(out.result).toBeUndefined();
    expect(out.error instanceof RegistrationSubmitError).toBeTrue();
    expect(out.error.message).toContain('could not be submitted');
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
