import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeGracePeriodRequest } from '../../../domain/loan/cooperative-grace-period.dto';
import { CooperativeGracePeriodService } from '../../../service/loan/cooperative-grace-period.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';

@Component({
  selector: 'app-cooperative-grace-period-requests-management',
  templateUrl: './cooperative-grace-period-requests-management.component.html',
  styleUrls: ['./cooperative-grace-period-requests-management.component.scss']
})
export class CooperativeGracePeriodRequestsManagementComponent implements OnInit {
  currentUuid = uuidV4();
  requests: CooperativeGracePeriodRequest[] = [];
  filteredRequests: CooperativeGracePeriodRequest[] = [];
  isLoading = false;
  messages: Message[] = [];
  searchTerm = '';
  statusFilter = '';
  selectedRequest: CooperativeGracePeriodRequest | null = null;
  showApprovalModal = false;
  showRejectModal = false;
  approvedDays = 0;
  reviewNote = '';
  rejectionReason = '';
  minRequestableDays = 7;
  maxRequestableDays = 30;


  constructor(
    private readonly graceService: CooperativeGracePeriodService,
    private readonly backNavigationService: BackNavigationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private fb: FormBuilder
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
    this.graceService.getAllRequests().subscribe({
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

  openApprovalModal(request: CooperativeGracePeriodRequest): void {
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
    this.graceService.rejectRequest(
      this.selectedRequest.id!,
      this.rejectionReason.trim(),
      this.reviewNote.trim()
    ).subscribe({
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
    this.graceService.approveRequest(
      this.selectedRequest.id!,
      this.approvedDays,
      this.selectedRequest.newDueDate || '',
      this.reviewNote.trim()
    ).subscribe({
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

  openRejectModal(request: CooperativeGracePeriodRequest): void {
    this.selectedRequest = request;
    this.rejectionReason = '';
    this.showRejectModal = true;
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
    this.router.navigate(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }
}