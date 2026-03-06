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

  constructor(
    private correctionService: CorrectionrequestService,
  private attendanceService: AttendancetableService
) {}

  ngOnInit() {
    this.correctionService.getRequests().subscribe(reqs => {
      this.requests = reqs;
    });
  }

  /*approve(req: CorrectionRequest) {
    this.correctionService.updateRequest(req.id, {
      status: 'APPROVED'
    });

    // updating attendance record 
     this.correctionService.correctAttendance({
    employeeId: req.employeeId,
    date: req.date,
    status: 'PRESENT'
  });
  }*/

  approve(req: CorrectionRequest) {

  this.correctionService.updateRequest(req.id, {
    status: 'APPROVED'
  });

  // to make both tables update instantly
  this.attendanceService.updateAttendanceStatus(
    req.employeeId,
    req.employeeName ?? '',
    req.department,
    req.date,
    'PRESENT'
  );
}

  reject(req: CorrectionRequest) {
    const reason = this.rejectReason[req.id];
    if (!reason) {
      alert('Please provide a rejection reason');
      return;
    }

    this.correctionService.updateRequest(req.id, {
      status: 'REJECTED',
      rejectionReason: reason
    });
  }

}
