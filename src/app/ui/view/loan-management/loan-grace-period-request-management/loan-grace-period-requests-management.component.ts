import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { switchMap } from 'rxjs/operators';
import { AdvanceGracePeriodService, GracePeriodRequest } from '../../../service/loan/loan-grace-period.service';
import { LoanApplicationService } from '../../../service/loan/loan-application.service';
import { LoanRepaymentService } from '../../../service/loan/loan-repayment.service';

@Component({
  selector: 'app-loan-grace-period-request',
  templateUrl: './loan-grace-period-requests-management.component.html',
  styleUrls: ['./loan-grace-period-requests-management.component.scss']
})
export class LoanGracePeriodRequestsManagementComponent implements OnInit {
  requests: GracePeriodRequest[] = [];
  filteredRequests: GracePeriodRequest[] = [];
  isLoading = false;
  messages: Message[] = [];
  selectedRequest: GracePeriodRequest | null = null;
  showApprovalModal = false;
  showRejectModal = false;
  showDetailsModal = false;
  approvedDays: number = 0;
  reviewNote: string = '';
  rejectionReason: string = '';
  
  searchTerm: string = '';
  statusFilter: string = '';
  sortField: string = 'requestedAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  
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
      next: (requests) => {
        this.requests = requests;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading grace period requests:', error);
        this.isLoading = false;
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
        (r.reason && r.reason.toLowerCase().includes(term))
      );
    }
    
    this.filteredRequests = this.sortData(results);
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

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-NG', {
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

  getNewDueDate(): string {
    if (!this.selectedRequest) return '';
    const currentDueDate = new Date(this.selectedRequest.requestedAt);
    currentDueDate.setDate(currentDueDate.getDate() + this.approvedDays);
    return currentDueDate.toISOString().split('T')[0];
  }

  openApprovalModal(request: GracePeriodRequest): void {
    this.selectedRequest = request;
    this.approvedDays = request.requestedDays;
    this.reviewNote = '';
    this.showApprovalModal = true;
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedRequest = null;
  }

  approveRequest(): void {
    if (!this.selectedRequest || !this.selectedRequest.loanId) return;

    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + this.approvedDays);

    this.gracePeriodService.approveRequest(
      this.selectedRequest.id!,
      this.approvedDays,
      newDueDate.toISOString(),
      this.reviewNote
    ).pipe(
      switchMap((approvedRequest) => this.loanRepaymentService.applyApprovedGracePeriod({
        loanId: Number(approvedRequest.loanId),
        installmentNumber: Number(approvedRequest.installmentNumber),
        newDueDate: approvedRequest.newDueDate || newDueDate.toISOString(),
        approvedGraceDays: approvedRequest.approvedGraceDays || this.approvedDays,
        reviewNote: this.reviewNote || approvedRequest.reviewNote
      }))
    ).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Request Approved',
          detail: `Grace period of ${this.approvedDays} days approved. Loan moved to skipped status.`
        }];
        const approvedRequest = this.selectedRequest;
        this.closeApprovalModal();
        this.loadRequests();
        if (approvedRequest) {
          this.sendEmailNotification(approvedRequest, 'approved');
        }
      },
      error: (error) => {
        console.error('Error approving request:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Approval Failed',
          detail: 'Failed to approve grace period request.'
        }];
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
  }

  rejectRequest(): void {
    if (!this.selectedRequest || !this.rejectionReason.trim()) return;

    this.gracePeriodService.rejectRequest(
      this.selectedRequest.id!,
      this.rejectionReason,
      this.rejectionReason
    ).subscribe({
      next: () => {
        this.messages = [{
          severity: 'success',
          summary: 'Request Rejected',
          detail: 'Grace period request rejected.'
        }];
        const rejectedRequest = this.selectedRequest;
        this.closeRejectModal();
        this.loadRequests();
        if (rejectedRequest) {
          this.sendEmailNotification(rejectedRequest, 'rejected');
        }
      },
      error: (error) => {
        console.error('Error rejecting request:', error);
        this.messages = [{
          severity: 'error',
          summary: 'Rejection Failed',
          detail: 'Failed to reject grace period request.'
        }];
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
    console.log(`Sending ${status} email notification for grace period request ${request.id}`);
    // Implement actual email sending logic here
  }
}