import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../shared-component/service/environments/environment.prod';
import {
  Employee,
  LeaveSettings,
  LeaveRequest,
  LeaveTypeWithAllocation,
  PlannedLeave, LeavePlanningPolicy, MonthlyPlanSummary
} from '../domain/leave.dto';

@Injectable({
  providedIn: 'root',
})
export class LeaveServiceService {
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
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 500) {
        errorMessage =
          'Server error: ' + error.error.message ||
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

  private EMPLOYEES_KEY = 'mock_employees';
  private initEmployees(): Employee[] {
    const stored = localStorage.getItem(this.EMPLOYEES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    const leaveTypes = this.getLeaveSettings().leaveTypes.map((lt) => ({
      ...lt,
      daysUsed: 0,
    }));

    const employees: Employee[] = [
      { id: 'EMP-001', name: 'Employee 1', leaveUsed: 0, leaveTypes },
      { id: 'EMP-002', name: 'Employee 2', leaveUsed: 0, leaveTypes },
      { id: 'EMP-003', name: 'Employee 3', leaveUsed: 0, leaveTypes },
      { id: 'EMP-004', name: 'Employee 4', leaveUsed: 0, leaveTypes },
      { id: 'EMP-005', name: 'Employee 5', leaveUsed: 0, leaveTypes },
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

        return existing
          ? { ...existing } // keep daysUsed
          : { ...lt, daysUsed: 0 }; // new leave type
      });

      return {
        ...emp,
        leaveTypes: updatedLeaveTypes,
      };
    });

    localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(updatedEmployees));
  }

  getLeaveSettings(): LeaveSettings {
    const stored = localStorage.getItem('leaveSettings');
    if (stored) {
      return JSON.parse(stored);
    }

    const leaveSettings: LeaveSettings = {
      totalLeaveDaysAllowed: 21,
      automaticApproval: false,
      leaveTypes: [],
    };

    localStorage.setItem('leaveSettings', JSON.stringify(leaveSettings));
    return leaveSettings;
  }
  updateLeaveSettings(leaveSettings: LeaveSettings): void {
    localStorage.setItem('leaveSettings', JSON.stringify(leaveSettings));
  }
  updateLeaveTypes(leaveTypes: LeaveTypeWithAllocation[]): void {
    const settings = this.getLeaveSettings();
    settings.leaveTypes = leaveTypes;
    this.updateLeaveSettings(settings);

    this.syncEmployeesWithLeaveTypes();
  }

  getAllEmployees(): Employee[] {
    return this.initEmployees();
  }

  getEmployeeById(employeeId: string): Employee {
    const employees = this.initEmployees();
    return (
      employees.find((emp) => emp.id === employeeId) || {
        id: 'EMP-005',
        name: 'Employee 5',
        leaveUsed: 0,
        leaveTypes: this.getLeaveSettings().leaveTypes.map((lt) => ({
          ...lt,
          daysUsed: 0,
        })),
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
  getAllLeaveRequests(): LeaveRequest[] {
    const stored = localStorage.getItem('leaveRequest');
    if (stored) {
      return JSON.parse(stored);
    }
    const leaveRequest: LeaveRequest[] = [];
    localStorage.setItem('leaveRequest', JSON.stringify(leaveRequest));
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
    localStorage.setItem('leaveRequest', JSON.stringify(allRequests));
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
      localStorage.setItem('leaveRequest', JSON.stringify(allRequests));
    }
  }

  loadPlannedLeaves(employeeId: string): PlannedLeave[] {
    const stored = localStorage.getItem('plannedLeaves');
    if (stored) {
      const allPlans = JSON.parse(stored) as PlannedLeave[];
      return allPlans.filter((plan) => plan.employeeId === employeeId);
    } else {
      return [];
    }
  }
  savePlannedLeaves(plannedLeaves: PlannedLeave[], employeeId: string) {
    const stored = localStorage.getItem('plannedLeaves');
    let allPlans: PlannedLeave[] = stored ? JSON.parse(stored) : [];
    
    // Remove current employee's plans
    allPlans = allPlans.filter(plan => plan.employeeId !== employeeId);
    
    // Add updated plans
    allPlans = [...allPlans, ...plannedLeaves];
    
    localStorage.setItem('plannedLeaves', JSON.stringify(allPlans));
  }


  // testing planned leaves
  // Add to LeaveServiceService class

private PLANNING_POLICY_KEY = 'leavePlanningPolicy';

getLeavePlanningPolicy(): LeavePlanningPolicy {
  const stored = localStorage.getItem(this.PLANNING_POLICY_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  // Default policy
  const defaultPolicy: LeavePlanningPolicy = {
    maxDaysPerMonth: 10,
    maxPlanningMonths: 3,
    totalAllowedPlannedDays: 30,
    emergencyLeaveDaysAllowed: 5,
    planningWindowDays: 90,
    allowPlanEditing: false,
  };

  localStorage.setItem(this.PLANNING_POLICY_KEY, JSON.stringify(defaultPolicy));
  return defaultPolicy;
}

updateLeavePlanningPolicy(policy: LeavePlanningPolicy): void {
  localStorage.setItem(this.PLANNING_POLICY_KEY, JSON.stringify(policy));
}

// Get monthly planning summary for an employee
getMonthlyPlanSummary(employeeId: string): MonthlyPlanSummary[] {
  const plannedLeaves = this.loadPlannedLeaves(employeeId);
  const policy = this.getLeavePlanningPolicy();
  const monthMap = new Map<string, number>();

  // Calculate days per month
  plannedLeaves
    .filter(p => p.status === 'Planned' || p.status === 'Pending')
    .forEach(plan => {
      if (!monthMap.has(plan.month)) {
        monthMap.set(plan.month, 0);
      }
      monthMap.set(plan.month, monthMap.get(plan.month)! + plan.workingDays);
    });

  // Convert to array
  return Array.from(monthMap.entries()).map(([month, daysPlanned]) => ({
    month,
    daysPlanned,
    maxDays: policy.maxDaysPerMonth,
    remaining: policy.maxDaysPerMonth - daysPlanned,
  }));
}

// Check if employee can plan for a specific month
canPlanForMonth(employeeId: string, month: string): boolean {
  const summary = this.getMonthlyPlanSummary(employeeId);
  const policy = this.getLeavePlanningPolicy();

  // Check if already planning for max months
  if (summary.length >= policy.maxPlanningMonths) {
    // Only allow if planning for existing month
    return summary.some(s => s.month === month);
  }

  return true;
}

// Get remaining days for a specific month
getRemainingDaysForMonth(employeeId: string, month: string): number {
  const summary = this.getMonthlyPlanSummary(employeeId);
  const policy = this.getLeavePlanningPolicy();
  
  const monthSummary = summary.find(s => s.month === month);
  return monthSummary 
    ? monthSummary.remaining 
    : policy.maxDaysPerMonth;
}

// Approve planned leave
approvePlannedLeave(planId: string): void {
  const stored = localStorage.getItem('plannedLeaves');
  if (!stored) return;

  const allPlans: PlannedLeave[] = JSON.parse(stored);
  const planIndex = allPlans.findIndex(p => p.id === planId);

  if (planIndex !== -1) {
    allPlans[planIndex].status = 'Approved';
    allPlans[planIndex].approvedOn = new Date().toISOString();
    localStorage.setItem('plannedLeaves', JSON.stringify(allPlans));
  }
}

// Reject planned leave
rejectPlannedLeave(planId: string): void {
  const stored = localStorage.getItem('plannedLeaves');
  if (!stored) return;

  const allPlans: PlannedLeave[] = JSON.parse(stored);
  const planIndex = allPlans.findIndex(p => p.id === planId);

  if (planIndex !== -1) {
    allPlans[planIndex].status = 'Rejected';
    localStorage.setItem('plannedLeaves', JSON.stringify(allPlans));
  }
}
}
