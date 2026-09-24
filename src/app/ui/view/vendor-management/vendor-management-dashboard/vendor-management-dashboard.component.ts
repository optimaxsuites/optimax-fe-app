// vendor-dashboard.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval, takeWhile } from 'rxjs';
import {
  VendorService
} from '../../../service/vendor-management/vendor-management.service';
import {
  VendorDashboardStats,
  VendorRecentActivity,
  VendorDocument,
  Vendor,
  VendorStatus,
  VendorTier,
  RiskLevel,
  getVendorStatusColor,
  getVendorTierLabel,
  getRiskLevelColor,
  getDocumentStatusColor,
  DocumentStatus,
  SentinelInsight,
  InsightActionStatus,
  InsightSeverity,
  FraudFlag,
  SentinelSummaryStats,
  getInsightSeverityColor
} from '../../../domain/vendor-management/vendor-management.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-vendor-management-dashboard',
  templateUrl: './vendor-management-dashboard.component.html',
  styleUrls: ['./vendor-management-dashboard.component.scss']
})
export class VendorManagementDashboardComponent implements OnInit, OnDestroy {

  // ============================================================
  // STATE
  // ============================================================

  isLoading: boolean = true;
  /** Set after the first load settles — see VendorManagementListComponent for why. The 60s
   *  auto-refresh used to tear down and rebuild the entire dashboard on every tick (isLoading=true
   *  hid the whole content container), causing a spinner flash and lost scroll position every
   *  minute; now only the very first load does that. */
  hasLoadedOnce = false;
  stats: VendorDashboardStats | null = null;
  /**
   * The dashboard used three different "Pending" numbers for what a user reasonably reads as the same
   * thing: the sidebar and top-bar badge showed pendingOnboarding, while a stats card explicitly
   * labelled "Pending Review" also showed pendingOnboarding (not pendingReview) — so "Pending Review"
   * never actually reflected vendors under review. The Approval Queue (what "See Registry" links to)
   * combines both PENDING_ONBOARDING and UNDER_REVIEW into one count; this matches that, so every
   * "Pending" figure on this page agrees with what the queue itself shows.
   */
  get totalPendingQueue(): number {
    return (this.stats?.pendingOnboarding ?? 0) + (this.stats?.pendingReview ?? 0);
  }
  insightMetrics: { label: string; value: string; color: string; trend?: 'up' | 'down'; percent?: number }[] = [];
  recentActivity: VendorRecentActivity[] = [];
  expiringDocuments: VendorDocument[] = [];
  topPerformers: Vendor[] = [];

  // AI suggestions (formerly the standalone "AI Vendor Intelligence" tab —
  // surfaced inline here instead of its own workspace)
  sentinelInsights: SentinelInsight[] = [];
  fraudFlags: FraudFlag[] = [];
  aiSummary: SentinelSummaryStats | null = null;
  getInsightSeverityColor = getInsightSeverityColor;

  // Date range
  dateRange: 'week' | 'month' | 'quarter' | 'year' = 'month';

  // Customization
  customization = {
    showStatsGrid: true,
    showPerformanceChart: true,
    showRecentActivity: true,
    showExpiringDocuments: true,
    showTopPerformers: true,
    showRiskAlerts: true,
    showAiInsights: true
  };

  // Chart data
  performanceData: any[] = [];
  vendorTierData: any[] = [];
  riskDistributionData: any[] = [];

  // UI Helpers
  Math = Math;

  // Error state
  error: string | null = null;

  // Subscriptions
  private subscriptions: Subscription[] = [];
  private autoRefreshSubscription?: Subscription;

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private vendorService: VendorService,
    private router: Router
  ) { }

  // ============================================================
  // GETTERS FOR TEMPLATE
  // ============================================================

  get totalVendorsCount(): number { return this.stats?.totalVendors ?? 0; }
  get activeVendorsCount(): number { return this.stats?.activeVendors ?? 0; }
  get pendingOnboardingCount(): number { return this.stats?.pendingOnboarding ?? 0; }
  get monthOverMonthGrowth(): number { return this.stats?.monthOverMonthGrowth ?? 0; }
  get averagePerformanceScore(): number { return this.stats?.averagePerformanceScore ?? 0; }
  get riskAlertsCount(): number { return this.stats?.riskAlertsCount ?? 0; }
  get highRiskVendorsCount(): number { return this.stats?.highRiskVendors ?? 0; }
  get expiringDocumentsCount(): number { return this.stats?.expiringDocuments ?? 0; }

  getCompliancePercentage(): number {
    if (!this.stats || !this.stats.totalVendors) return 0;
    return ((this.stats.totalVendors - this.stats.expiringDocuments) / this.stats.totalVendors) * 100;
  }

  ngOnInit(): void {
    this.loadDashboardData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadDashboardData(): void {
    this.isLoading = true;
    this.error = null;

    // Load dashboard stats
    this.vendorService.getDashboardStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        // Assigned unconditionally: these were only updated when the new list was non-empty, so once
        // every expiring document was renewed (or no one qualified as a top performer) the old
        // entries stayed on screen forever.
        this.recentActivity = stats.recentActivity ?? [];
        this.expiringDocuments = stats.expiringDocumentsList ?? [];
        this.topPerformers = stats.topPerformers ?? [];
        this.insightMetrics = this.buildInsightMetrics(stats);
        this.prepareChartData(stats);
        this.isLoading = false;
        this.hasLoadedOnce = true;
      },
      error: (err) => {
        console.error('Failed to load dashboard stats:', err);
        // Shows the (previously dead) error banner with its Retry button. The service no longer
        // substitutes mock stats, so a failure here is a real "couldn't load", not fake numbers.
        this.error = 'Could not load the vendor dashboard. Please check your connection and try again.';
        this.isLoading = false;
        this.hasLoadedOnce = true;
      }
    });

    // Load recent activity
    this.vendorService.getRecentActivity(10).subscribe({
      next: (activities) => {
        this.recentActivity = activities;
      },
      error: (err) => {
        console.error('Failed to load recent activity:', err);
      }
    });

    // AI suggestions — insights feed, fraud watch, and the rollup numbers for both
    this.vendorService.getSentinelInsights().subscribe({
      next: (insights) => { this.sentinelInsights = insights; },
      error: (err) => console.error('Failed to load AI insights:', err)
    });

    this.vendorService.getFraudFlags().subscribe({
      next: (flags) => { this.fraudFlags = flags; },
      error: (err) => console.error('Failed to load fraud flags:', err)
    });

    this.vendorService.getSentinelSummaryStats().subscribe({
      next: (summary) => { this.aiSummary = summary; },
      error: (err) => console.error('Failed to load AI summary stats:', err)
    });
  }

  // ============================================================
  // AI SUGGESTIONS (INSIGHTS + FRAUD WATCH)
  // ============================================================

  private static readonly SEVERITY_RANK: Record<InsightSeverity, number> = {
    [InsightSeverity.CRITICAL]: 0,
    [InsightSeverity.HIGH]: 1,
    [InsightSeverity.MEDIUM]: 2,
    [InsightSeverity.LOW]: 3
  };

  /** Open insights only, most severe/recent first, capped to keep the card compact. */
  get topInsights(): SentinelInsight[] {
    return this.sentinelInsights
      .filter(i => i.status === InsightActionStatus.OPEN)
      .sort((a, b) =>
        VendorManagementDashboardComponent.SEVERITY_RANK[a.severity] - VendorManagementDashboardComponent.SEVERITY_RANK[b.severity]
        || new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
      )
      .slice(0, 4);
  }

  /** Fraud flags still awaiting a first look, most recent first, capped to keep the card compact. */
  get pendingFraudFlags(): FraudFlag[] {
    return this.fraudFlags
      .filter(f => f.status === 'PENDING_REVIEW')
      .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
      .slice(0, 4);
  }

  actOnInsight(insight: SentinelInsight, action: string): void {
    this.vendorService.actOnInsight(insight.id, action).subscribe({
      next: (updated) => { this.sentinelInsights = updated; },
      error: (err) => {
        console.error('Failed to act on insight:', err);
        this.error = 'Could not save that action. Please try again.';
      }
    });
  }

  investigateFraudFlag(flag: FraudFlag): void {
    this.vendorService.updateFraudFlagStatus(flag.id, 'INVESTIGATING').subscribe({
      next: (updated) => { this.fraudFlags = updated; },
      error: (err) => {
        console.error('Failed to update fraud flag:', err);
        this.error = 'Could not update that fraud flag. Please try again.';
      }
    });
  }

  clearFraudFlag(flag: FraudFlag): void {
    this.vendorService.updateFraudFlagStatus(flag.id, 'CLEARED').subscribe({
      next: (updated) => { this.fraudFlags = updated; },
      error: (err) => {
        console.error('Failed to update fraud flag:', err);
        this.error = 'Could not update that fraud flag. Please try again.';
      }
    });
  }

  // ============================================================
  // CHART DATA PREPARATION
  // ============================================================

  prepareChartData(stats: VendorDashboardStats): void {
    // Vendor Tier Distribution
    // Guarded: a response without vendorsByTier used to throw here, inside the success handler, so the
    // loading spinner never cleared and no error was shown.
    const tiers = stats.vendorsByTier ?? { preferred: 0, approved: 0, conditional: 0 };
    this.vendorTierData = [
      { label: '⭐ Preferred', value: tiers.preferred ?? 0, color: '#2EB270' },
      { label: '✓ Approved', value: tiers.approved ?? 0, color: '#2E6276' },
      { label: '⚠️ Conditional', value: tiers.conditional ?? 0, color: '#F59E0B' }
    ].filter(item => item.value > 0);

    // Risk Distribution
    const total = stats.totalVendors ?? 0;
    const highRisk = stats.highRiskVendors ?? 0;
    this.riskDistributionData = [
      { label: 'Low Risk', value: total - highRisk, color: '#2EB270' },
      { label: 'High Risk', value: highRisk, color: '#DC2626' }
    ];

    this.performanceData = [];
  }

  // ============================================================
  // AUTO REFRESH
  // ============================================================

  private startAutoRefresh(): void {
    // Refresh every 60 seconds
    this.autoRefreshSubscription = interval(60000)
      .pipe(takeWhile(() => true))
      .subscribe(() => {
        this.loadDashboardData();
      });
  }

  // ============================================================
  // DATE RANGE CHANGES
  // ============================================================

  changeDateRange(range: 'week' | 'month' | 'quarter' | 'year'): void {
    this.dateRange = range;
    // In real implementation, this would re-fetch data for the new range
    this.loadDashboardData();
  }

  // ============================================================
  // NAVIGATION - FIXED
  // ============================================================

  // Tab sessionStorage key used by NavTabComponent for the vendor management shell
  private readonly VM_TAB_KEY = 'dashboard-vendor global registry-vendor directory';

  navigateToVendors(): void {
    sessionStorage.setItem(this.VM_TAB_KEY, 'Vendor Directory');
    this.router.navigate(['/admin/sales/commerce/manage-vendors']);
  }

  navigateToVendor(id: string): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors', id, 'profile'], {
      queryParams: { returnTo: 'dashboard' }
    });
  }

  navigateToPerformance(): void {
    sessionStorage.setItem(this.VM_TAB_KEY, 'Vendor Directory');
    this.router.navigate(['/admin/sales/commerce/manage-vendors']);
  }

  navigateToRisk(): void {
    sessionStorage.setItem(this.VM_TAB_KEY, 'Vendor Directory');
    this.router.navigate(['/admin/sales/commerce/manage-vendors']);
  }

  navigateToDocuments(id: string): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors', id, 'profile'], {
      queryParams: { returnTo: 'dashboard' }
    });
  }

  // ============================================================
  // CUSTOMIZATION
  // ============================================================

  openCustomizationModal(): void {
    // In real implementation, this would open a modal/drawer
    console.log('Open customization modal');
  }

  saveCustomization(): void {
    // Save to localStorage or API
    localStorage.setItem('vendorDashboardCustomization', JSON.stringify(this.customization));
  }

  loadCustomization(): void {
    const saved = localStorage.getItem('vendorDashboardCustomization');
    if (saved) {
      try {
        this.customization = { ...this.customization, ...JSON.parse(saved) };
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getVendorStatusColor(status: VendorStatus): string {
    return getVendorStatusColor(status);
  }

  getVendorTierLabel(tier: VendorTier): string {
    return getVendorTierLabel(tier);
  }

  getRiskLevelColor(level: RiskLevel): string {
    return getRiskLevelColor(level);
  }

  getDocumentStatusColor(status: DocumentStatus): string {
    return getDocumentStatusColor(status);
  }

  getDocumentStatusLabel(status: DocumentStatus): string {
    const map: Record<DocumentStatus, string> = {
      [DocumentStatus.ACTIVE]: 'Active',
      [DocumentStatus.EXPIRING_SOON]: 'Expiring Soon',
      [DocumentStatus.EXPIRED]: 'Expired',
      [DocumentStatus.PENDING_VERIFICATION]: 'Pending',
      [DocumentStatus.REJECTED]: 'Rejected'
    };
    return map[status] || status;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    // A missing/null value used to throw here (`undefined.toString()`), inside loadDashboardData()'s
    // success handler — same "spinner stuck forever" failure mode as the averagePerformanceScore fix
    // above, since a throw there happens before isLoading is ever reset to false.
    if (value == null) return '0';
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  getDaysUntilExpiry(date: Date): number {
    const now = new Date();
    const expiry = new Date(date);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /** A document already past its expiry showed as "-3 days" instead of saying it expired. */
  getExpiryLabel(date: Date): string {
    const days = this.getDaysUntilExpiry(date);
    if (days < 0) return `Expired ${Math.abs(days)}d ago`;
    if (days === 0) return 'Expires today';
    return `${days} days`;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/_/g, '-');
  }

  getStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // ============================================================
  // CHART HELPERS
  // ============================================================

  getConicGradient(): string {
    if (!this.vendorTierData || this.vendorTierData.length === 0) {
      return '#e2e8f0';
    }

    const total = this.vendorTierData.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return '#e2e8f0';

    let gradient = '';
    let currentAngle = 0;

    this.vendorTierData.forEach((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (percentage / 100) * 360;
      const start = currentAngle;
      const end = currentAngle + angle;

      if (index === 0) {
        gradient = `conic-gradient(${item.color} 0% ${end}%`;
      } else {
        gradient += `, ${item.color} ${start}% ${end}%`;
      }

      if (index === this.vendorTierData.length - 1) {
        gradient += ')';
      }

      currentAngle = end;
    });

    return gradient;
  }

  getChartCallouts(): any[] {
    if (!this.vendorTierData || this.vendorTierData.length === 0) {
      return [];
    }

    const total = this.vendorTierData.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return [];

    const centerX = 290;
    const centerY = 180;
    const radius = 140;
    const calloutRadius = 180;

    return this.vendorTierData.map((item, index) => {
      const percentage = (item.value / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = this.vendorTierData.slice(0, index).reduce((sum, prev) =>
        sum + (prev.value / total) * 360, 0);
      const midAngle = startAngle + angle / 2;
      const rad = (midAngle - 90) * Math.PI / 180;

      const x = centerX + calloutRadius * Math.cos(rad);
      const y = centerY + calloutRadius * Math.sin(rad);

      const lineStartX = centerX + radius * Math.cos(rad);
      const lineStartY = centerY + radius * Math.sin(rad);

      const isRight = x > centerX;
      const textAnchor = isRight ? 'start' : 'end';
      const textX = x + (isRight ? 20 : -20);

      return {
        label: item.label,
        amount: this.formatCurrency(item.value),
        percent: percentage.toFixed(1) + '%',
        value: item.value,
        color: item.color,
        x: x,
        y: y,
        textX: textX,
        textY: y,
        textAnchor: textAnchor,
        linePath: `M${lineStartX},${lineStartY} L${x},${y}`
      };
    });
  }

  getMaxPerformance(): number {
    if (!this.performanceData || this.performanceData.length === 0) return 100;
    const max = Math.max(...this.performanceData.map(d => d.score));
    return Math.ceil(max / 10) * 10 + 10;
  }

  getPointX(index: number): number {
    if (!this.performanceData || this.performanceData.length === 0) return 0;
    const padding = 40;
    const width = 500 - padding * 2;
    return padding + (index / (this.performanceData.length - 1)) * width;
  }

  getPointY(value: number): number {
    const max = this.getMaxPerformance();
    const padding = 20;
    const height = 260 - padding * 2;
    return padding + height - (value / max) * height;
  }

  getLineChartPath(): string {
    if (!this.performanceData || this.performanceData.length === 0) return '';

    return this.performanceData.map((d, i) => {
      const x = this.getPointX(i);
      const y = this.getPointY(d.score);
      return (i === 0 ? 'M' : 'L') + `${x},${y}`;
    }).join(' ');
  }

  getDeliveryLineChartPath(): string {
    if (!this.performanceData || this.performanceData.length === 0) return '';

    return this.performanceData.map((d, i) => {
      const x = this.getPointX(i);
      const y = this.getPointY(d.onTimeDelivery);
      return `${x},${y}`;
    }).join(' ');
  }

  getLineChartAreaPath(): string {
    if (!this.performanceData || this.performanceData.length === 0) return '';

    const path = this.performanceData.map((d, i) => {
      const x = this.getPointX(i);
      const y = this.getPointY(d.score);
      return (i === 0 ? 'M' : 'L') + `${x},${y}`;
    }).join(' ');

    const lastX = this.getPointX(this.performanceData.length - 1);
    const firstX = this.getPointX(0);
    return path + ` L${lastX},${this.getPointY(0)} L${firstX},${this.getPointY(0)} Z`;
  }

  /**
   * The trend arrow/percentage on each of these cards used to be hard-coded (4.2%, 8.7%, 3.1%, and
   * 5.2%-or-2.8% depending on a threshold) regardless of the real numbers — always "up" and "improving"
   * no matter what the vendor base actually did. VendorDashboardStats only exposes ONE real trend figure
   * (monthOverMonthGrowth, for the vendor base as a whole), so only the metric it actually describes —
   * Active Vendors — gets a trend; the other three show no fabricated movement.
   *
   * Computed once per stats load (see loadDashboardData) and read from the `insightMetrics` field by
   * the template, rather than called directly from *ngFor — that ran on every change-detection tick and
   * returned a brand-new array of brand-new objects each time, so Angular tore down and rebuilt all
   * four cards on every tick instead of only when the underlying stats actually changed.
   */
  private buildInsightMetrics(stats: VendorDashboardStats): { label: string; value: string; color: string; trend?: 'up' | 'down'; percent?: number }[] {
    const growth = stats.monthOverMonthGrowth;

    return [
      {
        label: 'Avg Performance Score',
        // A response missing this field used to throw here (a direct .toFixed() call on undefined),
        // which happens INSIDE the success handler — the catch never sees it, so isLoading is never
        // reset and the page is stuck on the loading spinner forever.
        value: (stats.averagePerformanceScore ?? 0).toFixed(1) + '%',
        color: '#2E6276'
      },
      {
        label: 'Active Vendors',
        value: this.formatNumber(stats.activeVendors),
        color: '#2EB270',
        ...(growth != null ? { trend: growth >= 0 ? 'up' as const : 'down' as const, percent: Math.abs(growth) } : {})
      },
      {
        label: 'Pending Review',
        value: this.formatNumber(stats.pendingReview),
        color: '#F59E0B'
      },
      {
        label: 'High Risk Vendors',
        value: this.formatNumber(stats.highRiskVendors),
        color: '#DC2626'
      }
    ];
  }

  // Navigation - Global Registry (Vendor Approval Queue tab)
  navigateToApprovalQueue(): void {
    sessionStorage.setItem(this.VM_TAB_KEY, 'Vendor Global Registry');
    this.router.navigate(['/admin/sales/commerce/manage-vendors']);
  }

  // Refresh
  refreshData(): void {
    this.error = null;
    this.loadDashboardData();
  }

  // Export
  exportReport(): void {
    console.log('Exporting vendor report...');
  }
}