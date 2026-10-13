import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { switchMap, map } from 'rxjs/operators';
import { AdvanceGracePeriodService } from '../../../service/loan/loan-grace-period.service';
import type { GracePeriodRequest } from '../../../service/loan/loan-grace-period.service';
import { formatAdvancedLoanCode,
  toLocalDateString
} from '../../../service/loan/loan-display.util';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanRepaymentService } from '../../../service/loan/loan-repayment.service';

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
    private loanRepaymentService: LoanRepaymentService
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
    switch(paymentSubtype) {
      case 'PRINCIPAL_REPAYMENT': return 'Principal Payment';
      case 'INTEREST_PAYMENT': return 'Interest Payment';
      case 'LATE_FEE': return 'Late Fee';
      default: return paymentSubtype;
    }
  }

  getPaymentTypeClass(paymentSubtype: string): string {
    switch(paymentSubtype) {
      case 'PRINCIPAL_REPAYMENT': return 'principal';
      case 'INTEREST_PAYMENT': return 'interest';
      case 'LATE_FEE': return 'late-fee';
      default: return '';
    }
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
    this.showApprovalModal = true;

    this.loanApplicationService.getApplicationById(String(request.loanId)).subscribe({
      next: (loan) => {
        if (!loan) {
          return;
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
  }

  formatLoanCode(raw: string | number | undefined | null): string {
    return formatAdvancedLoanCode(raw);
  }

  approveRequest(): void {
    if (!this.selectedRequest || !this.selectedRequest.loanId) {
      this.messages = [{
        severity: 'error',
        summary: 'Approval Failed',
        detail: 'Invalid request data.'
      }];
      return;
    }

    if (this.approvedDays < 1 || this.approvedDays > 60) {
      this.messages = [{
        severity: 'error',
        summary: 'Invalid Days',
        detail: 'Approved grace days must be between 1 and 60.'
      }];
      return;
    }

    const installmentDueDate = this.getSelectedInstallmentDueDate();
    if (!installmentDueDate) {
      this.messages = [{
        severity: 'error',
        summary: 'Approval Failed',
        detail: 'Unable to resolve the installment due date for this request.'
      }];
      return;
    }

    const newDueDate = new Date(installmentDueDate);
    newDueDate.setDate(newDueDate.getDate() + this.approvedDays);
    
    // Store the original request data before approval
    const originalRequest = { ...this.selectedRequest };
    const loanId = originalRequest.loanId;
    const installmentNumber = originalRequest.installmentNumber;

    this.gracePeriodService.approveRequest(
      this.selectedRequest.id!,
      this.approvedDays,
      newDueDate.toISOString(),
      this.reviewNote
    ).pipe(
      switchMap((approvedRequest: GracePeriodRequest) => {
        // Call the existing applyApprovedGracePeriod method with the expected payload structure
        return this.loanRepaymentService.applyApprovedGracePeriod({
          loanId: Number(loanId),
          installmentNumber: Number(installmentNumber),
          newDueDate: newDueDate.toISOString(),
          approvedGraceDays: this.approvedDays,
          reviewNote: this.reviewNote || `Grace period of ${this.approvedDays} days approved for installment ${installmentNumber}`
        }).pipe(
          map(() => approvedRequest)
        );
      })
    ).subscribe({
      next: (approvedRequest: GracePeriodRequest) => {
        this.messages = [{
          severity: 'success',
          summary: 'Request Approved',
          detail: `Grace period of ${this.approvedDays} days approved successfully for installment ${installmentNumber}.`
        }];
        this.closeApprovalModal();
        this.loadRequests();
        this.sendEmailNotification(approvedRequest, 'approved');
        
        setTimeout(() => {
          this.messages = [];
        }, 5000);
      },
      error: (error: any) => {
        console.error('Error approving request:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Approval Failed',
          detail: error.message || 'Failed to approve grace period request. Please try again.'
        }];
        
        setTimeout(() => {
          this.messages = [];
        }, 5000);
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

  private sendEmailNotification(request: GracePeriodRequest, status: string): void {
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