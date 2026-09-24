// vendor-approval-queue.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable, Subject, debounceTime, takeUntil, forkJoin, of, map, catchError } from 'rxjs';
import { MessageService } from 'primeng/api';
import {
  VendorService
} from '../../../service/vendor-management/vendor-management.service';
import {
  Vendor,
  VendorStatus,
  VendorTier,
  RiskLevel,
  VendorListResponse,
  getVendorStatusColor,
  getVendorTierLabel,
  getRiskLevelColor,
  OnboardingCopilotSession,
  ExtractedField
} from '../../../domain/vendor-management/vendor-management.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-vendor-approval-queue',
  templateUrl: './vendor-approval-queue.component.html',
  styleUrls: ['./vendor-approval-queue.component.scss']
})
export class VendorApprovalQueueComponent implements OnInit, OnDestroy, AfterViewInit {

  // ============================================================
  // VIEW CHILDREN
  // ============================================================

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('tableContainer') tableContainer!: ElementRef<HTMLDivElement>;

  // ============================================================
  // STATE
  // ============================================================

  // Data
  vendors: Vendor[] = [];
  filteredVendors: Vendor[] = [];
  totalVendors: number = 0;
  totalPages: number = 0;

  // Loading
  isLoading: boolean = false;
  isProcessing: boolean = false;
  isExporting: boolean = false;
  /** See VendorManagementListComponent — same fix: only the first load shows the full-page spinner,
   *  so a later reload doesn't tear down and rebuild the search/filter bar. */
  hasLoadedOnce = false;
  /** See VendorManagementListComponent — guards a stale response from a superseded load. */
  private loadRequestId = 0;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 20;
  pageSizeOptions: number[] = [10, 20, 50, 100];

  // Filters
  filterForm: FormGroup;
  activeFilters: { [key: string]: any } = {};

  // Sorting
  sortField: string = 'companyName';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Selection
  selectedVendors: Set<number> = new Set();
  selectAll: boolean = false;

  // UI
  Math = Math;
  showFilterDrawer: boolean = false;
  showColumnMenu: boolean = false;
  isMobileView: boolean = false;
  showReviewModal: boolean = false;
  selectedVendor: Vendor | null = null;
  reviewNotes: string = '';
  reviewAction: 'approve' | 'reject' | null = null;
  /** Shown inside the review modal when approve/reject fails, so it isn't hidden behind the overlay. */
  reviewError: string | null = null;
  readonly maxReviewNotesLength = 500;

  // Enums for template
  VendorStatus = VendorStatus;
  VendorTier = VendorTier;
  RiskLevel = RiskLevel;

  // Column visibility
  visibleColumns = {
    select: true,
    rank: true,
    company: true,
    registrationDate: true,
    documents: true,
    status: true,
    actions: true
  };

  // Error state
  error: string | null = null;

  // Column configuration
  columnConfigs = [
    { key: 'select', label: '', visible: true, width: '40px' },
    { key: 'rank', label: '#', visible: true, width: '50px' },
    { key: 'company', label: 'Company', visible: true, width: 'auto' },
    { key: 'registrationDate', label: 'Registered', visible: true, width: '140px' },
    { key: 'documents', label: 'Documents', visible: true, width: '120px' },
    { key: 'status', label: 'Status', visible: true, width: '140px' },
    { key: 'actions', label: 'Actions', visible: true, width: '200px' }
  ];

  // Quick stats
  stats = {
    total: 0,
    pending: 0,
    underReview: 0
  };

  // Public search subject for template
  searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private vendorService: VendorService,
    private router: Router,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.filterForm = this.buildFilterForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    this.loadPendingVendors();
    this.loadHeaderStats();
    this.setupSearch();
    this.checkScreenSize();
    this.loadColumnPreferences();
  }

  /** See VendorManagementListComponent — `.bind(this)` on both calls meant removeEventListener never
   *  removed the original listener, leaking one per visit to this page. */
  private readonly boundKeyboardShortcuts = this.handleKeyboardShortcuts.bind(this);

  ngAfterViewInit(): void {
    document.addEventListener('keydown', this.boundKeyboardShortcuts);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('keydown', this.boundKeyboardShortcuts);
  }

  // ============================================================
  // SETUP
  // ============================================================

  private buildFilterForm(): FormGroup {
    return this.fb.group({
      search: [''],
      status: [''],
      tier: [''],
      riskLevel: [''],
      category: [''],
      dateFrom: [''],
      dateTo: ['']
    });
  }

  private setupSearch(): void {
    // No distinctUntilChanged: clearSearch()/clearFilters() reset the search term via a DIRECT
    // loadVendors() call rather than through this subject, so the subject's own "last distinct
    // value" memory was never reset by a Clear click. Retyping the exact same term right after
    // clearing was then seen as a duplicate of what the subject last saw and silently swallowed —
    // the search box looked unresponsive until a DIFFERENT term was typed.
    this.searchSubject.pipe(
      debounceTime(400),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filterForm.patchValue({ search: searchTerm });
      this.currentPage = 1;
      this.loadPendingVendors();
    });
  }

  private checkScreenSize(): void {
    this.isMobileView = window.innerWidth < 768;
    window.addEventListener('resize', () => {
      this.isMobileView = window.innerWidth < 768;
    });
  }

  private loadColumnPreferences(): void {
    const saved = localStorage.getItem('vendorApprovalColumns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.visibleColumns = { ...this.visibleColumns, ...parsed };
        this.columnConfigs.forEach(col => {
          if (col.key in parsed) {
            col.visible = parsed[col.key];
          }
        });
      } catch (e) { /* Ignore */ }
    }
  }

  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      this.searchInput?.nativeElement?.focus();
    }
    if (event.key === 'Escape' && this.searchInput?.nativeElement === document.activeElement) {
      this.clearSearch();
    }
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadPendingVendors(): void {
    this.isLoading = true;
    this.error = null;
    const requestId = ++this.loadRequestId;

    const filters = this.buildFilters();
    // Only pending / under-review vendors belong here. The Status filter narrows to one of the two
    // (the service prefers `statuses` over `status`, so a picked status must go into `statuses` —
    // it used to be sent as `status` and silently ignored).
    filters.statuses = filters.status ? [filters.status] : [VendorStatus.PENDING_ONBOARDING, VendorStatus.UNDER_REVIEW];
    delete filters.status;

    this.vendorService.getVendors(this.currentPage, this.pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: VendorListResponse) => {
          if (requestId !== this.loadRequestId) return; // superseded by a newer filter/page/refresh
          // Approving/rejecting the last vendor on a later page leaves that page empty; step back
          // instead of showing "All caught up!" (and no pagination) while vendors remain elsewhere.
          if (response.vendors.length === 0 && response.total > 0 && this.currentPage > 1) {
            this.currentPage = Math.max(1, Math.min(this.currentPage - 1, response.totalPages || 1));
            this.loadPendingVendors();
            return;
          }
          this.vendors = response.vendors;
          this.filteredVendors = response.vendors;
          this.totalVendors = response.total;
          this.totalPages = response.totalPages;
          this.stats.total = response.total;
          this.isLoading = false;
          this.hasLoadedOnce = true;
          this.selectedVendors.clear();
          this.selectAll = false;
        },
        error: (err) => {
          if (requestId !== this.loadRequestId) return;
          console.error('Failed to load pending vendors:', err);
          this.error = 'Could not load pending vendors. Please check your connection and try again.';
          this.isLoading = false;
          this.hasLoadedOnce = true;
        }
      });
  }

  /**
   * stats.pending / stats.underReview used to be `this.vendors.filter(...)` counts — only the current
   * PAGE of the queue — while stats.total was the real server-wide total, so the sidebar numbers
   * disagreed with each other under pagination. VendorDashboardStats reports real pendingOnboarding /
   * pendingReview counts across the whole vendor base.
   */
  private loadHeaderStats(): void {
    this.vendorService.getDashboardStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => {
        this.stats.pending = s.pendingOnboarding;
        this.stats.underReview = s.pendingReview;
      },
      error: (err) => console.error('Failed to load queue header stats:', err)
    });
  }

  private buildFilters(): any {
    const formValue = this.filterForm.value;
    const filters: any = {};

    if (formValue.search) filters.search = formValue.search;
    if (formValue.status) filters.status = formValue.status;
    if (formValue.tier) filters.tier = formValue.tier;
    if (formValue.riskLevel) filters.riskLevel = formValue.riskLevel;
    if (formValue.category) filters.category = formValue.category;
    if (formValue.dateFrom) filters.dateFrom = formValue.dateFrom;
    if (formValue.dateTo) filters.dateTo = formValue.dateTo;

    return filters;
  }

  // ============================================================
  // FILTERING
  // ============================================================

  applyFilters(): void {
    this.currentPage = 1;
    this.loadPendingVendors();
    this.showFilterDrawer = false;
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
      tier: '',
      riskLevel: '',
      category: '',
      dateFrom: '',
      dateTo: ''
    });
    this.currentPage = 1;
    this.loadPendingVendors();
    this.showFilterDrawer = false;
  }

  onStatusFilterChange(value: string): void {
    this.filterForm.patchValue({ status: value || '' });
    this.currentPage = 1;
    this.loadPendingVendors();
  }

  onTierFilterChange(value: string): void {
    this.filterForm.patchValue({ tier: value || '' });
    this.currentPage = 1;
    this.loadPendingVendors();
  }

  /** The only statuses a vendor can have while it belongs in this queue. */
  readonly queueStatuses: VendorStatus[] = [VendorStatus.PENDING_ONBOARDING, VendorStatus.UNDER_REVIEW];

  clearSearch(): void {
    this.filterForm.patchValue({ search: '' });
    if (this.searchInput) {
      this.searchInput.nativeElement.value = '';
    }
    this.currentPage = 1;
    this.loadPendingVendors();
  }

  getActiveFilterCount(): number {
    const formValue = this.filterForm.value;
    let count = 0;
    if (formValue.status) count++;
    if (formValue.tier) count++;
    if (formValue.riskLevel) count++;
    if (formValue.category) count++;
    if (formValue.dateFrom) count++;
    if (formValue.dateTo) count++;
    if (formValue.search) count++;
    return count;
  }

  getFilterSummary(): string {
    const parts: string[] = [];
    const formValue = this.filterForm.value;

    if (formValue.status) parts.push(`Status: ${this.getStatusLabel(formValue.status)}`);
    if (formValue.tier) parts.push(`Tier: ${this.getTierLabel(formValue.tier)}`);
    if (formValue.riskLevel) parts.push(`Risk: ${formValue.riskLevel}`);
    if (formValue.category) parts.push(`Category: ${formValue.category}`);

    return parts.length > 0 ? parts.join(' · ') : 'All pending vendors';
  }

  // ============================================================
  // SORTING
  // ============================================================

  toggleSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.sortVendors();
  }

  private sortVendors(): void {
    this.filteredVendors.sort((a, b) => {
      let aVal: any = a[this.sortField as keyof Vendor];
      let bVal: any = b[this.sortField as keyof Vendor];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort';
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  getVisibleColumnCount(): number {
    return Object.values(this.visibleColumns).filter(v => v).length;
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.searchSubject.next(target.value);
    }
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target && target.value) {
      this.changePageSize(Number(target.value));
    }
  }

  // ============================================================
  // PAGINATION
  // ============================================================

  goToPage(page: number | string): void {
    if (typeof page === 'string') return;
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadPendingVendors();
    this.tableContainer?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadPendingVendors();
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }

    return pages;
  }

  // ============================================================
  // SELECTION
  // ============================================================

  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.filteredVendors.forEach(v => this.selectedVendors.add(v.id));
    } else {
      this.selectedVendors.clear();
    }
  }

  toggleSelectVendor(id: number): void {
    if (this.selectedVendors.has(id)) {
      this.selectedVendors.delete(id);
    } else {
      this.selectedVendors.add(id);
    }
    this.selectAll = this.filteredVendors.every(v => this.selectedVendors.has(v.id));
  }

  isSelected(id: number): boolean {
    return this.selectedVendors.has(id);
  }

  getSelectedCount(): number {
    return this.selectedVendors.size;
  }

  // ============================================================
  // REVIEW MODAL
  // ============================================================

  openReviewModal(vendor: Vendor, action: 'approve' | 'reject'): void {
    this.selectedVendor = vendor;
    this.reviewAction = action;
    this.reviewNotes = '';
    this.reviewError = null;
    this.showReviewModal = true;
    this.loadOnboardingCopilot(String(vendor.id));
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.selectedVendor = null;
    this.reviewAction = null;
    this.reviewNotes = '';
    this.reviewError = null;
    this.copilotSession = null;
    this.copilotUnavailable = false;
    this.editingFieldName = null;
  }

  // ============================================================
  // ONBOARDING COPILOT (AI-extracted fields — inline instead of a dedicated tab)
  // ============================================================

  copilotSession: OnboardingCopilotSession | null = null;
  isLoadingCopilot = false;
  /** True when the AI review couldn't be loaded — shown as a note, never replaced with fake data. */
  copilotUnavailable = false;
  editingFieldName: string | null = null;
  editFieldValue = '';

  private loadOnboardingCopilot(vendorId: string): void {
    this.copilotSession = null;
    this.copilotUnavailable = false;
    this.isLoadingCopilot = true;

    this.vendorService.getOnboardingCopilotSession(vendorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (session) => {
          // Ignore a late response for a vendor whose modal has since been closed or switched.
          if (String(this.selectedVendor?.id) !== vendorId) return;
          this.copilotSession = session;
          this.isLoadingCopilot = false;
        },
        error: (err) => {
          console.error('Failed to load onboarding copilot session:', err);
          if (String(this.selectedVendor?.id) !== vendorId) return;
          this.copilotUnavailable = true;
          this.isLoadingCopilot = false;
        }
      });
  }

  startEditingField(field: ExtractedField): void {
    this.editingFieldName = field.fieldName;
    this.editFieldValue = field.extractedValue;
  }

  cancelEditingField(): void {
    this.editingFieldName = null;
    this.editFieldValue = '';
  }

  confirmField(field: ExtractedField, correctedValue?: string): void {
    if (!this.copilotSession) return;

    this.vendorService.confirmExtractedField(this.copilotSession.id, field.fieldName, correctedValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const session = this.copilotSession;
          if (!session) return;
          session.extractedFields = session.extractedFields.map(f => f.fieldName === updated.fieldName ? updated : f);
          this.editingFieldName = null;
          this.editFieldValue = '';
        },
        error: (err) => console.error('Failed to confirm extracted field:', err)
      });
  }

  /**
   * Application data an admin should see before approving. `mapVendor` fills absent values with
   * placeholders ("Pending", "Pending Registration (ID: …)"), so those count as missing.
   */
  getMissingApprovalData(vendor: Vendor): string[] {
    const isMissing = (v: unknown) => {
      const t = String(v ?? '').trim();
      return !t || t.toLowerCase() === 'pending' || t.toLowerCase().startsWith('pending registration');
    };
    const missing: string[] = [];
    if (isMissing(vendor.companyName)) missing.push('company name');
    if (isMissing(vendor.registrationNumber)) missing.push('registration number');
    if (isMissing(vendor.taxId)) missing.push('tax ID');
    if (isMissing(vendor.email)) missing.push('email');
    if (isMissing(vendor.phone)) missing.push('phone');
    return missing;
  }

  submitReview(): void {
    if (!this.selectedVendor || !this.reviewAction || this.isProcessing) return;

    const vendor = this.selectedVendor;
    const note = this.reviewNotes.trim();
    this.reviewError = null;

    if (this.reviewAction === 'reject' && !note) {
      this.reviewError = 'Please give a reason for rejecting this vendor.';
      return;
    }
    if (note.length > this.maxReviewNotesLength) {
      this.reviewError = `Please keep this under ${this.maxReviewNotesLength} characters.`;
      return;
    }
    if (this.reviewAction === 'approve') {
      // Approval used to go through with nothing checked, even for an application with no tax ID or
      // registration number (which the list shows as the literal "Pending").
      const missing = this.getMissingApprovalData(vendor);
      if (missing.length > 0 &&
          !confirm(`This application is missing: ${missing.join(', ')}.\n\nApprove it anyway?`)) {
        return;
      }
    }

    const approving = this.reviewAction === 'approve';
    // Rejecting sets REJECTED — not INACTIVE, which is a state for previously-approved vendors and is
    // listed in the approved-only Directory, so rejected applicants used to show up there.
    // The reason / approval note is sent to the backend (it used to be collected, then dropped).
    const status = approving ? VendorStatus.ACTIVE : VendorStatus.REJECTED;

    this.isProcessing = true;
    this.vendorService.updateVendorStatus(String(vendor.id), status, note)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isProcessing = false;
          this.closeReviewModal();
          this.messageService.add({
            severity: approving ? 'success' : 'info',
            summary: approving ? 'Vendor approved' : 'Vendor rejected',
            detail: `${vendor.companyName} was ${approving ? 'approved and moved to the Vendor Directory' : 'rejected'}.`
          });
          this.loadPendingVendors();
          this.loadHeaderStats();
        },
        error: (err) => {
          console.error(`Failed to ${approving ? 'approve' : 'reject'} vendor:`, err);
          this.isProcessing = false;
          // Keep the modal open so nothing is lost and the admin can retry. The vendor's status has NOT
          // changed — this used to be written to a local override that made it look approved.
          this.reviewError = `Could not ${approving ? 'approve' : 'reject'} ${vendor.companyName}. Nothing was changed — please try again.`;
        }
      });
  }

  // ============================================================
  // BULK ACTIONS
  // ============================================================

  bulkAction(action: string): void {
    if (this.selectedVendors.size === 0 || this.isProcessing) return;

    switch (action) {
      case 'approve':
        this.bulkApprove();
        break;
      case 'reject':
        this.bulkReject();
        break;
      default:
        break;
    }
  }

  private bulkApprove(): void {
    const ids = Array.from(this.selectedVendors);
    const incomplete = this.vendors.filter(v => this.selectedVendors.has(v.id) && this.getMissingApprovalData(v).length > 0).length;
    const warning = incomplete > 0
      ? `\n\n${incomplete} of them ${incomplete === 1 ? 'is' : 'are'} missing registration details (tax ID, registration number, email or phone). Review them individually if unsure.`
      : '';
    if (!confirm(`Approve ${ids.length} vendor(s)?${warning}`)) {
      return;
    }
    this.runBulk(ids, id => this.vendorService.updateVendorStatus(String(id), VendorStatus.ACTIVE), 'approved');
  }

  private bulkReject(): void {
    const ids = Array.from(this.selectedVendors);
    const reason = (prompt(`Reason for rejecting ${ids.length} vendor(s) (required):`) ?? '').trim();
    if (!reason) {
      return;
    }
    this.runBulk(ids, id => this.vendorService.updateVendorStatus(String(id), VendorStatus.REJECTED, reason), 'rejected');
  }

  /**
   * One request per vendor, all awaited before refreshing. Previously a shared counter only reached
   * "done" if EVERY request succeeded: after any failure the list never refreshed, the vendors that had
   * been approved stayed listed and selected, isProcessing was reset while others were still in
   * flight, and re-clicking Approve All re-approved them.
   */
  private runBulk(ids: number[], op: (id: number) => Observable<unknown>, doneText: string): void {
    this.isProcessing = true;
    forkJoin(ids.map(id => op(id).pipe(
      map(() => true),
      catchError(err => {
        console.error(`Bulk action failed for vendor ${id}:`, err);
        return of(false);
      })
    ))).pipe(takeUntil(this.destroy$)).subscribe(results => {
      const ok = results.filter(r => r).length;
      const failed = results.length - ok;
      this.isProcessing = false;
      this.selectedVendors.clear();
      this.selectAll = false;
      if (ok > 0) {
        this.messageService.add({ severity: 'success', summary: `Vendors ${doneText}`, detail: `${ok} vendor(s) ${doneText}.` });
      }
      if (failed > 0) {
        this.messageService.add({
          severity: 'error', summary: 'Some vendors were not changed', life: 8000,
          detail: `${failed} of ${results.length} could not be ${doneText}. They are still in the queue.`
        });
      }
      this.loadPendingVendors();
      this.loadHeaderStats();
    });
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  viewVendor(id: number): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors', String(id), 'profile'], {
      queryParams: { returnTo: 'registry' }
    });
  }

  viewDocuments(id: number): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors', id, 'profile'], {
      queryParams: { tab: 'documents', returnTo: 'registry' }
    });
  }

  // ============================================================
  // COLUMN VISIBILITY
  // ============================================================

  toggleColumn(key: string): void {
    (this.visibleColumns as any)[key] = !(this.visibleColumns as any)[key];
    const col = this.columnConfigs.find(c => c.key === key);
    if (col) col.visible = (this.visibleColumns as any)[key];
    this.saveColumnPreferences();
  }

  private saveColumnPreferences(): void {
    localStorage.setItem('vendorApprovalColumns', JSON.stringify(this.visibleColumns));
  }

  resetColumns(): void {
    this.columnConfigs.forEach(col => {
      col.visible = true;
    });
    this.visibleColumns = {
      select: true,
      rank: true,
      company: true,
      registrationDate: true,
      documents: true,
      status: true,
      actions: true
    };
    this.saveColumnPreferences();
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

  getStatusLabel(status: VendorStatus | string): string {
    const map: Record<string, string> = {
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

  getTierLabel(tier: VendorTier | string): string {
    const map: Record<string, string> = {
      [VendorTier.PREFERRED]: '⭐ Preferred',
      [VendorTier.APPROVED]: '✓ Approved',
      [VendorTier.CONDITIONAL]: '⚠️ Conditional'
    };
    return map[tier] || tier;
  }

  formatDate(date: Date): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(date: Date): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDocumentCount(vendor: Vendor): number {
    return vendor.documents?.length || 0;
  }

  getDocumentStatusSummary(vendor: Vendor): { total: number; verified: number; pending: number } {
    const docs = vendor.documents || [];
    const total = docs.length;
    const verified = docs.filter(d => d.status === 'ACTIVE').length;
    const pending = docs.filter(d => d.status === 'PENDING_VERIFICATION').length;
    return { total, verified, pending };
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    this.loadPendingVendors();
    this.loadHeaderStats();
  }


  // Export
  exportReport(): void {
    console.log('Exporting vendor approval report...');
  }

  // Clear selection
  clearSelection(): void {
    this.selectedVendors.clear();
    this.selectAll = false;
  }

  // Filter change handler
}