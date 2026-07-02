import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, fromEvent, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { EmployeeService } from '../../service/employee.service';

export interface ProductivityReviewCycleOption {
  id: string;
  name: string;
  period: string;
  owner: string;
}

export interface ProductivityReviewEmployeeOption {
  id: string;
  name: string;
  department: string;
  role: string;
}

export interface ProductivityReviewSubmission {
  id: string;
  cycleId: string;
  cycleName: string;
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  reviewType: 'SELF' | 'SUPERVISOR';
  reviewerEmployeeId: string;
  reviewerName: string;
  score: number;
  summary: string;
  blockers: string;
  submittedAt: string;
  status: 'Submitted';
}

export interface ProductivityReviewWorkflowState {
  cycles: ProductivityReviewCycleOption[];
  currentEmployee: ProductivityReviewEmployeeOption | null;
  directReports: ProductivityReviewEmployeeOption[];
  submissions: ProductivityReviewSubmission[];
}

interface EmployeeProfile {
  id: string;
  name: string;
  department: string;
  role: string;
  supervisor: string;
}

export const REVIEW_STORAGE_KEY = 'productivityReviewSubmissions';

@Injectable({
  providedIn: 'root',
})
export class ProductivityReviewService {
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);
  private readonly currentEmployeeSubject = new BehaviorSubject<EmployeeProfile | null>(null);
  readonly workflow$;

  constructor(private readonly employeeService: EmployeeService) {
    this.workflow$ = combineLatest([
      this.employeeService.employees$,
      this.currentEmployeeSubject.asObservable(),
      reviewStorageEvents(),
      this.refreshSubject.asObservable(),
    ]).pipe(
      map(([employees, currentEmployee]) => this.buildWorkflow(employees ?? [], currentEmployee))
    );
  }

  init(): void {
    this.employeeService.ensureEmployeesLoaded();
    this.employeeService.getCurrentEmployee().subscribe({
      next: (employee) => {
        this.currentEmployeeSubject.next(this.mapEmployee(employee));
      },
      error: () => {
        this.currentEmployeeSubject.next(null);
      },
    });
    this.refresh();
  }

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  submitSelfReview(payload: {
    cycleId: string;
    score: number;
    summary: string;
    blockers: string;
  }): void {
    const workflow = this.buildWorkflow(this.employeeService['employeesSubject']?.value ?? [], this.currentEmployeeSubject.value);
    const employee = workflow.currentEmployee;
    const cycle = workflow.cycles.find((item) => item.id === payload.cycleId);
    if (!employee || !cycle) {
      return;
    }

    this.upsertSubmission({
      cycleId: cycle.id,
      cycleName: cycle.name,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      role: employee.role,
      reviewType: 'SELF',
      reviewerEmployeeId: employee.id,
      reviewerName: employee.name,
      score: payload.score,
      summary: payload.summary,
      blockers: payload.blockers,
    });
  }

  submitSupervisorReview(payload: {
    cycleId: string;
    employeeId: string;
    score: number;
    summary: string;
    blockers: string;
  }): void {
    const workflow = this.buildWorkflow(this.employeeService['employeesSubject']?.value ?? [], this.currentEmployeeSubject.value);
    const reviewer = workflow.currentEmployee;
    const employee = workflow.directReports.find((item) => item.id === payload.employeeId)
      || workflow.submissions
        .map((item) => ({
          id: item.employeeId,
          name: item.employeeName,
          department: item.department,
          role: item.role,
        }))
        .find((item) => item.id === payload.employeeId)
      || null;
    const cycle = workflow.cycles.find((item) => item.id === payload.cycleId);

    if (!reviewer || !employee || !cycle) {
      return;
    }

    this.upsertSubmission({
      cycleId: cycle.id,
      cycleName: cycle.name,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      role: employee.role,
      reviewType: 'SUPERVISOR',
      reviewerEmployeeId: reviewer.id,
      reviewerName: reviewer.name,
      score: payload.score,
      summary: payload.summary,
      blockers: payload.blockers,
    });
  }

  getStoredSubmissions(): ProductivityReviewSubmission[] {
    try {
      const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private upsertSubmission(
    payload: Omit<ProductivityReviewSubmission, 'id' | 'submittedAt' | 'status'>
  ): void {
    const submissions = this.getStoredSubmissions();
    const existingIndex = submissions.findIndex(
      (item) =>
        item.cycleId === payload.cycleId &&
        item.employeeId === payload.employeeId &&
        item.reviewType === payload.reviewType &&
        item.reviewerEmployeeId === payload.reviewerEmployeeId
    );

    const nextRecord: ProductivityReviewSubmission = {
      id: existingIndex >= 0 ? submissions[existingIndex].id : this.generateId(),
      submittedAt: new Date().toISOString(),
      status: 'Submitted',
      ...payload,
    };

    if (existingIndex >= 0) {
      submissions[existingIndex] = nextRecord;
    } else {
      submissions.unshift(nextRecord);
    }

    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(submissions));
    this.refresh();
  }

  private buildWorkflow(
    employees: any[],
    currentEmployee: EmployeeProfile | null
  ): ProductivityReviewWorkflowState {
    const profiles = employees
      .map((employee) => this.mapEmployee(employee))
      .filter((employee) => !!employee.name)
      .filter((employee) => this.isTechnologyProfile(employee));

    const scopedEmployees = profiles.length
      ? profiles
      : employees.map((employee) => this.mapEmployee(employee)).filter((employee) => !!employee.name);

    const directReports = currentEmployee
      ? scopedEmployees.filter(
          (employee) =>
            this.normalizeKey(employee.supervisor) === this.normalizeKey(currentEmployee.name) &&
            employee.id !== currentEmployee.id
        )
      : [];

    const cycles = this.buildCycles();

    return {
      cycles,
      currentEmployee: currentEmployee
        ? {
            id: currentEmployee.id,
            name: currentEmployee.name,
            department: currentEmployee.department,
            role: currentEmployee.role,
          }
        : null,
      directReports: directReports.map((employee) => ({
        id: employee.id,
        name: employee.name,
        department: employee.department,
        role: employee.role,
      })),
      submissions: this.getStoredSubmissions()
        .filter((submission) => scopedEmployees.some((employee) => employee.id === submission.employeeId))
        .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()),
    };
  }

  private buildCycles(): ProductivityReviewCycleOption[] {
    const now = new Date();
    const weekStart = this.startOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return [
      {
        id: `weekly-${now.getFullYear()}-${now.getMonth() + 1}-${weekStart.getDate()}`,
        name: 'Weekly Delivery Snapshot',
        period: `${this.formatShortDate(weekStart)} - ${this.formatShortDate(weekEnd)}`,
        owner: 'Service Delivery Leadership',
      },
      {
        id: `monthly-${now.getFullYear()}-${now.getMonth() + 1}`,
        name: 'Monthly ICT Performance Review',
        period: `${this.formatShortDate(monthStart)} - ${this.formatShortDate(monthEnd)}`,
        owner: 'Operations and HR',
      },
    ];
  }

  private mapEmployee(employee: any): EmployeeProfile {
    const firstName = String(employee?.firstName || employee?.firstname || '').trim();
    const lastName = String(employee?.lastName || employee?.lastname || '').trim();
    const name = `${firstName} ${lastName}`.trim()
      || String(employee?.fullName || employee?.fullname || employee?.name || '').trim();

    return {
      id: String(employee?.id || employee?.employeeId || employee?.userId || name),
      name,
      department: this.pickText(
        employee?.department?.name,
        employee?.department,
        employee?.unit?.name,
        employee?.team?.name
      ) || 'Technology Operations',
      role: this.pickText(
        employee?.jobTitle,
        employee?.designation,
        employee?.jobRole?.name,
        employee?.role?.name
      ) || 'IT Services Staff',
      supervisor: this.pickText(
        employee?.supervisor?.fullName,
        employee?.supervisor?.name,
        employee?.supervisorName,
        employee?.reportTo,
        employee?.lineManager
      ) || '',
    };
  }

  private isTechnologyProfile(employee: EmployeeProfile): boolean {
    const value = `${employee.department} ${employee.role}`.toLowerCase();
    return [
      'it',
      'ict',
      'technology',
      'software',
      'engineering',
      'infrastructure',
      'support',
      'service delivery',
      'implementation',
      'network',
      'security',
      'project',
      'product',
      'systems',
      'cloud',
      'operations',
    ].some((keyword) => value.includes(keyword));
  }

  private pickText(...values: unknown[]): string {
    const match = values
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .find((value) => !!value);

    return match || '';
  }

  private normalizeKey(value: string): string {
    return String(value || '').trim().toLowerCase();
  }

  private formatShortDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  private startOfWeek(date: Date): Date {
    const value = new Date(date);
    const day = value.getDay();
    const diff = value.getDate() - day + (day === 0 ? -6 : 1);
    value.setDate(diff);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private generateId(): string {
    return `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function reviewStorageEvents() {
  return merge(
    of(null),
    fromEvent(window, 'storage').pipe(map(() => null))
  ).pipe(map(() => Date.now()));
}
