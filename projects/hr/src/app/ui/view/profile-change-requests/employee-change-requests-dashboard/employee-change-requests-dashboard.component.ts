/**
 * Employee Change Requests Dashboard Component
 * Allows employees to view their submitted profile change requests and their status
 */
import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ProfileChangeRequestDTO } from '../../../model/profile-change-request.model';
import { ProfileChangeRequestService } from '../../../service/profile-change-request.service';

@Component({
  selector: 'app-employee-change-requests-dashboard',
  templateUrl: './employee-change-requests-dashboard.component.html',
  styleUrl: './employee-change-requests-dashboard.component.scss',
  providers: [MessageService]
})
export class EmployeeChangeRequestsDashboardComponent implements OnInit {
  // State Management
  loading = true;
  myRequests: ProfileChangeRequestDTO[] = [];
  showSubmitForm = false;
  showHistory = false;

  // Modal Management
  selectedRequest: ProfileChangeRequestDTO | null = null;
  detailsModalOpen = false;

  // Statistics
  stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  };

  constructor(
    private messageService: MessageService,
    private profileChangeRequestService: ProfileChangeRequestService
  ) {}

  ngOnInit(): void {
    this.loadMyRequests();
  }

  /**
   * Load employee's own change requests
   */
  private loadMyRequests(): void {
    this.loading = true;
    const employeeId = this.getCurrentEmployeeId();
    this.profileChangeRequestService.getEmployeeRequests(employeeId).subscribe({
      next: (requests) => {
        this.myRequests = requests;
        this.calculateStatistics();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading my requests:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load your change requests',
          life: 5000
        });
        this.loading = false;
      }
    });
  }

  /**
   * Get current employee ID
   */
  private getCurrentEmployeeId(): string | number {
    return localStorage.getItem('employeeId') || sessionStorage.getItem('userid') || localStorage.getItem('userid') || '0';
  }

  /**
   * Calculate statistics
   */
  private calculateStatistics(): void {
    this.stats = {
      total: this.myRequests.length,
      pending: this.myRequests.filter(r => r.status === 'pending').length,
      approved: this.myRequests.filter(r => r.status === 'approved').length,
      rejected: this.myRequests.filter(r => r.status === 'rejected').length
    };
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): ProfileChangeRequestDTO[] {
    return this.myRequests.filter(req => req.status === 'pending');
  }

  /**
   * Get approved requests
   */
  getApprovedRequests(): ProfileChangeRequestDTO[] {
    return this.myRequests.filter(req => req.status === 'approved');
  }

  /**
   * Get rejected requests
   */
  getRejectedRequests(): ProfileChangeRequestDTO[] {
    return this.myRequests.filter(req => req.status === 'rejected');
  }

  /**
   * Format date to readable format
   */
  formatDate(date: any): string {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Open request details modal
   */
  viewRequestDetails(request: ProfileChangeRequestDTO): void {
    this.selectedRequest = JSON.parse(JSON.stringify(request)); // Deep copy
    this.detailsModalOpen = true;
  }

  /**
   * Close details modal
   */
  closeDetailsModal(): void {
    this.detailsModalOpen = false;
    this.selectedRequest = null;
  }

  /**
   * Toggle form view
   */
  toggleSubmitForm(): void {
    this.showSubmitForm = !this.showSubmitForm;
  }

  /**
   * Toggle history view
   */
  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  /**
   * Handle new request submission
   */
  onRequestSubmitted(request: ProfileChangeRequestDTO): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Request Submitted',
      detail: 'Your change request has been submitted successfully!',
      life: 5000
    });

    // Reload requests
    setTimeout(() => {
      this.loadMyRequests();
      this.showSubmitForm = false;
    }, 1000);
  }

  /**
   * Get status badge color
   */
  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'badge-warning',
      'approved': 'badge-success',
      'rejected': 'badge-danger'
    };
    return statusClasses[status] || 'badge-secondary';
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      'pending': 'fa-hourglass-end',
      'approved': 'fa-check-circle',
      'rejected': 'fa-times-circle'
    };
    return iconMap[status] || 'fa-info-circle';
  }

  /**
   * Get change type badge class
   */
  getChangeTypeBadgeClass(type: string): string {
    const typeClasses: { [key: string]: string } = {
      'bank': 'badge-info',
      'emergency_contact': 'badge-primary',
      'address': 'badge-secondary',
      'phone': 'badge-secondary',
      'email': 'badge-secondary',
      'nok': 'badge-primary',
      'guarantor': 'badge-warning'
    };
    return typeClasses[type] || 'badge-secondary';
  }

  /**
   * Get change type label
   */
  getChangeTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'bank': 'Bank Details',
      'emergency_contact': 'Emergency Contact',
      'address': 'Address',
      'phone': 'Phone Number',
      'email': 'Email Address',
      'nok': 'Next of Kin',
      'guarantor': 'Guarantor'
    };
    return typeMap[type] || type;
  }

  /**
   * Refresh requests
   */
  refreshRequests(): void {
    this.loadMyRequests();
  }
}
