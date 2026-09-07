import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { LeaveApiService } from '../../../service/leave-api.service';
import {
  TableAction,
  TableColumn,
} from '../../../shared-component/view/table/table.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MailNotificationService } from '../../../service/mailNotification.service';

@Component({
  selector: 'app-leave-request',
  templateUrl: './leave-request.component.html',
  styleUrl: './leave-request.component.scss',
  providers: [MessageService],
})
export class LeaveRequestComponent implements OnInit {
  // Current admin user
  currentAdminUserId: number | null = null;

  // Data
  allEmployees: any[] = [];
  allLeaveRequests: any[] = [];
  leaveBalances: any[] = [];
  leaveTypes: any[] = [];
  filteredRequests: any[] = [];
  displayedRequests: any[] = [];

  // Filters
  statuses: string[] = ['PENDING', 'APPROVED', 'REJECTED'];
  selectedLeaveType: string[] = [];
  selectedStatus: string[] = [];
  searchTerm: string = '';

  // Modal
  showActionModal: boolean = false;
  selectedRequest: any = null;
  selectedEmployee: any = null;
  adminComment: string = '';
  showViewModal: boolean = false;
  requestInView: any = null;

  // Loading
  isLoading: boolean = false;

  // Table config
  leaveRequestColumns: TableColumn[] = [
    {
      header: 'Employee',
      field: 'employeeName',
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

  leaveRequestActions: TableAction[] = [
    { id: 'view', label: 'View', icon: 'pi pi-eye' },
    {
      id: 'action',
      label: 'Approve/Reject',
      icon: 'pi pi-ellipsis-v',
      visible: (row) => row.status === 'PENDING',
    },
  ];

  constructor(
    private messageService: MessageService,
    private apiService: LeaveApiService,
    private mailNotificationService: MailNotificationService,
  ) {}

  ngOnInit() {
    this.loadCurrentAdminUser();
    this.loadData();
  }

  // ==================== LOAD CURRENT ADMIN USER ====================

  /**
   * Resolves the acting user's ID directly from session (set at login),
   * rather than via an Employee-record lookup. The previous approach
   * required a successful GET to /employees/employee/by/userId/{id} AND
   * a populated employee.user relation — which silently failed (no error,
   * no log) whenever the Employee record existed but had `user: null`,
   * permanently blocking approve/reject for that account. decisionBy is
   * an audit field, not an authorization check, so this only needs the
   * session userId, which is always available once logged in.
   */
  loadCurrentAdminUser() {
    this.currentAdminUserId = this.apiService.getCurrentUserIdAsNumber();
    if (this.currentAdminUserId) {
      console.log('✅ Current admin user ID:', this.currentAdminUserId);
    } else {
      console.warn('⚠️ No userId found in session — decisionBy will be unavailable until re-login.');
    }
  }

  // ==================== LOAD DATA ====================

  loadData() {
    console.log('🔄 Loading leave requests data...');
    this.isLoading = true;

    forkJoin({
      employees: this.apiService.getEmployees().pipe(catchError(() => of([]))),
      leaveRequests: this.apiService
        .getLeaveRequestRecords(1, 1000)
        .pipe(catchError(() => of([]))),
      leaveBalances: this.apiService
        .getLeaveBalances()
        .pipe(catchError(() => of([]))),
      leaveTypes: this.apiService
        .getLeaveTypes()
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: (data) => {
        this.allEmployees = data.employees || [];
        this.allLeaveRequests = data.leaveRequests || [];
        this.leaveBalances = data.leaveBalances || [];
        this.leaveTypes = data.leaveTypes || [];

        console.log('📊 Leave Requests:', this.allLeaveRequests);
        console.log('👥 Employees:', this.allEmployees.length);
        console.log('💰 Leave Balances:', this.leaveBalances.length);

        // Link each request to its employee
        this.allLeaveRequests = this.allLeaveRequests.map((request) => {
          const employee = this.findEmployeeForRequest(request);
          return {
            ...request,
            _linkedEmployee: employee,
          };
        });

        this.buildDisplayData();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Failed to load data:', err);
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load leave requests',
          key: 'tl',
        });
      },
    });
  }

  findEmployeeForRequest(request: any): any | null {
    const requestUserId = request.createdBy?.userId || request.createdBy?.id;

    const employee = this.allEmployees.find((emp) => {
      const empUserId = emp.user?.userId || emp.user?.id;
      return empUserId === requestUserId;
    });

    if (!employee) {
      console.warn(
        `⚠️ Request #${request.id} has no matching employee (userId: ${requestUserId})`,
      );
    }

    return employee || null;
  }

  // ==================== BUILD DISPLAY DATA ====================

  buildDisplayData() {
    this.filteredRequests = this.allLeaveRequests.map((request) => {
      const employeeName = request._linkedEmployee
        ? `${request._linkedEmployee.firstName} ${request._linkedEmployee.lastName}`
        : request.createdBy?.fullname || 'Unknown';

      return {
        id: request.id,
        employeeName: employeeName,
        period: `${this.extractDate(request.startDate)} to ${this.extractDate(request.endDate)}`,
        leaveTypeName: request.leaveType?.name || 'Unknown',
        totalDays: request.totalDays,
        status: request.status,
        _rawRequest: request,
      };
    });

    this.displayedRequests = [...this.filteredRequests];
    this.applyFilters();
  }

  // ==================== DATE HELPERS ====================

  /**
   * API serializes LocalDateTime as arrays, e.g. [2026,3,24,13,38,52]
   * (year, month 1-based, day, hour, minute, second[, nano]) instead of an
   * ISO string. Passing that straight to .split('T') or `new Date(...)`
   * throws, which previously happened synchronously inside buildDisplayData()
   * before isLoading was set to false — leaving the screen stuck on
   * "Loading leave requests..." even though the data had already arrived.
   */
  private toDate(value: any): Date {
    if (Array.isArray(value)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = value;
      return new Date(year, (month || 1) - 1, day || 1, hour, minute, second);
    }
    if (value instanceof Date) return value;
    if (!value) return new Date(NaN);
    return new Date(value);
  }

  private isValidDate(d: Date): boolean {
    return d instanceof Date && !isNaN(d.getTime());
  }

  extractDate(dateValue: any): string {
    const d = this.toDate(dateValue);
    if (!this.isValidDate(d)) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ==================== FILTERS ====================

  applyFilters() {
    this.displayedRequests = this.filteredRequests.filter((req) => {
      const matchesSearch =
        req.employeeName
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        req.period.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesLeaveType =
        this.selectedLeaveType.length === 0 ||
        this.selectedLeaveType.includes(req.leaveTypeName);

      const matchesStatus =
        this.selectedStatus.length === 0 ||
        this.selectedStatus.includes(req.status);

      return matchesSearch && matchesLeaveType && matchesStatus;
    });

    console.log(
      `🔍 Filtered: ${this.displayedRequests.length} of ${this.filteredRequests.length} requests`,
    );
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

  // ==================== TABLE ACTIONS ====================

  handleLeaveRequestAction(event: { actionId: string; row: any }) {
    if (event.actionId === 'view') {
      this.viewRequest(event.row);
    } else if (event.actionId === 'action') {
      this.openActionModal(event.row);
    }
  }

  viewRequest(row: any) {
    this.requestInView = row._rawRequest;
    this.selectedEmployee = row._rawRequest._linkedEmployee;
    this.showViewModal = true;
  }

  openActionModal(row: any) {
    const request = row._rawRequest;

    console.log('👆 Selected Request:', request);

    this.selectedRequest = request;
    this.selectedEmployee = request._linkedEmployee;
    this.adminComment = '';
    this.showActionModal = true;
  }

  closeActionModal() {
    this.showActionModal = false;
    this.selectedRequest = null;
    this.selectedEmployee = null;
    this.adminComment = '';
  }

  closeViewModal() {
    this.showViewModal = false;
    this.requestInView = null;
    this.selectedEmployee = null;
  }

  // ==================== APPROVE LOGIC ====================

  approveLeave() {
    if (!this.selectedRequest) {
      console.error('❌ Cannot approve: no leave request selected');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Cannot approve leave request',
        key: 'tl',
      });
      return;
    }
    if (!this.currentAdminUserId) {
      console.warn('⚠️ No admin user ID in session — proceeding, but decisionBy will be recorded as unknown.');
    }

    const request = this.selectedRequest;
    const requestedDays = request.totalDays;
    const leaveTypeId = request.leaveTypeId;

    console.log('🔍 Checking balance for approval:', {
      requestId: request.id,
      employee: this.selectedEmployee
        ? `${this.selectedEmployee.firstName} ${this.selectedEmployee.lastName}`
        : 'Unknown',
      leaveType: request.leaveType?.name,
      requestedDays: requestedDays,
    });

    // Find employee's balance for this leave type
    const employeeBalance = this.leaveBalances.find(
      (balance) =>
        balance.employee === this.selectedEmployee?.id &&
        balance.leaveTypeId === leaveTypeId,
    );

    if (!employeeBalance) {
      console.warn('⚠️ No balance record found for employee');
      this.messageService.add({
        severity: 'error',
        summary: 'Balance Error',
        detail: 'No leave balance found for this employee and leave type',
        key: 'tl',
        life: 5000,
      });
      return;
    }

    console.log('💰 Employee Balance:', {
      leaveType: request.leaveType?.name,
      available: employeeBalance.balance,
      used: employeeBalance.usedDays,
      requested: requestedDays,
    });

    // CRITICAL VALIDATION: Check if employee has enough balance
    if (requestedDays > employeeBalance.balance) {
      console.warn('⚠️ Insufficient balance for leave request:', {
        available: employeeBalance.balance,
        requested: requestedDays,
        shortfall: requestedDays - employeeBalance.balance,
      });

      this.messageService.add({
        severity: 'error',
        summary: 'Insufficient Balance',
        detail: `Employee has only ${employeeBalance.balance} days remaining for ${request.leaveType?.name}. Cannot approve ${requestedDays} days.`,
        key: 'tl',
        life: 6000,
      });
      return;
    }

    // ✅ APPROVED - Update request status
    const payload = {
      id: request.id,
      createdAt: request.createdAt,
      createdBy: request.createdBy?.userId || request.createdBy?.id,
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays: request.totalDays,
      status: 'APPROVED',
      leaveReason: request.leaveReason,
      attachment: request.attachment,
      adminComment: this.adminComment.trim() || '',
      decisionBy: this.currentAdminUserId,
      decisionOn: new Date().toISOString(),
    };

    console.log('📤 Approving request:', payload);

    this.apiService.updateLeaveRequestRecord(request.id, payload).subscribe({
      next: () => {
        // Update employee balance
        const updatedBalance = {
          ...employeeBalance,
          balance: employeeBalance.balance - requestedDays,
          usedDays: employeeBalance.usedDays + requestedDays,
        };

        console.log('💰 Updating balance:', {
          old: {
            balance: employeeBalance.balance,
            used: employeeBalance.usedDays,
          },
          new: {
            balance: updatedBalance.balance,
            used: updatedBalance.usedDays,
          },
        });

        this.apiService
          .updateLeaveBalance(employeeBalance.id, updatedBalance)
          .subscribe({
            next: () => {
              console.log('✅ Leave request approved and balance updated');
              this.messageService.add({
                severity: 'success',
                summary: 'Request Approved',
                detail: `Leave request approved. Balance updated: ${updatedBalance.balance} days remaining.`,
                key: 'tl',
                life: 4000,
              });
              this.closeActionModal();
              this.loadData();
              const mailEmployeeId = payload.createdBy;
              const mailEmployee = this.allEmployees.find(
                (emp) =>
                  emp.user?.userId === mailEmployeeId ||
                  emp.id === mailEmployeeId,
              );
              const mailBody = {
                name:
                  `${mailEmployee?.firstName} ${mailEmployee?.lastName}` ||
                  'there',
                recieverEmail: mailEmployee?.email,
                subject: `Leave Request Approved`,
                body: `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">

    <p>Dear ${mailEmployee.firstName || 'User'},</p>

    <p>
      Your leave request has been <strong style="color:green;">APPROVED</strong>.
      See details below:
    </p>

    <ul>
      <li><strong>Leave Type:</strong> ${payload.leaveTypeId}</li>
      <li><strong>Start Date:</strong> ${payload.startDate}</li>
      <li><strong>End Date:</strong> ${payload.endDate}</li>
      <li><strong>Total Days:</strong> ${payload.totalDays}</li>
      <li><strong>Status:</strong> <span style="color:green;">APPROVED</span></li>
    </ul>

    <p>We wish you a pleasant time off.</p>

    <br/>

    <p>Regards,<br/>
    <strong>Management</strong></p>

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
              console.error('❌ Failed to update balance:', err);
              this.messageService.add({
                severity: 'warn',
                summary: 'Partial Success',
                detail: 'Request approved but balance update failed',
                key: 'tl',
              });
              this.closeActionModal();
              this.loadData();
            },
          });
      },
      error: (err) => {
        console.error('❌ Failed to approve request:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to approve leave request',
          key: 'tl',
        });
      },
    });
  }

  // ==================== REJECT LOGIC ====================

  rejectLeave() {
    if (!this.selectedRequest) {
      console.error('❌ Cannot reject: no leave request selected');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Cannot reject leave request',
        key: 'tl',
      });
      return;
    }
    if (!this.currentAdminUserId) {
      console.warn('⚠️ No admin user ID in session — proceeding, but decisionBy will be recorded as unknown.');
    }

    const request = this.selectedRequest;
    const reason = this.adminComment.trim() || 'No reason provided';

    const payload = {
      id: request.id,
      createdAt: request.createdAt,
      createdBy: request.createdBy?.userId || request.createdBy?.id,
      leaveTypeId: request.leaveTypeId,
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays: request.totalDays,
      status: 'REJECTED',
      leaveReason: request.leaveReason,
      attachment: request.attachment,
      adminComment: reason,
      decisionBy: this.currentAdminUserId,
      decisionOn: new Date().toISOString(),
    };

    console.log('📤 Rejecting request:', payload);

    this.apiService.updateLeaveRequestRecord(request.id, payload).subscribe({
      next: () => {
        console.log('✅ Leave request rejected');
        this.messageService.add({
          severity: 'warn',
          summary: 'Request Rejected',
          detail: 'Leave request has been rejected',
          key: 'tl',
          life: 3000,
        });
        this.closeActionModal();
        this.loadData();
        const mailEmployeeId = payload.createdBy;
        const mailEmployee = this.allEmployees.find(
          (emp) =>
            emp.user?.userId === mailEmployeeId || emp.id === mailEmployeeId,
        );
        const mailBody = {
          name: `${mailEmployee.firstName} ${mailEmployee.lastName}` || 'there',
          recieverEmail: mailEmployee.email,
          subject: `Leave Request Rejected`,
          body: `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">

    <p>Dear ${mailEmployee.firstName || 'User'},</p>

    <p>
      We regret to inform you that your leave request has been 
      <strong style="color:red;">REJECTED</strong>.
    </p>

    <ul>
      <li><strong>Leave Type:</strong> ${payload.leaveTypeId}</li>
      <li><strong>Start Date:</strong> ${payload.startDate}</li>
      <li><strong>End Date:</strong> ${payload.endDate}</li>
      <li><strong>Total Days:</strong> ${payload.totalDays}</li>
      <li><strong>Status:</strong> <span style="color:red;">REJECTED</span></li>
      <li><strong>Admin Comment:</strong> ${payload.adminComment || 'N/A'}</li>
    </ul>

    <p>
      For further clarification, please contact your manager or HR.
    </p>

    <br/>

    <p>Regards,<br/>
    <strong>Management</strong></p>

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
        console.error('❌ Failed to reject request:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to reject leave request',
          key: 'tl',
        });
      },
    });
  }

  // ==================== HELPERS ====================

  formatDate(dateValue: any): string {
    if (!dateValue) return 'N/A';
    const d = this.toDate(dateValue);
    if (!this.isValidDate(d)) return 'N/A';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(dateValue: any): string {
    if (!dateValue) return 'N/A';
    const d = this.toDate(dateValue);
    if (!this.isValidDate(d)) return 'N/A';
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusCount(status: string): number {
    return this.filteredRequests.filter((req) => req.status === status).length;
  }
}