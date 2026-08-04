import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { CorrectionRequestService } from '../../../../service/attendance/correction-request.service';
import { AttendanceTableRecord } from '../../../../domain/attendance/attendancetable.dto';
import { MOCK_ATTENDANCE } from '../../../../domain/attendance/attendancetable.mock';
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
  private correctionRequestService = inject(CorrectionRequestService);
  private preservedCorrectionRequests: Map<number, any> = new Map();

  attendance: AttendanceTableRecord[] = [];
  filteredAttendance: AttendanceTableRecord[] = [];


  ngOnInit(): void {
    console.log('🚀 AttendanceTable component initialized!');
    console.log('🚀 CorrectionRequestService injected:', !!this.correctionRequestService);

    // Load MOCK_ATTENDANCE initially
    this.attendance = MOCK_ATTENDANCE;
    this.filteredAttendance = [...this.attendance];
    console.log('🎯 Initial MOCK_ATTENDANCE loaded:', this.attendance.map(r => ({ id: r.id, employee: r.employee })));

    // Subscribe to correction requests - preserve them always
    this.correctionRequestService.correctionRequests$.subscribe((correctionRequests) => {
      console.log('📥 Correction requests received:', correctionRequests.length);
      console.log('📋 Correction request records:', correctionRequests.map(r => ({
        id: r.id,
        employee: r.employee,
        hasCorrection: !!r.correctionRequest,
        correctionStatus: r.correctionRequest?.status
      })));

      if (correctionRequests && correctionRequests.length > 0) {
        // Store correction requests by record id
        correctionRequests.forEach(record => {
          if (record.correctionRequest) {
            this.preservedCorrectionRequests.set(record.id, record.correctionRequest);
            console.log('💾 Stored correction request for record id:', record.id, 'employee:', record.employee);
          }
        });
      }

      console.log('🗂️ Preserved corrections map size:', this.preservedCorrectionRequests.size);
      console.log('🗂️ Preserved map contents:', Array.from(this.preservedCorrectionRequests.entries()));

      // Re-apply preserved corrections to current attendance
      this.applyPreservedCorrections();
    });

    // Subscribe to attendance updates
    this.attendancetableService.attendance$.subscribe((attendanceData) => {
      if (attendanceData && attendanceData.length > 0) {
        console.log('📥 Attendance data received:', attendanceData.length);
        this.attendance = [...attendanceData];
      }

      // Always re-apply preserved corrections after any update
      this.applyPreservedCorrections();
    });
  }

  private applyPreservedCorrections(): void {
    console.log('🔄 Applying preserved corrections. Map size:', this.preservedCorrectionRequests.size);
    console.log('🔄 Attendance records to process:', this.attendance.map(r => ({ id: r.id, employee: r.employee })));

    // Apply stored correction requests to current attendance records
    this.attendance.forEach(record => {
      const preservedCorrection = this.preservedCorrectionRequests.get(record.id);
      if (preservedCorrection) {
        record.correctionRequest = preservedCorrection;
        console.log('✅ Applied correction to record id:', record.id, 'employee:', record.employee);
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
    console.log('📊 Final attendance with corrections:', this.filteredAttendance.map(r => ({
      id: r.id,
      employee: r.employee,
      hasCorrection: !!r.correctionRequest
    })));
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

filters: any = {};

onFiltersChange(filters: any) {
  this.attendancetableService.getAttendance(filters).subscribe((data: AttendanceTableRecord[]) => {
    this.attendance = data;
    this.filteredAttendance = data;
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
