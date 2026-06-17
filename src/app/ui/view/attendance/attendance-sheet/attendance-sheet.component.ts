import { Component, OnInit } from '@angular/core';
import { AttendanceService } from '../../../service/attendance.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-attendance-sheet',
  templateUrl: './attendance-sheet.component.html',
  styleUrls: ['./attendance-sheet.component.scss'],
})
export class AttendanceSheetsComponent implements OnInit {
  private allRecords: any[] = [];
  filteredEmployees: any[] = [];
  searchTerm = '';
  selectedDate = new Date().toISOString().split('T')[0];
  viewDetail = false;
  selectedId = 0;
  loading = true;

  constructor(private attendanceService: AttendanceService, private router: Router) {}

  ngOnInit() {
    this.loadAttendance();
  }

  loadAttendance() {
    this.loading = true;
    this.attendanceService.fetchDailyRecords().subscribe(records => {
      this.allRecords = records;
      this.loading = false;
      this.filterEmployees();
    });
  }

  filterEmployees() {
    const term = this.searchTerm.toLowerCase();
    this.filteredEmployees = this.allRecords
      .filter(r => {
        const recDate = this.attendanceService.dateArrayToStr(r.attendanceDate);
        const name = `${r.employeeId?.firstName ?? ''} ${r.employeeId?.lastName ?? ''}`.toLowerCase();
        return (!this.selectedDate || recDate === this.selectedDate) && name.includes(term);
      })
      .map(r => ({
        id: r.employeeId?.id,
        name: `${r.employeeId?.firstName ?? ''} ${r.employeeId?.lastName ?? ''}`,
        department: r.employeeId?.department?.name ?? '-',
        status: r.status ?? 'ABSENT',
        clockIn: r.checkIn ?? '-',
        clockOut: r.checkOut ?? '-',
      }));
  }

  viewDetails(emp: any) {
    this.viewDetail = true;
    this.selectedId = emp.id;
  }

  toggleSidebar() {
    this.viewDetail = !this.viewDetail;
  }
}
