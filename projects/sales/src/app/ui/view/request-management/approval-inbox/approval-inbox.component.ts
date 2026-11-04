import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ApprovalService } from '../../../service/approval-inbox/approval.service';
import { WorkflowInstance, WorkflowStage, WorkflowAction } from '../../../domain/approval-inbox/approval-request.dto';
import { ProcurementRequest } from '../../../domain/procurement-request/procurement.dto';
import { MessageService } from 'primeng/api';
import { formatApiDate, toApiDate } from '../../../service/sales/date.util';

// Created and approval times are real moments, so they show the time, in the viewer's timezone. Deadlines
// are stored as midnight UTC with no real time, so they show the date alone, in UTC so it can't shift a day.
const DATE_AND_TIME: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
const DATE_ONLY_UTC: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };

@Component({
  selector: 'app-approval-inbox',
  templateUrl: './approval-inbox.component.html',
  styleUrls: ['./approval-inbox.component.scss']
})
export class ApprovalInboxComponent implements OnInit, OnDestroy {

  requests: ProcurementRequest[] = [];
  filtered: ProcurementRequest[] = [];
  selected: ProcurementRequest | null = null;
  workflowInstance: WorkflowInstance | null = null;

  isLoading = false;
  isLoadingInstance = false;
  isActioning = false;

  searchTerm = '';
  filterType: 'ALL' | 'PRODUCT' | 'SERVICE' = 'ALL';

  currentPage = 0;
  pageSize = 10;

  showApproveModal = false;
  showRejectModal = false;
  approveComment = '';
  rejectReason = '';

  private destroy$ = new Subject<void>();

  get pendingCount(): number { return this.requests.length; }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }

  get pagedRequests(): ProcurementRequest[] {
    const start = this.currentPage * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pageRangeEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.filtered.length);
  }

  getPageNumbers(): number[] {
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible);

    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }

    return Array.from({ length: end - start }, (_, i) => start + i);
  }

  constructor(
    private approvalService: ApprovalService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void { this.load(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.isLoading = true;
    // Everything, because the backend returns these in no useful order: the newest could be past any cutoff.
    this.approvalService.getPendingProcurementRequests(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.requests = res.data;
          this.refreshList();
          this.isLoading = false;
          if (this.selected) {
            const refreshed = this.requests.find(r => r.id === this.selected!.id);
            if (refreshed) {
              this.select(refreshed);
            } else {
              // The selected request left the pending queue (e.g. the final approval stage
              // cleared it) — confirmApprove() already clears this on its own path, but a
              // background/manual refresh via load() was leaving the previous selection and its
              // Approve/Reject buttons visible and active against a workflow instance that may
              // already be finalized server-side.
              this.selected = null;
              this.workflowInstance = null;
            }
          }
        },
        error: () => { this.isLoading = false; }
      });
  }

  /** A new search or filter starts from the first page of its results. */
  applyFilters(): void {
    this.currentPage = 0;
    this.refreshList();
  }

  /** Reloading after an approval keeps the reviewer's place, unless that page no longer exists. */
  private refreshList(): void {
    let list = [...this.requests];
    if (this.filterType !== 'ALL') {
      list = list.filter(r => r.procurementType === this.filterType);
    }
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        String(r.id).includes(q)
      );
    }
    this.filtered = list.sort((a, b) => toApiDate(b.createdAt).getTime() - toApiDate(a.createdAt).getTime());
    this.currentPage = Math.min(this.currentPage, this.totalPages - 1);
  }

  select(req: ProcurementRequest): void {
    this.selected = req;
    this.workflowInstance = null;
    const instanceId = req.approvalInstanceId;
    this.isLoadingInstance = true;
    if (instanceId) {
      this.approvalService.getWorkflowInstance(Number(instanceId))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (inst) => this.applyWorkflowInstance(req, inst),
          error: () => this.lookupByReference(req)
        });
    } else {
      this.lookupByReference(req);
    }
  }

  /**
   * Every async step below (getWorkflowInstance / lookupByReference / retriggerThenFetch) is
   * kicked off from select(req) but resolves later, with no cancellation of the previous
   * request's in-flight call. Clicking request A then quickly clicking request B could let A's
   * response land after B's and overwrite `workflowInstance` with A's data while `selected`
   * shows B — so Approve/Reject would act on the wrong workflow instance. Guard every place
   * that writes `workflowInstance` by re-checking `selected` is still the request this chain
   * started for; a stale response is just dropped.
   */
  private isStillSelected(req: ProcurementRequest): boolean {
    return this.selected?.id === req.id;
  }

  private applyWorkflowInstance(req: ProcurementRequest, inst: WorkflowInstance): void {
    if (!this.isStillSelected(req)) return;
    this.workflowInstance = inst;
    this.isLoadingInstance = false;
  }

  private lookupByReference(req: ProcurementRequest): void {
    this.approvalService.lookupWorkflowInstance('PROCUREMENT_REQUEST', String(req.id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inst) => this.applyWorkflowInstance(req, inst),
        error: () => this.retriggerThenFetch(req)
      });
  }

  private retriggerThenFetch(req: ProcurementRequest): void {
    this.approvalService.retriggerApproval(req.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated: any) => {
          if (!this.isStillSelected(req)) return;
          const instanceId = updated?.approvalInstanceId;
          if (instanceId) {
            this.approvalService.getWorkflowInstance(Number(instanceId))
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (inst) => this.applyWorkflowInstance(req, inst),
                error: () => { if (this.isStillSelected(req)) this.isLoadingInstance = false; }
              });
          } else {
            this.isLoadingInstance = false;
            this.messageService.add({
              severity: 'warn',
              summary: 'Approval Workflow Not Configured',
              detail: 'No approval workflow is configured for Procurement. Go to Settings → Approval Workflows and enable the Commerce Procurement workflow.'
            });
          }
        },
        error: () => { if (this.isStillSelected(req)) this.isLoadingInstance = false; }
      });
  }

  openApprove(): void { this.approveComment = ''; this.showApproveModal = true; }
  openReject(): void  { this.rejectReason = '';   this.showRejectModal = true; }

  confirmApprove(): void {
    if (!this.selected || !this.workflowInstance) return;
    this.isActioning = true;

    const userId = this.getCurrentUserId();
    const { roleCode, roleId } = this.getCurrentRole();

    const payload = new FormData();
    payload.append('actorUserId', String(userId));
    if (roleCode) payload.append('actorRoleCode', roleCode);
    if (roleId)   payload.append('actorRoleId', String(roleId));
    payload.append('comment', this.approveComment.trim());

    this.approvalService.approveWorkflowInstance(this.workflowInstance.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showApproveModal = false;
          this.isActioning = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Stage Approved',
            detail: `"${this.selected?.title}" approval stage has been approved.`
          });
          this.load();
        },
        error: (err: any) => {
          const detail = err?.error?.message || err?.error?.detail || 'Could not approve. Please try again.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail });
          this.isActioning = false;
        }
      });
  }

  confirmReject(): void {
    if (!this.selected || !this.workflowInstance || !this.rejectReason.trim()) return;
    this.isActioning = true;

    const userId = this.getCurrentUserId();
    const { roleCode, roleId } = this.getCurrentRole();

    const payload: any = {
      actorUserId: userId,
      actorRoleCode: roleCode,
      comment: this.rejectReason.trim()
    };
    if (roleId) payload.actorRoleId = roleId;

    this.approvalService.rejectWorkflowInstance(this.workflowInstance.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showRejectModal = false;
          this.selected = null;
          this.workflowInstance = null;
          this.isActioning = false;
          this.messageService.add({
            severity: 'warn',
            summary: 'Rejected',
            detail: 'The procurement request has been rejected.'
          });
          this.load();
        },
        error: (err: any) => {
          const detail = err?.error?.message || err?.error?.detail || 'Could not reject. Please try again.';
          this.messageService.add({ severity: 'error', summary: 'Error', detail });
          this.isActioning = false;
        }
      });
  }

  // ── Workflow instance helpers ───────────────────────────

  get wfStages(): WorkflowStage[] {
    return this.workflowInstance?.approval?.stages ?? [];
  }

  get wfActions(): WorkflowAction[] {
    return this.workflowInstance?.actions ?? [];
  }

  get currentStageOrder(): number | null {
    return this.workflowInstance?.currentStage?.orderIndex ?? null;
  }

  getStageStatus(stage: WorkflowStage): 'done' | 'active' | 'waiting' {
    const actions = this.wfActions;
    const approved = actions.some(a => a.action === 'APPROVED' && a.stageOrderIndex === stage.orderIndex);
    const rejected = actions.some(a => a.action === 'REJECTED' && a.stageOrderIndex === stage.orderIndex);
    if (approved || rejected) return 'done';
    if (stage.orderIndex === this.currentStageOrder) return 'active';
    return 'waiting';
  }

  getStageActionStatus(stage: WorkflowStage): string {
    const actions = this.wfActions;
    const approved = actions.some(a => a.action === 'APPROVED' && a.stageOrderIndex === stage.orderIndex);
    const rejected = actions.some(a => a.action === 'REJECTED' && a.stageOrderIndex === stage.orderIndex);
    if (rejected) return 'REJECTED';
    if (approved) return 'APPROVED';
    if (stage.orderIndex === this.currentStageOrder) return 'AWAITING';
    return 'PENDING';
  }

  getStageActionAt(stage: WorkflowStage): string {
    const action = this.wfActions
      .filter(a => a.stageOrderIndex === stage.orderIndex && (a.action === 'APPROVED' || a.action === 'REJECTED'))
      .sort((a, b) => toApiDate(b.createdAt).getTime() - toApiDate(a.createdAt).getTime())[0];
    return action ? this.formatDate(action.createdAt) : '';
  }

  getStageComment(stage: WorkflowStage): string {
    const action = this.wfActions
      .filter(a => a.stageOrderIndex === stage.orderIndex)
      .sort((a, b) => toApiDate(b.createdAt).getTime() - toApiDate(a.createdAt).getTime())[0];
    return action?.comment || '';
  }

  progressPct(): number {
    const stages = this.wfStages;
    if (!stages.length) return 0;
    const done = stages.filter(s => this.getStageStatus(s) === 'done').length;
    return Math.round((done / stages.length) * 100);
  }

  // ── Formatters ─────────────────────────────────────────

  formatBudget(req: ProcurementRequest): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: req.currency || 'NGN', maximumFractionDigits: 0
    }).format((req as any).totalBudget || 0);
  }

  formatDate(d: any): string {
    return formatApiDate(d, DATE_AND_TIME, 'en-NG', '—');
  }

  formatDeadline(d: any): string {
    return formatApiDate(d, DATE_ONLY_UTC, 'en-NG', '—');
  }

  urgencyClass(req: ProcurementRequest): { [key: string]: boolean } {
    return { 'urgency-normal': true };
  }

  // ── Session helpers ─────────────────────────────────────

  private getCurrentUserId(): number {
    return this.approvalService.getCurrentActor().userId;
  }

  private getCurrentRole(): { roleCode: string | null; roleId: number | null } {
    const { roleCode, roleId } = this.approvalService.getCurrentActor();
    return { roleCode, roleId };
  }

  // Add this method
getTypeCount(type: string): number {
  return this.requests.filter(r => r.procurementType === type).length;
}

// Add resetFilters method
resetFilters(): void {
  this.searchTerm = '';
  this.filterType = 'ALL';
  this.applyFilters();
}
}
