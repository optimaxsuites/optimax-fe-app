import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { AttendashboardService } from '../../../../service/attendance/attendashboard.service';
import { AttendanceTableRecord } from '../../../../domain/attendance/attendancetable.dto';
import { CorrectionRequest } from '../../../../domain/attendance/correctionrequest.dto';
import {
  AttendanceSummaryDTO,
  LateArrivalDTO,
  AbsentEmployeeDTO
} from '../../../../domain/attendance/attendance-summary.dto';
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

  filteredAttendance: AttendanceTableRecord[] = [];
  attendance: AttendanceTableRecord[] = [];
  currentFilters: any = {};

  // Live dashboard data (from the attendance/* "today" endpoints)
  todayStats: AttendanceSummaryDTO | null = null;
  lateArrivals: LateArrivalDTO[] = [];
  absentees: AbsentEmployeeDTO[] = [];

  markingAttendance = false;
  markAttendanceMessage: string | null = null;

  pendingCorrectionsCount = 0;
  pendingCorrectionRequests: CorrectionRequest[] = [];
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

  calculateDashboardData() {
    const data = this.filteredAttendance;

    // Count pending items: modifications + correction requests
    const pendingModifications = data.filter(r => r.overriddenBy).length;
    const pendingCorrections = data.filter(r => r.correctionRequest?.status === 'PENDING').length;
    this.pendingCorrectionsCount = pendingModifications + pendingCorrections;

    // Count cross-branch and correction requests needing approval
    const crossBranch = data.filter(r => r.isCrossBranchAttendance ||
      (r.checkedInBranchId && r.homeBranchId && r.checkedInBranchId !== r.homeBranchId)).length;
    const correctionReqs = data.filter(r => r.correctionRequest?.status === 'PENDING').length;
    this.crossBranchCount = crossBranch;
    this.correctionRequestsCount = correctionReqs;
    this.pendingApprovalsCount = crossBranch + correctionReqs;
  }

  ngOnInit(): void {
    this.loadDashboardData();
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
            this.pendingCorrectionRequests = corrections.filter(r => r.status === 'PENDING');
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
          this.loadDashboardData();
        },
        error: (err) => {
          console.error('Error in auto-refresh interval:', err);
        }
      });
  }

  loadDashboardData(): void {
    this.attendashboardService.getTodayStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => this.todayStats = stats);

    this.attendashboardService.getLateArrivals()
      .pipe(takeUntil(this.destroy$))
      .subscribe(lateArrivals => this.lateArrivals = lateArrivals);

    this.attendashboardService.getAbsentees()
      .pipe(takeUntil(this.destroy$))
      .subscribe(absentees => this.absentees = absentees);
  }

  markAttendance(): void {
    this.markingAttendance = true;
    this.markAttendanceMessage = null;

    this.attendashboardService.markAttendance()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.markingAttendance = false;
        this.markAttendanceMessage = result
          ? (result.message || `Marked ${result.count} record(s)`)
          : 'Failed to mark attendance';

        if (result?.success) {
          this.loadDashboardData();
          this.attendanceService.fetchAllRecords();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshData(): void {
    this.attendanceService.fetchAllRecords();
    this.loadDashboardData();
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
