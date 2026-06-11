import { Component, Input, OnInit } from '@angular/core';
import { AttendanceService } from '../../../service/attendance.service';

@Component({
  selector: 'app-attendance-details',
  templateUrl: './attendance-details.component.html',
  styleUrl: './attendance-details.component.scss',
})
export class AttendanceDetailsComponent implements OnInit {
  @Input() id = 0;
  employee: any = {};
  records: any[] = [];
  summary: any = {};
  loading = true;

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit() {
    if (!this.id) return;
    this.attendanceService.fetchEmployeeRecords(this.id).subscribe(raw => {
      if (raw.length > 0) {
        const emp = raw[0].employeeId;
        this.employee = {
          name: `${emp?.firstName ?? ''} ${emp?.lastName ?? ''}`.trim(),
          department: emp?.department?.name ?? '-',
        };
      }
      this.records = raw.map(r => ({
        date: this.attendanceService.dateArrayToStr(r.attendanceDate),
        clockIn: r.checkIn ?? '-',
        clockOut: r.checkOut ?? '-',
        status: r.status ?? 'ABSENT',
      }));
      this.loading = false;
      this.calculateSummary();
    });
  }

  calculateSummary() {
    const total = this.records.length;
    const present = this.records.filter(r => r.status === 'PRESENT').length;
    const late = this.records.filter(r => r.status === 'LATE').length;
    const absent = this.records.filter(r => r.status === 'ABSENT').length;
    this.summary = {
      totalDays: total,
      presentDays: present,
      lateDays: late,
      absentDays: absent,
      attendancePercentage: total > 0 ? (((present + late) / total) * 100).toFixed(1) : '0.0',
    };
  }
}
