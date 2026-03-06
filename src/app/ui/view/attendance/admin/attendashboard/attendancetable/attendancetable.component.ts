import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';
import { Observable, switchMap } from 'rxjs';
import { MOCK_ATTENDANCE } from '../../../../../domain/attendance/attendancetable.mock';
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
}

/*calculateDashboardData() {

  const data = this.filteredAttendance;

  // =========================
  // HEATMAP (Status Count)
  // =========================
  const present = data.filter(r => r.status === 'PRESENT').length;
  const absent = data.filter(r => r.status === 'ABSENT').length;
  const late = data.filter(r => r.status === 'LATE').length;
  const onLeave = data.filter(r => r.status === 'ON_LEAVE').length;

  this.heatmapData = [
    { department: 'Present', attendance: present },
    { department: 'Absent', attendance: absent },
    { department: 'Late', attendance: late },
    { department: 'On Leave', attendance: onLeave }
  ];

  // =========================
  // LATE ARRIVALS
  // =========================
  this.lateArrivalsData = data
    .filter(r => r.status === 'LATE')
    .map(r => ({
      id: r.id,
      name: r.employee,
      time: r.checkIn
    }));

  // =========================
  // TOP 3 DEPARTMENTS BY PUNCTUALITY
  // =========================

  const departmentMap: any = {};

  data.forEach(record => {
    if (!departmentMap[record.department]) {
      departmentMap[record.department] = {
        total: 0,
        present: 0
      };
    }

    departmentMap[record.department].total++;

    if (record.status === 'PRESENT') {
      departmentMap[record.department].present++;
    }
  });

  const punctualityRates = Object.keys(departmentMap).map(dept => {
    const deptData = departmentMap[dept];
    const rate = (deptData.present / deptData.total) * 100;

    return {
      department: dept,
      rate: Number(rate.toFixed(1))
    };
  });

  const topThree = punctualityRates
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3);

  this.statsData = topThree;
}*/

/*applyFilters() {
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
}*/

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
