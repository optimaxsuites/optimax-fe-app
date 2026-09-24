import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { VendorService } from './vendor-management.service';
import { Vendor, VendorStatus, VendorTier, RiskLevel } from '../../domain/vendor-management/vendor-management.dto';
import { environment } from '../../shared-component/service/environments/environment';

const BASE = environment.apiBaseUrl + '/x/api/v2/commerce';

describe('VendorService (vendor management)', () => {
  let service: VendorService;
  let http: HttpTestingController;

  const inject = () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(VendorService);
    http = TestBed.inject(HttpTestingController);
  };

  /** Runs `fn`, expecting the observable it returns to error; returns the error (or undefined). */
  const errorOf = (obs: any): { error?: any; value?: any } => {
    const out: { error?: any; value?: any } = {};
    obs.subscribe({ next: (v: any) => (out.value = v), error: (e: any) => (out.error = e) });
    return out;
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    // getRiskAlerts forkJoins two requests; when one errors, forkJoin cancels the other rather
    // than waiting for it, and HttpTestingController counts a cancelled request as "still open"
    // unless told otherwise.
    http?.verify({ ignoreCancelled: true });
    localStorage.clear();
  });

  it('removes data left in localStorage by the old offline stores', () => {
    localStorage.setItem('erp_tenant_vendor_approvals', JSON.stringify({ optimax: { '7': 'ACTIVE' } }));
    localStorage.setItem('erp_pending_vendors', JSON.stringify([{ id: 'APP-1', bankDetails: { accountNumber: '0123456789' } }]));
    inject();
    expect(localStorage.getItem('erp_tenant_vendor_approvals')).toBeNull();
    expect(localStorage.getItem('erp_pending_vendors')).toBeNull();
  });

  describe('failures are errors, never mock data', () => {
    beforeEach(inject);

    it('getVendors errors instead of returning mock vendors', () => {
      const out = errorOf(service.getVendors(1, 20));
      http.expectOne(r => r.url === `${BASE}/vendor-management/vendors`).flush('boom', { status: 500, statusText: 'Server Error' });
      expect(out.error).toBeTruthy();
      expect(out.value).toBeUndefined();
    });

    it('getVendorById errors on 404/500 instead of returning MOCK_VENDORS[0]', () => {
      const out = errorOf(service.getVendorById('999'));
      http.expectOne(`${BASE}/vendor-management/vendors/999`).flush('nope', { status: 404, statusText: 'Not Found' });
      expect(out.error).toBeTruthy();
      expect(out.value).toBeUndefined();
    });

    it('getVendorById errors on an empty body', () => {
      const out = errorOf(service.getVendorById('5'));
      http.expectOne(`${BASE}/vendor-management/vendors/5`).flush(null);
      expect(out.error).toBeTruthy();
    });

    it('getDashboardStats errors instead of returning mock stats', () => {
      const out = errorOf(service.getDashboardStats());
      http.expectOne(`${BASE}/vendor-management/dashboard/stats`).flush('x', { status: 500, statusText: 'Server Error' });
      expect(out.error).toBeTruthy();
      expect(out.value).toBeUndefined();
    });

    it('detail-tab data errors instead of returning invented documents / performance / alerts / history', () => {
      const docs = errorOf(service.getVendorDocuments('7'));
      http.expectOne(`${BASE}/vendor-management/compliance/documents`).flush('x', { status: 500, statusText: 'e' });
      const perf = errorOf(service.getVendorPerformance('7'));
      http.expectOne(`${BASE}/vendor-management/vendors/7/performance`).flush('x', { status: 500, statusText: 'e' });
      const alerts = errorOf(service.getRiskAlerts('7'));
      http.expectOne(`${BASE}/vendor-management/sentinel/insights`).flush('x', { status: 500, statusText: 'e' });
      const history = errorOf(service.getLifecycleHistory('7'));
      http.expectOne(`${BASE}/vendor-management/vendors/7/lifecycle-history`).flush('x', { status: 500, statusText: 'e' });

      expect(docs.error).toBeTruthy();
      expect(perf.error).toBeTruthy();
      expect(alerts.error).toBeTruthy();
      expect(history.error).toBeTruthy();
    });

    it('getRiskAlerts without a vendor id returns nothing rather than mock alerts', () => {
      let result: any;
      service.getRiskAlerts().subscribe(r => (result = r));
      expect(result).toEqual([]);
    });

    it('the onboarding copilot never falls back to a hard-coded vendor', () => {
      expect(errorOf(service.getOnboardingCopilotSession()).error).toBeTruthy();
      const out = errorOf(service.getOnboardingCopilotSession('7'));
      http.expectOne(`${BASE}/vendor-management/onboarding-copilot/7`).flush('x', { status: 500, statusText: 'e' });
      expect(out.error).toBeTruthy();
    });

    it('confirmExtractedField does not report success when the call fails', () => {
      const out = errorOf(service.confirmExtractedField('s1', 'taxId', '123'));
      http.expectOne(`${environment.apiBaseUrl}/ai/sentinel/onboarding-copilot/s1/fields/taxId/confirm`)
        .flush('x', { status: 500, statusText: 'e' });
      expect(out.error).toBeTruthy();
      expect(out.value).toBeUndefined();
    });

    it('deleteVendor surfaces a failed delete', () => {
      const out = errorOf(service.deleteVendor('7'));
      http.expectOne(`${BASE}/vendors/7`).flush('x', { status: 500, statusText: 'e' });
      expect(out.error).toBeTruthy();
    });

    it('one vendor without a risk trajectory does not hide the others', () => {
      let result: any;
      service.getRiskTrajectories(['1', '2']).subscribe(r => (result = r));
      http.expectOne(`${BASE}/vendor-management/vendors/1/risk-trajectory`).flush({ vendorId: '1', direction: 'UP' });
      http.expectOne(`${BASE}/vendor-management/vendors/2/risk-trajectory`).flush('x', { status: 404, statusText: 'Not Found' });
      expect(result.length).toBe(1);
      expect(result[0].vendorId).toBe('1');
    });

    it('acting on an AI insight only changes local state after the backend confirms', () => {
      service.getSentinelInsights().subscribe();
      http.expectOne(`${BASE}/vendor-management/sentinel/insights`).flush([{ id: 1, status: 'OPEN' }]);

      const out = errorOf(service.actOnInsight(1, 'DISMISS'));
      http.expectOne(`${environment.apiBaseUrl}/ai/sentinel/insights/1/action`).flush('x', { status: 500, statusText: 'e' });
      expect(out.error).toBeTruthy();

      let current: any[] = [];
      service.sentinelInsights$.subscribe(v => (current = v));
      expect(current[0].status).toBe('OPEN');
    });
  });

  describe('getRiskAlerts: derived from the real Sentinel feeds (no vendor-scoped risk-alerts endpoint exists)', () => {
    beforeEach(inject);

    const insight = (over: any = {}) => ({
      id: 1, type: 'FRAUD_ANOMALY', severity: 'HIGH', vendorId: '7', vendorName: 'Acme',
      finding: 'Unusual invoice pattern', reason: 'Three invoices in one day', evidence: [],
      suggestedActions: [], status: 'OPEN', detectedAt: '2026-01-10T00:00:00Z', confidence: 80, ...over
    });
    const flag = (over: any = {}) => ({
      id: 1, vendorId: '7', vendorName: 'Acme', type: 'DUPLICATE_INVOICE', title: 'Duplicate invoice',
      description: 'Same invoice number seen twice', severity: 'MEDIUM', evidence: [],
      detectedAt: '2026-01-05T00:00:00Z', status: 'PENDING_REVIEW', ...over
    });

    const load = (insights: any[], flags: any[]) => {
      let result: any[] = [];
      service.getRiskAlerts('7').subscribe(r => (result = r));
      http.expectOne(`${BASE}/vendor-management/sentinel/insights`).flush(insights);
      http.expectOne(`${BASE}/vendor-management/fraud-flags`).flush(flags);
      return result;
    };

    it('combines insights and fraud flags for the vendor into RiskAlert-shaped rows', () => {
      const result = load([insight()], [flag()]);
      expect(result.length).toBe(2);
      expect(result.find(a => a.title === 'Unusual invoice pattern')).toBeTruthy();
      expect(result.find(a => a.title === 'Duplicate invoice')).toBeTruthy();
    });

    it('excludes insights for other vendors', () => {
      const result = load([insight({ vendorId: '9' })], [flag({ vendorId: '9' })]);
      expect(result).toEqual([]);
    });

    it('excludes non-risk insight types (opportunities and tier upgrades are not risk alerts)', () => {
      const result = load([insight({ type: 'OPPORTUNITY' }), insight({ id: 2, type: 'TIER_UPGRADE' })], []);
      expect(result).toEqual([]);
    });

    it('maps insight/fraud-flag statuses onto RiskAlert statuses', () => {
      const result = load(
        [insight({ status: 'ACTIONED' })],
        [flag({ status: 'ESCALATED' })]
      );
      expect(result.find(a => a.title === 'Unusual invoice pattern')!.status).toBe('RESOLVED');
      expect(result.find(a => a.title === 'Duplicate invoice')!.status).toBe('IN_PROGRESS');
    });

    it('preserves the real HIGH/MEDIUM/LOW severities instead of collapsing them into the 3-value enum', () => {
      const result = load([insight({ severity: 'HIGH' })], [flag({ severity: 'MEDIUM' })]);
      expect(result.find(a => a.title === 'Unusual invoice pattern')!.severity as any).toBe('HIGH');
      expect(result.find(a => a.title === 'Duplicate invoice')!.severity as any).toBe('MEDIUM');
    });

    it('sorts most recent first', () => {
      const result = load([insight({ detectedAt: '2026-01-01T00:00:00Z' })], [flag({ detectedAt: '2026-02-01T00:00:00Z' })]);
      expect(result[0].title).toBe('Duplicate invoice');
    });
  });

  describe('vendor detail', () => {
    beforeEach(inject);

    const rawNested = {
      id: 7,
      status: 'PENDING_ONBOARDING',
      step1: { businessName: 'Full Name Ltd', websiteUrl: 'https://full.example' },
      step2: { cacRegistrationNumber: 'RC123', tinNumber: 'TIN9' },
      step3: {
        primaryContactEmail: 'ops@full.example', primaryContactPhone: '0800', primaryContactName: 'Ada',
        registeredAddressLine1: '1 Marina Road', registeredCity: 'Lagos', registeredState: 'Lagos', registeredCountry: 'Nigeria'
      },
      step4: { primaryBankName: 'GTB', primaryAccountNumber: '0123456789', primaryAccountName: 'Full Name Ltd' }
    };

    it('always asks the backend (never serves the slim list copy) and maps nested registration data', () => {
      // A list load puts a slim copy of vendor 7 in the cache...
      service.getVendors(1, 20).subscribe();
      http.expectOne(r => r.url === `${BASE}/vendor-management/vendors`).flush([{ id: 7, companyName: 'Slim Co', status: 'ACTIVE' }]);

      // ...which the detail page must NOT be served from.
      let got: Vendor | undefined;
      service.getVendorById('7').subscribe(v => (got = v));
      http.expectOne(`${BASE}/vendor-management/vendors/7`).flush(rawNested);

      expect(got).toBeDefined();
      expect(got!.companyName).toBe('Full Name Ltd');
      expect(got!.registrationNumber).toBe('RC123');
      expect(got!.email).toBe('ops@full.example');
      expect(got!.address.street).toBe('1 Marina Road');
      expect(got!.bankDetails?.bankName).toBe('GTB');
      expect(got!.registration).toBeDefined();
    });

    it('unwraps a { data } / { vendor } envelope', () => {
      let got: Vendor | undefined;
      service.getVendorById('7').subscribe(v => (got = v));
      http.expectOne(`${BASE}/vendor-management/vendors/7`).flush({ data: rawNested });
      expect(got!.companyName).toBe('Full Name Ltd');
    });

    it('a deep link still gets a usable address even when the backend sends none', () => {
      let got: Vendor | undefined;
      service.getVendorById('8').subscribe(v => (got = v));
      http.expectOne(`${BASE}/vendor-management/vendors/8`).flush({ id: 8, companyName: 'No Address Ltd', status: 'ACTIVE' });
      expect(got!.address).toBeDefined();
    });
  });

  describe('mapVendor: an unreviewed vendor is never presented as already vetted', () => {
    beforeEach(inject);

    it('a pending vendor with no tier/risk from the backend defaults to CONDITIONAL/MEDIUM, not APPROVED/LOW', () => {
      let got: Vendor | undefined;
      service.getVendorById('9').subscribe(v => (got = v));
      http.expectOne(`${BASE}/vendor-management/vendors/9`).flush({ id: 9, companyName: 'New Co', status: 'PENDING_ONBOARDING' });
      expect(got!.tier).toBe(VendorTier.CONDITIONAL);
      expect(got!.riskLevel).toBe(RiskLevel.MEDIUM);
      expect(got!.complianceStatus.isCompliant).toBeFalse();
    });

    it('an under-review vendor gets the same unreviewed defaults', () => {
      let got: Vendor | undefined;
      service.getVendorById('9').subscribe(v => (got = v));
      http.expectOne(`${BASE}/vendor-management/vendors/9`).flush({ id: 9, companyName: 'New Co', status: 'UNDER_REVIEW' });
      expect(got!.tier).toBe(VendorTier.CONDITIONAL);
      expect(got!.riskLevel).toBe(RiskLevel.MEDIUM);
    });

    it('sanctionsClear reflects a self-declared blacklist instead of defaulting to clear', () => {
      let got: Vendor | undefined;
      service.getVendorById('9').subscribe(v => (got = v));
      http.expectOne(`${BASE}/vendor-management/vendors/9`).flush({
        id: 9, companyName: 'New Co', status: 'PENDING_ONBOARDING', step2: { hasBeenBlacklisted: true }
      });
      expect(got!.complianceStatus.sanctionsClear).toBeFalse();
    });

    it('an ACTIVE vendor with fields the backend simply omitted keeps the old APPROVED/LOW defaults', () => {
      let got: Vendor | undefined;
      service.getVendorById('9').subscribe(v => (got = v));
      http.expectOne(`${BASE}/vendor-management/vendors/9`).flush({ id: 9, companyName: 'Old Co', status: 'ACTIVE' });
      expect(got!.tier).toBe(VendorTier.APPROVED);
      expect(got!.riskLevel).toBe(RiskLevel.LOW);
      expect(got!.complianceStatus.isCompliant).toBeTrue();
    });

    it('an explicit backend tier/risk is never overridden by the unreviewed default', () => {
      let got: Vendor | undefined;
      service.getVendorById('9').subscribe(v => (got = v));
      http.expectOne(`${BASE}/vendor-management/vendors/9`).flush({
        id: 9, companyName: 'New Co', status: 'PENDING_ONBOARDING', tier: 'PREFERRED', riskLevel: 'HIGH'
      });
      expect(got!.tier).toBe(VendorTier.PREFERRED);
      expect(got!.riskLevel).toBe(RiskLevel.HIGH);
    });

    it('categories fall back to the registration step5 supply categories', () => {
      let got: Vendor | undefined;
      service.getVendorById('9').subscribe(v => (got = v));
      http.expectOne(`${BASE}/vendor-management/vendors/9`).flush({
        id: 9, companyName: 'New Co', status: 'PENDING_ONBOARDING', step5: { supplyCategories: ['it_electronics'], completedProjectsCount: 4 }
      });
      expect(got!.categories).toEqual(['It Electronics']);
      expect(got!.totalProjects).toBe(4);
    });
  });

  describe('mapComplianceDocument: expiry and status', () => {
    beforeEach(inject);

    const loadDocs = (raw: any[]): any[] => {
      let result: any[] = [];
      service.getVendorDocuments('7').subscribe(docs => (result = docs));
      http.expectOne(`${BASE}/vendor-management/compliance/documents`).flush(raw);
      return result;
    };

    it('a document with no expiry gets a far-future placeholder, not "now" (which looked like it expired today)', () => {
      const [doc] = loadDocs([{ id: 1, vendorId: '7', status: 'ACTIVE' }]);
      expect(doc.expiryDate.getFullYear()).toBeGreaterThan(2098);
      expect(doc.daysUntilExpiry).toBeGreaterThan(1000);
      expect(doc.status).toBe('ACTIVE');
    });

    it('the backend\'s stored status is overridden once the real expiry date has actually passed', () => {
      const past = new Date(Date.now() - 5 * 86400000).toISOString();
      const [doc] = loadDocs([{ id: 1, vendorId: '7', status: 'ACTIVE', expiryDate: past }]);
      expect(doc.status).toBe('EXPIRED');
    });

    it('an ACTIVE document within 30 days of expiry is recomputed as EXPIRING_SOON', () => {
      const soon = new Date(Date.now() + 10 * 86400000).toISOString();
      const [doc] = loadDocs([{ id: 1, vendorId: '7', status: 'ACTIVE', expiryDate: soon }]);
      expect(doc.status).toBe('EXPIRING_SOON');
    });

    it('a document far from expiry is (re)confirmed ACTIVE even if the backend said EXPIRING_SOON', () => {
      const farOut = new Date(Date.now() + 200 * 86400000).toISOString();
      const [doc] = loadDocs([{ id: 1, vendorId: '7', status: 'EXPIRING_SOON', expiryDate: farOut }]);
      expect(doc.status).toBe('ACTIVE');
    });

    it('PENDING_VERIFICATION and REJECTED are left alone regardless of any expiry date', () => {
      const past = new Date(Date.now() - 5 * 86400000).toISOString();
      const [pending] = loadDocs([{ id: 1, vendorId: '7', status: 'PENDING', expiryDate: past }]);
      expect(pending.status).toBe('PENDING_VERIFICATION');
      const [rejected] = loadDocs([{ id: 2, vendorId: '7', status: 'REJECTED', expiryDate: past }]);
      expect(rejected.status).toBe('REJECTED');
    });
  });

  describe('mapVendor: contact fallback matches the VendorContact type', () => {
    beforeEach(inject);

    it('the primary contact built from step3 has a numeric id and a `role` (not `title`)', () => {
      let got: Vendor | undefined;
      service.getVendorById('9').subscribe(v => (got = v));
      http.expectOne(`${BASE}/vendor-management/vendors/9`).flush({
        id: 9, companyName: 'New Co', status: 'PENDING_ONBOARDING',
        step3: { primaryContactName: 'Ada Lovelace', primaryContactTitle: 'Ops Manager', primaryContactEmail: 'a@x.com', primaryContactPhone: '0800' }
      });
      expect(got!.contacts.length).toBe(1);
      expect(typeof got!.contacts[0].id).toBe('number');
      expect(got!.contacts[0].role).toBe('Ops Manager');
      expect((got!.contacts[0] as any).title).toBeUndefined();
    });
  });

  describe('updateVendorStatus', () => {
    beforeEach(inject);

    const loadVendor = () => {
      service.getVendorById('7').subscribe();
      http.expectOne(`${BASE}/vendor-management/vendors/7`).flush({
        id: 7, companyName: 'Acme Ltd', status: 'PENDING_ONBOARDING', email: 'a@acme.example',
        registrationNumber: 'RC1', taxId: 'T1', phone: '1', documents: [{ id: 1 }]
      });
    };

    it('sends the status plus the admin\'s reason/notes', () => {
      loadVendor();
      service.updateVendorStatus('7', VendorStatus.REJECTED, '  Documents are forged  ').subscribe();
      const req = http.expectOne(`${BASE}/vendor-management/vendors/7/status`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ status: 'REJECTED', reason: 'Documents are forged', notes: 'Documents are forged' });
      req.flush(null);
    });

    it('sends only the status when there is no reason', () => {
      loadVendor();
      service.updateVendorStatus('7', VendorStatus.ACTIVE).subscribe();
      const req = http.expectOne(`${BASE}/vendor-management/vendors/7/status`);
      expect(req.request.body).toEqual({ status: 'ACTIVE' });
      req.flush(null);
    });

    it('keeps the full vendor record when the response body is empty (no bogus "Pending Registration" vendor)', () => {
      loadVendor();
      let selected: Vendor | null = null;
      service.selectedVendor$.subscribe(v => (selected = v));

      let result: Vendor | undefined;
      service.updateVendorStatus('7', VendorStatus.ACTIVE).subscribe(v => (result = v));
      http.expectOne(`${BASE}/vendor-management/vendors/7/status`).flush(null);

      expect(result!.status).toBe(VendorStatus.ACTIVE);
      expect(result!.companyName).toBe('Acme Ltd');
      expect(result!.documents.length).toBe(1);
      expect((selected as unknown as Vendor).companyName).toBe('Acme Ltd');
    });

    it('merges into the full loaded record, not a slimmer copy from the list cache', () => {
      service.getVendors(1, 20).subscribe();
      http.expectOne(r => r.url === `${BASE}/vendor-management/vendors`).flush([{ id: 7, companyName: 'Slim', status: 'PENDING_ONBOARDING' }]);
      loadVendor();

      let result: Vendor | undefined;
      service.updateVendorStatus('7', VendorStatus.ACTIVE).subscribe(v => (result = v));
      http.expectOne(`${BASE}/vendor-management/vendors/7/status`).flush({});
      expect(result!.companyName).toBe('Acme Ltd');
    });

    it('a failed change is an error and writes NOTHING to localStorage', () => {
      loadVendor();
      const out = errorOf(service.updateVendorStatus('7', VendorStatus.ACTIVE));
      http.expectOne(`${BASE}/vendor-management/vendors/7/status`).flush('forbidden', { status: 403, statusText: 'Forbidden' });

      expect(out.error).toBeTruthy();
      expect(out.value).toBeUndefined();
      expect(localStorage.getItem('erp_tenant_vendor_approvals')).toBeNull();
      expect(localStorage.length).toBe(0);
    });

    it('after a failed change, the next list load shows the backend\'s real status (no sticky local override)', () => {
      loadVendor();
      errorOf(service.updateVendorStatus('7', VendorStatus.ACTIVE));
      http.expectOne(`${BASE}/vendor-management/vendors/7/status`).flush('x', { status: 500, statusText: 'e' });

      let list: any;
      service.getVendors(1, 20).subscribe(r => (list = r));
      http.expectOne(r => r.url === `${BASE}/vendor-management/vendors`).flush([{ id: 7, companyName: 'Acme Ltd', status: 'PENDING_ONBOARDING' }]);
      expect(list.vendors[0].status).toBe(VendorStatus.PENDING_ONBOARDING);
    });
  });

  describe('getVendors: pagination total when client-side filtering narrows the page', () => {
    beforeEach(inject);

    it('trusts the server total when nothing had to be filtered client-side', () => {
      let list: any;
      service.getVendors(1, 20, { tier: VendorTier.PREFERRED }).subscribe(r => (list = r));
      http.expectOne(r => r.url === `${BASE}/vendor-management/vendors`).flush(
        { vendors: [{ id: 1, companyName: 'A', tier: 'PREFERRED' }], total: 45, totalPages: 3 }
      );
      expect(list.total).toBe(45);
      expect(list.totalPages).toBe(3);
    });

    it('falls back to the actual page length instead of asserting a total it can no longer verify', () => {
      let list: any;
      service.getVendors(1, 20, { tier: VendorTier.PREFERRED }).subscribe(r => (list = r));
      // Server total claims 45 across 3 pages, but this page has a vendor the tier filter must remove
      // client-side — proof the backend did NOT apply the filter, so that total can't be trusted either.
      http.expectOne(r => r.url === `${BASE}/vendor-management/vendors`).flush({
        vendors: [
          { id: 1, companyName: 'A', tier: 'PREFERRED' },
          { id: 2, companyName: 'B', tier: 'APPROVED' }
        ],
        total: 45, totalPages: 3
      });
      expect(list.vendors.length).toBe(1);
      expect(list.total).toBe(1);
      expect(list.totalPages).toBe(1);
    });
  });

  describe('getVendors', () => {
    beforeEach(inject);

    it('still applies the requested status filter client-side', () => {
      let list: any;
      service.getVendors(1, 20, { statuses: [VendorStatus.PENDING_ONBOARDING, VendorStatus.UNDER_REVIEW] }).subscribe(r => (list = r));
      http.expectOne(r => r.url === `${BASE}/vendor-management/vendors`).flush([
        { id: 1, companyName: 'A', status: 'PENDING_ONBOARDING' },
        { id: 2, companyName: 'B', status: 'ACTIVE' },
        { id: 3, companyName: 'C', status: 'UNDER_REVIEW' }
      ]);
      expect(list.vendors.map((v: Vendor) => v.id)).toEqual([1, 3]);
    });

    it('does not log raw vendor payloads (they contain bank and tax details)', () => {
      const log = spyOn(console, 'log');
      service.getVendors(1, 20).subscribe();
      http.expectOne(r => r.url === `${BASE}/vendor-management/vendors`).flush([{ id: 1, companyName: 'A', bankDetails: { accountNumber: '0123456789' } }]);
      expect(log).not.toHaveBeenCalled();
    });
  });

  describe('tenantId', () => {
    beforeEach(inject);

    it('derives the tenant from the subdomain like every other service, instead of always hardcoding optimax', () => {
      // Karma serves the test run itself from localhost, which every service's tenantId getter
      // (this one now included) treats as the local-dev fallback.
      let result: any;
      service.onboardVendor({ companyName: 'Acme' } as any).subscribe(r => (result = r));
      const req = http.expectOne(`${BASE}/vendors`);
      expect(req.request.body.tenantId).toBe('optimax');
      req.flush({});
      // onboardVendor refreshes the vendor list on success.
      http.expectOne(r => r.url === `${BASE}/vendor-management/vendors`).flush([]);
    });
  });
});
