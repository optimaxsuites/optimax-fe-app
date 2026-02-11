import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../shared-component/models/attendancetable.model';
import { Observable, switchMap } from 'rxjs';
import { MOCK_ATTENDANCE } from '../../../../shared-component/models/attendancetable.mock';
//import { AttendancefilterComponent } from './attendancefilter/attendancefilter.component';

@Component({
  selector: 'app-attendancetable',
  templateUrl: './attendancetable.component.html',
  styleUrl: './attendancetable.component.scss'
})
export class AttendancetableComponent implements OnInit{

  private attendancetableService = inject(AttendancetableService)

  attendance: AttendanceTableRecord[] = [];
  filteredAttendance: AttendanceTableRecord[] = [];
  attendanceColumns = [
    { header: 'ID', field: 'id' },
    {
      header: 'Employee',
      formatter: (row: AttendanceTableRecord) => (row as any).employee || (row as any).employeeName || ''
    },
    { header: 'Department', field: 'department' },
    {
      header: 'Date',
      formatter: (row: AttendanceTableRecord) => row.date || '-'
    },
    {
      header: 'In',
      formatter: (row: AttendanceTableRecord) => (row as any).checkIn || '-'
    },
    {
      header: 'Out',
      formatter: (row: AttendanceTableRecord) => (row as any).checkOut || '-'
    },
    {
      header: 'Status',
      field: 'status',
      badgeClass: (row: AttendanceTableRecord) => {
        if (row.status === 'PRESENT') return 'status present';
        if (row.status === 'LATE') return 'status late';
        if (row.status === 'ABSENT') return 'status absent';
        return 'status';
      }
    },
    { header: 'Hours', field: 'hours' }
  ];

  attendanceActions = [
    { id: 'correct', label: 'Correct', className: 'correct-btn' }
  ];
 

  ngOnInit(): void {
    this.attendance = MOCK_ATTENDANCE;
    this.filteredAttendance = [...this.attendance];
  }

/*manualCorrection(record: any) {
  console.log('Manual correction:', record);
  alert(`Editing attendance for ${record.employee}`);
}*/

manualCorrection(record: any) {
  const newStatus = prompt(
    `Change status for ${record.employeeName} (PRESENT / LATE / ABSENT):`,
    record.status
  );

  if (!newStatus) return;

  const normalizedStatus = newStatus.toUpperCase();

  if (['PRESENT', 'LATE', 'ABSENT'].includes(normalizedStatus)) {
    record.status = normalizedStatus;

    // Optional: recalculate hours
    if (normalizedStatus === 'ABSENT') {
      record.checkIn = null;
      record.checkOut = null;
      record.hours = 0;
    }

    console.log('Updated record:', record);
  } else {
    alert('Invalid status. Use PRESENT, LATE, or ABSENT.');
  }
}

  handleAttendanceAction(event: { actionId: string; row: AttendanceTableRecord }) {
    if (event.actionId === 'correct') {
      this.manualCorrection(event.row);
    }
  }

filters: any = {};

onFiltersChange(filters: any) {
  this.attendancetableService.getAttendance(filters).subscribe((data: AttendanceTableRecord[]) => {
    this.attendance = data;
  });
}

applyFilters() {
  this.filteredAttendance = this.attendance.filter(record => {

    const recordDate = record.date ?? ''; //fallback if daste is null

    if (this.filters.dateFrom && recordDate < this.filters.dateFrom) return false;
    if (this.filters.dateTo && recordDate > this.filters.dateTo) return false;

    if (this.filters.employee &&
        !record.employee.toLowerCase().includes(this.filters.employee.toLowerCase())) {
      return false;
    }

    if (this.filters.departments?.length &&
        !this.filters.departments.includes(record.department)) {
      return false;
    }

    if (this.filters.statuses?.length &&
        !this.filters.statuses.includes(record.status)) {
      return false;
    }

    return true;
  });
}

    /*private route = inject(ActivatedRoute);
  private attendancetableService = inject(AttendancetableService);

  attendance$!: Observable<AttendanceTableRecord[]>;

    filters = {
    dateFrom: '',
    dateTo: '',
    employeeId: '',
    departments: [],
    statuses: []
  };

  ngOnInit(): void {
    
    this.attendance$ = this.route.queryParams.pipe(
      switchMap(params => this.attendancetableService.getAttendance(params))
    );
    const today = new Date().toISOString().split('T')[0];
    this.filters.dateFrom = today;
    this.filters.dateTo = today;

    this.loadAttendance(); // fetch today's data by default
  }

  loadAttendance() {
    console.log('Loading attendance with filters:', this.filters);
    // call API here later
  }*/
 
}
