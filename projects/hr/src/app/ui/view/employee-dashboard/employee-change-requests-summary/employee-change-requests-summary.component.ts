import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { ProfileChangeRequestService } from '../../../service/profile-change-request.service';
import { ProfileChangeRequestDTO } from '../../../model/profile-change-request.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SelectedEmployeeStore } from '../../employee-management/selected-employee.store';

@Component({
  selector: 'app-employee-change-requests-summary',
  templateUrl: './employee-change-requests-summary.component.html',
  styleUrl: './employee-change-requests-summary.component.scss'
})
export class EmployeeChangeRequestsSummaryComponent implements OnInit, OnChanges, OnDestroy {
  @Input() employeeId: string | number | null = null;

  employeeRequests: ProfileChangeRequestDTO[] = [];
  pendingCount = 0;
  approvedCount = 0;
  rejectedCount = 0;
  loading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private profileChangeRequestService: ProfileChangeRequestService,
    private selectedEmployee: SelectedEmployeeStore
  ) {}

  ngOnInit(): void {
    this.loadRequests();

    // Keep the card in sync with service updates without triggering another GET.
    this.profileChangeRequestService.requests$
      .pipe(takeUntil(this.destroy$))
      .subscribe((requests) => this.applyEmployeeRequests(requests));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] && !changes['employeeId'].firstChange) {
      this.loadRequests();
    }
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
          this.setEmployeeRequests(requests);
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

  private applyEmployeeRequests(requests: ProfileChangeRequestDTO[]): void {
    const employeeId = this.getEmployeeId();
    if (!employeeId) {
      return;
    }

    this.setEmployeeRequests(
      requests.filter((request) => String(request.employeeId) === String(employeeId))
    );
  }

  private setEmployeeRequests(requests: ProfileChangeRequestDTO[]): void {
    this.employeeRequests = requests;
    this.calculateStats();
  }

  private getEmployeeId(): string | null {
    if (this.employeeId !== null && this.employeeId !== undefined && String(this.employeeId).trim()) {
      return String(this.employeeId);
    }

    const selectedId = this.selectedEmployee.id;
    if (selectedId !== null) {
      return String(selectedId);
    }

    const currentEmployee = localStorage.getItem('currentEmployee') || sessionStorage.getItem('currentEmployee');
    if (currentEmployee) {
      try {
        const parsed = JSON.parse(currentEmployee);
        if (parsed?.id) {
          return String(parsed.id);
        }
      } catch {
        // Fall through to user id fallback.
      }
    }

    return sessionStorage.getItem('userid') || localStorage.getItem('userid');
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
