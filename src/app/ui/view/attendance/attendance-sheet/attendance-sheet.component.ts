import { Component, OnInit } from '@angular/core';
import { AttendancetableService } from '../../../service/attendance/attendancetable.service';
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
  selectedDate = this.formatDateLocal(new Date());
  viewDetail = false;
  selectedId = 0;
  loading = true;

  constructor(private attendanceService: AttendancetableService, private router: Router) {}

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
        const recDate = this.attendanceService.dateArrayToStr(r.date);
        const name = (r.employee ?? '').toLowerCase();
        return (!this.selectedDate || recDate === this.selectedDate) && name.includes(term);
      })
      .map(r => ({
        id: r.employeeId,
        name: r.employee || '-',
        department: r.department || '-',
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

  private formatDateLocal(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
