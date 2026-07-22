import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TimesheetDTO, TimesheetStatus } from '../../../domain/timesheet/timesheet.dto';

@Component({
  selector: 'app-timesheet-approvals',
  templateUrl: './timesheet-approvals.component.html',
  styleUrl: './timesheet-approvals.component.scss'
})
export class TimesheetApprovalsComponent implements OnInit {
  pendingTimesheets: TimesheetDTO[] = [];
  selectedTimesheet: TimesheetDTO | null = null;
  isApproving = false;
  approvalNotes = '';
  rejectionReason = '';
  showRejectionForm = false;
  filterStatus: TimesheetStatus | 'ALL' = 'IN_APPROVAL';

  statusConfig = {
    DRAFT: { label: 'Draft', color: '#94a3b8', icon: 'fa-file' },
    SUBMITTED: { label: 'Submitted', color: '#3b82f6', icon: 'fa-paper-plane' },
    IN_APPROVAL: { label: 'In Approval', color: '#f59e0b', icon: 'fa-hourglass' },
    APPROVED: { label: 'Approved', color: '#10b981', icon: 'fa-check' },
    LOCKED: { label: 'Locked', color: '#6366f1', icon: 'fa-lock' }
  };

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.loadPendingTimesheets();
  }

  loadPendingTimesheets(): void {
    // TODO: Replace with actual service call
    this.pendingTimesheets = [
      {
        id: '1',
        employeeId: '101',
        employeeName: 'John Doe',
        departmentName: 'Engineering',
        weekStartDate: '2026-07-14',
        weekEndDate: '2026-07-20',
        entries: [
          { date: '2026-07-14', dayOfWeek: 'Monday', scheduledHours: 8, actualClockIn: '09:00', actualClockOut: '17:00', actualHoursWorked: 8, projectName: 'Project A', taskDescription: 'Development' },
          { date: '2026-07-15', dayOfWeek: 'Tuesday', scheduledHours: 8, actualClockIn: '09:15', actualClockOut: '17:30', actualHoursWorked: 8.25, projectName: 'Project A', taskDescription: 'Development' },
          { date: '2026-07-16', dayOfWeek: 'Wednesday', scheduledHours: 8, actualClockIn: '08:45', actualClockOut: '17:00', actualHoursWorked: 8.25, projectName: 'Project B', taskDescription: 'Testing' },
          { date: '2026-07-17', dayOfWeek: 'Thursday', scheduledHours: 8, actualClockIn: '09:00', actualClockOut: '17:00', actualHoursWorked: 8, projectName: 'Project B', taskDescription: 'Testing' },
          { date: '2026-07-18', dayOfWeek: 'Friday', scheduledHours: 8, actualClockIn: '09:00', actualClockOut: '16:30', actualHoursWorked: 7.5, projectName: 'Project A', taskDescription: 'Code Review' }
        ],
        totalScheduledHours: 40,
        totalActualHours: 40,
        variance: 0,
        status: 'IN_APPROVAL',
        submittedDate: '2026-07-20T10:30:00Z',
        lineManagerName: 'Manager Name'
      },
      {
        id: '2',
        employeeId: '102',
        employeeName: 'Jane Smith',
        departmentName: 'Engineering',
        weekStartDate: '2026-07-14',
        weekEndDate: '2026-07-20',
        entries: [
          { date: '2026-07-14', dayOfWeek: 'Monday', scheduledHours: 8, actualClockIn: '08:30', actualClockOut: '16:45', actualHoursWorked: 8.25, projectName: 'Project C', taskDescription: 'Design' }
        ],
        totalScheduledHours: 40,
        totalActualHours: 39.5,
        variance: -0.5,
        status: 'IN_APPROVAL',
        submittedDate: '2026-07-20T11:00:00Z'
      },
      {
        id: '3',
        employeeId: '103',
        employeeName: 'Bob Johnson',
        departmentName: 'Sales',
        weekStartDate: '2026-07-14',
        weekEndDate: '2026-07-20',
        entries: [],
        totalScheduledHours: 40,
        totalActualHours: 38,
        variance: -2,
        status: 'SUBMITTED',
        submittedDate: '2026-07-20T09:15:00Z'
      }
    ];
  }

  selectTimesheet(timesheet: TimesheetDTO): void {
    this.selectedTimesheet = timesheet;
    this.approvalNotes = '';
    this.rejectionReason = '';
    this.showRejectionForm = false;
  }

  getFilteredTimesheets(): TimesheetDTO[] {
    if (this.filterStatus === 'ALL') {
      return this.pendingTimesheets;
    }
    return this.pendingTimesheets.filter(ts => ts.status === this.filterStatus);
  }

  getPendingCount(): number {
    return this.pendingTimesheets.filter(ts => ts.status === 'IN_APPROVAL').length;
  }

  getSubmittedCount(): number {
    return this.pendingTimesheets.filter(ts => ts.status === 'SUBMITTED').length;
  }

  approveTimesheet(): void {
    if (!this.selectedTimesheet) return;

    this.isApproving = true;
    setTimeout(() => {
      this.selectedTimesheet!.status = 'APPROVED';
      this.selectedTimesheet!.approvalDate = new Date().toISOString();
      this.selectedTimesheet!.approvalNotes = this.approvalNotes;
      this.isApproving = false;

      this.messageService.add({
        severity: 'success',
        summary: 'Approved',
        detail: `${this.selectedTimesheet!.employeeName}'s timesheet approved successfully.`,
        key: 'global'
      });

      this.selectedTimesheet = null;
      this.approvalNotes = '';
      this.loadPendingTimesheets();
    }, 1000);
  }

  rejectTimesheet(): void {
    if (!this.selectedTimesheet || !this.rejectionReason.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Required',
        detail: 'Please provide a rejection reason.',
        key: 'global'
      });
      return;
    }

    this.isApproving = true;
    setTimeout(() => {
      this.selectedTimesheet!.status = 'DRAFT';
      this.selectedTimesheet!.rejectionReason = this.rejectionReason;
      this.selectedTimesheet!.rejectionDate = new Date().toISOString();
      this.isApproving = false;
      this.showRejectionForm = false;
      this.rejectionReason = '';

      this.messageService.add({
        severity: 'info',
        summary: 'Rejected',
        detail: `${this.selectedTimesheet!.employeeName} has been notified to make corrections.`,
        key: 'global'
      });

      this.selectedTimesheet = null;
      this.loadPendingTimesheets();
    }, 1000);
  }

  getStatusColor(status: string): string {
    return this.statusConfig[status as TimesheetStatus]?.color || '#94a3b8';
  }

  getStatusIcon(status: string): string {
    return this.statusConfig[status as TimesheetStatus]?.icon || 'fa-file';
  }

  getStatusLabel(status: string): string {
    return this.statusConfig[status as TimesheetStatus]?.label || status;
  }

  calculateVariance(timesheet: TimesheetDTO): number {
    return timesheet.totalActualHours - timesheet.totalScheduledHours;
  }
}
