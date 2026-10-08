import { Component, OnInit, inject } from '@angular/core';
import { take } from 'rxjs/operators';
import { CorrectionRequest, IssueToCorrectionType } from '../../../../domain/attendance/correctionrequest.dto';
import { EmployeeCorrectionService } from '../../../../service/attendance/employee-correction.service';
import { AdminCorrectionApprovalService } from '../../../../service/attendance/admin-correction-approval.service';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { ToastService } from '../../../../shared-component/service/toast/toast.service';

@Component({
  selector: 'app-correctionrequest',
  templateUrl: './correctionrequest.component.html',
  styleUrl: './correctionrequest.component.scss'
})
export class CorrectionrequestComponent  implements OnInit{
   /*requests: CorrectionRequest[] = [
    {
      id: '1',
      date: '2026-02-03',
      issueType: 'MISSED_CLOCK',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      date: '2026-02-01',
      issueType: 'WRONG_TIME',
      status: 'APPROVED',
      createdAt: new Date().toISOString()
    }
  ];

  showForm = false;

  openForm() {
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  sendReminder(request: CorrectionRequest) {
    console.log('Reminder sent for request:', request.id);
    // later → call backend API / notification service
    alert('Reminder sent to admin');
  }

  addRequest(request: CorrectionRequest) {
    this.requests = [request, ...this.requests];
    this.closeForm();
  }
    */

  getIssueLabel(type: string): string {
    const map: any = {
      MISSED_CLOCK: 'Missed Clock',
      WRONG_TIME: 'Wrong Time',
      OTHER: 'Other'
    };
    return map[type] || type;
  }

  getStatusLabel(status: string): string {
    const map: any = {
      PENDING: 'Pending',
      UNDER_REVIEW: 'Under Review',
      SUBMITTED: 'Submitted',
      REJECTED: 'Rejected'
    };
    return map[status] || status;
  }

  requests: CorrectionRequest[] = [];
  resubmissionEvidence: { [id: string]: string } = {};
  showForm = false;

  private correctionService = inject(EmployeeCorrectionService);
  private adminCorrectionRequestService = inject(AdminCorrectionApprovalService);
  private attendanceService = inject(AttendancetableService);
  private toastService = inject(ToastService);

  ngOnInit() {
    this.correctionService.initialize();
    this.correctionService.getRequests().subscribe(reqs => {
      this.requests = reqs;
    });
  }

  openForm() {
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  addRequest(request: CorrectionRequest) {
    this.correctionService.addRequest(request).subscribe({
      next: () => {
        // Admin side keeps its own list; reload it so the new request shows up there
        this.adminCorrectionRequestService.loadPendingApprovals();
        this.toastService.success('✅ Correction request submitted to admin');
      },
      error: err => {
        console.error('Failed to submit correction request:', err);
        this.toastService.error('❌ Failed to submit correction request');
      }
    });

    this.closeForm();
  }

  canResubmit(request: CorrectionRequest): boolean {
    return this.correctionService.canResubmit(request);
  }

  resubmit(request: CorrectionRequest) {
    const evidence = this.resubmissionEvidence[request.id]?.trim();
    if (!evidence) {
      alert('Please add evidence before resubmitting.');
      return;
    }

    this.correctionService.resubmitRequest(request.id, evidence).subscribe({
      error: err => console.error('Failed to resubmit correction request:', err)
    });
    this.resubmissionEvidence[request.id] = '';
  }

  isStepCompleted(request: CorrectionRequest, step: string): boolean {
    if (request.status === 'REJECTED') return false;

    const completedSteps: { [key: string]: boolean } = {
      'SUBMITTED': true,
      'PENDING': request.status !== 'SUBMITTED',
      'PENDING_LINE_MANAGER': ['UNDER_REVIEW', 'PENDING'].includes(request.status),
      'PENDING_HR': request.status === 'UNDER_REVIEW',
      'APPROVED': request.status === 'UNDER_REVIEW'
    };

    return completedSteps[step] || false;
  }

  isPendingStep(request: CorrectionRequest, step: string): boolean {
    return request.status === 'PENDING' && step === 'PENDING_LINE_MANAGER' ||
           request.status === 'UNDER_REVIEW' && (step === 'PENDING_HR' || step === 'APPROVED');
  }

  isRejected(request: CorrectionRequest): boolean {
    return request.status === 'REJECTED';
  }

  deleteRequest(request: CorrectionRequest): void {
    if (!confirm(`Are you sure you want to delete this correction request?\n\nReason: ${request.description}`)) {
      return;
    }

    // Delete from employee's own list
    this.correctionService.deleteRequest(request.id).subscribe({
      error: err => console.error('Failed to delete correction request:', err)
    });

    // Also delete from admin dashboard
    // Find the record by employee name and date
    const employeeName = sessionStorage.getItem('fullname') || 'Employee';
    this.attendanceService.attendance$.pipe(take(1)).subscribe(records => {
      const record = records.find(r =>
        r.employee?.toLowerCase().includes(employeeName.toLowerCase()) &&
        r.date === request.date
      );
      if (record && record.correctionRequest) {
        this.adminCorrectionRequestService.deleteCorrectionRequest(record.id).subscribe({
          error: err => console.error('Failed to delete correction request from admin dashboard:', err)
        });
      }
    });

    this.toastService.success(`🗑️ Correction request deleted`);
  }
  /**
   * Convert employee form issue type to backend correction type
   */
  private issueToCorrectionType = IssueToCorrectionType;}
