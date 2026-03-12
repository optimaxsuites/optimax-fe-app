import { Component, OnInit } from '@angular/core';
import { LeaveServiceService } from '../../../service/leave-service.service';
import { PlannedLeave, Employee } from '../../../domain/leave.dto';

interface TimelineDay {
  date: Date;
  dayNumber: number;
  dayName: string;
  isWeekend: boolean;
  isToday: boolean;
}

interface EmployeeRow {
  employee: Employee;
  leaves: TimelineLeave[];
}

interface TimelineLeave {
  leave: PlannedLeave;
  startDay: number;
  duration: number;
  leftPosition: number;
  width: number;
}

interface DepartmentGroup {
  department: string;
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
export class LeaveTimelineComponent implements OnInit {
  

  // Data
  allEmployees: Employee[] = [];
  allLeaves: PlannedLeave[] = [];
  departmentGroups: DepartmentGroup[] = [];
  
  // Timeline
  timelineDays: TimelineDay[] = [];
  currentMonth: Date = new Date();
  
  // Filters
  departments: string[] = [];
  selectedDepartment: string | null = null;
  searchQuery: string = '';
  selectedStatus: string = 'all';
  
  // Config - Responsive
  dayWidth: number = 50;
  rowHeight: number = 50;
  headerHeight: number = 55;
  
  // Responsive config
  visibleDays: number = 31;
  isMobileView: boolean = false;

  constructor(private leaveService: LeaveServiceService) {}

  ngOnInit() {
    console.log('🔍 Custom Timeline Initialized');
    this.checkScreenSize();
    this.departments = this.leaveService.getDepartments();
    this.loadData();
    this.generateTimeline();
    
    // Listen for window resize
    window.addEventListener('resize', () => this.checkScreenSize());
  }


  checkScreenSize() {
    const width = window.innerWidth;
    
    if (width < 768) {
      // Mobile: Show 7 days
      this.visibleDays = 7;
      this.dayWidth = 45;
      this.isMobileView = true;
    } else if (width < 1024) {
      // Tablet: Show 15 days
      this.visibleDays = 15;
      this.dayWidth = 48;
      this.isMobileView = false;
    } else if (width < 1440) {
      // Laptop: Show 20 days
      this.visibleDays = 20;
      this.dayWidth = 50;
      this.isMobileView = false;
    } else {
      // Desktop: Show all days
      this.visibleDays = 31;
      this.dayWidth = 55;
      this.isMobileView = false;
    }
    
    console.log(`📱 Screen: ${width}px → Showing ${this.visibleDays} days at ${this.dayWidth}px each`);
  }


  loadData() {
    console.log('📊 Loading data...');
    
    // Load all employees
    this.allEmployees = this.leaveService.getAllEmployees();
    
    // Load all active leaves
    this.allLeaves = this.leaveService
      .getAllPlannedLeaves()
      .filter(
        (leave) =>
          leave.status === 'Planned' ||
          leave.status === 'Pending' ||
          leave.status === 'Approved',
      );
    
    console.log('👥 Employees:', this.allEmployees.length);
    console.log('📅 Leaves:', this.allLeaves.length);
    
    this.buildDepartmentGroups();
  }

  generateTimeline() {
    this.timelineDays = [];
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    // Get first and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate each day
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
    
    console.log('📆 Generated', this.timelineDays.length, 'days for', this.getMonthYearLabel());
  }

  buildDepartmentGroups() {
    let employees = [...this.allEmployees];
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      employees = employees.filter(emp => 
        emp.name.toLowerCase().includes(query)
      );
    }
    
    // Group by department
    const deptMap = new Map<string, Employee[]>();
    
    employees.forEach(emp => {
      if (!deptMap.has(emp.department)) {
        deptMap.set(emp.department, []);
      }
      deptMap.get(emp.department)!.push(emp);
    });
    
    // Build department groups
    this.departmentGroups = [];
    
    // Sort departments alphabetically
    const sortedDepartments = Array.from(deptMap.keys()).sort();
    
    sortedDepartments.forEach(dept => {
      // Skip if department filter is active and doesn't match
      if (this.selectedDepartment && dept !== this.selectedDepartment) {
        return;
      }
      
      const deptEmployees = deptMap.get(dept)!;
      
      // Sort employees alphabetically within department
      deptEmployees.sort((a, b) => a.name.localeCompare(b.name));
      
      // Build employee rows with leaves
      const employeeRows: EmployeeRow[] = deptEmployees.map(employee => {
        const employeeLeaves = this.allLeaves.filter(
          leave => leave.employeeId === employee.id
        );
        
        const timelineLeaves = employeeLeaves
          .filter(leave => {
            // Filter by status
            if (this.selectedStatus !== 'all' && leave.status !== this.selectedStatus) {
              return false;
            }
            
            // Check if leave overlaps with current month
            return this.isLeaveInCurrentMonth(leave);
          })
          .map(leave => this.calculateLeavePosition(leave));
        
        return {
          employee,
          leaves: timelineLeaves,
        };
      });
      
      // Count total leaves for this department
      const totalLeaves = employeeRows.reduce((sum, row) => sum + row.leaves.length, 0);
      
      this.departmentGroups.push({
        department: dept,
        employees: employeeRows,
        isExpanded: true, // Expanded by default
        employeeCount: deptEmployees.length,
        totalLeaves: totalLeaves,
      });
    });
    
    console.log('✅ Built', this.departmentGroups.length, 'department groups');
  }

  toggleDepartment(group: DepartmentGroup) {
    group.isExpanded = !group.isExpanded;
    console.log(`${group.isExpanded ? '📂' : '📁'} ${group.department}`);
  }

  isLeaveInCurrentMonth(leave: PlannedLeave): boolean {
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
    
    // Check if leave overlaps with current month
    return leaveStart <= monthEnd && leaveEnd >= monthStart;
  }

  calculateLeavePosition(leave: PlannedLeave): TimelineLeave {
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
    
    // Clamp to current month
    if (leaveStart < monthStart) {
      leaveStart = monthStart;
    }
    if (leaveEnd > monthEnd) {
      leaveEnd = monthEnd;
    }
    
    // Calculate start day (1-based)
    const startDay = leaveStart.getDate();
    
    // Calculate duration in days
    const diffTime = leaveEnd.getTime() - leaveStart.getTime();
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
    
    // Calculate position and width
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
      case 'Planned':
        return 'bg-blue-500';
      case 'Pending':
        return 'bg-yellow-500';
      case 'Approved':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  }

  getDepartmentColor(department: string): string {
    const colors: { [key: string]: string } = {
      'Engineering': 'bg-blue-600',
      'Sales': 'bg-green-600',
      'Marketing': 'bg-orange-600',
      'HR': 'bg-purple-600',
      'Finance': 'bg-pink-600',
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

  // Navigation
  goToPreviousMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() - 1,
      1
    );
    this.generateTimeline();
    this.buildDepartmentGroups();
    console.log('⬅️ Previous month:', this.getMonthYearLabel());
  }

  goToNextMonth() {
    this.currentMonth = new Date(
      this.currentMonth.getFullYear(),
      this.currentMonth.getMonth() + 1,
      1
    );
    this.generateTimeline();
    this.buildDepartmentGroups();
    console.log('➡️ Next month:', this.getMonthYearLabel());
  }

  goToToday() {
    this.currentMonth = new Date();
    this.generateTimeline();
    this.buildDepartmentGroups();
    console.log('📍 Back to today:', this.getMonthYearLabel());
  }

  // Filters
  applyFilters() {
    console.log('🔍 Applying filters...', {
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
    console.log('🧹 Filters cleared');
  }

  // Helpers
  getTimelineWidth(): number {
    return this.timelineDays.length * this.dayWidth;
  }

  getTotalEmployees(): number {
    return this.departmentGroups.reduce((sum, group) => sum + group.employeeCount, 0);
  }

  onLeaveClick(leave: PlannedLeave) {
    console.log('🖱️ Leave clicked:', {
      employee: leave.employeeName,
      type: leave.leaveType,
      dates: `${leave.startDate} to ${leave.endDate}`,
      status: leave.status,
      days: leave.workingDays
    });
    // You can open a modal here to show full leave details
    // Example:
    // this.dialog.open(LeaveDetailsModalComponent, { data: leave });
  }

  ngOnDestroy() {
    // Clean up event listener
    window.removeEventListener('resize', () => this.checkScreenSize());
  }
}