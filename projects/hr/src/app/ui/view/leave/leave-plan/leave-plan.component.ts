import { Component, OnInit } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { LeaveServiceService } from '../../../service/leave-service.service';
import {
  Employee,
  LeaveSettings,
  MonthlyPlanSummary,
  LeavePlanningPolicy,
  PlannedLeave,
} from '../../../domain/leave.dto';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';

// interface PlannedLeave {
//   id: string;
//   employeeId: string;
//   startDate: string;
//   endDate: string;
//   leaveType: string;
//   workingDays: number;
//   notes: string;
//   status: 'Planned' | 'Pending' | 'Approved';
//   createdOn: string;
// }

@Component({
  selector: 'app-leave-plan',
  templateUrl: './leave-plan.component.html',
  styleUrl: './leave-plan.component.scss',
  providers: [MessageService],
})
export class LeavePlanComponent implements OnInit {
  employee!: Employee;
  leaveSettings!: LeaveSettings;
  leaveTypes: string[] = [];

  // Modal state
  showPlanModal = false;
  showEmergencyModal = false;

  // Form fields
  selectedStartDate: string = '';
  selectedEndDate: string = '';
  selectedLeaveType: string = '';
  workingDays: number = 0;
  planNotes: string = '';

  // Data
  plannedLeaves: PlannedLeave[] = [];

  // Policy
  planningWindowDays = 90;
  maxDaysPerPlan = 14;
  totalAllowedPlannedDays = 30;
  planningPolicy!: LeavePlanningPolicy;
  monthlyPlanSummary: MonthlyPlanSummary[] = [];
  emergencyLeaveForm = {
    startDate: '',
    endDate: '',
    reason: '',
    leaveType: '',
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
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek',
    },
    height: 'auto',
    validRange: {
      start: new Date().toISOString().split('T')[0],
      end: this.getFutureDate(90),
    },
  };

  constructor(
    private messageService: MessageService,
    private token: RandomTokenService,
    private leaveService: LeaveServiceService,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  // loadData() {
  //   this.employee = this.leaveService.getEmployeeById('EMP-001');
  //   this.leaveSettings = this.leaveService.getLeaveSettings();
  //   this.leaveTypes = this.leaveSettings.leaveTypes
  //     .filter((leave) => leave.isActive)
  //     .map((leave) => leave.typeName);

  //   // this.loadPlannedLeaves();
  //   this.plannedLeaves = this.leaveService.loadPlannedLeaves(this.employee.id);
  //   this.updateCalendarEvents();
  // }

  // loadPlannedLeaves() {
  //   const stored = localStorage.getItem('plannedLeaves');
  //   if (stored) {
  //     const allPlans = JSON.parse(stored) as PlannedLeave[];
  //     this.plannedLeaves = allPlans.filter(
  //       plan => plan.employeeId === this.employee.id
  //     );
  //   } else {
  //     this.plannedLeaves = [];
  //   }
  // }

  // savePlannedLeaves() {
  //   const stored = localStorage.getItem('plannedLeaves');
  //   let allPlans: PlannedLeave[] = stored ? JSON.parse(stored) : [];

  //   // Remove current employee's plans
  //   allPlans = allPlans.filter(plan => plan.employeeId !== this.employee.id);

  //   // Add updated plans
  //   allPlans = [...allPlans, ...this.plannedLeaves];

  //   localStorage.setItem('plannedLeaves', JSON.stringify(allPlans));
  // }

  getFutureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  handleDateSelect(selectInfo: DateSelectArg) {
    this.selectedStartDate = selectInfo.startStr;

    // Calculate end date (subtract 1 day as FullCalendar is exclusive)
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
    let days = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
    }

    this.workingDays = days;
  }

  // submitPlan() {
  //   // Validation
  //   if (!this.selectedLeaveType) {
  //     this.messageService.add({
  //       severity: 'error',
  //       summary: 'Validation Error',
  //       detail: 'Please select a leave type',
  //       key: 'tl',
  //       life: 3000,
  //     });
  //     return;
  //   }

  //   if (this.workingDays > this.maxDaysPerPlan) {
  //     this.messageService.add({
  //       severity: 'error',
  //       summary: 'Validation Error',
  //       detail: `Maximum ${this.maxDaysPerPlan} days allowed per plan`,
  //       key: 'tl',
  //       life: 3000,
  //     });
  //     return;
  //   }

  //   // Check total planned days
  //   const totalPlanned = this.plannedLeaves
  //     .filter((p) => p.status === 'Planned')
  //     .reduce((sum, p) => sum + p.workingDays, 0);

  //   if (totalPlanned + this.workingDays > this.totalAllowedPlannedDays) {
  //     this.messageService.add({
  //       severity: 'error',
  //       summary: 'Limit Exceeded',
  //       detail: `You can only plan up to ${this.totalAllowedPlannedDays} days total`,
  //       key: 'tl',
  //       life: 3000,
  //     });
  //     return;
  //   }

  //   // Create plan
  //   const newPlan: PlannedLeave = {
  //     id: this.token.getRandomToken(),
  //     employeeId: this.employee.id,
  //     startDate: this.selectedStartDate,
  //     endDate: this.selectedEndDate,
  //     leaveType: this.selectedLeaveType,
  //     workingDays: this.workingDays,
  //     notes: this.planNotes,
  //     status: 'Planned',
  //     createdOn: new Date().toISOString(),
  //     month: 'jan',
  //   };

  //   this.plannedLeaves.push(newPlan);
  //   this.leaveService.savePlannedLeaves(this.plannedLeaves, this.employee.id);
  //   this.updateCalendarEvents();

  //   this.messageService.add({
  //     severity: 'success',
  //     summary: 'Leave Planned',
  //     detail: `${this.workingDays} days planned successfully`,
  //     key: 'tl',
  //     life: 3000,
  //   });

  //   this.closePlanModal();
  // }

  convertToRequest(plan: PlannedLeave) {
    if (plan.status !== 'Planned') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid Action',
        detail: 'Only planned leaves can be converted to requests',
        key: 'tl',
        life: 3000,
      });
      return;
    }

    // Create actual leave request
    const leaveRequest = {
      Employee: this.employee.name,
      EmployeeId: this.employee.id,
      Date: `${plan.startDate} to ${plan.endDate}`,
      LeaveType: plan.leaveType,
      NetLeaveBalance: this.getTotalRemainingDays(),
      RequestedDuration: `${plan.workingDays}.00 day(s)`,
      Status: `Pending Approval (${plan.workingDays}.00 day(s))`,
      RequestComment: plan.notes || 'Converted from leave plan',
      AppliedOn: this.getCurrentDateTime(),
      ApprovalComment: '',
      Id: this.token.getRandomToken(),
      Attachment: null,
    };

    this.leaveService.createLeaveRequest(leaveRequest);

    // Update plan status
    plan.status = 'Pending';
    this.leaveService.savePlannedLeaves(this.plannedLeaves, this.employee.id);
    this.updateCalendarEvents();

    this.messageService.add({
      severity: 'success',
      summary: 'Request Created',
      detail: 'Leave plan converted to request successfully',
      key: 'tl',
      life: 3000,
    });
  }

  // cancelPlan(plan: PlannedLeave) {
  //   if (!confirm(`Cancel this planned leave (${plan.workingDays} days)?`)) {
  //     return;
  //   }

  //   this.plannedLeaves = this.plannedLeaves.filter((p) => p.id !== plan.id);
  //   this.leaveService.savePlannedLeaves(this.plannedLeaves, this.employee.id);
  //   this.updateCalendarEvents();

  //   this.messageService.add({
  //     severity: 'info',
  //     summary: 'Plan Cancelled',
  //     detail: 'Planned leave cancelled',
  //     key: 'tl',
  //     life: 3000,
  //   });
  // }

  updateCalendarEvents() {
    this.calendarEvents = this.plannedLeaves.map((plan) => ({
      title: `${plan.leaveType} (${plan.workingDays}d)`,
      start: plan.startDate,
      end: this.addOneDay(plan.endDate),
      backgroundColor: this.getStatusColor(plan.status),
      borderColor: this.getStatusColor(plan.status),
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.calendarEvents,
    };
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Planned':
        return '#3B82F6';
      case 'Pending':
        return '#EAB308';
      case 'Approved':
        return '#22C55E';
      default:
        return '#6B7280';
    }
  }

  addOneDay(date: string): string {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  getCurrentDateTime(): string {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');
    return `${year}-${month}-${day}, ${formattedHours}:${minutes} ${ampm}`;
  }

  getTotalRemainingDays(): number {
    return this.employee.leaveTypes.reduce(
      (sum, lt) => sum + (lt.allocatedDays - lt.daysUsed),
      0,
    );
  }

  getTotalPlannedDays(): number {
    return this.plannedLeaves
      .filter((p) => p.status === 'Planned')
      .reduce((sum, p) => sum + p.workingDays, 0);
  }

  closePlanModal() {
    this.showPlanModal = false;
    this.selectedStartDate = '';
    this.selectedEndDate = '';
    this.selectedLeaveType = '';
    this.workingDays = 0;
    this.planNotes = '';
  }

  openEmergencyLeave() {
    this.showEmergencyModal = true;
  }

  // closeEmergencyModal() {
  //   this.showEmergencyModal = false;
  // }
  // Add these methods to your existing LeavePlanComponent class

  getPlannedCount(): number {
    return this.plannedLeaves.filter((p) => p.status === 'Planned').length;
  }

  getPendingCount(): number {
    return this.plannedLeaves.filter((p) => p.status === 'Pending').length;
  }

  getApprovedCount(): number {
    return this.plannedLeaves.filter((p) => p.status === 'Approved').length;
  }

  getPlannedPercentage(): number {
    if (this.plannedLeaves.length === 0) return 0;
    return (this.getPlannedCount() / this.plannedLeaves.length) * 100;
  }

  getPendingPercentage(): number {
    if (this.plannedLeaves.length === 0) return 0;
    return (this.getPendingCount() / this.plannedLeaves.length) * 100;
  }

  getApprovedPercentage(): number {
    if (this.plannedLeaves.length === 0) return 0;
    return (this.getApprovedCount() / this.plannedLeaves.length) * 100;
  }

  getLeaveTypeStats() {
    const typeMap = new Map<string, number>();

    this.plannedLeaves.forEach((plan) => {
      typeMap.set(
        plan.leaveType,
        (typeMap.get(plan.leaveType) || 0) + plan.workingDays,
      );
    });

    const totalDays = this.getTotalPlannedDays() || 1;

    return Array.from(typeMap.entries()).map(([type, days]) => ({
      type,
      days,
      percentage: (days / totalDays) * 100,
    }));
  }

  getAverageDuration(): number {
    if (this.plannedLeaves.length === 0) return 0;

    const total = this.plannedLeaves.reduce((sum, p) => sum + p.workingDays, 0);
    return Math.round(total / this.plannedLeaves.length);
  }

  getNextPlannedDate(): string {
    const futurePlans = this.plannedLeaves
      .filter(
        (p) => p.status === 'Planned' && new Date(p.startDate) > new Date(),
      )
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );

    if (futurePlans.length === 0) return '-';

    return futurePlans[0].startDate;
  }

  loadData() {
    this.employee = this.leaveService.getEmployeeById('EMP-001');
    this.leaveSettings = this.leaveService.getLeaveSettings();
    this.planningPolicy = this.leaveService.getLeavePlanningPolicy();
    
    this.leaveTypes = this.leaveSettings.leaveTypes
      .filter((leave) => leave.isActive)
      .map((leave) => leave.typeName);
    
    this.plannedLeaves = this.leaveService.loadPlannedLeaves(this.employee.id);
    this.monthlyPlanSummary = this.leaveService.getMonthlyPlanSummary(this.employee.id);
    
    this.updateCalendarEvents();
    this.updatePolicyValues();
  }

  updatePolicyValues() {
    this.planningWindowDays = this.planningPolicy.planningWindowDays;
    this.maxDaysPerPlan = this.planningPolicy.maxDaysPerMonth;
    this.totalAllowedPlannedDays = this.planningPolicy.totalAllowedPlannedDays;
  }

  getMonthFromDate(date: string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  submitPlan() {
    // Validation
    if (!this.selectedLeaveType) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please select a leave type',
        key: 'tl',
        life: 3000,
      });
      return;
    }

    const month = this.getMonthFromDate(this.selectedStartDate);

    // Check if can plan for this month
    if (!this.leaveService.canPlanForMonth(this.employee.id, month)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Planning Limit Exceeded',
        detail: `You can only plan for ${this.planningPolicy.maxPlanningMonths} different months`,
        key: 'tl',
        life: 3000,
      });
      return;
    }

    // Check monthly limit
    const remainingForMonth = this.leaveService.getRemainingDaysForMonth(this.employee.id, month);
    if (this.workingDays > remainingForMonth) {
      this.messageService.add({
        severity: 'error',
        summary: 'Monthly Limit Exceeded',
        detail: `Only ${remainingForMonth} days remaining for ${month}. Max ${this.planningPolicy.maxDaysPerMonth} days/month.`,
        key: 'tl',
        life: 3000,
      });
      return;
    }

    // Check total planned days
    const totalPlanned = this.getTotalPlannedDays();
    if (totalPlanned + this.workingDays > this.planningPolicy.totalAllowedPlannedDays) {
      this.messageService.add({
        severity: 'error',
        summary: 'Total Limit Exceeded',
        detail: `You can only plan up to ${this.planningPolicy.totalAllowedPlannedDays} days total`,
        key: 'tl',
        life: 3000,
      });
      return;
    }

    // Create plan
    const newPlan: PlannedLeave = {
      id: this.token.getRandomToken(),
      employeeId: this.employee.id,
      startDate: this.selectedStartDate,
      endDate: this.selectedEndDate,
      leaveType: this.selectedLeaveType,
      workingDays: this.workingDays,
      notes: this.planNotes,
      status: 'Planned',
      createdOn: new Date().toISOString(),
      month: month,
    };

    this.plannedLeaves.push(newPlan);
    this.leaveService.savePlannedLeaves(this.plannedLeaves, this.employee.id);
    this.loadData();

    this.messageService.add({
      severity: 'success',
      summary: 'Leave Planned',
      detail: `${this.workingDays} days planned for ${month}`,
      key: 'tl',
      life: 3000,
    });

    this.closePlanModal();
  }

  canEditPlan(plan: PlannedLeave): boolean {
    if (plan.status === 'Approved' && !this.planningPolicy.allowPlanEditing) {
      return false;
    }
    return plan.status === 'Planned';
  }

  cancelPlan(plan: PlannedLeave) {
    if (!this.canEditPlan(plan)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Edit',
        detail: 'Approved plans cannot be edited',
        key: 'tl',
        life: 3000,
      });
      return;
    }

    if (!confirm(`Cancel this planned leave (${plan.workingDays} days)?`)) {
      return;
    }

    this.plannedLeaves = this.plannedLeaves.filter(p => p.id !== plan.id);
    this.leaveService.savePlannedLeaves(this.plannedLeaves, this.employee.id);
    this.loadData();

    this.messageService.add({
      severity: 'info',
      summary: 'Plan Cancelled',
      detail: 'Planned leave cancelled',
      key: 'tl',
      life: 3000,
    });
  }

  // Emergency Leave
  submitEmergencyLeave() {
    if (!this.emergencyLeaveForm.startDate || !this.emergencyLeaveForm.endDate || 
        !this.emergencyLeaveForm.leaveType || !this.emergencyLeaveForm.reason) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill all required fields',
        key: 'tl',
        life: 3000,
      });
      return;
    }

    // Calculate days
    const start = new Date(this.emergencyLeaveForm.startDate);
    const end = new Date(this.emergencyLeaveForm.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    // Check emergency leave limit
    if (days > this.planningPolicy.emergencyLeaveDaysAllowed) {
      this.messageService.add({
        severity: 'error',
        summary: 'Limit Exceeded',
        detail: `Emergency leave limited to ${this.planningPolicy.emergencyLeaveDaysAllowed} days`,
        key: 'tl',
        life: 3000,
      });
      return;
    }

    // Create direct leave request
    const leaveRequest = {
      Employee: this.employee.name,
      EmployeeId: this.employee.id,
      Date: `${this.emergencyLeaveForm.startDate} to ${this.emergencyLeaveForm.endDate}`,
      LeaveType: this.emergencyLeaveForm.leaveType,
      NetLeaveBalance: this.getTotalRemainingDays(),
      RequestedDuration: `${days}.00 day(s)`,
      Status: `Pending Approval (${days}.00 day(s)) - EMERGENCY`,
      RequestComment: `🚨 EMERGENCY: ${this.emergencyLeaveForm.reason}`,
      AppliedOn: this.getCurrentDateTime(),
      ApprovalComment: '',
      Id: this.token.getRandomToken(),
      Attachment: null,
    };

    this.leaveService.createLeaveRequest(leaveRequest);

    this.messageService.add({
      severity: 'success',
      summary: 'Emergency Leave Submitted',
      detail: 'Your emergency leave request has been sent for immediate review',
      key: 'tl',
      life: 3000,
    });

    this.closeEmergencyModal();
  }

  closeEmergencyModal() {
    this.showEmergencyModal = false;
    this.emergencyLeaveForm = {
      startDate: '',
      endDate: '',
      reason: '',
      leaveType: '',
    };
  }

  // Get monthly summary for display
  getMonthlyLimits() {
    return this.monthlyPlanSummary;
  }
}
