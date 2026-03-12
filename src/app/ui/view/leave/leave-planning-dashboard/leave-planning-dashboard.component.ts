import { Component, OnInit } from '@angular/core';
import { LeaveServiceService } from '../../../service/leave-service.service';
import { PlannedLeave } from '../../../domain/leave.dto';
import { MessageService } from 'primeng/api';

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
  planId: string;
}

@Component({
  selector: 'app-leave-planning-dashboard',
  templateUrl: './leave-planning-dashboard.component.html',
  styleUrls: ['./leave-planning-dashboard.component.scss'],
  providers: [MessageService],
})
export class LeavePlanningDashboardComponent implements OnInit {
  // Filters
  selectedDepartment: string = '';
  selectedLeaveType: string = '';
  selectedStatus: string = '';
  selectedMonth: Date | null = null;

  departments: string[] = [];
  leaveTypes: string[] = [];
  statuses: string[] = ['Planned', 'Pending', 'Approved', 'Rejected'];

  // Data
  allPlannedLeaves: PlannedLeave[] = [];
  filteredPlannedLeaves: PlannedLeave[] = [];
  departmentRisks: DepartmentRisk[] = [];
  conflicts: ConflictData[] = [];

  // Analytics
  totalPlannedDays = 0;
  employeesPlanning = 0;
  highCongestionDays = 0;
  departmentsAtRisk = 0;

  constructor(
    private messageService: MessageService,
    private leaveService: LeaveServiceService,
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.departments = this.leaveService.getDepartments();
    
    const leaveSettings = this.leaveService.getLeaveSettings();
    this.leaveTypes = leaveSettings.leaveTypes
      .filter((lt) => lt.isActive)
      .map((lt) => lt.typeName);

    this.loadPlannedLeaves();
    this.calculateDepartmentRisks();
    this.applyFilters();
  }

  loadPlannedLeaves() {
    // Get ALL planned leaves (admin view)
    this.allPlannedLeaves = this.leaveService.getAllPlannedLeaves();
    this.filteredPlannedLeaves = [...this.allPlannedLeaves];
  }

  applyFilters() {
    this.filteredPlannedLeaves = this.allPlannedLeaves.filter((plan) => {
      const matchesDept =
        !this.selectedDepartment || plan.department === this.selectedDepartment;
      
      const matchesType =
        !this.selectedLeaveType || plan.leaveType === this.selectedLeaveType;

      const matchesStatus =
        !this.selectedStatus || plan.status === this.selectedStatus;

      // Month filter
      let matchesMonth = true;
      if (this.selectedMonth) {
        const planStart = new Date(plan.startDate);
        matchesMonth =
          planStart.getMonth() === this.selectedMonth.getMonth() &&
          planStart.getFullYear() === this.selectedMonth.getFullYear();
      }

      return matchesDept && matchesType && matchesStatus && matchesMonth;
    });

    this.calculateAnalytics();
    this.detectConflicts();
  }

  calculateDepartmentRisks() {
    const allEmployees = this.leaveService.getAllEmployees();
    
    this.departmentRisks = this.departments.map(dept => {
      const deptEmployees = allEmployees.filter(e => e.department === dept);
      const deptPlans = this.allPlannedLeaves.filter(
        p => p.department === dept && (p.status === 'Planned' || p.status === 'Pending' || p.status === 'Approved')
      );

      const uniqueEmployees = new Set(deptPlans.map(p => p.employeeId));
      const totalDays = deptPlans.reduce((sum, p) => sum + p.workingDays, 0);

      // Calculate congestion (dates with 2+ people off)
      const dateCounts = new Map<string, number>();
      deptPlans.forEach(plan => {
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
        .slice(0, 5); // Top 5 congestion periods

      // Calculate risk level
      const percentage = deptEmployees.length > 0 
        ? (uniqueEmployees.size / deptEmployees.length) * 100 
        : 0;
      
      let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
      if (percentage >= 50) riskLevel = 'High';
      else if (percentage >= 30) riskLevel = 'Medium';

      return {
        department: dept,
        totalEmployees: deptEmployees.length,
        employeesPlanning: uniqueEmployees.size,
        totalDays,
        riskLevel,
        congestionPeriods,
      };
    }).filter(risk => risk.totalEmployees > 0); // Only show departments with employees
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

    // Departments at risk (>30% of team planning)
    this.departmentsAtRisk = this.departmentRisks.filter(
      risk => risk.riskLevel === 'High' || risk.riskLevel === 'Medium'
    ).length;
  }

  detectConflicts() {
    this.conflicts = this.filteredPlannedLeaves.map((plan) => {
      // Calculate risk based on overlapping leaves in same department
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
        employee: plan.employeeName || 'Unknown',
        department: plan.department || 'Unknown',
        period: `${plan.startDate} to ${plan.endDate}`,
        days: plan.workingDays,
        status: plan.status,
        riskLevel,
        planId: plan.id,
      };
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

  // Approve/Reject Plans
  approvePlan(planId: string) {
    const plan = this.allPlannedLeaves.find(p => p.id === planId);
    if (!plan) return;

    // if (!confirm(`Approve ${plan.employeeName}'s plan for ${plan.workingDays} days?`)) {
    //   return;
    // }

    this.leaveService.approvePlannedLeave(planId);
    this.loadData();

    this.messageService.add({
      severity: 'success',
      summary: 'Plan Approved',
      detail: `${plan.employeeName}'s leave plan approved`,
      key: 'tl',
      life: 3000,
    });
  }

  rejectPlan(planId: string) {
    const plan = this.allPlannedLeaves.find(p => p.id === planId);
    if (!plan) return;

    // if (!confirm(`Reject ${plan.employeeName}'s plan for ${plan.workingDays} days?`)) {
    //   return;
    // }

    this.leaveService.rejectPlannedLeave(planId);
    this.loadData();

    this.messageService.add({
      severity: 'warn',
      summary: 'Plan Rejected',
      detail: `${plan.employeeName}'s leave plan rejected`,
      key: 'tl',
      life: 3000,
    });
  }

  getDepartmentStats() {
    return this.departmentRisks.map(risk => ({
      name: risk.department,
      days: risk.totalDays,
      percentage: this.totalPlannedDays > 0 
        ? (risk.totalDays / this.totalPlannedDays) * 100 
        : 0,
      employeesPlanning: risk.employeesPlanning,
      totalEmployees: risk.totalEmployees,
      riskLevel: risk.riskLevel,
    }));
  }

  getLeaveTypeStats() {
    const typeMap = new Map<string, number>();

    this.filteredPlannedLeaves.forEach((plan) => {
      typeMap.set(plan.leaveType, (typeMap.get(plan.leaveType) || 0) + 1);
    });

    const totalCount = this.filteredPlannedLeaves.length || 1;

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
    if (this.departmentRisks.length === 0) return '-';

    const sorted = [...this.departmentRisks].sort((a, b) => b.totalDays - a.totalDays);
    return sorted[0]?.department || '-';
  }
  getStatusCount(status: string): number {
  return this.filteredPlannedLeaves.filter(plan => plan.status === status).length;
}
}