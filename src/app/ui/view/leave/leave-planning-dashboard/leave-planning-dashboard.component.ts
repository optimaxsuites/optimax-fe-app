import { Component, OnInit } from '@angular/core';
import { LeaveServiceService } from '../../../service/leave-service.service';
import { PlannedLeave } from '../../../domain/leave.dto';
import { MessageService } from 'primeng/api';
import {
  TableColumn,
  TableAction,
} from '../../../shared-component/view/table/table.component';

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
  leaveType: string;
}

@Component({
  selector: 'app-leave-planning-dashboard',
  templateUrl: './leave-planning-dashboard.component.html',
  styleUrls: ['./leave-planning-dashboard.component.scss'],
  providers: [MessageService],
})
export class LeavePlanningDashboardComponent implements OnInit {
  selectedDepartment: string = '';
  selectedLeaveType: string = '';
  selectedStatus: string = '';
  selectedMonth: Date | null = null;

  departments: string[] = [];
  leaveTypes: string[] = [];
  statuses: string[] = ['Planned', 'Pending', 'Approved', 'Rejected'];

  allPlannedLeaves: PlannedLeave[] = [];
  filteredPlannedLeaves: PlannedLeave[] = [];
  departmentRisks: DepartmentRisk[] = [];
  conflicts: ConflictData[] = [];
  displayedConflicts: ConflictData[] = [];

  totalPlannedDays = 0;
  employeesPlanning = 0;
  highCongestionDays = 0;
  departmentsAtRisk = 0;

  searchTerm: string = '';
  selectedStatusFilter: string[] = [];
  selectedLeaveTypeFilter: string[] = [];

  showActionModal: boolean = false;
  selectedPlan: PlannedLeave | null = null;
  adminComment: string = '';

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
      visible: (row) => row.status === 'Planned' || row.status === 'Pending',
    },
  ];

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
    this.filterTable();
  }

  calculateDepartmentRisks() {
    const allEmployees = this.leaveService.getAllEmployees();

    this.departmentRisks = this.departments
      .map((dept) => {
        const deptEmployees = allEmployees.filter((e) => e.department === dept);
        const deptPlans = this.allPlannedLeaves.filter(
          (p) =>
            p.department === dept &&
            (p.status === 'Planned' ||
              p.status === 'Pending' ||
              p.status === 'Approved'),
        );

        const uniqueEmployees = new Set(deptPlans.map((p) => p.employeeId));
        const totalDays = deptPlans.reduce((sum, p) => sum + p.workingDays, 0);

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
          department: dept,
          totalEmployees: deptEmployees.length,
          employeesPlanning: uniqueEmployees.size,
          totalDays,
          riskLevel,
          congestionPeriods,
        };
      })
      .filter((risk) => risk.totalEmployees > 0);
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

    this.departmentsAtRisk = this.departmentRisks.filter(
      (risk) => risk.riskLevel === 'High' || risk.riskLevel === 'Medium',
    ).length;
  }

  detectConflicts() {
    this.conflicts = this.filteredPlannedLeaves.map((plan) => {
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
        leaveType: plan.leaveType,
      };
    });

    this.displayedConflicts = [...this.conflicts];
  }

  datesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    return start1 <= end2 && start2 <= end1;
  }

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

  onActionClick(event: { actionId: string; row: ConflictData }) {
    const plan = this.allPlannedLeaves.find((p) => p.id === event.row.planId);
    if (!plan) return;

    this.selectedPlan = plan;
    this.adminComment = '';
    this.showActionModal = true;
  }

  closeActionModal() {
    this.showActionModal = false;
    this.selectedPlan = null;
    this.adminComment = '';
  }

  approvePlan() {
    if (!this.selectedPlan) return;

    this.leaveService.approvePlannedLeave(this.selectedPlan.id);

    this.messageService.add({
      severity: 'success',
      summary: 'Plan Approved',
      detail: `${this.selectedPlan.employeeName}'s leave plan approved`,
      key: 'tl',
      life: 3000,
    });

    this.closeActionModal();
    this.loadData();
  }

  rejectPlan() {
    if (!this.selectedPlan) return;

    const reason = this.adminComment.trim() || 'No reason provided';
    this.leaveService.rejectPlannedLeave(this.selectedPlan.id, reason);

    this.messageService.add({
      severity: 'warn',
      summary: 'Plan Rejected',
      detail: `${this.selectedPlan.employeeName}'s leave plan rejected`,
      key: 'tl',
      life: 3000,
    });

    this.closeActionModal();
    this.loadData();
  }

  getStatusCount(status: string): number {
    return this.filteredPlannedLeaves.filter((plan) => plan.status === status)
      .length;
  }
}