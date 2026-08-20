import { Component, OnDestroy, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { timeout, catchError, switchMap } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import * as XLSX from 'xlsx';

import {
  ProductivityCycleCard,
  ProductivityDataService,
  ProductivityInsight,
  ProductivityLeaderboardRow,
  ProductivityMetricCard,
  ProductivityScorecardCard,
  ProductivityTaskCard,
} from './productivity-data.service';
import { ProductivityReviewService } from './productivity-review.service';
import {
  HrReportingService,
  HrExecutiveReport,
  HrWorkforceOverview,
  HrPayrollSummary,
  HrLeaveAttendance,
  HrEmployeeTurnover,
  HrCompensationEquity,
  HrRiskSummary,
  HrProbationTracking,
  HrStatutoryRemittance,
  HrBonusReport,
  HrOvertimeCost,
  HrVacancyAging,
} from './hr-reporting.service';
import { EmployeeService } from '../../service/employee.service';
import { HrTaskNotificationService } from '../../service/hr-task-notification.service';
import { AuthenticationService } from '../../shared-component/service/auth-service/authentication.service';
import {
  WorkTaskApiService,
  WorkTaskFull,
  WorkTaskDTO,
  WorkTaskStatus as ApiTaskStatus,
  WorkTaskPriority as ApiTaskPriority,
  SubtaskDTO,
  FollowUpDTO,
  FollowUpReplyDTO,
  PerformanceGoalFull,
  PerformanceGoalDTO,
  KpiDTO,
  AppraisalSubmissionFull,
  AppraisalSubmissionDTO,
  SupervisorReviewFull,
  SupervisorReviewDTO,
} from './work-task-api.service';

export type PMSection = 'board' | 'reports' | 'batch' | 'assessment' | 'supervisor' | 'review';

export interface ReviewSession {
  id: string;
  supervisorName: string;
  employeeName: string;
  period: 'week' | 'month';
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  tasksCount: number;
  completedCount: number;
  overdueCount: number;
  score: number;
  grade: string;
  discussionSummary: string;
  agreedActions: string;
  supervisorRating: number;
  recordedAt: string;
}
export type BoardView = 'board' | 'list' | 'gantt';
type TaskStatus = string; // widened to support custom stages
type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

interface SubTask {
  id: string; title: string; description?: string; done: boolean; assignee: string;
  status?: 'open' | 'ip' | 'blocked';
  startDate?: string; dueDate?: string; dependency?: string;
  subtaskId?: number;
  followUps?: FollowUp[];
}
interface ActivityEntry { id: string; author: string; text: string; timestamp: string; }
interface FollowUpReply {
  id: string; author: string; initials: string; color: string; timestamp: string; text: string;
  authorEmployeeId?: number;
}

interface FollowUp {
  id: string; author: string; initials: string; color: string;
  timestamp: string; text: string; photos: string[];
  decision?: string; progress?: number;
  followUpId?: number;
  replies?: FollowUpReply[];
  reactions?: Record<string, string[]>; // emoji → array of author names
}

export interface BoardTask {
  id: string; title: string; description: string; assignee: string; team: string;
  assignees?: string[];   // multi-assignee display names
  status: TaskStatus; priority: TaskPriority; dueDate: string; startDate: string;
  weight: number; progress: number; tags: string[];
  subtasks: SubTask[]; activity: ActivityEntry[];
  followUps: FollowUp[];
  inlineText?: string;
  expanded?: boolean;
  supervisorGrade?: number;   // 1-5 rating set by supervisor
  // Cost tracking (optional)
  cost?: number;
  costCurrency?: string;
  // Closed flag — task set to "Closed" gets archived automatically
  closed?: boolean;
  closedReason?: string;
  sprint?: string;
  // API-sync fields
  apiId?: number;
  assigneeEmployeeId?: number;
  supervisorEmployeeId?: number;
  createdByUserId?: number;
}

interface AssessmentKpi { id: string; text: string; done: boolean; }

interface AssessmentGoal {
  id: string; title: string; description: string; weight: number;
  dueDate: string; isOverdue: boolean;
  kpis: AssessmentKpi[];
  selfRating: number; rationale: string; open: boolean;
}

interface GoalSummary { title: string; weight: number; selfScore: number; evidenceCount: number; }

interface EmployeeSubmission {
  id: string; initials: string; name: string; role: string; department: string; color: string;
  avgSelfScore: number; supScore: number; status: 'pending' | 'reviewed';
  open: boolean; reviewedNote: string;
  goals: GoalSummary[];
  reviewNote: string; decision: string;
}

interface BatchRow {
  title: string; assignee: string; supervisor: string;
  start: string; due: string; priority: string; type: string;
  subtasks: string; kpiTarget: string; weight: number;
}

const HR_SEED: BoardTask[] = [
  {
    id: 'hr1', title: 'Annual Appraisal Cycle Setup',
    description: 'Configure the annual performance appraisal cycle for all departments.',
    assignee: 'Chidi Eze', assignees: ['Chidi Eze', 'Sarah Afolabi'],
    team: 'Adaeze Okonkwo', status: 'In Progress', priority: 'High',
    startDate: '2026-06-01', dueDate: '2026-06-15', weight: 25, progress: 50, tags: ['Workplan'],
    subtasks: [
      { id: 'hst1', title: 'Define review criteria', done: true, assignee: 'Chidi Eze', status: 'open' },
      { id: 'hst2', title: 'Set scoring rubrics', done: false, assignee: 'Chidi Eze', status: 'ip' },
      { id: 'hst3', title: 'Notify employees', done: false, assignee: 'Sarah Afolabi', status: 'open' },
    ],
    activity: [{ id: 'ha1', author: 'Chidi Eze', text: 'Criteria defined, moving to scoring rubrics.', timestamp: '2026-06-02T09:00:00Z' }],
    followUps: [
      { id: 'fu1', author: 'Chidi Eze', initials: 'CE', color: '#2563eb', timestamp: 'Jun 2, 09:00',
        text: 'Criteria defined and approved. Moving to scoring rubrics — template drafted, awaiting Olabisi\'s HRBP review before distribution.', photos: [], progress: 50 },
    ],
  },
  {
    id: 'hr2', title: 'Goal-Setting Workshop — Q3',
    description: 'Facilitate department-wide goal-setting sessions for Q3 across all business units.',
    assignee: 'Fatima Usman', assignees: ['Fatima Usman', 'Emeka Nwosu'],
    team: 'Adaeze Okonkwo', status: 'To Do', priority: 'Medium',
    startDate: '2026-06-10', dueDate: '2026-06-20', weight: 15, progress: 0, tags: ['Routine'],
    subtasks: [
      { id: 'hst4', title: 'Book venues', done: false, assignee: 'Fatima Usman', status: 'open' },
      { id: 'hst4b', title: 'Prepare facilitator guide', done: false, assignee: 'Emeka Nwosu', status: 'open' },
    ],
    activity: [],
    followUps: [],
  },
  {
    id: 'hr3', title: 'Competency Framework Review',
    description: 'Update the organisational competency framework to reflect 2026 strategy.',
    assignee: 'Olabisi Adeyemi', assignees: ['Olabisi Adeyemi', 'Chidi Eze'],
    team: 'Adaeze Okonkwo', status: 'In Review', priority: 'Critical',
    startDate: '2026-05-20', dueDate: '2026-06-07', weight: 30, progress: 80, tags: ['Workplan'],
    subtasks: [
      { id: 'hst5', title: 'Benchmark competitors', done: true, assignee: 'Olabisi Adeyemi', status: 'open' },
      { id: 'hst6', title: 'Board sign-off', done: false, assignee: 'Kemi Adeleke', status: 'blocked' },
    ],
    activity: [{ id: 'ha2', author: 'Olabisi Adeyemi', text: 'Benchmarking complete. Sent to board for sign-off.', timestamp: '2026-06-01T15:00:00Z' }],
    followUps: [
      { id: 'fu2', author: 'Adaeze Okonkwo', initials: 'AO', color: '#7c3aed', timestamp: 'Jun 1, 15:00',
        text: 'Board sign-off requires updated 2026 benchmarking comparators. Please reattach with current data and resubmit before Jun 5.', photos: [], decision: 'Changes', progress: 80 },
      { id: 'fu3', author: 'Olabisi Adeyemi', initials: 'OA', color: '#2563eb', timestamp: 'Jun 1, 10:00',
        text: 'Benchmarking complete across 6 peer organisations. Framework draft sent to Adaeze for final sign-off. Awaiting board slot.', photos: [], progress: 80 },
    ],
  },
  {
    id: 'hr4', title: 'Succession Planning Report',
    description: 'Identify critical roles and map succession candidates for C-suite.',
    assignee: 'Adaeze Okonkwo', assignees: ['Adaeze Okonkwo', 'Ngozi Obi'],
    team: 'Kemi Adeleke', status: 'Done', priority: 'High',
    startDate: '2026-05-01', dueDate: '2026-05-30', weight: 20, progress: 100, tags: ['Workplan'],
    subtasks: [
      { id: 'hst7', title: 'Identify critical roles', done: true, assignee: 'Adaeze Okonkwo', status: 'open' },
      { id: 'hst8', title: 'Map candidates', done: true, assignee: 'Ngozi Obi', status: 'open' },
      { id: 'hst9', title: 'Present to board', done: true, assignee: 'Adaeze Okonkwo', status: 'open' },
    ],
    activity: [{ id: 'ha3', author: 'Adaeze Okonkwo', text: 'Report presented and approved by the board.', timestamp: '2026-05-30T10:00:00Z' }],
    followUps: [
      { id: 'fu4', author: 'Kemi Adeleke', initials: 'KA', color: '#16a34a', timestamp: 'May 30, 10:00',
        text: 'Report presented and unanimously approved by the board. Succession plan will be integrated into the 2027 talent strategy.', photos: [], decision: 'Approved', progress: 100 },
    ],
  },
  {
    id: 'hr5', title: 'Employee Satisfaction Survey',
    description: 'Deploy the bi-annual employee satisfaction survey across all units.',
    assignee: 'Emeka Nwosu', assignees: ['Emeka Nwosu', 'Sarah Afolabi', 'Fatima Usman'],
    team: 'Chidi Eze', status: 'To Do', priority: 'Medium',
    startDate: '2026-06-15', dueDate: '2026-06-30', weight: 10, progress: 0, tags: ['Routine'],
    subtasks: [
      { id: 'hst10', title: 'Design questionnaire', done: false, assignee: 'Emeka Nwosu', status: 'open' },
      { id: 'hst11', title: 'Set up survey platform', done: false, assignee: 'Sarah Afolabi', status: 'open' },
    ],
    activity: [],
    followUps: [],
  },
  {
    id: 'hr6', title: 'Payroll Reconciliation — June',
    description: 'Reconcile payroll data for June across all branches before final run.',
    assignee: 'Tunde Bakare', assignees: ['Tunde Bakare'],
    team: 'Adaeze Okonkwo', status: 'To Do', priority: 'High',
    startDate: '2026-06-18', dueDate: '2026-06-25', weight: 20, progress: 0, tags: ['Routine'],
    subtasks: [
      { id: 'hst12', title: 'Pull payroll data from HRIS', done: false, assignee: 'Tunde Bakare', status: 'open' },
      { id: 'hst13', title: 'Variance analysis vs May', done: false, assignee: 'Tunde Bakare', status: 'open' },
      { id: 'hst14', title: 'CFO sign-off', done: false, assignee: 'Tunde Bakare', status: 'open' },
    ],
    activity: [],
    followUps: [],
  },
  {
    id: 'hr7', title: 'New Hire Onboarding — July Cohort',
    description: 'Coordinate onboarding for the 8 new hires joining in July.',
    assignee: 'Ngozi Obi', assignees: ['Ngozi Obi', 'Sarah Afolabi'],
    team: 'Chidi Eze', status: 'To Do', priority: 'Medium',
    startDate: '2026-06-20', dueDate: '2026-07-01', weight: 15, progress: 0, tags: ['Routine'],
    subtasks: [
      { id: 'hst15', title: 'Prepare onboarding packs', done: false, assignee: 'Sarah Afolabi', status: 'open' },
      { id: 'hst16', title: 'Schedule orientation sessions', done: false, assignee: 'Ngozi Obi', status: 'open' },
    ],
    activity: [],
    followUps: [],
  },
];

const HR_BOARD_KEY = 'hr_pm_board_tasks_v2';

@Component({
  selector: 'app-productivity-workspace',
  templateUrl: './productivity-workspace.component.html',
  styleUrls: ['./productivity-workspace.component.scss'],
})
export class ProductivityWorkspaceComponent implements OnInit, OnDestroy {
  private readonly subscription = new Subscription();

  // ── Navigation ─────────────────────────────────────────────────────────────
  pmSection: PMSection = 'board';
  boardView: BoardView = 'board';
  readonly stars = [1, 2, 3, 4, 5];

  get pageTitle(): string {
    const map: Record<PMSection, string> = {
      board: 'Task Board', reports: 'Reports & Analytics',
      batch: 'Batch Import', assessment: 'Self-Assessment',
      supervisor: 'Supervisor Review', review: 'Performance Review',
    };
    return map[this.pmSection];
  }

  // ── Performance Review tab state ──────────────────────────────────────────
  reviewSubTab: 'mine' | 'team' | 'sessions' = 'mine';
  reviewPeriod: 'week' | 'month' = 'month';
  reviewAnchorDate: Date = new Date();
  reviewEmployee = '';
  reviewDiscussion = '';
  reviewAgreedActions = '';
  reviewSupRating = 0;
  reviewSessions: ReviewSession[] = [];
  reviewSessionSaved = false;

  setPmSection(s: PMSection): void {
    this.pmSection = s;
  }

  loadReports(): void {
    this.reportsLoading = true;
    this.reportsError = false;
    const safe = <T>(obs: import('rxjs').Observable<T>) => obs.pipe(catchError(() => of(null as T | null)));
    this.subscription.add(
      forkJoin({
        exec:      safe(this.reportingService.getExecutiveReport()),
        workforce: safe(this.reportingService.getWorkforceOverview()),
        payroll:   safe(this.reportingService.getPayrollSummary()),
        leave:     safe(this.reportingService.getLeaveAttendance()),
        turnover:  safe(this.reportingService.getEmployeeTurnover()),
        risk:      safe(this.reportingService.getHrRisk()),
        probation: safe(this.reportingService.getProbationTracking()),
        equity:    safe(this.reportingService.getCompensationEquity()),
        bonus:     safe(this.reportingService.getBonusReport()),
        statutory: safe(this.reportingService.getStatutoryRemittance()),
        overtime:  safe(this.reportingService.getOvertimeCost()),
        vacancy:   safe(this.reportingService.getVacancyAging()),
      }).subscribe({
        next: (data) => {
          this.execReport      = data.exec;
          this.workforceReport = data.workforce;
          this.payrollReport   = data.payroll;
          this.leaveReport     = data.leave;
          this.turnoverReport  = data.turnover;
          this.riskReport      = data.risk;
          this.probationReport = data.probation;
          this.equityReport    = data.equity;
          this.bonusReport     = data.bonus;
          this.statutoryReport = data.statutory;
          this.overtimeReport  = data.overtime;
          this.vacancyReport   = data.vacancy;
          this.reportsLoading  = false;
          // Only surface the error banner when every single report failed
          this.reportsError = Object.values(data).every(v => v === null);
        },
        error: () => {
          this.reportsError   = true;
          this.reportsLoading = false;
        }
      })
    );
  }

  // ── Board ──────────────────────────────────────────────────────────────────
  boardTasks: BoardTask[] = [];
  filterStatus = '';
  filterPriority = '';
  filterAssignee = '';
  searchText = '';
  selectedTask: BoardTask | null = null;
  detailPanelVisible = false;
  detailTab: 'overview' | 'subtasks' | 'activity' | 'analytics' = 'overview';
  newActivityText = '';
  subtaskInput = '';
  showAddTask = false;
  taskSubmitAttempted = false;

  get newTaskDescriptionEmpty(): boolean {
    return !(this.newTask.description || '').replace(/<[^>]*>/g, '').trim();
  }
  newTask: Partial<BoardTask> = {};
  newTaskSubtasks: Array<{
    title: string;
    assignee: string;
    status: 'open' | 'ip' | 'blocked';
    startDate: string;
    dueDate: string;
    dependency: string;
  }> = [];

  // Edit-task modal
  showEditTask = false;
  editingTask: BoardTask | null = null;
  editTaskDraft: Partial<BoardTask> = {};
  ganttDays: string[] = [];
  ganttStart!: Date;

  // Quill toolbar config for the rich description editor
  readonly editorModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ header: [2, 3, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['link'],
      ['blockquote', 'code-block'],
      [{ table: true }],
      ['clean'],
    ],
  };

  private static readonly STAGE_STORAGE_KEY   = 'hr_pm_stages_v1';
  private static readonly ARCHIVE_STORAGE_KEY  = 'hr_pm_archived_v1';
  private static readonly DEFAULT_STAGES: Array<{ key: string; label: string }> = [
    { key: 'To Do',       label: 'To Do' },
    { key: 'In Progress', label: 'In Progress' },
    { key: 'In Review',   label: 'In Review' },
    { key: 'Done',        label: 'Done' },
  ];

  columns: Array<{ key: TaskStatus; label: string }> = this.loadStages();
  get statuses(): TaskStatus[] { return this.columns.map(c => c.key); }
  readonly priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

  // ── Stage management ──────────────────────────────────────────────────────
  showAddStage = false;
  newStageName = '';

  get customStages(): Array<{ key: TaskStatus; label: string }> {
    return this.columns.filter(c => !this.isDefaultStage(c.key));
  }

  // ── Right rail (Archive & Stages) ─────────────────────────────────────────
  rightRailOpen = false;
  archivedTasks: BoardTask[] = [];
  archiveSearchText = '';

  get filteredArchivedTasks(): BoardTask[] {
    const q = this.archiveSearchText.trim().toLowerCase();
    if (!q) return this.archivedTasks;
    return this.archivedTasks.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.assignee || '').toLowerCase().includes(q) ||
      (t.team || '').toLowerCase().includes(q) ||
      (t.status || '').toLowerCase().includes(q) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(q))
    );
  }

  /** Statuses that appear only in forms (not board columns) */
  readonly extraStatuses: TaskStatus[] = ['Closed'];

  private sanitizeTask(t: any): BoardTask {
    // Array fields — accessed with .length and *ngFor throughout the template
    t.subtasks  = Array.isArray(t.subtasks)  ? t.subtasks  : [];
    t.activity  = Array.isArray(t.activity)  ? t.activity  : [];
    t.tags      = Array.isArray(t.tags)      ? t.tags      : [];
    t.followUps = Array.isArray(t.followUps) ? t.followUps : [];
    // String fields — accessed with .toLowerCase() in filteredBoard getter
    t.title     = t.title    ?? '';
    t.assignee  = t.assignee ?? '';
    t.team      = t.team     ?? '';
    t.status    = t.status   ?? 'To Do';
    t.priority  = t.priority ?? 'Medium';
    t.id        = t.id       ?? String(Date.now());
    return t as BoardTask;
  }

  private parseTasks(raw: string | null): BoardTask[] {
    try { return raw ? (JSON.parse(raw) as any[]).map(t => this.sanitizeTask(t)) : []; }
    catch { return []; }
  }

  private loadArchivedTasks(): void {
    this.archivedTasks = this.parseTasks(
      localStorage.getItem(ProductivityWorkspaceComponent.ARCHIVE_STORAGE_KEY)
    );
  }

  private saveArchivedTasks(): void {
    localStorage.setItem(ProductivityWorkspaceComponent.ARCHIVE_STORAGE_KEY, JSON.stringify(this.archivedTasks));
  }

  // ── Close-task modal state ────────────────────────────────────────────────
  showCloseTaskModal = false;
  closeTaskRef: BoardTask | null = null;
  closeTaskReason = '';

  closeTask(task: BoardTask, e: Event): void {
    e.stopPropagation();
    this.closeTaskRef = task;
    this.closeTaskReason = '';
    this.showCloseTaskModal = true;
  }

  confirmCloseTask(): void {
    const task = this.closeTaskRef;
    if (!task) return;
    task.closed = true;
    task.status = 'Closed' as any;
    task.closedReason = this.closeTaskReason.trim() || undefined;
    this.showCloseTaskModal = false;
    this.closeTaskRef = null;
    this.archiveTask(task);
    this.showToast('Task closed and moved to archive', 'info');
  }

  cancelCloseTask(): void {
    this.showCloseTaskModal = false;
    this.closeTaskRef = null;
  }

  archiveTask(task: BoardTask, event?: MouseEvent): void {
    event?.stopPropagation();
    this.boardTasks = this.boardTasks.filter(t => t.id !== task.id);
    this.archivedTasks = [{ ...task }, ...this.archivedTasks];
    this.saveArchivedTasks();
    this.save();
    if (this.selectedTask?.id === task.id) this.closeDetail();

    if (!this.apiEnabled) return;

    const persist = (apiId: number) => {
      const status = task.closed ? 'CLOSED' : 'ARCHIVED';
      this.workTaskApi.updateTaskStatus(apiId, status as any, task.closedReason).subscribe({ error: () => {} });
    };

    if (task.apiId) {
      persist(task.apiId);
    } else {
      // Task never synced — create it first so it gets a DB record, then mark it archived/closed
      const userId = this.currentUserId;
      const dto: WorkTaskDTO = {
        title: task.title,
        description: task.description,
        assigneeEmployeeId: task.assigneeEmployeeId,
        supervisorEmployeeId: task.supervisorEmployeeId,
        status: task.closed ? 'CLOSED' : 'ARCHIVED',
        priority: this.toApiPriority(task.priority),
        startDate: task.startDate || undefined,
        dueDate: task.dueDate || undefined,
        weight: task.weight,
        progress: task.progress,
        tags: task.tags?.join(','),
        createdByUserId: task.createdByUserId || (userId || undefined),
        closedReason: task.closedReason,
      };
      this.subscription.add(
        this.workTaskApi.createTask(dto).subscribe({
          next: (created) => {
            task.apiId = created.id;
            this.saveArchivedTasks();
          },
          error: () => {},
        })
      );
    }
  }

  unarchiveTask(task: BoardTask): void {
    this.archivedTasks = this.archivedTasks.filter(t => t.id !== task.id);
    const restored = { ...task, closed: false };
    this.boardTasks = [restored, ...this.boardTasks];
    this.saveArchivedTasks();
    this.save();
    if (this.apiEnabled && task.apiId) {
      this.workTaskApi.updateTaskStatus(task.apiId, 'TO_DO').subscribe({ error: () => {} });
    }
  }

  private loadStages(): Array<{ key: string; label: string }> {
    try {
      const raw = localStorage.getItem(ProductivityWorkspaceComponent.STAGE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{ key: string; label: string }>;
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return [...ProductivityWorkspaceComponent.DEFAULT_STAGES];
  }

  private saveStages(): void {
    localStorage.setItem(ProductivityWorkspaceComponent.STAGE_STORAGE_KEY, JSON.stringify(this.columns));
  }

  addStage(): void {
    const name = this.newStageName.trim();
    if (!name || this.columns.some(c => c.key.toLowerCase() === name.toLowerCase())) return;
    this.columns = [...this.columns, { key: name, label: name }];
    this.saveStages();
    this.newStageName = '';
    this.showAddStage = false;
  }

  removeStage(key: string): void {
    const defaultKeys = ProductivityWorkspaceComponent.DEFAULT_STAGES.map(s => s.key);
    if (defaultKeys.includes(key)) return; // cannot remove core stages
    this.columns = this.columns.filter(c => c.key !== key);
    this.saveStages();
  }

  isDefaultStage(key: string): boolean {
    return ProductivityWorkspaceComponent.DEFAULT_STAGES.some(s => s.key === key);
  }

  dropColumn(event: CdkDragDrop<any[]>): void {
    moveItemInArray(this.columns, event.previousIndex, event.currentIndex);
    this.columns = [...this.columns];
    this.saveStages();
  }

  // ── Role-based visibility ─────────────────────────────────────────────────
  get isAdminOrSupervisor(): boolean {
    const role = (sessionStorage.getItem('role') || localStorage.getItem('role') || '').toUpperCase();
    return role.includes('ADMIN') || role.includes('SUPERVISOR') || role.includes('MANAGER');
  }

  get currentUserDisplayName(): string {
    return sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || '';
  }

  get currentUserFullName(): string {
    return this.currentUserDisplayName.toLowerCase();
  }

  // ── Performance Review ────────────────────────────────────────────────────

  get reviewPeriodBounds(): { start: Date; end: Date; label: string } {
    const d = new Date(this.reviewAnchorDate);
    if (this.reviewPeriod === 'month') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const label = start.toLocaleString('default', { month: 'long', year: 'numeric' });
      return { start, end, label };
    }
    // ISO week: Monday → Sunday
    const dow = d.getDay(); // 0=Sun
    const toMon = dow === 0 ? -6 : 1 - dow;
    const start = new Date(d); start.setDate(d.getDate() + toMon); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
    const fmt = (dt: Date) => dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return { start, end, label: `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}` };
  }

  reviewPrev(): void {
    const d = new Date(this.reviewAnchorDate);
    if (this.reviewPeriod === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    this.reviewAnchorDate = new Date(d);
  }

  reviewNext(): void {
    const d = new Date(this.reviewAnchorDate);
    if (this.reviewPeriod === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    this.reviewAnchorDate = new Date(d);
  }

  private tasksInPeriod(tasks: BoardTask[], start: Date, end: Date): BoardTask[] {
    return tasks.filter(t => {
      const d = t.dueDate ? new Date(t.dueDate) : null;
      return d && !isNaN(d.getTime()) && d >= start && d <= end;
    });
  }

  private calcPeriodMetrics(tasks: BoardTask[]): {
    completedCount: number; overdueCount: number; activeCount: number;
    completionRate: number; onTimeRate: number; score: number; grade: string; gradeClass: string;
  } {
    const total = tasks.length;
    if (!total) return { completedCount: 0, overdueCount: 0, activeCount: 0, completionRate: 0, onTimeRate: 100, score: 0, grade: '—', gradeClass: '--bad' };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const done = tasks.filter(t => t.status === 'Done' || t.closed).length;
    const overdue = tasks.filter(t => t.status !== 'Done' && !t.closed && t.dueDate && new Date(t.dueDate) < today).length;
    const active = total - done - overdue;
    const completionRate = Math.round((done / total) * 100);
    const overdueRate = Math.round((overdue / total) * 100);
    const onTimeRate = 100 - overdueRate;
    const score = Math.round(completionRate * 0.6 + onTimeRate * 0.4);
    let grade = 'Poor'; let gradeClass = '--bad';
    if (score >= 80) { grade = 'Excellent'; gradeClass = '--excellent'; }
    else if (score >= 60) { grade = 'Good'; gradeClass = '--good'; }
    else if (score >= 40) { grade = 'Fair'; gradeClass = '--fair'; }
    return { completedCount: done, overdueCount: overdue, activeCount: active, completionRate, onTimeRate, score, grade, gradeClass };
  }

  get myReviewTasks(): BoardTask[] {
    const name = this.currentUserFullName;
    const my = [...this.boardTasks, ...this.archivedTasks].filter(t =>
      (t.assignee || '').toLowerCase() === name ||
      (t.assignees || []).some(a => (a || '').toLowerCase() === name)
    );
    const { start, end } = this.reviewPeriodBounds;
    return this.tasksInPeriod(my, start, end);
  }

  get myReviewMetrics() { return this.calcPeriodMetrics(this.myReviewTasks); }

  get teamReviewTasks(): BoardTask[] {
    if (!this.reviewEmployee) return [];
    const emp = this.reviewEmployee.toLowerCase();
    const tasks = [...this.boardTasks, ...this.archivedTasks].filter(t =>
      (t.assignee || '').toLowerCase() === emp ||
      (t.assignees || []).some(a => (a || '').toLowerCase() === emp)
    );
    const { start, end } = this.reviewPeriodBounds;
    return this.tasksInPeriod(tasks, start, end);
  }

  get teamReviewMetrics() { return this.calcPeriodMetrics(this.teamReviewTasks); }

  get reviewTeamMemberNames(): string[] {
    const role = (sessionStorage.getItem('role') || localStorage.getItem('role') || '').toUpperCase();
    if (!this.isAdminOrSupervisor) return [];
    if (role.includes('ADMIN')) return this.allEmployees.map(e => e.fullName).sort();
    const myName = this.currentUserFullName;
    return this.allEmployees
      .filter(e => (e.supervisor || '').toLowerCase() === myName)
      .map(e => e.fullName).sort();
  }

  get filteredReviewSessions(): ReviewSession[] {
    const role = (sessionStorage.getItem('role') || localStorage.getItem('role') || '').toUpperCase();
    if (role.includes('ADMIN')) return this.reviewSessions;
    const myName = this.currentUserDisplayName;
    return this.reviewSessions.filter(s => s.supervisorName === myName);
  }

  recordSession(): void {
    const m = this.teamReviewMetrics;
    const session: ReviewSession = {
      id: Date.now().toString(),
      supervisorName: this.currentUserDisplayName,
      employeeName: this.reviewEmployee,
      period: this.reviewPeriod,
      periodLabel: this.reviewPeriodBounds.label,
      periodStart: this.reviewPeriodBounds.start.toISOString(),
      periodEnd: this.reviewPeriodBounds.end.toISOString(),
      tasksCount: this.teamReviewTasks.length,
      completedCount: m.completedCount,
      overdueCount: m.overdueCount,
      score: m.score,
      grade: m.grade,
      discussionSummary: this.reviewDiscussion,
      agreedActions: this.reviewAgreedActions,
      supervisorRating: this.reviewSupRating,
      recordedAt: new Date().toISOString(),
    };
    this.reviewSessions = [session, ...this.reviewSessions];
    try { localStorage.setItem('hr_pm_review_sessions_v1', JSON.stringify(this.reviewSessions)); } catch { /* quota */ }
    this.reviewSessionSaved = true;
    this.reviewDiscussion = '';
    this.reviewAgreedActions = '';
    this.reviewSupRating = 0;
    setTimeout(() => { this.reviewSessionSaved = false; }, 4000);
  }

  deleteSession(id: string): void {
    this.reviewSessions = this.reviewSessions.filter(s => s.id !== id);
    try { localStorage.setItem('hr_pm_review_sessions_v1', JSON.stringify(this.reviewSessions)); } catch { /* quota */ }
  }

  private loadReviewSessions(): void {
    try {
      const raw = localStorage.getItem('hr_pm_review_sessions_v1');
      this.reviewSessions = raw ? JSON.parse(raw) : [];
    } catch { this.reviewSessions = []; }
  }

  // ── Subtask inline edit ───────────────────────────────────────────────────
  editingSubtaskId: string | null = null;
  editingSubtaskTitle = '';
  editingSubtaskDescription = '';

  get boardMetrics(): { label: string; value: string | number; sub: string; color: string }[] {
    const active = this.boardTasks.filter(t => t.status !== 'Done').length;
    const subs = this.boardTasks.reduce((s, t) => s + (t.subtasks?.length ?? 0), 0);
    const done = this.boardTasks.filter(t => t.status === 'Done').length;
    const pct = this.boardTasks.length ? Math.round((done / this.boardTasks.length) * 100) : 0;
    const review = this.boardTasks.filter(t => t.status === 'In Review').length;
    return [
      { label: 'Active Tasks', value: active, sub: 'in progress or queued', color: '#2563eb' },
      { label: 'Sub-tasks Tracked', value: subs, sub: `across ${this.boardTasks.length} tasks`, color: '#374151' },
      { label: 'Completion Rate', value: `${pct}%`, sub: 'tasks marked done', color: '#16a34a' },
      { label: 'Supervisor Queue', value: review, sub: 'awaiting review', color: '#7c3aed' },
    ];
  }

  // ── Performance chart filters ───────────────────────────────────────────────
  chartFilterAssignee = '';
  chartFilterSupervisor = '';
  chartFilterPriority = '';
  chartFilterTag = '';
  engagementSortCol: 'lastActivity' | 'followUps' | 'replies' | 'reactions' = 'lastActivity';
  engagementSortDir: 'asc' | 'desc' = 'desc';

  resetChartFilters(): void {
    this.chartFilterAssignee = '';
    this.chartFilterSupervisor = '';
    this.chartFilterPriority = '';
    this.chartFilterTag = '';
  }

  private get allTasksForCharts(): BoardTask[] {
    return [...this.boardTasks, ...this.archivedTasks];
  }

  get chartFilteredTasks(): BoardTask[] {
    return this.allTasksForCharts.filter(t => {
      if (this.chartFilterAssignee && t.assignee !== this.chartFilterAssignee) return false;
      if (this.chartFilterSupervisor && t.team !== this.chartFilterSupervisor) return false;
      if (this.chartFilterPriority && t.priority !== this.chartFilterPriority) return false;
      if (this.chartFilterTag && !(t.tags ?? []).includes(this.chartFilterTag)) return false;
      return true;
    });
  }

  get chartAllAssignees(): string[] {
    return [...new Set(this.allTasksForCharts.map(t => t.assignee).filter(Boolean))].sort();
  }

  get chartAllSupervisors(): string[] {
    return [...new Set(this.allTasksForCharts.map(t => t.team).filter(Boolean))].sort();
  }

  get chartAllTags(): string[] {
    const tags = new Set<string>();
    this.allTasksForCharts.forEach(t => (t.tags ?? []).forEach(tag => tags.add(tag)));
    return [...tags].sort();
  }

  get taskCompletionStats(): Array<{ status: string; count: number; pct: number; color: string }> {
    const tasks = this.chartFilteredTasks;
    const total = tasks.length;
    if (!total) return [];
    const statusColors: Record<string, string> = {
      'Done': '#16a34a', 'In Progress': '#2563eb', 'In Review': '#7c3aed',
      'To Do': '#6b7280', 'Closed': '#374151', 'Archived': '#9ca3af',
    };
    const counts = new Map<string, number>();
    tasks.forEach(t => {
      const s = t.closed ? 'Closed' : (t.status || 'To Do');
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    // Add overdue as separate virtual bucket
    const overdue = tasks.filter(t => this.isTaskOverdue(t) && t.status !== 'Done' && !t.closed).length;
    const result = [...counts.entries()]
      .map(([status, count]) => ({
        status, count,
        pct: Math.round((count / total) * 100),
        color: statusColors[status] ?? '#9ca3af',
      }))
      .sort((a, b) => b.count - a.count);
    if (overdue > 0) {
      result.push({ status: 'Overdue', count: overdue, pct: Math.round((overdue / total) * 100), color: '#dc2626' });
    }
    return result;
  }

  get taskEngagementRows(): Array<{
    task: BoardTask; followUps: number; replies: number; reactions: number;
    lastActivity: string; lastActivityRaw: string;
  }> {
    const rows = this.chartFilteredTasks.map(task => {
      const fus = task.followUps ?? [];
      const replies = fus.reduce((n, f) => n + (f.replies?.length ?? 0), 0);
      const reactions = fus.reduce((n, f) => {
        return n + Object.values(f.reactions ?? {}).reduce((s, arr) => s + arr.length, 0);
      }, 0);
      const lastFu = fus.filter(f => f.timestamp).sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      const lastActivityRaw = lastFu?.timestamp ?? '';
      const lastActivity = lastFu ? this.formatTs(lastActivityRaw) : '—';
      return { task, followUps: fus.length, replies, reactions, lastActivity, lastActivityRaw };
    });
    const dir = this.engagementSortDir === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      if (this.engagementSortCol === 'lastActivity') return dir * a.lastActivityRaw.localeCompare(b.lastActivityRaw);
      if (this.engagementSortCol === 'followUps')    return dir * (a.followUps - b.followUps);
      if (this.engagementSortCol === 'replies')      return dir * (a.replies - b.replies);
      if (this.engagementSortCol === 'reactions')    return dir * (a.reactions - b.reactions);
      return 0;
    });
  }

  sortEngagement(col: 'lastActivity' | 'followUps' | 'replies' | 'reactions'): void {
    if (this.engagementSortCol === col) {
      this.engagementSortDir = this.engagementSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.engagementSortCol = col;
      this.engagementSortDir = 'desc';
    }
  }

  get supervisorFeedbackRows(): Array<{
    supervisor: string;
    approved: number; changes: number; rejected: number; other: number;
    approvedPct: number; changesPct: number; rejectedPct: number; otherPct: number;
  }> {
    const map = new Map<string, { approved: number; changes: number; rejected: number; other: number }>();
    this.chartFilteredTasks.forEach(task => {
      const sup = task.team || 'Unassigned';
      if (!map.has(sup)) map.set(sup, { approved: 0, changes: 0, rejected: 0, other: 0 });
      const entry = map.get(sup)!;
      (task.followUps ?? []).forEach(fu => {
        if (!fu.decision) return;
        const d = (fu.decision || '').toLowerCase();
        if (d === 'approved' || d === 'approve') entry.approved++;
        else if (d.includes('change') || d.includes('revision')) entry.changes++;
        else if (d === 'rejected' || d === 'reject') entry.rejected++;
        else entry.other++;
      });
    });
    return [...map.entries()]
      .map(([supervisor, counts]) => {
        const total = counts.approved + counts.changes + counts.rejected + counts.other;
        if (total === 0) return null;
        const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;
        return {
          supervisor,
          ...counts,
          approvedPct: pct(counts.approved),
          changesPct: pct(counts.changes),
          rejectedPct: pct(counts.rejected),
          otherPct: pct(counts.other),
        };
      })
      .filter(Boolean) as any[];
  }

  get dueDateBuckets(): Array<{ label: string; count: number; pct: number; color: string }> {
    const tasks = this.chartFilteredTasks.filter(t => t.dueDate && t.status !== 'Done' && !t.closed);
    const total = tasks.length || 1;
    const now = Date.now();
    const day = 86400000;
    const buckets = [
      { label: 'Overdue', color: '#dc2626', test: (d: number) => d < now },
      { label: 'Due Today', color: '#f97316', test: (d: number) => d >= now && d < now + day },
      { label: 'Due This Week', color: '#d97706', test: (d: number) => d >= now + day && d < now + 7 * day },
      { label: 'Due Next Week', color: '#2563eb', test: (d: number) => d >= now + 7 * day && d < now + 14 * day },
      { label: 'Due Later', color: '#6b7280', test: (d: number) => d >= now + 14 * day },
    ];
    return buckets.map(b => {
      const count = tasks.filter(t => b.test(new Date(t.dueDate).getTime())).length;
      return { label: b.label, count, pct: Math.round((count / total) * 100), color: b.color };
    }).filter(b => b.count > 0);
  }

  drillToTask(task: BoardTask): void {
    this.openDetail(task);
  }

  // ── Assignment & Distribution report getters ───────────────────────────────

  get assigneeDistribution(): Array<{
    name: string; total: number;
    done: number; active: number; overdue: number;
    donePct: number; activePct: number; overduePct: number;
  }> {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const map = new Map<string, { done: number; active: number; overdue: number }>();
    this.chartFilteredTasks.forEach(t => {
      const name = t.assignee || 'Unassigned';
      if (!map.has(name)) map.set(name, { done: 0, active: 0, overdue: 0 });
      const row = map.get(name)!;
      if (t.status === 'Done' || t.closed) {
        row.done++;
      } else {
        const due = t.dueDate ? new Date(t.dueDate) : null;
        if (due && due < today) row.overdue++;
        else row.active++;
      }
    });
    return [...map.entries()]
      .map(([name, r]) => {
        const total = r.done + r.active + r.overdue;
        return {
          name, total,
          done: r.done, active: r.active, overdue: r.overdue,
          donePct: total ? Math.round((r.done / total) * 100) : 0,
          activePct: total ? Math.round((r.active / total) * 100) : 0,
          overduePct: total ? Math.round((r.overdue / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  get tasksByMonth(): Array<{ label: string; count: number; pct: number }> {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const map = new Map<string, number>();
    this.chartFilteredTasks
      .filter(t => t.dueDate && !t.closed)
      .forEach(t => {
        const d = new Date(t.dueDate);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
        map.set(key, (map.get(key) || 0) + 1);
      });
    const max = Math.max(...[...map.values()], 1);
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => {
        const [yr, mo] = key.split('-');
        return { label: `${MONTHS[+mo]} ${yr}`, count, pct: Math.round((count / max) * 100) };
      });
  }

  get tasksByDayOfWeek(): Array<{ label: string; count: number; pct: number }> {
    const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const counts = [0,0,0,0,0,0,0];
    this.chartFilteredTasks
      .filter(t => t.dueDate && !t.closed)
      .forEach(t => {
        const d = new Date(t.dueDate);
        if (!isNaN(d.getTime())) counts[d.getDay()]++;
      });
    const max = Math.max(...counts, 1);
    return DAYS.map((label, i) => ({
      label, count: counts[i], pct: Math.round((counts[i] / max) * 100)
    })).filter(d => d.count > 0);
  }

  get assigneeEffectiveness(): Array<{
    name: string; total: number; done: number; overdue: number;
    completionPct: number; onTimePct: number; score: number; grade: string; gradeClass: string;
  }> {
    return this.assigneeDistribution.map(r => {
      const completionPct = r.donePct;
      const onTimePct = 100 - r.overduePct;
      const score = Math.round(completionPct * 0.6 + onTimePct * 0.4);
      let grade = 'Poor'; let gradeClass = '--bad';
      if (score >= 80) { grade = 'Excellent'; gradeClass = '--excellent'; }
      else if (score >= 60) { grade = 'Good'; gradeClass = '--good'; }
      else if (score >= 40) { grade = 'Fair'; gradeClass = '--fair'; }
      return { name: r.name, total: r.total, done: r.done, overdue: r.overdue, completionPct, onTimePct, score, grade, gradeClass };
    }).sort((a, b) => b.score - a.score);
  }

  // ── Assignee performance analytics ────────────────────────────────────────
  getAssigneePerformance(assigneeName: string): {
    grade: 'Excellent' | 'Good' | 'Fair' | 'Bad';
    gradeColor: string;
    score: number;
    completionRate: number;
    timelinessRate: number;
    progressMomentum: number;
    engagementRate: number;
    totalTasks: number;
    doneTasks: number;
    overdueTasks: number;
    closedTasks: number;
    avgFollowUps: number;
  } {
    const all = [...this.boardTasks, ...this.archivedTasks].filter(t => t.assignee === assigneeName);
    const total = all.length;
    const EMPTY = { grade: 'Fair' as const, gradeColor: '#d97706', score: 0, completionRate: 0, timelinessRate: 0, progressMomentum: 0, engagementRate: 0, totalTasks: 0, doneTasks: 0, overdueTasks: 0, closedTasks: 0, avgFollowUps: 0 };
    if (!total) return EMPTY;

    const done = all.filter(t => t.status === 'Done').length;
    const closed = all.filter(t => t.closed || t.status === 'CLOSED' as any).length;
    const overdue = all.filter(t => this.isTaskOverdue(t) && t.status !== 'Done' && !t.closed).length;

    const completionRate = Math.round(((done + closed) / total) * 100);

    // Timeliness: done tasks that are NOT overdue (i.e. due date hasn't passed) ≈ submitted on time
    const doneOnTime = all.filter(t => t.status === 'Done' && !this.isTaskOverdueFn(t, t.dueDate)).length;
    const timelinessRate = done > 0 ? Math.round((doneOnTime / done) * 100) : completionRate;

    const avgProgress = Math.round(all.reduce((s, t) => s + (t.progress || 0), 0) / total);
    const progressMomentum = avgProgress;

    const totalFu = all.reduce((s, t) => s + (t.followUps?.length || 0), 0);
    const avgFuNum = totalFu / total;
    const engagementRate = Math.min(100, Math.round((avgFuNum / 4) * 100));

    const overdueRate = Math.round((overdue / total) * 100);

    const score = Math.min(100, Math.round(
      completionRate * 0.35 +
      timelinessRate * 0.30 +
      progressMomentum * 0.15 +
      Math.max(0, 100 - overdueRate * 2) * 0.20
    ));

    const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Bad';
    const gradeColor = score >= 80 ? '#16a34a' : score >= 60 ? '#2563eb' : score >= 40 ? '#d97706' : '#dc2626';

    return { grade, gradeColor, score, completionRate, timelinessRate, progressMomentum, engagementRate, totalTasks: total, doneTasks: done, overdueTasks: overdue, closedTasks: closed, avgFollowUps: parseFloat(avgFuNum.toFixed(1)) };
  }

  private isTaskOverdueFn(task: BoardTask, dueDateStr: string): boolean {
    if (!dueDateStr) return false;
    return new Date(dueDateStr).getTime() < Date.now();
  }

  getTeamPerformance(supervisorName: string): Array<{
    assignee: string;
    score: number;
    grade: 'Excellent' | 'Good' | 'Fair' | 'Bad';
    gradeColor: string;
    completionRate: number;
    totalTasks: number;
  }> {
    const all = [...this.boardTasks, ...this.archivedTasks].filter(t => t.team === supervisorName);
    const assignees = [...new Set(all.map(t => t.assignee).filter(Boolean))];
    return assignees
      .map(a => {
        const p = this.getAssigneePerformance(a);
        return { assignee: a, score: p.score, grade: p.grade, gradeColor: p.gradeColor, completionRate: p.completionRate, totalTasks: p.totalTasks };
      })
      .sort((a, b) => b.score - a.score);
  }

  ringDashOffset(score: number): number {
    // SVG circle r=40, circumference ≈ 251.2
    return Math.round((100 - score) * 2.512);
  }

  // ── Assessment ─────────────────────────────────────────────────────────────
  assessSubmitted = false;

  assessmentGoals: AssessmentGoal[] = [
    {
      id: 'g1', title: 'Q2 NPL Report Submission', weight: 20, dueDate: 'Jun 10', isOverdue: false,
      description: 'Submit the Q2 NPL exposure report to CBN by June 10, using FPR 2024 classification criteria. Report must include impairment schedules for all Lagos branches.',
      kpis: [
        { id: 'k1', text: 'Data extraction from core banking completed', done: true },
        { id: 'k2', text: 'NPL classification model run with FPR 2024 criteria', done: true },
        { id: 'k3', text: 'Impairment schedules drafted and reviewed', done: true },
        { id: 'k4', text: 'Final report submitted to CBN portal', done: false },
      ],
      selfRating: 4,
      rationale: 'Data extraction and NPL model completed ahead of schedule. Re-ran model per CBN FPR 2024 after supervisor feedback. Final submission pending CFO sign-off — outside my direct control.',
      open: true,
    },
    {
      id: 'g2', title: 'Compliance Audit Preparation Pack', weight: 25, dueDate: 'May 28', isOverdue: false,
      description: 'Compile and submit the full compliance audit preparation pack to the Audit Committee by May 28.',
      kpis: [
        { id: 'k5', text: 'Policy checklist completed (all 12 categories)', done: true },
        { id: 'k6', text: 'Evidence collation fully documented', done: true },
        { id: 'k7', text: 'Submitted and acknowledged by Audit Committee', done: true },
      ],
      selfRating: 5,
      rationale: 'Completed 2 days ahead of deadline. Audit Committee acknowledged receipt and noted completeness. All 12 evidence categories fully documented with no gaps.',
      open: false,
    },
    {
      id: 'g3', title: 'Credit Risk Analysis — Retail Portfolio', weight: 20, dueDate: 'May 26', isOverdue: true,
      description: 'Assess and report on NPL exposure across Lagos retail branches for Q2 regulatory submission.',
      kpis: [
        { id: 'k8', text: 'Branch data extraction from core banking', done: true },
        { id: 'k9', text: 'NPL classification model run (revision pending)', done: false },
        { id: 'k10', text: 'Regulatory report submitted', done: false },
      ],
      selfRating: 3,
      rationale: 'Data pull complete. NPL classification re-run per supervisor feedback (CBN FPR 2024). Delay due to initial model criteria mismatch — not a performance issue. Submission will be completed by Jun 3.',
      open: false,
    },
    {
      id: 'g4', title: 'Team Training Coordination — L&D Q2', weight: 20, dueDate: 'Jun 30', isOverdue: false,
      description: 'Coordinate and ensure completion of 3 mandatory training sessions for the team by Jun 30.',
      kpis: [
        { id: 'k11', text: 'Training calendar published and circulated', done: true },
        { id: 'k12', text: 'Session 1 — Regulatory Updates (Jun 8)', done: false },
        { id: 'k13', text: 'Session 2 — AML Refresher (Jun 15)', done: false },
        { id: 'k14', text: 'Session 3 — Risk Framework (Jun 22)', done: false },
      ],
      selfRating: 0, rationale: '', open: false,
    },
    {
      id: 'g5', title: 'IFRS 9 Filing Support — Group Task', weight: 15, dueDate: 'Jun 15', isOverdue: false,
      description: 'Support the IFRS 9 filing team in data validation and disclosure note review. Deliverable: signed-off impairment disclosure note by Jun 15.',
      kpis: [
        { id: 'k15', text: 'Data validation phase — joined team and contributed', done: true },
        { id: 'k16', text: 'Impairment model cross-check complete', done: false },
        { id: 'k17', text: 'Disclosure note review and sign-off', done: false },
      ],
      selfRating: 0, rationale: '', open: false,
    },
  ];

  get ratedGoalCount(): number { return this.assessmentGoals.filter(g => g.selfRating > 0).length; }

  get avgSelfRating(): string {
    const rated = this.assessmentGoals.filter(g => g.selfRating > 0);
    if (!rated.length) return '—';
    return (rated.reduce((s, g) => s + g.selfRating, 0) / rated.length).toFixed(1);
  }

  toggleGoal(id: string): void {
    const g = this.assessmentGoals.find(g => g.id === id);
    if (g) g.open = !g.open;
  }

  setGoalRating(goalId: string, n: number): void {
    const g = this.assessmentGoals.find(g => g.id === goalId);
    if (g) g.selfRating = n;
  }

  toggleKpi(goalId: string, kpiId: string): void {
    const g = this.assessmentGoals.find(g => g.id === goalId);
    const k = g?.kpis.find(k => k.id === kpiId);
    if (k) k.done = !k.done;
  }

  submitAssessment(): void { this.assessSubmitted = true; }

  goalAvatarColor(goal: AssessmentGoal): string {
    if (goal.selfRating >= 4) return '#2EB270';
    if (goal.selfRating === 3 || goal.isOverdue) return '#d97706';
    if (goal.selfRating > 0) return '#2563eb';
    return '#9ca3af';
  }

  goalRatingLabel(goal: AssessmentGoal): string {
    if (!goal.selfRating) return 'Click to rate — goal still in progress';
    const map: Record<number, string> = {
      5: '5/5 — Exceeded Target', 4: '4/5 — Substantially Met Target',
      3: '3/5 — Partially Met Target', 2: '2/5 — Below Target', 1: '1/5 — Did Not Meet Target',
    };
    return map[goal.selfRating] ?? '';
  }

  goalRatingBadgeClass(goal: AssessmentGoal): string {
    if (goal.selfRating >= 4) return 'b-green';
    if (goal.selfRating === 3) return 'b-yellow';
    if (goal.selfRating > 0) return 'b-blue';
    return 'b-gray';
  }

  // ── Task view mode (My Tasks / All Tasks / Team Tasks) ─────────────────────
  taskViewMode: 'mine' | 'all' | 'team' = 'mine';
  viewDropOpen = false;

  // ── Group-by ──────────────────────────────────────────────────────────────
  groupBy: 'none' | 'assignee' | 'team' | 'status' | 'priority' = 'none';

  get groupedBoard(): Array<{ key: string; tasks: BoardTask[] }> {
    if (this.groupBy === 'none') return [{ key: '', tasks: this.filteredBoard }];
    const map = new Map<string, BoardTask[]>();
    for (const t of this.filteredBoard) {
      let key = '';
      if (this.groupBy === 'assignee') key = t.assignee || 'Unassigned';
      else if (this.groupBy === 'team') key = t.team || 'No Team';
      else if (this.groupBy === 'status') key = t.status;
      else if (this.groupBy === 'priority') key = t.priority;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).map(([k, v]) => ({ key: k, tasks: v }));
  }

  // ── Deadline extension ────────────────────────────────────────────────────
  extendingDeadline = false;
  newDeadlineDate = '';

  extendDeadline(task: BoardTask): void {
    if (!this.newDeadlineDate) return;
    task.dueDate = this.newDeadlineDate;
    this.extendingDeadline = false;
    this.newDeadlineDate = '';
    this.save();
    this.showToast('Deadline extended', 'success');
    if (this.apiEnabled && task.apiId) {
      const aEmp = this.allEmployees.find(e => e.fullName === task.assignee);
      const sEmp = this.allEmployees.find(e => e.fullName === task.team);
      this.subscription.add(
        this.workTaskApi.updateTask(task.apiId, {
          title: task.title,
          dueDate: this.newDeadlineDate,
          assigneeEmployeeId: aEmp ? Number(aEmp.id) : task.assigneeEmployeeId,
          supervisorEmployeeId: sEmp ? Number(sEmp.id) : task.supervisorEmployeeId,
        }).subscribe({ error: () => {} })
      );
    }
  }

  // ── Quick reassign ────────────────────────────────────────────────────────
  reassignMode = false;
  reassignEmployeeName = '';

  quickReassign(task: BoardTask): void {
    const name = this.reassignEmployeeName.trim();
    if (!name) return;
    task.assignee = name;
    task.assignees = [name];
    const emp = this.allEmployees.find(e => e.fullName === name);
    if (emp) task.assigneeEmployeeId = Number(emp.id);
    this.reassignMode = false;
    this.reassignEmployeeName = '';
    this.save();
    this.showToast('Task reassigned', 'success');
    if (this.apiEnabled && task.apiId) {
      this.subscription.add(
        this.workTaskApi.updateTask(task.apiId, {
          title: task.title,
          assigneeEmployeeId: emp ? Number(emp.id) : task.assigneeEmployeeId,
        }).subscribe({ error: () => {} })
      );
    }
  }

  // ── Notification sound (Web Audio API) ────────────────────────────────────
  private playNotifSound(type: 'post' | 'reply' = 'post'): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      if (type === 'reply') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
      } else {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch { /* AudioContext not available */ }
  }

  // ── Report period ─────────────────────────────────────────────────────────
  reportPeriod: 'weekly' | 'monthly' | 'quarterly' = 'weekly';
  reportDropOpen = false;

  // ── Subtask follow-up expand state ────────────────────────────────────────
  expandedSubtaskIds = new Set<string>();
  subtaskFollowUpText: Record<string, string> = {};
  replyingToFuId: string | null = null;
  fuReplyText: Record<string, string> = {};

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const el = e.target as HTMLElement;
    if (!el.closest('.task-view-dropdown')) this.viewDropOpen = false;
    if (!el.closest('.report-period-dropdown')) this.reportDropOpen = false;
    if (this.rightRailOpen && !el.closest('.right-rail')) this.rightRailOpen = false;
  }

  setTaskViewMode(mode: 'mine' | 'all' | 'team'): void {
    const prev = this.taskViewMode;
    this.taskViewMode = mode;
    if (mode !== prev && (mode === 'all' || prev === 'all')) {
      this.loadBoardFromApi();
    }
  }

  get taskViewLabel(): string {
    return { mine: 'My Tasks', all: 'All Tasks', team: 'Team Tasks' }[this.taskViewMode];
  }

  // ── Supervisor ─────────────────────────────────────────────────────────────
  supervisorFilter = '';   // filter team tasks by supervisor name

  get myTeamTasks(): BoardTask[] {
    const name = this.supervisorFilter.trim().toLowerCase();
    return this.boardTasks.filter(t =>
      !name || (t.team || '').toLowerCase().includes(name) ||
      (t.assignees || [t.assignee]).some(a => (a || '').toLowerCase().includes(name))
    );
  }

  get uniqueSupervisors(): string[] {
    return [...new Set(this.boardTasks.map(t => t.team).filter(Boolean))].sort();
  }

  setTaskGrade(task: BoardTask, n: number): void {
    task.supervisorGrade = task.supervisorGrade === n ? 0 : n;
    this.save();
  }

  employeeSubmissions: EmployeeSubmission[] = [
    {
      id: 'e1', initials: 'CE', name: 'Chidi Eze', role: 'HR Manager', department: 'Human Resources',
      color: '#2563eb', avgSelfScore: 4.0, supScore: 4, status: 'pending', open: true, reviewedNote: '',
      goals: [
        { title: 'Annual Appraisal Cycle Setup', weight: 25, selfScore: 4, evidenceCount: 2 },
        { title: 'Employee Handbook Update', weight: 20, selfScore: 5, evidenceCount: 1 },
        { title: 'HR Policy Compliance Audit', weight: 20, selfScore: 3, evidenceCount: 1 },
        { title: 'Team Training Coordination', weight: 20, selfScore: 0, evidenceCount: 0 },
        { title: 'Workforce Planning Report', weight: 15, selfScore: 0, evidenceCount: 0 },
      ],
      reviewNote: 'Solid performance on appraisal cycle setup. Compliance audit needs closure before Jun 10. Other deliverables on track.',
      decision: 'approved',
    },
    {
      id: 'e2', initials: 'FU', name: 'Fatima Usman', role: 'L&D Lead', department: 'Learning & Development',
      color: '#16a34a', avgSelfScore: 3.8, supScore: 4, status: 'reviewed', open: false,
      reviewedNote: 'Goal-setting workshop facilitation was exemplary. Q3 training calendar well-structured. Keep momentum on the competency mapping.',
      goals: [
        { title: 'Q3 Goal-Setting Workshop', weight: 30, selfScore: 4, evidenceCount: 2 },
        { title: 'Competency Mapping Exercise', weight: 35, selfScore: 3, evidenceCount: 1 },
        { title: 'Training Needs Analysis', weight: 35, selfScore: 4, evidenceCount: 1 },
      ],
      reviewNote: '', decision: 'approved',
    },
    {
      id: 'e3', initials: 'OA', name: 'Olabisi Adeyemi', role: 'HRBP', department: 'HR Strategy',
      color: '#d97706', avgSelfScore: 4.2, supScore: 0, status: 'pending', open: false, reviewedNote: '',
      goals: [
        { title: 'Competency Framework Review', weight: 35, selfScore: 5, evidenceCount: 3 },
        { title: 'Change Management Plan', weight: 30, selfScore: 4, evidenceCount: 2 },
        { title: 'Employee Relations Cases', weight: 35, selfScore: 3, evidenceCount: 1 },
      ],
      reviewNote: '', decision: 'approved',
    },
    {
      id: 'e4', initials: 'TB', name: 'Tunde Bakare', role: 'Payroll Analyst', department: 'Compensation & Benefits',
      color: '#7c3aed', avgSelfScore: 3.9, supScore: 0, status: 'pending', open: false, reviewedNote: '',
      goals: [
        { title: 'June Payroll Reconciliation', weight: 40, selfScore: 4, evidenceCount: 2 },
        { title: 'Benefits Benchmarking Report', weight: 35, selfScore: 4, evidenceCount: 1 },
        { title: 'PAYE Statutory Filing', weight: 25, selfScore: 3, evidenceCount: 1 },
      ],
      reviewNote: '', decision: 'approved',
    },
    {
      id: 'e5', initials: 'NO', name: 'Ngozi Obi', role: 'Recruitment Manager', department: 'Talent Acquisition',
      color: '#0891b2', avgSelfScore: 4.1, supScore: 0, status: 'pending', open: false, reviewedNote: '',
      goals: [
        { title: 'July Onboarding Coordination', weight: 30, selfScore: 4, evidenceCount: 2 },
        { title: 'Graduate Recruitment Drive', weight: 40, selfScore: 4, evidenceCount: 3 },
        { title: 'Time-to-Fill KPI Target', weight: 30, selfScore: 4, evidenceCount: 1 },
      ],
      reviewNote: '', decision: 'approved',
    },
  ];

  get pendingCount(): number { return this.employeeSubmissions.filter(s => s.status === 'pending').length; }
  get reviewedCount(): number { return this.employeeSubmissions.filter(s => s.status === 'reviewed').length; }
  get avgTeamScore(): string {
    const scores = this.employeeSubmissions.map(s => s.avgSelfScore);
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  }

  toggleSubmission(id: string): void {
    const s = this.employeeSubmissions.find(s => s.id === id);
    if (s) s.open = !s.open;
  }

  setSupRating(id: string, n: number): void {
    const s = this.employeeSubmissions.find(s => s.id === id);
    if (s) s.supScore = n;
  }

  submitSupReview(id: string): void {
    const s = this.employeeSubmissions.find(s => s.id === id);
    if (s) { s.status = 'reviewed'; s.reviewedNote = s.reviewNote || 'Review submitted.'; s.open = false; }
  }

  fillTemplate(id: string, text: string): void {
    const s = this.employeeSubmissions.find(s => s.id === id);
    if (s) s.reviewNote = text;
  }

  // ── Batch page ─────────────────────────────────────────────────────────────
  batchRows: BatchRow[] = [
    { title: 'Q2 NPL Report Submission', assignee: 'Damilola A.', supervisor: 'Sarah K.', start: '2026-06-01', due: '2026-06-10', priority: 'High', type: 'Workplan', subtasks: 'Data pull; Model run; Validation; Draft report; Review', kpiTarget: 'Submit by Jun 10', weight: 20 },
    { title: 'Branch Compliance Audit — Ikeja', assignee: 'Fatima K.', supervisor: 'Sarah K.', start: '2026-06-03', due: '2026-06-17', priority: 'Medium', type: 'Workplan', subtasks: 'Pre-audit checklist; Site visit; Documentation; Report', kpiTarget: '0 findings', weight: 15 },
    { title: '', assignee: '', supervisor: '', start: '', due: '', priority: 'High', type: 'Workplan', subtasks: '', kpiTarget: '', weight: 0 },
  ];
  batchPasteText = '';

  addBatchRow(): void {
    this.batchRows.push({ title: '', assignee: '', supervisor: '', start: '', due: '', priority: 'High', type: 'Workplan', subtasks: '', kpiTarget: '', weight: 0 });
  }

  removeBatchRow(i: number): void { this.batchRows.splice(i, 1); }

  submitBatchRows(): void {
    const userId = this.currentUserId;
    const newTasks: BoardTask[] = [];
    this.batchRows.filter(r => r.title.trim()).forEach(r => {
      const subtaskList: SubTask[] = r.subtasks.split(';').filter(s => s.trim()).map((s, i) => ({
        id: `bst${Date.now()}_${i}`, title: s.trim(), done: false, assignee: r.assignee,
      }));
      const priority: TaskPriority = this.priorities.includes(r.priority.trim() as TaskPriority) ? r.priority.trim() as TaskPriority : 'Medium';
      // Resolve employee IDs from the employee list so identity matching works on reload
      const assigneeEmp = this.allEmployees.find(e => e.fullName.toLowerCase() === (r.assignee || '').toLowerCase());
      const supervisorEmp = this.allEmployees.find(e => e.fullName.toLowerCase() === (r.supervisor || '').toLowerCase());
      const task: BoardTask = {
        id: `hr${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: r.title.trim(), description: r.kpiTarget, assignee: r.assignee, team: r.supervisor,
        status: 'To Do', priority, startDate: r.start, dueDate: r.due,
        weight: r.weight, progress: 0, tags: [r.type], subtasks: subtaskList, activity: [], followUps: [],
        // Stamp identity so getMyLocalBoardTasks can find this task on reload without name matching
        createdByUserId: userId || undefined,
        assigneeEmployeeId: assigneeEmp ? Number(assigneeEmp.id) : undefined,
        supervisorEmployeeId: supervisorEmp ? Number(supervisorEmp.id) : undefined,
      };
      newTasks.push(task);
    });
    this.boardTasks.push(...newTasks);
    this.save();
    // Sync each imported task to the backend so getTasksByAssignee picks them up on next load
    if (this.apiEnabled) {
      newTasks.forEach(t => this.syncTaskToApi(t));
    }
    this.pmSection = 'board';
  }

  parseBatchPaste(): void {
    const lines = this.batchPasteText.split('\n').filter(l => l.trim());
    const parsed: BatchRow[] = lines.map(line => {
      const p = line.split('\t');
      return {
        title: p[0] || '', assignee: p[1] || '', supervisor: p[2] || '',
        start: p[3] || '', due: p[4] || '', priority: p[5] || 'High', type: p[6] || 'Workplan',
        subtasks: p[7] || '', kpiTarget: p[8] || '', weight: Number(p[9]) || 0,
      };
    });
    this.batchRows = [...parsed, { title: '', assignee: '', supervisor: '', start: '', due: '', priority: 'High', type: 'Workplan', subtasks: '', kpiTarget: '', weight: 0 }];
    this.batchPasteText = '';
  }

  onImportFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      // skip header row if it looks like a header
      const dataRows = rows.length > 1 && typeof rows[0][0] === 'string' && isNaN(Number(rows[0][0])) ? rows.slice(1) : rows;
      const parsed: BatchRow[] = dataRows
        .filter((r: any[]) => r[0]?.toString().trim())
        .map((r: any[]) => ({
          title: String(r[0] || '').trim(),
          assignee: String(r[1] || '').trim(),
          supervisor: String(r[2] || '').trim(),
          start: String(r[3] || '').trim(),
          due: String(r[4] || '').trim(),
          priority: String(r[5] || 'High').trim(),
          type: String(r[6] || 'Workplan').trim(),
          subtasks: String(r[7] || '').trim(),
          kpiTarget: String(r[8] || '').trim(),
          weight: Number(r[9]) || 0,
        }));
      this.batchRows = [...parsed, { title: '', assignee: '', supervisor: '', start: '', due: '', priority: 'High', type: 'Workplan', subtasks: '', kpiTarget: '', weight: 0 }];
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsArrayBuffer(file);
  }

  persistProgress(task: BoardTask): void {
    this.save();
    if (this.apiEnabled && task.apiId) {
      this.workTaskApi.updateTaskProgress(task.apiId, task.progress).subscribe({ error: () => {} });
    }
  }

  // ── Services (kept to avoid breaking service init) ─────────────────────────
  // These are subscribed but not displayed in the new UI — services are kept alive
  metrics: ProductivityMetricCard[] = [];
  tasks: ProductivityTaskCard[] = [];
  cycles: ProductivityCycleCard[] = [];
  scorecards: ProductivityScorecardCard[] = [];
  leaderboard: ProductivityLeaderboardRow[] = [];
  trendPoints: number[] = [];
  insights: ProductivityInsight[] = [];

  // ── Employee dropdowns (loaded from HR microservice) ──────────────────────
  allEmployees: Array<{ id: string; userId: string; fullName: string; department: string; role: string; supervisor: string }> = [];
  employeesLoading = false;

  get employeeNames(): string[] {
    return this.allEmployees.map(e => e.fullName);
  }

  get supervisorNames(): string[] {
    const sups = new Set(this.allEmployees.map(e => e.supervisor).filter(Boolean));
    this.allEmployees.forEach(e => sups.add(e.fullName));
    return [...sups].sort();
  }

  // ── Reports & Analytics ────────────────────────────────────────────────────
  reportsLoading = false;
  reportsError = false;
  execReport: HrExecutiveReport | null = null;
  workforceReport: HrWorkforceOverview | null = null;
  payrollReport: HrPayrollSummary | null = null;
  leaveReport: HrLeaveAttendance | null = null;
  turnoverReport: HrEmployeeTurnover | null = null;
  riskReport: HrRiskSummary | null = null;
  probationReport: HrProbationTracking | null = null;
  equityReport: HrCompensationEquity | null = null;
  bonusReport: HrBonusReport | null = null;
  statutoryReport: HrStatutoryRemittance | null = null;
  overtimeReport: HrOvertimeCost | null = null;
  vacancyReport: HrVacancyAging | null = null;

  // ── API sync state ─────────────────────────────────────────────────────────
  boardLoading = false;
  boardSaving  = false;
  apiEnabled   = true;
  private resolvedEmployeeId = 0;   // set once employee ID is resolved from session/API

  // ── Toast ──────────────────────────────────────────────────────────────────
  toasts: Array<{ id: number; message: string; type: 'success' | 'error' | 'info' | 'warn' }> = [];
  private toastId = 0;

  showToast(message: string, type: 'success' | 'error' | 'info' | 'warn' = 'success'): void {
    const id = ++this.toastId;
    this.toasts.push({ id, message, type });
    setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); }, 3500);
  }

  dismissToast(id: number): void { this.toasts = this.toasts.filter(t => t.id !== id); }

  // ── Lightbox ───────────────────────────────────────────────────────────────
  lightboxSrc = '';
  lightboxPhotos: string[] = [];
  lightboxIndex = 0;
  showLightbox = false;

  openLightbox(photosOrSrc: string | string[], index = 0): void {
    if (Array.isArray(photosOrSrc)) {
      this.lightboxPhotos = photosOrSrc;
      this.lightboxIndex = index;
      this.lightboxSrc = photosOrSrc[index] ?? '';
    } else {
      this.lightboxPhotos = [photosOrSrc];
      this.lightboxIndex = 0;
      this.lightboxSrc = photosOrSrc;
    }
    this.showLightbox = true;
  }

  prevLightbox(e: Event): void {
    e.stopPropagation();
    this.lightboxIndex = (this.lightboxIndex - 1 + this.lightboxPhotos.length) % this.lightboxPhotos.length;
    this.lightboxSrc = this.lightboxPhotos[this.lightboxIndex];
  }

  nextLightbox(e: Event): void {
    e.stopPropagation();
    this.lightboxIndex = (this.lightboxIndex + 1) % this.lightboxPhotos.length;
    this.lightboxSrc = this.lightboxPhotos[this.lightboxIndex];
  }

  closeLightbox(): void { this.showLightbox = false; this.lightboxSrc = ''; this.lightboxPhotos = []; }

  // ── Supervisor review form state ───────────────────────────────────────────
  supReviewDecision = 'Approved';
  supReviewNote = '';
  supReviewFiles: Array<{ name: string; url: string; isImage: boolean; uploading?: boolean }> = [];
  get supReviewUploading(): boolean { return this.supReviewFiles.some(f => f.uploading); }

  // ── Share modal state ──────────────────────────────────────────────────────
  showShareModal = false;
  shareTarget: 'supervisor' | 'channel' | 'dm' = 'supervisor';
  shareTaskRef: BoardTask | null = null;
  shareNote = '';
  shareChannelOrUser = '';
  shareChannelId: number | null = null;
  availableChannels: Array<{ id: number; name: string; channelCode: string; channelType: string; status: string }> = [];
  channelsLoading = false;
  channelUnreadCounts: Record<number, number> = {};
  dmUserList: Array<{ id: number; fullName: string; email: string }> = [];
  private employeeEmailMap: Record<number, string> = {};

  // ── Kanban overdue filter ──────────────────────────────────────────────────
  hideOverdue = true;

  private loadChannelUnread(): void {
    try { this.channelUnreadCounts = JSON.parse(localStorage.getItem('hr_ch_unread') || '{}'); } catch {}
  }

  incrementChannelUnread(channelId: number): void {
    this.channelUnreadCounts = { ...this.channelUnreadCounts, [channelId]: (this.channelUnreadCounts[channelId] || 0) + 1 };
    localStorage.setItem('hr_ch_unread', JSON.stringify(this.channelUnreadCounts));
  }

  clearChannelUnread(channelId: number | null): void {
    if (!channelId) return;
    const updated = { ...this.channelUnreadCounts };
    delete updated[channelId];
    this.channelUnreadCounts = updated;
    localStorage.setItem('hr_ch_unread', JSON.stringify(this.channelUnreadCounts));
  }

  // ── Inline photo state (per-task key = task.id) ────────────────────────────
  inlinePhotos: Record<string, Array<{ name: string; url: string; isImage: boolean; uploading?: boolean }>> = {};
  detailPhotos: Array<{ name: string; url: string; isImage: boolean; uploading?: boolean }> = [];

  // ── Follow-up photo carousel (index per follow-up id) ────────────────────
  fuPhotoIndex: Record<string, number> = {};
  prevFuPhoto(fuId: string, len: number, e: Event): void { e.stopPropagation(); this.fuPhotoIndex[fuId] = ((this.fuPhotoIndex[fuId] ?? 0) - 1 + len) % len; }
  nextFuPhoto(fuId: string, len: number, e: Event): void { e.stopPropagation(); this.fuPhotoIndex[fuId] = ((this.fuPhotoIndex[fuId] ?? 0) + 1) % len; }
  fuCurrentPhoto(fuId: string, photos: string[]): string { return photos[this.fuPhotoIndex[fuId] ?? 0] ?? ''; }

  constructor(
    private readonly productivityDataService: ProductivityDataService,
    private readonly productivityReviewService: ProductivityReviewService,
    private readonly reportingService: HrReportingService,
    private readonly employeeService: EmployeeService,
    private readonly workTaskApi: WorkTaskApiService,
    private readonly sanitizer: DomSanitizer,
    private readonly notifService: HrTaskNotificationService,
    private readonly authService: AuthenticationService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.route.queryParamMap.subscribe(params => {
        const taskId = params.get('taskId');
        if (taskId && this.boardTasks.length) this.tryOpenTaskById(taskId);
      })
    );
    this.loadArchivedTasks();
    this.loadChannelUnread();
    this.loadReviewSessions();
    this.productivityDataService.init();
    this.productivityReviewService.init();
    this.subscription.add(
      this.productivityDataService.workspace$.subscribe(w => {
        this.metrics = w.metrics; this.tasks = w.tasks; this.cycles = w.cycles;
        this.scorecards = w.scorecards; this.leaderboard = w.leaderboard;
        this.trendPoints = w.trendPoints; this.insights = w.insights;
      })
    );
    this.buildGantt();
    this.initNewTask();
    // Eagerly merge local imports so they appear immediately regardless of API timing
    this.mergeLocalImports();

    // Always resolve the current user's employee ID so "My Tasks" filter works for everyone.
    // The board-loading logic (getAllTasks vs getTasksByAssignee) stays role-dependent inside loadBoardFromApi().
    // When a taskId is in the URL (shared link), load ALL tasks so the linked task is always findable.
    const hasLinkedTask = !!this.route.snapshot.queryParamMap.get('taskId');
    const defaultViewMode: 'mine' | 'all' = hasLinkedTask ? 'all' : 'mine';
    const cachedEmpId = Number(sessionStorage.getItem('employeeId') || localStorage.getItem('employeeId') || 0);
    const cachedEmpUserId = sessionStorage.getItem('employeeUserId') || '';
    const currentUserId2 = sessionStorage.getItem('userid') || '';
    if (cachedEmpId && cachedEmpUserId === currentUserId2) {
      this.resolvedEmployeeId = cachedEmpId;
      this.taskViewMode = defaultViewMode;
      this.loadBoardFromApi();
    } else {
      this.subscription.add(
        this.employeeService.getEmployeeIdForCurrentUser()
          .pipe(timeout(6000), catchError(() => of(0)))
          .subscribe(empId => {
            this.resolvedEmployeeId = empId;
            this.taskViewMode = defaultViewMode;
            this.loadBoardFromApi();
          })
      );
    }

    // Load employees for dropdowns
    this.employeesLoading = true;
    this.employeeService.refreshEmployees().subscribe({
      next: (emps) => {
        this.allEmployees = (emps || [])
          .map((e: any) => {
            const fn = String(e?.firstName || e?.firstname || '').trim();
            const ln = String(e?.lastName || e?.lastname || '').trim();
            const full = (`${fn} ${ln}`).trim() || String(e?.fullName || e?.name || '').trim();
            return {
              id: String(e?.id || ''),
              userId: String(e?.userId || e?.user?.id || ''),
              fullName: full,
              department: String(e?.department?.name || e?.department || ''),
              role: String(e?.jobTitle || e?.designation || ''),
              supervisor: String(e?.supervisor?.fullName || e?.supervisorName || ''),
            };
          })
          .filter(e => !!e.fullName);
        this.employeeEmailMap = {};
        (emps || []).forEach((e: any) => {
          const id = Number(e?.id || 0);
          const email = String(e?.workEmail || e?.email || '').trim();
          if (id && email) this.employeeEmailMap[id] = email;
        });
        this.employeesLoading = false;
        this.patchSubmissionsFromUsers(this.allEmployees);
      },
      error: () => { this.employeesLoading = false; }
    });

    // Load users from the users API to populate supervisor review with DM users
    this.subscription.add(
      this.authService.getUsers().subscribe({
        next: (users: any[]) => {
          if (users && users.length > 0) {
            const mapped = users.map((u: any) => ({
              id: String(u?.id || ''),
              fullName: (`${u?.firstName || u?.firstname || ''} ${u?.lastName || u?.lastname || ''}`).trim() || String(u?.username || u?.name || '').trim(),
              department: String(u?.department?.name || u?.department || ''),
              role: String(u?.jobTitle || u?.designation || u?.roles?.[0] || ''),
              supervisor: '',
            })).filter(u => !!u.fullName);
            this.patchSubmissionsFromUsers(mapped);
            this.dmUserList = users
              .map((u: any) => ({
                id: Number(u?.id || 0),
                fullName: (`${u?.firstName || u?.firstname || ''} ${u?.lastName || u?.lastname || ''}`).trim() || String(u?.username || u?.name || '').trim(),
                email: String(u?.email || ''),
              }))
              .filter(u => u.id > 0 && !!u.fullName);
          }
        },
        error: () => {},
      })
    );
  }

  private patchSubmissionsFromUsers(users: Array<{ id: string; fullName: string; department: string; role: string; supervisor: string }>): void {
    if (!users || users.length === 0) return;
    this.employeeSubmissions.forEach((sub, i) => {
      const u = users[i % users.length];
      if (!u) return;
      const parts = u.fullName.split(' ');
      sub.name = u.fullName;
      sub.initials = parts.map((p: string) => p[0] || '').join('').toUpperCase().slice(0, 2);
      if (u.department) sub.department = u.department;
      if (u.role) sub.role = u.role;
    });
  }

  private loadBoardFromApi(): void {
    this.boardLoading = true;
    const employeeId = this.resolvedEmployeeId;
    const isSupervisor = this.isAdminOrSupervisor;
    const wantsAll = this.taskViewMode === 'all';
    const tasksRequest = (isSupervisor || wantsAll)
      ? this.workTaskApi.getAllTasks()
      : employeeId
        ? this.workTaskApi.getTasksByAssignee(employeeId)
        : this.workTaskApi.getAllTasks();
    // Cache follow-up replies and reactions before overwriting so they survive the remap
    const prevFuData = new Map<string, { replies?: FollowUpReply[]; reactions?: Record<string, string[]> }>();
    this.boardTasks.forEach(bt => {
      (bt.followUps ?? []).forEach(fu => {
        if ((fu.replies?.length || 0) > 0 || Object.keys(fu.reactions ?? {}).length > 0) {
          prevFuData.set(String(fu.followUpId ?? fu.id), { replies: fu.replies, reactions: fu.reactions });
        }
      });
    });

    const archivedRequest = (isSupervisor || wantsAll)
      ? this.workTaskApi.getArchivedTasks()
      : employeeId
        ? this.workTaskApi.getArchivedByAssignee(employeeId)
        : this.workTaskApi.getArchivedTasks();

    this.subscription.add(
      tasksRequest.pipe(timeout(8000)).subscribe({
        next: (apiTasks) => {
          const mapped = (apiTasks && apiTasks.length > 0)
            ? apiTasks.map(t => this.mapApiTaskToBoard(t))
            : [];
          // Restore locally-saved replies and reactions onto their follow-ups after remapping
          mapped.forEach(bt => {
            (bt.followUps ?? []).forEach(fu => {
              const key = String(fu.followUpId ?? fu.id);
              const prev = prevFuData.get(key);
              if (prev) { fu.replies = prev.replies; fu.reactions = prev.reactions; }
            });
          });
          const apiIds = new Set(mapped.map(t => t.id));
          if (isSupervisor || wantsAll) {
            // Full board: merge API results with any locally-created tasks
            const localOnly = this.parseTasks(localStorage.getItem(this.boardKey))
              .filter(t => !apiIds.has(t.id));
            this.boardTasks = mapped.length ? [...mapped, ...localOnly] : (localOnly.length ? localOnly : [...HR_SEED]);
          } else {
            // Regular user own-tasks view: API tasks + user's own locally-saved tasks
            const localOwn = this.getMyLocalBoardTasks(apiIds);
            const localImports = this.getLocalImportTasks().filter(t => !apiIds.has(t.id));
            this.boardTasks = [...mapped, ...localOwn, ...localImports];
          }
          this.mergeLocalImports(true);
          this.boardLoading = false;
          this.autoOpenFromUrl();
          // Load archived tasks from API
          archivedRequest.pipe(timeout(8000)).subscribe({
            next: (archivedApiTasks) => {
              if (archivedApiTasks && archivedApiTasks.length > 0) {
                const mappedArchived = archivedApiTasks.map(t => ({
                  ...this.mapApiTaskToBoard(t),
                  closed: t.status === 'CLOSED',
                  closedReason: (t as any).closedReason ?? undefined
                }));
                const existingApiIds = new Set(mappedArchived.map(t => t.apiId));
                const localArchived = this.archivedTasks.filter(t => !t.apiId || !existingApiIds.has(t.apiId));
                this.archivedTasks = [...mappedArchived, ...localArchived];
                this.saveArchivedTasks();
              }
            },
            error: () => {}
          });
        },
        error: () => {
          this.apiEnabled = false;
          if (isSupervisor) {
            const parsed = this.parseTasks(localStorage.getItem(this.boardKey));
            this.boardTasks = parsed.length ? parsed : [...HR_SEED];
          } else {
            const empty = new Set<string>();
            this.boardTasks = [...this.getMyLocalBoardTasks(empty), ...this.getLocalImportTasks()];
          }
          this.mergeLocalImports(true);
          this.boardLoading = false;
          this.autoOpenFromUrl();
        }
      })
    );
  }

  private autoOpenFromUrl(): void {
    const taskId = this.route.snapshot.queryParamMap.get('taskId');
    if (taskId) this.tryOpenTaskById(taskId);
  }

  private getLocalImportTasks(): BoardTask[] {
    return this.parseTasks(localStorage.getItem('hr_pm_imports_v1'));
  }

  // Read cached board tasks that belong to the current user (by employee ID, creator ID, or name).
  // Used to recover batch-imported or locally-created tasks for a non-admin user without
  // leaking other users' cached tasks from the shared HR_BOARD_KEY.
  private getMyLocalBoardTasks(excludeIds: Set<string>): BoardTask[] {
    try {
      const all = this.parseTasks(localStorage.getItem(this.boardKey));
      if (!all.length) return [];
      const empId = this.resolvedEmployeeId;
      const userId = this.currentUserId;
      const me = this.currentUserFullName;
      return all.filter(t => {
        if (excludeIds.has(t.id)) return false;
        // Created by this user
        if (userId && (t as any).createdByUserId === userId) return true;
        // Assigned to this user by employee ID
        if (empId && ((t as any).assigneeEmployeeId === empId || (t as any).supervisorEmployeeId === empId)) return true;
        // Batch-imported tasks (no employee IDs): match by name
        const hasApiIds = !!(t as any).assigneeEmployeeId || !!(t as any).supervisorEmployeeId || !!(t as any).createdByUserId;
        if (!hasApiIds && me) {
          const assignee = (t.assignee || '').toLowerCase();
          const inAssignees = (t.assignees || []).some((a: string) => (a || '').toLowerCase().includes(me));
          const isSup = (t.team || '').toLowerCase().includes(me);
          return assignee.includes(me) || inAssignees || isSup;
        }
        return false;
      });
    } catch { return []; }
  }

  // Merge tasks imported via Odoo/CSV from the dedicated imports key.
  // When persist=true (called after board state is final), also saves to HR_BOARD_KEY
  // so imports survive future refreshes without needing hr_pm_imports_v1 to be re-read.
  private mergeLocalImports(persist = false): void {
    try {
      const raw = localStorage.getItem('hr_pm_imports_v1');
      if (!raw) return;
      const imported = this.parseTasks(raw);
      if (!imported.length) return;
      const existingIds = new Set(this.boardTasks.map(t => t.id));
      const newOnes = imported.filter(t => !existingIds.has(t.id));
      if (newOnes.length > 0) {
        this.boardTasks = [...this.boardTasks, ...newOnes];
        if (persist) {
          // Persist merged state so imports survive refresh even if API wipes boardTasks next time
          this.save();
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Called when the user explicitly promotes an imported task to the main board
  // (e.g. by editing it). Removes it from the imports key and adds to boardTasks.
  promoteImport(taskId: string): void {
    try {
      const raw = localStorage.getItem('hr_pm_imports_v1');
      if (!raw) return;
      const remaining = this.parseTasks(raw).filter(t => t.id !== taskId);
      localStorage.setItem('hr_pm_imports_v1', JSON.stringify(remaining));
    } catch {}
    this.save();
  }

  // ── Normalize Java date arrays → YYYY-MM-DD strings ──────────────────────
  private normDate(d: any): string {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 3) {
      return `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}`;
    }
    return String(d);
  }

  // ── Normalize Java LocalDateTime arrays → ISO string ─────────────────────
  private normDateTime(d: any): string {
    if (!d) return '';
    if (Array.isArray(d) && d.length >= 6) {
      const dt = new Date(d[0], d[1] - 1, d[2], d[3] ?? 0, d[4] ?? 0, d[5] ?? 0);
      return dt.toISOString();
    }
    if (Array.isArray(d) && d.length >= 3) {
      return `${d[0]}-${String(d[1]).padStart(2, '0')}-${String(d[2]).padStart(2, '0')}`;
    }
    return String(d);
  }

  private mapApiTaskToBoard(t: WorkTaskFull): BoardTask {
    const assigneeName = t.assigneeEmployee
      ? `${t.assigneeEmployee.firstName} ${t.assigneeEmployee.lastName}`.trim()
      : '';
    const supervisorName = t.supervisorEmployee
      ? `${t.supervisorEmployee.firstName} ${t.supervisorEmployee.lastName}`.trim()
      : '';

    const statusMap: Record<string, TaskStatus> = {
      TO_DO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done',
    };
    const priorityMap: Record<string, TaskPriority> = {
      LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
    };

    return {
      id: String(t.id),
      title: t.title,
      description: t.description || '',
      assignee: assigneeName,
      assignees: assigneeName ? [assigneeName] : [],
      assigneeEmployeeId: t.assigneeEmployee?.id,
      supervisorEmployeeId: t.supervisorEmployee?.id,
      team: supervisorName,
      status: statusMap[t.status] ?? 'To Do',
      priority: priorityMap[t.priority] ?? 'Medium',
      startDate: this.normDate((t as any).startDate),
      dueDate: this.normDate((t as any).dueDate),
      weight: t.weight ?? 10,
      progress: t.progress ?? 0,
      tags: t.tags ? t.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      subtasks: (t.subtasks ?? []).map(s => ({
        id: String(s.id),
        title: s.title,
        done: s.done,
        assignee: s.assigneeEmployee ? `${s.assigneeEmployee.firstName} ${s.assigneeEmployee.lastName}`.trim() : '',
        status: ({ OPEN: 'open', IN_PROGRESS: 'ip', BLOCKED: 'blocked' } as any)[s.status] ?? 'open',
        startDate: this.normDate((s as any).startDate),
        dueDate: this.normDate((s as any).dueDate),
        dependency: s.dependency ?? '',
        subtaskId: s.id,
      })),
      activity: [],
      followUps: (t.followUps ?? []).map(f => {
        const fuEmpId: number = (f as any).authorEmployeeId ?? 0;
        const authorName = f.authorEmployee
          ? `${f.authorEmployee.firstName} ${f.authorEmployee.lastName}`.trim()
          : fuEmpId === this.resolvedEmployeeId && this.resolvedEmployeeId
            ? this.currentUserDisplayName
            : (() => {
                if (!fuEmpId) return '';
                const found = this.allEmployees.find(e => String(e.id) === String(fuEmpId));
                return found?.fullName || '';
              })();
        const apiReplies: FollowUpReply[] = (f.replies ?? []).map(r => {
          const empId: number = (r as any).authorEmployeeId ?? 0;
          const rAuthor = r.authorEmployee
            ? `${r.authorEmployee.firstName} ${r.authorEmployee.lastName}`.trim()
            : empId === this.resolvedEmployeeId && this.resolvedEmployeeId
              ? this.currentUserDisplayName
              : (() => {
                  if (!empId) return '';
                  const found = this.allEmployees.find(e => String(e.id) === String(empId));
                  return found?.fullName || '';
                })();
          return {
            id: `api${r.id}`,
            author: rAuthor || 'Team Member',
            initials: this.getInitials(rAuthor || 'TM'),
            color: '#6366f1',
            timestamp: this.formatTs(this.normDateTime((r as any).createdAt)),
            text: r.text,
            authorEmployeeId: empId || undefined,
          };
        });
        return {
          id: String(f.id),
          followUpId: f.id,
          author: authorName || 'Team Member',
          initials: this.getInitials(authorName || 'TM'),
          color: '#2563eb',
          timestamp: this.formatTs(this.normDateTime((f as any).createdAt)),
          text: f.text,
          photos: f.photoUrls ? (f.photoUrls.includes('||') ? f.photoUrls.split('||') : f.photoUrls.split(',')).filter((u: string) => u.trim()) : [],
          decision: f.decision,
          progress: f.progress ?? 0,
          replies: apiReplies,
        };
      }),
      apiId: t.id,
      createdByUserId: t.createdByUserId,
    } as any;
  }

  private toApiStatus(s: TaskStatus): ApiTaskStatus {
    const m: Record<TaskStatus, ApiTaskStatus> = {
      'To Do': 'TO_DO', 'In Progress': 'IN_PROGRESS', 'In Review': 'IN_REVIEW', 'Done': 'DONE',
    };
    return m[s];
  }

  private toApiPriority(p: TaskPriority): ApiTaskPriority {
    const m: Record<TaskPriority, ApiTaskPriority> = {
      'Low': 'LOW', 'Medium': 'MEDIUM', 'High': 'HIGH', 'Critical': 'CRITICAL',
    };
    return m[p];
  }

  ngOnDestroy(): void { this.subscription.unsubscribe(); }

  // ── Board methods ──────────────────────────────────────────────────────────
  private save(): void {
    // Attempt 1: save everything including base64 previews (works for small images)
    try {
      localStorage.setItem(this.boardKey, JSON.stringify(this.boardTasks));
      return;
    } catch { /* QuotaExceededError — try stripping base64 */ }

    // Attempt 2: keep server URLs (https://…), strip only base64
    try {
      const noBase64 = this.boardTasks.map(t => ({
        ...t,
        followUps: (t.followUps || []).map(fu => ({
          ...fu,
          photos: (fu.photos || []).filter(u => u && !u.startsWith('data:')),
        })),
      }));
      localStorage.setItem(this.boardKey, JSON.stringify(noBase64));
      return;
    } catch { /* still over quota */ }

    // Attempt 3: strip all photos
    try {
      const noPhotos = this.boardTasks.map(t => ({
        ...t,
        followUps: (t.followUps || []).map(fu => ({ ...fu, photos: [] })),
      }));
      localStorage.setItem(this.boardKey, JSON.stringify(noPhotos));
    } catch { /* storage unavailable */ }
  }

  private get currentUserId(): number {
    return Number(sessionStorage.getItem('userid') || localStorage.getItem('userid') || 0);
  }

  // Per-user storage key — prevents one user's saves from overwriting another's on shared browsers
  private get boardKey(): string {
    const uid = this.currentUserId;
    return uid ? `${HR_BOARD_KEY}_u${uid}` : HR_BOARD_KEY;
  }

  private resolveEmail(employeeRef: any, fallbackEmpId?: number): string | null {
    // 1. Direct map lookup by HR employee ID
    const id = employeeRef?.id ?? fallbackEmpId;
    if (id && this.employeeEmailMap[id]) return this.employeeEmailMap[id];
    // 2. Name-match against dmUserList (which has emails from auth/users API)
    if (employeeRef?.firstName || employeeRef?.lastName) {
      const full = `${employeeRef.firstName || ''} ${employeeRef.lastName || ''}`.trim().toLowerCase();
      const match = this.dmUserList.find(u => {
        const ul = u.fullName.toLowerCase();
        return ul === full || ul.includes(full) || full.includes(ul);
      });
      if (match?.email) return match.email;
    }
    // 3. Lookup by emp ID → name → dmUserList
    if (id) {
      const emp = this.allEmployees.find(e => String(e.id) === String(id));
      if (emp) {
        const full = emp.fullName.toLowerCase();
        const match = this.dmUserList.find(u => {
          const ul = u.fullName.toLowerCase();
          return ul === full || ul.includes(full) || full.includes(ul);
        });
        if (match?.email) return match.email;
      }
    }
    return null;
  }

  private taskEmailRow(label: string, value: string, shade: boolean): string {
    const bg = shade ? ' style="background:#f9fafb;"' : '';
    return `<tr${bg}><td style="padding:8px 12px;font-weight:600;color:#374151;border:1px solid #e5e7eb;">${label}</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">${value}</td></tr>`;
  }

  private sendTaskCreatedEmails(task: WorkTaskFull, origin?: BoardTask): void {
    const assigneeId = task.assigneeEmployee?.id ?? origin?.assigneeEmployeeId;
    const supervisorId = task.supervisorEmployee?.id ?? origin?.supervisorEmployeeId;
    const assigneeName = task.assigneeEmployee
      ? `${task.assigneeEmployee.firstName} ${task.assigneeEmployee.lastName}`.trim()
      : origin?.assignee || 'Team Member';
    const supervisorName = task.supervisorEmployee
      ? `${task.supervisorEmployee.firstName} ${task.supervisorEmployee.lastName}`.trim()
      : origin?.team || '';
    const rows = [
      this.taskEmailRow('Task', task.title, false),
      this.taskEmailRow('Priority', task.priority, true),
      this.taskEmailRow('Status', task.status, false),
      this.taskEmailRow('Due Date', task.dueDate || 'Not set', true),
      this.taskEmailRow('Description', task.description || '—', false),
    ].join('');
    const wrap = (headerColor: string, heading: string, greeting: string, body: string) =>
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:${headerColor};padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:20px;">${heading}</h2>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="color:#374151;">Hello <strong>${greeting}</strong>,</p>
          <p style="color:#374151;">${body}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
          <p style="color:#6b7280;font-size:12px;margin-top:24px;">Log in to OptimaX to view and manage this task.</p>
        </div>
      </div>`;
    const assigneeEmail = this.resolveEmail(task.assigneeEmployee, assigneeId);
    const supervisorEmail = this.resolveEmail(task.supervisorEmployee, supervisorId);
    if (assigneeEmail) {
      this.employeeService.sendNotificationEmail(
        assigneeEmail,
        `New Task Assigned: ${task.title}`,
        wrap('#1a73e8', 'New Task Assigned to You', assigneeName, 'A new task has been assigned to you on OptimaX Work Productivity:')
      ).subscribe({ error: () => {} });
    }
    if (supervisorEmail && supervisorEmail !== assigneeEmail) {
      this.employeeService.sendNotificationEmail(
        supervisorEmail,
        `Task Created: ${task.title}`,
        wrap('#0f766e', 'Task Created Under Your Supervision', supervisorName,
          `A task has been created and assigned to <strong>${assigneeName}</strong> under your supervision:`)
      ).subscribe({ error: () => {} });
    }
  }

  private sendTaskUpdatedEmails(task: WorkTaskFull, origin?: BoardTask): void {
    const assigneeId = task.assigneeEmployee?.id ?? origin?.assigneeEmployeeId;
    const supervisorId = task.supervisorEmployee?.id ?? origin?.supervisorEmployeeId;
    const assigneeName = task.assigneeEmployee
      ? `${task.assigneeEmployee.firstName} ${task.assigneeEmployee.lastName}`.trim()
      : origin?.assignee || 'Team Member';
    const supervisorName = task.supervisorEmployee
      ? `${task.supervisorEmployee.firstName} ${task.supervisorEmployee.lastName}`.trim()
      : origin?.team || '';
    const rows = [
      this.taskEmailRow('Task', task.title, false),
      this.taskEmailRow('Status', task.status, true),
      this.taskEmailRow('Priority', task.priority, false),
      this.taskEmailRow('Progress', `${task.progress}%`, true),
      this.taskEmailRow('Due Date', task.dueDate || 'Not set', false),
    ].join('');
    const html = (name: string) =>
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#7c3aed;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:20px;">Task Updated</h2>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="color:#374151;">Hello <strong>${name}</strong>,</p>
          <p style="color:#374151;">A task you are involved in has been updated on OptimaX:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
          <p style="color:#6b7280;font-size:12px;margin-top:24px;">Log in to OptimaX to view the latest changes.</p>
        </div>
      </div>`;
    const assigneeEmail = this.resolveEmail(task.assigneeEmployee, assigneeId);
    const supervisorEmail = this.resolveEmail(task.supervisorEmployee, supervisorId);
    if (assigneeEmail) {
      this.employeeService.sendNotificationEmail(
        assigneeEmail, `Task Updated: ${task.title}`, html(assigneeName)
      ).subscribe({ error: () => {} });
    }
    if (supervisorEmail && supervisorEmail !== assigneeEmail) {
      this.employeeService.sendNotificationEmail(
        supervisorEmail, `Task Updated: ${task.title}`, html(supervisorName)
      ).subscribe({ error: () => {} });
    }
  }

  private sendChannelUpdateEmails(channelId: number, channelName: string, noteText: string, taskTitle: string): void {
    this.workTaskApi.getChannelMembers(channelId).pipe(
      catchError(() => of([]))
    ).subscribe((members: any[]) => {
      members.forEach((member: any) => {
        const userId = Number(member.userId || 0);
        if (!userId) return;
        const user = this.dmUserList.find(u => u.id === userId);
        if (!user?.email) return;
        const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0369a1;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:20px;">Update Posted to #${channelName}</h2>
          </div>
          <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <p style="color:#374151;">Hello <strong>${user.fullName}</strong>,</p>
            <p style="color:#374151;">A new update has been posted to <strong>#${channelName}</strong>${taskTitle ? ` regarding &ldquo;<strong>${taskTitle}</strong>&rdquo;` : ''}:</p>
            <div style="background:#f0f9ff;border-left:4px solid #0369a1;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
              <p style="margin:0;color:#374151;">${noteText}</p>
            </div>
            <p style="color:#6b7280;font-size:12px;margin-top:24px;">Log in to OptimaX to view and respond to this update.</p>
          </div>
        </div>`;
        this.employeeService.sendNotificationEmail(
          user.email, `Channel Update: #${channelName}`, html
        ).subscribe({ error: () => {} });
      });
    });
  }

  private syncTaskToApi(task: BoardTask): void {
    if (!this.apiEnabled) return;
    const userId = this.currentUserId;
    if (!task.createdByUserId && userId) task.createdByUserId = userId;
    const dto: WorkTaskDTO = {
      title: task.title,
      description: task.description,
      assigneeEmployeeId: task.assigneeEmployeeId,
      supervisorEmployeeId: task.supervisorEmployeeId,
      status: this.toApiStatus(task.status),
      priority: this.toApiPriority(task.priority),
      startDate: task.startDate || undefined,
      dueDate: task.dueDate || undefined,
      weight: task.weight,
      progress: task.progress,
      tags: task.tags?.join(','),
      sprint: task.sprint || undefined,
      createdByUserId: task.createdByUserId || (userId || undefined),
    };
    if (task.apiId) {
      this.subscription.add(
        this.workTaskApi.updateTask(task.apiId, dto).subscribe({
          next: (updated) => { task.apiId = updated.id; this.save(); this.sendTaskUpdatedEmails(updated, task); },
          error: () => this.save(),
        })
      );
    } else {
      this.subscription.add(
        this.workTaskApi.createTask(dto).subscribe({
          next: (created) => {
            task.apiId = created.id;
            this.save();
            this.sendTaskCreatedEmails(created, task);
            (task.subtasks || []).filter(s => !s.subtaskId).forEach(sub => {
              const assigneeEmp = this.allEmployees.find(e => e.fullName === sub.assignee);
              const subDto: SubtaskDTO = {
                workTaskId: created.id,
                title: sub.title,
                done: sub.done,
                assigneeEmployeeId: assigneeEmp ? Number(assigneeEmp.id) : undefined,
                status: sub.status === 'ip' ? 'IN_PROGRESS' : sub.status === 'blocked' ? 'BLOCKED' : 'OPEN',
                startDate: sub.startDate,
                dueDate: sub.dueDate,
                dependency: sub.dependency,
              };
              this.subscription.add(
                this.workTaskApi.createSubtask(subDto).subscribe({
                  next: (createdSub) => { sub.subtaskId = createdSub.id; this.save(); },
                  error: () => {},
                })
              );
            });
          },
          error: () => this.save(),
        })
      );
    }
  }

  private buildGantt(): void {
    const today = new Date();
    this.ganttStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const days: string[] = [];
    const cur = new Date(this.ganttStart);
    while (cur <= end) { days.push(`${cur.getMonth() + 1}/${cur.getDate()}`); cur.setDate(cur.getDate() + 1); }
    this.ganttDays = days;
  }

  private initNewTask(): void {
    this.newTask = {
      id: `hr${Date.now()}`, title: '', description: '', assignee: '', assignees: [], team: '',
      status: 'To Do', priority: 'Medium', startDate: new Date().toISOString().slice(0, 10),
      dueDate: '', weight: 10, progress: 0, tags: [], subtasks: [], activity: [],
      cost: undefined, costCurrency: 'NGN', sprint: '',
    };
    this.taskSubmitAttempted = false;
    this.newTaskSubtasks = [];
  }

  get filteredBoard(): BoardTask[] {
    const empId = this.resolvedEmployeeId;
    const me = this.currentUserFullName; // already lowercase

    // True when current user is a direct assignee on the task (by ID or name).
    // Only checks assignee.includes(me) — never me.includes(assignee) to avoid false positives.
    const isAssignedToMe = (t: BoardTask): boolean => {
      if (empId && t.assigneeEmployeeId === empId) return true;
      if (!me) return false;
      const assignee = (t.assignee || '').toLowerCase();
      if (assignee === me || assignee.includes(me)) return true;
      return (t.assignees || []).some((a: string) => {
        const al = (a || '').toLowerCase();
        return al === me || al.includes(me);
      });
    };

    // True when current user is the supervisor recorded on the task.
    // Only checks team.includes(me) — never me.includes(team).
    const iAmSupervisor = (t: BoardTask): boolean => {
      if (empId && t.supervisorEmployeeId === empId) return true;
      if (!me) return false;
      const team = (t.team || '').toLowerCase();
      return team === me || team.includes(me);
    };

    return this.boardTasks.filter(t => {
      // ── View mode filter ──────────────────────────────────────────────────
      if (this.taskViewMode === 'mine') {
        // My Tasks: only tasks where the logged-in user is an assignee
        if (!isAssignedToMe(t)) return false;
      } else if (this.taskViewMode === 'team') {
        // Team Tasks: tasks where current user is supervisor/team-lead
        if (!iAmSupervisor(t)) return false;
      } else if (this.taskViewMode === 'all') {
        // All Tasks: show every task, no user-involvement filter
      }

      // ── Toolbar filters ───────────────────────────────────────────────────
      if (this.filterStatus && t.status !== this.filterStatus) return false;
      if (this.filterPriority && t.priority !== this.filterPriority) return false;
      if (this.filterAssignee && !(t.assignee || '').toLowerCase().includes(this.filterAssignee.toLowerCase())) return false;
      if (this.searchText && !(t.title || '').toLowerCase().includes(this.searchText.toLowerCase())) return false;
      return true;
    });
  }

  columnTasks(status: TaskStatus): BoardTask[] {
    return this.filteredBoard.filter(t => t.status === status && (!this.hideOverdue || !this.isTaskOverdue(t)));
  }

  get overdueTasks(): BoardTask[] {
    return this.filteredBoard.filter(t => this.isTaskOverdue(t));
  }
  colId(status: TaskStatus): string { return `hr-col-${status.replace(/\s/g, '-')}`; }
  connectedTo(status: TaskStatus): string[] { return this.statuses.filter(s => s !== status).map(s => this.colId(s)); }

  drop(event: CdkDragDrop<BoardTask[]>, targetStatus: TaskStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      const task = event.container.data[event.currentIndex];
      task.status = targetStatus;
      if (this.apiEnabled && task.apiId) {
        this.subscription.add(
          this.workTaskApi.updateTaskStatus(task.apiId, this.toApiStatus(targetStatus)).subscribe({
            error: () => this.save(),
          })
        );
      }
    }
    this.save();
  }

  openDetail(task: BoardTask): void {
    this.selectedTask = task;
    this.detailPanelVisible = true;
    this.detailTab = 'overview';
    this.newActivityText = '';
  }
  openDetailFromList(task: BoardTask, e: Event): void { e.stopPropagation(); this.openDetail(task); }
  closeDetail(): void { this.selectedTask = null; this.detailPanelVisible = false; this.save(); }

  private tryOpenTaskById(taskId: string): void {
    const found = this.boardTasks.find(t => t.id === taskId || String(t.apiId) === taskId);
    if (found) { this.pmSection = 'board'; this.openDetail(found); return; }

    // hr-prefixed local ID: resolve to numeric apiId via localStorage, then retry
    if (taskId.startsWith('hr')) {
      const localTasks = this.parseTasks(localStorage.getItem(this.boardKey));
      const local = localTasks.find(t => t.id === taskId);
      if (local?.apiId) {
        const byApiId = this.boardTasks.find(t => t.id === String(local.apiId) || t.apiId === local.apiId);
        if (byApiId) { this.pmSection = 'board'; this.openDetail(byApiId); return; }
      }
    }

    // Task not in current view — switch to all-tasks mode and reload so linked task is found
    if (this.taskViewMode !== 'all') {
      this.taskViewMode = 'all';
      this.loadBoardFromApi();
    }
  }

  toggleReplyBox(fuId: string): void {
    this.replyingToFuId = this.replyingToFuId === fuId ? null : fuId;
    if (!this.fuReplyText[fuId]) this.fuReplyText[fuId] = '';
  }

  onFuReplyEnter(event: KeyboardEvent, fu: FollowUp): void {
    if (event.shiftKey) return;
    event.preventDefault();
    this.submitFollowUpReply(fu);
  }

  submitFollowUpReply(fu: FollowUp): void {
    if (!this.selectedTask) return;
    const text = (this.fuReplyText[fu.id] || '').trim();
    if (!text) return;
    const displayName = this.currentUserDisplayName || 'You';
    const reply: FollowUpReply = {
      id: `rep${Date.now()}`,
      author: displayName,
      initials: this.getInitials(displayName),
      color: '#6366f1',
      timestamp: new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }),
      text,
    };
    if (!fu.replies) fu.replies = [];
    fu.replies.push(reply);
    this.fuReplyText[fu.id] = '';
    this.replyingToFuId = null;
    this.save();
    this.playNotifSound('reply');

    if (this.apiEnabled && fu.followUpId) {
      const dto: FollowUpReplyDTO = {
        followUpId: fu.followUpId,
        authorEmployeeId: this.resolvedEmployeeId || undefined,
        text,
      };
      this.subscription.add(
        this.workTaskApi.createReply(dto).subscribe({
          next: (created) => { reply.id = `api${created.id}`; this.save(); },
          error: () => {},
        })
      );
    }
    this.sendFollowUpEmails(
      this.selectedTask,
      text,
      `Reply on Task Update: ${this.selectedTask.title}`,
      '#6366f1',
      `Reply from ${displayName}`
    );
  }

  toggleReaction(fu: FollowUp, emoji: string): void {
    if (!fu.reactions) fu.reactions = {};
    const me = this.currentUserFullName || 'You';
    if (!fu.reactions[emoji]) fu.reactions[emoji] = [];
    const idx = fu.reactions[emoji].indexOf(me);
    if (idx > -1) { fu.reactions[emoji].splice(idx, 1); }
    else { fu.reactions[emoji].push(me); }
    if (fu.reactions[emoji].length === 0) delete fu.reactions[emoji];
    this.save();
  }

  reactionCount(fu: FollowUp, emoji: string): number {
    return fu.reactions?.[emoji]?.length ?? 0;
  }

  iReacted(fu: FollowUp, emoji: string): boolean {
    const me = this.currentUserFullName || 'You';
    return (fu.reactions?.[emoji] ?? []).includes(me);
  }

  toggleSubtask(task: BoardTask, sub: SubTask): void {
    sub.done = !sub.done;
    if (task.subtasks.length) task.progress = Math.round((task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100);
    this.save();
    if (this.apiEnabled && sub.subtaskId) {
      this.subscription.add(
        this.workTaskApi.toggleSubtask(sub.subtaskId).subscribe({
          next: (updated) => { sub.done = updated.done; },
          error: () => {},
        })
      );
    }
    if (this.apiEnabled && task.apiId) {
      this.subscription.add(
        this.workTaskApi.updateTaskProgress(task.apiId, task.progress).subscribe({ error: () => {} })
      );
    }
  }

  startEditSubtask(sub: SubTask): void {
    this.editingSubtaskId = sub.id;
    this.editingSubtaskTitle = sub.title;
    this.editingSubtaskDescription = sub.description || '';
  }

  saveSubtaskEdit(task: BoardTask, sub: SubTask): void {
    const t = this.editingSubtaskTitle.trim();
    if (t) {
      sub.title = t;
      sub.description = this.editingSubtaskDescription;
      this.save();
    }
    this.editingSubtaskId = null;
    this.editingSubtaskTitle = '';
    this.editingSubtaskDescription = '';
  }

  cancelSubtaskEdit(): void {
    this.editingSubtaskId = null;
    this.editingSubtaskTitle = '';
    this.editingSubtaskDescription = '';
  }

  addSubtask(task: BoardTask, title: string): void {
    if (!title.trim()) return;
    const newSub: SubTask = {
      id: `st${Date.now()}`, title: title.trim(), done: false,
      assignee: task.assignee, status: this.newSubStatus || 'open',
    };
    this.newSubStatus = 'open';
    task.subtasks.push(newSub);
    this.save();
    if (this.apiEnabled && task.apiId) {
      const dto: SubtaskDTO = { workTaskId: task.apiId, title: title.trim() };
      this.subscription.add(
        this.workTaskApi.createSubtask(dto).subscribe({
          next: (created) => { newSub.subtaskId = created.id; this.save(); },
          error: () => {},
        })
      );
    }
  }

  addNewTaskSubtask(): void {
    this.newTaskSubtasks.push({ title: '', assignee: '', status: 'open', startDate: '', dueDate: '', dependency: '' });
  }

  removeNewTaskSubtask(i: number): void {
    this.newTaskSubtasks.splice(i, 1);
  }

  toggleSubtaskExpand(subId: string): void {
    if (this.expandedSubtaskIds.has(subId)) {
      this.expandedSubtaskIds.delete(subId);
    } else {
      this.expandedSubtaskIds.add(subId);
    }
  }

  addSubtaskFollowUp(task: BoardTask, sub: SubTask): void {
    const text = (this.subtaskFollowUpText[sub.id] || '').trim();
    if (!text) return;
    const fu: FollowUp = {
      id: `sfu${Date.now()}`,
      author: sessionStorage.getItem('fullname') || 'Me',
      initials: this.getInitials(sessionStorage.getItem('fullname') || 'Me'),
      color: '#6366f1',
      timestamp: new Date().toISOString(),
      text,
      photos: [],
    };
    sub.followUps = [...(sub.followUps || []), fu];
    this.subtaskFollowUpText[sub.id] = '';
    this.save();
  }

  addTask(): void {
    this.taskSubmitAttempted = true;
    const t = this.newTask as BoardTask;
    const descText = (t.description || '').replace(/<[^>]*>/g, '').trim();
    if (!t.title?.trim() || !descText || !t.assignees?.length || !t.team?.trim()
        || !t.startDate || !t.dueDate || t.weight == null || !t.sprint?.trim()) return;
    t.id = `hr${Date.now()}`;
    t.followUps = t.followUps ?? [];
    // Primary assignee is first in the multi-select list
    if (t.assignees?.length) t.assignee = t.assignees[0];
    // Resolve employee IDs from selected names
    const assigneeEmp = this.allEmployees.find(e => e.fullName === t.assignee);
    const supervisorEmp = this.allEmployees.find(e => e.fullName === t.team);
    t.assigneeEmployeeId = assigneeEmp ? Number(assigneeEmp.id) : undefined;
    t.supervisorEmployeeId = supervisorEmp ? Number(supervisorEmp.id) : undefined;
    t.createdByUserId = this.currentUserId || undefined;

    const manualSubtasks: SubTask[] = this.newTaskSubtasks
      .filter(s => s.title.trim())
      .map((s, i) => ({
        id: `sub${Date.now()}_${i}`,
        title: s.title.trim(),
        done: false,
        assignee: s.assignee || t.assignee || '',
        status: (s.status || 'open') as 'open' | 'ip' | 'blocked',
        startDate: s.startDate || undefined,
        dueDate: s.dueDate || undefined,
        dependency: s.dependency || undefined,
      }));
    t.subtasks = [...(t.subtasks ?? []), ...manualSubtasks];

    const newBoard: BoardTask = { ...t, subtasks: t.subtasks ?? [], activity: [], followUps: [] };
    this.boardTasks.unshift(newBoard);
    this.save();
    this.showAddTask = false;
    this.initNewTask();

    if (this.apiEnabled) {
      this.syncTaskToApi(newBoard);
    }
  }

  openEditTask(task: BoardTask, e: Event): void {
    e.stopPropagation();
    this.editingTask = task;
    const existingAssignees = task.assignees?.length ? task.assignees : (task.assignee ? [task.assignee] : []);
    this.editTaskDraft = { ...task, tags: [...(task.tags || [])], assignees: [...existingAssignees] };
    this.showEditTask = true;
  }

  saveEditTask(): void {
    if (!this.editingTask || !this.editTaskDraft.title?.trim()) return;
    const d = this.editTaskDraft;
    const t = this.editingTask;
    t.title       = d.title!.trim();
    t.description = d.description || '';
    t.assignees   = d.assignees ?? [];
    t.assignee    = t.assignees.length ? t.assignees[0] : (d.assignee || '');
    t.team        = d.team    || '';
    t.status      = (d.status   as TaskStatus)   || t.status;
    t.priority    = (d.priority as TaskPriority) || t.priority;
    t.startDate   = d.startDate || '';
    t.dueDate     = d.dueDate   || '';
    t.weight      = d.weight    ?? t.weight;
    t.cost        = d.cost;
    t.costCurrency = d.costCurrency || 'NGN';
    const aEmp = this.allEmployees.find(e => e.fullName === t.assignee);
    const sEmp = this.allEmployees.find(e => e.fullName === t.team);
    if (aEmp) t.assigneeEmployeeId   = Number(aEmp.id);
    if (sEmp) t.supervisorEmployeeId = Number(sEmp.id);
    this.showEditTask = false;
    this.editingTask  = null;
    if (t.status === 'Closed') {
      t.closed = true;
      this.archiveTask(t);
      this.showToast('Task closed and moved to archive', 'info');
    } else {
      this.save();
      this.showToast('Task updated', 'success');
      if (this.apiEnabled) this.syncTaskToApi(t);
    }
  }

  cancelEditTask(): void { this.showEditTask = false; this.editingTask = null; }

  deleteTask(task: BoardTask, e: Event): void {
    e.stopPropagation();
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    this.boardTasks = this.boardTasks.filter(t => t.id !== task.id);
    if (this.selectedTask?.id === task.id) this.selectedTask = null;
    this.save();
    this.showToast('Task deleted', 'success');
    if (this.apiEnabled && task.apiId) {
      this.subscription.add(this.workTaskApi.deleteTask(task.apiId).subscribe({ error: () => {} }));
    }
  }

  toggleRow(task: BoardTask): void {
    task.expanded = !task.expanded;
  }

  ganttColumn(startDate: string, dueDate: string): string {
    const start = new Date(startDate || new Date());
    const end = new Date(dueDate || new Date());
    const col1 = Math.max(1, Math.floor((start.getTime() - this.ganttStart.getTime()) / 86400000) + 1);
    const col2 = Math.max(col1 + 1, Math.floor((end.getTime() - this.ganttStart.getTime()) / 86400000) + 2);
    return `${col1} / ${Math.min(col2, this.ganttDays.length + 1)}`;
  }

  ganttBarLeft(startDate: string): number {
    if (!startDate || !this.ganttDays.length) return 0;
    const start = new Date(startDate);
    const dayIndex = Math.floor((start.getTime() - this.ganttStart.getTime()) / 86400000);
    return Math.max(0, Math.min(95, (dayIndex / this.ganttDays.length) * 100));
  }

  ganttBarWidth(startDate: string, dueDate: string): number {
    if (!startDate || !dueDate || !this.ganttDays.length) return 5;
    const start = new Date(startDate);
    const end = new Date(dueDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    return Math.max(3, Math.min(90, (days / this.ganttDays.length) * 100));
  }

  get ganttRows(): Array<{ task: BoardTask; sub?: SubTask; isChild: boolean }> {
    const rows: Array<{ task: BoardTask; sub?: SubTask; isChild: boolean }> = [];
    for (const task of this.filteredBoard) {
      rows.push({ task, isChild: false });
      for (const sub of task.subtasks) {
        rows.push({ task, sub, isChild: true });
      }
    }
    return rows;
  }

  trackGanttRow(_: number, row: { task: BoardTask; sub?: SubTask; isChild: boolean }): string {
    return row.isChild ? `${row.task.id}-${row.sub?.id}` : row.task.id;
  }

  trackGroup(_: number, group: { key: string; tasks: BoardTask[] }): string {
    return group.key;
  }

  trackTask(_: number, task: BoardTask): string {
    return task.id;
  }

  trackSubtask(_: number, sub: SubTask): string {
    return sub.id;
  }

  trackEngagementRow(_: number, row: { task: BoardTask }): string {
    return row.task.id;
  }

  taskProgressDisplay(task: BoardTask): number {
    if (task.subtasks.length > 0) {
      const done = task.subtasks.filter(s => s.done).length;
      return Math.round((done / task.subtasks.length) * 100);
    }
    return task.progress;
  }

  // ── Report row helpers ─────────────────────────────────────────────────────

  workforceReportRows(): Array<{ label: string; value: string }> {
    if (!this.workforceReport) return [];
    const r = this.workforceReport as any;
    return [
      { label: 'Total Headcount', value: String(r.totalHeadcount ?? 'N/A') },
      { label: 'Total Joins', value: String(r.totalJoins ?? 0) },
      { label: 'Total Exits', value: String(r.totalExits ?? 0) },
      { label: 'Total Vacancies', value: String(r.totalVacancies ?? 0) },
      { label: 'Departments Tracked', value: String((r.rows ?? []).length) },
    ];
  }

  payrollReportRows(): Array<{ label: string; value: string; color?: string }> {
    if (!this.payrollReport) return [];
    const r = this.payrollReport as any;
    return [
      { label: 'Total Gross Pay', value: this.fmt(r.totalGrossPay), color: '#2563eb' },
      { label: 'Total Net Payable', value: this.fmt(r.totalNetPayable), color: '#16a34a' },
      { label: 'Total Deductions', value: this.fmt(r.totalDeductions), color: '#dc2626' },
      { label: 'Total Employer Cost', value: this.fmt(r.totalEmployerCost), color: '#d97706' },
      { label: 'Departments on Payroll', value: String((r.rows ?? []).length) },
    ];
  }

  leaveReportRows(): Array<{ label: string; value: string }> {
    if (!this.leaveReport) return [];
    const r = this.leaveReport as any;
    return [
      { label: 'Total Requests', value: String(r.totalRequests ?? 0) },
      { label: 'Approved', value: String(r.approvedRequests ?? 0) },
      { label: 'Pending', value: String(r.pendingRequests ?? 0) },
      { label: 'Rejected', value: String(r.rejectedRequests ?? 0) },
      { label: 'Total Leave Days', value: String(r.totalLeaveDays ?? 0) },
    ];
  }

  turnoverReportRows(): Array<{ label: string; value: string; color?: string }> {
    if (!this.turnoverReport) return [];
    const r = this.turnoverReport as any;
    const rate = r.turnoverRate != null ? `${Number(r.turnoverRate).toFixed(1)}%` : 'N/A';
    return [
      { label: 'Total Employees', value: String(r.totalEmployees ?? 0) },
      { label: 'Total Joins', value: String(r.totalJoins ?? 0), color: '#16a34a' },
      { label: 'Total Exits', value: String(r.totalExits ?? 0), color: '#dc2626' },
      { label: 'Turnover Rate', value: rate, color: r.turnoverRate > 10 ? '#dc2626' : '#d97706' },
      { label: 'Departments', value: String((r.rows ?? []).length) },
    ];
  }

  fmt(n: number | null | undefined): string {
    return n != null ? `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'N/A';
  }

  riskReportRows(): Array<{ label: string; value: string; color?: string }> {
    if (!this.riskReport) return [];
    const r = this.riskReport;
    return [
      { label: 'Total Employees', value: String(r.totalEmployees ?? 0) },
      { label: 'Active Employees', value: String(r.activeEmployees ?? 0), color: '#16a34a' },
      { label: 'Total Loan Exposure', value: this.fmt(r.totalLoanExposure), color: '#d97706' },
      { label: 'Overdue Loans', value: String(r.totalOverdueLoans ?? 0), color: r.totalOverdueLoans > 0 ? '#dc2626' : '#374151' },
      { label: 'Defaulted Loans', value: String(r.totalDefaultedLoans ?? 0), color: r.totalDefaultedLoans > 0 ? '#dc2626' : '#374151' },
      { label: 'Grace Period Requests', value: String(r.gracePeriodRequests ?? 0), color: '#7c3aed' },
    ];
  }

  probationRows(): Array<{ name: string; department: string; level: string; endDate: string; status: string; statusClass: string }> {
    if (!this.probationReport) return [];
    return (this.probationReport.rows ?? []).map(row => ({
      name: row.employeeName,
      department: row.department,
      level: row.level,
      endDate: row.probationEndDate ? this.formatDate(row.probationEndDate) : '—',
      status: row.probationStatus,
      statusClass: row.probationStatus?.toLowerCase() === 'overdue' ? 'b-red' :
                   row.probationStatus?.toLowerCase() === 'due-soon' ? 'b-yellow' : 'b-blue',
    }));
  }

  equityRows(): Array<{ level: string; department: string; gender: string; count: number; avgNet: string; medianNet: string }> {
    if (!this.equityReport) return [];
    return (this.equityReport.rows ?? []).map(row => ({
      level: row.level,
      department: row.department,
      gender: row.gender,
      count: row.employeeCount,
      avgNet: this.fmt(row.averageNetPayable),
      medianNet: this.fmt(row.medianApproxNetPayable),
    }));
  }

  bonusRows(): Array<{ level: string; type: string; count: number; total: string }> {
    if (!this.bonusReport) return [];
    return (this.bonusReport.rows ?? []).map(row => ({
      level: row.level,
      type: row.bonusType,
      count: row.count,
      total: this.fmt(row.totalAmount),
    }));
  }

  overtimeRows(): Array<{ level: string; type: string; maxHours: number; rate: string; cost: string }> {
    if (!this.overtimeReport) return [];
    return (this.overtimeReport.rows ?? []).map(row => ({
      level: row.level,
      type: row.overtimeType,
      maxHours: row.maxHours,
      rate: this.fmt(row.rate),
      cost: this.fmt(row.configuredCost),
    }));
  }

  vacancyRows(): Array<{ title: string; location: string; type: string; daysOpen: number; expired: boolean }> {
    if (!this.vacancyReport) return [];
    return (this.vacancyReport.rows ?? []).map(row => ({
      title: row.jobTitle,
      location: row.location,
      type: row.jobType,
      daysOpen: row.daysOpen,
      expired: row.expired,
    }));
  }

  todayColumn(): number { return Math.floor((new Date().getTime() - this.ganttStart.getTime()) / 86400000) + 1; }
  completedSubtasks(task: BoardTask): number { return (task.subtasks ?? []).filter(s => s.done).length; }
  priorityClass(p: string): string { return `priority-${p.toLowerCase()}`; }
  statusClass(s: string): string { return `status-${(s || '').toLowerCase().replace(/\s+/g, '-')}`; }
  formatDate(d: string): string {
    if (!d) return '—';
    try { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d)); }
    catch { return d; }
  }
  formatTs(iso: any): string {
    if (!iso) return '';
    try {
      const d = Array.isArray(iso)
        ? new Date(iso[0], iso[1] - 1, iso[2], iso[3] ?? 0, iso[4] ?? 0, iso[5] ?? 0)
        : new Date(iso);
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
    } catch { return String(iso); }
  }
  get uniqueAssignees(): string[] { return [...new Set(this.boardTasks.map(t => t.assignee))].filter(Boolean); }

  subDotClass(sub: SubTask): string {
    if (sub.done) return 'done';
    if (sub.status === 'blocked') return 'blocked';
    if (sub.status === 'ip') return 'ip';
    return 'open';
  }

  cycleSubtaskStatus(task: BoardTask, sub: SubTask): void {
    // Cycle: open → ip → done → open (blocked stays until explicitly cleared)
    if (sub.done) {
      sub.done = false;
      sub.status = 'open';
    } else if (sub.status === 'ip') {
      sub.done = true;
      sub.status = undefined;
    } else if (sub.status === 'blocked') {
      sub.status = 'ip';
    } else {
      sub.status = 'ip';
    }
    this.save();
  }

  newSubStatus: 'open' | 'ip' | 'blocked' = 'open';

  isTaskOverdue(task: BoardTask): boolean {
    if (!task.dueDate || task.status === 'Done') return false;
    return new Date(task.dueDate) < new Date();
  }

  overdueDays(task: BoardTask): number {
    if (!task.dueDate) return 0;
    return Math.max(0, Math.floor((new Date().getTime() - new Date(task.dueDate).getTime()) / 86400000));
  }

  getInitials(name: string): string {
    return (name || '').split(' ').map(p => p[0] || '').join('').toUpperCase().slice(0, 2) || '?';
  }

  avatarColor(name: string): string {
    const palette = ['#2563eb','#7c3aed','#0891b2','#16a34a','#d97706','#dc2626','#9333ea','#0d9488'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  taskPriorityBadge(priority: string): string {
    const m: Record<string, string> = { Low: 'b-gray', Medium: 'b-yellow', High: 'b-red', Critical: 'b-red' };
    return m[priority] || 'b-gray';
  }

  tagBadgeClass(tag: string): string {
    const t = (tag || '').toLowerCase();
    if (t === 'routine') return 'b-gray';
    if (t === 'workplan') return 'b-blue';
    if (t === 'odoo import') return 'b-purple';
    if (t === 'project') return 'b-purple';
    return 'b-blue';
  }

  postInlineUpdate(task: BoardTask, event: Event): void {
    event.stopPropagation();
    if (!task.inlineText?.trim()) return;
    const pending = (this.inlinePhotos[task.id] || []).filter(p => p.uploading);
    if (pending.length) { this.showToast('Please wait for uploads to complete…', 'info'); return; }
    task.followUps = task.followUps || [];
    const photos = (this.inlinePhotos[task.id] || []).map(p => p.url).filter(Boolean);
    const newFu: FollowUp = {
      id: `fu${Date.now()}`, author: task.assignee || 'You',
      initials: this.getInitials(task.assignee || 'You'), color: '#2563eb',
      timestamp: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()),
      text: task.inlineText.trim(), photos, progress: task.progress,
    };
    task.followUps.unshift(newFu);
    task.inlineText = '';
    this.inlinePhotos[task.id] = [];
    this.save();
    this.playNotifSound('post');
    this.showToast('Update posted successfully', 'success');
    const recipients = task.assignees?.length ? task.assignees : [task.assignee];
    recipients.forEach(r => r && this.notifService.add(
      `Update on "${task.title}"`,
      newFu.text.replace(/<[^>]*>/g, '').slice(0, 80),
      r, task.id
    ));
    if (task.team) this.notifService.add(`Update on "${task.title}"`, `Progress ${task.progress}%`, task.team, task.id);

    if (this.apiEnabled && task.apiId) {
      const dto: FollowUpDTO = {
        workTaskId: task.apiId,
        text: newFu.text,
        progress: newFu.progress,
        authorEmployeeId: task.assigneeEmployeeId,
        photoUrls: photos.join(','),
      };
      this.subscription.add(
        this.workTaskApi.createFollowUp(dto).subscribe({
          next: (created) => { newFu.followUpId = created.id; this.save(); },
          error: () => {},
        })
      );
    }
  }

  // ── Sanitize HTML from rich editor ─────────────────────────────────────────
  sanitizeHtml(html: string | null | undefined): SafeHtml {
    if (!html) return '';
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // ── File upload helpers ────────────────────────────────────────────────────
  private attachAndUpload(
    file: File,
    collection: Array<{ name: string; url: string; isImage: boolean; uploading?: boolean }>,
  ): void {
    const isImage = file.type.startsWith('image/');
    const entry: { name: string; url: string; isImage: boolean; uploading?: boolean } = { name: file.name, url: '', isImage, uploading: true };
    collection.push(entry);

    // Generate local base64 immediately for all file types so URL is ready before user posts
    const previewReader = new FileReader();
    previewReader.onload = (e) => { if (!entry.url) entry.url = e.target?.result as string; };
    previewReader.readAsDataURL(file);

    // Upload to server for persistence
    this.subscription.add(
      this.workTaskApi.uploadMedia(file).subscribe({
        next: (res) => {
          if (res.url) {
            entry.url = res.url.startsWith('/')
              ? `https://be.optimaxsuites.com${res.url}`
              : res.url;
          }
          entry.uploading = false;
        },
        error: () => {
          // Keep base64 fallback; uploading failed
          entry.uploading = false;
          if (!entry.url) {
            const reader = new FileReader();
            reader.onload = (e) => { entry.url = e.target?.result as string; };
            reader.readAsDataURL(file);
          }
        },
      })
    );
  }

  onInlineFileAttach(event: Event, task: BoardTask): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    if (!this.inlinePhotos[task.id]) this.inlinePhotos[task.id] = [];
    Array.from(files).forEach(file => this.attachAndUpload(file, this.inlinePhotos[task.id]));
    this.showToast(`${files.length} file(s) uploading…`, 'info');
  }

  onDetailFileAttach(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    Array.from(files).forEach(file => this.attachAndUpload(file, this.detailPhotos));
    this.showToast(`${files.length} file(s) uploading…`, 'info');
  }

  onSupReviewFileAttach(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    if (!files) return;
    Array.from(files).forEach(file => this.attachAndUpload(file, this.supReviewFiles));
    this.showToast(`${files.length} file(s) uploading…`, 'info');
  }

  removeDetailPhoto(i: number): void { this.detailPhotos.splice(i, 1); }
  removeSupReviewFile(i: number): void { this.supReviewFiles.splice(i, 1); }
  removeInlinePhoto(taskId: string, i: number): void {
    if (this.inlinePhotos[taskId]) this.inlinePhotos[taskId].splice(i, 1);
  }

  // ── Wired postActivity: includes photos + API call ─────────────────────────
  postActivity(): void {
    if (!this.selectedTask) return;
    const plainText = this.newActivityText.replace(/<[^>]*>/g, '').trim();
    if (!plainText) return;
    const photos = this.detailPhotos.map(p => p.url);
    const newFu: FollowUp = {
      id: `fu${Date.now()}`, author: this.selectedTask.assignee || 'You',
      initials: this.getInitials(this.selectedTask.assignee || 'You'), color: '#2563eb',
      timestamp: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()),
      text: this.newActivityText.trim(), photos, progress: this.selectedTask.progress,
    };
    this.selectedTask.followUps = this.selectedTask.followUps || [];
    this.selectedTask.followUps.unshift(newFu);
    this.newActivityText = '';
    this.detailPhotos = [];
    this.save();
    this.showToast('Follow-up posted successfully', 'success');
    const assignees = this.selectedTask.assignees?.length ? this.selectedTask.assignees : [this.selectedTask.assignee];
    assignees.forEach(r => r && this.notifService.add(
      `Follow-up on "${this.selectedTask!.title}"`,
      plainText.slice(0, 80),
      r, this.selectedTask!.id
    ));
    if (this.selectedTask.team) this.notifService.add(
      `Follow-up on "${this.selectedTask.title}"`,
      `${this.selectedTask.assignee} posted an update`,
      this.selectedTask.team, this.selectedTask.id
    );

    if (this.apiEnabled && this.selectedTask.apiId) {
      const dto: FollowUpDTO = {
        workTaskId: this.selectedTask.apiId,
        text: newFu.text,
        progress: newFu.progress,
        authorEmployeeId: this.selectedTask.assigneeEmployeeId,
        photoUrls: photos.filter(p => p && !p.startsWith('data:')).join('||'),
      };
      this.subscription.add(
        this.workTaskApi.createFollowUp(dto).subscribe({
          next: (created) => { newFu.followUpId = created.id; this.save(); },
          error: () => {},
        })
      );
    }
    this.sendFollowUpEmails(
      this.selectedTask,
      this.newActivityText,
      `Task Update: ${this.selectedTask.title}`,
      '#2563eb',
      'Task Progress Update'
    );
  }

  // ── Post supervisor review ─────────────────────────────────────────────────
  postSupervisorReview(): void {
    if (!this.selectedTask) return;
    if (!this.supReviewNote.trim()) { this.showToast('Please enter review feedback before submitting.', 'warn'); return; }
    if (this.supReviewUploading) {
      this.showToast('Please wait for file uploads to complete before submitting.', 'warn');
      return;
    }

    const decisionLabel = this.supReviewDecision;
    const photos = this.supReviewFiles.map(f => f.url).filter(Boolean);
    const fu: FollowUp = {
      id: `sv${Date.now()}`,
      author: this.selectedTask.team || 'Supervisor',
      initials: this.getInitials(this.selectedTask.team || 'Supervisor'),
      color: '#7c3aed',
      timestamp: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()),
      text: this.supReviewNote.trim(),
      photos,
      decision: decisionLabel.startsWith('✅') ? 'Approved' : decisionLabel.startsWith('🔄') ? 'Changes' : undefined,
      progress: this.selectedTask.progress,
    };
    this.selectedTask.followUps = this.selectedTask.followUps || [];
    this.selectedTask.followUps.unshift(fu);

    if (this.selectedTask.status !== 'Done' && fu.decision === 'Approved') {
      this.selectedTask.status = 'Done';
      this.selectedTask.progress = 100;
    }

    const reviewNote = this.supReviewNote.trim();
    this.supReviewNote = '';
    this.supReviewDecision = 'Approved';
    this.supReviewFiles = [];
    this.save();
    this.showToast('Supervisor review posted', 'success');

    this.sendFollowUpEmails(
      this.selectedTask,
      reviewNote,
      `Supervisor Review: ${this.selectedTask.title}`,
      '#7c3aed',
      `Supervisor Review — ${decisionLabel}`
    );

    if (this.apiEnabled && this.selectedTask.apiId) {
      const dto: FollowUpDTO = {
        workTaskId: this.selectedTask.apiId,
        authorEmployeeId: this.selectedTask.supervisorEmployeeId,
        text: fu.text,
        decision: fu.decision,
        progress: fu.progress,
        photoUrls: photos.filter(p => !p.startsWith('data:')).join('||'),
      };
      this.subscription.add(
        this.workTaskApi.createFollowUp(dto).subscribe({ error: () => {} })
      );
    }
  }

  // ── Share with supervisor / channel / DM ───────────────────────────────────
  openShareModal(task: BoardTask, target: 'supervisor' | 'channel' | 'dm' = 'supervisor'): void {
    this.shareTaskRef = task;
    this.shareTarget = target;
    this.shareChannelOrUser = target === 'supervisor' ? (task.team || '') : '';
    this.shareChannelId = null;
    this.showShareModal = true;

    // Build rich pre-filled message with task context
    const assigneeList = (task.assignees?.length ? task.assignees : [task.assignee]).filter(Boolean).join(', ') || '—';
    const taskUrl = `${window.location.origin}${window.location.pathname}`;
    const latestFollowUp = (task.followUps ?? []).filter(f => f.text?.trim()).slice(-1)[0] ?? null;
    const latestComment = latestFollowUp
      ? `💬 Latest comment (${latestFollowUp.author}): ${latestFollowUp.text.replace(/<[^>]*>/g, '').trim().slice(0, 250)}`
      : '';
    this.shareNote = [
      `📋 *Task: ${task.title}*`,
      `🚦 Status: ${task.status}  |  ⚡ Priority: ${task.priority}`,
      `👥 Assignee(s): ${assigneeList}`,
      `📅 Due: ${task.dueDate ? this.formatDate(task.dueDate) : '—'}  |  📊 Progress: ${task.progress}%`,
      task.tags?.length ? `🏷️ Tags: ${task.tags.join(', ')}` : '',
      latestComment,
      ``,
      `🔗 View task: ${taskUrl}?taskId=${task.apiId ?? task.id}`,
      ``,
      `Note: `,
    ].filter(l => l !== undefined && l !== '').join('\n');

    if (target === 'channel') {
      // Always reload channels to avoid stale/duplicate list
      this.channelsLoading = true;
      this.availableChannels = [];
      this.subscription.add(
        this.workTaskApi.getCollabChannels().subscribe({
          next: (chs) => {
            const seen = new Set<number>();
            this.availableChannels = (chs || [])
              .filter(c =>
                c.status === 'ACTIVE' &&
                c.channelType !== 'DM' &&
                !c.name?.toLowerCase().startsWith('dm-') &&
                !c.channelCode?.toLowerCase().startsWith('dm-')
              )
              .filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
            this.channelsLoading = false;
          },
          error: () => { this.channelsLoading = false; },
        })
      );
    }
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.shareTaskRef = null;
    this.shareNote = '';
    this.shareChannelId = null;
  }

  isImageUrl(url: string): boolean {
    if (!url) return false;
    if (url.startsWith('data:image/')) return true;
    const u = url.toLowerCase().split('?')[0];
    return !!u.match(/\.(jpe?g|png|gif|webp|svg|bmp)$/);
  }

  fuImages(photos: string[]): string[] {
    return (photos || []).filter(p => this.isImageUrl(p));
  }

  fuDocs(photos: string[]): string[] {
    return (photos || []).filter(p => p && !this.isImageUrl(p));
  }

  private resolveEmailByName(name: string): string | null {
    if (!name) return null;
    const emp = this.allEmployees.find(e => e.fullName.toLowerCase() === name.toLowerCase());
    if (emp) {
      const empId = Number(emp.id);
      if (empId && this.employeeEmailMap[empId]) return this.employeeEmailMap[empId];
      if (emp.userId) {
        const u = this.dmUserList.find(u => String(u.id) === emp.userId);
        if (u?.email) return u.email;
      }
    }
    const u = this.dmUserList.find(u =>
      u.fullName.toLowerCase() === name.toLowerCase() ||
      u.fullName.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(u.fullName.toLowerCase())
    );
    return u?.email || null;
  }

  private sendFollowUpEmails(task: BoardTask, noteText: string, subject: string, headingColor: string, heading: string): void {
    const assigneeName = (task.assignees?.length ? task.assignees[0] : task.assignee) || 'Team Member';
    const supervisorName = task.team || '';
    const plain = noteText.replace(/<[^>]*>/g, '').trim().slice(0, 300);
    const rows = [
      this.taskEmailRow('Task', task.title, false),
      this.taskEmailRow('Status', task.status, true),
      this.taskEmailRow('Progress', `${task.progress}%`, false),
      this.taskEmailRow('Update', plain, true),
    ].join('');
    const makeHtml = (name: string) =>
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:${headingColor};padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:20px;">${heading}</h2>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="color:#374151;">Hello <strong>${name}</strong>,</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
          <p style="color:#6b7280;font-size:12px;margin-top:24px;">Log in to OptimaX to view and respond.</p>
        </div>
      </div>`;
    const assigneeEmail = this.employeeEmailMap[Number(task.assigneeEmployeeId)] || this.resolveEmailByName(assigneeName);
    const supervisorEmail = this.employeeEmailMap[Number(task.supervisorEmployeeId)] || this.resolveEmailByName(supervisorName);
    if (assigneeEmail) {
      this.employeeService.sendNotificationEmail(assigneeEmail, subject, makeHtml(assigneeName)).subscribe({ error: () => {} });
    }
    if (supervisorEmail && supervisorEmail !== assigneeEmail) {
      this.employeeService.sendNotificationEmail(supervisorEmail, subject, makeHtml(supervisorName)).subscribe({ error: () => {} });
    }
  }

  private sendShareDm(recipientName: string, task: BoardTask | null, note: string, label: string): void {
    const myUserId = Number(sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || 0);
    if (!myUserId) { this.showToast('Unable to resolve your user account. Please re-login.', 'error'); return; }

    // Resolve recipient auth user ID — prefer userId from HR employee record over name matching
    const emp = this.allEmployees.find(e =>
      e.fullName.toLowerCase() === recipientName.toLowerCase() ||
      e.fullName.toLowerCase().includes(recipientName.toLowerCase()) ||
      recipientName.toLowerCase().includes(e.fullName.toLowerCase())
    );
    let recipientUserId: number | null = null;
    if (emp?.userId) {
      recipientUserId = Number(emp.userId) || null;
    }
    if (!recipientUserId) {
      const match = this.dmUserList.find(u =>
        u.fullName.toLowerCase() === recipientName.toLowerCase() ||
        u.fullName.toLowerCase().includes(recipientName.toLowerCase()) ||
        recipientName.toLowerCase().includes(u.fullName.toLowerCase())
      );
      recipientUserId = match?.id ?? null;
    }
    if (!recipientUserId) {
      this.showToast(`User "${recipientName}" not found in system. Ensure they have a login account.`, 'warn');
      return;
    }

    const capturedRecipientId = recipientUserId;
    this.subscription.add(
      this.workTaskApi.getOrCreateDmChannel(myUserId, capturedRecipientId).pipe(
        switchMap(channel => {
          const channelId = channel.id ?? channel.channelId;
          return this.workTaskApi.sendChannelMessage(channelId, note);
        })
      ).subscribe({
        next: () => {
          this.showToast(`${label} sent to ${recipientName}`, 'success');
          if (task) {
            this.notifService.add(`Task shared with ${recipientName}`, `"${task.title}" sent to ${recipientName}`, recipientName, task.id);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('optimax-notification', {
                detail: { title: `Task shared: ${task.title}`, body: `Update delivered to ${recipientName} via DM`, category: 'module' }
              }));
            }
          }
          // Also send email notification to the recipient
          const recipientEmail = this.resolveEmailByName(recipientName);
          if (recipientEmail && task) {
            const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#0369a1;padding:20px 24px;border-radius:8px 8px 0 0;">
                <h2 style="color:#fff;margin:0;font-size:20px;">Task Update — ${task.title}</h2>
              </div>
              <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
                <p style="color:#374151;">Hello <strong>${recipientName}</strong>,</p>
                <div style="background:#f0f9ff;border-left:4px solid #0369a1;padding:12px 16px;margin:16px 0;border-radius:0 4px 4px 0;">
                  <p style="margin:0;white-space:pre-wrap;color:#374151;">${note}</p>
                </div>
                <p style="color:#6b7280;font-size:12px;margin-top:24px;">Log in to OptimaX to view this task.</p>
              </div>
            </div>`;
            this.employeeService.sendNotificationEmail(recipientEmail, `Task Update: ${task.title}`, html).subscribe({ error: () => {} });
          }
        },
        error: () => this.showToast(`Failed to deliver message to ${recipientName}. Check connection.`, 'error'),
      })
    );
  }

  submitShare(): void {
    if (!this.shareNote.trim()) { this.showToast('Please enter a message to share.', 'warn'); return; }

    const task = this.shareTaskRef;
    if (this.shareTarget === 'channel') {
      if (!this.shareChannelId) { this.showToast('Please select a channel.', 'warn'); return; }
      const ch = this.availableChannels.find(c => c.id === this.shareChannelId);
      const capturedChannelId = this.shareChannelId;
      const capturedChannelName = ch?.name || 'channel';
      const capturedNote = this.shareNote;
      const capturedTaskTitle = task?.title || '';
      this.showShareModal = false;
      this.subscription.add(
        this.workTaskApi.sendChannelMessage(capturedChannelId, capturedNote).subscribe({
          next: () => {
            this.showToast(`Task update posted to #${capturedChannelName}`, 'success');
            if (task) {
              this.notifService.add(`Shared to #${capturedChannelName}`, `"${task.title}" was shared`, capturedChannelName, task.id);
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('optimax-notification', {
                  detail: { title: `Shared to #${capturedChannelName}`, body: `"${task.title}" was posted`, category: 'module' }
                }));
              }
            }
            this.incrementChannelUnread(capturedChannelId);
            this.sendChannelUpdateEmails(capturedChannelId, capturedChannelName, capturedNote, capturedTaskTitle);
          },
          error: () => this.showToast('Failed to post to channel. Check connection.', 'error'),
        })
      );
    } else if (this.shareTarget === 'supervisor') {
      const supervisorName = this.shareChannelOrUser || (task?.team || '');
      if (!supervisorName) { this.showToast('Supervisor name is required.', 'warn'); return; }
      this.showShareModal = false;
      this.sendShareDm(supervisorName, task, this.shareNote, 'Supervisor update');
    } else {
      const recipientName = this.shareChannelOrUser;
      if (!recipientName) { this.showToast('Please select a recipient.', 'warn'); return; }
      this.showShareModal = false;
      this.sendShareDm(recipientName, task, this.shareNote, 'Task update');
    }
    this.shareNote = '';
    this.shareChannelId = null;
  }

  // ── Download .ics calendar entry ───────────────────────────────────────────
  downloadIcs(task: BoardTask): void {
    const fmt = (d: string) => d ? d.replace(/-/g, '') : '';
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const start = fmt(task.startDate) || fmt(new Date().toISOString().slice(0, 10));
    const end   = fmt(task.dueDate)   || start;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//OptimaX HR//Task Board//EN',
      'BEGIN:VEVENT',
      `UID:task-${task.id}-${now}@optimaxsuites.com`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${task.title}`,
      `DESCRIPTION:${(task.description || '').replace(/<[^>]*>/g, '').replace(/\n/g, '\\n')}`,
      `LOCATION:${task.team || ''}`,
      `STATUS:${task.status === 'Done' ? 'COMPLETED' : 'IN-PROCESS'}`,
      `PRIORITY:${task.priority === 'Critical' ? '1' : task.priority === 'High' ? '2' : task.priority === 'Medium' ? '5' : '9'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${task.title.replace(/\s+/g, '_')}.ics`; a.click();
    URL.revokeObjectURL(url);
    this.showToast('Calendar file downloaded', 'info');
  }

  // ── Format a raw YYYY-MM-DD string or Java date array ────────────────────
  formatRawDate(d: any): string {
    if (!d || d === '—') return '—';
    try {
      if (Array.isArray(d) && d.length >= 3) {
        const dt = new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]));
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dt);
      }
      const s = String(d);
      const parts = s.split('-');
      if (parts.length === 3) {
        const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dt);
      }
    } catch {}
    return String(d);
  }

  // ── Weekly Tasks Report ────────────────────────────────────────────────────
  generateReport(): void {
    const now = new Date();
    const period = this.reportPeriod;

    // ── Compute date range ───────────────────────────────────────────────────
    let rangeStart: Date, rangeEnd: Date, periodLabel: string;
    if (period === 'monthly') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      rangeEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      periodLabel = 'Monthly';
    } else if (period === 'quarterly') {
      const q = Math.floor(now.getMonth() / 3);
      rangeStart = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
      rangeEnd   = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
      periodLabel = `Q${q + 1}`;
    } else {
      rangeStart = new Date(now); rangeStart.setDate(now.getDate() - now.getDay()); rangeStart.setHours(0,0,0,0);
      rangeEnd   = new Date(rangeStart); rangeEnd.setDate(rangeStart.getDate() + 6); rangeEnd.setHours(23,59,59,999);
      periodLabel = 'Weekly';
    }

    const fmt    = (d: Date) => d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    const fmtTs  = (s: string) => { try { return new Date(s).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return s; } };
    const fmtDay = (s: string) => { try { return new Date(s).toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch { return s || '—'; } };
    const stars  = (n: number) => n ? '★'.repeat(Math.min(n, 5)) + '☆'.repeat(Math.max(0, 5 - n)) : '—';
    const esc    = (s: string) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const subStatusLabel: Record<string, string> = { open: 'Open', ip: 'In Progress', blocked: 'Blocked' };
    const subStatusColor: Record<string, string> = { open: '#6b7280', ip: '#2563eb', blocked: '#dc2626' };

    const tasks  = this.filteredBoard;   // respects current view mode
    const total  = tasks.length;
    const done   = tasks.filter(t => t.status === 'Done').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const inReview   = tasks.filter(t => t.status === 'In Review').length;
    const overdue    = tasks.filter(t => this.isTaskOverdue(t)).length;
    const pct        = total ? Math.round((done / total) * 100) : 0;
    const avgScore   = (() => {
      const scored = tasks.filter(t => t.supervisorGrade && t.supervisorGrade > 0);
      return scored.length ? (scored.reduce((s, t) => s + (t.supervisorGrade || 0), 0) / scored.length).toFixed(1) : '—';
    })();

    const priorityColor: Record<string, string> = {
      Critical: '#dc2626', High: '#ea580c', Medium: '#d97706', Low: '#16a34a',
    };
    const statusColor: Record<string, string> = {
      'Done': '#16a34a', 'In Progress': '#2563eb', 'In Review': '#7c3aed', 'To Do': '#6b7280',
    };

    // ── Follow-up HTML for a list of FollowUps ──────────────────────────────
    const fuHtml = (fus: FollowUp[], isSub = false) => {
      if (!fus || !fus.length) return `<p style="color:#9ca3af;font-size:11px;margin:4px 0">${isSub ? 'No updates' : 'No follow-ups recorded'}</p>`;
      return fus.map(f => {
        const isSuper = f.author && this.filteredBoard.some(t => (t.team || '').toLowerCase() === (f.author || '').toLowerCase());
        const border  = f.decision ? '2px solid #7c3aed' : isSuper ? '2px solid #ea580c' : '1px solid #e5e7eb';
        return `
        <div style="border-left:${border};padding:8px 12px;margin:6px 0;background:${f.decision ? '#faf5ff' : isSuper ? '#fff7ed' : '#f9fafb'};border-radius:0 6px 6px 0">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
            <span style="background:#2563eb;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0">${esc(f.initials || '?')}</span>
            <strong style="font-size:12px;color:#111827">${esc(f.author)}</strong>
            ${isSuper ? '<span style="font-size:10px;background:#fed7aa;color:#9a3412;padding:1px 6px;border-radius:10px;font-weight:600">Supervisor</span>' : ''}
            <span style="font-size:11px;color:#9ca3af;margin-left:auto">${fmtTs(f.timestamp)}</span>
          </div>
          <div style="font-size:12px;color:#374151;line-height:1.5">${f.text || ''}</div>
          ${f.decision ? `<div style="margin-top:6px;font-size:11px;background:#ede9fe;color:#5b21b6;padding:4px 8px;border-radius:4px"><strong>Supervisor Note:</strong> ${esc(f.decision)}</div>` : ''}
          ${f.progress ? `<div style="margin-top:4px;font-size:11px;color:#6b7280">Progress reported: <strong>${f.progress}%</strong></div>` : ''}
        </div>`;
      }).join('');
    };

    // ── Subtask hierarchy HTML ───────────────────────────────────────────────
    const subtasksHtml = (subs: SubTask[]) => {
      if (!subs || !subs.length) return '';
      return `
      <div style="margin-top:14px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:8px">Sub-tasks</div>
        ${subs.map((s, idx) => {
          const isLast = idx === subs.length - 1;
          const stColor = s.done ? '#16a34a' : subStatusColor[s.status || 'open'] || '#6b7280';
          const stLabel = s.done ? 'Done' : subStatusLabel[s.status || 'open'];
          const hasFu   = (s.followUps || []).length > 0;
          return `
          <div style="display:flex;gap:0;margin-left:8px">
            <div style="display:flex;flex-direction:column;align-items:center;margin-right:10px;padding-top:2px">
              <div style="width:2px;height:10px;background:${isLast ? 'transparent' : '#e5e7eb'}"></div>
              <div style="width:8px;height:8px;border-radius:50%;background:${stColor};flex-shrink:0"></div>
              <div style="width:2px;flex:1;background:${isLast ? 'transparent' : '#e5e7eb'}"></div>
            </div>
            <div style="flex:1;padding-bottom:10px">
              <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
                <span style="font-size:12px;font-weight:600;color:#111827">${esc(s.title)}</span>
                <span style="font-size:10px;background:${stColor}18;color:${stColor};padding:1px 6px;border-radius:10px;font-weight:600">${stLabel}</span>
                ${s.assignee ? `<span style="font-size:11px;color:#6b7280">→ ${esc(s.assignee)}</span>` : ''}
                ${s.startDate || s.dueDate ? `<span style="font-size:11px;color:#9ca3af">${fmtDay(s.startDate || '')} – ${fmtDay(s.dueDate || '')}</span>` : ''}
                ${s.dependency ? `<span style="font-size:10px;color:#7c3aed">Dep: ${esc(s.dependency)}</span>` : ''}
              </div>
              ${hasFu ? `<div style="margin-top:6px;padding-left:4px">${fuHtml(s.followUps!, true)}</div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    };

    // ── Per-task card HTML ───────────────────────────────────────────────────
    const byStatus: Record<string, BoardTask[]> = {};
    tasks.forEach(t => { (byStatus[t.status] ??= []).push(t); });

    const taskCardHtml = (t: BoardTask) => {
      const isOverdue = t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done';
      const pCol = priorityColor[t.priority] || '#6b7280';
      const grade = t.supervisorGrade || 0;
      const supervisorFus = (t.followUps || []).filter(f =>
        t.team && (f.author || '').toLowerCase() === t.team.toLowerCase()
      );
      return `
      <div style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:20px;overflow:hidden;break-inside:avoid">
        <!-- Task header -->
        <div style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e5e7eb">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
            <div>
              <h3 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827">${esc(t.title)}</h3>
              <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:11px;color:#6b7280">
                <span>Assignee: <strong style="color:#374151">${esc(t.assignee || '—')}</strong></span>
                <span>·</span>
                <span>Supervisor: <strong style="color:#374151">${esc(t.team || '—')}</strong></span>
                <span>·</span>
                <span>Due: <strong style="color:${isOverdue ? '#dc2626' : '#374151'}">${fmtDay(t.dueDate)}</strong></span>
                <span>·</span>
                <span>Progress: <strong style="color:#374151">${t.progress ?? 0}%</strong></span>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
              <span style="background:${pCol}18;color:${pCol};padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700">${esc(t.priority)}</span>
              ${grade ? `<span style="font-size:13px;color:#f59e0b;letter-spacing:1px" title="Assessment score ${grade}/5">${stars(grade)}</span>` : '<span style="font-size:11px;color:#9ca3af">Not scored</span>'}
            </div>
          </div>
        </div>
        <!-- Description -->
        ${t.description ? `
        <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:6px">Description / Work Done</div>
          <div style="font-size:12px;color:#374151;line-height:1.6">${t.description}</div>
        </div>` : ''}
        <!-- Follow-ups / Work Updates -->
        <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:6px">
            Work Updates &amp; Follow-ups (${(t.followUps || []).length})
          </div>
          ${fuHtml(t.followUps || [])}
        </div>
        <!-- Supervisor's comments section (if they posted follow-ups) -->
        ${supervisorFus.length ? `
        <div style="padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#fff7ed">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9a3412;margin-bottom:6px">
            Supervisor Comments (${supervisorFus.length})
          </div>
          ${fuHtml(supervisorFus)}
        </div>` : ''}
        <!-- Subtask hierarchy -->
        ${(t.subtasks || []).length ? `
        <div style="padding:12px 16px">
          ${subtasksHtml(t.subtasks)}
        </div>` : ''}
      </div>`;
    };

    const sectionHtml = ['To Do', 'In Progress', 'In Review', 'Done']
      .filter(s => byStatus[s]?.length)
      .map(status => `
      <div style="margin-bottom:36px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid ${statusColor[status]}40">
          <span style="width:10px;height:10px;border-radius:50%;background:${statusColor[status]};display:inline-block"></span>
          <h2 style="margin:0;font-size:15px;font-weight:700;color:${statusColor[status]};text-transform:uppercase;letter-spacing:.05em">${status} (${byStatus[status].length})</h2>
        </div>
        ${byStatus[status].map(t => taskCardHtml(t)).join('')}
      </div>`).join('');

    const html = `<!DOCTYPE html><html lang="en"><head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${periodLabel} Task Report — ${fmt(rangeStart)} to ${fmt(rangeEnd)}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 32px; color: #111827; background: #fff; max-width: 900px; margin: 0 auto; }
        @media print {
          body { padding: 16px; max-width: 100%; }
          .no-print { display: none !important; }
          div[style*="break-inside:avoid"] { break-inside: avoid; }
          h2 { break-after: avoid; }
        }
      </style>
    </head><body>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #2e6276">
        <div>
          <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#2e6276">${periodLabel} Task Report</h1>
          <p style="margin:0;font-size:13px;color:#6b7280">${fmt(rangeStart)} — ${fmt(rangeEnd)} &nbsp;·&nbsp; View: ${this.taskViewLabel} &nbsp;·&nbsp; Generated ${fmt(now)}</p>
        </div>
        <button class="no-print" onclick="window.print()" style="background:#2e6276;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer">🖨 Print / Save PDF</button>
      </div>
      <!-- Summary stats -->
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:32px">
        ${[
          ['Total', total, '#2e6276', `${pct}% complete`],
          ['Completed', done, '#16a34a', ''],
          ['In Progress', inProgress, '#2563eb', ''],
          ['In Review', inReview, '#7c3aed', ''],
          ['Overdue', overdue, '#dc2626', ''],
          ['Avg Score', avgScore, '#f59e0b', 'out of 5'],
        ].map(([l, v, c, sub]) => `
          <div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;border-top:4px solid ${c}">
            <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">${l}</div>
            <div style="font-size:22px;font-weight:800;color:${c};margin:4px 0">${v}</div>
            ${sub ? `<div style="font-size:10px;color:#9ca3af">${sub}</div>` : ''}
          </div>`).join('')}
      </div>
      ${sectionHtml}
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
        OptimaX HR · ${periodLabel} Task Report · ${fmt(now)}
      </div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }
}
