// vendor-management-detail.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import {
  VendorService
} from '../../../service/vendor-management/vendor-management.service';
import { ApprovalService } from '../../../service/approval-inbox/approval.service';
import {
  Vendor,
  VendorStatus,
  VendorTier,
  RiskLevel,
  VendorDocument,
  VendorPerformanceMetrics,
  VendorLifecycleHistory,
  RiskAlert,
  DocumentCategory,  // <-- ADD THIS
  getVendorStatusColor,
  getVendorTierLabel,
  getRiskLevelColor,
  getDocumentStatusColor,
  DocumentStatus
} from '../../../domain/vendor-management/vendor-management.dto';
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_SIZE_LABELS,
  OWNERSHIP_TYPE_LABELS,
  SUPPLY_CATEGORY_LABELS
} from '../../../domain/vendor-portal/vendor-registration.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-vendor-management-detail',
  templateUrl: './vendor-management-detail.component.html',
  styleUrls: ['./vendor-management-detail.component.scss']
})
export class VendorManagementDetailComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {

  // ============================================================
  // VIEW CHILDREN & INPUTS / OUTPUTS
  // ============================================================

  @ViewChild('headerElement') headerElement!: ElementRef;
  @ViewChild('tabsContainer') tabsContainer!: ElementRef;

  @Input() vendorId: string = '';
  @Output() close = new EventEmitter<void>();

  // ============================================================
  // STATE
  // ============================================================

  // Core
  vendor: Vendor | null = null;
  isLoading: boolean = true;
  isSaving: boolean = false;
  error: string | null = null;

  // Tabs
  activeTab: 'overview' | 'registration' | 'performance' | 'risk' | 'documents' | 'activity' = 'overview';
  tabLabels = {
    overview: 'Overview',
    registration: 'Registration',
    performance: 'Performance',
    risk: 'Risk & Compliance',
    documents: 'Documents',
    activity: 'Activity'
  };

  // Data
  documents: VendorDocument[] = [];
  performance: VendorPerformanceMetrics | null = null;
  lifecycleHistory: VendorLifecycleHistory[] = [];
  riskAlerts: RiskAlert[] = [];

  // Document upload — real progress from the HTTP request, driven down into app-vendor-documents.
  isUploadingDocument = false;
  uploadProgress = 0;
  uploadServerError: string | null = null;

  // UI
  Math = Math;
  parseFloat = parseFloat;
  showConfirmDialog: boolean = false;
  confirmAction: 'status' | null = null;
  /** The status the open confirm dialog will apply, and the admin's reason for it. */
  pendingStatus: VendorStatus | null = null;
  statusReason = '';
  readonly maxStatusReasonLength = 500;
  /** A failed action (e.g. status change) — the vendor was NOT changed. */
  actionError: string | null = null;
  /** Tabs whose data couldn't be loaded, so an empty tab isn't mistaken for "no data". */
  failedSections: string[] = [];
  confirmMessage: string = '';
  showStatusDropdown: boolean = false;

  // The dropdown's own wrapper stops click propagation (see the template), so any click that reaches
  // here is necessarily OUTSIDE it. It previously only closed on picking an option or re-toggling the
  // button — clicking anywhere else on the page left it open.
  @HostListener('document:click')
  closeStatusDropdownOnOutsideClick(): void {
    this.showStatusDropdown = false;
  }

  // Enums for template
  VendorStatus = VendorStatus;
  VendorTier = VendorTier;
  RiskLevel = RiskLevel;
  DocumentStatus = DocumentStatus;

  // Performance chart
  performanceChartData: any = null;

  // Private
  private destroy$ = new Subject<void>();
  private returnTo: 'registry' | 'directory' | 'dashboard' = 'registry';

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  // A vendor's own profile and documents come from the vendor themself, via the Vendor Portal
  // (see VendorService.mapVendor()'s `registration` field) — customers only ever get a read-only
  // view of that data here, they never edit or upload on the vendor's behalf.
  isCustomer: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private vendorService: VendorService,
    private approvalService: ApprovalService
  ) {}

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    this.isCustomer = this.approvalService.getCurrentActor().roleCode === 'ROLE_USER';

    if (this.vendorId) {
      this.loadVendorData();
    } else {
      this.route.params.pipe(
        takeUntil(this.destroy$)
      ).subscribe(params => {
        if (params['id']) {
          this.vendorId = params['id'];
          this.loadVendorData();
        }
      });
    }

    // Subscribe to vendor updates from service
    this.vendorService.selectedVendor$
      .pipe(takeUntil(this.destroy$))
      .subscribe(vendor => {
        if (vendor && String(vendor.id) === this.vendorId) {
          this.vendor = vendor;
          this.isLoading = false;
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vendorId'] && !changes['vendorId'].firstChange && this.vendorId) {
      this.loadVendorData();
    }
  }

  goBack(): void {
    if (this.close.observed) {
      this.close.emit();
    } else {
      const tabName = this.returnTo === 'directory'
        ? 'Vendor Directory'
        : this.returnTo === 'dashboard'
          ? 'Dashboard'
          : 'Vendor Global Registry';
      sessionStorage.setItem('dashboard-vendor global registry-vendor directory', tabName);
      this.router.navigate(['/admin/sales/commerce/manage-vendors']);
    }
  }

  ngAfterViewInit(): void {
    // Check for tab from URL
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const tab = params['tab'];
      if (params['returnTo'] === 'directory' || params['returnTo'] === 'dashboard' || params['returnTo'] === 'registry') {
        this.returnTo = params['returnTo'];
      }
      if (tab && this.tabLabels[tab as keyof typeof this.tabLabels]) {
        this.activeTab = tab as typeof this.activeTab;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  /**
   * Bumped by loadVendorData() (a full vendor switch) and by a standalone loadRelatedData() call (the
   * "Retry" link for failed tabs). Every async callback below checks it's still the current request
   * before applying anything — without this, switching from vendor A to vendor B quickly could let A's
   * slower response land after B's and overwrite B's data (including B's route id) with A's.
   */
  private loadRequestId = 0;

  loadVendorData(): void {
    this.isLoading = true;
    this.error = null;
    const requestId = ++this.loadRequestId;

    // Load vendor details
    this.vendorService.getVendorById(this.vendorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vendor) => {
          if (requestId !== this.loadRequestId) return; // superseded by a newer vendor switch
          this.vendor = vendor;
          // Seed immediately from the vendor's own record — loadRelatedData()'s
          // dedicated documents call may fail/fall back before it resolves, and
          // this is the vendor's real registration data either way.
          this.documents = vendor.documents || [];
          this.lifecycleHistory = vendor.lifecycleHistory || [];
          this.riskAlerts = vendor.riskAlerts || [];
          this.isLoading = false;
          // Load related data, sharing this same request id so a stale documents/performance/etc.
          // response for the PREVIOUS vendor can't land after this one and overwrite it either.
          this.loadRelatedData(requestId);
        },
        error: (err) => {
          if (requestId !== this.loadRequestId) return;
          console.error('Failed to load vendor:', err);
          this.error = 'Failed to load vendor details';
          this.isLoading = false;
        }
      });
  }

  loadRelatedData(requestId: number = ++this.loadRequestId): void {
    // Each call records its own failure. Errors used to be console-only while the service substituted
    // mock documents / performance / alerts / history, so a failed load looked like real data; now a
    // failed load leaves the tab empty AND says so (see failedSections / the notice under the header).
    this.failedSections = [];
    const stale = () => requestId !== this.loadRequestId;
    const failed = (name: string) => (err: unknown) => {
      if (stale()) return;
      console.error(`Failed to load ${name}:`, err);
      if (!this.failedSections.includes(name)) this.failedSections = [...this.failedSections, name];
    };

    this.vendorService.getVendorDocuments(this.vendorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docs) => { if (!stale()) this.documents = docs; },
        error: failed('documents')
      });

    this.vendorService.getVendorPerformance(this.vendorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (stale()) return;
          this.performance = response.metrics;
          this.preparePerformanceChart();
        },
        error: failed('performance')
      });

    this.vendorService.getLifecycleHistory(this.vendorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => { if (!stale()) this.lifecycleHistory = history; },
        error: failed('activity history')
      });

    this.vendorService.getRiskAlerts(this.vendorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => { if (!stale()) this.riskAlerts = alerts; },
        error: failed('risk alerts')
      });
  }

  // ============================================================
  // PERFORMANCE CHART
  // ============================================================

  preparePerformanceChart(): void {
    if (!this.performance?.trendData) return;

    this.performanceChartData = {
      labels: this.performance.trendData.map(d => d.period),
      datasets: [
        {
          label: 'Overall Score',
          data: this.performance.trendData.map(d => d.score),
          color: '#184440'
        },
        {
          label: 'On-Time Delivery',
          data: this.performance.trendData.map(d => d.onTimeDelivery),
          color: '#2EB270'
        },
        {
          label: 'Quality',
          data: this.performance.trendData.map(d => d.quality),
          color: '#F5A623'
        }
      ]
    };
  }

  // ============================================================
  // TAB MANAGEMENT
  // ============================================================

  setActiveTab(tab: any): void {
    this.activeTab = tab;
    // Update URL query param
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge'
    });
  }

  getTabClass(tab: typeof this.activeTab): string {
    return this.activeTab === tab ? 'active' : '';
  }

  // ============================================================
  // EDIT MODE
  // ============================================================

  // ============================================================
  // STATUS MANAGEMENT
  // ============================================================

  /**
   * Which statuses a vendor can move to from each current status. The menu used to offer every status
   * regardless, so a REJECTED or OFFBOARDED vendor could be set straight back to ACTIVE, and a vendor
   * still awaiting review could be suspended — bypassing approval. OFFBOARDED is final.
   */
  private static readonly STATUS_TRANSITIONS: Record<VendorStatus, VendorStatus[]> = {
    [VendorStatus.PENDING_ONBOARDING]: [VendorStatus.UNDER_REVIEW, VendorStatus.ACTIVE, VendorStatus.REJECTED],
    [VendorStatus.UNDER_REVIEW]: [VendorStatus.ACTIVE, VendorStatus.REJECTED],
    [VendorStatus.ACTIVE]: [VendorStatus.CONDITIONAL, VendorStatus.SUSPENDED, VendorStatus.INACTIVE, VendorStatus.OFFBOARDED],
    [VendorStatus.CONDITIONAL]: [VendorStatus.ACTIVE, VendorStatus.SUSPENDED, VendorStatus.INACTIVE, VendorStatus.OFFBOARDED],
    [VendorStatus.SUSPENDED]: [VendorStatus.ACTIVE, VendorStatus.INACTIVE, VendorStatus.OFFBOARDED],
    [VendorStatus.INACTIVE]: [VendorStatus.ACTIVE, VendorStatus.OFFBOARDED],
    [VendorStatus.OFFBOARDED]: [],
    [VendorStatus.REJECTED]: [VendorStatus.UNDER_REVIEW]
  };

  /** Statuses that need a recorded reason (and a confirmation) before they're applied. */
  private static readonly REASON_REQUIRED = new Set<VendorStatus>([
    VendorStatus.SUSPENDED, VendorStatus.OFFBOARDED, VendorStatus.INACTIVE, VendorStatus.REJECTED
  ]);

  getStatusOptions(): VendorStatus[] {
    return this.vendor ? (VendorManagementDetailComponent.STATUS_TRANSITIONS[this.vendor.status] ?? []) : [];
  }

  changeStatus(status: VendorStatus): void {
    this.showStatusDropdown = false;
    this.actionError = null;
    if (this.isCustomer || !this.vendor || this.isSaving || status === this.vendor.status) return;

    if (VendorManagementDetailComponent.REASON_REQUIRED.has(status)) {
      const name = this.vendor.companyName;
      const messages: Partial<Record<VendorStatus, string>> = {
        [VendorStatus.SUSPENDED]: `Suspend ${name}? They will be unable to take part in new opportunities.`,
        [VendorStatus.OFFBOARDED]: `Offboard ${name}? This is final — no further status changes will be possible.`,
        [VendorStatus.INACTIVE]: `Deactivate ${name}?`,
        [VendorStatus.REJECTED]: `Reject ${name}'s application?`
      };
      this.pendingStatus = status;
      this.statusReason = '';
      this.confirmAction = 'status';
      this.confirmMessage = messages[status] ?? `Change ${name}'s status to ${this.getStatusLabel(status)}?`;
      this.showConfirmDialog = true;
    } else {
      this.executeStatusChange(status);
    }
  }

  executeStatusChange(status: VendorStatus, reason?: string): void {
    if (this.isCustomer || !this.vendor || this.isSaving) return;

    this.isSaving = true;
    this.actionError = null;
    this.vendorService.updateVendorStatus(this.vendorId, status, reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.cancelDialog();
          this.reloadAfterStatusChange();
        },
        error: (err) => {
          console.error('Failed to update status:', err);
          this.isSaving = false;
          this.cancelDialog();
          // The vendor's status was NOT changed. (This used to persist the requested status locally and
          // show it as done, so a failed suspend/approve looked successful and stuck across reloads.)
          this.actionError = `Could not change the status to ${this.getStatusLabel(status)}. Nothing was changed — please try again.`;
        }
      });
  }

  /** Re-reads the vendor and its history from the backend so the page shows what was really saved. */
  private reloadAfterStatusChange(): void {
    this.vendorService.getVendorById(this.vendorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vendor) => { this.vendor = vendor; },
        error: (err) => console.error('Failed to refresh vendor after status change:', err)
      });
    this.vendorService.getLifecycleHistory(this.vendorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => { this.lifecycleHistory = history; },
        error: (err) => console.error('Failed to refresh history after status change:', err)
      });
  }

  get canConfirmStatusChange(): boolean {
    return this.confirmAction === 'status' && !!this.pendingStatus && !!this.statusReason.trim() && !this.isSaving;
  }

  confirmDialogAction(): void {
    if (this.confirmAction === 'status' && this.pendingStatus && this.statusReason.trim()) {
      this.executeStatusChange(this.pendingStatus, this.statusReason.trim());
    }
  }

  cancelDialog(): void {
    this.showConfirmDialog = false;
    this.confirmAction = null;
    this.confirmMessage = '';
    this.pendingStatus = null;
    this.statusReason = '';
  }

  // ============================================================
  // TEMPLATE HELPERS & GETTERS
  // ============================================================

  getTabLabel(tab: string): string {
    return this.tabLabels[tab as keyof typeof this.tabLabels] || tab;
  }

  // ============================================================
  // REGISTRATION TAB HELPERS
  // ============================================================

  get registration() {
    return this.vendor?.registration ?? null;
  }

  getBusinessTypeLabel(type?: string): string {
    return (type && BUSINESS_TYPE_LABELS[type as keyof typeof BUSINESS_TYPE_LABELS]) || type || '—';
  }

  getBusinessSizeLabel(size?: string): string {
    return (size && BUSINESS_SIZE_LABELS[size as keyof typeof BUSINESS_SIZE_LABELS]) || size || '—';
  }

  getOwnershipTypeLabel(type?: string): string {
    return (type && OWNERSHIP_TYPE_LABELS[type as keyof typeof OWNERSHIP_TYPE_LABELS]) || type || '—';
  }

  getSupplyCategoryLabel(cat?: string): string {
    return (cat && SUPPLY_CATEGORY_LABELS[cat as keyof typeof SUPPLY_CATEGORY_LABELS]) || cat || '—';
  }

  getSupplyCategoryLabels(cats?: string[]): string {
    return (cats || []).map(c => this.getSupplyCategoryLabel(c)).join(', ') || '—';
  }

  getDeliveryRegionLabels(regions?: string[]): string {
    return (regions || []).map(r => r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ') || '—';
  }

  yesNo(val?: boolean): string {
    return val ? 'Yes' : 'No';
  }

  // Matches risk.component.ts's own definition of "open" — this badge used to count only OPEN while
  // the Risk tab it links to counted OPEN + IN_PROGRESS, so a vendor with an alert being actively
  // worked showed a badge of 0 (or no badge at all) on a tab that itself said "1 open".
  get openRiskAlertsCount(): number {
    return this.riskAlerts ? this.riskAlerts.filter(a => a.status === 'OPEN' || a.status === 'IN_PROGRESS').length : 0;
  }

  get expiringOrExpiredDocsCount(): number {
    return this.documents ? this.documents.filter(d => d.status === DocumentStatus.EXPIRING_SOON || d.status === DocumentStatus.EXPIRED).length : 0;
  }

  getPerformanceScores(): number[] {
    return this.performance?.trendData?.map(d => d.score) || [];
  }

  parseKpiValue(val: any): number {
    if (typeof val === 'number') return val;
    return parseFloat(val) || 0;
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  navigateToPerformance(): void {
    this.setActiveTab('performance');
  }

  navigateToRisk(): void {
    this.setActiveTab('risk');
  }

  navigateToDocuments(): void {
    this.setActiveTab('documents');
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

  getStatusLabel(status: VendorStatus): string {
    const map: Record<VendorStatus, string> = {
      [VendorStatus.ACTIVE]: 'Active',
      [VendorStatus.INACTIVE]: 'Inactive',
      [VendorStatus.PENDING_ONBOARDING]: 'Pending Onboarding',
      [VendorStatus.UNDER_REVIEW]: 'Under Review',
      [VendorStatus.SUSPENDED]: 'Suspended',
      [VendorStatus.OFFBOARDED]: 'Offboarded',
      [VendorStatus.CONDITIONAL]: 'Conditional',
      [VendorStatus.REJECTED]: 'Rejected'
    };
    return map[status] || status;
  }

  getTierLabel(tier: VendorTier): string {
    const map: Record<VendorTier, string> = {
      [VendorTier.PREFERRED]: '⭐ Preferred',
      [VendorTier.APPROVED]: '✓ Approved',
      [VendorTier.CONDITIONAL]: '⚠️ Conditional'
    };
    return map[tier] || tier;
  }

  formatDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(value: number): string {
    if (!value) return '—';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    if (!value) return '—';
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

  getPerformanceColor(score: number): string {
    if (score >= 80) return '#2EB270';
    if (score >= 60) return '#F5A623';
    if (score >= 40) return '#F97316';
    return '#DC2626';
  }

  getPerformanceLabel(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }

  getRiskSeverityClass(severity: string): string {
    const map: Record<string, string> = {
      'CRITICAL': 'critical',
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low',
      'INFO': 'info'
    };
    return map[severity] || 'info';
  }

  getRiskSeverityIcon(severity: string): string {
    const map: Record<string, string> = {
      'CRITICAL': 'fa-exclamation-triangle',
      'HIGH': 'fa-exclamation-circle',
      'MEDIUM': 'fa-exclamation',
      'LOW': 'fa-info-circle',
      'INFO': 'fa-info'
    };
    return map[severity] || 'fa-info';
  }

  getLifecycleEventIcon(event: string): string {
    const map: Record<string, string> = {
      'APPLIED': 'fa-user-plus',
      'DOCUMENTS_SUBMITTED': 'fa-file-upload',
      'UNDER_REVIEW': 'fa-search',
      'APPROVED': 'fa-check-circle',
      'REJECTED': 'fa-times-circle',
      'ACTIVATED': 'fa-play-circle',
      'SUSPENDED': 'fa-pause-circle',
      'OFFBOARDED': 'fa-stop-circle'
    };
    return map[event] || 'fa-circle';
  }

  getLifecycleEventColor(event: string): string {
    const map: Record<string, string> = {
      'APPLIED': '#F5A623',
      'DOCUMENTS_SUBMITTED': '#184440',
      'UNDER_REVIEW': '#F97316',
      'APPROVED': '#2EB270',
      'REJECTED': '#DC2626',
      'ACTIVATED': '#2EB270',
      'SUSPENDED': '#DC2626',
      'OFFBOARDED': '#6B7280'
    };
    return map[event] || '#6B7280';
  }

  getAlertSeverityClass(severity: string): string {
    const map: Record<string, string> = {
      'CRITICAL': 'critical',
      'WARNING': 'warning',
      'INFO': 'info'
    };
    return map[severity] || 'info';
  }

  // ============================================================
  // CHART HELPERS (for inline SVG charts)
  // ============================================================

  getMaxPerformance(): number {
    if (!this.performance?.trendData || this.performance.trendData.length === 0) return 100;
    const max = Math.max(...this.performance.trendData.map(d => d.score));
    return Math.ceil(max / 10) * 10 + 10;
  }

  getPointX(index: number, total: number): number {
    const padding = 40;
    const width = 500 - padding * 2;
    return padding + (index / (total - 1 || 1)) * width;
  }

  getPointY(value: number, max: number): number {
    const padding = 20;
    const height = 260 - padding * 2;
    return padding + height - (value / max) * height;
  }

  getPerformanceChartPath(data: number[], max: number): string {
    if (!data || data.length === 0) return '';

    return data.map((d, i) => {
      const x = this.getPointX(i, data.length);
      const y = this.getPointY(d, max);
      return (i === 0 ? 'M' : 'L') + `${x},${y}`;
    }).join(' ');
  }

  getPerformanceChartAreaPath(data: number[], max: number): string {
    if (!data || data.length === 0) return '';

    const path = data.map((d, i) => {
      const x = this.getPointX(i, data.length);
      const y = this.getPointY(d, max);
      return (i === 0 ? 'M' : 'L') + `${x},${y}`;
    }).join(' ');

    const lastX = this.getPointX(data.length - 1, data.length);
    const firstX = this.getPointX(0, data.length);
    const baseY = this.getPointY(0, max);
    return path + ` L${lastX},${baseY} L${firstX},${baseY} Z`;
  }

  // ============================================================
  // DOCUMENT HANDLERS
  // ============================================================

  handleDocumentUpload(event: { file: File; category: DocumentCategory; issueDate: Date; expiryDate: Date }): void {
    if (this.isCustomer) return;
    this.isUploadingDocument = true;
    this.uploadProgress = 0;
    this.uploadServerError = null;

    this.vendorService.uploadDocument(
      this.vendorId,
      event.file,
      event.category,
      event.issueDate,
      event.expiryDate
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (uploadEvent) => {
          if (uploadEvent.type === 'progress') {
            this.uploadProgress = uploadEvent.progress;
            return;
          }
          this.isUploadingDocument = false;
          this.loadRelatedData();
        },
        error: (err) => {
          this.isUploadingDocument = false;
          this.uploadServerError = 'Upload failed — please try again.';
          console.error('Failed to upload document:', err);
        }
      });
  }

  handleDocumentDelete(documentId: string): void {
    if (this.isCustomer) return;
    this.vendorService.deleteDocument(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Document deleted');
          this.loadRelatedData();
        },
        error: (err) => {
          console.error('Failed to delete document:', err);
        }
      });
  }

  handleDocumentVerify(event: { documentId: string; verified: boolean; notes?: string }): void {
    if (this.isCustomer) return;
    this.vendorService.verifyDocument(event.documentId, event.verified, event.notes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('Document verified:', event.verified);
          this.loadRelatedData();
        },
        error: (err) => {
          console.error('Failed to verify document:', err);
        }
      });
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    this.loadVendorData();
  }

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  retry(): void {
    this.loadVendorData();
  }
}