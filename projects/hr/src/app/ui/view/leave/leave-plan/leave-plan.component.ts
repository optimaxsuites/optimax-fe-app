import { Component, OnInit } from '@angular/core';
import { CalendarOptions, EventInput, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { MessageService } from 'primeng/api';
import { LeaveApiService } from '../../../service/leave-api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-leave-plan',
  templateUrl: './leave-plan.component.html',
  styleUrls: ['./leave-plan.component.scss'],
  providers: [MessageService],
})
export class LeavePlanComponent implements OnInit {
  // Current user data
  currentEmployee: any = null;
  currentEmployeeId: number | null = null;

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
      start: new Date().toISOString().split('T')[0],
      end: this.getFutureDate(365),
    },
  };

  // Store previous records to detect status changes
  private previousRecords: any[] = [];

  constructor(
    private messageService: MessageService,
    private apiService: LeaveApiService
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
      const oldRecord = this.previousRecords.find((r: any) => r.id === newRecord.id);
      
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
      'APPROVED': {
        severity: 'success',
        summary: '✅ Leave Plan Approved!',
        detail: `Your ${record.leaveType?.name} plan (${record.totalDays} days) from ${this.formatDate(record.startDate)} to ${this.formatDate(record.endDate)} has been approved.`
      },
      'REJECTED': {
        severity: 'error',
        summary: '❌ Leave Plan Rejected',
        detail: `Your ${record.leaveType?.name} plan was rejected. ${record.adminComment ? 'Reason: ' + record.adminComment : ''}`
      }
    };

    const message = statusMessages[record.status];
    if (message) {
      this.messageService.add({
        ...message,
        key: 'tl',
        life: 10000, // Show for 10 seconds
        sticky: false
      });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
            key: 'tl'
          });
          this.isLoading = false;
          return;
        }

        this.currentEmployee = employee;
        this.currentEmployeeId = employee.id;

        console.log('✅ Current employee loaded:', employee);

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
          key: 'tl'
        });
      }
    });
  }

  loadAllData() {
    this.isLoading = true;

    forkJoin({
      planRecords: this.apiService.getLeavePlanRecords().pipe(catchError(() => of([]))),
      leaveTypes: this.apiService.getLeaveTypes().pipe(catchError(() => of([]))),
      policies: this.apiService.getLeavePlanPolicies(1, 1).pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        // Filter plan records for current employee only
        const myRecords = (data.planRecords || []).filter(
          (record: any) => record.createdBy?.id === this.currentEmployeeId
        );

        // Check for status changes
        this.checkForStatusChanges(myRecords);

        // Update current records
        this.leavePlanRecords = myRecords;

        this.leaveTypes = data.leaveTypes || [];
        this.planningPolicy = data.policies && data.policies.length > 0
          ? data.policies[0]
          : { 
              maxDaysPerMonth: 10, 
              maxMonthPerYear: 3, 
              emergencyLeaveDaysAllowed: 5,
              totalAllowedPlannedDays: 30,
              planningWindowDays: 90
            };

        console.log('✅ Data loaded:', {
          planRecords: this.leavePlanRecords.length,
          leaveTypes: this.leaveTypes.length,
          policy: this.planningPolicy
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
          key: 'tl'
        });
      }
    });
  }

  // ==================== CALENDAR ====================

  getFutureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  handleDateSelect(selectInfo: DateSelectArg) {
    this.selectedStartDate = selectInfo.startStr;

    const endDate = new Date(selectInfo.end);
    endDate.setDate(endDate.getDate() - 1);
    this.selectedEndDate = endDate.toISOString().split('T')[0];

    this.calculateWorkingDays();
    this.showPlanModal = true;
  }

  calculateWorkingDays() {
    if (!this.selectedStartDate || !this.selectedEndDate) {
      this.workingDays = 0;
      return;
    }

    const start = new Date(this.selectedStartDate);
    const end = new Date(this.selectedEndDate);
    const timeDiff = end.getTime() - start.getTime();
    this.workingDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }

  updateCalendarEvents() {
    this.calendarEvents = this.leavePlanRecords.map((record) => ({
      title: `${record.leaveType?.name} (${record.totalDays}d)`,
      start: record.startDate.split('T')[0],
      end: this.addOneDay(record.endDate.split('T')[0]),
      backgroundColor: this.getStatusColor(record.status),
      borderColor: this.getStatusColor(record.status),
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.calendarEvents,
    };
  }

  getStatusColor(status: string): string {
    const colors: any = {
      'PENDING': '#EAB308',
      'APPROVED': '#22C55E',
      'REJECTED': '#EF4444'
    };
    return colors[status] || '#6B7280';
  }

  addOneDay(date: string): string {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
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

    if (!this.currentEmployee) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Employee data not loaded',
        key: 'tl',
      });
      return;
    }

    // Build createdBy object
    const fullname = this.currentEmployee.fullname ||
      `${this.currentEmployee.firstName || ''} ${this.currentEmployee.lastName || ''}`.trim();

    const createdBy = {
      id: this.currentEmployee.id,
      fullname: fullname
    };

    // Build payload
    const payload = {
      createdBy: createdBy,
      startDate: new Date(this.selectedStartDate).toISOString(),
      endDate: new Date(this.selectedEndDate).toISOString(),
      status: 'PENDING',
      leaveType: this.selectedLeaveTypeObj,
      totalDays: this.workingDays,
      planReason: this.planReason || '',
      attachment: null
    };

    console.log('📤 Submitting leave plan:', payload);

    this.apiService.createLeavePlanRecord(payload).subscribe({
      next: (created) => {
        console.log('✅ Leave plan created:', created);
        this.messageService.add({
          severity: 'success',
          summary: 'Leave Planned',
          detail: `${this.workingDays} days planned for ${this.selectedLeaveTypeObj.name}`,
          key: 'tl',
          life: 3000,
        });
        this.closePlanModal();
        this.loadAllData(); // Reload to get updated data
      },
      error: (err) => {
        console.error('❌ Failed to create leave plan:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to submit leave plan',
          key: 'tl',
        });
      }
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
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    if (days > (this.planningPolicy?.emergencyLeaveDaysAllowed || 5)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Limit Exceeded',
        detail: `Emergency leave limited to ${this.planningPolicy?.emergencyLeaveDaysAllowed || 5} days`,
        key: 'tl',
      });
      return;
    }

    const fullname = this.currentEmployee.fullname ||
      `${this.currentEmployee.firstName || ''} ${this.currentEmployee.lastName || ''}`.trim();

    const payload = {
      createdBy: {
        id: this.currentEmployee.id,
        fullname: fullname
      },
      startDate: new Date(this.emergencyLeaveForm.startDate).toISOString(),
      endDate: new Date(this.emergencyLeaveForm.endDate).toISOString(),
      status: 'PENDING',
      leaveType: this.emergencyLeaveForm.leaveTypeObj,
      totalDays: days,
      planReason: `🚨 EMERGENCY: ${this.emergencyLeaveForm.reason}`,
      attachment: null
    };

    this.apiService.createLeavePlanRecord(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Emergency Leave Submitted',
          detail: 'Your emergency leave request has been sent for immediate review',
          key: 'tl',
          life: 5000,
        });
        this.closeEmergencyModal();
        this.loadAllData(); // Reload to get updated data
      },
      error: (err) => {
        console.error('❌ Failed to submit emergency leave:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to submit emergency leave',
          key: 'tl',
        });
      }
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

    if (!confirm(`Cancel this leave plan (${plan.totalDays} days)?`)) {
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
        this.loadAllData(); // Reload to get updated data
      },
      error: (err) => {
        console.error('❌ Failed to cancel plan:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to cancel leave plan',
          key: 'tl',
        });
      }
    });
  }

  // ==================== MODAL CONTROL ====================

  closePlanModal() {
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
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.totalDays, 0);
  }

  getPlannedCount(): number {
    return this.leavePlanRecords.filter(r => r.status === 'PENDING').length;
  }

  getPendingCount(): number {
    return this.leavePlanRecords.filter(r => r.status === 'PENDING').length;
  }

  getApprovedCount(): number {
    return this.leavePlanRecords.filter(r => r.status === 'APPROVED').length;
  }

  getRejectedCount(): number {
    return this.leavePlanRecords.filter(r => r.status === 'REJECTED').length;
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
    return this.leavePlanRecords.map(record => ({
      ...record,
      startDate: this.formatDate(record.startDate),
      endDate: this.formatDate(record.endDate),
      leaveType: record.leaveType?.name || 'N/A',
      workingDays: record.totalDays,
      notes: record.planReason
    }));
  }

  get planningWindowDays() {
    return this.planningPolicy?.planningWindowDays || 90;
  }

  get monthlyPlanSummary() {
    // Calculate monthly summary from approved plans only
    const monthMap = new Map();
    
    this.leavePlanRecords
      .filter(r => r.status === 'APPROVED')
      .forEach(record => {
        const month = new Date(record.startDate).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
        monthMap.set(month, (monthMap.get(month) || 0) + record.totalDays);
      });

    return Array.from(monthMap.entries()).map(([month, daysPlanned]) => ({
      month,
      daysPlanned,
      maxDays: this.planningPolicy?.maxDaysPerMonth || 10,
      remaining: (this.planningPolicy?.maxDaysPerMonth || 10) - (daysPlanned as number)
    }));
  }
}