import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AttendashboardService } from '../../../../service/attendance/attendashboard.service';
import { AttendanceTableRecord } from '../../../../domain/attendance/attendancetable.dto';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { CorrectionRequestService } from '../../../../service/attendance/correction-request.service';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-attendashboard',
  templateUrl: './attendashboard.component.html',
  styleUrl: './attendashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendashboardComponent implements OnInit, OnDestroy{

  private attendashboardService = inject(AttendashboardService);
  private attendanceService = inject(AttendancetableService);
  private correctionRequestService = inject(CorrectionRequestService);
  private destroy$ = new Subject<void>();

  stats$ = this.attendashboardService.getTodayStats();
  heatmap$ = this.attendashboardService.getDepartmentHeatmap();
  lateArrivals$ = this.attendashboardService.getLateArrivals();
  statsData: any;
  heatmapData: { department: string; attendance: number }[] = [];
  lateArrivalsData: any[] = [];
  filteredAttendance: AttendanceTableRecord[] = [];
  currentFilters: any = {};

  // Summary cards data
  presentCount = 0;
  lateCount = 0;
  absentCount = 0;
  pendingCorrectionsCount = 0;
  pendingCorrectionRequests: AttendanceTableRecord[] = [];

  onDataChange(event: { data: AttendanceTableRecord[], filters:any }) {
  this.filteredAttendance = event.data;
  this.currentFilters = event.filters;
  this.calculateDashboardData();
}
  calculateDashboardData() {const data = this.filteredAttendance;

  const total = data.length;

  const present = data.filter(r => r.status === 'PRESENT').length;
  const absent = data.filter(r => r.status === 'ABSENT').length;
  const late = data.filter(r => r.status === 'LATE').length;
  const onLeave = data.filter(r => r.status === 'ON_LEAVE').length;

  // Summary cards
  this.presentCount = present;
  this.lateCount = late;
  this.absentCount = absent;

  // Count pending items: modifications + correction requests
  const pendingModifications = data.filter(r => r.overriddenBy).length;
  const pendingCorrections = data.filter(r => r.correctionRequest?.status === 'PENDING').length;
  this.pendingCorrectionsCount = pendingModifications + pendingCorrections;
  this.pendingCorrectionRequests = data.filter(r => r.correctionRequest?.status === 'PENDING');

  //stats
  this.statsData = {
    present: ((present / total) * 100).toFixed(1),
    absent: ((absent / total) * 100).toFixed(1),
    late: ((late / total) * 100).toFixed(1),
    onLeave: ((onLeave / total) * 100).toFixed(1)
  };

 //latearrivals
  this.lateArrivalsData = data
    .filter(r => r.status === 'LATE')
    .map(r => ({
      id: r.id,
      name: r.employee,
      time: r.checkIn
    }));

 //heatmap

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

  const departmentRates = Object.keys(departmentMap).map(dept => {
    const deptData = departmentMap[dept];
    const rate = (deptData.present / deptData.total) * 100;

    return {
      department: dept,
      attendance: Number(rate.toFixed(1))
    };
  });

  this.heatmapData = departmentRates
    .sort((a, b) => b.attendance - a.attendance)
    .slice(0, 3);
}

  ngOnInit(): void {
    // Initial load
    this.attendanceService.fetchAllRecords();

    // Subscribe to attendance data updates
    this.attendanceService.attendance$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        const today = new Date().toISOString().split('T')[0];
        const todaysData = data.filter(r => r.date === today);
        this.filteredAttendance = todaysData;
        this.calculateDashboardData();
        console.log('✅ Admin dashboard updated:', todaysData.length, 'records for today');
      });

    // Subscribe to correction requests and update pending count
    this.correctionRequestService.correctionRequests$
      .pipe(takeUntil(this.destroy$))
      .subscribe(corrections => {
        if (corrections.length > 0) {
          this.pendingCorrectionRequests = corrections.filter(r => r.correctionRequest?.status === 'PENDING');
          const pendingModifications = this.filteredAttendance.filter(r => r.overriddenBy).length;
          const pendingCorrections = this.pendingCorrectionRequests.length;
          this.pendingCorrectionsCount = pendingModifications + pendingCorrections;
          console.log('📋 Pending corrections updated:', this.pendingCorrectionsCount);
        }
      });

    // Auto-refresh every 30 seconds to catch employee clock-ins
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 Auto-refreshing attendance data...');
        this.attendanceService.fetchAllRecords();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Allow manual refresh
  refreshData(): void {
    console.log('🔄 Manual refresh triggered');
    this.attendanceService.fetchAllRecords();
  }

}
