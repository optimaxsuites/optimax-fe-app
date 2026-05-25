import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
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

  // Filter options
  statusFilter: RequestStatus | null = null;
  fieldTypeFilter: FieldChangeType | null = null;

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
    private fb: FormBuilder
  ) {
    this.rejectionForm = this.fb.group({
      rejectionReason: ['', [Validators.required, Validators.minLength(5)]],
    });
  }

  ngOnInit(): void {
    this.loadRequests();

    console.log(this.requests);


    this.profileChangeRequestService.requests$
      .pipe(takeUntil(this.destroy$))
      .subscribe((requests) => {
        this.requests = requests;
        this.applyFilters();
      });

      const userRegData = JSON.parse(localStorage.getItem('userRegData') || '{}');
      console.log("userReg", userRegData)
      this.userIsAdmin = userRegData && userRegData.roles[0] ? userRegData.roles[0] === 'ROLE_ADMIN': false;
      console.log(this.userIsAdmin)
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
            key: 'global',
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
    console.log(this.currentUserId)
    filtered = filtered.filter((r) => {
      console.log(r)
      if (!r?.employeeId) return false;
      return String(r.employeeUserId) === String(this.currentUserId);
    });
  }

  this.filteredRequests = filtered;
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
    
    // Checks that value exists, is not null/undefined, and is not just whitespace
    const hasNewValue = change.value !== null && 
                        change.value !== undefined && 
                        change.value.toString().trim() !== '';

    return isNotId && hasNewValue;
  }) || [];
}
}
