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

  private toDateKey(value: Date | string | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  applyMonthFilter() {
    this.filteredData = this.attendanceData.filter(record => {
      if (!record.date) return false;
      return this.toDateKey(record.date).startsWith(this.selectedMonth);
    });
  }

  onMonthChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.selectedMonth = value;
    this.applyMonthFilter();
  }

}
