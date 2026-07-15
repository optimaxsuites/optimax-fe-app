import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApprovalService } from '../../../service/approval-inbox/approval.service';
import { ApprovalRequest, ApprovalStatus, ApprovalLevel, ApprovalComment } from '../../../domain/approval-inbox/approval-request.dto';
import { ProcurementRequestService } from '../../../service/procurement/procurement.service';
import { RequestStatus, ProcurementRequest } from '../../../domain/procurement-request/procurement.dto';

@Component({
  selector: 'app-approval-rfq-detail',
  templateUrl: './approval-rfq-detail.component.html',
  styleUrls: ['./approval-rfq-detail.component.scss']
})
export class ApprovalRfqDetailComponent implements OnInit, OnDestroy {
  approvalId: string | null = null;
  approval: ApprovalRequest | null = null;
  procurementRequest: ProcurementRequest | null = null;
  isLoading = true;
  showApproveModal = false;
  showRejectModal = false;
  commentsText = '';
  newCommentText = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private approvalService: ApprovalService,
    private procurementService: ProcurementRequestService
  ) { }

  ngOnInit(): void {
    this.approvalId = this.route.snapshot.paramMap.get('id');
    if (this.approvalId) {
      this.loadApprovalDetails(this.approvalId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadApprovalDetails(id: string): void {
    this.isLoading = true;
    this.approvalService.getApprovalById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (app) => {
          if (app) {
            this.approval = app;
            this.loadProcurementDetails(app.requestId);
          } else {
            this.isLoading = false;
          }
        },
        error: (err) => {
          console.error('Error fetching approval request:', err);
          this.isLoading = false;
        }
      });
  }

  loadProcurementDetails(requestId: string): void {
    this.procurementService.getRequest(requestId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (req) => {
          this.procurementRequest = req;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching procurement details:', err);
          this.isLoading = false;
        }
      });
  }

  forwardToVendor(): void {
    this.showApproveModal = true;
    this.commentsText = '';
  }

  rejectRequest(): void {
    this.showRejectModal = true;
    this.commentsText = '';
  }

  confirmApprove(): void {
    if (!this.approval) return;

    const levelToApprove = this.approval.currentLevel;

    this.approvalService.approveRequest(this.approval.id, levelToApprove, this.commentsText)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.approval = updated;
          if (updated.status === 'APPROVED') {
            this.updateProcurementRequestStatus(updated.requestId, 'APPROVED', updated.requestType);
          }
          this.showApproveModal = false;
        },
        error: (error) => {
          console.error('Error approving request:', error);
        }
      });
  }

  confirmReject(): void {
    if (!this.approval) return;

    const levelToReject = this.approval.currentLevel;

    this.approvalService.rejectRequest(this.approval.id, levelToReject, this.commentsText)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.approval = updated;
          this.updateProcurementRequestStatus(updated.requestId, 'REJECTED', updated.requestType);
          this.showRejectModal = false;
        },
        error: (error) => {
          console.error('Error rejecting request:', error);
        }
      });
  }

  private updateProcurementRequestStatus(requestId: string, status: 'APPROVED' | 'REJECTED', requestType: string): void {
    if (requestType === 'ORDER') {
      this.procurementService.updateOrderStatus(requestId, status === 'APPROVED' ? 'PENDING_VENDOR_QUOTES' : 'CANCELLED')
        .subscribe({
          next: () => {
            console.log(`Master order ${requestId} updated to ${status === 'APPROVED' ? 'PENDING_VENDOR_QUOTES' : 'CANCELLED'}`);
          },
          error: (error: any) => {
            console.error('Error updating order status:', error);
          }
        });
    } else {
      const nextStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
      this.procurementService.updateRequest(requestId, {
        status: nextStatus as RequestStatus
      }).subscribe({
        next: () => {
          console.log(`Procurement request ${requestId} updated to ${nextStatus}`);
        },
        error: (error: any) => {
          console.error('Error updating procurement status:', error);
        }
      });
    }
  }

  addComment(): void {
    if (!this.approval || !this.newCommentText.trim()) return;

    this.approvalService.addComment(this.approval.id, this.newCommentText, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.approval = updated;
          this.newCommentText = '';
        },
        error: (err) => {
          console.error('Error adding comment:', err);
        }
      });
  }

  goBack(): void {
    this.router.navigate(['/admin/sales/commerce/requests']);
  }

  getStatusClass(status: ApprovalStatus): string {
    const classes = {
      'DRAFT': 'status-draft',
      'PENDING': 'status-pending',
      'IN_APPROVAL': 'status-in-approval',
      'APPROVED': 'status-approved',
      'REJECTED': 'status-rejected',
      'CANCELLED': 'status-cancelled',
      'EXPIRED': 'status-expired'
    };
    return classes[status] || 'status-pending';
  }

  getStatusLabel(status: ApprovalStatus): string {
    const labels = {
      'DRAFT': 'Draft',
      'PENDING': 'Pending',
      'IN_APPROVAL': 'In Approval',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'CANCELLED': 'Cancelled',
      'EXPIRED': 'Expired'
    };
    return labels[status];
  }

  getUrgencyClass(urgency: string): string {
    const classes = {
      'LOW': 'urgency-low',
      'MEDIUM': 'urgency-medium',
      'HIGH': 'urgency-high',
      'URGENT': 'urgency-urgent'
    };
    return `urgency-badge ${classes[urgency as keyof typeof classes] || 'urgency-medium'}`;
  }

  getUrgencyLabel(urgency: string): string {
    return urgency.charAt(0) + urgency.slice(1).toLowerCase();
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  getApprovalProgress(): number {
    if (!this.approval) return 0;
    const total = this.approval.approvals.filter(a => a.required).length;
    const completed = this.approval.approvals.filter(a => a.status === 'APPROVED' && a.required).length;
    return total > 0 ? (completed / total) * 100 : 0;
  }
}
