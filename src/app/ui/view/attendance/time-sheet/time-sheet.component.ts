import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TimesheetDTO, TimesheetStatus, TimesheetEntry } from '../../../domain/timesheet/timesheet.dto';

@Component({
  selector: 'app-time-sheet',
  templateUrl: './time-sheet.component.html',
  styleUrl: './time-sheet.component.scss'
})
export class TimeSheetComponent implements OnInit {
  timesheets: TimesheetDTO[] = [];
  selectedTimesheet: TimesheetDTO | null = null;
  currentStatus: TimesheetStatus = 'DRAFT';
  isEditMode = false;
  isSubmitting = false;
  isApproving = false;
  rejectionReason = '';
  approvalNotes = '';
  showRejectionForm = false;

  statusConfig = {
    DRAFT: { label: 'Draft', color: '#94a3b8', icon: 'fa-file' },
    SUBMITTED: { label: 'Submitted', color: '#3b82f6', icon: 'fa-paper-plane' },
    IN_APPROVAL: { label: 'In Approval', color: '#f59e0b', icon: 'fa-hourglass' },
    APPROVED: { label: 'Approved', color: '#10b981', icon: 'fa-check' },
    LOCKED: { label: 'Locked', color: '#6366f1', icon: 'fa-lock' }
  };

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.loadTimesheets();
  }

  loadTimesheets(): void {
    // TODO: Replace with actual service call
    this.timesheets = [
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
        status: 'DRAFT',
        createdAt: '2026-07-20'
      }
    ];
    if (this.timesheets.length > 0) {
      this.selectTimesheet(this.timesheets[0]);
    }
  }

  selectTimesheet(timesheet: TimesheetDTO): void {
    this.selectedTimesheet = timesheet;
    this.currentStatus = timesheet.status;
    this.rejectionReason = '';
    this.approvalNotes = '';
    this.showRejectionForm = false;
  }

  canEdit(): boolean {
    return this.currentStatus === 'DRAFT' && !this.isEditMode;
  }

  canSubmit(): boolean {
    return this.currentStatus === 'DRAFT' && this.selectedTimesheet?.entries.length === 5;
  }

  canApprove(): boolean {
    return this.currentStatus === 'IN_APPROVAL';
  }

  isApprovalStep(): boolean {
    return this.currentStatus === 'IN_APPROVAL';
  }

  isLocked(): boolean {
    return this.currentStatus === 'LOCKED';
  }

  startEdit(): void {
    if (this.canEdit()) {
      this.isEditMode = true;
    }
  }

  cancelEdit(): void {
    this.isEditMode = false;
  }

  saveChanges(): void {
    if (this.selectedTimesheet) {
      this.selectedTimesheet.updatedAt = new Date().toISOString();
      this.messageService.add({
        severity: 'success',
        summary: 'Saved',
        detail: 'Timesheet changes saved successfully.',
        key: 'global'
      });
      this.isEditMode = false;
    }
  }

  submitTimesheet(): void {
    if (!this.selectedTimesheet) return;

    this.isSubmitting = true;
    setTimeout(() => {
      this.selectedTimesheet!.status = 'SUBMITTED';
      this.selectedTimesheet!.submittedDate = new Date().toISOString();
      this.currentStatus = 'SUBMITTED';
      this.isSubmitting = false;

      this.messageService.add({
        severity: 'success',
        summary: 'Submitted',
        detail: 'Timesheet submitted to line manager for approval.',
        key: 'global'
      });

      setTimeout(() => {
        this.currentStatus = 'IN_APPROVAL';
        this.selectedTimesheet!.status = 'IN_APPROVAL';
        this.messageService.add({
          severity: 'info',
          summary: 'Status Updated',
          detail: 'Timesheet moved to IN_APPROVAL status.',
          key: 'global'
        });
      }, 1500);
    }, 1000);
  }

  approveTimesheet(): void {
    if (!this.selectedTimesheet) return;

    this.isApproving = true;
    setTimeout(() => {
      this.selectedTimesheet!.status = 'APPROVED';
      this.selectedTimesheet!.approvalDate = new Date().toISOString();
      this.selectedTimesheet!.approvalNotes = this.approvalNotes;
      this.currentStatus = 'APPROVED';
      this.isApproving = false;

      this.messageService.add({
        severity: 'success',
        summary: 'Approved',
        detail: 'Timesheet approved successfully. Ready for payroll processing.',
        key: 'global'
      });
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
      this.currentStatus = 'DRAFT';
      this.isApproving = false;
      this.showRejectionForm = false;
      this.rejectionReason = '';

      this.messageService.add({
        severity: 'info',
        summary: 'Rejected',
        detail: 'Timesheet rejected. Employee has been notified to make corrections.',
        key: 'global'
      });
    }, 1000);
  }

  lockTimesheet(): void {
    if (!this.selectedTimesheet) return;

    this.selectedTimesheet.status = 'LOCKED';
    this.selectedTimesheet.lockedDate = new Date().toISOString();
    this.currentStatus = 'LOCKED';

    this.messageService.add({
      severity: 'success',
      summary: 'Locked',
      detail: 'Timesheet locked and sent to payroll processing.',
      key: 'global'
    });
  }

  getStatusColor(status: TimesheetStatus): string {
    return this.statusConfig[status]?.color || '#94a3b8';
  }

  getStatusIcon(status: TimesheetStatus): string {
    return this.statusConfig[status]?.icon || 'fa-file';
  }

  getStatusLabel(status: TimesheetStatus): string {
    return this.statusConfig[status]?.label || status;
  }

  calculateVariance(): number {
    if (!this.selectedTimesheet) return 0;
    return this.selectedTimesheet.totalActualHours - this.selectedTimesheet.totalScheduledHours;
  }
}
