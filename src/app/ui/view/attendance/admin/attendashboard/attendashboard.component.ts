import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { AttendashboardService } from '../../../../service/attendance/attendashboard.service';
import { AttendanceTableRecord } from '../../../../domain/attendance/attendancetable.dto';
import { AttendancetableService } from '../../../../service/attendance/attendancetable.service';
import { AdminCorrectionApprovalService } from '../../../../service/attendance/admin-correction-approval.service';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-attendashboard',
  templateUrl: './attendashboard.component.html',
  styleUrl: './attendashboard.component.scss'
})
export class AttendashboardComponent implements OnInit, OnDestroy{

  private attendashboardService = inject(AttendashboardService);
  private attendanceService = inject(AttendancetableService);
  private correctionRequestService = inject(AdminCorrectionApprovalService);
  private destroy$ = new Subject<void>();

  stats$ = this.attendashboardService.getTodayStats();
  lateArrivals$ = this.attendashboardService.getLateArrivals();
  statsData: any;
  lateArrivalsData: any[] = [];
  filteredAttendance: AttendanceTableRecord[] = [];
  attendance: AttendanceTableRecord[] = [];
  currentFilters: any = {};

  // Summary cards data
  presentCount = 0;
  lateCount = 0;
  absentCount = 0;
  pendingCorrectionsCount = 0;
  pendingCorrectionRequests: AttendanceTableRecord[] = [];
  pendingApprovalsCount = 0;
  crossBranchCount = 0;
  correctionRequestsCount = 0;
  activeCard: string | null = null;

  @ViewChild('attendanceTable') attendanceTableComponent: any;

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

  // Count cross-branch and correction requests needing approval
  const crossBranch = data.filter(r => r.isCrossBranchAttendance ||
    (r.checkedInBranchId && r.homeBranchId && r.checkedInBranchId !== r.homeBranchId)).length;
  const correctionReqs = data.filter(r => r.correctionRequest?.status === 'PENDING').length;
  this.crossBranchCount = crossBranch;
  this.correctionRequestsCount = correctionReqs;
  this.pendingApprovalsCount = crossBranch + correctionReqs;

  //stats - handle zero total to avoid NaN
  const safeTotal = total > 0 ? total : 1;
  this.statsData = {
    present: ((present / safeTotal) * 100).toFixed(1),
    absent: ((absent / safeTotal) * 100).toFixed(1),
    late: ((late / safeTotal) * 100).toFixed(1),
    onLeave: ((onLeave / safeTotal) * 100).toFixed(1)
  };

 //latearrivals
  this.lateArrivalsData = data
    .filter(r => r.status === 'LATE')
    .map(r => ({
      id: r.id,
      name: r.employee,
      time: r.checkIn
    }));
}

  ngOnInit(): void {
    this.attendanceService.fetchAllRecords();

    this.attendanceService.attendance$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.attendance = data;
          const today = this.formatDateLocal(new Date());
          const todaysData = data.filter(r => r.date ? this.formatDateLocal(r.date) === today : false);
          this.filteredAttendance = todaysData;
          this.calculateDashboardData();
        },
        error: (err) => {
          console.error('Error loading attendance data:', err);
        }
      });

    this.correctionRequestService.correctionRequests$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (corrections) => {
          if (corrections.length > 0) {
            this.pendingCorrectionRequests = corrections.filter(r => r.correctionRequest?.status === 'PENDING');
            const pendingModifications = this.filteredAttendance.filter(r => r.overriddenBy).length;
            const pendingCorrections = this.pendingCorrectionRequests.length;
            this.pendingCorrectionsCount = pendingModifications + pendingCorrections;
          }
        },
        error: (err) => {
          console.error('Error loading correction requests:', err);
        }
      });

    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.attendanceService.fetchAllRecords();
        },
        error: (err) => {
          console.error('Error in auto-refresh interval:', err);
        }
      });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshData(): void {
    this.attendanceService.fetchAllRecords();
  }

  filterByStatus(status: 'PRESENT' | 'LATE' | 'ABSENT'): void {
    this.activeCard = status;
    this.currentFilters = { status };
    // Filter the table but keep card counts static (don't recalculate)
    this.filteredAttendance = this.attendance.filter(r => r.status === status);
  }

  filterByPendingApproval(): void {
    if (this.pendingApprovalsCount === 0) return;

    this.activeCard = 'PENDING_APPROVAL';
    this.currentFilters = { status: 'PENDING_APPROVAL' };
    // Show only records that need approval
    this.filteredAttendance = this.attendance.filter(r =>
      (r.isCrossBranchAttendance ||
      (r.checkedInBranchId && r.homeBranchId && r.checkedInBranchId !== r.homeBranchId)) ||
      r.correctionRequest?.status === 'PENDING'
    );
  }

  clearCardFilter(): void {
    this.activeCard = null;
    this.currentFilters = {};
    this.filteredAttendance = this.attendance;
  }

  private formatDateLocal(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

}
