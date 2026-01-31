import { Component, OnDestroy, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PrApprovalWorkflowService } from '../../../service/pr-approval-workflow.service';
import { PrStorageService } from '../../../service/pr-storage.service';
import { PurchaseRequisitionLS } from '../../../domain/procurement.dto';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-approval-inbox',
  templateUrl: './pr-approval-inbox.component.html',
  styleUrls: ['./pr-approval-inbox.component.scss'],
  providers: [MessageService]
})
export class PrApprovalInboxComponent implements OnInit, OnDestroy {

  // // ✅ Mock logged-in user (replace later with auth)
  // currentUserId = 'u-dept-head-1'; // try u-finance-1 or u-proc-1 to see other queues

  // pending: PurchaseRequisitionLS[] = [];
  // loading = false;

  // // Modal state
  // showRejectModal = false;
  // rejectReason = '';
  // activePr: PurchaseRequisitionLS | null = null;

  // private intervalId: any;

  // constructor(
  //   private workflow: PrApprovalWorkflowService,
  //   private store: PrStorageService,
  //   private messageService: MessageService
  // ) {}

  // ngOnInit(): void {
  //   this.refresh();

  //   // auto refresh + escalation simulation
  //   this.intervalId = setInterval(() => {
  //     this.workflow.checkEscalations();
  //     this.refresh();
  //   }, 30_000);
  // }

  // ngOnDestroy(): void {
  //   if (this.intervalId) clearInterval(this.intervalId);
  // }

  // refresh(): void {
  //   this.loading = true;
  //   // pulls only PRs pending for the current approver
  //   this.pending = this.workflow.getPendingForApprover(this.currentUserId);
  //   this.loading = false;
  // }

  // // Helper: show who is waiting now
  // currentStepInfo(pr: PurchaseRequisitionLS): string {
  //   const step = pr.approval?.steps?.find(s => s.level === pr.approval?.currentLevel);
  //   if (!step) return '';
  //   return `Level ${step.level} • ${step.role}`;
  // }

  // approve(pr: PurchaseRequisitionLS): void {
  //   this.workflow.approve(pr.id, this.currentUserId);

  //   this.messageService.add({
  //     severity: 'success',
  //     summary: 'Approved',
  //     detail: `PR ${pr.prmNo} approved successfully.`,
  //     life: 3000
  //   });

  //   this.refresh();
  // }

  // openReject(pr: PurchaseRequisitionLS): void {
  //   this.activePr = pr;
  //   this.rejectReason = '';
  //   this.showRejectModal = true;
  // }

  // cancelReject(): void {
  //   this.showRejectModal = false;
  //   this.rejectReason = '';
  //   this.activePr = null;
  // }

  // confirmReject(): void {
  //   if (!this.activePr) return;

  //   const reason = this.rejectReason.trim();
  //   if (!reason) {
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'Reason required',
  //       detail: 'Please enter a rejection reason.',
  //       life: 3000
  //     });
  //     return;
  //   }

  //   this.workflow.reject(this.activePr.id, this.currentUserId, reason);

  //   this.messageService.add({
  //     severity: 'error',
  //     summary: 'Rejected',
  //     detail: `PR ${this.activePr.prmNo} rejected.`,
  //     life: 3500
  //   });

  //   this.cancelReject();
  //   this.refresh();
  // }

  // // Optional: quick view details (you can route later)
  // viewDetails(pr: PurchaseRequisitionLS): void {
  //   console.log('PR Details:', pr);
  //   this.messageService.add({
  //     severity: 'info',
  //     summary: 'PR Details',
  //     detail: `Opened details for ${pr.prmNo} (console).`,
  //     life: 2500
  //   });
  // }

  // // Badge styling for status
  statusBadgeClass(status: string): string {
    switch (status) {
      case 'UnderReview':
        return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 ring-1 ring-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 ring-1 ring-red-200';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800 ring-1 ring-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
    }
  }

  currentUserId = 'u-dept-head-1'; // mock user (replace later)
  pendingList: any[] = [];

  showRejectModal = false;
  rejectReason = '';
  activePr: PurchaseRequisitionLS | null = null;

  private intervalId: any;

  constructor(
    private workflow: PrApprovalWorkflowService,
    private messageService: MessageService
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

  refresh(): void {
    this.pendingList = this.workflow.getPendingForApprover(this.currentUserId);
  }

  currentStepInfo(pr: PurchaseRequisitionLS): string {
    const step = pr.approval?.steps?.find(s => s.level === pr.approval?.currentLevel);
    if (!step) return '';
    const escalated = pr.approval?.escalation?.lastEscalatedAt ? ' • Escalated' : '';
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

  // ✅ reuse your existing badge classes
  getStatusClass(status: string) {
    switch (status) {
      case 'Draft':
        return 'badge badge-lightgrey';
      case 'Submitted':
        return 'badge badge-blue';
      case 'UnderReview':
        return 'badge badge-warning';
      case 'Approved':
        return 'badge badge-success';
      case 'Rejected':
        return 'badge badge-danger';
      case 'Cancelled':
        return 'badge badge-dark';
      case 'Converted':
        return 'badge badge-lightblue';
      default:
        return '';
    }
  }
}
