import { Component, OnInit } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import { FullCalendarModule } from '@fullcalendar/angular';
import {
  CalendarOptions,
  EventInput,
  DayCellContentArg,
} from '@fullcalendar/core';
import { LeaveApiService } from '../../../service/leave-api.service';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { MessageService } from 'primeng/api';
import {
  TableAction,
  TableColumn,
} from '../../../shared-component/view/table/table.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-leave-usage',
  templateUrl: './leave-usage.component.html',
  styleUrl: './leave-usage.component.scss',
  providers: [MessageService],
})
export class LeaveUsageComponent implements OnInit {
  isSubmitting = false;
  selectedStartDate: string = '';
  selectedEndDate: string = '';
  // Current employee data
  currentEmployee: any = null;
  currentEmployeeId: number | null = null;
  currentUserId: number | null = null;

  // API Data
  leaveBalances: any[] = [];
  leaveTypes: any[] = [];
  leavePlans: any[] = [];
  leaveRequests: any[] = [];
  isLoadingStats: boolean = false;
  isLoadingRequests: boolean = false;

  // Filters
  statuses: string[] = ['PENDING', 'APPROVED', 'REJECTED'];
  searchTerm: string = '';
  selectedLeaveType: string[] = [];
  selectedStatus: string[] = [];

  // Display data
  myRequests: any = [];
  filteredRequests: any = [];
  requestInView: any;
  openViewRequest: boolean = false;

  // Form fields
  fromDate: any;
  toDate: any;
  today!: string;
  comment: any;
  attachment: any;
  docUploadStatus: string = 'Upload file';
  selectedLeaveTypeObj: any = null;
  openApplyLeave = false;

  // Table config
  requestColumns: TableColumn[] = [
    {
      header: 'Applied On',
      field: 'appliedOn',
      sortable: true,
      className: 'table-item',
    },
    {
      header: 'Period',
      field: 'period',
      sortable: true,
      className: 'table-item',
    },
    {
      header: 'Leave Type',
      field: 'leaveTypeName',
      sortable: true,
      className: 'table-item',
    },
    {
      header: 'Days',
      field: 'totalDays',
      sortable: true,
      className: 'table-item',
    },
    {
      header: 'Status',
      field: 'status',
      sortable: true,
      className: 'table-item',
    },
  ];

  requestActions: TableAction[] = [
    {
      id: 'view',
      label: 'View',
      // icon: 'pi pi-eye'
    },
    {
      id: 'delete',
      label: 'Cancel',
      // icon: 'pi pi-trash',
      visible: (row) => row.status === 'PENDING',
    },
  ];

  // Planned leaves - allowed date ranges
  allowedDateRanges: { start: string; end: string }[] = [];
  hasPlannedLeaves: boolean = false;

  // Calendar
  calendarEvents: EventInput[] = [];
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    events: this.calendarEvents,
    selectable: true,
    select: this.handleCalendarSelect.bind(this),
    dayCellClassNames: this.getDayCellClass.bind(this),
    dayCellDidMount: this.styleDayCell.bind(this),
    validRange: {
      start: new Date().toISOString().split('T')[0],
    },
  };

  constructor(
    private messageService: MessageService,
    private apiService: LeaveApiService,
  ) {}

  ngOnInit() {
    this.today = new Date().toISOString().split('T')[0];
    this.loadCurrentEmployee();
  }

  // ==================== LOAD CURRENT EMPLOYEE ====================

  loadCurrentEmployee() {
    this.isLoadingStats = true;

    this.apiService.getCurrentEmployee().subscribe({
      next: (employee) => {
        if (!employee) {
          console.warn('⚠️ No employee loaded');
          this.isLoadingStats = false;
          return;
        }

        this.currentEmployee = employee;
        this.currentEmployeeId = employee.id;
        this.currentUserId = employee.user?.userId || employee.user?.id;

        console.log('✅ Current employee loaded:', {
          employeeId: this.currentEmployeeId,
          userId: this.currentUserId,
          name: `${employee.firstName} ${employee.lastName}`,
        });

        this.loadAllData();
      },
      error: (err) => {
        console.error('❌ Failed to load current employee:', err);
        this.isLoadingStats = false;
      },
    });
  }

  // ==================== LOAD ALL DATA ====================

  loadAllData() {
    this.isLoadingStats = true;
    this.isLoadingRequests = true;

    forkJoin({
      balances: this.apiService
        .getLeaveBalances()
        .pipe(catchError(() => of([]))),
      leaveTypes: this.apiService
        .getLeaveTypes()
        .pipe(catchError(() => of([]))),
      leavePlans: this.apiService
        .getLeavePlanRecords(1, 1000)
        .pipe(catchError(() => of([]))),
      leaveRequests: this.apiService
        .getLeaveRequestRecords(1, 1000)
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: (data) => {
        // Filter balances for current employee
        this.leaveBalances = (data.balances || []).filter(
          (balance: any) => balance.employee === this.currentEmployeeId,
        );

        this.leaveTypes = data.leaveTypes || [];

        // Filter leave plans for current user (PENDING or APPROVED only)
        this.leavePlans = (data.leavePlans || []).filter((plan: any) => {
          const planUserId = plan.createdBy?.userId;
          const isMyPlan = planUserId === this.currentUserId;
          const isValidStatus =
            plan.status === 'PENDING' || plan.status === 'APPROVED';
          return isMyPlan && isValidStatus;
        });

        console.log('📋 User Leave Plans:', this.leavePlans);

        // Calculate allowed date ranges from approved plans
        this.calculateAllowedDateRanges();

        // Filter leave requests for current user
        this.leaveRequests = (data.leaveRequests || []).filter(
          (request: any) => {
            const requestUserId = request.createdBy?.userId;
            return requestUserId === this.currentUserId;
          },
        );

        console.log('📝 User Leave Requests:', this.leaveRequests);
        console.log('✅ Allowed Date Ranges:', this.allowedDateRanges);

        this.buildDisplayData();
        this.updateCalendarEvents();

        this.isLoadingStats = false;
        this.isLoadingRequests = false;
      },
      error: (err) => {
        console.error('❌ Failed to load data:', err);
        this.isLoadingStats = false;
        this.isLoadingRequests = false;
      },
    });
  }

  // ==================== CALCULATE ALLOWED DATE RANGES ====================

  calculateAllowedDateRanges() {
    // Only use APPROVED plans for allowed dates
    this.allowedDateRanges = this.leavePlans
      .filter((plan) => plan.status === 'APPROVED')
      .map((plan) => ({
        start: this.extractDate(plan.startDate),
        end: this.extractDate(plan.endDate),
      }));

    this.hasPlannedLeaves = this.allowedDateRanges.length > 0;

    console.log('📅 Has approved planned leaves:', this.hasPlannedLeaves);
    console.log('📅 Allowed ranges:', this.allowedDateRanges);
  }

  extractDate(dateString: string): string {
    if (!dateString) return '';
    return dateString.split('T')[0];
  }

  // ==================== BUILD DISPLAY DATA ====================

  buildDisplayData() {
    this.filteredRequests = this.leaveRequests.map((request) => ({
      id: request.id,
      appliedOn: this.formatDateTime(request.createdAt),
      period: `${this.extractDate(request.startDate)} to ${this.extractDate(request.endDate)}`,
      leaveTypeName: request.leaveType?.name || 'Unknown',
      totalDays: request.totalDays,
      status: request.status,
      _rawRequest: request,
    }));

    this.myRequests = [...this.filteredRequests];
    this.applyFilters();
  }

  // ==================== STATS CALCULATIONS ====================

  getTotalAllocatedDays(): number {
    if (!this.leaveBalances || this.leaveBalances.length === 0) {
      return 0;
    }

    return this.leaveBalances.reduce((sum, balance) => {
      const total = (balance.balance || 0) + (balance.usedDays || 0);
      return sum + total;
    }, 0);
  }

  getTotalUsedDays(): number {
    if (!this.leaveBalances || this.leaveBalances.length === 0) {
      return 0;
    }

    return this.leaveBalances.reduce((sum, balance) => {
      return sum + (balance.usedDays || 0);
    }, 0);
  }

  getRemainingDays(): number {
    if (!this.leaveBalances || this.leaveBalances.length === 0) {
      return 0;
    }

    return this.leaveBalances.reduce((sum, balance) => {
      return sum + (balance.balance || 0);
    }, 0);
  }

  getLeaveTypeCards() {
    if (
      !this.leaveBalances ||
      !this.leaveTypes ||
      this.leaveBalances.length === 0
    ) {
      return [];
    }

    return this.leaveBalances.map((balance) => {
      const leaveType = this.leaveTypes.find(
        (lt) => lt.id === balance.leaveTypeId,
      );

      const totalAllocated = (balance.balance || 0) + (balance.usedDays || 0);
      const remaining = balance.balance || 0;
      const used = balance.usedDays || 0;
      const usedPercentage =
        totalAllocated > 0 ? (used / totalAllocated) * 100 : 0;

      return {
        typeName: leaveType?.name || 'Unknown',
        allocatedDays: totalAllocated,
        daysUsed: used,
        remainingDays: remaining,
        usedPercentage: usedPercentage,
        isActive: true,
      };
    });
  }

  // ==================== DATE VALIDATION ====================

  isDateAllowed(dateString: string): boolean {
    if (this.allowedDateRanges.length === 0) {
      return false;
    }

    return this.allowedDateRanges.some((range) => {
      return dateString >= range.start && dateString <= range.end;
    });
  }

  validateDateRange(): boolean {
    if (!this.fromDate || !this.toDate) {
      return false;
    }

    if (!this.hasPlannedLeaves) {
      this.messageService.add({
        severity: 'error',
        summary: 'No Planned Leave',
        detail: 'You must have an approved leave plan before requesting leave.',
        key: 'tl',
        life: 5000,
      });
      return false;
    }

    // Check if entire range is within allowed dates
    const start = new Date(this.fromDate);
    const end = new Date(this.toDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = this.formatDateLocal(d);
      if (!this.isDateAllowed(dateStr)) {
        console.warn(' Invalid date selection:', {
          selectedRange: `${this.fromDate} to ${this.toDate}`,
          invalidDate: dateStr,
        });

        this.messageService.add({
          severity: 'error',
          summary: 'Invalid Date Range',
          detail:
            'Selected dates must fall completely within your approved planned leave periods',
          key: 'tl',
          life: 5000,
        });
        return false;
      }
    }

    return true;
  }

  getMinAllowedDate(): string {
    if (this.allowedDateRanges.length === 0) {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10);
      return futureDate.toISOString().split('T')[0];
    }

    const dates = this.allowedDateRanges.map((r) => new Date(r.start));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    return minDate.toISOString().split('T')[0];
  }

  getMaxAllowedDate(): string {
    if (this.allowedDateRanges.length === 0) {
      return this.today;
    }

    const dates = this.allowedDateRanges.map((r) => new Date(r.end));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    return maxDate.toISOString().split('T')[0];
  }

  getFormattedAllowedRanges(): string {
    if (this.allowedDateRanges.length === 0) {
      return 'No approved planned leave periods yet';
    }

    return this.allowedDateRanges
      .map((range) => `${range.start} to ${range.end}`)
      .join(', ');
  }

  // ==================== CALENDAR STYLING ====================

  formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getDayCellClass(arg: any): string[] {
    const dateStr = this.formatDateLocal(arg.date);
    const isPast = arg.date < new Date(new Date().setHours(0, 0, 0, 0));
    const isAllowed = this.isDateAllowed(dateStr);

    if (isPast) {
      return ['fc-day-past'];
    }

    if (!isAllowed) {
      return ['fc-day-disabled'];
    }

    return ['fc-day-allowed'];
  }

  styleDayCell(arg: any) {
    const dateStr = this.formatDateLocal(arg.date);
    const isPast = arg.date < new Date(new Date().setHours(0, 0, 0, 0));
    const isAllowed = this.isDateAllowed(dateStr);

    if (isPast) {
      arg.el.style.backgroundColor = '#f5f5f5';
      arg.el.style.color = '#999';
      arg.el.style.cursor = 'not-allowed';
    } else if (isAllowed) {
      arg.el.style.backgroundColor = '#fee';
      arg.el.style.color = '#999';
      arg.el.style.cursor = 'not-allowed';
      arg.el.style.textDecoration = 'line-through';
    } else {
      arg.el.style.backgroundColor = '#e8f5e9';
      arg.el.style.cursor = 'pointer';
    }
  }

  // ==================== SUBMIT LEAVE REQUEST ====================

  openApplyLeaveModal() {
    if (!this.hasPlannedLeaves) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Plan Leave First',
        detail: 'You must have an approved leave plan before requesting leave.',
        key: 'tl',
        life: 5000,
      });
      return;
    }
    this.openApplyLeave = true;
  }

  assignLeave() {
    if (!this.fromDate || !this.toDate || !this.selectedLeaveTypeObj) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill all required fields',
        key: 'tl',
        life: 3000,
      });
      return;
    }

    if (!this.validateDateRange()) {
      return;
    }
    this.isSubmitting = true;
    const from = new Date(this.fromDate);
    const to = new Date(this.toDate);
    const timeDiff = to.getTime() - from.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

    const payload = {
      createdBy: this.currentUserId,
      leaveTypeId: this.selectedLeaveTypeObj.id,
      startDate: this.fromDate + 'T12:00:00',
      endDate: this.toDate + 'T12:00:00',
      totalDays: dayDiff,
      leaveReason: this.comment || '',
      attachment: '',
    };

    console.log('📤 Submitting Leave Request:', payload);

    this.apiService.createLeaveRequestRecord(payload).subscribe({
      next: (created) => {
        this.isSubmitting = false;
        console.log('✅ Leave request created:', created);
        this.messageService.add({
          severity: 'success',
          summary: 'Request Submitted',
          detail: `Leave request for ${dayDiff} days submitted successfully`,
          key: 'tl',
          life: 3000,
        });
        this.resetForm();
        this.openApplyLeave = false;
        this.loadAllData();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(' Failed to create leave request:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to submit leave request',
          key: 'tl',
        });
      },
    });
  }

  resetForm() {
    this.isSubmitting = false;
    this.comment = '';
    this.fromDate = '';
    this.toDate = '';
    this.selectedLeaveTypeObj = null;
    this.attachment = null;
    this.docUploadStatus = 'Upload file';
  }

  // ==================== TABLE ACTIONS ====================

  handleRequestAction(event: { actionId: string; row: any }) {
    if (event.actionId === 'view') {
      this.viewRequest(event.row);
    } else if (event.actionId === 'delete') {
      this.cancelRequest(event.row);
    }
  }

  viewRequest(row: any) {
    this.requestInView = row._rawRequest;
    this.openViewRequest = true;
  }

  cancelRequest(row: any) {
    const request = row._rawRequest;

    this.apiService.deleteLeaveRequestRecord(request.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Request Cancelled',
          detail: 'Leave request cancelled successfully',
          key: 'tl',
        });
        this.loadAllData();
      },
      error: (err) => {
        console.error('❌ Failed to cancel request:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to cancel leave request',
          key: 'tl',
        });
      },
    });
  }

  // ==================== FILTERS ====================

  applyFilters() {
    this.myRequests = this.filteredRequests.filter((req: any) => {
      const matchesSearch =
        req.appliedOn.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        req.period.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesLeaveType =
        this.selectedLeaveType.length === 0 ||
        this.selectedLeaveType.includes(req.leaveTypeName);

      const matchesStatus =
        this.selectedStatus.length === 0 ||
        this.selectedStatus.includes(req.status);

      return matchesSearch && matchesLeaveType && matchesStatus;
    });
  }

  filterCandidates() {
    this.applyFilters();
  }

  filterBySelectedStatus() {
    this.applyFilters();
  }

  filterBySelectedLeaveType() {
    this.applyFilters();
  }

  // ==================== CALENDAR EVENTS ====================

  updateCalendarEvents() {
    this.calendarEvents = this.leaveRequests.map((req: any) => {
      let backgroundColor = '#F59E0B'; // Pending
      let borderColor = '#D97706';

      if (req.status === 'APPROVED') {
        backgroundColor = '#10B981';
        borderColor = '#059669';
      } else if (req.status === 'REJECTED') {
        backgroundColor = '#EF4444';
        borderColor = '#DC2626';
      }

      return {
        title: req.leaveType?.name || 'Leave',
        start: this.extractDate(req.startDate),
        end: this.addOneDay(this.extractDate(req.endDate)),
        backgroundColor,
        borderColor,
        textColor: '#FFFFFF',
      };
    });

    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.calendarEvents,
    };
  }

  addOneDay(date: string): string {
    if (!date) return '';

    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day);

    d.setDate(d.getDate() + 1);

    return this.formatDateLocal(d);
  }

  // ==================== HELPERS ====================

  formatDateTime(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.attachment = file;
      this.docUploadStatus = 'File attached';
    }
  }

  preventTyping(event: KeyboardEvent) {
    event.preventDefault();
  }

  onFromDateChange() {
    if (this.toDate && this.fromDate > this.toDate) {
      this.toDate = '';
    }
  }

  handleCalendarSelect(selectInfo: any) {
    if (!this.hasPlannedLeaves) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Plan Leave First',
        detail: 'You must have an approved leave plan before requesting leave.',
        key: 'tl',
        life: 5000,
      });
      return;
    }

    // endStr is exclusive in FullCalendar, subtract one day
    const end = new Date(selectInfo.endStr);
    end.setDate(end.getDate() - 1);

    const pad = (n: number) => String(n).padStart(2, '0');
    const toLocalDate = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    this.fromDate = selectInfo.startStr;
    this.selectedStartDate = selectInfo.startStr;
    this.selectedEndDate = toLocalDate(end);
    this.toDate = toLocalDate(end);

    this.openApplyLeave = true;
  }
}
