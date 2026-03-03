import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AttendanceService } from '../../../service/attendance.service';

@Component({
  selector: 'app-attendance-details',
  templateUrl: './attendance-details.component.html',
  styleUrl: './attendance-details.component.scss'
})
export class AttendanceDetailsComponent {
  @Input() id: number = 0
  employee: any;
  records: any[] = [];
  summary: any = {};

  detailsColumns = [
    { header: 'Date', field: 'date' },
    {
      header: 'Clock In',
      formatter: (row: any) => row.clockIn || '-'
    },
    {
      header: 'Clock Out',
      formatter: (row: any) => row.clockOut || '-'
    },
    {
      header: 'Status',
      field: 'status',
      badgeClass: (row: any) => {
        if (row.status === 'Present') return 'bg-green-100 text-green-700';
        if (row.status === 'Late') return 'bg-yellow-100 text-yellow-700';
        if (row.status === 'Absent') return 'bg-red-100 text-red-700';
        return '';
      }
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private attendanceService: AttendanceService,
  ) {}

  ngOnInit() {
    // const id = Number(this.route.snapshot.paramMap.get('id'));
    this.employee = this.attendanceService.getEmployee(this.id);
    this.records = this.attendanceService.getEmployeeAttendance(this.id);
    this.calculateSummary();
  }

  calculateSummary() {
    const totalDays = this.records.length;
    const presentDays = this.records.filter(r => r.status === 'Present').length;
    const lateDays = this.records.filter(r => r.status === 'Late').length;
    const absentDays = this.records.filter(r => r.status === 'Absent').length;

    const attendancePercentage = totalDays > 0 ? ((presentDays + lateDays) / totalDays) * 100 : 0;

    this.summary = {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      attendancePercentage: attendancePercentage.toFixed(1)
    };
  }

}
