import { Component, Input, OnInit } from '@angular/core';
import { AttendancetableService } from '../../../service/attendance/attendancetable.service';

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

  constructor(private attendanceService: AttendancetableService) {}

  ngOnInit() {
    if (!this.id) return;
    this.attendanceService.fetchEmployeeRecords(this.id).subscribe(raw => {
      if (raw.length > 0) {
        const record = raw[0];
        this.employee = {
          name: record.employee || '-',
          department: record.department || '-',
        };
      }
      this.records = raw.map(r => ({
        date: typeof r.date === 'string' ? r.date : (r.date ? this.attendanceService.dateArrayToStr([r.date.getFullYear(), r.date.getMonth() + 1, r.date.getDate()]) : ''),
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
