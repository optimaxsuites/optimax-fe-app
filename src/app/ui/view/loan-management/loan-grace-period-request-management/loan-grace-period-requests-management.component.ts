import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { switchMap } from 'rxjs/operators';
import { AdvanceGracePeriodService } from '../../../service/loan/loan-grace-period.service';
import type { GracePeriodRequest } from '../../../service/loan/loan-grace-period.service';
import { formatAdvancedLoanCode,
  toLocalDateString
} from '../../../service/loan/loan-display.util';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanRepaymentService, findAppliedGracePeriodInstallment } from '../../../service/loan/loan-repayment.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { getPaymentTypeLabel, getPaymentTypeTone } from '../../../service/loan/loan-payment-types';

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Component({
  selector: 'app-loan-grace-period-requests-management',
  templateUrl: './loan-grace-period-requests-management.component.html',
  styleUrls: ['./loan-grace-period-requests-management.component.scss']
})
export class LoanGracePeriodRequestsManagementComponent implements OnInit {
  requests: GracePeriodRequest[] = [];
  filteredRequests: GracePeriodRequest[] = [];
  paginatedRequests: GracePeriodRequest[] = [];
  isLoading = false;
  messages: Message[] = [];
  selectedRequest: GracePeriodRequest | null = null;
  showApprovalModal = false;
  showRejectModal = false;
  showDetailsModal = false;
  approvedDays: number = 0;
  reviewNote: string = '';
  rejectionReason: string = '';
  selectedInstallmentDueDate: string | null = null;
  /** Set when an earlier approval attempt already moved this request's installment. */
  alreadyAppliedDueDate: string | null = null;
  isSubmitting = false;
  private messageTimer?: ReturnType<typeof setTimeout>;
  
  searchTerm: string = '';
  statusFilter: string = '';
  sortField: string = 'requestedAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  
  statusOptions = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Expired', value: 'EXPIRED' }
  ];

  constructor(
    private location: Location,
    private router: Router,
    private gracePeriodService: AdvanceGracePeriodService,
    private loanApplicationService: LoanApplicationService,
    private loanRepaymentService: LoanRepaymentService,
    private employeeLoanService: EmployeeLoanService,
    private mailNotificationService: MailNotificationService
  ) {}

  ngOnInit(): void {
    this.loadRequests();
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }

  loadRequests(): void {
    this.isLoading = true;
    this.gracePeriodService.getAllRequests().subscribe({
      next: (requests: GracePeriodRequest[]) => {
        // Convert array-formatted requestedAt to ISO string
        const normalized = requests.map((r: GracePeriodRequest) => {
          let requestedAt = r.requestedAt;
          if (Array.isArray(requestedAt)) {
            // JS months are 0-based, backend is likely 1-based, so subtract 1 from month
            const [year, month, day, hour, min, sec, ms] = requestedAt;
            requestedAt = new Date(year, month - 1, day, hour, min, sec, Math.floor(ms / 1000000)).toISOString();
          }
          return { ...r, requestedAt };
        });
        this.requests = normalized;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading grace period requests:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Load Failed',
          detail: 'Failed to load grace period requests. Please try again.'
        }];
        this.isLoading = false;
        
        setTimeout(() => {
          this.messages = [];
        }, 5000);
      }
    });
  }

  applyFilter(): void {
    let results = [...this.requests];
    
    if (this.statusFilter) {
      results = results.filter(r => r.status === this.statusFilter);
    }
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      results = results.filter(r => 
        String(r.loanId).toLowerCase().includes(term) ||
        (r.reason && r.reason.toLowerCase().includes(term)) ||
        this.getEmployeeName(r).toLowerCase().includes(term)
      );
    }
    
    this.filteredRequests = this.sortData(results);
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredRequests.length / this.pageSize));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedRequests = this.filteredRequests.slice(startIndex, endIndex);
  }

  sortData(data: GracePeriodRequest[]): GracePeriodRequest[] {
    return [...data].sort((a, b) => {
      let valueA: any = a[this.sortField as keyof GracePeriodRequest];
      let valueB: any = b[this.sortField as keyof GracePeriodRequest];
      
      if (this.sortField === 'requestedAt') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }
      
      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilter();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
    this.updatePagination();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  getCountByStatus(status: string): number {
    return this.requests.filter(r => r.status === status).length;
  }

  getEmployeeName(request: GracePeriodRequest): string {
    if ((request as any).employeeName) return (request as any).employeeName;
    if ((request as any).employee?.fullName) return (request as any).employee.fullName;
    return `Employee ${request.employeeId}`;
  }

  getReviewerName(reviewer: any): string {
    if (typeof reviewer === 'object' && reviewer !== null) {
      return reviewer.fullname || reviewer.username || 'Unknown';
    }
    return 'Admin';
  }

  formatPaymentType(paymentSubtype: string): string {
    return getPaymentTypeLabel(paymentSubtype);
  }

  getPaymentTypeClass(paymentSubtype: string): string {
    return getPaymentTypeTone(paymentSubtype);
  }

  formatDate(date: string | undefined | null): string {
    if (!date) return 'N/A';
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      case 'EXPIRED': return 'status-expired';
      default: return '';
    }
  }

  formatStatus(status: string): string {
    if (!status) return '';
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  getNewDueDate(): string {
    // A previous attempt already moved the due date; show that date rather than adding days again.
    if (this.alreadyAppliedDueDate) {
      return toLocalDateString(new Date(this.alreadyAppliedDueDate));
    }
    const baseDueDate = this.getSelectedInstallmentDueDate();
    if (!baseDueDate) return '';

    const recalculatedDueDate = new Date(baseDueDate);
    recalculatedDueDate.setDate(recalculatedDueDate.getDate() + this.approvedDays);
    return toLocalDateString(recalculatedDueDate);
  }

  openApprovalModal(request: GracePeriodRequest): void {
    this.selectedRequest = request;
    this.approvedDays = request.requestedDays;
    this.reviewNote = '';
    this.selectedInstallmentDueDate = null;
    this.alreadyAppliedDueDate = null;
    this.showApprovalModal = true;

    this.loanApplicationService.getApplicationById(String(request.loanId)).subscribe({
      next: (loan) => {
        if (!loan) {
          return;
        }

        // An earlier approval attempt may have updated the loan but failed to record the approval.
        const appliedInstallment = request.id ? findAppliedGracePeriodInstallment(loan, request.id) : undefined;
        if (appliedInstallment) {
          this.alreadyAppliedDueDate = this.normalizeDateValue(appliedInstallment.dueDate) || null;
          this.approvedDays = Number(request.approvedGraceDays || request.requestedDays || this.approvedDays);
        }

        const matchingInstallment = [...(loan.repaymentSchedule || [])]
          .sort((left, right) => left.installmentNo - right.installmentNo)
          .find((item) => item.installmentNo === Number(request.installmentNumber));

        this.selectedInstallmentDueDate = this.normalizeDateValue(matchingInstallment?.dueDate) || null;
      },
      error: (error) => {
        console.error('Error loading installment due date for grace period approval:', error);
        this.selectedInstallmentDueDate = null;
      }
    });
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedRequest = null;
    this.approvedDays = 0;
    this.reviewNote = '';
    this.selectedInstallmentDueDate = null;
    this.alreadyAppliedDueDate = null;
  }

  formatLoanCode(raw: string | number | undefined | null): string {
    return formatAdvancedLoanCode(raw);
  }

  /**
   * Two writes, ordered so a failure is always retryable: first move the loan's due date (idempotent
   * per request), then mark the request APPROVED. If the second write fails the request stays PENDING
   * and approving again just finishes it, without moving the due date a second time.
   */
  approveRequest(): void {
    if (this.isSubmitting) {
      return;
    }
    if (!this.selectedRequest || !this.selectedRequest.loanId || !this.selectedRequest.id) {
      this.showActionMessage('error', 'Approval Failed', 'Invalid request data.');
      return;
    }

    if (!this.alreadyAppliedDueDate && (this.approvedDays < 1 || this.approvedDays > 60)) {
      this.showActionMessage('error', 'Invalid Days', 'Approved grace days must be between 1 and 60.');
      return;
    }

    const installmentDueDate = this.alreadyAppliedDueDate || this.getSelectedInstallmentDueDate();
    if (!installmentDueDate) {
      this.showActionMessage('error', 'Approval Failed', 'Unable to resolve the installment due date for this request.');
      return;
    }

    const newDueDate = new Date(installmentDueDate);
    if (!this.alreadyAppliedDueDate) {
      newDueDate.setDate(newDueDate.getDate() + this.approvedDays);
    }
    const newDueDateIso = newDueDate.toISOString();

    const request = { ...this.selectedRequest };
    const approvedDays = this.approvedDays;
    const reviewNote = this.reviewNote;
    const installmentNumber = request.installmentNumber;
    let loanUpdated = false;

    this.isSubmitting = true;
    this.loanRepaymentService.applyApprovedGracePeriod({
      loanId: Number(request.loanId),
      installmentNumber: Number(installmentNumber),
      newDueDate: newDueDateIso,
      approvedGraceDays: approvedDays,
      reviewNote: reviewNote || `Grace period of ${approvedDays} days approved for installment ${installmentNumber}`,
      requestId: request.id
    }).pipe(
      switchMap(() => {
        loanUpdated = true;
        return this.gracePeriodService.approveRequest(request.id!, approvedDays, newDueDateIso, reviewNote);
      })
    ).subscribe({
      next: (approvedRequest: GracePeriodRequest) => {
        this.isSubmitting = false;
        this.showActionMessage('success', 'Request Approved', `Grace period of ${approvedDays} days approved for installment ${installmentNumber}. New due date: ${this.formatDate(newDueDateIso)}.`);
        this.closeApprovalModal();
        this.loadRequests();
        this.sendEmailNotification(approvedRequest, 'approved');
      },
      error: (error: any) => {
        this.isSubmitting = false;
        console.error('Error approving request:', error);
        if (loanUpdated) {
          // The loan is extended but the request is still PENDING: keep it actionable.
          this.showActionMessage(
            'warn',
            'Approval Not Finished',
            `The installment's due date was moved to ${this.formatDate(newDueDateIso)}, but the request couldn't be marked approved. `
              + 'Open it and click Approve again to finish. The due date won\'t be moved twice.',
            true
          );
          this.closeApprovalModal();
          this.loadRequests();
          return;
        }
        this.showActionMessage('error', 'Approval Failed', `${error?.message || 'Failed to approve grace period request.'} Nothing was changed; please try again.`);
      }
    });
  }

  openRejectModal(request: GracePeriodRequest): void {
    this.selectedRequest = request;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedRequest = null;
    this.rejectionReason = '';
  }

  rejectRequest(): void {
    if (!this.selectedRequest) {
      this.messages = [{
        severity: 'error',
        summary: 'Rejection Failed',
        detail: 'Invalid request data.'
      }];
      return;
    }

    if (!this.rejectionReason.trim()) {
      this.messages = [{
        severity: 'error',
        summary: 'Reason Required',
        detail: 'Please provide a reason for rejection.'
      }];
      return;
    }

    const originalRequest = { ...this.selectedRequest };

    this.gracePeriodService.rejectRequest(
      this.selectedRequest.id!,
      this.rejectionReason,
      this.rejectionReason
    ).subscribe({
      next: (rejectedRequest: GracePeriodRequest) => {
        this.messages = [{
          severity: 'success',
          summary: 'Request Rejected',
          detail: `Grace period request for loan ${originalRequest.loanId}, installment ${originalRequest.installmentNumber} has been rejected.`
        }];
        this.closeRejectModal();
        this.loadRequests();
        this.sendEmailNotification(rejectedRequest, 'rejected');
        
        setTimeout(() => {
          this.messages = [];
        }, 5000);
      },
      error: (error: any) => {
        console.error('Error rejecting request:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Rejection Failed',
          detail: error.message || 'Failed to reject grace period request. Please try again.'
        }];
        
        setTimeout(() => {
          this.messages = [];
        }, 5000);
      }
    });
  }

  viewRequestDetails(request: GracePeriodRequest): void {
    this.selectedRequest = request;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedRequest = null;
  }

  /**
   * Emails the employee about the decision. Best effort: the decision is already saved, so a mail
   * failure only shows a warning rather than undoing anything.
   */
  private sendEmailNotification(request: GracePeriodRequest, status: 'approved' | 'rejected'): void {
    if (!request?.employeeId) {
      return;
    }

    this.employeeLoanService.getEmployeeById(Number(request.employeeId)).pipe(
      switchMap((response: any) => {
        const employee = response?.data || response;
        const email = String(employee?.email || employee?.workEmail || '').trim();
        if (!email) {
          throw new Error('No email address on file for this employee.');
        }
        const name = `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || employee?.fullName || 'there';
        return this.mailNotificationService.sendMail({
          name,
          recieverEmail: email,
          subject: status === 'approved' ? 'Your payment extension request was approved' : 'Your payment extension request was declined',
          body: this.buildDecisionEmailBody(request, status, name)
        });
      })
    ).subscribe({
      error: (error) => {
        console.error('Failed to send grace period decision email:', error);
        this.showActionMessage('warn', 'Email Not Sent', `The decision was saved, but the employee couldn't be emailed: ${error?.message || 'mail service unavailable'}.`, true);
      }
    });
  }

  private buildDecisionEmailBody(request: GracePeriodRequest, status: 'approved' | 'rejected', name: string): string {
    const loanCode = escapeHtml(this.formatLoanCode(request.loanId));
    const installment = escapeHtml(String(request.installmentNumber || ''));
    const decision = status === 'approved'
      ? `<p>Your request for more time on installment ${installment} of loan ${loanCode} has been <strong>approved</strong>`
        + ` for ${escapeHtml(String(request.approvedGraceDays || request.requestedDays || ''))} day(s).`
        + (request.newDueDate ? ` The new due date is <strong>${escapeHtml(this.formatDate(request.newDueDate))}</strong>.` : '')
        + '</p>'
      : `<p>Your request for more time on installment ${installment} of loan ${loanCode} has been <strong>declined</strong>.</p>`
        + (request.rejectionReason ? `<p>Reason: ${escapeHtml(request.rejectionReason)}</p>` : '');
    const note = request.reviewNote && request.reviewNote !== request.rejectionReason
      ? `<p>Note from HR: ${escapeHtml(request.reviewNote)}</p>`
      : '';
    return `<div style="font-family: Arial, sans-serif; color: #1a4b5c;">`
      + `<p>Hello ${escapeHtml(name)},</p>${decision}${note}`
      + '<p>You can see the details in <strong>My Loans</strong>.</p>'
      + '<p>Regards,<br/><strong>HR</strong></p></div>';
  }

  /** Shows a page message; transient ones clear after 5s, `persist` ones stay until replaced. */
  private showActionMessage(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string, persist = false): void {
    clearTimeout(this.messageTimer);
    this.messages = [{ severity, summary, detail }];
    if (!persist) {
      this.messageTimer = setTimeout(() => { this.messages = []; }, 5000);
    }
  }

  private getSelectedInstallmentDueDate(): string | null {
    return this.normalizeDateValue(this.selectedInstallmentDueDate);
  }

  private normalizeDateValue(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    if (Array.isArray(value) && value.length >= 3) {
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = value as number[];
      const parsed = new Date(year, month - 1, day, hour, minute, second, Math.floor(Number(nanoseconds || 0) / 1000000));
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }

    return null;
  }
}