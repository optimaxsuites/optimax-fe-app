import { Component, OnInit } from '@angular/core';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { LeaveServiceService } from '../../../service/leave-service.service';
import { Employee, LeavePlanningPolicy } from '../../../domain/leave.dto';
import { MessageService } from 'primeng/api';

interface PlannedLeave {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  workingDays: number;
  status: string;
}

interface ConflictData {
  employee: string;
  department: string;
  period: string;
  days: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

@Component({
  selector: 'app-leave-planning-dashboard',
  templateUrl: './leave-planning-dashboard.component.html',
  styleUrl: './leave-planning-dashboard.component.scss',
  providers: [MessageService],
})
export class LeavePlanningDashboardComponent implements OnInit {
  // Filters
  selectedDepartment: string = '';
  selectedLeaveType: string = '';
  selectedMonth: Date = new Date();

  departments: string[] = [
    'Engineering',
    'Sales',
    'Marketing',
    'HR',
    'Finance',
  ];
  leaveTypes: string[] = [];

  // Data
  allPlannedLeaves: PlannedLeave[] = [];
  filteredPlannedLeaves: PlannedLeave[] = [];
  conflicts: ConflictData[] = [];

  // Analytics
  totalPlannedDays = 0;
  employeesPlanning = 0;
  highCongestionDays = 0;
  departmentsAtRisk = 0;

  // Policy Settings
  planningMode: 'Annual' | 'Rolling' | 'Custom' = 'Rolling';
  planningModes: ('Annual' | 'Rolling' | 'Custom')[] = [
    'Annual',
    'Rolling',
    'Custom',
  ];
  planningWindowDays = 90;
  maxDaysPerPlan = 14;
  totalAllowedPlannedDays = 30;
  emergencyLeaveEnabled = true;

  // Calendar
  calendarEvents: EventInput[] = [];
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin],
    events: this.calendarEvents,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth',
    },
    height: 'auto',
  };



  constructor(
    private messageService: MessageService,
    private leaveService: LeaveServiceService,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    const leaveSettings = this.leaveService.getLeaveSettings();
    this.leaveTypes = leaveSettings.leaveTypes
      .filter((lt) => lt.isActive)
      .map((lt) => lt.typeName);

    this.loadPlannedLeaves();
    this.calculateAnalytics();
    this.detectConflicts();
    this.updateCalendarEvents();
  }

  loadPlannedLeaves() {
    const stored = localStorage.getItem('plannedLeaves');
    if (stored) {
      const allPlans = JSON.parse(stored);
      const employees = this.leaveService.getAllEmployees();

      this.allPlannedLeaves = allPlans.map((plan: any) => {
        const employee = employees.find((e) => e.id === plan.employeeId);
        return {
          ...plan,
          employeeName: employee?.name || 'Unknown',
          department: this.getRandomDepartment(), // Mock department
        };
      });

      this.applyFilters();
    } else {
      this.allPlannedLeaves = [];
      this.filteredPlannedLeaves = [];
    }
  }

  applyFilters() {
    this.filteredPlannedLeaves = this.allPlannedLeaves.filter((plan) => {
      const matchesDept =
        !this.selectedDepartment || plan.department === this.selectedDepartment;
      const matchesType =
        !this.selectedLeaveType || plan.leaveType === this.selectedLeaveType;

      // Month filter
      const planStart = new Date(plan.startDate);
      const matchesMonth =
        !this.selectedMonth ||
        (planStart.getMonth() === this.selectedMonth.getMonth() &&
          planStart.getFullYear() === this.selectedMonth.getFullYear());

      return matchesDept && matchesType && matchesMonth;
    });

    this.calculateAnalytics();
    this.detectConflicts();
    this.updateCalendarEvents();
  }

  calculateAnalytics() {
    this.totalPlannedDays = this.filteredPlannedLeaves.reduce(
      (sum, plan) => sum + plan.workingDays,
      0,
    );

    const uniqueEmployees = new Set(
      this.filteredPlannedLeaves.map((plan) => plan.employeeId),
    );
    this.employeesPlanning = uniqueEmployees.size;

    // Calculate high congestion days (3+ people on same day)
    const dateCounts = new Map<string, number>();
    this.filteredPlannedLeaves.forEach((plan) => {
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

    // Calculate departments at risk (>30% of team planned on same period)
    const deptCounts = new Map<string, Set<string>>();
    this.filteredPlannedLeaves.forEach((plan) => {
      if (!deptCounts.has(plan.department)) {
        deptCounts.set(plan.department, new Set());
      }
      deptCounts.get(plan.department)!.add(plan.employeeId);
    });

    this.departmentsAtRisk = Array.from(deptCounts.values()).filter(
      (employees) => employees.size >= 2, // Mock: 2+ people = risk
    ).length;
  }

  detectConflicts() {
    this.conflicts = this.filteredPlannedLeaves.map((plan) => {
      // Calculate risk based on overlapping leaves
      const overlapping = this.filteredPlannedLeaves.filter(
        (other) =>
          other.department === plan.department &&
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

      return {
        employee: plan.employeeName,
        department: plan.department,
        period: `${plan.startDate} to ${plan.endDate}`,
        days: plan.workingDays,
        riskLevel,
      };
    });
  }

  datesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);

    return s1 <= e2 && s2 <= e1;
  }

  updateCalendarEvents() {
    const departmentColors: any = {
      Engineering: '#3B82F6',
      Sales: '#10B981',
      Marketing: '#F59E0B',
      HR: '#8B5CF6',
      Finance: '#EC4899',
    };

    this.calendarEvents = this.filteredPlannedLeaves.map((plan) => ({
      title: `${plan.employeeName} - ${plan.leaveType}`,
      start: plan.startDate,
      end: this.addOneDay(plan.endDate),
      backgroundColor: departmentColors[plan.department] || '#6B7280',
      borderColor: departmentColors[plan.department] || '#6B7280',
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.calendarEvents,
    };
  }

  addOneDay(date: string): string {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  getRandomDepartment(): string {
    return this.departments[
      Math.floor(Math.random() * this.departments.length)
    ];
  }


  getDepartmentStats() {
    const deptMap = new Map<string, number>();

    this.filteredPlannedLeaves.forEach((plan) => {
      deptMap.set(
        plan.department,
        (deptMap.get(plan.department) || 0) + plan.workingDays,
      );
    });

    const totalDays = this.totalPlannedDays || 1; // Avoid division by zero

    return this.departments
      .map((dept) => ({
        name: dept,
        days: deptMap.get(dept) || 0,
        percentage: ((deptMap.get(dept) || 0) / totalDays) * 100,
      }))
      .filter((d) => d.days > 0);
  }

  getLeaveTypeStats() {
    const typeMap = new Map<string, number>();

    this.filteredPlannedLeaves.forEach((plan) => {
      typeMap.set(plan.leaveType, (typeMap.get(plan.leaveType) || 0) + 1);
    });

    const totalCount = this.filteredPlannedLeaves.length || 1; // Avoid division by zero

    return Array.from(typeMap.entries()).map(([name, count]) => ({
      name,
      count,
      percentage: (count / totalCount) * 100,
    }));
  }

  getAveragePlanDuration(): number {
    if (this.filteredPlannedLeaves.length === 0) return 0;

    const total = this.filteredPlannedLeaves.reduce(
      (sum, plan) => sum + plan.workingDays,
      0,
    );

    return Math.round(total / this.filteredPlannedLeaves.length);
  }

  getMostActiveDepartment(): string {
    if (this.filteredPlannedLeaves.length === 0) return '-';

    const deptCounts = new Map<string, number>();

    this.filteredPlannedLeaves.forEach((plan) => {
      deptCounts.set(
        plan.department,
        (deptCounts.get(plan.department) || 0) + 1,
      );
    });

    let maxDept = '';
    let maxCount = 0;

    deptCounts.forEach((count, dept) => {
      if (count > maxCount) {
        maxCount = count;
        maxDept = dept;
      }
    });

    return maxDept || '-';
  }
}