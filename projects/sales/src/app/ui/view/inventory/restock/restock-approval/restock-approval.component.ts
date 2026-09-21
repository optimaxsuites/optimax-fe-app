// restock-approval.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  RestockRequest,
  RestockStatus,
  RestockUrgency,
  Branch,
  Product,
  BranchInventory,
  getStockStatus,
  getStockStatusLabel,
  getStockStatusColor
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// INTERFACES
// ============================================================

export interface ApprovalStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalOrdered: number;
  totalReceived: number;
  urgentCount: number;
  criticalCount: number;
  highValueCount: number;
  averageApprovalTime: number;
}

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-restock-approval',
  templateUrl: './restock-approval.component.html',
  styleUrls: ['./restock-approval.component.scss']
})
export class RestockApprovalComponent implements OnInit, OnDestroy {

  // ============================================================
  // INPUTS / OUTPUTS
  // ============================================================

  @Input() requestId: string = '';
  @Input() autoSelect: boolean = true;
  @Output() close = new EventEmitter<void>();
  @Output() approvalComplete = new EventEmitter<{ requestId: string; action: 'APPROVE' | 'REJECT'; comments?: string }>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  requests: RestockRequest[] = [];
  filteredRequests: RestockRequest[] = [];
  selectedRequest: RestockRequest | null = null;
  branches: Branch[] = [];
  products: Product[] = [];
  branchInventory: BranchInventory[] = [];
  approvalStats: ApprovalStats | null = null;
  approvalHistory: any[] = [];
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  isRefreshing: boolean = false;
  error: string | null = null;

  // UI
  activeTab: 'pending' | 'history' | 'stats' = 'pending';
  selectedFilter: 'ALL' | 'PENDING' | 'URGENT' | 'CRITICAL' | 'HIGH_VALUE' = 'ALL';
  selectedUrgencyFilter: 'ALL' | RestockUrgency = 'ALL';
  showApproveModal: boolean = false;
  showRejectModal: boolean = false;
  searchTerm: string = '';
  selectedAction: 'APPROVE' | 'REJECT' | null = null;

  // Form
  approveForm: FormGroup;
  rejectForm: FormGroup;
  searchSubject = new Subject<string>();

  // Private
  private destroy$ = new Subject<void>();
  private Math = Math;

  // Exposed so the template can reference RestockUrgency.LOW etc. instead of a plain string
  // literal, which TypeScript's string enums don't treat as assignment-compatible.
  RestockUrgency = RestockUrgency;

  // Urgency breakdown list for the Statistics tab — a typed array (rather than a plain string
  // array cast with `as RestockUrgency` inline in the template, which Angular's template parser
  // rejects) so getUrgencyColor()/getUrgencyIcon()/getUrgencyLabel() can be called directly.
  urgencyList: RestockUrgency[] = [
    RestockUrgency.LOW,
    RestockUrgency.MEDIUM,
    RestockUrgency.HIGH,
    RestockUrgency.CRITICAL
  ];

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private fb: FormBuilder
  ) {
    this.approveForm = this.buildApproveForm();
    this.rejectForm = this.buildRejectForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    // Get request ID from route if not provided
    if (!this.requestId) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['requestId']) {
          this.requestId = params['requestId'];
          this.loadData();
        } else {
          this.loadData();
        }
      });
    } else {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // FORM BUILDING
  // ============================================================

  private buildApproveForm(): FormGroup {
    return this.fb.group({
      comments: ['', [Validators.maxLength(500)]],
      notifyRequester: [true]
    });
  }

  private buildRejectForm(): FormGroup {
    return this.fb.group({
      reason: ['', [Validators.required, Validators.maxLength(500)]],
      notifyRequester: [true]
    });
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    // Get restock requests from service (it has mock data now)
    forkJoin({
      requests: this.inventoryService.getRestockRequests({ limit: 100 }),
      branches: this.inventoryService.getBranches(),
      products: this.inventoryService.getProducts({ limit: 500 }),
      // getBranchInventory takes a single branchId (not a filter object); an empty string
      // returns unfiltered inventory across all branches, and the result is a plain array —
      // not the {data, total, ...} paginated shape the other calls return.
      inventory: this.inventoryService.getBranchInventory('')
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ requests, branches, products, inventory }) => {
          this.requests = requests.data || [];
          this.branches = branches;
          this.products = products.data || [];
          this.branchInventory = inventory || [];
          this.filterRequests();
          this.calculateStats();

          // Auto-select request if ID provided
          if (this.requestId && this.autoSelect) {
            this.selectedRequest = this.requests.find(r => String(r.id) === this.requestId) || null;
          } else if (this.requests.length > 0 && !this.selectedRequest) {
            this.selectedRequest = this.requests[0];
          }

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load restock requests:', err);
          this.error = 'Failed to load restock requests. Please try again.';
          this.isLoading = false;
        }
      });
  }

  refreshData(): void {
    this.isRefreshing = true;
    this.error = null;
    this.loadData();
    setTimeout(() => {
      this.isRefreshing = false;
    }, 500);
  }

  // ============================================================
  // FILTERING
  // ============================================================

  filterRequests(): void {
    let filtered = [...this.requests];

    // Filter by status
    if (this.selectedFilter === 'PENDING') {
      filtered = filtered.filter(r => r.status === RestockStatus.PENDING);
    } else if (this.selectedFilter === 'URGENT') {
      filtered = filtered.filter(r => r.urgency === RestockUrgency.HIGH || r.urgency === RestockUrgency.CRITICAL);
    } else if (this.selectedFilter === 'CRITICAL') {
      filtered = filtered.filter(r => r.urgency === RestockUrgency.CRITICAL);
    } else if (this.selectedFilter === 'HIGH_VALUE') {
      filtered = filtered.filter(r => r.costEstimate > 5000000);
    }

    // Filter by urgency
    if (this.selectedUrgencyFilter !== 'ALL') {
      filtered = filtered.filter(r => r.urgency === this.selectedUrgencyFilter);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.productName?.toLowerCase().includes(term) ||
        r.sku?.toLowerCase().includes(term) ||
        String(r.id ?? '').toLowerCase().includes(term) ||
        r.branchName?.toLowerCase().includes(term)
      );
    }

    // Sort by urgency (critical first, then high, etc.)
    const urgencyOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    filtered.sort((a, b) => {
      const aOrder = urgencyOrder[a.urgency as keyof typeof urgencyOrder] ?? 4;
      const bOrder = urgencyOrder[b.urgency as keyof typeof urgencyOrder] ?? 4;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    this.filteredRequests = filtered;
  }

  setFilter(filter: 'ALL' | 'PENDING' | 'URGENT' | 'CRITICAL' | 'HIGH_VALUE'): void {
    this.selectedFilter = filter;
    this.filterRequests();
  }

  setUrgencyFilter(urgency: 'ALL' | RestockUrgency): void {
    this.selectedUrgencyFilter = urgency;
    this.filterRequests();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.searchTerm = target.value;
      this.filterRequests();
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedFilter = 'ALL';
    this.selectedUrgencyFilter = 'ALL';
    this.filterRequests();
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  private calculateStats(): void {
    const pending = this.requests.filter(r => r.status === RestockStatus.PENDING);
    const approved = this.requests.filter(r => r.status === RestockStatus.APPROVED);
    const rejected = this.requests.filter(r => r.status === RestockStatus.REJECTED);
    const ordered = this.requests.filter(r => r.status === RestockStatus.ORDERED);
    const received = this.requests.filter(r => r.status === RestockStatus.RECEIVED);
    
    const urgent = pending.filter(r => r.urgency === RestockUrgency.HIGH);
    const critical = pending.filter(r => r.urgency === RestockUrgency.CRITICAL);
    const highValue = pending.filter(r => r.costEstimate > 5000000);

    // Calculate average approval time (mock)
    const avgApprovalTime = pending.length > 0 ? 6.5 + Math.random() * 5 : 0;

    this.approvalStats = {
      totalPending: pending.length,
      totalApproved: approved.length,
      totalRejected: rejected.length,
      totalOrdered: ordered.length,
      totalReceived: received.length,
      urgentCount: urgent.length,
      criticalCount: critical.length,
      highValueCount: highValue.length,
      averageApprovalTime: avgApprovalTime
    };
  }

  // ============================================================
  // SELECTION
  // ============================================================

  selectRequest(requestId: string | number): void {
    this.selectedRequest = this.requests.find(r => String(r.id) === String(requestId)) || null;
    if (this.selectedRequest) {
      // Reset forms
      this.approveForm.reset();
      this.rejectForm.reset();
      this.selectedAction = null;
      this.showApproveModal = false;
      this.showRejectModal = false;
    }
  }

  // ============================================================
  // APPROVAL ACTIONS
  // ============================================================

  openApproveModal(): void {
    if (!this.selectedRequest) return;
    this.selectedAction = 'APPROVE';
    this.approveForm.patchValue({
      comments: '',
      notifyRequester: true
    });
    this.showApproveModal = true;
  }

  closeApproveModal(): void {
    this.showApproveModal = false;
    this.selectedAction = null;
    this.approveForm.reset();
  }

  submitApproval(): void {
    if (!this.selectedRequest) return;

    this.isSubmitting = true;
    const formValue = this.approveForm.value;

    setTimeout(() => {
      if (this.selectedRequest) {
        this.selectedRequest.status = RestockStatus.APPROVED;
        this.selectedRequest.approvedBy = this.getCurrentUserId();
        this.selectedRequest.approvedByName = this.getCurrentUserName();
        this.selectedRequest.approvedAt = new Date();

        // Add comments if provided
        if (formValue.comments) {
          this.selectedRequest.notes = (this.selectedRequest.notes || '') + `\nApproval comment: ${formValue.comments}`;
        }

        // Save to service
        this.inventoryService.updateRestockRequest(this.selectedRequest.id, this.selectedRequest).subscribe();

        // Emit event
        this.approvalComplete.emit({
          requestId: String(this.selectedRequest.id),
          action: 'APPROVE',
          comments: formValue.comments
        });
      }

      this.calculateStats();
      this.filterRequests();
      this.isSubmitting = false;
      this.showApproveModal = false;
    }, 1000);
  }

  // ============================================================
  // REJECT ACTIONS
  // ============================================================

  openRejectModal(): void {
    if (!this.selectedRequest) return;
    this.selectedAction = 'REJECT';
    this.rejectForm.patchValue({
      reason: '',
      notifyRequester: true
    });
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedAction = null;
    this.rejectForm.reset();
  }

  submitRejection(): void {
    if (this.rejectForm.invalid || !this.selectedRequest) {
      this.rejectForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.rejectForm.value;

    setTimeout(() => {
      if (this.selectedRequest) {
        this.selectedRequest.status = RestockStatus.REJECTED;
        this.selectedRequest.approvedBy = this.getCurrentUserId();
        this.selectedRequest.approvedByName = this.getCurrentUserName();
        this.selectedRequest.approvedAt = new Date();
        this.selectedRequest.notes = (this.selectedRequest.notes || '') + `\nRejection reason: ${formValue.reason}`;

        // Save to service
        this.inventoryService.updateRestockRequest(this.selectedRequest.id, this.selectedRequest).subscribe();

        // Emit event
        this.approvalComplete.emit({
          requestId: String(this.selectedRequest.id),
          action: 'REJECT',
          comments: formValue.reason
        });
      }

      this.calculateStats();
      this.filterRequests();
      this.isSubmitting = false;
      this.showRejectModal = false;
    }, 1000);
  }

  // Every approve/reject action above used to hardcode 'usr-2' / 'Jane Smith' instead of the
  // person actually signed in. 'userid'/'fullname' are the session keys app.ts sets at login —
  // same pattern used for stock movement approvals (see MovementApprovalComponent).
  private getCurrentUserId(): string {
    return sessionStorage.getItem('userid') || 'usr-1';
  }

  private getCurrentUserName(): string {
    return sessionStorage.getItem('fullname') || 'Unknown User';
  }

  // ============================================================
  // NAVIGATION
  // ============================================================

  goBack(): void {
    if (this.close.observed) {
      this.close.emit();
    } else {
      this.location.back();
    }
  }

  viewProduct(productId: string): void {
    if (productId) {
      this.router.navigate(['/admin/sales/commerce/inventory/products', productId]);
    }
  }

  viewBranch(branchId: string): void {
    if (branchId) {
      this.router.navigate(['/admin/sales/commerce/inventory/branches', branchId]);
    }
  }

  // ============================================================
  // UI HELPERS
  // ============================================================

  getUrgencyLabel(urgency: RestockUrgency): string {
    const map: Record<RestockUrgency, string> = {
      'LOW': 'Low',
      'MEDIUM': 'Medium',
      'HIGH': 'High',
      'CRITICAL': 'Critical'
    };
    return map[urgency] || urgency;
  }

  getUrgencyColor(urgency: RestockUrgency): string {
    const map: Record<RestockUrgency, string> = {
      'LOW': '#6B7280',
      'MEDIUM': '#3B82F6',
      'HIGH': '#F5A623',
      'CRITICAL': '#DC2626'
    };
    return map[urgency] || '#6B7280';
  }

  getUrgencyIcon(urgency: RestockUrgency): string {
    const map: Record<RestockUrgency, string> = {
      'LOW': 'fa-circle',
      'MEDIUM': 'fa-minus-circle',
      'HIGH': 'fa-exclamation-triangle',
      'CRITICAL': 'fa-exclamation-circle'
    };
    return map[urgency] || 'fa-circle';
  }

  getStatusLabel(status: RestockStatus): string {
    const map: Record<RestockStatus, string> = {
      'DRAFT': 'Draft',
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'ORDERED': 'Ordered',
      'RECEIVED': 'Received'
    };
    return map[status] || status;
  }

  getStatusColor(status: RestockStatus): string {
    const map: Record<RestockStatus, string> = {
      'DRAFT': '#6B7280',
      'PENDING': '#F5A623',
      'APPROVED': '#3B82F6',
      'REJECTED': '#DC2626',
      'ORDERED': '#8B5CF6',
      'RECEIVED': '#2EB270'
    };
    return map[status] || '#6B7280';
  }

  getStatusIcon(status: RestockStatus): string {
    const map: Record<RestockStatus, string> = {
      'DRAFT': 'fa-file-alt',
      'PENDING': 'fa-clock',
      'APPROVED': 'fa-check-circle',
      'REJECTED': 'fa-times-circle',
      'ORDERED': 'fa-truck',
      'RECEIVED': 'fa-check-double'
    };
    return map[status] || 'fa-circle';
  }

  getBranchName(branchId: string): string {
    const branch = this.branches.find(b => String(b.id) === branchId);
    return branch?.name || branchId;
  }

  getProductName(productId: string): string {
    const product = this.products.find(p => String(p.id) === productId);
    return product?.name || productId;
  }

  formatCurrency(value: number): string {
    if (!value) return '₦0';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    if (!value) return '0';
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }

  formatDate(date: Date | string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(date: Date | string): string {
    if (!date) return '—';
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  getTimeAgo(date: Date | string): string {
    if (!date) return '—';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  getRequestCount(): number {
    return this.filteredRequests.length;
  }

  getPendingCount(): number {
    return this.requests.filter(r => r.status === RestockStatus.PENDING).length;
  }

  getApprovedCount(): number {
    return this.requests.filter(r => r.status === RestockStatus.APPROVED).length;
  }

  getRejectedCount(): number {
    return this.requests.filter(r => r.status === RestockStatus.REJECTED).length;
  }

  getOrderedCount(): number {
    return this.requests.filter(r => r.status === RestockStatus.ORDERED).length;
  }

  getReceivedCount(): number {
    return this.requests.filter(r => r.status === RestockStatus.RECEIVED).length;
  }

  getUrgencyCount(urgency: RestockUrgency): number {
    return this.requests.filter(r => r.urgency === urgency).length;
  }

  getBranchRequestCount(branchId: string | number): number {
    return this.requests.filter(r => r.branchId === String(branchId)).length;
  }
}