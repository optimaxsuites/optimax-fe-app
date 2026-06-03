import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { timeout } from 'rxjs/operators';
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
  PerformanceGoalFull,
  PerformanceGoalDTO,
  KpiDTO,
  AppraisalSubmissionFull,
  AppraisalSubmissionDTO,
  SupervisorReviewFull,
  SupervisorReviewDTO,
} from './work-task-api.service';

export type PMSection = 'board' | 'reports' | 'batch' | 'assessment' | 'supervisor';
export type BoardView = 'board' | 'list' | 'gantt';
type TaskStatus = string; // widened to support custom stages
type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

interface SubTask {
  id: string; title: string; description?: string; done: boolean; assignee: string;
  status?: 'open' | 'ip' | 'blocked';
  startDate?: string; dueDate?: string; dependency?: string;
  subtaskId?: number;
}
interface ActivityEntry { id: string; author: string; text: string; timestamp: string; }
interface FollowUp {
  id: string; author: string; initials: string; color: string;
  timestamp: string; text: string; photos: string[];
  decision?: string; progress?: number;
  followUpId?: number;
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
  // API-sync fields
  apiId?: number;
  assigneeEmployeeId?: number;
  supervisorEmployeeId?: number;
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
      batch: 'Batch Import', assessment: 'Self-Assessment', supervisor: 'Supervisor Review',
    };
    return map[this.pmSection];
  }

  setPmSection(s: PMSection): void {
    this.pmSection = s;
    if (s === 'reports' && !this.execReport && !this.reportsLoading) {
      this.loadReports();
    }
  }

  loadReports(): void {
    this.reportsLoading = true;
    this.reportsError = false;
    this.subscription.add(
      forkJoin({
        exec:      this.reportingService.getExecutiveReport(),
        workforce: this.reportingService.getWorkforceOverview(),
        payroll:   this.reportingService.getPayrollSummary(),
        leave:     this.reportingService.getLeaveAttendance(),
        turnover:  this.reportingService.getEmployeeTurnover(),
        risk:      this.reportingService.getHrRisk(),
        probation: this.reportingService.getProbationTracking(),
        equity:    this.reportingService.getCompensationEquity(),
        bonus:     this.reportingService.getBonusReport(),
        statutory: this.reportingService.getStatutoryRemittance(),
        overtime:  this.reportingService.getOvertimeCost(),
        vacancy:   this.reportingService.getVacancyAging(),
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
  detailTab: 'overview' | 'subtasks' | 'activity' = 'overview';
  newActivityText = '';
  subtaskInput = '';
  showAddTask = false;
  newTask: Partial<BoardTask> = {};

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

  private static readonly STAGE_STORAGE_KEY = 'hr_pm_stages_v1';
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

  get currentUserFullName(): string {
    return (sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || '').toLowerCase();
  }

  // ── Subtask inline edit ───────────────────────────────────────────────────
  editingSubtaskId: string | null = null;
  editingSubtaskTitle = '';
  editingSubtaskDescription = '';

  get boardMetrics(): { label: string; value: string | number; sub: string; color: string }[] {
    const active = this.boardTasks.filter(t => t.status !== 'Done').length;
    const subs = this.boardTasks.reduce((s, t) => s + t.subtasks.length, 0);
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

  // ── Supervisor ─────────────────────────────────────────────────────────────
  supervisorFilter = '';   // filter team tasks by supervisor name

  get myTeamTasks(): BoardTask[] {
    const name = this.supervisorFilter.trim().toLowerCase();
    return this.boardTasks.filter(t =>
      !name || t.team.toLowerCase().includes(name) ||
      (t.assignees || [t.assignee]).some(a => a.toLowerCase().includes(name))
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
    this.batchRows.filter(r => r.title.trim()).forEach(r => {
      const subtaskList: SubTask[] = r.subtasks.split(';').filter(s => s.trim()).map((s, i) => ({
        id: `bst${Date.now()}_${i}`, title: s.trim(), done: false, assignee: r.assignee,
      }));
      const priority: TaskPriority = this.priorities.includes(r.priority.trim() as TaskPriority) ? r.priority.trim() as TaskPriority : 'Medium';
      this.boardTasks.push({
        id: `hr${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: r.title.trim(), description: r.kpiTarget, assignee: r.assignee, team: r.supervisor,
        status: 'To Do', priority, startDate: r.start, dueDate: r.due,
        weight: r.weight, progress: 0, tags: [r.type], subtasks: subtaskList, activity: [], followUps: [],
      });
    });
    this.save();
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
  allEmployees: Array<{ id: string; fullName: string; department: string; role: string; supervisor: string }> = [];
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
  showLightbox = false;
  openLightbox(src: string): void { this.lightboxSrc = src; this.showLightbox = true; }
  closeLightbox(): void { this.showLightbox = false; this.lightboxSrc = ''; }

  // ── Supervisor review form state ───────────────────────────────────────────
  supReviewDecision = 'Approved';
  supReviewNote = '';
  supReviewFiles: Array<{ name: string; url: string; isImage: boolean }> = [];

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
  ) {}

  ngOnInit(): void {
    this.loadChannelUnread();
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
    this.loadBoardFromApi();

    // Load employees for dropdowns
    this.employeesLoading = true;
    this.employeeService.ensureEmployeesLoaded();
    this.subscription.add(
      this.employeeService.employees$.subscribe(emps => {
        this.allEmployees = (emps || [])
          .map((e: any) => {
            const fn = String(e?.firstName || e?.firstname || '').trim();
            const ln = String(e?.lastName || e?.lastname || '').trim();
            const full = (`${fn} ${ln}`).trim() || String(e?.fullName || e?.name || '').trim();
            return {
              id: String(e?.id || ''),
              fullName: full,
              department: String(e?.department?.name || e?.department || ''),
              role: String(e?.jobTitle || e?.designation || ''),
              supervisor: String(e?.supervisor?.fullName || e?.supervisorName || ''),
            };
          })
          .filter(e => !!e.fullName);
        this.employeesLoading = false;
        // If employees loaded, patch supervisor review submissions with real names
        this.patchSubmissionsFromUsers(this.allEmployees);
      })
    );

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
    this.subscription.add(
      this.workTaskApi.getAllTasks().pipe(timeout(8000)).subscribe({
        next: (apiTasks) => {
          if (apiTasks && apiTasks.length > 0) {
            const mapped = apiTasks.map(t => this.mapApiTaskToBoard(t));
            const apiIds = new Set(mapped.map(t => t.id));
            // Keep any local-only tasks from the previous save (imports, manually-added)
            // that the API doesn't know about — they'd be wiped otherwise.
            const localRaw = localStorage.getItem(HR_BOARD_KEY);
            const localOnly: BoardTask[] = localRaw
              ? (JSON.parse(localRaw) as BoardTask[]).filter(t => !apiIds.has(t.id))
              : [];
            this.boardTasks = [...mapped, ...localOnly];
          } else {
            const raw = localStorage.getItem(HR_BOARD_KEY);
            this.boardTasks = raw ? JSON.parse(raw) : [...HR_SEED];
          }
          // Always merge in any locally-imported tasks (Odoo, CSV) that aren't in the API set.
          // persist=true writes merged state to HR_BOARD_KEY so imports survive future refreshes.
          this.mergeLocalImports(true);
          this.boardLoading = false;
          this.autoOpenFromUrl();
        },
        error: () => {
          this.apiEnabled = false;
          const raw = localStorage.getItem(HR_BOARD_KEY);
          this.boardTasks = raw ? JSON.parse(raw) : [...HR_SEED];
          this.mergeLocalImports(true);
          this.boardLoading = false;
          this.autoOpenFromUrl();
        }
      })
    );
  }

  private autoOpenFromUrl(): void {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('taskId');
    if (!taskId) return;
    const found = this.boardTasks.find(t => t.id === taskId || String(t.apiId) === taskId);
    if (found) {
      this.pmSection = 'board';
      this.openDetail(found);
    }
  }

  // Merge tasks imported via Odoo/CSV from the dedicated imports key.
  // When persist=true (called after board state is final), also saves to HR_BOARD_KEY
  // so imports survive future refreshes without needing hr_pm_imports_v1 to be re-read.
  private mergeLocalImports(persist = false): void {
    try {
      const raw = localStorage.getItem('hr_pm_imports_v1');
      if (!raw) return;
      const imported: BoardTask[] = JSON.parse(raw);
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
      const remaining = (JSON.parse(raw) as BoardTask[]).filter(t => t.id !== taskId);
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
      followUps: (t.followUps ?? []).map(f => ({
        id: String(f.id),
        followUpId: f.id,
        author: f.authorEmployee ? `${f.authorEmployee.firstName} ${f.authorEmployee.lastName}`.trim() : 'Unknown',
        initials: this.getInitials(f.authorEmployee ? `${f.authorEmployee.firstName} ${f.authorEmployee.lastName}`.trim() : 'U'),
        color: '#2563eb',
        timestamp: this.formatTs(this.normDateTime((f as any).createdAt)),
        text: f.text,
        photos: f.photoUrls ? f.photoUrls.split(',').filter(u => u.trim()) : [],
        decision: f.decision,
        progress: f.progress ?? 0,
      })),
      apiId: t.id,
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
      localStorage.setItem(HR_BOARD_KEY, JSON.stringify(this.boardTasks));
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
      localStorage.setItem(HR_BOARD_KEY, JSON.stringify(noBase64));
      return;
    } catch { /* still over quota */ }

    // Attempt 3: strip all photos
    try {
      const noPhotos = this.boardTasks.map(t => ({
        ...t,
        followUps: (t.followUps || []).map(fu => ({ ...fu, photos: [] })),
      }));
      localStorage.setItem(HR_BOARD_KEY, JSON.stringify(noPhotos));
    } catch { /* storage unavailable */ }
  }

  private syncTaskToApi(task: BoardTask): void {
    if (!this.apiEnabled) return;
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
    };
    if (task.apiId) {
      this.subscription.add(
        this.workTaskApi.updateTask(task.apiId, dto).subscribe({
          next: (updated) => { task.apiId = updated.id; this.save(); },
          error: () => this.save(),
        })
      );
    } else {
      this.subscription.add(
        this.workTaskApi.createTask(dto).subscribe({
          next: (created) => { task.apiId = created.id; this.save(); },
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
    };
  }

  get filteredBoard(): BoardTask[] {
    const me = this.currentUserFullName;
    const adminView = this.isAdminOrSupervisor;
    return this.boardTasks.filter(t => {
      // Non-admin/supervisor: only own tasks (assignee, multi-assignee list, or supervising)
      if (!adminView && me) {
        const assignee = (t.assignee || '').toLowerCase();
        const inAssignees = (t.assignees || []).some(a => (a || '').toLowerCase().includes(me));
        const isSupervisor = (t.team || '').toLowerCase().includes(me);
        if (!assignee.includes(me) && !inAssignees && !isSupervisor) return false;
      }
      if (this.filterStatus && t.status !== this.filterStatus) return false;
      if (this.filterPriority && t.priority !== this.filterPriority) return false;
      if (this.filterAssignee && !t.assignee.toLowerCase().includes(this.filterAssignee.toLowerCase())) return false;
      if (this.searchText && !t.title.toLowerCase().includes(this.searchText.toLowerCase())) return false;
      return true;
    });
  }

  columnTasks(status: TaskStatus): BoardTask[] { return this.filteredBoard.filter(t => t.status === status); }
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

  openDetail(task: BoardTask): void { this.selectedTask = task; this.detailTab = 'overview'; this.newActivityText = ''; }
  closeDetail(): void { this.selectedTask = null; this.save(); }

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

  addTask(): void {
    const t = this.newTask as BoardTask;
    if (!t.title?.trim()) return;
    t.id = `hr${Date.now()}`;
    t.followUps = t.followUps ?? [];
    // Primary assignee is first in the multi-select list
    if (t.assignees?.length) t.assignee = t.assignees[0];
    // Resolve employee IDs from selected names
    const assigneeEmp = this.allEmployees.find(e => e.fullName === t.assignee);
    const supervisorEmp = this.allEmployees.find(e => e.fullName === t.team);
    t.assigneeEmployeeId = assigneeEmp ? Number(assigneeEmp.id) : undefined;
    t.supervisorEmployeeId = supervisorEmp ? Number(supervisorEmp.id) : undefined;

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
    this.editTaskDraft = { ...task, tags: [...(task.tags || [])] };
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
    const aEmp = this.allEmployees.find(e => e.fullName === t.assignee);
    const sEmp = this.allEmployees.find(e => e.fullName === t.team);
    if (aEmp) t.assigneeEmployeeId   = Number(aEmp.id);
    if (sEmp) t.supervisorEmployeeId = Number(sEmp.id);
    this.save();
    this.showEditTask = false;
    this.editingTask  = null;
    this.showToast('Task updated', 'success');
    if (this.apiEnabled) this.syncTaskToApi(t);
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

  toggleRow(task: BoardTask): void { task.expanded = !task.expanded; }

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
  completedSubtasks(task: BoardTask): number { return task.subtasks.filter(s => s.done).length; }
  priorityClass(p: string): string { return `priority-${p.toLowerCase()}`; }
  statusClass(s: string): string { return `status-${s.toLowerCase().replace(/\s+/g, '-')}`; }
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
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  avatarColor(name: string): string {
    const palette = ['#2563eb','#7c3aed','#0891b2','#16a34a','#d97706','#dc2626','#9333ea','#0d9488'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
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
          if (res.url) entry.url = res.url;
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

  // ── Post supervisor review ─────────────────────────────────────────────────
  postSupervisorReview(): void {
    if (!this.selectedTask) return;
    if (!this.supReviewNote.trim()) { this.showToast('Please enter review feedback before submitting.', 'warn'); return; }

    const decisionLabel = this.supReviewDecision;
    const photos = this.supReviewFiles.map(f => f.url);
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

    this.supReviewNote = '';
    this.supReviewDecision = 'Approved';
    this.supReviewFiles = [];
    this.save();
    this.showToast('Supervisor review posted', 'success');

    if (this.apiEnabled && this.selectedTask.apiId) {
      const dto: FollowUpDTO = {
        workTaskId: this.selectedTask.apiId,
        text: fu.text,
        decision: fu.decision,
        progress: fu.progress,
        photoUrls: photos.join(','),
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
    const taskUrl = `${window.location.origin}/admin/hr/performance/${encodeURIComponent(window.location.pathname.split('/').pop() || 'uu')}`;
    this.shareNote = [
      `📋 *Task: ${task.title}*`,
      `🚦 Status: ${task.status}  |  ⚡ Priority: ${task.priority}`,
      `👥 Assignee(s): ${assigneeList}`,
      `📅 Due: ${task.dueDate ? this.formatDate(task.dueDate) : '—'}  |  📊 Progress: ${task.progress}%`,
      task.tags?.length ? `🏷️ Tags: ${task.tags.join(', ')}` : '',
      ``,
      `🔗 View task: ${taskUrl}?taskId=${task.id}`,
      ``,
      `Note: `,
    ].filter(l => l !== undefined).join('\n');

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

  submitShare(): void {
    if (!this.shareNote.trim()) { this.showToast('Please enter a message to share.', 'warn'); return; }

    const task = this.shareTaskRef;
    if (this.shareTarget === 'channel') {
      if (!this.shareChannelId) { this.showToast('Please select a channel.', 'warn'); return; }
      const ch = this.availableChannels.find(c => c.id === this.shareChannelId);
      this.showShareModal = false;
      this.subscription.add(
        this.workTaskApi.sendChannelMessage(this.shareChannelId, this.shareNote).subscribe({
          next: () => {
            this.showToast(`Task update posted to #${ch?.name || 'channel'}`, 'success');
            if (task) this.notifService.add(`Shared to #${ch?.name || 'channel'}`, `"${task.title}" was shared`, ch?.name || 'channel', task.id);
            this.incrementChannelUnread(this.shareChannelId!);
          },
          error: () => this.showToast('Failed to post to channel. Check connection.', 'error'),
        })
      );
    } else if (this.shareTarget === 'supervisor') {
      this.showShareModal = false;
      this.showToast(`Update sent to ${this.shareChannelOrUser || 'supervisor'}`, 'success');
      if (task && this.shareChannelOrUser) this.notifService.add(`Task shared with supervisor`, `"${task.title}" shared to ${this.shareChannelOrUser}`, this.shareChannelOrUser, task.id);
    } else {
      this.showShareModal = false;
      this.showToast(`Message sent to ${this.shareChannelOrUser || 'user'}`, 'success');
      if (task && this.shareChannelOrUser) this.notifService.add(`Task shared`, `"${task.title}" sent to ${this.shareChannelOrUser}`, this.shareChannelOrUser, task.id);
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
}
