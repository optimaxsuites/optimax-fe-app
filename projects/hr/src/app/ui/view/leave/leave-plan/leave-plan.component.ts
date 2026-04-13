import { Component, OnInit } from '@angular/core';
import { CalendarOptions, EventInput, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { MessageService } from 'primeng/api';
import { LeaveApiService } from '../../../service/leave-api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MailNotificationService } from '../../../service/mailNotification.service';

@Component({
  selector: 'app-leave-plan',
  templateUrl: './leave-plan.component.html',
  styleUrls: ['./leave-plan.component.scss'],
  providers: [MessageService],
})
export class LeavePlanComponent implements OnInit {
  // submitting loader
  isSubmitting = false;

  // Current user data
  currentEmployee: any = null;
  currentEmployeeId: number | null = null;
  currentUserId: number | null = null;

  // API Data
  leavePlanRecords: any[] = [];
  leaveTypes: any[] = [];
  planningPolicy: any = null;

  // UI State
  showPlanModal = false;
  showEmergencyModal = false;
  isLoading = false;

  // Form fields
  selectedStartDate: string = '';
  selectedEndDate: string = '';
  selectedLeaveTypeObj: any = null;
  workingDays: number = 0;
  planReason: string = '';

  // Emergency form
  emergencyLeaveForm = {
    startDate: '',
    endDate: '',
    reason: '',
    leaveTypeObj: null as any,
  };
  today = new Date();
  todayStr =
    this.today.getFullYear() +
    '-' +
    String(this.today.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(this.today.getDate()).padStart(2, '0');

  // Calendar
  calendarEvents: EventInput[] = [];
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    selectable: true,
    selectMirror: true,
    select: this.handleDateSelect.bind(this),
    events: this.calendarEvents,
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'dayGridMonth',
    },
    height: 'auto',
    validRange: {
      start: this.todayStr,
      end: this.getFutureDate(365),
    },
  };

  // Store previous records to detect status changes
  private previousRecords: any[] = [];

  constructor(
    private messageService: MessageService,
    private apiService: LeaveApiService,
    private mailNotificationService: MailNotificationService,
  ) {}

  ngOnInit() {
    this.loadCurrentEmployee();
  }

  // ==================== STATUS CHANGE DETECTION ====================

  checkForStatusChanges(newRecords: any[]) {
    if (!this.previousRecords || this.previousRecords.length === 0) {
      // First load - store records but don't show notifications
      this.previousRecords = JSON.parse(JSON.stringify(newRecords));
      return;
    }

    newRecords.forEach((newRecord: any) => {
      const oldRecord = this.previousRecords.find(
        (r: any) => r.id === newRecord.id,
      );

      if (oldRecord && oldRecord.status !== newRecord.status) {
        // Status changed - show notification!
        this.showStatusChangeNotification(newRecord, oldRecord.status);
      }
    });

    // Update stored records
    this.previousRecords = JSON.parse(JSON.stringify(newRecords));
  }

  showStatusChangeNotification(record: any, oldStatus: string) {
    const statusMessages: any = {
      APPROVED: {
        severity: 'success',
        summary: '✅ Leave Plan Approved!',
        detail: `Your ${record.leaveType?.name} plan (${record.totalDays} days) from ${this.formatDate(record.startDate)} to ${this.formatDate(record.endDate)} has been approved.`,
      },
      REJECTED: {
        severity: 'error',
        summary: '❌ Leave Plan Rejected',
        detail: `Your ${record.leaveType?.name} plan was rejected. ${record.adminComment ? 'Reason: ' + record.adminComment : ''}`,
      },
    };

    const message = statusMessages[record.status];
    if (message) {
      this.messageService.add({
        ...message,
        key: 'tl',
        life: 10000,
        sticky: false,
      });
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // ==================== DATA LOADING ====================

  loadCurrentEmployee() {
    this.isLoading = true;

    this.apiService.getCurrentEmployee().subscribe({
      next: (employee) => {
        if (!employee) {
          this.messageService.add({
            severity: 'error',
            summary: 'Not Logged In',
            detail: 'Please log in to view leave plans',
            key: 'tl',
          });
          this.isLoading = false;
          return;
        }

        this.currentEmployee = employee;
        this.currentEmployeeId = employee.id;
        this.currentUserId = employee.user?.userId || employee.userId;

        console.log('Current employee loaded:', {
          employeeId: this.currentEmployeeId,
          userId: this.currentUserId,
          employee,
        });

        // Load all data
        this.loadAllData();
      },
      error: (err) => {
        console.error('❌ Failed to load current employee:', err);
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load employee data',
          key: 'tl',
        });
      },
    });
  }

  loadAllData() {
    this.isLoading = true;

    forkJoin({
      planRecords: this.apiService
        .getLeavePlanRecords()
        .pipe(catchError(() => of([]))),
      leaveTypes: this.apiService
        .getLeaveTypes()
        .pipe(catchError(() => of([]))),
      policies: this.apiService
        .getLeavePlanPolicies(1, 1)
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: (data) => {
        // Filter plan records for current user only (by userId)
        const allRecords = data.planRecords || [];
        const myRecords = allRecords.filter(
          (record: any) => record.createdBy?.userId === this.currentUserId,
        );

        console.log('📊 Filtered records:', {
          total: allRecords.length,
          mine: myRecords.length,
          currentUserId: this.currentUserId,
        });

        // Check for status changes
        this.checkForStatusChanges(myRecords);

        // Update current records (already sorted by API service)
        this.leavePlanRecords = myRecords;

        this.leaveTypes = data.leaveTypes || [];
        this.planningPolicy =
          data.policies && data.policies.length > 0
            ? data.policies[0]
            : {
                maxDaysPerMonth: 10,
                maxMonthPerYear: 3,
                emergencyLeaveDaysAllowed: 5,
                totalAllowedPlannedDays: 30,
                planningWindowDays: 90,
              };

        console.log('✅ Data loaded:', {
          planRecords: this.leavePlanRecords.length,
          leaveTypes: this.leaveTypes.length,
          policy: this.planningPolicy,
        });

        this.updateCalendarEvents();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Failed to load data:', err);
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load leave plan data',
          key: 'tl',
        });
      },
    });
  }

  // ==================== CALENDAR ====================

  getFutureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return (
      date.getFullYear() +
      '-' +
      String(date.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(date.getDate()).padStart(2, '0')
    );
  }

  handleDateSelect(selectInfo: DateSelectArg) {
    this.selectedStartDate = selectInfo.startStr;

    // Use endStr (safe string) instead of Date object
    const end = new Date(selectInfo.endStr);
    end.setDate(end.getDate() - 1);

    this.selectedEndDate =
      end.getFullYear() +
      '-' +
      String(end.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(end.getDate()).padStart(2, '0');

    this.calculateWorkingDays();
    this.showPlanModal = true;
  }

  calculateWorkingDays() {
    if (!this.selectedStartDate || !this.selectedEndDate) {
      this.workingDays = 0;
      return;
    }

    const start = new Date(this.selectedStartDate + 'T12:00:00');
    const end = new Date(this.selectedEndDate + 'T12:00:00');

    const diff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    this.workingDays = diff + 1;
  }

  updateCalendarEvents() {
    this.calendarEvents = this.leavePlanRecords.map((record) => ({
      title: `${record.leaveType?.name} (${record.totalDays}d)`,
      start: this.extractDate(record.startDate),
      end: this.addOneDay(this.extractDate(record.endDate)),
      backgroundColor: this.getStatusColor(record.status),
      borderColor: this.getStatusColor(record.status),
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.calendarEvents,
    };
  }

  extractDate(dateString: string): string {
    if (!dateString) return '';
    return dateString.split('T')[0];
  }

  getStatusColor(status: string): string {
    const colors: any = {
      PENDING: '#EAB308',
      APPROVED: '#22C55E',
      REJECTED: '#EF4444',
    };
    return colors[status] || '#6B7280';
  }

  addOneDay(date: string): string {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + 1);

    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  // ==================== SUBMIT PLAN ====================

  submitPlan() {
    if (!this.selectedLeaveTypeObj) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select a leave type',
        key: 'tl',
        life: 3000,
      });
      return;
    }

    if (!this.currentUserId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User ID not found',
        key: 'tl',
      });
      return;
    }
    this.isSubmitting = true;
    const toSafeISO = (date: string) =>
      new Date(date + 'T12:00:00').toISOString();

    // Build payload according to NEW backend format
    const payload = {
      createdBy: this.currentUserId, // userId (number)
      startDate: toSafeISO(this.selectedStartDate),
      endDate: toSafeISO(this.selectedEndDate),
      status: 'PENDING',
      leaveTypeId: this.selectedLeaveTypeObj.id, // leaveType ID (number)
      totalDays: this.workingDays,
      planReason: this.planReason || '',
      attachment: '',
      adminComment: '',
      decisionBy: null,
      decisionOn: null,
    };

    this.apiService.createLeavePlanRecord(payload).subscribe({
      next: (created) => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Leave Planned',
          detail: `${this.workingDays} days planned for ${this.selectedLeaveTypeObj.name}`,
          key: 'tl',
          life: 3000,
        });
        this.closePlanModal();
        this.loadAllData();
        const mailBody = {
          name:
            `${this.currentEmployee.firstName} ${this.currentEmployee.lastName}` ||
            'there',
          recieverEmail: this.currentEmployee.email,
          subject: `New Leave Plan Submitted`,
          body: `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">

    <p>Dear ${this.currentEmployee.firstName || 'User'},</p>

    <p>
      A new leave Plan has been successfully submitted. Below are the details:
    </p>

    <ul>
      <li><strong>Leave Type:</strong> ${payload.leaveTypeId}</li>
      <li><strong>Start Date:</strong> ${payload.startDate}</li>
      <li><strong>End Date:</strong> ${payload.endDate}</li>
      <li><strong>Total Days:</strong> ${payload.totalDays}</li>
      <li><strong>Reason:</strong> ${payload.planReason || 'N/A'}</li>
      <li><strong>Status:</strong> <span style="color:#f0ad4e;">PENDING</span></li>
    </ul>

    <p>
      Your Plan is currently under review. You will be notified once a decision is made.
    </p>

    <br/>

    <p>Regards,<br/>
    <strong>Management </strong></p>

    <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

    <p style="font-size:12px; color:#777;">
      This is an automated message. Please do not reply.
    </p>

  </div>
  `,
        };
        this.mailNotificationService.sendMail(mailBody).subscribe({
          next: (res) => console.log('📧 Mail sent:', res),
          error: (err) => console.error('❌ Mail failed:', err),
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(' Failed to create leave plan:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to submit leave plan. Please try again.',
          key: 'tl',
        });
      },
    });
  }

  // ==================== EMERGENCY LEAVE ====================

  openEmergencyLeave() {
    this.showEmergencyModal = true;
  }

  submitEmergencyLeave() {
    if (
      !this.emergencyLeaveForm.startDate ||
      !this.emergencyLeaveForm.endDate ||
      !this.emergencyLeaveForm.leaveTypeObj ||
      !this.emergencyLeaveForm.reason
    ) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill all required fields',
        key: 'tl',
      });
      return;
    }

    const start = new Date(this.emergencyLeaveForm.startDate);
    const end = new Date(this.emergencyLeaveForm.endDate);
    const days =
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    if (days > (this.planningPolicy?.emergencyLeaveDaysAllowed || 5)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Limit Exceeded',
        detail: `Emergency leave limited to ${this.planningPolicy?.emergencyLeaveDaysAllowed || 5} days`,
        key: 'tl',
      });
      return;
    }
    const toSafeISO = (date: string) =>
      new Date(date + 'T12:00:00').toISOString();

    const payload = {
      createdBy: this.currentUserId, // userId (number)
      startDate: toSafeISO(this.emergencyLeaveForm.startDate),
      endDate: toSafeISO(this.emergencyLeaveForm.endDate),
      status: 'PENDING',
      leaveTypeId: this.emergencyLeaveForm.leaveTypeObj.id, // leaveType ID (number)
      totalDays: days,
      planReason: `🚨 EMERGENCY: ${this.emergencyLeaveForm.reason}`,
      attachment: '',
      adminComment: '',
      decisionBy: null,
      decisionOn: null,
    };

    console.log('📤 Submitting emergency leave:', payload);

    this.apiService.createLeavePlanRecord(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Emergency Leave Submitted',
          detail:
            'Your emergency leave request has been sent for immediate review',
          key: 'tl',
          life: 5000,
        });
        this.closeEmergencyModal();
        this.loadAllData();
      },
      error: (err) => {
        console.error('❌ Failed to submit emergency leave:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to submit emergency leave',
          key: 'tl',
        });
      },
    });
  }

  // ==================== CANCEL PLAN ====================

  canEditPlan(plan: any): boolean {
    return plan.status === 'PENDING';
  }

  cancelPlan(plan: any) {
    if (!this.canEditPlan(plan)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Cancel',
        detail: 'Only pending plans can be cancelled',
        key: 'tl',
      });
      return;
    }

    this.apiService.deleteLeavePlanRecord(plan.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Plan Cancelled',
          detail: 'Leave plan cancelled successfully',
          key: 'tl',
        });
        this.loadAllData();
      },
      error: (err) => {
        console.error('❌ Failed to cancel plan:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to cancel leave plan',
          key: 'tl',
        });
      },
    });
  }

  // ==================== MODAL CONTROL ====================

  closePlanModal() {
    this.isSubmitting = false;
    this.showPlanModal = false;
    this.selectedStartDate = '';
    this.selectedEndDate = '';
    this.selectedLeaveTypeObj = null;
    this.workingDays = 0;
    this.planReason = '';
  }

  closeEmergencyModal() {
    this.showEmergencyModal = false;
    this.emergencyLeaveForm = {
      startDate: '',
      endDate: '',
      reason: '',
      leaveTypeObj: null,
    };
  }

  // ==================== STATISTICS ====================

  getTotalPlannedDays(): number {
    return this.leavePlanRecords
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + (r.totalDays || 0), 0);
  }

  getPlannedCount(): number {
    return this.leavePlanRecords.filter((r) => r.status === 'PENDING').length;
  }

  getPendingCount(): number {
    return this.leavePlanRecords.filter((r) => r.status === 'PENDING').length;
  }

  getApprovedCount(): number {
    return this.leavePlanRecords.filter((r) => r.status === 'APPROVED').length;
  }

  getRejectedCount(): number {
    return this.leavePlanRecords.filter((r) => r.status === 'REJECTED').length;
  }

  getPlannedPercentage(): number {
    if (this.leavePlanRecords.length === 0) return 0;
    return (this.getPendingCount() / this.leavePlanRecords.length) * 100;
  }

  getPendingPercentage(): number {
    if (this.leavePlanRecords.length === 0) return 0;
    return (this.getPendingCount() / this.leavePlanRecords.length) * 100;
  }

  getApprovedPercentage(): number {
    if (this.leavePlanRecords.length === 0) return 0;
    return (this.getApprovedCount() / this.leavePlanRecords.length) * 100;
  }

  getRejectedPercentage(): number {
    if (this.leavePlanRecords.length === 0) return 0;
    return (this.getRejectedCount() / this.leavePlanRecords.length) * 100;
  }

  // ==================== COMPUTED PROPERTIES ====================

  get plannedLeaves() {
    return this.leavePlanRecords.map((record) => ({
      ...record,
      startDate: this.formatDate(record.startDate),
      endDate: this.formatDate(record.endDate),
      leaveType: record.leaveType?.name || 'N/A',
      workingDays: record.totalDays,
      notes: record.planReason,
    }));
  }

  get planningWindowDays() {
    return this.planningPolicy?.planningWindowDays || 90;
  }

  get monthlyPlanSummary() {
    const monthMap = new Map();

    this.leavePlanRecords
      .filter((r) => r.status === 'APPROVED')
      .forEach((record) => {
        const month = new Date(record.startDate).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        monthMap.set(
          month,
          (monthMap.get(month) || 0) + (record.totalDays || 0),
        );
      });

    return Array.from(monthMap.entries()).map(([month, daysPlanned]) => ({
      month,
      daysPlanned,
      maxDays: this.planningPolicy?.maxDaysPerMonth || 10,
      remaining:
        (this.planningPolicy?.maxDaysPerMonth || 10) - (daysPlanned as number),
    }));
  }
}
