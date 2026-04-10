import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeLoanGracePeriodRequest } from '../../../domain/loan/cooperative-loan.dto';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';

@Component({
  selector: 'app-cooperative-grace-period-requests-management',
  templateUrl: './cooperative-grace-period-requests-management.component.html',
  styleUrls: ['./cooperative-grace-period-requests-management.component.scss']
})
export class CooperativeGracePeriodRequestsManagementComponent implements OnInit {
  currentUuid = uuidV4();
  requests: CooperativeLoanGracePeriodRequest[] = [];
  filteredRequests: CooperativeLoanGracePeriodRequest[] = [];
  isLoading = false;
  messages: Message[] = [];
  searchTerm = '';
  statusFilter = '';
  selectedRequest: CooperativeLoanGracePeriodRequest | null = null;
  showApprovalModal = false;
  showRejectModal = false;
  approvedDays = 0;
  reviewNote = '';
  rejectionReason = '';

  constructor(
    private readonly cooperativeService: CooperativeService,
    private readonly backNavigationService: BackNavigationService,
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
        this.requests = requests.sort((left, right) => new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime());
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
    const search = this.searchTerm.trim().toLowerCase();
    this.filteredRequests = this.requests.filter((request) => {
      const matchesStatus = !this.statusFilter || request.status === this.statusFilter;
      const matchesSearch = !search || [
        String(request.loanId),
        this.formatPaymentType(request.paymentSubtype),
        request.reason,
        request.status
      ].some((value) => String(value || '').toLowerCase().includes(search));

      return matchesStatus && matchesSearch;
    });
  }

  openApprovalModal(request: CooperativeLoanGracePeriodRequest): void {
    this.selectedRequest = request;
    this.approvedDays = Number(request.requestedDays || 0);
    this.reviewNote = '';
    this.showApprovalModal = true;
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
        this.messages = [{ severity: 'error', summary: 'Rejection Failed', detail: 'Unable to reject this cooperative grace period request.' }];
      }
    });
  }

  formatPaymentType(paymentSubtype: string): string {
    switch (paymentSubtype) {
      case 'CONTRIBUTION': return 'Contribution';
      case 'PRINCIPAL_REPAYMENT': return 'Principal';
      case 'INTEREST_PAYMENT': return 'Interest';
      case 'LATE_FEE': return 'Late Fee';
      default: return paymentSubtype;
    }
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  goBack(): void {
    this.backNavigationService.goBack(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }
}