import { Component, OnInit } from '@angular/core';
import { CorrectionrequestService } from '../../../../service/attendance/correctionrequest.service';
import { CorrectionRequest } from '../../../../domain/attendance/correctionrequest.dto';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';

@Component({
  selector: 'app-admin-corrections',
  templateUrl: './admin-corrections.component.html',
  styleUrl: './admin-corrections.component.scss'
})
export class AdminCorrectionsComponent implements OnInit {
  requests: CorrectionRequest[] = [];
  rejectReason: { [id: string]: string } = {};
  approvalComment: { [id: string]: string } = {};
  activeRejectId: string | null = null;

  constructor(
    private correctionService: CorrectionrequestService,
    private attendanceService: AttendancetableService
  ) {}

  ngOnInit() {
    this.correctionService.initialize();
    this.correctionService.getRequests().subscribe(reqs => {
      this.requests = reqs;
    });
  }

  startReview(req: CorrectionRequest) {
    this.correctionService.startReview(req.id);
  }

  approve(req: CorrectionRequest) {
    if (!this.correctionService.canApproveOrReject(req)) {
      return;
    }

    const employeeId = Number(req.employeeId);
    if (Number.isNaN(employeeId)) {
      alert('Attendance correction requires a numeric employee ID.');
      return;
    }

    this.attendanceService.updateAttendanceStatus(
      employeeId,
      req.employeeName ?? '',
      req.department,
      req.date,
      'PRESENT'
    );

    this.correctionService.approveRequest(
      req.id,
      'Supervisor',
      this.approvalComment[req.id]
    );
  }

  reject(req: CorrectionRequest) {
    const reason = this.rejectReason[req.id]?.trim();
    if (!reason) {
      alert('Please provide a rejection reason');
      return;
    }

    this.correctionService.rejectRequest(req.id, 'Supervisor', reason);
    this.activeRejectId = null;
  }

  toggleRejectReason(id: string | null) {
    this.activeRejectId = this.activeRejectId === id ? null : id;
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

  canStartReview(req: CorrectionRequest): boolean {
    return this.correctionService.canStartReview(req);
  }

  canApproveOrReject(req: CorrectionRequest): boolean {
    return this.correctionService.canApproveOrReject(req);
  }

  getPendingCount(): number {
    return this.requests.filter(r => r.status === 'PENDING').length;
  }
}
