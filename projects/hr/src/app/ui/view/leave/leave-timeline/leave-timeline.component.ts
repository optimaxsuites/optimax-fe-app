import { Component, OnInit, OnDestroy } from '@angular/core';
import { LeaveApiService } from '../../../service/leave-api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MailNotificationService } from '../../../service/mailNotification.service';

interface TimelineDay {
  date: Date;
  dayNumber: number;
  dayName: string;
  isWeekend: boolean;
  isToday: boolean;
}

interface EmployeeRow {
  employee: any;
  leaves: TimelineLeave[];
}

interface TimelineLeave {
  leave: any;
  startDay: number;
  duration: number;
  leftPosition: number;
  width: number;
}

interface DepartmentGroup {
  department: string;
  departmentId: number;
  employees: EmployeeRow[];
  isExpanded: boolean;
  employeeCount: number;
  totalLeaves: number;
}

@Component({
  selector: 'app-leave-timeline',
  templateUrl: './leave-timeline.component.html',
  styleUrls: ['./leave-timeline.component.scss'],
})
export class LeaveTimelineComponent implements OnInit, OnDestroy {
  // Data
  allEmployees: any[] = [];
  allLeaves: any[] = [];
  allDepartments: any[] = [];
  departmentGroups: DepartmentGroup[] = [];

  // Current admin user
  currentAdminUserId: number | null = null;

  // Timeline
  timelineDays: TimelineDay[] = [];
  currentMonth: Date = new Date();

  // Filters
  departments: string[] = [];
  selectedDepartment: string | null = null;
  searchQuery: string = '';
  selectedStatus: string = 'all';

  // Config
  dayWidth: number = 50;
  rowHeight: number = 50;
  headerHeight: number = 55;

  visibleDays: number = 31;
  isMobileView: boolean = false;

  // Modal
  showLeaveModal: boolean = false;
  selectedLeave: any = null;
  selectedEmployee: any = null;
  rejectionReason: string = '';
  showRejectionInput: boolean = false;

  // Loading
  isLoading: boolean = false;

  constructor(
    private apiService: LeaveApiService,
    private mailNotificationService: MailNotificationService,
  ) {}

  ngOnInit() {
    console.log('Timeline Initialized');
    this.checkScreenSize();
    this.loadCurrentAdminUser();
    this.loadData();
    this.generateTimeline();

    window.addEventListener('resize', () => this.checkScreenSize());
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.checkScreenSize());
  }

  // ==================== LOAD CURRENT ADMIN USER ====================

  loadCurrentAdminUser() {
    this.apiService.getCurrentEmployee().subscribe({
      next: (employee) => {
        if (employee && employee.user) {
          this.currentAdminUserId = employee.user.userId;
          console.log('✅ Current admin user ID:', this.currentAdminUserId);
        }
      },
      error: (err) => {
        console.error('❌ Failed to load current admin user:', err);
      },
    });
  }

  checkScreenSize() {
    const width = window.innerWidth;

    if (width < 768) {
      this.visibleDays = 7;
      this.dayWidth = 45;
      this.isMobileView = true;
    } else if (width < 1024) {
      this.visibleDays = 15;
      this.dayWidth = 48;
      this.isMobileView = false;
    } else if (width < 1440) {
      this.visibleDays = 20;
      this.dayWidth = 50;
      this.isMobileView = false;
    } else {
      this.visibleDays = 31;
      this.dayWidth = 55;
      this.isMobileView = false;
    }

    console.log(`Screen: ${width}px - ${this.dayWidth}px per day`);
  }

  // ==================== LOAD DATA ====================

  loadData() {
    console.log('🔄 Loading data from API...');
    this.isLoading = true;

    forkJoin({
      employees: this.apiService.getEmployees().pipe(catchError(() => of([]))),
      departments: this.apiService
        .getDepartments()
        .pipe(catchError(() => of([]))),
      leavePlans: this.apiService
        .getLeavePlanRecords(1, 1000)
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: (data) => {
        this.allEmployees = data.employees || [];
        this.allDepartments = data.departments || [];

        const allLeavePlans = data.leavePlans || [];

        console.log('📦 Raw data received:', {
          totalEmployees: this.allEmployees.length,
          totalDepartments: this.allDepartments.length,
          totalLeavePlans: allLeavePlans.length,
        });

        // Debug: Log all leave plans
        console.log('📋 All leave plans:', allLeavePlans);

        // CRITICAL: Filter to show ONLY PENDING and APPROVED
        this.allLeaves = allLeavePlans.filter((plan: any) => {
          const isValidStatus =
            plan.status === 'PENDING' || plan.status === 'APPROVED';

          if (!isValidStatus) {
            console.log(
              `🚫 Filtering out leave plan #${plan.id} - Status: ${plan.status}`,
            );
          }

          return isValidStatus;
        });

        console.log(
          `✅ Filtered ${this.allLeaves.length} leave plans (PENDING/APPROVED only) from ${allLeavePlans.length} total`,
        );

        // Debug: Log each leave plan with its creator info
        this.allLeaves.forEach((leave, index) => {
          console.log(`📝 Leave #${index + 1}:`, {
            id: leave.id,
            status: leave.status,
            createdBy: leave.createdBy,
            createdByUserId: leave.createdBy?.userId || leave.createdBy?.id,
            startDate: leave.startDate,
            endDate: leave.endDate,
            leaveType: leave.leaveType?.name,
          });
        });

        // Debug: Log employee user IDs
        console.log('👥 Employee user IDs:');
        this.allEmployees.forEach((emp) => {
          console.log(
            `  - ${emp.firstName} ${emp.lastName}: user.userId=${emp.user?.userId}, user.id=${emp.user?.id}`,
          );
        });

        // Link each leave plan to its employee
        this.allLeaves = this.allLeaves.map((leave) => {
          const leaveUserId = leave.createdBy?.userId || leave.createdBy?.id;

          const employee = this.allEmployees.find((emp) => {
            const empUserId = emp.user?.userId || emp.user?.id || emp.userId;
            return String(empUserId) === String(leaveUserId);
          });

          if (!employee) {
            console.warn(
              `⚠️ Leave #${leave.id} has no matching employee (userId: ${leaveUserId})`,
            );
          } else {
            console.log(
              `✅ Leave #${leave.id} linked to employee: ${employee.firstName} ${employee.lastName}`,
            );
          }

          return {
            ...leave,
            _linkedEmployee: employee,
          };
        });

        // Extract department names
        this.departments = this.allDepartments.map((d) => d.name).sort();

        console.log('✅ Data processing complete:', {
          employees: this.allEmployees.length,
          departments: this.allDepartments.length,
          leavePlans: this.allLeaves.length,
          linkedLeaves: this.allLeaves.filter((l) => l._linkedEmployee).length,
          unlinkedLeaves: this.allLeaves.filter((l) => !l._linkedEmployee)
            .length,
        });

        this.buildDepartmentGroups();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Failed to load data:', err);
        this.isLoading = false;
      },
    });
  }

  generateTimeline() {
    this.timelineDays = [];
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();

    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dayOfWeek = currentDate.getDay();

      this.timelineDays.push({
        date: currentDate,
        dayNumber: day,
        dayName: this.getDayName(dayOfWeek),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: currentDate.getTime() === today.getTime(),
      });
    }

    console.log(
      `📅 Generated ${this.timelineDays.length} days for ${this.getMonthYearLabel()}`,
    );
  }

  // ==================== BUILD DEPARTMENT GROUPS ====================

  buildDepartmentGroups() {
    console.log('🏗️ Building department groups...');

    let employees = [...this.allEmployees];

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      employees = employees.filter((emp) => {
        const fullName =
          `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        return fullName.includes(query);
      });
      console.log(
        `🔍 Search filter "${this.searchQuery}" → ${employees.length} employees`,
      );
    }

    // Group by department
    const deptMap = new Map<number, any[]>();

    employees.forEach((emp) => {
      if (!emp.department) {
        console.warn(
          `⚠️ Employee ${emp.firstName} ${emp.lastName} has no department`,
        );
        return;
      }

      const deptId = emp.department.id;
      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, []);
      }
      deptMap.get(deptId)!.push(emp);
    });

    this.departmentGroups = [];

    // Build department groups
    this.allDepartments.forEach((dept) => {
      // Apply department filter
      if (this.selectedDepartment && dept.name !== this.selectedDepartment) {
        return;
      }

      const deptEmployees = deptMap.get(dept.id) || [];

      if (deptEmployees.length === 0) return;

      // Sort employees by name
      deptEmployees.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`;
        const nameB = `${b.firstName} ${b.lastName}`;
        return nameA.localeCompare(nameB);
      });

      console.log(
        `📂 Processing department: ${dept.name} (${deptEmployees.length} employees)`,
      );

      const employeeRows: EmployeeRow[] = deptEmployees.map((employee) => {
        // Find leaves for this employee using multiple matching strategies
        const empUserId = employee.user?.userId;
        const empId = employee.id;

        const employeeLeaves = this.allLeaves.filter((leave) => {
          const leaveUserId = leave.createdBy?.userId || leave.createdBy?.id;
          const leaveCreatorId = leave.createdBy?.id;

          // Try multiple matching strategies
          const matchByUserId = leaveUserId === empUserId;
          const matchByEmployeeId = leaveCreatorId === empId;

          return matchByUserId || matchByEmployeeId;
        });

        console.log(
          `  👤 ${employee.firstName} ${employee.lastName} (empId: ${empId}, userId: ${empUserId}) → ${employeeLeaves.length} leaves`,
        );

        if (employeeLeaves.length > 0) {
          employeeLeaves.forEach((leave) => {
            console.log(
              `    📝 Leave: ${leave.leaveType?.name} (${leave.startDate} to ${leave.endDate}) - ${leave.status}`,
            );
          });
        }

        const timelineLeaves = employeeLeaves
          .filter((leave) => {
            // Apply status filter
            if (
              this.selectedStatus !== 'all' &&
              leave.status !== this.selectedStatus
            ) {
              console.log(
                `    🚫 Filtered by status: ${leave.status} !== ${this.selectedStatus}`,
              );
              return false;
            }

            // Check if leave is in current month
            const inMonth = this.isLeaveInCurrentMonth(leave);
            if (!inMonth) {
              console.log(
                `    Leave not in current month (${this.getMonthYearLabel()})`,
              );
            }

            return inMonth;
          })
          .map((leave) => this.calculateLeavePosition(leave));

        console.log(
          `    ✅ ${timelineLeaves.length} leaves visible on timeline`,
        );

        return {
          employee,
          leaves: timelineLeaves,
        };
      });

      const totalLeaves = employeeRows.reduce(
        (sum, row) => sum + row.leaves.length,
        0,
      );

      console.log(
        `  📊 Department ${dept.name}: ${totalLeaves} total visible leaves`,
      );

      this.departmentGroups.push({
        department: dept.name,
        departmentId: dept.id,
        employees: employeeRows,
        isExpanded: true,
        employeeCount: deptEmployees.length,
        totalLeaves: totalLeaves,
      });
    });

    console.log(
      `✅ Built ${this.departmentGroups.length} department groups with total ${this.getTotalVisibleLeaves()} leaves`,
    );
  }

  getTotalVisibleLeaves(): number {
    return this.departmentGroups.reduce(
      (sum, group) => sum + group.totalLeaves,
      0,
    );
  }

  toggleDepartment(group: DepartmentGroup) {
    group.isExpanded = !group.isExpanded;
    console.log(group.department, group.isExpanded ? 'expanded' : 'collapsed');
  }

  // ==================== DATE CALCULATIONS ====================

  isLeaveInCurrentMonth(leave: any): boolean {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);

    const monthStart = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      1,
    );
    const monthEnd = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      0,
    );

    // Set times to compare dates only
    leaveStart.setHours(0, 0, 0, 0);
    leaveEnd.setHours(0, 0, 0, 0);
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const isInMonth = leaveStart <= monthEnd && leaveEnd >= monthStart;

    console.log(
      `      📅 Date check: ${leave.startDate} to ${leave.endDate} in ${this.getMonthYearLabel()}? ${isInMonth}`,
    );

    return isInMonth;
  }

  calculateLeavePosition(leave: any): TimelineLeave {
    const monthStart = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      1,
    );
    const monthEnd = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      0,
    );

    let leaveStart = new Date(leave.startDate);
    let leaveEnd = new Date(leave.endDate);

    // Clamp to current month
    if (leaveStart < monthStart) {
      leaveStart = monthStart;
    }
    if (leaveEnd > monthEnd) {
      leaveEnd = monthEnd;
    }

    const startDay = leaveStart.getDate();

    // Calculate duration including both start and end days
    const diffTime = leaveEnd.getTime() - leaveStart.getTime();
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const leftPosition = (startDay - 1) * this.dayWidth;
    const width = duration * this.dayWidth;

    console.log(
      `      📐 Position: day ${startDay}, duration ${duration} days, left ${leftPosition}px, width ${width}px`,
    );

    return {
      leave,
      startDay,
      duration,
      leftPosition,
      width,
    };
  }

  // ==================== UI HELPERS ====================

  getLeaveColor(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500';
      case 'APPROVED':
        return 'bg-green-500';
      case 'REJECTED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  getDepartmentColor(department: string): string {
    const colors: { [key: string]: string } = {
      'Information Technology': 'bg-blue-600',
      Sales: 'bg-green-600',
      Marketing: 'bg-orange-600',
      'Human Resources': 'bg-purple-600',
      Finance: 'bg-pink-600',
      Administration: 'bg-indigo-600',
    };
    return colors[department] || 'bg-gray-600';
  }

  getDayName(dayOfWeek: number): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayOfWeek];
  }

  getMonthYearLabel(): string {
    return this.currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }

  getEmployeeName(employee: any): string {
    return (
      `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
      'Unknown'
    );
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // ==================== NAVIGATION ====================

  goToPreviousMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1,
    );
    this.generateTimeline();
    this.buildDepartmentGroups();
    console.log('◀️ Previous month:', this.getMonthYearLabel());
  }

  goToNextMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1,
    );
    this.generateTimeline();
    this.buildDepartmentGroups();
    console.log('▶️ Next month:', this.getMonthYearLabel());
  }

  goToToday() {
    this.currentMonth = new Date();
    this.generateTimeline();
    this.buildDepartmentGroups();
    console.log('🏠 Back to today:', this.getMonthYearLabel());
  }

  // ==================== FILTERS ====================

  applyFilters() {
    console.log('🔍 Applying filters...', {
      department: this.selectedDepartment,
      search: this.searchQuery,
      status: this.selectedStatus,
    });
    this.buildDepartmentGroups();
  }

  clearFilters() {
    this.selectedDepartment = null;
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.buildDepartmentGroups();
    console.log('🧹 Filters cleared');
  }

  getTimelineWidth(): number {
    return this.timelineDays.length * this.dayWidth;
  }

  getTotalEmployees(): number {
    return this.departmentGroups.reduce(
      (sum, group) => sum + group.employeeCount,
      0,
    );
  }

  // ==================== MODAL ACTIONS ====================

  onLeaveClick(leave: any) {
    const employeeName = leave.createdBy?.fullname || 'Unknown';

    console.log('👆 Leave clicked:', {
      id: leave.id,
      employee: employeeName,
      type: leave.leaveType?.name,
      dates: `${leave.startDate} to ${leave.endDate}`,
      status: leave.status,
      days: leave.totalDays,
    });

    this.selectedLeave = leave;

    // Find employee using linking logic
    const leaveUserId = leave.createdBy?.userId || leave.createdBy?.id;
    this.selectedEmployee =
      this.allEmployees.find((emp) => String(emp.user?.userId || emp.user?.id || emp.userId) === String(leaveUserId)) || null;

    this.showLeaveModal = true;
    this.rejectionReason = '';
    this.showRejectionInput = false;
  }

  closeModal() {
    this.showLeaveModal = false;
    this.selectedLeave = null;
    this.selectedEmployee = null;
    this.rejectionReason = '';
    this.showRejectionInput = false;
  }

  canApproveOrReject(): boolean {
    if (!this.selectedLeave) return false;
    return this.selectedLeave.status === 'PENDING';
  }

  // ==================== APPROVE / REJECT ====================

  approveLeave() {
    if (!this.selectedLeave || !this.currentAdminUserId) {
      console.error('❌ Cannot approve: missing leave or admin user ID');
      return;
    }

    // Build update payload
    const payload = {
      id: this.selectedLeave.id,
      createdAt: this.selectedLeave.createdAt,
      createdBy:
        this.selectedLeave.createdBy?.userId ||
        this.selectedLeave.createdBy?.id,
      startDate: this.selectedLeave.startDate,
      endDate: this.selectedLeave.endDate,
      status: 'APPROVED',
      leaveTypeId: this.selectedLeave.leaveTypeId,
      totalDays: this.selectedLeave.totalDays,
      planReason: this.selectedLeave.planReason,
      attachment: this.selectedLeave.attachment,
      adminComment: this.selectedLeave.adminComment || '',
      decisionBy: this.currentAdminUserId,
      decisionOn: new Date().toISOString(),
    };

    console.log('📤 Approving leave:', payload);

    this.apiService
      .updateLeavePlanRecord(this.selectedLeave.id, payload)
      .subscribe({
        next: (updated) => {
          console.log('✅ Leave approved:', updated);
          this.closeModal();
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
          console.error('❌ Failed to approve leave:', err);
          alert('Failed to approve leave. Please try again.');
        },
      });
  }

  initiateReject() {
    this.showRejectionInput = true;
  }

  cancelReject() {
    this.showRejectionInput = false;
    this.rejectionReason = '';
  }

  confirmReject() {
    if (!this.selectedLeave || !this.currentAdminUserId) {
      console.error('❌ Cannot reject: missing leave or admin user ID');
      return;
    }
    const payload = {
      id: this.selectedLeave.id,
      createdAt: this.selectedLeave.createdAt,
      createdBy:
        this.selectedLeave.createdBy?.userId ||
        this.selectedLeave.createdBy?.id,
      startDate: this.selectedLeave.startDate,
      endDate: this.selectedLeave.endDate,
      status: 'REJECTED',
      leaveTypeId: this.selectedLeave.leaveTypeId,
      totalDays: this.selectedLeave.totalDays,
      planReason: this.selectedLeave.planReason,
      attachment: this.selectedLeave.attachment,
      adminComment: this.rejectionReason.trim() || 'No reason provided',
      decisionBy: this.currentAdminUserId,
      decisionOn: new Date().toISOString(),
    };

    console.log('📤 Rejecting leave:', payload);

    this.apiService
      .updateLeavePlanRecord(this.selectedLeave.id, payload)
      .subscribe({
        next: (updated) => {
          console.log('✅ Leave rejected:', updated);
          this.closeModal();
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
          console.error('❌ Failed to reject leave:', err);
          alert('Failed to reject leave. Please try again.');
        },
      });
  }
}
