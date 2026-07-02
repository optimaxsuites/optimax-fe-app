import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';

@Component({
  selector: 'app-monthlyattendancelist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monthlyattendancelist.component.html',
  styleUrl: './monthlyattendancelist.component.scss'
})
export class MonthlyattendancelistComponent implements OnInit {
  attendanceData: AttendanceTableRecord[] = [];
  filteredData: AttendanceTableRecord[] = [];

  selectedMonth!: string; // format: YYYY-MM

  constructor(private attendanceService: AttendancetableService) {}

  ngOnInit(): void {
    this.setCurrentMonth();
    this.loadAttendance();
  }

  private setCurrentMonth() {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  loadAttendance() {
    this.attendanceService.getAttendance().subscribe(data => {
      this.attendanceData = data;
      this.applyMonthFilter();
    });
  }

  applyMonthFilter() {
    this.filteredData = this.attendanceData.filter(record => {
      if (!record.date) return false;
      return record.date.startsWith(this.selectedMonth);
    });
  }

  onMonthChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.selectedMonth = value;
    this.applyMonthFilter();
  }

}
