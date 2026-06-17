import { Component, OnInit } from '@angular/core';
import { LeaveApiService } from '../../../service/leave-api.service';
import { MessageService } from 'primeng/api';
import {
  TableColumn,
  TableAction,
} from '../../../shared-component/view/table/table.component';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MailNotificationService } from '../../../service/mailNotification.service';

interface DepartmentRisk {
  department: string;
  totalEmployees: number;
  employeesPlanning: number;
  totalDays: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  congestionPeriods: { date: string; count: number }[];
}

interface ConflictData {
  employee: string;
  department: string;
  period: string;
  days: number;
  status: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  planId: number;
  leaveType: string;
  _rawPlan: any; // Store full plan object
}

@Component({
  selector: 'app-leave-planning-dashboard',
  templateUrl: './leave-planning-dashboard.component.html',
  styleUrls: ['./leave-planning-dashboard.component.scss'],
  providers: [MessageService],
})
export class LeavePlanningDashboardComponent implements OnInit {
  // loading states
  isApproving = false;
  isRejecting = false;

  // Filters
  selectedDepartment: string | null = null;
  selectedLeaveType: string | null = null;
  selectedStatus: string | null = null;
  selectedMonth: Date | null = null;

  // Filter options
  departments: string[] = [];
  leaveTypes: any[] = [];
  statuses: string[] = ['PENDING', 'APPROVED', 'REJECTED'];

  // Data
  allEmployees: any[] = [];
  allDepartments: any[] = [];
  allLeavePlans: any[] = [];
  filteredLeavePlans: any[] = [];
  departmentRisks: DepartmentRisk[] = [];
  conflicts: ConflictData[] = [];
  displayedConflicts: ConflictData[] = [];

  // Analytics
  totalPlannedDays = 0;
  employeesPlanning = 0;
  highCongestionDays = 0;
  departmentsAtRisk = 0;

  // Table filters
  searchTerm: string = '';
  selectedStatusFilter: string[] = [];
  selectedLeaveTypeFilter: string[] = [];

  // Modal
  showActionModal: boolean = false;
  selectedPlan: any = null;
  selectedEmployee: any = null;
  adminComment: string = '';
  currentAdminUserId: number | null = null;

  // Loading
  isLoading: boolean = false;

  tableColumns: TableColumn<ConflictData>[] = [
    {
      header: 'Employee',
      field: 'employee',
      sortable: true,
      className: 'table-item',
    },
    {
      header: 'Department',
      field: 'department',
      sortable: true,
      className: 'table-item',
    },
    {
      header: 'Leave Type',
      field: 'leaveType',
      sortable: true,
      className: 'table-item',
    },
    {
      header: 'Planned Period',
      field: 'period',
      className: 'table-item',
    },
    {
      header: 'Days',
      field: 'days',
      sortable: true,
      className: 'table-item',
      align: 'center',
    },
    {
      header: 'Status',
      field: 'status',
      sortable: true,
      className: 'table-item',
    },
    {
      header: 'Risk',
      field: 'riskLevel',
      sortable: true,
      className: 'table-item',
    },
  ];

  tableActions: TableAction<ConflictData>[] = [
    {
      id: 'action',
      label: 'Take Action',
      icon: 'pi pi-ellipsis-v',
      className: 'text-customBlue hover:text-customBlueHover cursor-pointer',
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

  loadCurrentAdminUser() {
    this.apiService.getCurrentEmployee().subscribe({
      next: (employee) => {
        if (employee && employee.user) {
          this.currentAdminUserId = employee.user.id || employee.user.userId;
          console.log('Current admin user ID:', this.currentAdminUserId);
        }
      },
      error: (err) => {
        console.error('Failed to load current admin user:', err);
      },
    });
  }

  // ==================== LOAD DATA FROM API ====================

  loadData() {
    console.log('🔄 Loading dashboard data from API...');
    this.isLoading = true;

    forkJoin({
      employees: this.apiService.getEmployees().pipe(catchError(() => of([]))),
      departments: this.apiService
        .getDepartments()
        .pipe(catchError(() => of([]))),
      leaveTypes: this.apiService
        .getLeaveTypes()
        .pipe(catchError(() => of([]))),
      leavePlans: this.apiService
        .getLeavePlanRecords(1, 1000)
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: (data) => {
        this.allEmployees = data.employees || [];
        this.allDepartments = data.departments || [];
        this.leaveTypes = data.leaveTypes || [];
        this.allLeavePlans = data.leavePlans || [];

        console.log('✅ Data loaded:', {
          employees: this.allEmployees.length,
          departments: this.allDepartments.length,
          leaveTypes: this.leaveTypes.length,
          leavePlans: this.allLeavePlans.length,
        });

        // Extract filter options
        this.departments = this.allDepartments.map((d) => d.name).sort();

        // Link each plan to its employee and department
        this.allLeavePlans = this.allLeavePlans.map((plan) => {
          const employee = this.findEmployeeForPlan(plan);
          const department = employee?.department?.name || 'Unknown';

          return {
            ...plan,
            _linkedEmployee: employee,
            _departmentName: department,
          };
        });

        console.log('📊 Linked plans:', {
          total: this.allLeavePlans.length,
          linked: this.allLeavePlans.filter((p) => p._linkedEmployee).length,
          unlinked: this.allLeavePlans.filter((p) => !p._linkedEmployee).length,
        });

        this.filteredLeavePlans = [...this.allLeavePlans];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Failed to load dashboard data:', err);
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load dashboard data',
          key: 'tl',
        });
      },
    });
  }

  // ==================== FIND EMPLOYEE FOR PLAN ====================

  findEmployeeForPlan(plan: any): any | null {
    // createdBy.userId from plan → employee.user.userId
    const planUserId = plan.createdBy?.userId || plan.createdBy?.id;

    const employee = this.allEmployees.find((emp) => {
      const empUserId = emp.user?.userId || emp.user?.id;
      return empUserId === planUserId;
    });

    if (!employee) {
      console.warn(
        `⚠️ Plan #${plan.id} has no matching employee (userId: ${planUserId})`,
      );
    }

    return employee || null;
  }

  // ==================== FILTERS ====================

  applyFilters() {
    console.log('🔍 Applying filters...', {
      department: this.selectedDepartment,
      leaveType: this.selectedLeaveType,
      status: this.selectedStatus,
      month: this.selectedMonth,
    });

    this.filteredLeavePlans = this.allLeavePlans.filter((plan) => {
      const matchesDept =
        !this.selectedDepartment ||
        plan._departmentName === this.selectedDepartment;

      const matchesType =
        !this.selectedLeaveType ||
        plan.leaveType?.name === this.selectedLeaveType;

      const matchesStatus =
        !this.selectedStatus || plan.status === this.selectedStatus;

      let matchesMonth = true;
      if (this.selectedMonth) {
        const planStart = new Date(plan.startDate);
        matchesMonth =
          planStart.getMonth() === this.selectedMonth.getMonth() &&
          planStart.getFullYear() === this.selectedMonth.getFullYear();
      }

      return matchesDept && matchesType && matchesStatus && matchesMonth;
    });

    console.log(
      `✅ Filtered: ${this.filteredLeavePlans.length} of ${this.allLeavePlans.length} plans`,
    );

    this.calculateAnalytics();
    this.calculateDepartmentRisks();
    this.detectConflicts();
    this.filterTable();
  }

  // ==================== ANALYTICS ====================

  calculateAnalytics() {
    this.totalPlannedDays = this.filteredLeavePlans.reduce(
      (sum, plan) => sum + (plan.totalDays || 0),
      0,
    );

    const uniqueEmployees = new Set(
      this.filteredLeavePlans
        .map((plan) => plan._linkedEmployee?.id)
        .filter((id) => id != null),
    );
    this.employeesPlanning = uniqueEmployees.size;

    // Calculate high congestion days (3+ people on same day)
    const dateCounts = new Map<string, number>();
    this.filteredLeavePlans.forEach((plan) => {
      const start = new Date(plan.startDate);
      const end = new Date(plan.endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1);
      }
    });

    this.highCongestionDays = Array.from(dateCounts.values()).filter(
      (count) => count >= 3,
    ).length;

    console.log('📊 Analytics calculated:', {
      totalDays: this.totalPlannedDays,
      uniqueEmployees: this.employeesPlanning,
      congestionDays: this.highCongestionDays,
    });
  }

  calculateDepartmentRisks() {
    this.departmentRisks = this.departments
      .map((deptName) => {
        const deptEmployees = this.allEmployees.filter(
          (e) => e.department?.name === deptName,
        );

        const deptPlans = this.allLeavePlans.filter(
          (p) =>
            p._departmentName === deptName &&
            (p.status === 'PENDING' || p.status === 'APPROVED'),
        );

        const uniqueEmployees = new Set(
          deptPlans
            .map((p) => p._linkedEmployee?.id)
            .filter((id) => id != null),
        );

        const totalDays = deptPlans.reduce(
          (sum, p) => sum + (p.totalDays || 0),
          0,
        );

        // Calculate congestion periods
        const dateCounts = new Map<string, number>();
        deptPlans.forEach((plan) => {
          const start = new Date(plan.startDate);
          const end = new Date(plan.endDate);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1);
          }
        });

        const congestionPeriods = Array.from(dateCounts.entries())
          .filter(([_, count]) => count >= 2)
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const percentage =
          deptEmployees.length > 0
            ? (uniqueEmployees.size / deptEmployees.length) * 100
            : 0;

        let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
        if (percentage >= 50) riskLevel = 'High';
        else if (percentage >= 30) riskLevel = 'Medium';

        return {
          department: deptName,
          totalEmployees: deptEmployees.length,
          employeesPlanning: uniqueEmployees.size,
          totalDays,
          riskLevel,
          congestionPeriods,
        };
      })
      .filter((risk) => risk.totalEmployees > 0);

    this.departmentsAtRisk = this.departmentRisks.filter(
      (risk) => risk.riskLevel === 'High' || risk.riskLevel === 'Medium',
    ).length;
  }

  // ==================== DETECT CONFLICTS ====================

  detectConflicts() {
    this.conflicts = this.filteredLeavePlans.map((plan) => {
      // Count overlapping plans in same department
      const overlapping = this.filteredLeavePlans.filter(
        (other) =>
          other._departmentName === plan._departmentName &&
          other.id !== plan.id &&
          this.datesOverlap(
            plan.startDate,
            plan.endDate,
            other.startDate,
            other.endDate,
          ),
      ).length;

      let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
      if (overlapping >= 3) riskLevel = 'High';
      else if (overlapping >= 1) riskLevel = 'Medium';

      const employeeName = plan._linkedEmployee
        ? `${plan._linkedEmployee.firstName} ${plan._linkedEmployee.lastName}`
        : plan.createdBy?.fullname || 'Unknown';

      return {
        employee: employeeName,
        department: plan._departmentName || 'Unknown',
        period: `${this.formatDate(plan.startDate)} to ${this.formatDate(plan.endDate)}`,
        days: plan.totalDays || 0,
        status: plan.status,
        riskLevel,
        planId: plan.id,
        leaveType: plan.leaveType?.name || 'Unknown',
        _rawPlan: plan,
      };
    });

    this.displayedConflicts = [...this.conflicts];

    console.log('⚠️ Conflicts detected:', {
      total: this.conflicts.length,
      high: this.conflicts.filter((c) => c.riskLevel === 'High').length,
      medium: this.conflicts.filter((c) => c.riskLevel === 'Medium').length,
      low: this.conflicts.filter((c) => c.riskLevel === 'Low').length,
    });
  }

  datesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    return start1 <= end2 && start2 <= end1;
  }

  // ==================== TABLE FILTERS ====================

  filterTable() {
    this.displayedConflicts = this.conflicts.filter((conflict) => {
      const matchesSearch = conflict.employee
        .toLowerCase()
        .includes(this.searchTerm.toLowerCase());

      const matchesStatusFilter =
        this.selectedStatusFilter.length === 0 ||
        this.selectedStatusFilter.includes(conflict.status);

      const matchesLeaveTypeFilter =
        this.selectedLeaveTypeFilter.length === 0 ||
        this.selectedLeaveTypeFilter.includes(conflict.leaveType);

      return matchesSearch && matchesStatusFilter && matchesLeaveTypeFilter;
    });

    console.log(
      `🔍 Table filtered: ${this.displayedConflicts.length} of ${this.conflicts.length} conflicts`,
    );
  }

  filterBySearchTerm() {
    this.filterTable();
  }

  filterByStatus() {
    this.filterTable();
  }

  filterByLeaveType() {
    this.filterTable();
  }

  // ==================== MODAL ACTIONS ====================

  onActionClick(event: { actionId: string; row: ConflictData }) {
    const plan = event.row._rawPlan;
    if (!plan) {
      console.error('❌ No plan found for conflict');
      return;
    }

    this.selectedPlan = plan;
    this.selectedEmployee = plan._linkedEmployee;
    this.adminComment = '';
    this.showActionModal = true;

    console.log('👆 Action clicked:', {
      planId: plan.id,
      employee: event.row.employee,
      status: plan.status,
    });
  }

  closeActionModal() {
    this.showActionModal = false;
    this.selectedPlan = null;
    this.selectedEmployee = null;
    this.adminComment = '';
    this.isApproving = false;
    this.isRejecting = false;
  }

  // ==================== APPROVE PLAN ====================

  approvePlan() {
    if (!this.selectedPlan || !this.currentAdminUserId) {
      console.error('❌ Cannot approve: missing plan or admin user ID');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Cannot approve leave plan',
        key: 'tl',
      });
      return;
    }
    this.isApproving = true;
    const employeeName = this.selectedEmployee
      ? `${this.selectedEmployee.firstName} ${this.selectedEmployee.lastName}`
      : this.selectedPlan.createdBy?.fullname || 'Unknown';

    const payload = {
      id: this.selectedPlan.id,
      createdAt: this.selectedPlan.createdAt,
      createdBy:
        this.selectedPlan.createdBy?.userId || this.selectedPlan.createdBy?.id,
      startDate: this.selectedPlan.startDate,
      endDate: this.selectedPlan.endDate,
      status: 'APPROVED',
      leaveTypeId: this.selectedPlan.leaveTypeId,
      totalDays: this.selectedPlan.totalDays,
      planReason: this.selectedPlan.planReason,
      attachment: this.selectedPlan.attachment,
      adminComment: this.adminComment.trim() || '',
      decisionBy: this.currentAdminUserId,
      decisionOn: new Date().toISOString(),
    };

    console.log('📤 Approving plan:', payload);

    this.apiService
      .updateLeavePlanRecord(this.selectedPlan.id, payload)
      .subscribe({
        next: () => {
          this.isApproving = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Plan Approved',
            detail: `${employeeName}'s leave plan approved`,
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
            name:
              `${mailEmployee?.firstName} ${mailEmployee?.lastName}` || 'there',
            recieverEmail: mailEmployee?.email,
            subject: `Leave Plan Approved`,
            body: `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">

    <p>Dear ${mailEmployee?.firstName || 'User'},</p>

    <p>
      Your leave plan has been <strong style="color:green;">APPROVED</strong>.
    </p>

    <ul>
      <li><strong>Start Date:</strong> ${payload.startDate}</li>
      <li><strong>End Date:</strong> ${payload.endDate}</li>
      <li><strong>Total Days:</strong> ${payload.totalDays}</li>
      <li><strong>Status:</strong> <span style="color:green;">APPROVED</span></li>
    </ul>

    <p>You may proceed with your planned schedule.</p>

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
          this.isApproving = false;
          console.error('❌ Failed to approve plan:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to approve leave plan',
            key: 'tl',
          });
        },
      });
  }

  // ==================== REJECT PLAN ====================

  rejectPlan() {
    if (!this.selectedPlan || !this.currentAdminUserId) {
      console.error('❌ Cannot reject: missing plan or admin user ID');
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Cannot reject leave plan',
        key: 'tl',
      });
      return;
    }
    this.isRejecting = true;
    const employeeName = this.selectedEmployee
      ? `${this.selectedEmployee.firstName} ${this.selectedEmployee.lastName}`
      : this.selectedPlan.createdBy?.fullname || 'Unknown';

    const reason = this.adminComment.trim() || 'No reason provided';

    const payload = {
      id: this.selectedPlan.id,
      createdAt: this.selectedPlan.createdAt,
      createdBy:
        this.selectedPlan.createdBy?.userId || this.selectedPlan.createdBy?.id,
      startDate: this.selectedPlan.startDate,
      endDate: this.selectedPlan.endDate,
      status: 'REJECTED',
      leaveTypeId: this.selectedPlan.leaveTypeId,
      totalDays: this.selectedPlan.totalDays,
      planReason: this.selectedPlan.planReason,
      attachment: this.selectedPlan.attachment,
      adminComment: reason,
      decisionBy: this.currentAdminUserId,
      decisionOn: new Date().toISOString(),
    };

    console.log('📤 Rejecting plan:', payload);

    this.apiService
      .updateLeavePlanRecord(this.selectedPlan.id, payload)
      .subscribe({
        next: () => {
          this.isRejecting = false;
          this.messageService.add({
            severity: 'warn',
            summary: 'Plan Rejected',
            detail: `${employeeName}'s leave plan rejected`,
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
            name:
              `${mailEmployee?.firstName} ${mailEmployee?.lastName}` || 'there',
            recieverEmail: mailEmployee?.email,
            subject: `Leave Plan Rejected`,
            body: `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">

    <p>Dear ${mailEmployee?.firstName || 'User'},</p>

    <p>
      Your leave plan has been <strong style="color:red;">REJECTED</strong>.
    </p>

    <ul>
      <li><strong>Start Date:</strong> ${payload.startDate}</li>
      <li><strong>End Date:</strong> ${payload.endDate}</li>
      <li><strong>Total Days:</strong> ${payload.totalDays}</li>
      <li><strong>Status:</strong> <span style="color:red;">REJECTED</span></li>
    </ul>

    <p>The following reason was provided:</p>
    <blockquote>${payload.adminComment}</blockquote>

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
          this.isRejecting = false;
          console.error('❌ Failed to reject plan:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to reject leave plan',
            key: 'tl',
          });
        },
      });
  }

  // ==================== HELPERS ====================

  getStatusCount(status: string): number {
    return this.filteredLeavePlans.filter((plan) => plan.status === status)
      .length;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
