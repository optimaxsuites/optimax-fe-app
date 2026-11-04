import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProfileChangeRequestService } from '../../service/profile-change-request.service';
import {
  ProfileChangeRequestDTO,
  RequestStatus,
  FieldChangeType,
} from '../../model/profile-change-request.model';

@Component({
  selector: 'app-profile-change-requests',
  templateUrl: './profile-change-requests.component.html',
  styleUrl: './profile-change-requests.component.scss',
  providers: [ConfirmationService],
})
export class ProfileChangeRequestsComponent implements OnInit, OnDestroy {
  requests: ProfileChangeRequestDTO[] = [];
  filteredRequests: ProfileChangeRequestDTO[] = [];
  loading = false;
  isProcessingRequest = false;
  selectedRequest: ProfileChangeRequestDTO | null = null;
  showRejectionDialog = false;
  rejectionForm: FormGroup;
  isDetailModalOpen = false;
  private destroy$ = new Subject<void>();

  // Filter / search / pagination
  statusFilter: RequestStatus | null = 'pending';
  fieldTypeFilter: FieldChangeType | null = null;
  searchQuery = '';
  currentPage = 1;
  readonly pageSize = 10;

  statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
  ];

  fieldTypeOptions = [
    { label: 'All Fields', value: null },
    { label: 'Bank', value: 'bank' },
    { label: 'Emergency Contact', value: 'emergency_contact' },
    { label: 'Address', value: 'address' },
    { label: 'Phone', value: 'phone' },
    { label: 'Email', value: 'email' },
    { label: 'NOK', value: 'NOK' },
    { label: 'Guarantor', value: 'guarantor' },
  ];

  currentUserId: string = localStorage.getItem('userid') || '';
  userIsAdmin: boolean = false

  constructor(
    private profileChangeRequestService: ProfileChangeRequestService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.rejectionForm = this.fb.group({
      rejectionReason: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  ngOnInit(): void {
    this.loadRequests();



    this.profileChangeRequestService.requests$
      .pipe(takeUntil(this.destroy$))
      .subscribe((requests) => {
        this.requests = requests;
        this.applyFilters();
      });

      const userRegData = JSON.parse(localStorage.getItem('userRegData') || '{}');
      this.userIsAdmin = userRegData && userRegData.roles[0] ? userRegData.roles[0] === 'ROLE_ADMIN': false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRequests(): void {
    this.loading = true;
    this.profileChangeRequestService.getProfileChangeRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.requests = requests;
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading requests:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Load Failed',
            detail: 'Unable to load profile change requests',
            key: 'tl',
          });
          this.loading = false;
        },
      });
  }

  applyFilters(): void {
    let filtered = [...(this.requests || [])];

    if (this.statusFilter) {
      filtered = filtered.filter((r) => r?.status === this.statusFilter);
    }

    if (this.fieldTypeFilter) {
      filtered = filtered.filter((r) => r?.fieldChangeType === this.fieldTypeFilter);
    }

    if (this.currentUserId && !this.userIsAdmin) {
      filtered = filtered.filter((r) => {
        if (!r?.employeeId) return false;
        return String(r.employeeUserId) === String(this.currentUserId);
      });
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((r) =>
        (r.employeeName || '').toLowerCase().includes(q) ||
        (r.fieldChangeType || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        this.getFieldDisplayValue(r).toLowerCase().includes(q)
      );
    }

    this.filteredRequests = filtered;
    this.currentPage = 1;
  }

  viewDetails(request: ProfileChangeRequestDTO): void {
    this.selectedRequest = request;
    this.isDetailModalOpen = true;
  }

  closeDetails(): void {
    this.selectedRequest = null;
    this.isDetailModalOpen = false;
  }

  approveRequest(request: ProfileChangeRequestDTO): void {
    this.isProcessingRequest = true;
    const currentUser = this.getCurrentUser();

    const idField = request.request.find(change => change.fieldName.toLowerCase() === 'id')?.value || request.request.find(change => change.fieldName.toLowerCase() === 'id')?.oldValue || null;

    const requestData = {
      id: idField,
      type: request.requestType,
      fieldType: request.fieldChangeType,
    }

    this.profileChangeRequestService
      .approveProfileChangeRequest(request.id!, currentUser, requestData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Approved',
            detail: `Request from ${request.employeeName} has been approved.`,
            key: 'tl',
          });
          this.isDetailModalOpen = false;
          this.isProcessingRequest = false;
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error approving request:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Approval Failed',
            detail: 'Unable to approve the request',
            key: 'tl',
          });
          this.isProcessingRequest = false;
        },
      });
  }

  deleteRequest(request: ProfileChangeRequestDTO): void {
    this.confirmationService.confirm({
      key: 'deleteRequest',
      header: 'Delete request',
      message: `Delete this request from ${request.employeeName}? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeDeleteRequest(request),
    });
  }

  private executeDeleteRequest(request: ProfileChangeRequestDTO): void {
    this.isProcessingRequest = true;
    this.profileChangeRequestService.deleteProfileChangeRequest(request.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'warn',
            summary: 'Deleted',
            detail: `Request from ${request.employeeName} has been deleted.`,
            key: 'tl',
          });
          this.requests = this.requests.filter(r => String(r.id) !== String(request.id));
          this.applyFilters();
          this.isDetailModalOpen = false;
          this.isProcessingRequest = false;
        },
        error: (err) => {
          console.error('Error deleting request:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: 'Unable to delete this request.',
            key: 'tl',
          });
          this.isProcessingRequest = false;
        },
      });
  }

  openRejectionDialog(request: ProfileChangeRequestDTO): void {
    this.selectedRequest = request;
    this.rejectionForm.reset();
    this.showRejectionDialog = true;
  }

  closeRejectionDialog(): void {
    this.showRejectionDialog = false;
    this.selectedRequest = null;
    this.rejectionForm.reset();
  }

  submitRejection(): void {
    if (this.rejectionForm.invalid || !this.selectedRequest) {
      this.rejectionForm.markAllAsTouched();
      return;
    }

    this.isProcessingRequest = true;
    const reason = this.rejectionForm.get('rejectionReason')?.value;
    const currentUser = this.getCurrentUser();

    this.profileChangeRequestService
      .rejectProfileChangeRequest(this.selectedRequest.id!, reason, currentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'info',
            summary: 'Rejected',
            detail: `Request from ${this.selectedRequest?.employeeName} has been rejected.`,
            key: 'tl',
          });
          this.closeRejectionDialog();
          this.isProcessingRequest = false;
          this.applyFilters();
        },
        error: (error) => {
          console.error('Error rejecting request:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Rejection Failed',
            detail: 'Unable to reject the request',
            key: 'tl',
          });
          this.isProcessingRequest = false;
        },
      });
  }

  private getCurrentUser(): any {
    return {
      id: localStorage.getItem('userid') || 'unknown',
      name: localStorage.getItem('username') || 'HR Officer',
      email: localStorage.getItem('useremail') || 'hr@company.com',
    };
  }

  getFieldTypeLabel(fieldType: FieldChangeType): string {
    const map: Record<FieldChangeType, string> = {
      bank: 'Bank Details',
      emergency_contact: 'Emergency Contact',
      address: 'Address',
      phone: 'Phone',
      email: 'Email',
      NOK: 'Next of Kin',
      guarantor: 'Guarantor',
    };
    return map[fieldType] || fieldType;
  }

  getStatusSeverity(status: RequestStatus): string {
    const map: Record<RequestStatus, string> = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
    };
    return map[status];
  }

  formatDate(date: Date | string): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  getFieldDisplayValue(request: ProfileChangeRequestDTO): string {
    if (request.request.length === 1) {
      return `${request.request[0].fieldName}: ${request.request[0].oldValue} → ${request.request[0].value}`;
    }
    return `${request.request.length} fields changed`;
  }

  get filteredChanges() {
    return this.selectedRequest?.request?.filter(change => {
      const isNotId = change.fieldName.toLowerCase() !== 'id';
      const hasNewValue = change.value !== null &&
                          change.value !== undefined &&
                          change.value.toString().trim() !== '';
      return isNotId && hasNewValue;
    }) || [];
  }

  get pendingCount(): number {
    return this.requests.filter(r => r?.status === 'pending').length;
  }

  get approvedCount(): number {
    return this.requests.filter(r => r?.status === 'approved').length;
  }

  get rejectedCount(): number {
    return this.requests.filter(r => r?.status === 'rejected').length;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredRequests.length / this.pageSize) || 1;
  }

  get pagedRequests(): ProfileChangeRequestDTO[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRequests.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    const lo = Math.max(2, this.currentPage - 1);
    const hi = Math.min(total - 1, this.currentPage + 1);
    if (lo > 2) pages.push(-1);
    for (let i = lo; i <= hi; i++) pages.push(i);
    if (hi < total - 1) pages.push(-1);
    pages.push(total);
    return pages;
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  setStatusFilter(val: RequestStatus | null): void {
    this.statusFilter = val;
    this.applyFilters();
  }

  setFieldTypeFilter(val: FieldChangeType | null): void {
    this.fieldTypeFilter = val;
    this.applyFilters();
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
}
