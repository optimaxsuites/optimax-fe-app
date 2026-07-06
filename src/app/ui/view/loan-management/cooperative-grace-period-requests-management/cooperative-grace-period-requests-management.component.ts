import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeLoanGracePeriodRequest } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-grace-period-requests-management',
  templateUrl: './cooperative-grace-period-requests-management.component.html',
  styleUrls: ['./cooperative-grace-period-requests-management.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CooperativeGracePeriodRequestsManagementComponent implements OnInit {
  currentUuid = uuidV4();
  requests: CooperativeLoanGracePeriodRequest[] = [];
  filteredRequests: CooperativeLoanGracePeriodRequest[] = [];
  paginatedRequests: CooperativeLoanGracePeriodRequest[] = [];
  members: CooperativeMember[] = [];
  isLoading = false;
  messages: Message[] = [];
  searchTerm = '';
  statusFilter = '';
  sortField = 'requestedAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  selectedRequest: CooperativeLoanGracePeriodRequest | null = null;
  showApprovalModal = false;
  showRejectModal = false;
  showDetailsModal = false;
  approvedDays = 0;
  reviewNote = '';
  rejectionReason = '';

  statusOptions = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Expired', value: 'EXPIRED' }
  ];


  constructor(
    private readonly location: Location,
    private readonly cooperativeService: CooperativeService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    this.cooperativeService.loadGracePeriodRequests().subscribe({
      next: (requests) => {
        this.requests = requests.map((request) => ({
          ...request,
          requestedAt: this.normalizeDateValue(request.requestedAt),
          reviewedAt: request.reviewedAt ? this.normalizeDateValue(request.reviewedAt) : undefined,
          newDueDate: request.newDueDate ? this.normalizeDateValue(request.newDueDate) : undefined
        }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.messages = [{ severity: 'error', summary: 'Load Failed', detail: 'Unable to load cooperative grace period requests.' }];
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let results = [...this.requests];

    if (this.statusFilter) {
      results = results.filter((request) => request.status === this.statusFilter);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.trim().toLowerCase();
      results = results.filter((request) =>
        [
          String(request.id || ''),
          String(request.loanId || ''),
          this.getMemberName(request),
          this.formatPaymentType(request.paymentSubtype),
          request.reason,
          request.status
        ].some((value) => String(value || '').toLowerCase().includes(term))
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

  sortData(data: CooperativeLoanGracePeriodRequest[]): CooperativeLoanGracePeriodRequest[] {
    return [...data].sort((left, right) => {
      let valueA: string | number = '';
      let valueB: string | number = '';

      switch (this.sortField) {
        case 'id':
        case 'loanId':
        case 'installmentNumber':
        case 'requestedDays':
          valueA = Number(left[this.sortField as keyof CooperativeLoanGracePeriodRequest] || 0);
          valueB = Number(right[this.sortField as keyof CooperativeLoanGracePeriodRequest] || 0);
          break;
        case 'paymentSubtype':
          valueA = this.formatPaymentType(left.paymentSubtype).toLowerCase();
          valueB = this.formatPaymentType(right.paymentSubtype).toLowerCase();
          break;
        case 'status':
          valueA = String(left.status || '').toLowerCase();
          valueB = String(right.status || '').toLowerCase();
          break;
        case 'requestedAt':
        default:
          valueA = new Date(left.requestedAt || '').getTime();
          valueB = new Date(right.requestedAt || '').getTime();
          break;
      }

      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = field === 'requestedAt' ? 'desc' : 'asc';
    }

    this.applyFilters();
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
    return this.requests.filter((request) => request.status === status).length;
  }

  openApprovalModal(request: CooperativeLoanGracePeriodRequest): void {
    this.selectedRequest = request;
    this.approvedDays = Number(request.requestedDays || 0);
    this.reviewNote = '';
    this.showApprovalModal = true;
  }

  // Request modal logic removed for admin UI parity with advanced loan grace period requests
  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedRequest = null;
    this.rejectionReason = '';
  }

  rejectRequest(): void {
    if (!this.selectedRequest || !this.rejectionReason.trim()) {
      return;
    }
    this.cooperativeService.rejectGracePeriodRequest(this.selectedRequest, this.rejectionReason.trim()).subscribe({
      next: () => {
        this.messages = [{ severity: 'success', summary: 'Request Rejected', detail: 'Cooperative grace period request rejected.' }];
        this.closeRejectModal();
        this.loadRequests();
      },
      error: () => {
        this.messages = [{ severity: 'error', summary: 'Submission Failed', detail: 'Unable to submit your request.' }];
      }
    });
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.selectedRequest = null;
    this.reviewNote = '';
  }

  approveRequest(): void {
    if (!this.selectedRequest || this.approvedDays <= 0) {
      return;
    }
    this.cooperativeService.approveGracePeriodRequest(this.selectedRequest, this.approvedDays, this.reviewNote.trim()).subscribe({
      next: () => {
        this.messages = [{ severity: 'success', summary: 'Request Approved', detail: 'Cooperative grace period approved and repayment due date updated.' }];
        this.closeApprovalModal();
        this.loadRequests();
      },
      error: () => {
        this.messages = [{ severity: 'error', summary: 'Approval Failed', detail: 'Unable to approve this cooperative grace period request.' }];
      }
    });
  }

  openRejectModal(request: CooperativeLoanGracePeriodRequest): void {
    this.selectedRequest = request;
    this.rejectionReason = '';
    this.showRejectModal = true;
  }

  viewRequestDetails(request: CooperativeLoanGracePeriodRequest): void {
    this.selectedRequest = request;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedRequest = null;
  }

  getMemberName(request: CooperativeLoanGracePeriodRequest): string {
    const member = this.members.find((entry) => entry.id === Number(request.memberId) || entry.memberId === Number(request.memberId));
    return member?.fullName || `Member ${request.memberId}`;
  }

  getReviewerName(reviewer: number | { fullname?: string; username?: string } | undefined): string {
    if (!reviewer) return 'Admin';
    if (typeof reviewer === 'object') {
      return reviewer.fullname || reviewer.username || 'Admin';
    }
    return `Admin ${reviewer}`;
  }

  formatPaymentType(paymentSubtype: string): string {
    switch (paymentSubtype) {
      case 'CONTRIBUTION': return 'Contribution';
      case 'PRINCIPAL_REPAYMENT': return 'Principal Payment';
      case 'INTEREST_PAYMENT': return 'Interest Payment';
      case 'LATE_FEE': return 'Late Fee';
      default: return paymentSubtype;
    }
  }

  getPaymentTypeClass(paymentSubtype: string): string {
    switch (paymentSubtype) {
      case 'CONTRIBUTION': return 'contribution';
      case 'PRINCIPAL_REPAYMENT': return 'principal';
      case 'INTEREST_PAYMENT': return 'interest';
      case 'LATE_FEE': return 'late-fee';
      default: return '';
    }
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  formatStatus(status: string): string {
    if (!status) return '';
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  formatDate(date: string | undefined | null): string {
    if (!date) return 'N/A';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getNewDueDate(): string {
    if (!this.selectedRequest?.newDueDate) return '';
    const parsed = new Date(this.selectedRequest.newDueDate);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
  }

  formatLoanCode(raw: string | number | undefined | null): string {
    const value = String(raw || '').trim();
    return value || 'N/A';
  }

  private normalizeDateValue(value: string | undefined | null): string {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }
}