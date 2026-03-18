import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
// import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
// import { AttendanceTableRecord } from '../../../../shared-component/models/attendancetable.model';
import { Observable, switchMap } from 'rxjs';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
// import { MOCK_ATTENDANCE } from '../../../../shared-component/models/attendancetable.mock';
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
 

  editingRecord: AttendanceTableRecord | null = null;

editStatus: AttendanceTableRecord['status'] = 'PRESENT';
editCheckIn: string | null = null;
editReason = '';

sortColumn: keyof AttendanceTableRecord | '' = '';
sortDirection: 'asc' | 'desc' = 'asc';
  //heatmapData: any[] = [];
  //lateArrivalsData: any[] = [];
  //statsData: any[] = [];

  @Output() dataChange = new EventEmitter<{ data: AttendanceTableRecord[], filters: any }>();
 
  ngOnInit(): void {
  this.attendancetableService.attendance$.subscribe(data => {
    const today = new Date().toISOString().split('T')[0];

    this.attendance = data;

    // Default = today only
    this.filteredAttendance = data.filter(record => record.date === today);
  });
}

isToday(date: string | null): boolean {
  if (!date) return false;
  
  const today = new Date().toISOString().split('T')[0];
  return date === today;
}

openAttendance(record: AttendanceTableRecord) {
  record.overrideOpen = true;
  this.attendancetableService.openAttendanceForToday(record.id);
}

  /*ngOnInit(): void {
    this.attendancetableService.attendance$.subscribe(data => {
    this.attendance = data;
    this.filteredAttendance = [...data];
  });
    //this.attendance = MOCK_ATTENDANCE;
    //this.filteredAttendance = [...this.attendance];
  }*/

/*manualCorrection(record: any) {
  console.log('Manual correction:', record);
  alert(`Editing attendance for ${record.employee}`);
}*/

/*manualCorrection(record: any) {
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
}*/

  handleAttendanceAction(event: { actionId: string; row: AttendanceTableRecord }) {
    // if (event.actionId === 'correct') {
    //   this.manualCorrection(event.row);
    // }
  }

filters: any = {};

onFiltersChange(filters: any) {
  this.filters = filters;

  const hasFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.id ||
    filters.employee ||
    filters.department ||
    filters.status;

  if (!hasFilters) {
    this.resetToToday();
  } else {
    this.applyFilters();
  }
}

resetToToday() {
  const today = new Date().toISOString().split('T')[0];

  this.filteredAttendance = this.attendance.filter(
    record => record.date === today
  );

  this.dataChange.emit({
    data: this.filteredAttendance,
  filters: this.filters
});
}

applyFilters() {
  this.filteredAttendance = this.attendance.filter(record => {

    const recordDate = record.date ?? '';

    // Date period filter
    if (this.filters.dateFrom && recordDate < this.filters.dateFrom) return false;
    if (this.filters.dateTo && recordDate > this.filters.dateTo) return false;

    // Employee ID
    if (this.filters.id &&
        !record.id.toString().includes(this.filters.id)) {
      return false;
    }

    // Employee Name
    if (this.filters.employee &&
        !record.employee.toLowerCase().includes(this.filters.employee.toLowerCase())) {
      return false;
    }

    // Department
    if (this.filters.department &&
        record.department !== this.filters.department) {
      return false;
    }

    // Status
    if (this.filters.status &&
        record.status !== this.filters.status) {
      return false;
    }

    return true;
  });

  this.dataChange.emit({
    data: this.filteredAttendance,
  filters: this.filters});

/* //if you want it so your sort doesn't reset even after filtering
  if (this.sortColumn) {
  this.sortTable(this.sortColumn);
} */
}

openModifyForm(record: AttendanceTableRecord) {

  this.editingRecord = record;

  this.editStatus = record.status;
  this.editCheckIn = record.checkIn;
  this.editReason = record.overrideReason ?? '';
}

cancelEdit() {
  this.editingRecord = null;
}

saveModification() {

  if (!this.editingRecord) return;

    if (!this.editReason || !this.editReason.trim()) {
    alert('Reason for modification is required.');
    return;
  }

  const admin = {
    adminId: 'ADMIN001',
    adminName: 'HR Admin'
  };

  this.attendancetableService.overrideAttendance(
    this.editingRecord.id,
    this.editingRecord.date!,
    this.editStatus,
    this.editCheckIn,
    this.editReason,
    admin
  );

  this.editingRecord = null;

  if (this.editReason.trim().length < 5) {
  alert('Reason must be at least 5 characters.');
  return;
}
}

sortTable(column: keyof AttendanceTableRecord) {

  // Toggle direction if same column
  if (this.sortColumn === column) {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }

  this.filteredAttendance = [...this.filteredAttendance].sort((a, b) => {

    /*let valueA = a[column];
    let valueB = b[column];*/

    let valueA = column === 'overriddenBy'
  ? a.overriddenBy?.adminName
  : a[column];

let valueB = column === 'overriddenBy'
  ? b.overriddenBy?.adminName
  : b[column];

    // Handle null/undefined
    if (valueA == null) return 1;
    if (valueB == null) return -1;

    // Convert to string for comparison (safe fallback)
    valueA = valueA.toString().toLowerCase();
    valueB = valueB.toString().toLowerCase();

    if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;

    return 0;
  });
}

}
