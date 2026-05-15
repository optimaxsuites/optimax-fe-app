import { Component, OnInit, OnDestroy } from '@angular/core';
import { ProfileChangeRequestService } from '../../../service/profile-change-request.service';
import { ProfileChangeRequestDTO } from '../../../model/profile-change-request.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-employee-change-requests-summary',
  templateUrl: './employee-change-requests-summary.component.html',
  styleUrl: './employee-change-requests-summary.component.scss'
})
export class EmployeeChangeRequestsSummaryComponent implements OnInit, OnDestroy {
  employeeRequests: ProfileChangeRequestDTO[] = [];
  pendingCount = 0;
  approvedCount = 0;
  rejectedCount = 0;
  loading = false;
  private destroy$ = new Subject<void>();

  constructor(private profileChangeRequestService: ProfileChangeRequestService) {}

  ngOnInit(): void {
    this.loadRequests();
    // Subscribe to requests observable for real-time updates
    this.profileChangeRequestService.requests$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadRequests());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRequests(): void {
    this.loading = true;
    const employeeId = this.getEmployeeId();

    if (!employeeId) {
      this.loading = false;
      return;
    }

    this.profileChangeRequestService.getEmployeeRequests(employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.employeeRequests = requests;
          this.calculateStats();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading employee requests:', error);
          this.loading = false;
        },
      });
  }

  private calculateStats(): void {
    this.pendingCount = this.employeeRequests.filter(r => r.status === 'pending').length;
    this.approvedCount = this.employeeRequests.filter(r => r.status === 'approved').length;
    this.rejectedCount = this.employeeRequests.filter(r => r.status === 'rejected').length;
  }

  private getEmployeeId(): string | null {
    const employeeInView = localStorage.getItem('employeeInView');
    if (employeeInView) {
      try {
        const parsed = JSON.parse(employeeInView);
        return parsed?.id || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  }

  getFieldTypeLabel(fieldType: string): string {
    const labels: { [key: string]: string } = {
      bank: 'Bank Details',
      emergency_contact: 'Emergency Contact',
      address: 'Address',
      phone: 'Phone Number',
      email: 'Email',
      NOK: 'Next of Kin',
      guarantor: 'Guarantor',
    };
    return labels[fieldType] || fieldType;
  }
}
