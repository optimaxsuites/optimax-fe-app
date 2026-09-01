import { Component, OnInit, OnDestroy } from '@angular/core';
import { CalendarOptions, EventInput, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { MessageService } from 'primeng/api';
import { LeaveApiService } from '../../../service/leave-api.service';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  user?: { userId?: number; id?: number };
  userId?: number;
}

interface LeaveType {
  id: number;
  name: string;
  description?: string;
  code?: string;
}

interface LeavePlanPolicy {
  maxDaysPerMonth: number;
  maxMonthPerYear: number;
  emergencyLeaveDaysAllowed: number;
  totalAllowedPlannedDays: number;
  planningWindowDays: number;
}

interface LeavePlanRecord {
  id: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  leaveType?: LeaveType;
  leaveTypeId?: number;
  planReason?: string;
  attachment?: string;
  adminComment?: string;
  createdAt?: string;
  createdBy?: { userId: number; fullname?: string };
}

interface EmergencyLeaveForm {
  startDate: string;
  endDate: string;
  reason: string;
  leaveTypeObj: LeaveType | null;
}

interface MonthlySummary {
  month: string;
  daysPlanned: number;
  maxDays: number;
  remaining: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-leave-plan',
  templateUrl: './leave-plan.component.html',
  styleUrls: ['./leave-plan.component.scss'],
  providers: [MessageService],
})
export class LeavePlanComponent implements OnInit, OnDestroy {

  // ── State ──────────────────────────────────────────────────────────────────

  isLoading = false;
  isSubmitting = false;

  // ── Current user ───────────────────────────────────────────────────────────

  currentEmployee: Employee | null = null;
  currentEmployeeId: number | null = null;
  currentUserId: number | null = null;

  // ── API data ───────────────────────────────────────────────────────────────

  leavePlanRecords: LeavePlanRecord[] = [];
  leaveTypes: LeaveType[] = [];
  planningPolicy: LeavePlanPolicy = {
    maxDaysPerMonth: 10,
    maxMonthPerYear: 3,
    emergencyLeaveDaysAllowed: 5,
    totalAllowedPlannedDays: 30,
    planningWindowDays: 90,
  };

  // ── Modal visibility ───────────────────────────────────────────────────────

  showPlanModal = false;
  showEmergencyModal = false;

  // ── Plan form ──────────────────────────────────────────────────────────────

  selectedStartDate = '';
  selectedEndDate = '';
  selectedLeaveTypeObj: LeaveType | null = null;
  workingDays = 0;
  planReason = '';
  planAttachment: File | null = null;
  planAttachmentStatus = 'Upload file';

  // ── Emergency form ─────────────────────────────────────────────────────────

  emergencyLeaveForm: EmergencyLeaveForm = {
    startDate: '',
    endDate: '',
    reason: '',
    leaveTypeObj: null,
  };

  // ── Calendar ───────────────────────────────────────────────────────────────

  calendarEvents: EventInput[] = [];
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    selectable: true,
    selectMirror: true,
    select: this.handleDateSelect.bind(this),
    events: [],
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

  // ── Previous records (for status-change detection) ─────────────────────────

  private previousRecords: LeavePlanRecord[] = [];
  private destroy$ = new Subject<void>();

  // ── Derived dates ──────────────────────────────────────────────────────────

  get todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  constructor(
    private messageService: MessageService,
    private apiService: LeaveApiService,
    private mailNotificationService: MailNotificationService,
  ) {}

  ngOnInit(): void {
    this.loadCurrentEmployee();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Load employee ─────────────────────────────────────────────────────────

  loadCurrentEmployee(): void {
    this.isLoading = true;

    this.apiService.getCurrentEmployee()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (employee: Employee | null) => {
          if (!employee) {
            this.showToast('error', 'Not logged in', 'Please log in to view leave plans.');
            this.isLoading = false;
            return;
          }
          this.currentEmployee = employee;
          this.currentEmployeeId = employee.id;
          this.currentUserId = employee.user?.userId ?? employee.user?.id ?? employee.userId ?? null;
          this.loadAllData();
        },
        error: () => {
          this.showToast('error', 'Error', 'Failed to load employee data.');
          this.isLoading = false;
        },
      });
  }

  // ─── Load all data ─────────────────────────────────────────────────────────

  loadAllData(): void {
    this.isLoading = true;

    forkJoin({
      planRecords: this.apiService.getLeavePlanRecords().pipe(catchError(() => of([]))),
      leaveTypes:  this.apiService.getLeaveTypes().pipe(catchError(() => of([]))),
      policies:    this.apiService.getLeavePlanPolicies(1, 1).pipe(catchError(() => of([]))),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ planRecords, leaveTypes, policies }) => {

        // Filter to current user's records only
        const myRecords: LeavePlanRecord[] = (planRecords as LeavePlanRecord[]).filter(
          (r) => (r.createdBy?.userId || (r.createdBy as any)?.id) === this.currentUserId,
        );

        this.checkForStatusChanges(myRecords);
        this.leavePlanRecords = myRecords;
        this.leaveTypes = leaveTypes as LeaveType[];

        if (policies && (policies as any[]).length > 0) {
          this.planningPolicy = (policies as LeavePlanPolicy[])[0];
        }

        this.updateCalendarEvents();
        this.isLoading = false;
      },
      error: () => {
        this.showToast('error', 'Error', 'Failed to load leave plan data.');
        this.isLoading = false;
      },
    });
  }

  // ─── Status-change notifications ───────────────────────────────────────────

  private checkForStatusChanges(newRecords: LeavePlanRecord[]): void {
    if (this.previousRecords.length === 0) {
      this.previousRecords = this.deepClone(newRecords);
      return;
    }

    newRecords.forEach((newRecord) => {
      const old = this.previousRecords.find((r) => r.id === newRecord.id);
      if (old && old.status !== newRecord.status) {
        this.notifyStatusChange(newRecord);
      }
    });

    this.previousRecords = this.deepClone(newRecords);
  }

  private notifyStatusChange(record: LeavePlanRecord): void {
    const name  = record.leaveType?.name ?? 'Leave';
    const start = this.formatDate(record.startDate);
    const end   = this.formatDate(record.endDate);
    const days  = record.totalDays;

    if (record.status === 'APPROVED') {
      this.showToast(
        'success',
        '✅ Leave Plan Approved',
        `Your ${name} plan (${days} days, ${start} – ${end}) has been approved.`,
        10000,
      );
    } else if (record.status === 'REJECTED') {
      const comment = record.adminComment ? ` Reason: ${record.adminComment}` : '';
      this.showToast('error', '❌ Leave Plan Rejected', `Your ${name} plan was rejected.${comment}`, 10000);
    }
  }

  // ─── Calendar ──────────────────────────────────────────────────────────────

  handleDateSelect(selectInfo: DateSelectArg): void {
    this.selectedStartDate = selectInfo.startStr;

    // FullCalendar end is exclusive — subtract one day
    const end = new Date(selectInfo.endStr);
    end.setDate(end.getDate() - 1);
    this.selectedEndDate = this.toDateStr(end);

    this.calculateWorkingDays();
    this.showPlanModal = true;
  }

  private updateCalendarEvents(): void {
    this.calendarEvents = this.leavePlanRecords.map((record) => ({
      title: `${record.leaveType?.name ?? 'Leave'} (${record.totalDays}d)`,
      start: this.extractDate(record.startDate),
      end:   this.addOneDay(this.extractDate(record.endDate)),
      backgroundColor: this.statusColor(record.status),
      borderColor:     this.statusColor(record.status),
      textColor: '#ffffff',
    }));

    this.calendarOptions = { ...this.calendarOptions, events: this.calendarEvents };
  }

  // ─── Plan form ─────────────────────────────────────────────────────────────

  onPlanFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (file) {
      this.planAttachment       = file;
      this.planAttachmentStatus = file.name;
    }
  }

  removePlanAttachment(): void {
    this.planAttachment       = null;
    this.planAttachmentStatus = 'Upload file';
  }

  async submitPlan(): Promise<void> {
    if (!this.selectedLeaveTypeObj) {
      this.showToast('error', 'Validation', 'Please select a leave type.');
      return;
    }
    if (!this.currentUserId) {
      this.showToast('error', 'Error', 'User session not found. Please log in again.');
      return;
    }

    this.isSubmitting = true;

    // Convert attachment to base64 if provided
    let attachmentBase64 = '';
    if (this.planAttachment) {
      try {
        attachmentBase64 = await this.apiService.fileToBase64(this.planAttachment);
      } catch {
        this.showToast('error', 'File Error', 'Could not read the attachment. Please try again.');
        this.isSubmitting = false;
        return;
      }
    }

    const toISO = (d: string) => new Date(`${d}T12:00:00`).toISOString();

    const payload = {
      createdBy:    this.currentUserId,
      startDate:    toISO(this.selectedStartDate),
      endDate:      toISO(this.selectedEndDate),
      status:       'PENDING',
      leaveTypeId:  this.selectedLeaveTypeObj.id,
      totalDays:    this.workingDays,
      planReason:   this.planReason || '',
      attachment:   attachmentBase64,
      adminComment: '',
      decisionBy:   null,
      decisionOn:   null,
    };

    this.apiService.createLeavePlanRecord(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showToast('success', 'Plan Submitted', `${this.workingDays} days planned for ${this.selectedLeaveTypeObj!.name}.`);
          this.sendPlanMail(payload);
          this.closePlanModal();
          this.loadAllData();
        },
        error: () => {
          this.isSubmitting = false;
          this.showToast('error', 'Error', 'Failed to submit leave plan. Please try again.');
        },
      });
  }

  closePlanModal(): void {
    this.showPlanModal         = false;
    this.isSubmitting          = false;
    this.selectedStartDate     = '';
    this.selectedEndDate       = '';
    this.selectedLeaveTypeObj  = null;
    this.workingDays           = 0;
    this.planReason            = '';
    this.planAttachment        = null;
    this.planAttachmentStatus  = 'Upload file';
  }

  // ─── Emergency leave ───────────────────────────────────────────────────────

  openEmergencyLeave(): void {
    this.showEmergencyModal = true;
  }

  closeEmergencyModal(): void {
    this.showEmergencyModal  = false;
    this.emergencyLeaveForm  = { startDate: '', endDate: '', reason: '', leaveTypeObj: null };
  }

  submitEmergencyLeave(): void {
    const { startDate, endDate, leaveTypeObj, reason } = this.emergencyLeaveForm;

    if (!startDate || !endDate || !leaveTypeObj || !reason.trim()) {
      this.showToast('error', 'Validation', 'Please fill in all required fields.');
      return;
    }

    const days = this.daysBetween(startDate, endDate);
    const maxEmergency = this.planningPolicy.emergencyLeaveDaysAllowed;

    if (days > maxEmergency) {
      this.showToast('error', 'Limit Exceeded', `Emergency leave is limited to ${maxEmergency} days.`);
      return;
    }

    const toISO = (d: string) => new Date(`${d}T12:00:00`).toISOString();

    const payload = {
      createdBy:   this.currentUserId,
      leaveTypeId: leaveTypeObj.id,
      startDate:   toISO(startDate),
      endDate:     toISO(endDate),
      totalDays:   days,
      leaveReason: `EMERGENCY: ${reason}`,
      attachment:  '',
    };

    this.apiService.createLeaveRequestRecord(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showToast('success', 'Emergency Leave Submitted', 'Your request has been sent for immediate review.', 5000);
          this.closeEmergencyModal();
          this.loadAllData();
        },
        error: () => {
          this.showToast('error', 'Error', 'Failed to submit emergency leave.');
        },
      });
  }

  // ─── Cancel plan ───────────────────────────────────────────────────────────

  canEditPlan(plan: LeavePlanRecord): boolean {
    return plan.status === 'PENDING';
  }

  cancelPlan(plan: LeavePlanRecord): void {
    if (!this.canEditPlan(plan)) {
      this.showToast('warn', 'Cannot Cancel', 'Only pending plans can be cancelled.');
      return;
    }

    this.apiService.deleteLeavePlanRecord(plan.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showToast('info', 'Plan Cancelled', 'Leave plan cancelled successfully.');
          this.loadAllData();
        },
        error: () => {
          this.showToast('error', 'Error', 'Failed to cancel leave plan.');
        },
      });
  }

  // ─── Statistics ────────────────────────────────────────────────────────────

  getTotalPlannedDays(): number {
    return this.leavePlanRecords
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + (r.totalDays ?? 0), 0);
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

  getPendingPercentage(): number {
    return this.percentage(this.getPendingCount(), this.leavePlanRecords.length);
  }

  getApprovedPercentage(): number {
    return this.percentage(this.getApprovedCount(), this.leavePlanRecords.length);
  }

  getRejectedPercentage(): number {
    return this.percentage(this.getRejectedCount(), this.leavePlanRecords.length);
  }

  // ─── Computed properties ───────────────────────────────────────────────────

  get planningWindowDays(): number {
    return this.planningPolicy.planningWindowDays;
  }

  get monthlyPlanSummary(): MonthlySummary[] {
    const map = new Map<string, number>();

    this.leavePlanRecords
      .filter((r) => r.status === 'APPROVED')
      .forEach((record) => {
        const month = new Date(record.startDate).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        map.set(month, (map.get(month) ?? 0) + (record.totalDays ?? 0));
      });

    const maxDays = this.planningPolicy.maxDaysPerMonth;

    return Array.from(map.entries()).map(([month, daysPlanned]) => ({
      month,
      daysPlanned,
      maxDays,
      remaining: maxDays - daysPlanned,
    }));
  }

  // ─── Mail notification ─────────────────────────────────────────────────────

  private sendPlanMail(payload: any): void {
    if (!this.currentEmployee) return;

    const { firstName, lastName, email } = this.currentEmployee;
    const fullName = `${firstName} ${lastName}`;

    const mailBody = {
      name:          fullName,
      recieverEmail: email,
      subject:       'New Leave Plan Submitted',
      body: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Dear ${firstName},</p>
          <p>Your leave plan has been submitted successfully. Details:</p>
          <ul>
            <li><strong>Leave Type:</strong> ${this.selectedLeaveTypeObj?.name ?? payload.leaveTypeId}</li>
            <li><strong>Start Date:</strong> ${payload.startDate}</li>
            <li><strong>End Date:</strong> ${payload.endDate}</li>
            <li><strong>Total Days:</strong> ${payload.totalDays}</li>
            <li><strong>Reason:</strong> ${payload.planReason || 'N/A'}</li>
            <li><strong>Status:</strong> <span style="color:#f0ad4e;">PENDING</span></li>
          </ul>
          <p>You will be notified once a decision is made.</p>
          <p>Regards,<br/><strong>Management</strong></p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0;"/>
          <p style="font-size:12px;color:#777;">This is an automated message. Please do not reply.</p>
        </div>
      `,
    };

    this.mailNotificationService.sendMail(mailBody)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => console.log('📧 Plan mail sent'),
        error: (e) => console.warn('📧 Mail failed (non-critical):', e),
      });
  }

  // ─── Utility ───────────────────────────────────────────────────────────────

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  private calculateWorkingDays(): void {
    if (!this.selectedStartDate || !this.selectedEndDate) {
      this.workingDays = 0;
      return;
    }
    this.workingDays = this.daysBetween(this.selectedStartDate, this.selectedEndDate);
  }

  private daysBetween(start: string, end: string): number {
    const s = new Date(`${start}T12:00:00`);
    const e = new Date(`${end}T12:00:00`);
    return Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
  }

  private getFutureDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return this.toDateStr(d);
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private extractDate(dateString: string): string {
    return dateString ? dateString.split('T')[0] : '';
  }

  private addOneDay(date: string): string {
    if (!date) return '';
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return this.toDateStr(d);
  }

  private statusColor(status: string): string {
    const colors: Record<string, string> = {
      PENDING:  '#EAB308',
      APPROVED: '#22C55E',
      REJECTED: '#EF4444',
    };
    return colors[status] ?? '#6B7280';
  }

  private percentage(part: number, total: number): number {
    return total === 0 ? 0 : Math.round((part / total) * 100);
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private showToast(
    severity: 'success' | 'error' | 'warn' | 'info',
    summary: string,
    detail: string,
    life = 4000,
  ): void {
    this.messageService.add({ severity, summary, detail, key: 'tl', life });
  }
}