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
