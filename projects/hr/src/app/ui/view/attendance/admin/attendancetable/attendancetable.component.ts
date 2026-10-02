import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { AdminCorrectionApprovalService } from '../../../../service/attendance/admin-correction-approval.service';
import { AttendanceTableRecord } from '../../../../domain/attendance/attendancetable.dto';
import { AttendancefilterComponent } from './attendancefilter/attendancefilter.component';

@Component({
  selector: 'app-attendancetable',
  standalone: true,
  imports: [CommonModule, AttendancefilterComponent],
  templateUrl: './attendancetable.component.html',
  styleUrl: './attendancetable.component.scss'
})
export class AttendancetableComponent implements OnInit{

  private attendancetableService = inject(AttendancetableService);
  private correctionRequestService = inject(AdminCorrectionApprovalService);
  private preservedCorrectionRequests: Map<number, any> = new Map();

  attendance: AttendanceTableRecord[] = [];
  filteredAttendance: AttendanceTableRecord[] = [];


  ngOnInit(): void {
    // Subscribe to correction requests - preserve them always
    this.correctionRequestService.correctionRequests$.subscribe((correctionRequests) => {
      if (correctionRequests && correctionRequests.length > 0) {
        // Store correction requests by record id
        correctionRequests.forEach(record => {
          if (record.correctionRequest) {
            this.preservedCorrectionRequests.set(record.id, record.correctionRequest);
          }
        });
      }

      // Re-apply preserved corrections to current attendance
      this.applyPreservedCorrections();
    });

    // Subscribe to attendance updates
    this.attendancetableService.attendance$.subscribe((attendanceData) => {
      this.attendance = [...attendanceData];

      // Always re-apply preserved corrections after any update
      this.applyPreservedCorrections();
    });
  }

  private applyPreservedCorrections(): void {
    // Apply stored correction requests to current attendance records
    this.attendance.forEach(record => {
      const preservedCorrection = this.preservedCorrectionRequests.get(record.id);
      if (preservedCorrection) {
        record.correctionRequest = preservedCorrection;
      }
    });

    // Also check if there are preserved corrections for records NOT in attendance
    this.preservedCorrectionRequests.forEach((correction, recordId) => {
      const found = this.attendance.find(r => r.id === recordId);
      if (!found) {
        console.warn('⚠️ Correction request for record id', recordId, 'but record not in attendance array!');
      }
    });

    this.filteredAttendance = [...this.attendance];
  }

/*manualCorrection(record: any) {
  alert(`Editing attendance for ${record.employee}`);
}*/

manualCorrection(record: any) {
  const newStatus = prompt(
    `Change status for ${record.employee} (PRESENT / LATE / ABSENT):`,
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
  } else {
    alert('Invalid status. Use PRESENT, LATE, or ABSENT.');
  }
}

filters: any = {};

onFiltersChange(filters: any) {
  this.filters = filters ?? {};
  this.applyFilters();
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

  applyFilters() {
  this.filteredAttendance = this.attendance.filter(record => {

    const recordDate = this.toDateKey(record.date);

    if (this.filters.month && !recordDate.startsWith(this.filters.month)) return false;
    if (this.filters.dateFrom && recordDate < this.filters.dateFrom) return false;
    if (this.filters.dateTo && recordDate > this.filters.dateTo) return false;

    if (this.filters.id && !String(record.id).includes(String(this.filters.id))) {
      return false;
    }

    if (this.filters.employee &&
        !record.employee.toLowerCase().includes(this.filters.employee.toLowerCase())) {
      return false;
    }

    const department = this.filters.department || this.filters.departments?.[0];
    if (department && record.department !== department) {
      return false;
    }

    const status = this.filters.status || this.filters.statuses?.[0];
    if (status && record.status !== status) {
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
