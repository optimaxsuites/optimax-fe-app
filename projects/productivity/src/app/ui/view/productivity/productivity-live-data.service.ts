import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { combineLatest, map, Observable, of } from 'rxjs';

import { environment } from '../../shared-component/service/environments/environment';
import {
  ProductivityLeaderboardRow,
  ProductivityMetric,
  ProductivityReviewCycle,
  ProductivityScorecard,
  ProductivityTask,
} from './productivity.models';

interface EmployeeProfile {
  id: string;
  fullName: string;
  department: string;
  role: string;
  supervisor: string;
}

interface AttendanceRecord {
  employee: string;
  department: string;
  date: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'OVERTIME' | string;
}

interface StoredMetric {
  name: string;
  completed: boolean;
}

interface StoredGoal {
  goalName?: string;
  employeeName?: string;
  goalDescription?: string;
  endDate?: string;
  priority?: string;
  assignedTo?: string;
  targetMetrics?: StoredMetric[];
  progressStatus?: string;
}

interface StoredReview {
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  reviewType: 'SELF' | 'SUPERVISOR';
  reviewerName: string;
  score: number;
  summary: string;
  blockers: string;
  submittedAt: string;
}

export interface ProductivityLiveViewModel {
  metrics: ProductivityMetric[];
  tasks: ProductivityTask[];
  cycles: ProductivityReviewCycle[];
  scorecards: ProductivityScorecard[];
  leaderboard: ProductivityLeaderboardRow[];
  trendPoints: number[];
}

@Injectable({
  providedIn: 'root',
})
export class ProductivityLiveDataService {
  readonly vm$: Observable<ProductivityLiveViewModel> = combineLatest([
    this.fetchEmployees(),
    this.fetchAttendance(),
    of(this.getStoredGoals()),
    of(this.getStoredReviews()),
  ]).pipe(
    map(([employees, attendance, goals, reviews]) => this.buildViewModel(employees, attendance, goals, reviews))
  );

  constructor(private readonly http: HttpClient) {}

  private fetchEmployees(): Observable<EmployeeProfile[]> {
    return this.http
      .get<any>(`${environment.apiBaseUrl}/x/api/v2/hr/employees?page=1&size=1200`, {
        headers: this.authHeaders(),
      })
      .pipe(
        map((response) => {
          const rawEmployees = Array.isArray(response) ? response : response?.content ?? [];
          const mapped = rawEmployees
            .map((employee: any) => this.mapEmployee(employee))
            .filter((employee: EmployeeProfile) => !!employee.fullName);
          const scoped = mapped.filter((employee: EmployeeProfile) => this.isTechnologyProfile(employee));
          return scoped.length ? scoped : mapped;
        })
      );
  }

  private fetchAttendance(): Observable<AttendanceRecord[]> {
    return this.http
      .get<any>(`${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords?page=1&size=500`, {
        headers: this.authHeaders(),
      })
      .pipe(
        map((response) => {
          const content = response?.content ?? [];
          return content.map((record: any) => ({
            employee: `${record?.employeeId?.firstName ?? ''} ${record?.employeeId?.lastName ?? ''}`.trim(),
            department: record?.employeeId?.department?.name ?? '',
            date: record?.attendanceDate ?? null,
            status: record?.status ?? 'ABSENT',
          }));
        })
      );
  }

  private buildViewModel(
    employees: EmployeeProfile[],
    attendance: AttendanceRecord[],
    goals: StoredGoal[],
    reviews: StoredReview[]
  ): ProductivityLiveViewModel {
    const employeeMap = new Map(employees.map((employee) => [this.normalize(employee.fullName), employee]));
    const scopedAttendance = attendance.filter((record) => employeeMap.has(this.normalize(record.employee)));
    const scopedGoals = goals.filter((goal) => employeeMap.has(this.normalize(goal.employeeName || goal.assignedTo || '')));
    const scopedReviews = reviews.filter((review) => employeeMap.has(this.normalize(review.employeeName)));

    const tasks = scopedGoals
      .map((goal) => this.mapGoalToTask(goal, employeeMap))
      .sort((left, right) => this.taskWeight(right) - this.taskWeight(left));

    return {
      metrics: this.buildMetrics(tasks, employees, scopedAttendance, scopedReviews),
      tasks,
      cycles: this.buildCycles(employees, scopedReviews),
      scorecards: this.buildScorecards(employees, tasks, scopedAttendance, scopedReviews),
      leaderboard: this.buildLeaderboard(employees, tasks, scopedAttendance, scopedReviews),
      trendPoints: this.buildTrendPoints(scopedAttendance),
    };
  }

  private buildMetrics(
    tasks: ProductivityTask[],
    employees: EmployeeProfile[],
    attendance: AttendanceRecord[],
    reviews: StoredReview[]
  ): ProductivityMetric[] {
    const openTasks = tasks.filter((task) => task.status !== 'Completed').length;
    const overdueTasks = tasks.filter((task) => task.status === 'Overdue').length;
    const completedTasks = tasks.filter((task) => task.status === 'Completed').length;
    const reviewCoverage = employees.length
      ? Math.round((new Set(reviews.map((review) => this.normalize(review.employeeName))).size / employees.length) * 100)
      : 0;
    const onTimeBase = attendance.filter((record) => ['PRESENT', 'LATE'].includes(record.status)).length;
    const onTime = attendance.filter((record) => record.status === 'PRESENT').length;
    const onTimeRate = onTimeBase ? Math.round((onTime / onTimeBase) * 100) : 0;

    return [
      {
        label: 'Open work items',
        value: String(openTasks),
        delta: `${tasks.filter((task) => task.status === 'In Progress').length} in progress`,
        tone: openTasks ? ('neutral' as const) : ('positive' as const),
        hint: 'Active ICT and service-delivery work items from stored targets.',
      },
      {
        label: 'Overdue work',
        value: String(overdueTasks),
        delta: `${tasks.filter((task) => task.priority === 'Critical').length} critical`,
        tone: overdueTasks ? ('warning' as const) : ('positive' as const),
        hint: 'Items past due date within scoped operational teams.',
      },
      {
        label: 'Closure rate',
        value: tasks.length ? `${Math.round((completedTasks / tasks.length) * 100)}%` : '0%',
        delta: `${completedTasks} closed`,
        tone: completedTasks >= overdueTasks ? ('positive' as const) : ('warning' as const),
        hint: 'Completion against current technology work items.',
      },
      {
        label: 'Review coverage',
        value: `${reviewCoverage}%`,
        delta: `${reviews.length} submissions`,
        tone: reviewCoverage >= 60 ? ('positive' as const) : ('neutral' as const),
        hint: 'Self and supervisor submissions recorded for scoped employees.',
      },
      {
        label: 'On-time attendance',
        value: `${onTimeRate}%`,
        delta: `${attendance.length} records`,
        tone: onTimeRate >= 80 ? ('positive' as const) : onTimeRate >= 60 ? ('neutral' as const) : ('warning' as const),
        hint: 'Punctuality signal derived from attendance records.',
      },
    ].slice(0, 4) as ProductivityMetric[];
  }

  private buildCycles(employees: EmployeeProfile[], reviews: StoredReview[]): ProductivityReviewCycle[] {
    const now = new Date();
    const weekStart = this.startOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const reviewedEmployees = new Set(reviews.map((review) => this.normalize(review.employeeName))).size;
    const selfReviewedEmployees = new Set(reviews.filter((review) => review.reviewType === 'SELF').map((review) => this.normalize(review.employeeName))).size;
    const supervisorReviewedEmployees = new Set(reviews.filter((review) => review.reviewType === 'SUPERVISOR').map((review) => this.normalize(review.employeeName))).size;
    const base = employees.length || 1;

    return [
      {
        name: 'Weekly Delivery Snapshot',
        period: `${this.formatDate(weekStart)} - ${this.formatDate(weekEnd)}`,
        owner: 'Service Delivery Leadership',
        selfAssessmentRate: `${Math.round((selfReviewedEmployees / base) * 100)}%`,
        supervisorRate: `${Math.round((supervisorReviewedEmployees / base) * 100)}%`,
        status: reviewedEmployees ? 'In progress' : 'Open',
      },
      {
        name: 'Monthly ICT Performance Review',
        period: `${this.formatDate(monthStart)} - ${this.formatDate(monthEnd)}`,
        owner: 'Operations and HR',
        selfAssessmentRate: `${Math.round((selfReviewedEmployees / base) * 100)}%`,
        supervisorRate: `${Math.round((supervisorReviewedEmployees / base) * 100)}%`,
        status: reviewedEmployees ? 'Open' : 'Scheduled',
      },
    ];
  }

  private buildScorecards(
    employees: EmployeeProfile[],
    tasks: ProductivityTask[],
    attendance: AttendanceRecord[],
    reviews: StoredReview[]
  ): ProductivityScorecard[] {
    return employees
      .map((employee) => {
        const employeeTasks = tasks.filter((task) => this.normalize(task.assignee) === this.normalize(employee.fullName));
        const employeeAttendance = attendance.filter((record) => this.normalize(record.employee) === this.normalize(employee.fullName));
        const employeeReviews = reviews
          .filter((review) => this.normalize(review.employeeName) === this.normalize(employee.fullName))
          .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());
        const completedTasks = employeeTasks.filter((task) => task.status === 'Completed').length;
        const overdueTasks = employeeTasks.filter((task) => task.status === 'Overdue').length;
        const onTimeBase = employeeAttendance.filter((record) => ['PRESENT', 'LATE'].includes(record.status)).length;
        const onTime = employeeAttendance.filter((record) => record.status === 'PRESENT').length;
        const completionRate = employeeTasks.length ? Math.round((completedTasks / employeeTasks.length) * 100) : 0;
        const onTimeRate = onTimeBase ? Math.round((onTime / onTimeBase) * 100) : 0;
        const latestReview = employeeReviews[0];
        const rawScore = Math.max(0, Math.min(100, Math.round(completionRate * 0.45 + onTimeRate * 0.3 + (latestReview?.score ?? 0) * 5 - overdueTasks * 8)));

        return {
          employee: employee.fullName,
          role: employee.role,
          department: employee.department,
          completionRate: `${completionRate}%`,
          onTimeRate: `${onTimeRate}%`,
          score: `${(rawScore / 20).toFixed(1)} / 5`,
          trend: latestReview ? '+0.1' : overdueTasks ? '-0.3' : '+0.0',
          reviewStatus: latestReview
            ? `${latestReview.reviewType === 'SELF' ? 'Self' : 'Supervisor'} review submitted`
            : 'No review submitted yet',
        };
      })
      .sort((left, right) => Number.parseFloat(right.score) - Number.parseFloat(left.score))
      .slice(0, 8);
  }

  private buildLeaderboard(
    employees: EmployeeProfile[],
    tasks: ProductivityTask[],
    attendance: AttendanceRecord[],
    reviews: StoredReview[]
  ): ProductivityLeaderboardRow[] {
    const departments = new Map<string, EmployeeProfile[]>();
    employees.forEach((employee) => {
      const list = departments.get(employee.department) || [];
      list.push(employee);
      departments.set(employee.department, list);
    });

    return [...departments.entries()]
      .map(([unit, members]) => {
        const names = new Set(members.map((member) => this.normalize(member.fullName)));
        const unitTasks = tasks.filter((task) => names.has(this.normalize(task.assignee)));
        const unitAttendance = attendance.filter((record) => names.has(this.normalize(record.employee)));
        const unitReviews = reviews.filter((review) => names.has(this.normalize(review.employeeName)));
        const completed = unitTasks.filter((task) => task.status === 'Completed').length;
        const overdue = unitTasks.filter((task) => task.status === 'Overdue').length;
        const attendanceBase = unitAttendance.filter((record) => ['PRESENT', 'LATE'].includes(record.status)).length;
        const onTime = unitAttendance.filter((record) => record.status === 'PRESENT').length;
        const completionRate = unitTasks.length ? (completed / unitTasks.length) * 100 : 0;
        const onTimeRate = attendanceBase ? (onTime / attendanceBase) * 100 : 0;
        const score = Math.max(0, Math.min(100, Math.round(completionRate * 0.55 + onTimeRate * 0.45 - overdue * 5)));
        const selfReviewRate = members.length
          ? Math.round((new Set(unitReviews.filter((review) => review.reviewType === 'SELF').map((review) => this.normalize(review.employeeName))).size / members.length) * 100)
          : 0;

        return {
          unit,
          score: `${score}%`,
          completed: String(completed),
          overdue: String(overdue),
          selfReviewRate: `${selfReviewRate}%`,
          risk: score >= 80 ? 'Low' : score >= 60 ? 'Moderate' : 'High',
        };
      })
      .sort((left, right) => Number.parseInt(right.score, 10) - Number.parseInt(left.score, 10));
  }

  private buildTrendPoints(attendance: AttendanceRecord[]): number[] {
    const now = new Date();
    return Array.from({ length: 6 }, (_, offset) => {
      const bucketEnd = new Date(now);
      bucketEnd.setDate(now.getDate() - (5 - offset) * 7);
      const bucketStart = new Date(bucketEnd);
      bucketStart.setDate(bucketEnd.getDate() - 6);
      const bucket = attendance.filter((record) => {
        if (!record.date) {
          return false;
        }
        const value = new Date(record.date);
        return value >= bucketStart && value <= bucketEnd;
      });
      const base = bucket.filter((record) => ['PRESENT', 'LATE'].includes(record.status)).length;
      const onTime = bucket.filter((record) => record.status === 'PRESENT').length;
      return base ? Math.round((onTime / base) * 100) : 0;
    });
  }

  private mapGoalToTask(goal: StoredGoal, employeeMap: Map<string, EmployeeProfile>): ProductivityTask {
    const assignee = String(goal.employeeName || goal.assignedTo || 'Unassigned').trim();
    const employee = employeeMap.get(this.normalize(assignee));
    const metrics = Array.isArray(goal.targetMetrics) ? goal.targetMetrics : [];
    const completedMetrics = metrics.filter((metric) => metric.completed).length;
    const progress = metrics.length ? Math.round((completedMetrics / metrics.length) * 100) : 0;
    const due = goal.endDate ? new Date(goal.endDate) : null;
    const overdue = !!due && due < this.startOfDay(new Date()) && progress < 100;

    return {
      title: String(goal.goalName || 'Untitled work item').trim(),
      assignee,
      team: employee?.department || 'Technology Operations',
      dueDate: due ? this.formatLongDate(due) : 'No due date',
      priority: this.mapPriority(goal.priority, due),
      status: progress >= 100 ? 'Completed' : overdue ? 'Overdue' : this.normalize(goal.progressStatus || '') === 'in progress' ? 'In Progress' : 'Not Started',
      progress,
      target: metrics.length
        ? `Outstanding checkpoints: ${metrics.filter((metric) => !metric.completed).map((metric) => metric.name).slice(0, 2).join(', ') || 'none'}`
        : String(goal.goalDescription || 'Track and close the assigned operational deliverable.').trim(),
      weight: metrics.length ? Math.min(40, Math.max(10, metrics.length * 5)) : 10,
    };
  }

  private mapEmployee(employee: any): EmployeeProfile {
    const fullName = `${employee?.firstName ?? employee?.firstname ?? ''} ${employee?.lastName ?? employee?.lastname ?? ''}`.trim()
      || String(employee?.fullName || employee?.fullname || employee?.name || '').trim();
    return {
      id: String(employee?.id || employee?.employeeId || employee?.userId || fullName),
      fullName,
      department: this.pickText(employee?.department?.name, employee?.department, employee?.unit?.name, employee?.team?.name) || 'Technology Operations',
      role: this.pickText(employee?.jobTitle, employee?.designation, employee?.jobRole?.name, employee?.role?.name) || 'IT Services Staff',
      supervisor: this.pickText(employee?.supervisor?.fullName, employee?.supervisor?.name, employee?.supervisorName, employee?.reportTo, employee?.lineManager) || '',
    };
  }

  private authHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('Token') || sessionStorage.getItem('accessToken') || '';
    const tenantId = sessionStorage.getItem('tenantId') || sessionStorage.getItem('X-Tenant-ID') || 'default';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
    });
  }

  private getStoredGoals(): StoredGoal[] {
    return [...this.readStorage('targetGoals'), ...this.readStorage('employeeGoals')];
  }

  private getStoredReviews(): StoredReview[] {
    return this.readStorage('productivityReviewSubmissions');
  }

  private readStorage(key: string): any[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private taskWeight(task: ProductivityTask): number {
    const statusWeight = task.status === 'Overdue' ? 40 : task.status === 'In Progress' ? 30 : task.status === 'Not Started' ? 20 : 10;
    const priorityWeight = task.priority === 'Critical' ? 4 : task.priority === 'High' ? 3 : task.priority === 'Medium' ? 2 : 1;
    return statusWeight + priorityWeight;
  }

  private mapPriority(priority: string | undefined, due: Date | null): 'Critical' | 'High' | 'Medium' | 'Low' {
    const normalized = this.normalize(priority || '');
    if (normalized === 'high') {
      return 'High';
    }
    if (normalized === 'low') {
      return 'Low';
    }
    if (due) {
      const days = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days <= 1) {
        return 'Critical';
      }
      if (days <= 3) {
        return 'High';
      }
    }
    return 'Medium';
  }

  private isTechnologyProfile(employee: EmployeeProfile): boolean {
    const text = `${employee.department} ${employee.role}`.toLowerCase();
    return ['it', 'ict', 'technology', 'software', 'engineering', 'infrastructure', 'support', 'service delivery', 'implementation', 'network', 'security', 'project', 'product', 'systems', 'cloud', 'operations']
      .some((keyword) => text.includes(keyword));
  }

  private pickText(...values: unknown[]): string {
    return values
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .find((value) => !!value) || '';
  }

  private normalize(value: string): string {
    return String(value || '').trim().toLowerCase();
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(value);
  }

  private formatLongDate(value: Date): string {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(value);
  }

  private startOfWeek(date: Date): Date {
    const value = new Date(date);
    const day = value.getDay();
    const diff = value.getDate() - day + (day === 0 ? -6 : 1);
    value.setDate(diff);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private startOfDay(date: Date): Date {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }
}
