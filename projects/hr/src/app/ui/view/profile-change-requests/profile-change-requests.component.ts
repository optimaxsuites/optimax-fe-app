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
import { MailNotificationService } from '../../service/mailNotification.service';

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

  constructor(
    private profileChangeRequestService: ProfileChangeRequestService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private mailNotificationService: MailNotificationService
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
    let filtered = [...this.requests];

    if (this.statusFilter) {
      filtered = filtered.filter((r) => r.status === this.statusFilter);
    }

    if (this.fieldTypeFilter) {
      filtered = filtered.filter((r) => r.fieldChangeType === this.fieldTypeFilter);
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

    this.profileChangeRequestService
      .approveProfileChangeRequest(request.id!, currentUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Send notification email to employee
          this.sendApprovalNotification(request, currentUser);

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

  /**
   * Send approval notification to employee
   */
  private sendApprovalNotification(request: ProfileChangeRequestDTO, currentUser: any): void {
    const employeeEmail = this.getEmployeeEmail(request) || 'employee@optimaxsuites.com';
    const fieldLabel = this.getFieldTypeLabel(request.fieldChangeType);

    const emailBody = {
      name: request.employeeName || 'Employee',
      recieverEmail: employeeEmail,
      subject: `${fieldLabel} Change Request - APPROVED`,
      body: `
        <h2>Your ${fieldLabel} Change Request Has Been Approved</h2>
        <p>Dear ${request.employeeName},</p>
        <p>We are pleased to inform you that your request to change your ${fieldLabel.toLowerCase()} has been <strong>approved</strong>.</p>
        
        <h3>Request Details:</h3>
        <ul>
          ${request.request.map(item => `<li><strong>${item.fieldName}:</strong> ${item.oldValue} → ${item.value}</li>`).join('')}
        </ul>
        
        ${request.reason ? `<p><strong>Your Reason:</strong> ${request.reason}</p>` : ''}
        
        <p><strong>Approved By:</strong> ${currentUser.name || 'HR Department'}</p>
        <p><strong>Approval Date:</strong> ${new Date().toLocaleString()}</p>
        
        <p>If you have any questions, please contact the HR department.</p>
        <p>Best regards,<br>OptimAX HR Department</p>
      `
    };

    this.mailNotificationService.sendMail(emailBody).subscribe({
      next: () => {
        console.log('Approval notification email sent to employee');
      },
      error: (err) => {
        console.error('Error sending approval notification email:', err);
      }
    });
  }

  /**
   * Get employee email from request (placeholder for now)
   */
  private getEmployeeEmail(request: ProfileChangeRequestDTO): string | null {
    return request.employeeEmail || null;
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
          // Send rejection notification to employee
          this.sendRejectionNotification(this.selectedRequest!, reason, currentUser);

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

  /**
   * Send rejection notification to employee
   */
  private sendRejectionNotification(request: ProfileChangeRequestDTO, reason: string, currentUser: any): void {
    const employeeEmail = this.getEmployeeEmail(request) || 'employee@optimaxsuites.com';
    const fieldLabel = this.getFieldTypeLabel(request.fieldChangeType);

    const emailBody = {
      name: request.employeeName || 'Employee',
      recieverEmail: employeeEmail,
      subject: `${fieldLabel} Change Request - NOT APPROVED`,
      body: `
        <h2>Your ${fieldLabel} Change Request Has Been Reviewed</h2>
        <p>Dear ${request.employeeName},</p>
        <p>Thank you for submitting your request to change your ${fieldLabel.toLowerCase()}. After careful review, we regret to inform you that your request has been <strong>not approved</strong> at this time.</p>
        
        <h3>Request Details:</h3>
        <ul>
          ${request.request.map(item => `<li><strong>${item.fieldName}:</strong> ${item.oldValue} → ${item.value}</li>`).join('')}
        </ul>
        
        <h3>Reason for Decision:</h3>
        <p>${reason}</p>
        
        <p><strong>Reviewed By:</strong> ${currentUser.name || 'HR Department'}</p>
        <p><strong>Review Date:</strong> ${new Date().toLocaleString()}</p>
        
        <p>If you would like to discuss this decision or have any questions, please contact the HR department.</p>
        <p>Best regards,<br>OptimAX HR Department</p>
      `
    };

    this.mailNotificationService.sendMail(emailBody).subscribe({
      next: () => {
        console.log('Rejection notification email sent to employee');
      },
      error: (err) => {
        console.error('Error sending rejection notification email:', err);
      }
    });

    const hrEmail = currentUser.email || sessionStorage.getItem('useremail') || 'hr@optimaxsuites.com';
    const hrEmailBody = {
      name: currentUser.name || 'HR Department',
      recieverEmail: hrEmail,
      subject: `${fieldLabel} Change Request Rejected - ${request.employeeName || request.employeeId}`,
      body: `
        <h2>${fieldLabel} Change Request Rejected</h2>
        <p><strong>Employee:</strong> ${request.employeeName || request.employeeId}</p>
        <p><strong>Employee Email:</strong> ${employeeEmail}</p>
        <h3>Request Details:</h3>
        <ul>
          ${request.request.map(item => `<li><strong>${item.fieldName}:</strong> ${item.oldValue} → ${item.value}</li>`).join('')}
        </ul>
        <p><strong>Rejection Reason:</strong> ${reason}</p>
        <p><strong>Rejected By:</strong> ${currentUser.name || 'HR Department'}</p>
        <p><strong>Review Date:</strong> ${new Date().toLocaleString()}</p>
      `
    };

    this.mailNotificationService.sendMail(hrEmailBody).subscribe({
      next: () => {
        console.log('Rejection notification email sent to HR');
      },
      error: (err) => {
        console.error('Error sending HR rejection notification email:', err);
      }
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
}
