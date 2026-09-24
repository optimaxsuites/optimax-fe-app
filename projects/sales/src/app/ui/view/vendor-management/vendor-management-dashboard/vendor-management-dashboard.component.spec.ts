import { of, throwError } from 'rxjs';

import { VendorManagementDashboardComponent } from './vendor-management-dashboard.component';
import { VendorService } from '../../../service/vendor-management/vendor-management.service';

describe('VendorManagementDashboardComponent (load and error handling)', () => {
  let component: VendorManagementDashboardComponent;
  let vendorService: jasmine.SpyObj<VendorService>;

  const stats = (over: any = {}): any => ({
    totalVendors: 10, activeVendors: 8, highRiskVendors: 2, averagePerformanceScore: 75,
    pendingOnboarding: 0, pendingReview: 0, vendorsByTier: { preferred: 1, approved: 5, conditional: 0 },
    recentActivity: [], expiringDocumentsList: [], topPerformers: [], ...over
  });

  beforeEach(() => {
    vendorService = jasmine.createSpyObj<VendorService>('VendorService', [
      'getDashboardStats', 'getRecentActivity', 'getSentinelInsights', 'getFraudFlags',
      'getSentinelSummaryStats', 'actOnInsight', 'updateFraudFlagStatus'
    ]);
    vendorService.getDashboardStats.and.returnValue(of(stats()));
    vendorService.getRecentActivity.and.returnValue(of([]));
    vendorService.getSentinelInsights.and.returnValue(of([]));
    vendorService.getFraudFlags.and.returnValue(of([]));
    vendorService.getSentinelSummaryStats.and.returnValue(of({} as any));
    component = new VendorManagementDashboardComponent(vendorService, { navigate: jasmine.createSpy('navigate') } as any);
  });

  it('shows the error banner with no fake stats when the dashboard cannot load', () => {
    vendorService.getDashboardStats.and.returnValue(throwError(() => new Error('500')));
    component.loadDashboardData();
    expect(component.error).toContain('Could not load');
    expect(component.isLoading).toBeFalse();
    expect(component.stats).toBeNull();
  });

  it('clears the error on a successful reload', () => {
    vendorService.getDashboardStats.and.returnValue(throwError(() => new Error('500')));
    component.loadDashboardData();
    vendorService.getDashboardStats.and.returnValue(of(stats()));
    component.loadDashboardData();
    expect(component.error).toBeNull();
    expect(component.stats).toBeTruthy();
  });

  it('empties the expiring-documents and top-performer lists when the new data has none', () => {
    vendorService.getDashboardStats.and.returnValue(of(stats({
      expiringDocumentsList: [{ id: 1 }], topPerformers: [{ id: 2 }]
    })));
    component.loadDashboardData();
    expect(component.expiringDocuments.length).toBe(1);
    expect(component.topPerformers.length).toBe(1);

    vendorService.getDashboardStats.and.returnValue(of(stats()));
    component.loadDashboardData();
    expect(component.expiringDocuments).toEqual([]);
    expect(component.topPerformers).toEqual([]);
  });

  it('a response without tier data no longer leaves the page stuck loading', () => {
    vendorService.getDashboardStats.and.returnValue(of({ totalVendors: 3 } as any));
    component.loadDashboardData();
    expect(component.isLoading).toBeFalse();
    expect(component.error).toBeNull();
  });

  it('AI section failures do not raise the page error or fake data', () => {
    vendorService.getSentinelInsights.and.returnValue(throwError(() => new Error('x')));
    vendorService.getFraudFlags.and.returnValue(throwError(() => new Error('x')));
    vendorService.getSentinelSummaryStats.and.returnValue(throwError(() => new Error('x')));
    component.loadDashboardData();
    expect(component.sentinelInsights).toEqual([]);
    expect(component.fraudFlags).toEqual([]);
    expect(component.error).toBeNull();
  });

  it('totalPendingQueue combines onboarding + review, matching what the Approval Queue itself shows', () => {
    vendorService.getDashboardStats.and.returnValue(of(stats({ pendingOnboarding: 15, pendingReview: 10 } as any)));
    component.loadDashboardData();
    expect(component.totalPendingQueue).toBe(25);
  });

  it('insightMetrics is computed once per load, not a fresh array on every read (was bound directly in *ngFor)', () => {
    component.loadDashboardData();
    const first = component.insightMetrics;
    const second = component.insightMetrics;
    expect(first).toBe(second);
    expect(first.length).toBe(4);
  });

  it('only Active Vendors carries a trend, and only when monthOverMonthGrowth is present', () => {
    vendorService.getDashboardStats.and.returnValue(of(stats({ monthOverMonthGrowth: -3.5 } as any)));
    component.loadDashboardData();
    const active = component.insightMetrics.find(m => m.label === 'Active Vendors')!;
    const perf = component.insightMetrics.find(m => m.label === 'Avg Performance Score')!;
    expect(active.trend).toBe('down');
    expect(active.percent).toBe(3.5);
    expect(perf.trend).toBeUndefined();
  });

    it('a failed insight/fraud-flag action is reported', () => {
    vendorService.actOnInsight.and.returnValue(throwError(() => new Error('x')));
    vendorService.updateFraudFlagStatus.and.returnValue(throwError(() => new Error('x')));

    component.actOnInsight({ id: 1 } as any, 'DISMISS');
    expect(component.error).toContain('save that action');

    component.error = null;
    component.clearFraudFlag({ id: 4 } as any);
    expect(component.error).toContain('fraud flag');
  });

  describe('getExpiryLabel', () => {
    it('says a document already expired instead of showing a negative day count', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(component.getExpiryLabel(threeDaysAgo)).toBe('Expired 3d ago');
    });

    it('says a document expires today rather than "0 days"', () => {
      expect(component.getExpiryLabel(new Date())).toBe('Expires today');
    });

    it('still shows a plain day count for a future expiry', () => {
      const in5Days = new Date();
      in5Days.setDate(in5Days.getDate() + 5);
      expect(component.getExpiryLabel(in5Days)).toBe('5 days');
    });
  });
});
