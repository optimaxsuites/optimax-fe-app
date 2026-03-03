import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../shared-component/service/environments/environment.prod';
import {
  Employee,
  LeaveSettings,
  LeaveRequest,
  LeaveTypeWithAllocation,
  PlannedLeave,
  LeavePlanningPolicy,
  MonthlyPlanSummary,
  EmployeeLevel,
  LevelLeaveAllocation,
  EmployeeLeaveTypeWithAllocation,
  LeaveAllocationMatrix,
  LevelChange,
} from '../domain/leave.dto';

@Injectable({
  providedIn: 'root',
})
export class LeaveServiceService {
  // Storage Keys
  private EMPLOYEES_KEY = 'mock_employees';
  private LEAVE_SETTINGS_KEY = 'leaveSettings';
  private LEAVE_REQUESTS_KEY = 'leaveRequest';
  private PLANNED_LEAVES_KEY = 'plannedLeaves';
  private PLANNING_POLICY_KEY = 'leavePlanningPolicy';
  private LEVELS_KEY = 'employeeLevels';
  private ALLOCATION_MATRIX_KEY = 'leaveAllocationMatrix';

  constructor(private http: HttpClient) {}

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  getEmployees() {
    return this.http
      .get<any>(
        this.getBaseApiUrl() + '/x/api/v2/us/ur/findAllUserPrimaryInformation',
      )
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      if (error.status === 500) {
        errorMessage =
          'Server error: ' +
          error.error.message ||
          'Check form details and try again.';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found. Please try again.';
      } else if (error.status === 0) {
        errorMessage =
          'Unable to connect to the server. Please check your internet connection.';
      } else {
        errorMessage = error.error.message || 'An unexpected error occurred.';
      }
    }
    return throwError(() => errorMessage);
  }

  // ==================== EMPLOYEE LEVELS ====================

  getEmployeeLevels(): EmployeeLevel[] {
    const stored = localStorage.getItem(this.LEVELS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // Default levels
    const defaultLevels: EmployeeLevel[] = [
      {
        id: 'L1',
        name: 'Intern',
        order: 0,
        description: 'Internship position',
        isActive: true,
      },
      {
        id: 'L2',
        name: 'Junior',
        order: 1,
        description: 'Entry-level employee',
        isActive: true,
      },
      {
        id: 'L3',
        name: 'Mid-Level',
        order: 2,
        description: 'Experienced employee',
        isActive: true,
      },
      {
        id: 'L4',
        name: 'Senior',
        order: 3,
        description: 'Senior-level employee',
        isActive: true,
      },
      {
        id: 'L5',
        name: 'Manager',
        order: 4,
        description: 'Management position',
        isActive: true,
      },
    ];

    localStorage.setItem(this.LEVELS_KEY, JSON.stringify(defaultLevels));
    return defaultLevels;
  }

  // updateEmployeeLevels(levels: EmployeeLevel[]): void {
  //   localStorage.setItem(this.LEVELS_KEY, JSON.stringify(levels));
  // }

  // addEmployeeLevel(level: EmployeeLevel): void {
  //   const levels = this.getEmployeeLevels();
  //   levels.push(level);
  //   this.updateEmployeeLevels(levels);
  // }

  // deleteEmployeeLevel(levelId: string): void {
  //   const levels = this.getEmployeeLevels().filter((l) => l.id !== levelId);
  //   this.updateEmployeeLevels(levels);
  // }

  // ==================== ALLOCATION MATRIX ====================

  getLeaveAllocationMatrix(): LeaveAllocationMatrix {
    const stored = localStorage.getItem(this.ALLOCATION_MATRIX_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    // Create default matrix
    const levels = this.getEmployeeLevels();
    const leaveTypes = this.getLeaveSettings().leaveTypes;
    const allocations: LevelLeaveAllocation[] = [];

    // Default allocation rules
    const defaultRules: { [key: string]: { [key: string]: number } } = {
      L1: { 'Annual Leave': 10, 'Sick Leave': 3, 'Study Leave': 0 }, // Intern
      L2: { 'Annual Leave': 15, 'Sick Leave': 5, 'Study Leave': 2 }, // Junior
      L3: { 'Annual Leave': 21, 'Sick Leave': 10, 'Study Leave': 5 }, // Mid-Level
      L4: { 'Annual Leave': 25, 'Sick Leave': 12, 'Study Leave': 7 }, // Senior
      L5: { 'Annual Leave': 30, 'Sick Leave': 15, 'Study Leave': 10 }, // Manager
    };

    // Generate allocation matrix
    levels.forEach((level) => {
      leaveTypes.forEach((leaveType) => {
        const defaultDays =
          defaultRules[level.id]?.[leaveType.typeName] ?? 0;
        allocations.push({
          levelId: level.id,
          leaveTypeId: leaveType.id,
          allocatedDays: defaultDays,
        });
      });
    });

    const matrix: LeaveAllocationMatrix = { levels, allocations };
    localStorage.setItem(
      this.ALLOCATION_MATRIX_KEY,
      JSON.stringify(matrix),
    );
    return matrix;
  }

  updateLeaveAllocationMatrix(matrix: LeaveAllocationMatrix): void {
    localStorage.setItem(
      this.ALLOCATION_MATRIX_KEY,
      JSON.stringify(matrix),
    );
  }

  getAllocationForLevel(levelId: string, leaveTypeId: string): number {
    const matrix = this.getLeaveAllocationMatrix();
    const allocation = matrix.allocations.find(
      (a) => a.levelId === levelId && a.leaveTypeId === leaveTypeId,
    );
    return allocation?.allocatedDays ?? 0;
  }

  updateSingleAllocation(
    levelId: string,
    leaveTypeId: string,
    days: number,
  ): void {
    const matrix = this.getLeaveAllocationMatrix();
    const allocation = matrix.allocations.find(
      (a) => a.levelId === levelId && a.leaveTypeId === leaveTypeId,
    );

    if (allocation) {
      allocation.allocatedDays = days;
    } else {
      matrix.allocations.push({ levelId, leaveTypeId, allocatedDays: days });
    }

    this.updateLeaveAllocationMatrix(matrix);
  }

  // ==================== LEAVE SETTINGS ====================

  getLeaveSettings(): LeaveSettings {
    const stored = localStorage.getItem(this.LEAVE_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    const leaveSettings: LeaveSettings = {
      totalLeaveDaysAllowed: 21,
      automaticApproval: false,
      leaveTypes: [],
      useLevelBasedAllocation: false,
    };

    localStorage.setItem(
      this.LEAVE_SETTINGS_KEY,
      JSON.stringify(leaveSettings),
    );
    return leaveSettings;
  }

  updateLeaveSettings(leaveSettings: LeaveSettings): void {
    localStorage.setItem(
      this.LEAVE_SETTINGS_KEY,
      JSON.stringify(leaveSettings),
    );
  }

  updateLeaveTypes(leaveTypes: LeaveTypeWithAllocation[]): void {
    const settings = this.getLeaveSettings();
    settings.leaveTypes = leaveTypes;
    this.updateLeaveSettings(settings);

    // Sync employees if using level-based allocation
    if (settings.useLevelBasedAllocation) {
      this.syncAllEmployeesWithMatrix();
    } else {
      this.syncEmployeesWithLeaveTypes();
    }
  }

  // ==================== EMPLOYEE MANAGEMENT ====================

  getLeaveTypesForLevel(levelId: string): EmployeeLeaveTypeWithAllocation[] {
    const leaveTypes = this.getLeaveSettings().leaveTypes;

    return leaveTypes.map((lt) => ({
      ...lt,
      allocatedDays: this.getAllocationForLevel(levelId, lt.id),
      daysUsed: 0,
    }));
  }

  private initEmployees(): Employee[] {
    const stored = localStorage.getItem(this.EMPLOYEES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    const settings = this.getLeaveSettings();
    const useLevelBased = settings.useLevelBasedAllocation;

    const employees: Employee[] = [
      {
        id: 'EMP-001',
        name: 'Employee 1',
        levelId: 'L3',
        levelName: 'Mid-Level',
        leaveUsed: 0,
        leaveTypes: useLevelBased
          ? this.getLeaveTypesForLevel('L3')
          : settings.leaveTypes.map((lt) => ({ ...lt, daysUsed: 0 })),
      },
      {
        id: 'EMP-002',
        name: 'Employee 2',
        levelId: 'L2',
        levelName: 'Junior',
        leaveUsed: 0,
        leaveTypes: useLevelBased
          ? this.getLeaveTypesForLevel('L2')
          : settings.leaveTypes.map((lt) => ({ ...lt, daysUsed: 0 })),
      },
      {
        id: 'EMP-003',
        name: 'Employee 3',
        levelId: 'L4',
        levelName: 'Senior',
        leaveUsed: 0,
        leaveTypes: useLevelBased
          ? this.getLeaveTypesForLevel('L4')
          : settings.leaveTypes.map((lt) => ({ ...lt, daysUsed: 0 })),
      },
      {
        id: 'EMP-004',
        name: 'Employee 4',
        levelId: 'L1',
        levelName: 'Intern',
        leaveUsed: 0,
        leaveTypes: useLevelBased
          ? this.getLeaveTypesForLevel('L1')
          : settings.leaveTypes.map((lt) => ({ ...lt, daysUsed: 0 })),
      },
      {
        id: 'EMP-005',
        name: 'Employee 5',
        levelId: 'L5',
        levelName: 'Manager',
        leaveUsed: 0,
        leaveTypes: useLevelBased
          ? this.getLeaveTypesForLevel('L5')
          : settings.leaveTypes.map((lt) => ({ ...lt, daysUsed: 0 })),
      },
    ];

    localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(employees));
    return employees;
  }

  private syncEmployeesWithLeaveTypes(): void {
    const employees = this.initEmployees();
    const leaveTypes = this.getLeaveSettings().leaveTypes;

    const updatedEmployees = employees.map((emp) => {
      const updatedLeaveTypes = leaveTypes.map((lt) => {
        const existing = emp.leaveTypes.find((e) => e.id === lt.id);

        return existing ? { ...existing } : { ...lt, daysUsed: 0 };
      });

      return {
        ...emp,
        leaveTypes: updatedLeaveTypes,
      };
    });

    localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(updatedEmployees));
  }

  syncAllEmployeesWithMatrix(): void {
    const employees = this.initEmployees();
    const settings = this.getLeaveSettings();

    if (!settings.useLevelBasedAllocation) {
      return;
    }

    const updatedEmployees = employees.map((emp) => ({
      ...emp,
      leaveTypes: this.getLeaveTypesForLevel(emp.levelId),
    }));

    localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(updatedEmployees));
  }

  getAllEmployees(): Employee[] {
    return this.initEmployees();
  }

  getEmployeeById(employeeId: string): Employee {
    const employees = this.initEmployees();
    const settings = this.getLeaveSettings();

    return (
      employees.find((emp) => emp.id === employeeId) || {
        id: 'EMP-005',
        name: 'Employee 5',
        levelId: 'L2',
        levelName: 'Junior',
        leaveUsed: 0,
        leaveTypes: settings.useLevelBasedAllocation
          ? this.getLeaveTypesForLevel('L2')
          : settings.leaveTypes.map((lt) => ({ ...lt, daysUsed: 0 })),
      }
    );
  }

  updateEmployee(updatedEmployee: Employee): void {
    const employees = this.initEmployees();

    const index = employees.findIndex((e) => e.id === updatedEmployee.id);
    if (index === -1) return;

    employees[index] = updatedEmployee;
    localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(employees));
  }

  changeEmployeeLevel(
    employeeId: string,
    newLevelId: string,
    reason?: string,
  ): void {
    const employees = this.initEmployees();
    const employeeIndex = employees.findIndex((e) => e.id === employeeId);

    if (employeeIndex === -1) return;

    const employee = employees[employeeIndex];
    const levels = this.getEmployeeLevels();
    const newLevel = levels.find((l) => l.id === newLevelId);

    if (!newLevel) return;

    // Record level change
    const levelChange: LevelChange = {
      fromLevelId: employee.levelId,
      fromLevelName: employee.levelName,
      toLevelId: newLevelId,
      toLevelName: newLevel.name,
      changedOn: new Date().toISOString(),
      changedBy: 'Admin',
      reason: reason,
    };

    // Update employee
    employee.levelId = newLevelId;
    employee.levelName = newLevel.name;
    employee.promotionDate = new Date().toISOString();

    // Add to history
    if (!employee.levelHistory) {
      employee.levelHistory = [];
    }
    employee.levelHistory.push(levelChange);

    // Update leave types based on new level
    const settings = this.getLeaveSettings();
    if (settings.useLevelBasedAllocation) {
      employee.leaveTypes = this.getLeaveTypesForLevel(newLevelId);
    }

    employees[employeeIndex] = employee;
    localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(employees));
  }

  // ==================== LEAVE REQUESTS ====================

  getAllLeaveRequests(): LeaveRequest[] {
    const stored = localStorage.getItem(this.LEAVE_REQUESTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    const leaveRequest: LeaveRequest[] = [];
    localStorage.setItem(this.LEAVE_REQUESTS_KEY, JSON.stringify(leaveRequest));
    return leaveRequest;
  }

  getEmployeeLeaveRequests(employeeId: string): LeaveRequest[] {
    const allRequests = this.getAllLeaveRequests();
    if (allRequests) {
      return allRequests.filter((request) => request.EmployeeId === employeeId);
    }
    return [];
  }

  createLeaveRequest(request: LeaveRequest): void {
    const allRequests = this.getAllLeaveRequests();
    allRequests.push(request);
    localStorage.setItem(this.LEAVE_REQUESTS_KEY, JSON.stringify(allRequests));
  }

  updateLeaveRequestStatus(
    requestId: string,
    status: 'Approved' | 'Rejected',
  ): void {
    const allRequests = this.getAllLeaveRequests();
    const requestIndex = allRequests.findIndex(
      (request) => request.Id === requestId,
    );
    if (requestIndex !== -1) {
      allRequests[requestIndex].Status = status;
      localStorage.setItem(
        this.LEAVE_REQUESTS_KEY,
        JSON.stringify(allRequests),
      );
    }
  }

  // ==================== PLANNED LEAVES ====================

  loadPlannedLeaves(employeeId: string): PlannedLeave[] {
    const stored = localStorage.getItem(this.PLANNED_LEAVES_KEY);
    if (stored) {
      const allPlans = JSON.parse(stored) as PlannedLeave[];
      return allPlans.filter((plan) => plan.employeeId === employeeId);
    } else {
      return [];
    }
  }

  savePlannedLeaves(plannedLeaves: PlannedLeave[], employeeId: string) {
    const stored = localStorage.getItem(this.PLANNED_LEAVES_KEY);
    let allPlans: PlannedLeave[] = stored ? JSON.parse(stored) : [];

    // Remove current employee's plans
    allPlans = allPlans.filter((plan) => plan.employeeId !== employeeId);

    // Add updated plans
    allPlans = [...allPlans, ...plannedLeaves];

    localStorage.setItem(this.PLANNED_LEAVES_KEY, JSON.stringify(allPlans));
  }

  approvePlannedLeave(planId: string): void {
    const stored = localStorage.getItem(this.PLANNED_LEAVES_KEY);
    if (!stored) return;

    const allPlans: PlannedLeave[] = JSON.parse(stored);
    const planIndex = allPlans.findIndex((p) => p.id === planId);

    if (planIndex !== -1) {
      allPlans[planIndex].status = 'Approved';
      allPlans[planIndex].approvedOn = new Date().toISOString();
      localStorage.setItem(this.PLANNED_LEAVES_KEY, JSON.stringify(allPlans));
    }
  }

  rejectPlannedLeave(planId: string): void {
    const stored = localStorage.getItem(this.PLANNED_LEAVES_KEY);
    if (!stored) return;

    const allPlans: PlannedLeave[] = JSON.parse(stored);
    const planIndex = allPlans.findIndex((p) => p.id === planId);

    if (planIndex !== -1) {
      allPlans[planIndex].status = 'Rejected';
      localStorage.setItem(this.PLANNED_LEAVES_KEY, JSON.stringify(allPlans));
    }
  }

  // ==================== LEAVE PLANNING POLICY ====================

  getLeavePlanningPolicy(): LeavePlanningPolicy {
    const stored = localStorage.getItem(this.PLANNING_POLICY_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    const defaultPolicy: LeavePlanningPolicy = {
      maxDaysPerMonth: 10,
      maxPlanningMonths: 3,
      totalAllowedPlannedDays: 30,
      emergencyLeaveDaysAllowed: 5,
      planningWindowDays: 90,
      allowPlanEditing: false,
    };

    localStorage.setItem(
      this.PLANNING_POLICY_KEY,
      JSON.stringify(defaultPolicy),
    );
    return defaultPolicy;
  }

  updateLeavePlanningPolicy(policy: LeavePlanningPolicy): void {
    localStorage.setItem(this.PLANNING_POLICY_KEY, JSON.stringify(policy));
  }

  getMonthlyPlanSummary(employeeId: string): MonthlyPlanSummary[] {
    const plannedLeaves = this.loadPlannedLeaves(employeeId);
    const policy = this.getLeavePlanningPolicy();
    const monthMap = new Map<string, number>();

    plannedLeaves
      .filter((p) => p.status === 'Planned' || p.status === 'Pending')
      .forEach((plan) => {
        if (!monthMap.has(plan.month)) {
          monthMap.set(plan.month, 0);
        }
        monthMap.set(plan.month, monthMap.get(plan.month)! + plan.workingDays);
      });

    return Array.from(monthMap.entries()).map(([month, daysPlanned]) => ({
      month,
      daysPlanned,
      maxDays: policy.maxDaysPerMonth,
      remaining: policy.maxDaysPerMonth - daysPlanned,
    }));
  }

  canPlanForMonth(employeeId: string, month: string): boolean {
    const summary = this.getMonthlyPlanSummary(employeeId);
    const policy = this.getLeavePlanningPolicy();

    if (summary.length >= policy.maxPlanningMonths) {
      return summary.some((s) => s.month === month);
    }

    return true;
  }

  getRemainingDaysForMonth(employeeId: string, month: string): number {
    const summary = this.getMonthlyPlanSummary(employeeId);
    const policy = this.getLeavePlanningPolicy();

    const monthSummary = summary.find((s) => s.month === month);
    return monthSummary ? monthSummary.remaining : policy.maxDaysPerMonth;
  }
}