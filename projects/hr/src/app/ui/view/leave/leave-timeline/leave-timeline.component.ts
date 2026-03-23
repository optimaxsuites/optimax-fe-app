import { Component, OnInit, OnDestroy } from '@angular/core';
import { LeaveApiService } from '../../../service/leave-api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

  constructor(private apiService: LeaveApiService) {}

  ngOnInit() {
    console.log('Timeline Initialized');
    this.checkScreenSize();
    this.loadData();
    this.generateTimeline();
    
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.checkScreenSize());
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

  loadData() {
    console.log('Loading data from API...');
    this.isLoading = true;
    
    forkJoin({
      employees: this.apiService.getEmployees().pipe(catchError(() => of([]))),
      departments: this.apiService.getDepartments().pipe(catchError(() => of([]))),
      leavePlans: this.apiService.getLeavePlanRecords(1, 1000).pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.allEmployees = data.employees || [];
        this.allDepartments = data.departments || [];
        this.allLeaves = (data.leavePlans || []).filter((plan: any) => 
          plan.status === 'PENDING' || plan.status === 'APPROVED'
        );

        // Extract department names
        this.departments = this.allDepartments.map(d => d.name).sort();

        console.log('✅ Data loaded:', {
          employees: this.allEmployees.length,
          departments: this.allDepartments.length,
          leavePlans: this.allLeaves.length
        });

        this.buildDepartmentGroups();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Failed to load data:', err);
        this.isLoading = false;
      }
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
    
    console.log('Generated', this.timelineDays.length, 'days for', this.getMonthYearLabel());
  }

  buildDepartmentGroups() {
    let employees = [...this.allEmployees];
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      employees = employees.filter(emp => {
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        return fullName.includes(query);
      });
    }
    
    // Group by department
    const deptMap = new Map<number, any[]>();
    
    employees.forEach(emp => {
      if (!emp.department) return;
      
      const deptId = emp.department.id;
      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, []);
      }
      deptMap.get(deptId)!.push(emp);
    });
    
    this.departmentGroups = [];
    
    // Build department groups
    this.allDepartments.forEach(dept => {
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
      
      const employeeRows: EmployeeRow[] = deptEmployees.map(employee => {
        // Find leaves for this employee
        const employeeLeaves = this.allLeaves.filter(
          leave => leave.createdBy?.id === employee.id
        );
        
        const timelineLeaves = employeeLeaves
          .filter(leave => {
            // Apply status filter
            if (this.selectedStatus !== 'all' && leave.status !== this.selectedStatus) {
              return false;
            }
            
            return this.isLeaveInCurrentMonth(leave);
          })
          .map(leave => this.calculateLeavePosition(leave));
        
        return {
          employee,
          leaves: timelineLeaves,
        };
      });
      
      const totalLeaves = employeeRows.reduce((sum, row) => sum + row.leaves.length, 0);
      
      this.departmentGroups.push({
        department: dept.name,
        departmentId: dept.id,
        employees: employeeRows,
        isExpanded: true,
        employeeCount: deptEmployees.length,
        totalLeaves: totalLeaves,
      });
    });
    
    console.log('Built', this.departmentGroups.length, 'department groups');
  }

  toggleDepartment(group: DepartmentGroup) {
    group.isExpanded = !group.isExpanded;
    console.log(group.department, group.isExpanded ? 'expanded' : 'collapsed');
  }

  isLeaveInCurrentMonth(leave: any): boolean {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    
    const monthStart = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      0
    );
    
    return leaveStart <= monthEnd && leaveEnd >= monthStart;
  }

  calculateLeavePosition(leave: any): TimelineLeave {
    const monthStart = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      0
    );
    
    let leaveStart = new Date(leave.startDate);
    let leaveEnd = new Date(leave.endDate);
    
    if (leaveStart < monthStart) {
      leaveStart = monthStart;
    }
    if (leaveEnd > monthEnd) {
      leaveEnd = monthEnd;
    }
    
    const startDay = leaveStart.getDate();
    
    const diffTime = leaveEnd.getTime() - leaveStart.getTime();
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const leftPosition = (startDay - 1) * this.dayWidth;
    const width = duration * this.dayWidth;
    
    return {
      leave,
      startDay,
      duration,
      leftPosition,
      width,
    };
  }

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
      'Sales': 'bg-green-600',
      'Marketing': 'bg-orange-600',
      'Human Resources': 'bg-purple-600',
      'Finance': 'bg-pink-600',
      'Administration': 'bg-indigo-600',
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

  goToPreviousMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.generateTimeline();
    this.buildDepartmentGroups();
    console.log('Previous month:', this.getMonthYearLabel());
  }

  goToNextMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.generateTimeline();
    this.buildDepartmentGroups();
    console.log('Next month:', this.getMonthYearLabel());
  }

  goToToday() {
    this.currentMonth = new Date();
    this.generateTimeline();
    this.buildDepartmentGroups();
    console.log('Back to today:', this.getMonthYearLabel());
  }

  applyFilters() {
    console.log('Applying filters...', {
      department: this.selectedDepartment,
      search: this.searchQuery,
      status: this.selectedStatus
    });
    this.buildDepartmentGroups();
  }

  clearFilters() {
    this.selectedDepartment = null;
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.buildDepartmentGroups();
    console.log('Filters cleared');
  }

  getTimelineWidth(): number {
    return this.timelineDays.length * this.dayWidth;
  }

  getTotalEmployees(): number {
    return this.departmentGroups.reduce((sum, group) => sum + group.employeeCount, 0);
  }

  onLeaveClick(leave: any) {
    const employeeName = leave.createdBy?.fullname || 'Unknown';
    
    console.log('Leave clicked:', {
      employee: employeeName,
      type: leave.leaveType?.name,
      dates: `${leave.startDate} to ${leave.endDate}`,
      status: leave.status,
      days: leave.totalDays
    });
    
    this.selectedLeave = leave;
    this.selectedEmployee = this.allEmployees.find(emp => emp.id === leave.createdBy?.id) || null;
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

  approveLeave() {
    if (!this.selectedLeave) return;
    
    const currentUser = this.apiService.getCurrentUserId();
    
    const payload = {
      ...this.selectedLeave,
      status: 'APPROVED',
      decisionBy: {
        id: 1, // You'll need to get this from current user
        fullname: 'Admin' // Replace with actual admin name
      },
      decisionOn: new Date().toISOString()
    };
    
    this.apiService.updateLeavePlanRecord(this.selectedLeave.id, payload).subscribe({
      next: () => {
        console.log('Leave approved:', this.selectedLeave.id);
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to approve leave:', err);
      }
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
    if (!this.selectedLeave) return;
    
    const payload = {
      ...this.selectedLeave,
      status: 'REJECTED',
      adminComment: this.rejectionReason.trim() || 'No reason provided',
      decisionBy: {
        id: 1,
        fullname: 'Admin'
      },
      decisionOn: new Date().toISOString()
    };
    
    this.apiService.updateLeavePlanRecord(this.selectedLeave.id, payload).subscribe({
      next: () => {
        console.log('Leave rejected:', this.selectedLeave.id);
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Failed to reject leave:', err);
      }
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

  canApproveOrReject(): boolean {
    if (!this.selectedLeave) return false;
    return this.selectedLeave.status === 'PENDING';
  }

  // Helper to format employee name
  getEmployeeName(employee: any): string {
    return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown';
  }

  // Helper to format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}