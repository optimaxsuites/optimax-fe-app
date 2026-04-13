import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { AttendancetableService } from '../../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../../domain/attendance/attendancetable.dto';

@Component({
  selector: 'app-monthlyattendancelist',
  templateUrl: './monthlyattendancelist.component.html',
  styleUrl: './monthlyattendancelist.component.scss'
})
export class MonthlyattendancelistComponent implements OnInit {
  attendanceData: AttendanceTableRecord[] = [];
  filteredData: AttendanceTableRecord[] = [];

  selectedMonth!: string; // format: YYYY-MM

  @Output() filteredDataChange = new EventEmitter<AttendanceTableRecord[]>();

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
    this.attendanceService.attendance$.subscribe(data => {
      this.attendanceData = data;
      this.applyMonthFilter();
    });
  }

  applyMonthFilter() {
    const [year, month] = this.selectedMonth.split('-').map(Number);

  this.filteredData = this.attendanceData.filter(record => {
    if (!record.date) return false;

    const d = new Date(record.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
    /*
    this.filteredData = this.attendanceData.filter(record => {
      if (!record.date) return false;
      return record.date.startsWith(this.selectedMonth);
    });*/

    //to send data to parent component
    this.filteredDataChange.emit(this.filteredData);
  }

  onMonthChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.selectedMonth = value;
    this.applyMonthFilter();
  }

}
