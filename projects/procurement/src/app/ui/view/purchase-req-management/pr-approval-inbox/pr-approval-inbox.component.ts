import { Component, OnDestroy, OnInit } from '@angular/core';
import { PrApprovalWorkflowService } from '../../../service/pr-approval-workflow.service';
import { PrStorageService } from '../../../service/pr-storage.service';
import { PurchaseRequisitionLS } from '../../../domain/procurement.dto';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-approval-inbox',
  templateUrl: './pr-approval-inbox.component.html',
  styleUrls: ['./pr-approval-inbox.component.scss'],
  providers: [MessageService],
})
export class PrApprovalInboxComponent implements OnInit, OnDestroy {
  currentUserId = 'u-dept-head-1'; // mock user (replace later)
  pendingList: any[] = [];
  selectedPendingList: any[] = [];
  showRejectModal = false;
  rejectReason = '';
  activePr: PurchaseRequisitionLS | null = null;

  columns = [
    { header: 'Title', field: 'title', sortable: true },
    { header: 'PRM No', field: 'prmNo', sortable: true },
    { header: 'Department', field: 'department', sortable: true },
    { header: 'Budget Cap Amount', field: 'budgetCapAmount', sortable: true },
    {
      header: 'Required By',
      field: 'requiredByDate',
      sortable: true,
      formatter: (row: any) =>
        new Date(row.requiredByDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      header: 'Current Step',
      formatter: (row: PurchaseRequisitionLS) => this.currentStepInfo(row),
    },
    {
      header: 'Status',
      field: 'status',
      sortable: true,
      formatter: (row: any) => row.status ?? '__',
      badgeClass: (row: any) =>
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ' +
        this.statusBadgeClass(row.status),
    },
  ];

  actions = [
    { id: 'view', label: 'View', icon: 'pi pi-eye' },
    { id: 'approve', label: 'Approve', icon: 'pi pi-check' },
    { id: 'reject', label: 'Reject', icon: 'pi pi-times', className: 'danger' },
  ];

  private intervalId: any;

  constructor(
    private workflow: PrApprovalWorkflowService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.refresh();

    // check escalation + refresh every 30 seconds
    this.intervalId = setInterval(() => {
      this.workflow.checkEscalations();
      this.refresh();
    }, 30_000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  openItem($event: any) {
    throw new Error('Method not implemented.');
  }
  onAction($event: { actionId: string; row: PurchaseRequisitionLS }) {
    const pr = $event.row;

    switch ($event.actionId) {
      case 'view':
        this.viewDetails(pr);
        break;

      case 'approve':
        this.approve(pr);
        break;

      case 'reject':
        this.openReject(pr);
        break;

      default:
        console.warn('Unknown action:', $event.actionId, pr);
        this.messageService.add({
          severity: 'warn',
          summary: 'Action',
          detail: 'Unknown action selected.',
          life: 2500,
        });
        break;
    }
  }

  refresh(): void {
    this.pendingList = this.workflow.getPendingForApprover(this.currentUserId);
  }

  currentStepInfo(pr: PurchaseRequisitionLS): string {
    const step = pr.approval?.steps?.find(
      (s) => s.level === pr.approval?.currentLevel,
    );
    if (!step) return '';
    const escalated = pr.approval?.escalation?.lastEscalatedAt
      ? ' • Escalated'
      : '';
    return `L${step.level} • ${step.role}${escalated}`;
  }

  approve(pr: PurchaseRequisitionLS): void {
    this.workflow.approve(pr.id, this.currentUserId);

    this.messageService.add({
      severity: 'success',
      summary: 'Approved',
      detail: `${pr.prmNo} approved.`,
      life: 3000,
    });

    this.refresh();
  }

  openReject(pr: PurchaseRequisitionLS): void {
    this.activePr = pr;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  cancelReject(): void {
    this.showRejectModal = false;
    this.rejectReason = '';
    this.activePr = null;
  }

  confirmReject(): void {
    if (!this.activePr) return;

    const reason = this.rejectReason.trim();
    if (!reason) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Reason required',
        detail: 'Please enter a rejection reason.',
        life: 3000,
      });
      return;
    }

    this.workflow.reject(this.activePr.id, this.currentUserId, reason);

    this.messageService.add({
      severity: 'error',
      summary: 'Rejected',
      detail: `${this.activePr.prmNo} rejected.`,
      life: 3500,
    });

    this.cancelReject();
    this.refresh();
  }

  viewDetails(pr: PurchaseRequisitionLS): void {
    // For now: just log; later route to details component
    console.log('PR details:', pr);
    this.messageService.add({
      severity: 'info',
      summary: 'View',
      detail: `Opened ${pr.prmNo} (console log).`,
      life: 2500,
    });
  }

  private readonly statusClasses: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
    Inactive: 'bg-gray-200 text-gray-700 ring-1 ring-gray-300',
    Cancelled: 'bg-gray-300 text-gray-900 ring-1 ring-gray-400',

    Submitted: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    Converted: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200',

    Pending: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    PendingApproval: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    PendingRegistration: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    UnderReview: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',

    Approved: 'bg-green-100 text-green-800 ring-1 ring-green-200',
    AiApproved: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',

    Rejected: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    AiRejected: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
    AiFlagged: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',

    AiPending: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200',
  };

  statusBadgeClass(status: string): string {
    return (
      this.statusClasses[status] ??
      'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
    );
  }
}
