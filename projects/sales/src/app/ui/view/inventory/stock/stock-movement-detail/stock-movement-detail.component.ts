// stock-movement-detail.component.ts
// ============================================================
// IMPORTS
// ============================================================

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { InventoryService } from '../../../../service/inventory/inventory.service';
import {
  StockMovement,
  MovementType,
  MovementStatus,
  getMovementTypeLabel,
  getMovementTypeIcon,
  getMovementStatusLabel
} from '../../../../domain/inventory/inventory.dto';

// ============================================================
// COMPONENT
// ============================================================

@Component({
  selector: 'app-stock-movement-detail',
  templateUrl: './stock-movement-detail.component.html',
  styleUrls: ['./stock-movement-detail.component.scss']
})
export class StockMovementDetailComponent implements OnInit, OnDestroy {

  // ============================================================
  // INPUTS / OUTPUTS
  // ============================================================

  @Input() movementId: string = '';
  @Output() close = new EventEmitter<void>();

  // ============================================================
  // STATE
  // ============================================================

  movement: StockMovement | null = null;
  isLoading: boolean = true;
  error: string | null = null;
  isUpdating: boolean = false;
  showDeleteConfirm: boolean = false;
  showStatusModal: boolean = false;
  selectedStatus: MovementStatus | null = null;
  statusNote: string = '';

  // UI
  Math = Math;
  activeTab: 'details' | 'history' = 'details';
  currentStep: number = 1;
  totalSteps: number = 3;

  // Enums
  MovementType = MovementType;
  MovementStatus = MovementStatus;

  // All possible statuses. Which ones are actually offered for a given movement is restricted
  // by statusOptions() below — this used to offer all four unconditionally, so a still-PENDING
  // movement (never approved via Movement Approvals) could be jumped straight to COMPLETED from
  // here, which immediately executes the real stock adjustment (applyTransferStockAdjustment),
  // completely bypassing the Approve/Reject gate enforced everywhere else in the app.
  private static readonly ALL_STATUS_OPTIONS = [
    { value: MovementStatus.PENDING, label: 'Pending', color: '#F59E0B' },
    { value: MovementStatus.IN_TRANSIT, label: 'In Transit', color: '#3B82F6' },
    { value: MovementStatus.COMPLETED, label: 'Completed', color: '#2EB270' },
    { value: MovementStatus.CANCELLED, label: 'Cancelled', color: '#6B7280' }
  ];

  // Mirrors the real workflow enforced in Movement Approvals: PENDING must first be approved
  // (-> IN_TRANSIT) or rejected (-> CANCELLED); only an already-approved, IN_TRANSIT movement can
  // be marked COMPLETED. COMPLETED/CANCELLED are terminal.
  private static readonly STATUS_TRANSITIONS: Record<string, MovementStatus[]> = {
    [MovementStatus.PENDING]: [MovementStatus.IN_TRANSIT, MovementStatus.CANCELLED],
    [MovementStatus.IN_TRANSIT]: [MovementStatus.COMPLETED, MovementStatus.CANCELLED],
    [MovementStatus.COMPLETED]: [],
    [MovementStatus.CANCELLED]: []
  };

  get statusOptions() {
    const allowed = new Set(
      this.movement ? StockMovementDetailComponent.STATUS_TRANSITIONS[this.movement.status] || [] : []
    );
    return StockMovementDetailComponent.ALL_STATUS_OPTIONS.filter(o => allowed.has(o.value));
  }

  // Movement timeline — built entirely from real movement fields, see generateTimeline().
  timeline: any[] = [];

  // Private
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(
    private inventoryService: InventoryService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  // ============================================================
  // LIFECYCLE HOOKS
  // ============================================================

  ngOnInit(): void {
    // Get movementId from route if not provided
    if (!this.movementId) {
      this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['id']) {
          this.movementId = params['id'];
          this.loadMovement();
        }
      });
    } else {
      this.loadMovement();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  loadMovement(): void {
    this.isLoading = true;
    this.error = null;

    this.inventoryService.getMovement(this.movementId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (movement: StockMovement) => {
          this.movement = movement;
          this.generateTimeline();
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error('Failed to load movement:', err);
          this.error = 'Failed to load movement details. Please try again.';
          this.isLoading = false;
        }
      });
  }

  // ============================================================
  // TIMELINE GENERATION
  // ============================================================

  private generateTimeline(): void {
    if (!this.movement) return;

    this.timeline = [
      {
        status: 'Created',
        description: `Movement #${this.movement.id} was created`,
        timestamp: this.movement.createdAt,
        icon: 'fa-plus-circle',
        color: '#3B82F6'
      }
    ];

    if (this.movement.approvedAt) {
      this.timeline.push({
        status: 'Approved',
        description: `Movement was approved by ${this.movement.approvedByName || 'Approver'}`,
        timestamp: this.movement.approvedAt,
        icon: 'fa-check-circle',
        color: '#2EB270'
      });
    }

    if (this.movement.completedAt) {
      this.timeline.push({
        status: 'Completed',
        description: `Movement was completed`,
        timestamp: this.movement.completedAt,
        icon: 'fa-flag-checkered',
        color: '#2EB270'
      });
    }

    // Sort by timestamp
    this.timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // ============================================================
  // STATUS MANAGEMENT
  // ============================================================

  openStatusModal(): void {
    this.selectedStatus = null;
    this.statusNote = '';
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.selectedStatus = null;
    this.statusNote = '';
  }

  selectStatus(status: MovementStatus): void {
    this.selectedStatus = status;
  }

  updateStatus(): void {
    if (!this.movement || !this.selectedStatus) return;

    // Defensive: statusOptions already filters the modal's choices to valid transitions, but
    // guard here too in case selectStatus() is ever reachable with a stale/invalid value.
    const allowed = StockMovementDetailComponent.STATUS_TRANSITIONS[this.movement.status] || [];
    if (!allowed.includes(this.selectedStatus)) {
      this.error = `Cannot move a ${this.movement.status} movement directly to ${this.selectedStatus}.`;
      return;
    }

    this.isUpdating = true;
    const newStatus = this.selectedStatus;

    // The status-update modal's "Note (Optional)" textarea was bound to statusNote but never
    // actually sent — appended to notes (not overwriting them) so it survives alongside whatever
    // was already recorded on this movement.
    const note = this.statusNote.trim();
    const notes = note
      ? `${this.movement.notes ? this.movement.notes + '\n' : ''}Status changed to ${newStatus}: ${note}`
      : this.movement.notes;

    // Marking a TRANSFER movement COMPLETED here actually moves the stock — see
    // InventoryService.updateMovement()/applyTransferStockAdjustment() — so completing a
    // transfer works the same way whether it's done from here or from the Approvals page.
    this.inventoryService.updateMovement(this.movement.id, { status: newStatus, notes })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.movement = updated;
          this.generateTimeline();
          this.isUpdating = false;
          this.closeStatusModal();
        },
        error: (err) => {
          console.error('Failed to update movement status:', err);
          this.error = 'Failed to update status. Please try again.';
          this.isUpdating = false;
        }
      });
  }

  // ============================================================
  // DELETE
  // ============================================================

  deleteMovement(): void {
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.movement) return;
    this.isUpdating = true;

    this.inventoryService.deleteMovement(this.movement.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isUpdating = false;
          this.showDeleteConfirm = false;
          this.close.emit();
          this.router.navigate(['/admin/sales/commerce/inventory']);
        },
        error: (err) => {
          console.error('Failed to delete movement:', err);
          this.error = 'Failed to delete movement. Please try again.';
          this.isUpdating = false;
          this.showDeleteConfirm = false;
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
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

  editMovement(): void {
    if (this.movement) {
      this.router.navigate(['/admin/sales/commerce/inventory/movements', this.movement.id, 'edit']);
    }
  }

  // ============================================================
  // TAB MANAGEMENT
  // ============================================================

  setActiveTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  // ============================================================
  // UTILITY HELPERS
  // ============================================================

  getMovementTypeLabel(type: string): string {
    return getMovementTypeLabel(type as MovementType);
  }

  getMovementTypeIcon(type: string): string {
    return getMovementTypeIcon(type as MovementType);
  }

  getMovementStatusLabel(status: string): string {
    return getMovementStatusLabel(status as MovementStatus);
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      [MovementStatus.PENDING]: '#F59E0B',
      [MovementStatus.IN_TRANSIT]: '#3B82F6',
      [MovementStatus.COMPLETED]: '#2EB270',
      [MovementStatus.CANCELLED]: '#6B7280'
    };
    return map[status] || '#6B7280';
  }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      [MovementStatus.PENDING]: 'pending',
      [MovementStatus.IN_TRANSIT]: 'in-transit',
      [MovementStatus.COMPLETED]: 'completed',
      [MovementStatus.CANCELLED]: 'cancelled'
    };
    return map[status] || 'pending';
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

  formatCurrency(value: number): string {
    if (!value) return '₦0';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }

  // Only a still-PENDING movement can be edited. It used to also allow editing an already-
  // approved (IN_TRANSIT) movement, with no re-approval step and no re-validation on save — the
  // quantity/locations of an approved transfer could be silently changed post-approval, so what
  // eventually gets applied on COMPLETED could differ from what was actually approved.
  canEdit(): boolean {
    return this.movement?.status === MovementStatus.PENDING;
  }

  canDelete(): boolean {
    return this.movement?.status === MovementStatus.PENDING;
  }

  canUpdateStatus(): boolean {
    return this.movement?.status !== MovementStatus.COMPLETED &&
      this.movement?.status !== MovementStatus.CANCELLED;
  }

  isStatusSelected(status: MovementStatus): boolean {
    return this.selectedStatus === status;
  }

  // ============================================================
  // REFRESH
  // ============================================================

  refresh(): void {
    this.loadMovement();
  }
}