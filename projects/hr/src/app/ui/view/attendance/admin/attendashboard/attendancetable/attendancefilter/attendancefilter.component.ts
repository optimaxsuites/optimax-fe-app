import { Component, EventEmitter, Output, inject } from '@angular/core';
//import { Router, ActivatedRoute } from '@angular/router';
import { AttendancetableService } from '../../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../../domain/attendance/attendancetable.dto';
import { ToastService } from '../../../../../../shared-component/service/toast/toast.service';
import { BRANCHES, BRANCH_NAMES } from '../../../../../../domain/attendance/attendancetable.mock';

@Component({
  selector: 'app-attendancefilter',
  templateUrl: './attendancefilter.component.html',
  styleUrl: './attendancefilter.component.scss'
})
export class AttendancefilterComponent {
  //private router = inject(Router);
  //private route = inject(ActivatedRoute);

  private toastService = inject(ToastService);

  @Output() filtersChange = new EventEmitter<any>();

  departments:string[] = [];
  branches = Object.entries(BRANCH_NAMES).map(([id, name]) => ({ id: parseInt(id), name }));
  showDatePicker = false;
  isApplying = false;

  filters = {
    dateFrom: '',
    dateTo: '',
    id: '',
    employee: '',
    department: '',
    status: '',
    branch: '',
    correctionStatus: ''
  };
  attendance: any;

  // For display purposes
  searchQuery = '';

  constructor(private attendancetableService: AttendancetableService) {}

  ngOnInit() {
  this.attendancetableService.attendance$.subscribe(data => {
    const uniqueDepartments = [...new Set(data.map(r => r.department))];
    this.departments = uniqueDepartments;
  });
}

  /*ngOnInit() {
    this.attendance = this.attendancetableService.getAttendance();
  }*/

  onSearchChange(query: string): void {
    this.searchQuery = query;
    // Try to match as ID first, then as employee name
    this.filters.id = query.match(/^\d+$/) ? query : '';
    this.filters.employee = !query.match(/^\d+$/) ? query : '';
  }

  toggleDatePicker(): void {
    this.showDatePicker = !this.showDatePicker;
  }

  getDateRangeLabel(): string {
    if (!this.filters.dateFrom && !this.filters.dateTo) return 'Date Range ▾';
    if (this.filters.dateFrom && this.filters.dateTo) {
      return `${this.filters.dateFrom} to ${this.filters.dateTo}`;
    }
    if (this.filters.dateFrom) return `From ${this.filters.dateFrom}`;
    if (this.filters.dateTo) return `To ${this.filters.dateTo}`;
    return 'Date Range ▾';
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.filters.id) count++;
    if (this.filters.employee) count++;
    if (this.filters.department) count++;
    if (this.filters.status) count++;
    if (this.filters.correctionStatus) count++;
    if (this.filters.dateFrom) count++;
    if (this.filters.dateTo) count++;
    return count;
  }

  applyFilters() {
    this.isApplying = true;
    console.log('Filters applied: ', this.filters);
    this.showDatePicker = false;

    const hasActiveFilters = this.filters.id || this.filters.employee ||
                            this.filters.department || this.filters.status ||
                            this.filters.dateFrom || this.filters.dateTo;

    this.toastService.info(hasActiveFilters ? '🔍 Filters applied' : 'Showing all records');

    setTimeout(() => {
      this.isApplying = false;
      this.filtersChange.emit(this.filters);
    }, 300);
  }

  resetFilters() {
  this.filters = {
    dateFrom: '',
    dateTo: '',
    id: '',
    employee: '',
    department: '',
    status: '',
    branch: '',
    correctionStatus: ''
  };
  this.searchQuery = '';
  this.showDatePicker = false;

  this.toastService.info('Filters reset');
  this.filtersChange.emit(this.filters);
}
}
