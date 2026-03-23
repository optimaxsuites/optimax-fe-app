import { Component, OnInit } from '@angular/core';
import { OverlayPanel } from 'primeng/overlaypanel';
import { FullCalendarModule } from '@fullcalendar/angular';
import {
  CalendarOptions,
  EventInput,
  DayCellContentArg,
} from '@fullcalendar/core';
import { LeaveServiceService } from '../../../service/leave-service.service';
import { LeaveApiService } from '../../../service/leave-api.service';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Employee,
  LeaveSettings,
  PlannedLeave,
} from '../../../domain/leave.dto';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from '../../../shared-component/service/random-token/random-token.service';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-leave-usage',
  templateUrl: './leave-usage.component.html',
  styleUrl: './leave-usage.component.scss',
  providers: [MessageService],
})
export class LeaveUsageComponent implements OnInit {
  // API Data
  currentEmployee: any = null;
  currentEmployeeId: number | null = null;
  leaveBalances: any[] = [];
  leaveTypes: any[] = [];
  isLoadingStats: boolean = false;

  // Existing properties
  employee!: Employee;
  statuses: string[] = ['Pending Approval', 'Approved', 'Rejected'];
  leaveSettings!: LeaveSettings;
  allowedLeaveTypes!: string[];
  userInfoRegData: any[] = [];
  userRegData: any = {};
  searchTerm: string = '';
  selectedLeaveType: string[] = [];
  selectedStatus: string[] = [];
  myRequests: any = [];
  filteredRequests: any = [];
  requestInView: any;
  openViewRequest: boolean = false;
  fromDate: any;
  toDate: any;
  today!: string;
  comment: any;
  attachment: any;
  docUploadStatus: string = 'Upload file';
  selectedLeave: string = '';
  openApplyLeave = false;
  requestColumns: TableColumn[] = [
    { header: 'Date', field: 'AppliedOn', sortable: true, className: 'table-item' },
    { header: 'Date Applied for', field: 'Date', sortable: true, className: 'table-item' },
    { header: 'Leave Type', field: 'LeaveType', sortable: true, className: 'table-item' },
    {
      header: 'Net Leave Balance',
      field: 'NetLeaveBalance',
      sortable: true,
      className: 'table-item',
      formatter: (row) => `${row.NetLeaveBalance ?? 0} day(s)`
    },
    { header: 'Requested Duration', field: 'RequestedDuration', sortable: true, className: 'table-item' },
    { header: 'Status', field: 'Status', sortable: true, className: 'table-item' }
  ];
  requestActions: TableAction[] = [
    { id: 'view', label: 'View', icon: 'pi pi-eye' }
  ];

  // Planned leaves
  plannedLeaves: PlannedLeave[] = [];
  allowedDateRanges: { start: string; end: string }[] = [];
  hasPlannedLeaves: boolean = false;

  calendarEvents: EventInput[] = [];
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    events: this.calendarEvents,
    dayCellClassNames: this.getDayCellClass.bind(this),
    dayCellDidMount: this.styleDayCell.bind(this),
  };

  constructor(
    private messageService: MessageService,
    private token: RandomTokenService,
    private leaveService: LeaveServiceService,
    private apiService: LeaveApiService
  ) {}

  ngOnInit() {
    this.loadCurrentEmployeeStats();
    
    // Keep existing mock data for leave requests
    this.leaveSettings = this.leaveService.getLeaveSettings();
    this.employee = this.leaveService.getEmployeeById('EMP-001');

    this.today = new Date().toISOString().split('T')[0];
    this.userRegData = this.userInfoRegData;

    // Load planned leaves
    this.plannedLeaves = this.leaveService.loadPlannedLeaves(this.employee.id);
    this.calculateAllowedDateRanges();

    this.filteredRequests = this.leaveService.getEmployeeLeaveRequests(
      this.employee.id,
    );
    this.myRequests = [...this.filteredRequests];
    this.sortByStatus();
    this.updateCalendarEvents();
  }

  // ==================== API DATA LOADING ====================

  loadCurrentEmployeeStats() {
    this.isLoadingStats = true;

    this.apiService.getCurrentEmployee().subscribe({
      next: (employee) => {
        if (!employee) {
          console.warn('No employee loaded');
          this.isLoadingStats = false;
          return;
        }

        this.currentEmployee = employee;
        this.currentEmployeeId = employee.id;

        console.log('✅ Current employee loaded:', employee);

        // Load balances and leave types
        this.loadLeaveBalances();
      },
      error: (err) => {
        console.error('❌ Failed to load current employee:', err);
        this.isLoadingStats = false;
      }
    });
  }

  loadLeaveBalances() {
    forkJoin({
      balances: this.apiService.getLeaveBalances().pipe(catchError(() => of([]))),
      leaveTypes: this.apiService.getLeaveTypes().pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        // Filter balances for current employee
        this.leaveBalances = (data.balances || []).filter(
          (balance: any) => balance.employee === this.currentEmployeeId
        );

        this.leaveTypes = data.leaveTypes || [];

        console.log('✅ Leave balances loaded:', {
          balances: this.leaveBalances.length,
          leaveTypes: this.leaveTypes.length
        });

        this.isLoadingStats = false;
      },
      error: (err) => {
        console.error('❌ Failed to load leave balances:', err);
        this.isLoadingStats = false;
      }
    });
  }

  // ==================== STATS CALCULATIONS FROM API ====================

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

  // ==================== LEAVE TYPE CARDS FROM API ====================

  getLeaveTypeCards() {
    if (!this.leaveBalances || !this.leaveTypes || this.leaveBalances.length === 0) {
      return [];
    }

    return this.leaveBalances.map(balance => {
      // Find the corresponding leave type
      const leaveType = this.leaveTypes.find(lt => lt.id === balance.leaveTypeId);
      
      const totalAllocated = (balance.balance || 0) + (balance.usedDays || 0);
      const remaining = balance.balance || 0;
      const used = balance.usedDays || 0;
      const usedPercentage = totalAllocated > 0 ? (used / totalAllocated) * 100 : 0;

      return {
        typeName: leaveType?.name || 'Unknown',
        allocatedDays: totalAllocated,
        daysUsed: used,
        remainingDays: remaining,
        usedPercentage: usedPercentage,
        isActive: true
      };
    });
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
    } else if (!isAllowed) {
      arg.el.style.backgroundColor = '#fee';
      arg.el.style.color = '#999';
      arg.el.style.cursor = 'not-allowed';
      arg.el.style.textDecoration = 'line-through';
    } else {
      arg.el.style.backgroundColor = '#e8f5e9';
      arg.el.style.cursor = 'pointer';
    }
  }

  // ==================== PLANNED LEAVE VALIDATION ====================

  calculateAllowedDateRanges() {
    this.allowedDateRanges = this.plannedLeaves
      .filter((plan) => plan.status == 'Approved')
      .map((plan) => ({
        start: plan.startDate,
        end: plan.endDate,
      }));

    this.hasPlannedLeaves = this.allowedDateRanges.length > 0;
  }

  isDateAllowed(dateString: string): boolean {
    if (this.allowedDateRanges.length === 0) {
      return false;
    }

    return this.allowedDateRanges.some((range) => {
      return dateString >= range.start && dateString <= range.end;
    });
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

  isDateDisabled(date: string): boolean {
    const isPast = new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));
    if (isPast) return true;
    return !this.isDateAllowed(date);
  }

  validateDateRange(): boolean {
    if (!this.fromDate || !this.toDate) {
      return false;
    }

    if (!this.hasPlannedLeaves) {
      this.messageService.add({
        severity: 'error',
        summary: 'No Planned Leave',
        detail:
          'You must plan your leave first before submitting a request. Go to Leave Planning to create a plan.',
        key: 'tl',
        life: 5000,
      });
      return false;
    }

    const fromValid = this.isDateAllowed(this.fromDate);
    const toValid = this.isDateAllowed(this.toDate);

    if (!fromValid || !toValid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid Date Range',
        detail:
          'You can only request leave for dates within your approved planned leave periods',
        key: 'tl',
        life: 5000,
      });
      return false;
    }

    const start = new Date(this.fromDate);
    const end = new Date(this.toDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!this.isDateAllowed(dateStr)) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid Date Range',
          detail:
            'Your selected range includes dates outside your planned leave periods',
          key: 'tl',
          life: 5000,
        });
        return false;
      }
    }

    return true;
  }

  getFormattedAllowedRanges(): string {
    if (this.allowedDateRanges.length === 0) {
      return 'No approved planned leave periods yet';
    }

    return this.allowedDateRanges
      .map((range) => `${range.start} to ${range.end}`)
      .join(', ');
  }

  // ==================== LEAVE REQUEST METHODS ====================

  openApplyLeaveModal() {
    if (!this.hasPlannedLeaves) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Plan Leave First',
        detail:
          'You must create and get approval for a leave plan before applying for leave. Go to Leave Planning.',
        key: 'tl',
        life: 5000,
      });
      return;
    }
    this.openApplyLeave = true;
  }

  sortByStatus() {
    this.myRequests.sort((a: any, b: any) => {
      const dateA = new Date(a.AppliedOn);
      const dateB = new Date(b.AppliedOn);
      return dateB.getTime() - dateA.getTime();
    });
  }

  filterCandidates() {
    this.myRequests = this.filteredRequests.filter(
      (employee: { Employee: string; LeaveType: any; Status: any }) => {
        const matchesSearchTerm = employee.Employee.toLowerCase().includes(
          this.searchTerm.toLowerCase(),
        );

        const matchesLeaveType =
          this.selectedLeaveType.length === 0 ||
          this.selectedLeaveType.includes(employee.LeaveType);
        const matchesStatus =
          this.selectedStatus.length === 0 ||
          this.selectedStatus.includes(employee.Status);

        return matchesSearchTerm && matchesLeaveType && matchesStatus;
      },
    );
    this.sortByStatus();
    this.updateCalendarEvents();
  }

  filterBySelectedStatus() {
    if (this.selectedStatus.length == 0) {
      this.myRequests = [...this.filteredRequests];
    } else {
      this.myRequests = this.filteredRequests.filter(
        (employee: { Status: string }) =>
          this.selectedStatus.some((status: string) =>
            employee.Status.toLowerCase().includes(status.toLowerCase()),
          ),
      );
    }

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      this.filterCandidates();
    }
    this.sortByStatus();
  }

  filterBySelectedLeaveType() {
    if (this.selectedLeaveType.length == 0) {
      this.myRequests = [...this.filteredRequests];
    } else {
      this.myRequests = this.filteredRequests.filter(
        (employee: { LeaveType: string }) =>
          this.selectedLeaveType.some((status: string) =>
            employee.LeaveType.toLowerCase().includes(status.toLowerCase()),
          ),
      );
    }

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      this.filterCandidates();
    }
    this.sortByStatus();
  }

  viewLRequest(request: any, op?: OverlayPanel) {
    this.requestInView = request;
    this.openViewRequest = true;
    op?.hide();
  }

  handleRequestAction(event: { actionId: string; row: any }) {
    if (event.actionId === 'view') {
      this.viewLRequest(event.row);
    }
  }

  parseDateRange(dateRange: string) {
    const [start, end] = dateRange.split(' to ');
    return {
      start: start,
      end: end,
    };
  }

  addOneDay(date: string) {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  updateCalendarEvents() {
    this.calendarEvents = this.myRequests.map((req: any) => {
      const { start, end } = this.parseDateRange(req.Date);

      let backgroundColor = '#3B82F6';
      let borderColor = '#2563EB';
      let textColor = '#FFFFFF';

      if (req.Status.includes('Approved')) {
        backgroundColor = '#10B981';
        borderColor = '#059669';
      } else if (req.Status.includes('Rejected')) {
        backgroundColor = '#EF4444';
        borderColor = '#DC2626';
      } else if (req.Status.includes('Pending')) {
        backgroundColor = '#F59E0B';
        borderColor = '#D97706';
      }

      return {
        title: req.LeaveType,
        start,
        end: this.addOneDay(end),
        backgroundColor,
        borderColor,
        textColor,
        extendedProps: {
          status: req.Status,
          duration: req.RequestedDuration,
        },
      };
    });

    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.calendarEvents,
    };
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

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.attachment = file;
      this.docUploadStatus = 'File attached';
    }
  }

  resetForm() {
    this.comment = '';
    this.fromDate = '';
    this.toDate = '';
    this.selectedLeave = '';
    this.attachment = null;
    this.docUploadStatus = 'Upload file';
  }

  assignLeave() {
    let leaveRequests = JSON.parse(
      localStorage.getItem('leaveRequest') || '[]',
    );

    if (this.fromDate && this.toDate && this.selectedLeave) {
      if (!this.validateDateRange()) {
        return;
      }

      const from = new Date(this.fromDate);
      const to = new Date(this.toDate);
      const timeDiff = to.getTime() - from.getTime();
      const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

      const createLeaveRequest = (attachmentData: any) => {
        const leaveRequest = {
          Employee: this.userRegData.fullname || this.employee.name,
          EmployeeId: this.employee.id,
          Date: `${this.fromDate} to ${this.toDate}`,
          LeaveType: this.selectedLeave,
          NetLeaveBalance:
            this.leaveSettings.totalLeaveDaysAllowed - this.employee.leaveUsed,
          RequestedDuration: `${dayDiff}.00 day(s)`,
          Status: `Pending Approval (${dayDiff}.00 day(s))`,
          RequestComment: this.comment ? this.comment : 'No comment',
          AppliedOn: this.getCurrentDateTime(),
          ApprovalComment: '',
          Id: this.token.getRandomToken(),
          Attachment: attachmentData,
        };
        leaveRequests.push(leaveRequest);
        this.leaveService.createLeaveRequest(leaveRequest);
        this.filteredRequests = this.leaveService.getEmployeeLeaveRequests(
          this.employee.id,
        );
        this.myRequests = [...this.filteredRequests];

        this.resetForm();
        this.openApplyLeave = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Leave',
          detail: `Leave requested successfully`,
          key: 'tl',
          life: 3000,
        });
      };

      const handleFileRead = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          if (this.attachment) {
            const file = this.attachment;
            const reader = new FileReader();

            reader.onload = () => {
              const attachmentData = {
                fileName: file.name,
                fileType: file.type,
                fileData: reader.result,
              };
              resolve(attachmentData);
            };

            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        });
      };

      handleFileRead()
        .then((attachmentData) => {
          createLeaveRequest(attachmentData);
        })
        .catch((error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'File Error',
            detail: 'Error reading the file',
            life: 3000,
          });
          console.error('File reading error:', error);
        });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Leave',
        detail: 'Please ensure all required fields are filled',
        key: 'tl',
        life: 3000,
      });
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
}