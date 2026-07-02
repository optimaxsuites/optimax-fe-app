import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, fromEvent, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';
import { EmployeeService } from '../../service/employee.service';
import { AttendancetableService } from '../../service/attendance/attendancetable.service';
import { ProductivityReviewSubmission, REVIEW_STORAGE_KEY } from './productivity-review.service';

type ProductivityTone = 'positive' | 'warning' | 'neutral';
type ProductivityTaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
type ProductivityPriority = 'Critical' | 'High' | 'Medium' | 'Low';
type ProductivityRisk = 'Low' | 'Moderate' | 'High';

interface StoredMetric {
  name: string;
  completed: boolean;
}

interface StoredGoal {
  goalName?: string;
  employeeName?: string;
  goalDescription?: string;
  startDate?: string;
  endDate?: string;
  priority?: string;
  assignedTo?: string;
  targetMetrics?: StoredMetric[];
  progressStatus?: string;
  user_id?: number;
  level?: string | string[];
  evaluator?: string | string[];
}

interface EmployeeProfile {
  id: string;
  fullName: string;
  department: string;
  role: string;
  supervisor: string;
}

export interface ProductivityMetricCard {
  label: string;
  value: string;
  delta: string;
  tone: ProductivityTone;
  hint: string;
}

export interface ProductivityTaskCard {
  title: string;
  assignee: string;
  team: string;
  dueDate: string;
  priority: ProductivityPriority;
  status: ProductivityTaskStatus;
  progress: number;
  target: string;
  weight: number;
}

export interface ProductivityCycleCard {
  name: string;
  period: string;
  owner: string;
  selfAssessmentRate: string;
  supervisorRate: string;
  status: string;
}

export interface ProductivityScorecardCard {
  employee: string;
  role: string;
  department: string;
  completionRate: string;
  onTimeRate: string;
  score: string;
  trend: string;
  reviewStatus: string;
}

export interface ProductivityLeaderboardRow {
  unit: string;
  score: string;
  completed: string;
  overdue: string;
  selfReviewRate: string;
  risk: ProductivityRisk;
}

export interface ProductivityInsight {
  title: string;
  detail: string;
}

export interface ProductivityWorkspaceViewModel {
  metrics: ProductivityMetricCard[];
  tasks: ProductivityTaskCard[];
  cycles: ProductivityCycleCard[];
  scorecards: ProductivityScorecardCard[];
  leaderboard: ProductivityLeaderboardRow[];
  trendPoints: number[];
  insights: ProductivityInsight[];
  supervisorReviewRate: string;
  highRiskUnits: number;
  highRiskSummary: string;
}

const EMPTY_VM: ProductivityWorkspaceViewModel = {
  metrics: [],
  tasks: [],
  cycles: [],
  scorecards: [],
  leaderboard: [],
  trendPoints: [0, 0, 0, 0, 0, 0],
  insights: [],
  supervisorReviewRate: '0%',
  highRiskUnits: 0,
  highRiskSummary: 'No department risk pattern is available yet.',
};

@Injectable({
  providedIn: 'root',
})
export class ProductivityDataService {
  private readonly refreshSubject = new BehaviorSubject<void>(undefined);
  readonly workspace$;

  constructor(
    private readonly employeeService: EmployeeService,
    private readonly attendanceService: AttendancetableService
  ) {
    this.workspace$ = combineLatest([
      this.employeeService.employees$,
      this.attendanceService.attendance$,
      mergeGoalStreams(),
      this.refreshSubject.asObservable(),
    ]).pipe(
      map(([employees, attendance]) => this.buildWorkspace(employees ?? [], attendance ?? []))
    );
  }

  init(): void {
    this.employeeService.ensureEmployeesLoaded();
    this.attendanceService.fetchAllRecords();
    this.refresh();
  }

  refresh(): void {
    this.refreshSubject.next(undefined);
  }

  private buildWorkspace(employees: any[], attendance: AttendanceTableRecord[]): ProductivityWorkspaceViewModel {
    const employeeProfiles = this.getRelevantEmployees(employees);
    if (!employeeProfiles.length) {
      return EMPTY_VM;
    }

    const employeeMap = new Map(employeeProfiles.map((employee) => [employee.fullName.toLowerCase(), employee]));
    const scopedAttendance = attendance.filter((record) => employeeMap.has(String(record.employee || '').trim().toLowerCase()));
    const storedGoals = this.getStoredGoals();
    const scopedGoals = storedGoals.filter((goal) => employeeMap.has(this.normalizeKey(goal.employeeName || goal.assignedTo || '')));
    const reviewSubmissions = this.getStoredReviews().filter((submission) => employeeMap.has(this.normalizeKey(submission.employeeName)));

    const tasks = scopedGoals
      .map((goal) => this.mapGoalToTask(goal, employeeMap))
      .sort((left, right) => {
        const leftScore = this.taskSeverity(left);
        const rightScore = this.taskSeverity(right);
        return rightScore - leftScore;
      });

    const metrics = this.buildMetrics(tasks, scopedAttendance, employeeProfiles, scopedGoals);
    const cycles = this.buildCycles(employeeProfiles, scopedGoals, reviewSubmissions);
    const scorecards = this.buildScorecards(employeeProfiles, tasks, scopedAttendance, reviewSubmissions);
    const leaderboard = this.buildLeaderboard(employeeProfiles, tasks, scopedGoals, scopedAttendance, reviewSubmissions);
    const trendPoints = this.buildTrendPoints(scopedAttendance);
    const insights = this.buildInsights(leaderboard, tasks, scopedAttendance);

    const highRiskRows = leaderboard.filter((row) => row.risk === 'High');
    const highRiskSummary = highRiskRows.length
      ? highRiskRows.map((row) => row.unit).join(' and ')
      : 'Delivery operations are currently within acceptable thresholds.';

    return {
      metrics,
      tasks: tasks.slice(0, 8),
      cycles,
      scorecards: scorecards.slice(0, 6),
      leaderboard,
      trendPoints,
      insights,
      supervisorReviewRate: cycles[0]?.supervisorRate || '0%',
      highRiskUnits: highRiskRows.length,
      highRiskSummary,
    };
  }

  private getRelevantEmployees(employees: any[]): EmployeeProfile[] {
    const profiles = employees
      .map((employee) => this.mapEmployee(employee))
      .filter((employee): employee is EmployeeProfile => !!employee.fullName);

    const scoped = profiles.filter((employee) => this.isTechnologyProfile(employee));
    return scoped.length ? scoped : profiles;
  }

  private mapEmployee(employee: any): EmployeeProfile {
    const firstName = String(employee?.firstName || employee?.firstname || '').trim();
    const lastName = String(employee?.lastName || employee?.lastname || '').trim();
    const fullName = `${firstName} ${lastName}`.trim()
      || String(employee?.fullName || employee?.fullname || employee?.name || '').trim();

    return {
      id: String(employee?.id || employee?.employeeId || employee?.userId || fullName),
      fullName,
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
      ) || 'Business Unit Lead',
    };
  }

  private buildMetrics(
    tasks: ProductivityTaskCard[],
    attendance: AttendanceTableRecord[],
    employees: EmployeeProfile[],
    goals: StoredGoal[]
  ): ProductivityMetricCard[] {
    const openTasks = tasks.filter((task) => task.status !== 'Completed');
    const overdueTasks = tasks.filter((task) => task.status === 'Overdue');
    const completedTasks = tasks.filter((task) => task.status === 'Completed');
    const onTimeAttendance = attendance.filter((record) => record.status === 'PRESENT').length;
    const attendanceBaseline = attendance.filter((record) => ['PRESENT', 'LATE'].includes(record.status)).length;
    const onTimeRate = attendanceBaseline ? Math.round((onTimeAttendance / attendanceBaseline) * 100) : 0;
    const selfOwnedGoals = goals.filter((goal) => !goal.assignedTo || this.normalizeKey(goal.assignedTo) === this.normalizeKey(goal.employeeName || ''));
    const selfRate = employees.length ? Math.round((selfOwnedGoals.length / employees.length) * 100) : 0;

    return [
      {
        label: 'Open work items',
        value: String(openTasks.length),
        delta: `${tasks.filter((task) => task.status === 'In Progress').length} in execution`,
        tone: openTasks.length > 0 ? 'neutral' : 'positive',
        hint: 'Active target items across software, infrastructure, support, and delivery operations.',
      },
      {
        label: 'Overdue delivery',
        value: String(overdueTasks.length),
        delta: `${tasks.filter((task) => task.priority === 'Critical').length} critical`,
        tone: overdueTasks.length > 0 ? 'warning' : 'positive',
        hint: 'Targets past due date inside current IT and ICT operational scope.',
      },
      {
        label: 'Closure rate',
        value: tasks.length ? `${Math.round((completedTasks.length / tasks.length) * 100)}%` : '0%',
        delta: `${completedTasks.length} completed`,
        tone: completedTasks.length >= overdueTasks.length ? 'positive' : 'warning',
        hint: 'Derived from current tracked work items in the HR target workflow.',
      },
      {
        label: 'On-time office rhythm',
        value: `${onTimeRate}%`,
        delta: `${attendance.length} attendance records`,
        tone: onTimeRate >= 80 ? 'positive' : onTimeRate >= 60 ? 'neutral' : 'warning',
        hint: 'Uses punctual attendance as a delivery-discipline signal for service teams.',
      },
      {
        label: 'Self-owned plans',
        value: `${selfRate}%`,
        delta: `${selfOwnedGoals.length} employee-owned goals`,
        tone: selfRate >= 60 ? 'positive' : 'neutral',
        hint: 'Employees with at least one active self-owned goal or target item.',
      },
    ].slice(0, 4) as ProductivityMetricCard[];
  }

  private buildCycles(
    employees: EmployeeProfile[],
    goals: StoredGoal[],
    reviews: ProductivityReviewSubmission[]
  ): ProductivityCycleCard[] {
    const totalEmployees = employees.length || 1;
    const selfOwned = new Set(
      goals
        .filter((goal) => !goal.assignedTo || this.normalizeKey(goal.assignedTo) === this.normalizeKey(goal.employeeName || ''))
        .map((goal) => this.normalizeKey(goal.employeeName || ''))
    );
    const supervisorOwned = new Set(
      goals
        .filter((goal) => !!goal.assignedTo && this.normalizeKey(goal.assignedTo) !== this.normalizeKey(goal.employeeName || ''))
        .map((goal) => this.normalizeKey(goal.employeeName || ''))
    );

    const now = new Date();
    const weekStart = this.startOfWeek(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const quarterEnd = new Date(now.getFullYear(), now.getMonth() + (3 - (now.getMonth() % 3)), 0);

    const selfReviewers = new Set(reviews.filter((review) => review.reviewType === 'SELF').map((review) => this.normalizeKey(review.employeeName)));
    const supervisorReviewed = new Set(reviews.filter((review) => review.reviewType === 'SUPERVISOR').map((review) => this.normalizeKey(review.employeeName)));

    return [
      {
        name: 'Weekly Delivery Snapshot',
        period: `${this.formatShortDate(weekStart)} - ${this.formatShortDate(weekEnd)}`,
        owner: 'Service Delivery Leadership',
        selfAssessmentRate: `${Math.round((selfReviewers.size / totalEmployees) * 100)}%`,
        supervisorRate: `${Math.round((supervisorReviewed.size / totalEmployees) * 100)}%`,
        status: reviews.length ? 'In progress' : goals.length ? 'Open' : 'Scheduled',
      },
      {
        name: 'Monthly ICT Performance Review',
        period: `${this.formatShortDate(monthStart)} - ${this.formatShortDate(monthEnd)}`,
        owner: 'Operations and HR',
        selfAssessmentRate: `${Math.round((Math.max(selfOwned.size, selfReviewers.size) / totalEmployees) * 100)}%`,
        supervisorRate: `${Math.round((Math.max(supervisorOwned.size, supervisorReviewed.size) / totalEmployees) * 100)}%`,
        status: reviews.length ? 'Open' : 'Scheduled',
      },
      {
        name: 'Quarterly Service Governance Review',
        period: `${this.formatShortDate(monthStart)} - ${this.formatShortDate(quarterEnd)}`,
        owner: 'Executive Management',
        selfAssessmentRate: `${Math.round((selfOwned.size / totalEmployees) * 100)}%`,
        supervisorRate: `${Math.round((supervisorOwned.size / totalEmployees) * 100)}%`,
        status: 'Scheduled',
      },
    ];
  }

  private buildScorecards(
    employees: EmployeeProfile[],
    tasks: ProductivityTaskCard[],
    attendance: AttendanceTableRecord[],
    reviews: ProductivityReviewSubmission[]
  ): ProductivityScorecardCard[] {
    return employees
      .map((employee) => {
        const employeeTasks = tasks.filter((task) => this.normalizeKey(task.assignee) === this.normalizeKey(employee.fullName));
        const employeeAttendance = attendance.filter((record) => this.normalizeKey(record.employee) === this.normalizeKey(employee.fullName));
        const employeeReviews = reviews.filter((review) => this.normalizeKey(review.employeeName) === this.normalizeKey(employee.fullName));
        const latestSupervisorReview = employeeReviews
          .filter((review) => review.reviewType === 'SUPERVISOR')
          .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0];
        const latestSelfReview = employeeReviews
          .filter((review) => review.reviewType === 'SELF')
          .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0];
        const completed = employeeTasks.filter((task) => task.status === 'Completed').length;
        const completionRate = employeeTasks.length ? Math.round((completed / employeeTasks.length) * 100) : 0;
        const onTime = employeeAttendance.filter((record) => record.status === 'PRESENT').length;
        const onTimeBase = employeeAttendance.filter((record) => ['PRESENT', 'LATE'].includes(record.status)).length;
        const onTimeRate = onTimeBase ? Math.round((onTime / onTimeBase) * 100) : 0;
        const overdue = employeeTasks.filter((task) => task.status === 'Overdue').length;
        const reviewScore = latestSupervisorReview?.score ?? latestSelfReview?.score ?? 0;
        const score = Math.max(0, Math.min(100, Math.round(completionRate * 0.45 + onTimeRate * 0.3 + reviewScore * 5 - overdue * 8)));
        const trend = latestSupervisorReview ? '+0.2' : latestSelfReview ? '+0.1' : overdue > 0 ? '-0.4' : '+0.0';
        const reviewStatus = latestSupervisorReview
          ? `Supervisor review submitted by ${latestSupervisorReview.reviewerName}`
          : latestSelfReview
          ? 'Self review submitted, supervisor review pending'
          : overdue > 0
          ? 'Supervisor attention required'
          : 'No review submitted yet';

        return {
          employee: employee.fullName,
          role: employee.role,
          department: employee.department,
          completionRate: `${completionRate}%`,
          onTimeRate: `${onTimeRate}%`,
          score: `${(score / 20).toFixed(1)} / 5`,
          trend,
          reviewStatus,
        };
      })
      .sort((left, right) => Number.parseFloat(right.score) - Number.parseFloat(left.score));
  }

  private buildLeaderboard(
    employees: EmployeeProfile[],
    tasks: ProductivityTaskCard[],
    goals: StoredGoal[],
    attendance: AttendanceTableRecord[],
    reviews: ProductivityReviewSubmission[]
  ): ProductivityLeaderboardRow[] {
    const departments = new Map<string, EmployeeProfile[]>();
    employees.forEach((employee) => {
      const bucket = departments.get(employee.department) || [];
      bucket.push(employee);
      departments.set(employee.department, bucket);
    });

    return [...departments.entries()]
      .map(([unit, members]) => {
        const names = new Set(members.map((member) => this.normalizeKey(member.fullName)));
        const unitTasks = tasks.filter((task) => names.has(this.normalizeKey(task.assignee)));
        const unitAttendance = attendance.filter((record) => names.has(this.normalizeKey(record.employee)));
        const unitGoals = goals.filter((goal) => names.has(this.normalizeKey(goal.employeeName || goal.assignedTo || '')));
        const unitReviews = reviews.filter((review) => names.has(this.normalizeKey(review.employeeName)));
        const completed = unitTasks.filter((task) => task.status === 'Completed').length;
        const overdue = unitTasks.filter((task) => task.status === 'Overdue').length;
        const onTime = unitAttendance.filter((record) => record.status === 'PRESENT').length;
        const onTimeBase = unitAttendance.filter((record) => ['PRESENT', 'LATE'].includes(record.status)).length;
        const onTimeRate = onTimeBase ? (onTime / onTimeBase) * 100 : 0;
        const completionRate = unitTasks.length ? (completed / unitTasks.length) * 100 : 0;
        const score = Math.max(0, Math.min(100, Math.round(completionRate * 0.55 + onTimeRate * 0.45 - overdue * 5)));
        const selfOwned = unitGoals.filter((goal) => !goal.assignedTo || this.normalizeKey(goal.assignedTo) === this.normalizeKey(goal.employeeName || '')).length;
        const selfSubmitted = new Set(unitReviews.filter((review) => review.reviewType === 'SELF').map((review) => this.normalizeKey(review.employeeName))).size;
        const selfReviewRate = members.length ? Math.round((Math.max(selfOwned, selfSubmitted) / members.length) * 100) : 0;

        const risk: ProductivityRisk = score >= 80 ? 'Low' : score >= 60 ? 'Moderate' : 'High';

        return {
          unit,
          score: `${score}%`,
          completed: String(completed),
          overdue: String(overdue),
          selfReviewRate: `${selfReviewRate}%`,
          risk,
        };
      })
      .sort((left, right) => Number.parseInt(right.score, 10) - Number.parseInt(left.score, 10));
  }

  private buildTrendPoints(attendance: AttendanceTableRecord[]): number[] {
    const now = new Date();
    const points: number[] = [];

    for (let index = 5; index >= 0; index -= 1) {
      const end = new Date(now);
      end.setDate(now.getDate() - index * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);

      const bucket = attendance.filter((record) => {
        if (!record.date) {
          return false;
        }

        const value = new Date(record.date);
        return value >= start && value <= end;
      });

      const present = bucket.filter((record) => record.status === 'PRESENT').length;
      const base = bucket.filter((record) => ['PRESENT', 'LATE'].includes(record.status)).length;
      points.push(base ? Math.round((present / base) * 100) : 0);
    }

    return points;
  }

  private buildInsights(
    leaderboard: ProductivityLeaderboardRow[],
    tasks: ProductivityTaskCard[],
    attendance: AttendanceTableRecord[]
  ): ProductivityInsight[] {
    const highestRisk = leaderboard.find((row) => row.risk === 'High');
    const overdueCount = tasks.filter((task) => task.status === 'Overdue').length;
    const lateCount = attendance.filter((record) => record.status === 'LATE').length;
    const bestUnit = leaderboard[0];

    return [
      {
        title: highestRisk?.unit || 'Technology Operations',
        detail: highestRisk
          ? `This unit has the weakest combined execution score with ${highestRisk.overdue} overdue items and needs delivery follow-up.`
          : 'No high-risk technology unit is currently flagged from the live HR signals.',
      },
      {
        title: 'Office rhythm',
        detail: lateCount
          ? `${lateCount} late attendance records are reducing delivery confidence across current ICT teams.`
          : 'Current attendance rhythm is stable with no late-attendance pressure visible in the loaded records.',
      },
      {
        title: bestUnit?.unit || 'Service Delivery',
        detail: bestUnit
          ? `${bestUnit.unit} currently leads the ICT leaderboard while the workspace tracks ${overdueCount} overdue work items across the scope.`
          : 'No department comparison is available yet because no scoped HR data has been loaded.',
      },
    ];
  }

  private mapGoalToTask(goal: StoredGoal, employeeMap: Map<string, EmployeeProfile>): ProductivityTaskCard {
    const assigneeName = String(goal.employeeName || goal.assignedTo || 'Unassigned').trim();
    const employee = employeeMap.get(this.normalizeKey(assigneeName));
    const metrics = Array.isArray(goal.targetMetrics) ? goal.targetMetrics : [];
    const completedMetrics = metrics.filter((metric) => metric.completed).length;
    const progress = metrics.length ? Math.round((completedMetrics / metrics.length) * 100) : 0;
    const dueDate = goal.endDate ? new Date(goal.endDate) : null;
    const isPastDue = !!dueDate && dueDate < this.startOfDay(new Date()) && progress < 100;
    const status = this.mapGoalStatus(goal.progressStatus, progress, isPastDue);

    return {
      title: String(goal.goalName || 'Untitled work item').trim(),
      assignee: assigneeName,
      team: employee?.department || 'Technology Operations',
      dueDate: dueDate ? this.formatDueDate(dueDate) : 'No due date',
      priority: this.mapPriority(goal.priority, dueDate),
      status,
      progress,
      target: this.buildTargetDescription(goal, metrics),
      weight: metrics.length ? Math.min(40, Math.max(10, metrics.length * 5)) : 10,
    };
  }

  private mapGoalStatus(rawStatus: string | undefined, progress: number, isPastDue: boolean): ProductivityTaskStatus {
    if (progress >= 100 || this.normalizeKey(rawStatus || '') === 'completed') {
      return 'Completed';
    }

    if (isPastDue) {
      return 'Overdue';
    }

    const status = this.normalizeKey(rawStatus || '');
    if (status === 'in progress') {
      return 'In Progress';
    }

    return 'Pending';
  }

  private mapPriority(priority: string | undefined, dueDate: Date | null): ProductivityPriority {
    const value = this.normalizeKey(priority || '');
    if (value === 'high') {
      return 'High';
    }
    if (value === 'low') {
      return 'Low';
    }
    if (dueDate) {
      const daysToDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysToDue <= 1) {
        return 'Critical';
      }
      if (daysToDue <= 3) {
        return 'High';
      }
    }
    return 'Medium';
  }

  private buildTargetDescription(goal: StoredGoal, metrics: StoredMetric[]): string {
    if (metrics.length) {
      const outstanding = metrics.filter((metric) => !metric.completed).map((metric) => metric.name);
      return outstanding.length
        ? `Outstanding checkpoints: ${outstanding.slice(0, 2).join(', ')}`
        : 'All defined target checkpoints are complete.';
    }

    return String(goal.goalDescription || 'Track and close the assigned operational deliverable.').trim();
  }

  private getStoredGoals(): StoredGoal[] {
    const adminGoals = this.parseStorageArray('targetGoals');
    const employeeGoals = this.parseStorageArray('employeeGoals');
    return [...adminGoals, ...employeeGoals];
  }

  private parseStorageArray(key: string): StoredGoal[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private getStoredReviews(): ProductivityReviewSubmission[] {
    try {
      const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
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
      'operations'
    ].some((keyword) => value.includes(keyword));
  }

  private taskSeverity(task: ProductivityTaskCard): number {
    const statusScore = task.status === 'Overdue' ? 4 : task.status === 'In Progress' ? 3 : task.status === 'Pending' ? 2 : 1;
    const priorityScore = task.priority === 'Critical' ? 4 : task.priority === 'High' ? 3 : task.priority === 'Medium' ? 2 : 1;
    return statusScore * 10 + priorityScore;
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

  private formatDueDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
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

  private startOfDay(date: Date): Date {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }
}

function mergeGoalStreams() {
  return merge(
    of(null),
    fromEvent(window, 'storage').pipe(map(() => null))
  ).pipe(map(() => Date.now()));
}
