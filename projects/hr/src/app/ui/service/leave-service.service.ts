import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../shared-component/service/environments/environment.prod';
import {
  Employee,
  LeaveSettings,
  LeaveRequest,
  LeaveTypeWithAllocation,
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
}
