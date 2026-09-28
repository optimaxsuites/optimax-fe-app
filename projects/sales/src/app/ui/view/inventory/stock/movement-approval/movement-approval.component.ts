// movement-approval.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  StockMovement,
  MovementStatus,
  MovementType,
  Branch,
  Product,
  ApprovalHistoryEntry,
  hasUnresolvedChangeRequest,
  getMovementTypeLabel,
  getMovementTypeIcon,
  getMovementStatusLabel
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// INTERFACES
// ============================================================

// Persisted via InventoryService.getApprovalHistory()/recordApprovalAction() — see the
// ApprovalHistoryEntry doc comment in inventory.dto.ts for why this isn't just component state.
export type ApprovalAction = ApprovalHistoryEntry;

export interface ApprovalStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalRequestedChanges: number;
  averageApprovalTime: number; // in hours
  urgentCount: number;
  highValueCount: number;
}

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-movement-approval',
  templateUrl: './movement-approval.component.html',
  styleUrls: ['./movement-approval.component.scss']
})
export class MovementApprovalComponent implements OnInit, OnDestroy {

  // ============================================================
  // INPUTS / OUTPUTS
  // ============================================================

  @Input() movementId: string = '';
  @Input() autoSelect: boolean = true;
  @Output() close = new EventEmitter<void>();
  @Output() approvalComplete = new EventEmitter<ApprovalAction>();

  // ============================================================
  // STATE
  // ============================================================

  // Data
  movements: StockMovement[] = [];
  filteredMovements: StockMovement[] = [];
  selectedMovement: StockMovement | null = null;
  branches: Branch[] = [];
  products: Product[] = [];
  approvalStats: ApprovalStats | null = null;
  approvalHistory: ApprovalAction[] = [];
  isLoading: boolean = true;
  isSubmitting: boolean = false;
  isRefreshing: boolean = false;
  error: string | null = null;

  // UI
  activeTab: 'pending' | 'history' | 'stats' = 'pending';
  // Defaults to 'PENDING' (not 'ALL') so the Pending tab still opens showing only actionable
  // movements now that loadData() fetches every status instead of a server-side PENDING-only
  // filter — 'ALL' remains a real option in the filter dropdown, it just isn't the default.
  selectedFilter: 'ALL' | 'PENDING' | 'URGENT' | 'HIGH_VALUE' = 'PENDING';
  selectedTypeFilter: 'ALL' | MovementType = 'ALL';
  showCommentsModal: boolean = false;
  showChangesModal: boolean = false;
  showConfirmModal: boolean = false;
  selectedAction: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | null = null;
  searchTerm: string = '';

  // Form
  approvalForm: FormGroup;
  commentsForm: FormGroup;
  changesForm: FormGroup;
  searchSubject = new Subject<string>();

  // Private
  private destroy$ = new Subject<void>();
  private Math = Math;

  // Movement-type breakdown list for the Statistics tab — a typed array (rather than a plain
  // string array cast with `as MovementType` inline in the template, which Angular's template
  // parser rejects) so getMovementTypeIcon()/getMovementTypeLabel() can be called directly.
  movementTypeList: MovementType[] = [
    MovementType.PURCHASE,
    MovementType.TRANSFER,
    MovementType.SALE,
    MovementType.RETURN,
    MovementType.ADJUSTMENT
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
    this.approvalForm = this.buildApprovalForm();
    this.commentsForm = this.buildCommentsForm();
    this.changesForm = this.buildChangesForm();
  }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    // Get movement ID from route if not provided
    if (!this.movementId) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['movementId']) {
          this.movementId = params['movementId'];
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

  private buildApprovalForm(): FormGroup {
    return this.fb.group({
      action: ['', Validators.required],
      comments: ['', [Validators.maxLength(500)]],
      requireChanges: [false]
    });
  }

  private buildCommentsForm(): FormGroup {
    return this.fb.group({
      comments: ['', [Validators.required, Validators.maxLength(500)]],
      notifyRequester: [true],
      attachment: [null]
    });
  }

  private buildChangesForm(): FormGroup {
    return this.fb.group({
      field: ['', Validators.required],
      currentValue: ['', Validators.required],
      suggestedValue: ['', Validators.required],
      reason: ['', [Validators.required, Validators.maxLength(300)]]
    });
  }

  // Every approve/reject/request-changes action below used to hardcode 'usr-1' / 'John Doe'
  // instead of the person actually signed in, which is why the Approval History panel showed
  // the wrong name. 'userid'/'fullname' are the session keys app.ts sets at login.
  private getCurrentUserId(): string {
    return sessionStorage.getItem('userid') || 'usr-1';
  }

  private getCurrentUserName(): string {
    return sessionStorage.getItem('fullname') || 'Unknown User';
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      // No status filter here: this.movements backs both the "ALL" filter (see
      // filterMovements()) and the Statistics tab's approved/rejected counts, so restricting
      // this fetch to PENDING made "ALL" silently behave like "PENDING" and made
      // totalApproved/totalRejected always read 0 no matter how many movements had actually
      // been decided. The Pending tab's own filter (setFilter('PENDING')) narrows it back down
      // client-side.
      movements: this.inventoryService.getMovements({ limit: 200 }),
      branches: this.inventoryService.getBranches(),
      products: this.inventoryService.getProducts({ limit: 500 })
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ movements, branches, products }) => {
          this.movements = movements.data || [];
          this.branches = branches;
          this.products = products.data || [];
          this.filterMovements();
          this.calculateStats();
          
          // Auto-select movement if ID provided
          if (this.movementId && this.autoSelect) {
            this.selectedMovement = this.movements.find(m => String(m.id) === this.movementId) || null;
          } else if (this.movements.length > 0 && !this.selectedMovement) {
            this.selectedMovement = this.movements[0];
          }
          
          this.loadApprovalHistory();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load movements:', err);
          this.error = 'Failed to load movements. Please try again.';
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

  private loadApprovalHistory(): void {
    // Real, persisted actions taken in this tab (approve/reject/request-changes), most recent
    // first — see InventoryService.getApprovalHistory(). Previously this was 3 hardcoded mock
    // entries reset on every load, which is why history/stats looked frozen and untracked.
    this.approvalHistory = this.inventoryService.getApprovalHistory();
  }

  // ============================================================
  // FILTERING
  // ============================================================

  filterMovements(): void {
    let filtered = [...this.movements];

    // Filter by status
    if (this.selectedFilter === 'PENDING') {
      filtered = filtered.filter(m => m.status === MovementStatus.PENDING);
    } else if (this.selectedFilter === 'URGENT') {
      filtered = filtered.filter(m => m.notes?.toLowerCase().includes('urgent') || m.cost > 5000000);
    } else if (this.selectedFilter === 'HIGH_VALUE') {
      filtered = filtered.filter(m => m.cost > 10000000);
    }

    // Filter by movement type
    if (this.selectedTypeFilter !== 'ALL') {
      filtered = filtered.filter(m => m.movementType === this.selectedTypeFilter);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.productName?.toLowerCase().includes(term) ||
        m.sku?.toLowerCase().includes(term) ||
        String(m.id ?? '').toLowerCase().includes(term) ||
        m.fromLocation?.name?.toLowerCase().includes(term) ||
        m.toLocation?.name?.toLowerCase().includes(term)
      );
    }

    // Sort by priority (urgent first, then by date)
    filtered.sort((a, b) => {
      const aUrgent = a.notes?.toLowerCase().includes('urgent') || a.cost > 5000000;
      const bUrgent = b.notes?.toLowerCase().includes('urgent') || b.cost > 5000000;
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    this.filteredMovements = filtered;
  }

  setFilter(filter: 'ALL' | 'PENDING' | 'URGENT' | 'HIGH_VALUE'): void {
    this.selectedFilter = filter;
    this.filterMovements();
  }

  setTypeFilter(type: 'ALL' | MovementType): void {
    this.selectedTypeFilter = type;
    this.filterMovements();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.searchTerm = target.value;
      this.filterMovements();
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedFilter = 'ALL';
    this.selectedTypeFilter = 'ALL';
    this.filterMovements();
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  private calculateStats(): void {
    const pending = this.movements.filter(m => m.status === MovementStatus.PENDING);
    // Approving a movement moves it to IN_TRANSIT, not straight to COMPLETED (see
    // confirmApproval()'s comment) — COMPLETED only fires later, once the transfer is actually
    // received. Counting COMPLETED alone here undercounted every movement still in transit as
    // if it had never been approved.
    const approved = this.movements.filter(m => m.status === MovementStatus.IN_TRANSIT || m.status === MovementStatus.COMPLETED);
    const rejected = this.movements.filter(m => m.status === MovementStatus.CANCELLED);
    const requestedChanges = this.movements.filter(m => m.notes?.toLowerCase().includes('changes requested'));

    // Real average, computed from each approved movement's actual createdAt -> approvedAt gap,
    // rather than a hardcoded placeholder that never reflected what was actually happening.
    const approvalTimesHours = approved
      .filter((m): m is typeof m & { approvedAt: Date } => !!m.createdAt && !!m.approvedAt)
      .map(m => (new Date(m.approvedAt).getTime() - new Date(m.createdAt).getTime()) / (1000 * 60 * 60))
      .filter(hours => isFinite(hours) && hours >= 0);
    const avgApprovalTime = approvalTimesHours.length > 0
      ? approvalTimesHours.reduce((sum, hours) => sum + hours, 0) / approvalTimesHours.length
      : 0;

    const urgent = pending.filter(m =>
      m.notes?.toLowerCase().includes('urgent') || 
      m.cost > 5000000
    );

    const highValue = pending.filter(m => m.cost > 10000000);

    this.approvalStats = {
      totalPending: pending.length,
      totalApproved: approved.length,
      totalRejected: rejected.length,
      totalRequestedChanges: requestedChanges.length,
      averageApprovalTime: avgApprovalTime,
      urgentCount: urgent.length,
      highValueCount: highValue.length
    };
  }

  // ============================================================
  // SELECTION
  // ============================================================

  selectMovement(movementId: string | number): void {
    this.selectedMovement = this.movements.find(m => String(m.id) === String(movementId)) || null;
    if (this.selectedMovement) {
      // Reset forms
      this.approvalForm.reset();
      this.commentsForm.reset();
      this.changesForm.reset();
      this.selectedAction = null;
      this.showCommentsModal = false;
      this.showChangesModal = false;
      this.showConfirmModal = false;
    }
  }

  // ============================================================
  // APPROVAL ACTIONS
  // ============================================================

  /** While changes are outstanding, Approve/Reject/Request Changes stay hidden — nothing to
   *  approve or reject yet, and asking twice makes no sense. Reappear once it's edited (see
   *  StockMovementFormComponent.save()). */
  hasUnresolvedChangeRequest(movement: StockMovement | null): boolean {
    return hasUnresolvedChangeRequest(movement);
  }

  openActionModal(action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'): void {
    this.selectedAction = action;
    
    if (action === 'APPROVE') {
      this.showConfirmModal = true;
    } else if (action === 'REJECT') {
      this.showCommentsModal = true;
    } else if (action === 'REQUEST_CHANGES') {
      this.showChangesModal = true;
    }
  }

  closeActionModal(): void {
    this.showCommentsModal = false;
    this.showChangesModal = false;
    this.showConfirmModal = false;
    this.selectedAction = null;
    this.commentsForm.reset();
    this.changesForm.reset();
  }

  confirmApproval(): void {
    if (!this.selectedMovement || !this.selectedAction) return;

    this.isSubmitting = true;
    const movementId = String(this.selectedMovement.id);

    const action: ApprovalAction = {
      movementId,
      action: this.selectedAction,
      comments: 'Approved',
      approvedBy: this.getCurrentUserId(),
      approvedByName: this.getCurrentUserName(),
      timestamp: new Date()
    };

    // Approving moves a transfer to IN_TRANSIT, not straight to COMPLETED — stock only actually
    // moves once the movement is later marked COMPLETED (e.g. when it's confirmed received via
    // Stock Movement's status update), which is where InventoryService.updateMovement() applies
    // the real stock adjustment. This is a real persisted update, not a simulation.
    this.inventoryService.updateMovement(movementId, {
      status: MovementStatus.IN_TRANSIT,
      approvedBy: action.approvedBy,
      approvedByName: action.approvedByName,
      approvedAt: action.timestamp
    }).subscribe({
      next: (updated) => {
        if (this.selectedMovement && String(this.selectedMovement.id) === movementId) {
          this.selectedMovement = updated;
        }
        const idx = this.movements.findIndex(m => String(m.id) === movementId);
        if (idx > -1) this.movements[idx] = updated;

        this.calculateStats();
        this.filterMovements();
        this.approvalHistory = this.inventoryService.recordApprovalAction(action);
        this.approvalComplete.emit(action);

        this.isSubmitting = false;
        this.showConfirmModal = false;
        this.selectedAction = null;
      },
      error: (err) => {
        console.error('Failed to approve movement:', err);
        this.error = 'Failed to approve movement. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  submitComments(): void {
    if (this.commentsForm.invalid || !this.selectedMovement || this.selectedAction !== 'REJECT') {
      return;
    }

    this.isSubmitting = true;
    const movementId = String(this.selectedMovement.id);
    const comments = this.commentsForm.get('comments')?.value || '';

    const action: ApprovalAction = {
      movementId,
      action: 'REJECT',
      comments,
      approvedBy: this.getCurrentUserId(),
      approvedByName: this.getCurrentUserName(),
      timestamp: new Date()
    };

    this.inventoryService.updateMovement(movementId, {
      status: MovementStatus.CANCELLED,
      notes: (this.selectedMovement.notes || '') + `\nRejection reason: ${comments}`
    }).subscribe({
      next: (updated) => {
        if (this.selectedMovement && String(this.selectedMovement.id) === movementId) {
          this.selectedMovement = updated;
        }
        const idx = this.movements.findIndex(m => String(m.id) === movementId);
        if (idx > -1) this.movements[idx] = updated;

        this.calculateStats();
        this.filterMovements();
        this.approvalHistory = this.inventoryService.recordApprovalAction(action);
        this.approvalComplete.emit(action);

        this.isSubmitting = false;
        this.showCommentsModal = false;
        this.selectedAction = null;
        this.commentsForm.reset();
      },
      error: (err) => {
        console.error('Failed to reject movement:', err);
        this.error = 'Failed to reject movement. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  submitChanges(): void {
    if (this.changesForm.invalid || !this.selectedMovement || this.selectedAction !== 'REQUEST_CHANGES') {
      return;
    }

    this.isSubmitting = true;
    const movementId = String(this.selectedMovement.id);

    const changesRequested = [{
      field: this.changesForm.get('field')?.value || '',
      currentValue: this.changesForm.get('currentValue')?.value || '',
      suggestedValue: this.changesForm.get('suggestedValue')?.value || ''
    }];

    const comments = this.changesForm.get('reason')?.value || '';
    const action: ApprovalAction = {
      movementId,
      action: 'REQUEST_CHANGES',
      comments,
      approvedBy: this.getCurrentUserId(),
      approvedByName: this.getCurrentUserName(),
      timestamp: new Date(),
      changesRequested: changesRequested
    };

    // Status stays PENDING — requesting changes doesn't approve or reject, just leaves a note.
    this.inventoryService.updateMovement(movementId, {
      notes: (this.selectedMovement.notes || '') + `\nChanges requested: ${comments}`
    }).subscribe({
      next: (updated) => {
        if (this.selectedMovement && String(this.selectedMovement.id) === movementId) {
          this.selectedMovement = updated;
        }
        const idx = this.movements.findIndex(m => String(m.id) === movementId);
        if (idx > -1) this.movements[idx] = updated;

        this.calculateStats();
        this.filterMovements();
        this.approvalHistory = this.inventoryService.recordApprovalAction(action);
        this.approvalComplete.emit(action);

        this.isSubmitting = false;
        this.showChangesModal = false;
        this.selectedAction = null;
        this.changesForm.reset();
      },
      error: (err) => {
        console.error('Failed to request changes:', err);
        this.error = 'Failed to request changes. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  // ============================================================
  // BULK ACTIONS
  // ============================================================

  approveAll(): void {
    const pending = this.filteredMovements.filter(m => m.status === MovementStatus.PENDING);
    if (pending.length === 0) return;

    const confirmed = window.confirm(`Are you sure you want to approve all ${pending.length} pending movements?`);
    if (!confirmed) return;

    this.isSubmitting = true;
    this.error = null;

    // updateMovement() is a real HTTP call, not a synchronous mock — this used to recompute
    // stats/re-filter and flip isSubmitting back to false immediately after firing all the
    // requests, before any of them had resolved. The sidebar counts and the Pending tab kept
    // showing the pre-approval state right after "Approve All" appeared to finish, with no
    // signal that anything was still in flight or whether it had actually succeeded.
    const currentUserId = this.getCurrentUserId();
    const currentUserName = this.getCurrentUserName();
    const requests = pending.map(m => {
      const approvedAt = new Date();
      return this.inventoryService.updateMovement(m.id, {
        status: MovementStatus.IN_TRANSIT,
        approvedBy: currentUserId,
        approvedByName: currentUserName,
        approvedAt
      }).pipe(
        map(updated => ({ ok: true as const, id: m.id, updated, approvedAt })),
        catchError(err => {
          console.error(`Failed to approve movement ${m.id}:`, err);
          return of({ ok: false as const, id: m.id });
        })
      );
    });

    forkJoin(requests).pipe(takeUntil(this.destroy$)).subscribe(results => {
      results.forEach(r => {
        if (!r.ok) return;
        const idx = this.movements.findIndex(mv => mv.id === r.id);
        if (idx > -1) this.movements[idx] = r.updated;
        this.approvalHistory = this.inventoryService.recordApprovalAction({
          movementId: String(r.id),
          action: 'APPROVE',
          comments: 'Bulk approved',
          approvedBy: currentUserId,
          approvedByName: currentUserName,
          timestamp: r.approvedAt
        });
      });

      this.calculateStats();
      this.filterMovements();
      this.isSubmitting = false;

      const failedCount = results.filter(r => !r.ok).length;
      if (failedCount > 0) {
        this.error = failedCount === results.length
          ? 'Failed to approve any of the selected movements. Please try again.'
          : `${results.length - failedCount} of ${results.length} movements were approved; ${failedCount} failed. Please retry the remaining ones.`;
      }
    });
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

  viewMovementDetail(movementId: string): void {
    this.router.navigate(['/admin/sales/commerce/inventory/movements', movementId]);
  }

  viewBranch(branchId: string): void {
    if (branchId) {
      this.router.navigate(['/admin/sales/commerce/inventory/branches', branchId]);
    }
  }

  viewProduct(productId: string): void {
    if (productId) {
      this.router.navigate(['/admin/sales/commerce/inventory/products', productId]);
    }
  }

  // ============================================================
  // UI HELPERS
  // ============================================================

  getMovementTypeLabel(type: MovementType): string {
    return getMovementTypeLabel(type);
  }

  getMovementTypeIcon(type: MovementType): string {
    return getMovementTypeIcon(type);
  }

  getMovementStatusLabel(status: MovementStatus): string {
    return getMovementStatusLabel(status);
  }

  getStatusColor(status: MovementStatus): string {
    const map: Record<string, string> = {
      'PENDING': '#F5A623',
      'IN_TRANSIT': '#3B82F6',
      'COMPLETED': '#2EB270',
      'CANCELLED': '#DC2626'
    };
    return map[status] || '#6B7280';
  }

  getStatusIcon(status: MovementStatus): string {
    const map: Record<string, string> = {
      'PENDING': 'fa-clock',
      'IN_TRANSIT': 'fa-truck',
      'COMPLETED': 'fa-check-circle',
      'CANCELLED': 'fa-times-circle'
    };
    return map[status] || 'fa-circle';
  }

  getPriorityLabel(movement: StockMovement): string {
    if (movement.notes?.toLowerCase().includes('critical')) return 'Critical';
    if (movement.notes?.toLowerCase().includes('urgent')) return 'Urgent';
    if (movement.cost > 10000000) return 'High Value';
    if (movement.cost > 5000000) return 'Medium Value';
    return 'Normal';
  }

  getPriorityColor(movement: StockMovement): string {
    const label = this.getPriorityLabel(movement);
    const map: Record<string, string> = {
      'Critical': '#DC2626',
      'Urgent': '#F59E0B',
      'High Value': '#8B5CF6',
      'Medium Value': '#3B82F6',
      'Normal': '#6B7280'
    };
    return map[label] || '#6B7280';
  }

  getPriorityIcon(movement: StockMovement): string {
    const label = this.getPriorityLabel(movement);
    const map: Record<string, string> = {
      'Critical': 'fa-exclamation-circle',
      'Urgent': 'fa-exclamation-triangle',
      'High Value': 'fa-crown',
      'Medium Value': 'fa-star',
      'Normal': 'fa-circle'
    };
    return map[label] || 'fa-circle';
  }

  getActionColor(action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'): string {
    const map: Record<string, string> = {
      'APPROVE': '#2EB270',
      'REJECT': '#DC2626',
      'REQUEST_CHANGES': '#F5A623'
    };
    return map[action] || '#6B7280';
  }

  getActionIcon(action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'): string {
    const map: Record<string, string> = {
      'APPROVE': 'fa-check-circle',
      'REJECT': 'fa-times-circle',
      'REQUEST_CHANGES': 'fa-edit'
    };
    return map[action] || 'fa-circle';
  }

  getActionLabel(action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'): string {
    const map: Record<string, string> = {
      'APPROVE': 'Approved',
      'REJECT': 'Rejected',
      'REQUEST_CHANGES': 'Changes Requested'
    };
    return map[action] || action;
  }

  // Approval History only ever stored the movement's id, so the timeline showed "Movement
  // #mov-2" instead of what was actually moved. Resolve it against the already-loaded
  // movements list instead, same lookup-by-id pattern as getBranchName() below.
  getMovementLabel(movementId: string): string {
    const movement = this.movements.find(m => String(m.id) === movementId);
    return movement?.productName ? `${movement.productName} (${movement.sku})` : `Movement #${movementId}`;
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

  isUrgent(movement: StockMovement): boolean {
    return movement.notes?.toLowerCase().includes('urgent') || 
           movement.notes?.toLowerCase().includes('critical') ||
           movement.cost > 10000000;
  }

  isHighValue(movement: StockMovement): boolean {
    return movement.cost > 10000000;
  }

  getMovementCount(): number {
    return this.filteredMovements.length;
  }

  getPendingCount(): number {
    return this.movements.filter(m => m.status === MovementStatus.PENDING).length;
  }

  getCompletedCount(): number {
    return this.movements.filter(m => m.status === MovementStatus.COMPLETED).length;
  }

  getCancelledCount(): number {
    return this.movements.filter(m => m.status === MovementStatus.CANCELLED).length;
  }

  getTypeCount(type: MovementType): number {
    return this.movements.filter(m => m.movementType === type).length;
  }
}