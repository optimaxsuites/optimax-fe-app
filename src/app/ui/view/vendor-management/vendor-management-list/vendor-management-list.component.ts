// vendor-list.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable, Subject, debounceTime, takeUntil, forkJoin, of, map, catchError } from 'rxjs';
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
  VendorRiskTrajectory,
  FraudFlag,
  getRiskTrajectoryColor,
  getRiskTrajectoryIcon
} from '../../../domain/vendor-management/vendor-management.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-vendor-management-list',
  templateUrl: './vendor-management-list.component.html',
  styleUrls: ['./vendor-management-list.component.scss']
})
export class VendorManagementListComponent implements OnInit, OnDestroy, AfterViewInit {

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
  isExporting: boolean = false;
  error: string | null = null;
  /** Set after the first load settles (success or failure) — used so a later reload (search/filter/
   *  refresh) shows the in-table spinner instead of tearing down and rebuilding the whole filter bar,
   *  which used to drop focus and any keystrokes typed during the reload. */
  hasLoadedOnce = false;
  /** Bumped on every loadVendors() call; a response only applies if it's still the latest one — guards
   *  against rapid filter/page changes resolving out of order and the older response winning. */
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

  // Enums for template
  VendorStatus = VendorStatus;
  VendorTier = VendorTier;
  RiskLevel = RiskLevel;

  // The Directory only ever shows vendors that have cleared the approval queue.
  // Vendors still awaiting a decision live in the Vendor Global Registry
  // (vendor-approval-queue) until an admin approves or rejects them, so this
  // is both the default filter and the full set of choices offered here.
  readonly directoryStatuses: VendorStatus[] = [
    VendorStatus.ACTIVE,
    VendorStatus.CONDITIONAL,
    VendorStatus.SUSPENDED,
    VendorStatus.OFFBOARDED,
    VendorStatus.INACTIVE
  ];

  // Column visibility
  visibleColumns = {
    select: true,
    rank: true,
    company: true,
    tier: true,
    status: true,
    risk: true,
    performance: true,
    projects: true,
    revenue: true,
    documents: true,
    joined: true,
    actions: true
  };

  // Column configuration
  columnConfigs = [
    { key: 'select', label: '', visible: true, width: '40px' },
    { key: 'rank', label: '#', visible: true, width: '50px' },
    { key: 'company', label: 'Company', visible: true, width: 'auto' },
    { key: 'tier', label: 'Tier', visible: true, width: '120px' },
    { key: 'status', label: 'Status', visible: true, width: '140px' },
    { key: 'risk', label: 'Risk', visible: true, width: '100px' },
    { key: 'performance', label: 'Performance', visible: true, width: '160px' },
    { key: 'projects', label: 'Projects', visible: true, width: '100px' },
    { key: 'revenue', label: 'Revenue', visible: true, width: '140px' },
    { key: 'documents', label: 'Docs', visible: true, width: '100px' },
    { key: 'joined', label: 'Joined', visible: true, width: '120px' },
    { key: 'actions', label: 'Actions', visible: true, width: '120px' }
  ];

  // Quick stats
  stats = {
    total: 0,
    active: 0,
    preferred: 0,
    highRisk: 0
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
    private fb: FormBuilder
  ) {
    this.filterForm = this.buildFilterForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    this.loadVendors();
    this.loadHeaderStats();
    this.setupSearch();
    this.checkScreenSize();
    this.loadColumnPreferences();
  }

  /** Bound once so ngOnDestroy removes the SAME function reference ngAfterViewInit added — `.bind(this)`
   *  creates a new function every time, so the old removeEventListener call never actually removed
   *  anything and every visit to this page leaked another document-level keydown listener. */
  private readonly boundKeyboardShortcuts = this.handleKeyboardShortcuts.bind(this);

  ngAfterViewInit(): void {
    // Focus search on keyboard shortcut
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
      minPerformance: [''],
      maxPerformance: [''],
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
      this.loadVendors();
    });
  }

  private checkScreenSize(): void {
    this.isMobileView = window.innerWidth < 768;
    window.addEventListener('resize', () => {
      this.isMobileView = window.innerWidth < 768;
    });
  }

  private loadColumnPreferences(): void {
    const saved = localStorage.getItem('vendorListColumns');
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
    // Ctrl+F or Cmd+F to focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
      event.preventDefault();
      this.searchInput?.nativeElement?.focus();
    }
    // Escape to clear search
    if (event.key === 'Escape' && this.searchInput?.nativeElement === document.activeElement) {
      this.clearSearch();
    }
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadVendors(preserveError = false): void {
    this.isLoading = true;
    if (!preserveError) this.error = null;
    const requestId = ++this.loadRequestId;

    const filters = this.buildFilters();

    this.vendorService.getVendors(this.currentPage, this.pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: VendorListResponse) => {
          if (requestId !== this.loadRequestId) return; // superseded by a newer filter/page/refresh
          // Deleting/suspending the last vendor on a later page leaves that page empty; step back
          // instead of showing "No vendors found" (with pagination hidden) while vendors remain
          // on earlier pages — same fix already applied to the approval queue.
          if (response.vendors.length === 0 && response.total > 0 && this.currentPage > 1) {
            this.currentPage = Math.max(1, Math.min(this.currentPage - 1, response.totalPages || 1));
            this.loadVendors(preserveError);
            return;
          }
          this.vendors = response.vendors;
          this.filteredVendors = response.vendors;
          // sortVendors() was only ever called from toggleSort() — a reload (search/filter/page/
          // refresh) silently dropped back to server order while the header still showed the
          // active sort icon. This only reorders the page just loaded (there's no confirmed
          // server-side sort parameter to request a globally sorted result across pages).
          if (this.sortField) this.sortVendors();
          this.totalVendors = response.total;
          this.totalPages = response.totalPages;
          this.isLoading = false;
          this.hasLoadedOnce = true;
          // Clear selection when data changes
          this.selectedVendors.clear();
          this.selectAll = false;
          // AI signals are fetched per-vendor, so only load them for the page just shown
          this.loadAiSignals(response.vendors.map(v => String(v.id)));
        },
        error: (err) => {
          if (requestId !== this.loadRequestId) return;
          console.error('Failed to load vendors:', err);
          // Previously only logged, so the (dead) error banner never showed and a failed load looked
          // like an empty directory.
          this.error = 'Could not load vendors. Please check your connection and try again.';
          this.isLoading = false;
          this.hasLoadedOnce = true;
        }
      });
  }

  /**
   * The header/sidebar stat cards used to be `this.vendors.filter(...)` counts — i.e. only the vendors
   * on the CURRENT PAGE, while "Total Vendors" next to them was the real server-wide total. A filtered
   * or paginated view therefore showed obviously-inconsistent numbers (e.g. "Total 200 / Active 14"
   * when only 20 vendors were ever loaded). Pulled from the dashboard-stats endpoint instead, which
   * reports real counts across the whole vendor base.
   */
  private loadHeaderStats(): void {
    this.vendorService.getDashboardStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (s) => {
        this.stats.total = s.totalVendors;
        this.stats.active = s.activeVendors;
        this.stats.preferred = s.vendorsByTier?.preferred ?? 0;
        this.stats.highRisk = s.highRiskVendors;
      },
      error: (err) => console.error('Failed to load vendor header stats:', err)
    });
  }

  // ============================================================
  // AI SIGNALS (risk trend + fraud flags — inline instead of a dedicated tab)
  // ============================================================

  private riskTrajectories: VendorRiskTrajectory[] = [];
  private activeFraudFlagVendorIds = new Set<string>();
  getRiskTrajectoryColor = getRiskTrajectoryColor;
  getRiskTrajectoryIcon = getRiskTrajectoryIcon;

  private loadAiSignals(vendorIds: string[]): void {
    this.vendorService.getRiskTrajectories(vendorIds).subscribe({
      next: (trajectories) => { this.riskTrajectories = trajectories; },
      error: (err) => console.error('Failed to load risk trajectories:', err)
    });

    this.vendorService.getFraudFlags().subscribe({
      next: (flags) => {
        this.activeFraudFlagVendorIds = new Set(
          flags.filter(f => f.status === 'PENDING_REVIEW' || f.status === 'INVESTIGATING').map(f => f.vendorId)
        );
      },
      error: (err) => console.error('Failed to load fraud flags:', err)
    });
  }

  /** A vendor's AI-projected risk trend, if Sentinel has one for them. */
  getRiskTrajectory(vendorId: number): VendorRiskTrajectory | undefined {
    return this.riskTrajectories.find(t => t.vendorId === String(vendorId));
  }

  hasActiveFraudFlag(vendorId: number): boolean {
    return this.activeFraudFlagVendorIds.has(String(vendorId));
  }

  private buildFilters(): any {
    const formValue = this.filterForm.value;
    const filters: any = {};

    if (formValue.search) filters.search = formValue.search;
    if (formValue.tier) filters.tier = formValue.tier;
    if (formValue.riskLevel) filters.riskLevel = formValue.riskLevel;
    if (formValue.category) filters.category = formValue.category;
    if (formValue.minPerformance) filters.minPerformance = formValue.minPerformance;
    if (formValue.maxPerformance) filters.maxPerformance = formValue.maxPerformance;
    if (formValue.dateFrom) filters.dateFrom = formValue.dateFrom;
    if (formValue.dateTo) filters.dateTo = formValue.dateTo;

    // The Directory only shows vendors that have cleared the approval queue.
    // Vendors still awaiting a decision live in the Vendor Global Registry
    // (vendor-approval-queue) until an admin approves or rejects them. This
    // applies even when a status is explicitly chosen, so picking e.g.
    // "Pending Onboarding" here can't be used to see unapproved vendors.
    if (formValue.status && this.directoryStatuses.includes(formValue.status)) {
      filters.status = formValue.status;
    } else {
      filters.statuses = this.directoryStatuses;
    }

    return filters;
  }

  // ============================================================
  // FILTERING
  // ============================================================

  applyFilters(): void {
    this.currentPage = 1;
    this.loadVendors();
    this.showFilterDrawer = false;
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      status: '',
      tier: '',
      riskLevel: '',
      category: '',
      minPerformance: '',
      maxPerformance: '',
      dateFrom: '',
      dateTo: ''
    });
    this.currentPage = 1;
    this.loadVendors();
    this.showFilterDrawer = false;
  }

  clearSearch(): void {
    this.filterForm.patchValue({ search: '' });
    if (this.searchInput) {
      this.searchInput.nativeElement.value = '';
    }
    this.currentPage = 1;
    this.loadVendors();
  }

  onFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const field = target.name;
    if (!field) return;

    this.filterForm.patchValue({ [field]: target.value });
    this.currentPage = 1;
    this.loadVendors();
  }

  getActiveFilterCount(): number {
    const formValue = this.filterForm.value;
    let count = 0;
    if (formValue.status) count++;
    if (formValue.tier) count++;
    if (formValue.riskLevel) count++;
    if (formValue.category) count++;
    if (formValue.minPerformance) count++;
    if (formValue.maxPerformance) count++;
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
    if (formValue.minPerformance || formValue.maxPerformance) {
      const min = formValue.minPerformance || '0';
      const max = formValue.maxPerformance || '100';
      parts.push(`Score: ${min}% - ${max}%`);
    }

    return parts.length > 0 ? parts.join(' · ') : 'All vendors';
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

      // Handle nested properties
      if (this.sortField === 'companyName') {
        aVal = a.companyName;
        bVal = b.companyName;
      } else if (this.sortField === 'performanceScore') {
        aVal = a.performanceScore;
        bVal = b.performanceScore;
      } else if (this.sortField === 'totalRevenue') {
        aVal = a.performanceMetrics?.totalRevenue || 0;
        bVal = b.performanceMetrics?.totalRevenue || 0;
      }

      // Handle strings
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return this.sortDirection === 'asc' ? comparison : -comparison;
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle dates — joinedDate (and any other Date field) matched neither branch above, so
      // clicking "Joined" toggled the sort icon but never actually reordered anything.
      if (aVal instanceof Date || bVal instanceof Date) {
        const aTime = aVal instanceof Date ? aVal.getTime() : 0;
        const bTime = bVal instanceof Date ? bVal.getTime() : 0;
        return this.sortDirection === 'asc' ? aTime - bTime : bTime - aTime;
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
    this.loadVendors();
    // Scroll to top of table
    this.tableContainer?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadVendors();
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

      if (current > 3) {
        pages.push('...');
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push('...');
      }

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

  clearSelection(): void {
    this.selectedVendors.clear();
    this.selectAll = false;
  }

  // ============================================================
  // BULK ACTIONS
  // ============================================================

  bulkAction(action: string): void {
    if (this.selectedVendors.size === 0) return;

    switch (action) {
      case 'export':
        this.exportSelected();
        break;
      case 'activate':
        this.bulkUpdateStatus(VendorStatus.ACTIVE);
        break;
      case 'suspend':
        this.bulkUpdateStatus(VendorStatus.SUSPENDED);
        break;
      case 'delete':
        this.bulkDelete();
        break;
      default:
        break;
    }
  }

  private bulkUpdateStatus(status: VendorStatus): void {
    // status.toLowerCase() reads as a bare noun, not a verb — "you want to active 3 vendor(s)?"
    const verbs: Partial<Record<VendorStatus, string>> = { [VendorStatus.ACTIVE]: 'activate', [VendorStatus.SUSPENDED]: 'suspend' };
    const verb = verbs[status] ?? status.toLowerCase();
    if (!confirm(`Are you sure you want to ${verb} ${this.selectedVendors.size} vendor(s)?`)) {
      return;
    }

    this.runBulk(
      Array.from(this.selectedVendors),
      id => this.vendorService.updateVendorStatus(String(id), status),
      `updated to ${status.toLowerCase()}`
    );
  }

  private bulkDelete(): void {
    if (!confirm(`Are you sure you want to delete ${this.selectedVendors.size} vendor(s)? This action cannot be undone.`)) {
      return;
    }

    this.runBulk(
      Array.from(this.selectedVendors),
      id => this.vendorService.deleteVendor(String(id)),
      'deleted'
    );
  }

  /**
   * Runs one request per selected vendor and waits for ALL of them before refreshing.
   * Previously each request was fire-and-forget: the selection was cleared immediately, failures were
   * only console.error'd, bulk delete removed rows locally on each success, and the list was reloaded
   * on a blind 2-second timer — so a partial failure looked like full success and the user couldn't tell
   * which vendors were affected.
   */
  private runBulk(ids: number[], op: (id: number) => Observable<unknown>, doneText: string): void {
    if (ids.length === 0) return;
    this.isLoading = true;
    forkJoin(ids.map(id => op(id).pipe(
      map(() => true),
      catchError(err => {
        console.error(`Bulk action failed for vendor ${id}:`, err);
        return of(false);
      })
    ))).pipe(takeUntil(this.destroy$)).subscribe(results => {
      const failed = results.filter(ok => !ok).length;
      this.selectedVendors.clear();
      this.selectAll = false;
      this.loadVendors(true);
      this.loadHeaderStats();
      this.error = failed
        ? (failed === results.length
            ? `None of the ${results.length} selected vendor(s) could be ${doneText}.`
            : `${failed} of ${results.length} selected vendor(s) could not be ${doneText}. The others were.`)
        : null;
    });
  }

  private exportSelected(): void {
    this.isExporting = true;
    const ids = Array.from(this.selectedVendors);

    this.vendorService.exportVendors({ ids: ids.join(',') }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vendors_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isExporting = false;
        this.selectedVendors.clear();
        this.selectAll = false;
      },
      error: (err) => {
        console.error('Export failed:', err);
        this.isExporting = false;
      }
    });
  }

  // ============================================================
  // NAVIGATION - UPDATED to use router.navigate
  // ============================================================

  private readonly VM_TAB_KEY = 'dashboard-vendor global registry-vendor directory';

  goBack(): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors']);
  }

  navigateToApprovalQueue(): void {
    sessionStorage.setItem(this.VM_TAB_KEY, 'Vendor Global Registry');
    this.router.navigate(['/admin/sales/commerce/manage-vendors']);
  }

  navigateToDashboard(): void {
    sessionStorage.setItem(this.VM_TAB_KEY, 'Dashboard');
    this.router.navigate(['/admin/sales/commerce/manage-vendors']);
  }

  navigateToVendor(id: string): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors', id, 'profile'], {
      queryParams: { returnTo: 'directory' }
    });
  }



  navigateToVendorDetail(id: string): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors', id, 'profile'], {
      queryParams: { returnTo: 'directory' }
    });
  }

  // ============================================================
  // ACTIONS - UPDATED
  // ============================================================

  /**
   * View vendor details - navigates to profile page
   */
  viewVendor(id: number): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors', id, 'profile'], {
      queryParams: { returnTo: 'directory' }
    });
  }

  /**

  /**
   * Delete vendor with confirmation
   */
  deleteVendor(vendor: Vendor): void {
    if (confirm(`Are you sure you want to delete ${vendor.companyName}? This action cannot be undone.`)) {
      this.vendorService.deleteVendor(String(vendor.id)).subscribe({
        next: () => {
          this.loadVendors();
        },
        error: (err) => {
          console.error('Failed to delete vendor:', err);
          this.error = `Could not delete ${vendor.companyName}.`;
        }
      });
    }
  }

  /**
   * View performance - navigates to profile with performance tab
   */
  viewPerformance(id: string): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors', id, 'profile'], {
      queryParams: { tab: 'performance', returnTo: 'directory' }
    });
  }

  /**
   * View risk - navigates to profile with risk tab
   */
  viewRisk(id: string): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors', id, 'profile'], {
      queryParams: { tab: 'risk', returnTo: 'directory' }
    });
  }

  /**
   * View documents - navigates to profile with documents tab
   */
  viewDocuments(id: string): void {
    this.router.navigate(['/admin/sales/commerce/manage-vendors', id, 'profile'], {
      queryParams: { tab: 'documents', returnTo: 'directory' }
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
    localStorage.setItem('vendorListColumns', JSON.stringify(this.visibleColumns));
  }

  resetColumns(): void {
    this.columnConfigs.forEach(col => {
      col.visible = col.key !== 'select' && col.key !== 'actions' || col.key === 'select' || col.key === 'actions';
    });
    this.visibleColumns = {
      select: true,
      rank: true,
      company: true,
      tier: true,
      status: true,
      risk: true,
      performance: true,
      projects: true,
      revenue: true,
      documents: true,
      joined: true,
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

  getDocumentStatusCount(vendor: Vendor): { total: number; valid: number; expiring: number; expired: number } {
    const docs = vendor.documents || [];
    const total = docs.length;
    const valid = docs.filter(d => d.status === 'ACTIVE').length;
    const expiring = docs.filter(d => d.status === 'EXPIRING_SOON').length;
    const expired = docs.filter(d => d.status === 'EXPIRED').length;
    return { total, valid, expiring, expired };
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

  // ============================================================
  // EXPORT ALL
  // ============================================================

  exportAll(): void {
    this.isExporting = true;

    this.vendorService.exportVendors(this.buildFilters()).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vendors_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isExporting = false;
      },
      error: (err) => {
        console.error('Export failed:', err);
        this.isExporting = false;
      }
    });
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    this.loadVendors();
    this.loadHeaderStats();
  }
}