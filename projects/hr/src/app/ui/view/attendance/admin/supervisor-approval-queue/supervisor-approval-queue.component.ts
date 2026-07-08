import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CrossBranchAttendanceService } from '../../../../service/attendance/cross-branch-attendance.service';
import { CrossBranchCheckInRequest } from '../../../../domain/attendance/cross-branch-request.dto';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-supervisor-approval-queue',
  templateUrl: './supervisor-approval-queue.component.html',
  styleUrl: './supervisor-approval-queue.component.scss'
})
export class SupervisorApprovalQueueComponent implements OnInit, OnDestroy {
  private crossBranchService = inject(CrossBranchAttendanceService);
  private destroy$ = new Subject<void>();

  outstandingRequests: CrossBranchCheckInRequest[] = [];
  selectedRequest: CrossBranchCheckInRequest | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
  rejectionReason: string = '';
  isProcessing: boolean = false;

  supervisorId: number = 1; // Should come from session
  supervisorName: string = 'Current Supervisor';

  ngOnInit(): void {
    this.loadOutstandingRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOutstandingRequests(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.crossBranchService.getOutstandingRequests(this.supervisorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (requests) => {
          this.outstandingRequests = requests;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load pending requests';
          this.isLoading = false;
          console.error(err);
        }
      });
  }

  selectRequest(request: CrossBranchCheckInRequest): void {
    this.selectedRequest = request;
    this.rejectionReason = '';
    this.errorMessage = '';
  }

  approveRequest(request: CrossBranchCheckInRequest): void {
    this.isProcessing = true;
    this.errorMessage = '';

    this.crossBranchService.approveCrossBranchRequest(
      request.id,
      this.supervisorId,
      this.supervisorName,
      'Approved by supervisor'
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          this.isProcessing = false;
          this.successMessage = `Request ${request.id.substring(0, 8)}... approved!`;
          this.outstandingRequests = this.outstandingRequests.filter(r => r.id !== request.id);
          this.selectedRequest = null;
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (err) => {
          this.isProcessing = false;
          this.errorMessage = 'Failed to approve request. Please try again.';
          console.error(err);
        }
      });
  }

  rejectRequest(request: CrossBranchCheckInRequest): void {
    if (!this.rejectionReason.trim()) {
      this.errorMessage = 'Please provide a reason for rejection';
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';

    this.crossBranchService.rejectCrossBranchRequest(
      request.id,
      this.supervisorId,
      this.supervisorName,
      this.rejectionReason
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedRequest) => {
          this.isProcessing = false;
          this.successMessage = `Request ${request.id.substring(0, 8)}... rejected`;
          this.outstandingRequests = this.outstandingRequests.filter(r => r.id !== request.id);
          this.selectedRequest = null;
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (err) => {
          this.isProcessing = false;
          this.errorMessage = 'Failed to reject request. Please try again.';
          console.error(err);
        }
      });
  }

  getPendingCount(): number {
    return this.outstandingRequests.length;
  }

  getApprovalTypeLabel(approvalType: string): string {
    return approvalType === 'PRE_APPROVAL' ? 'Pre-Approval' : 'Retrospective';
  }

  clearSelection(): void {
    this.selectedRequest = null;
    this.rejectionReason = '';
  }
}
