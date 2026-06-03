import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

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
} from './hr-reporting.service';
import { EmployeeService } from '../../service/employee.service';

export type PMSection = 'board' | 'reports' | 'batch' | 'assessment' | 'supervisor';
export type BoardView = 'board' | 'list' | 'gantt';
type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done';
type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

interface SubTask {
  id: string; title: string; done: boolean; assignee: string;
  status?: 'open' | 'ip' | 'blocked';
  startDate?: string; dueDate?: string; dependency?: string;
}
interface ActivityEntry { id: string; author: string; text: string; timestamp: string; }
interface FollowUp {
  id: string; author: string; initials: string; color: string;
  timestamp: string; text: string; photos: string[];
  decision?: string; progress?: number;
}

export interface BoardTask {
  id: string; title: string; description: string; assignee: string; team: string;
  status: TaskStatus; priority: TaskPriority; dueDate: string; startDate: string;
  weight: number; progress: number; tags: string[];
  subtasks: SubTask[]; activity: ActivityEntry[];
  followUps: FollowUp[];
  inlineText?: string;
  expanded?: boolean;
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
    assignee: 'HR Manager', team: 'HR Operations', status: 'In Progress', priority: 'High',
    startDate: '2026-06-01', dueDate: '2026-06-15', weight: 25, progress: 50, tags: ['Workplan'],
    subtasks: [
      { id: 'hst1', title: 'Define review criteria', done: true, assignee: 'HR Manager', status: 'open' },
      { id: 'hst2', title: 'Set scoring rubrics', done: false, assignee: 'HR Manager', status: 'ip' },
      { id: 'hst3', title: 'Notify employees', done: false, assignee: 'HR Admin', status: 'open' },
    ],
    activity: [{ id: 'ha1', author: 'HR Manager', text: 'Criteria defined, moving to scoring rubrics.', timestamp: '2026-06-02T09:00:00Z' }],
    followUps: [
      { id: 'fu1', author: 'HR Manager', initials: 'HM', color: '#2563eb', timestamp: 'Jun 2, 09:00',
        text: 'Criteria defined and approved. Moving to scoring rubrics — template drafted, awaiting HRBP review before distribution to staff.', photos: [], progress: 50 },
    ],
  },
  {
    id: 'hr2', title: 'Goal-Setting Workshop — Q3',
    description: 'Facilitate department-wide goal-setting sessions for Q3 across all business units.',
    assignee: 'L&D Lead', team: 'Learning & Development', status: 'To Do', priority: 'Medium',
    startDate: '2026-06-10', dueDate: '2026-06-20', weight: 15, progress: 0, tags: ['Routine'],
    subtasks: [
      { id: 'hst4', title: 'Book venues', done: false, assignee: 'L&D Lead', status: 'open' },
      { id: 'hst4b', title: 'Prepare facilitator guide', done: false, assignee: 'L&D Lead', status: 'open' },
    ],
    activity: [],
    followUps: [],
  },
  {
    id: 'hr3', title: 'Competency Framework Review',
    description: 'Update the organisational competency framework to reflect 2026 strategy.',
    assignee: 'HRBP', team: 'HR Strategy', status: 'In Review', priority: 'Critical',
    startDate: '2026-05-20', dueDate: '2026-06-07', weight: 30, progress: 80, tags: ['Workplan'],
    subtasks: [
      { id: 'hst5', title: 'Benchmark competitors', done: true, assignee: 'HRBP', status: 'open' },
      { id: 'hst6', title: 'Board sign-off', done: false, assignee: 'MD', status: 'blocked' },
    ],
    activity: [{ id: 'ha2', author: 'HRBP', text: 'Benchmarking complete. Sent to board for sign-off.', timestamp: '2026-06-01T15:00:00Z' }],
    followUps: [
      { id: 'fu2', author: 'MD (Supervisor)', initials: 'MD', color: '#7c3aed', timestamp: 'Jun 1, 15:00',
        text: 'Board sign-off requires updated 2026 benchmarking comparators. Please reattach with current data and resubmit before Jun 5.', photos: [], decision: 'Changes', progress: 80 },
      { id: 'fu3', author: 'HRBP', initials: 'HB', color: '#2563eb', timestamp: 'Jun 1, 10:00',
        text: 'Benchmarking complete across 6 peer organisations. Framework draft sent to MD for final sign-off. Awaiting board slot.', photos: [], progress: 80 },
    ],
  },
  {
    id: 'hr4', title: 'Succession Planning Report',
    description: 'Identify critical roles and map succession candidates for C-suite.',
    assignee: 'HR Director', team: 'Talent', status: 'Done', priority: 'High',
    startDate: '2026-05-01', dueDate: '2026-05-30', weight: 20, progress: 100, tags: ['Workplan'],
    subtasks: [
      { id: 'hst7', title: 'Identify critical roles', done: true, assignee: 'HR Director', status: 'open' },
      { id: 'hst8', title: 'Map candidates', done: true, assignee: 'HR Director', status: 'open' },
      { id: 'hst9', title: 'Present to board', done: true, assignee: 'HR Director', status: 'open' },
    ],
    activity: [{ id: 'ha3', author: 'HR Director', text: 'Report presented and approved.', timestamp: '2026-05-30T10:00:00Z' }],
    followUps: [
      { id: 'fu4', author: 'MD (Supervisor)', initials: 'MD', color: '#16a34a', timestamp: 'May 30, 10:00',
        text: 'Report presented and unanimously approved by the board. Succession plan will be integrated into the 2027 talent strategy.', photos: [], decision: 'Approved', progress: 100 },
    ],
  },
  {
    id: 'hr5', title: 'Employee Satisfaction Survey',
    description: 'Deploy the bi-annual employee satisfaction survey across all units.',
    assignee: 'OD Specialist', team: 'Org Development', status: 'To Do', priority: 'Medium',
    startDate: '2026-06-15', dueDate: '2026-06-30', weight: 10, progress: 0, tags: ['Routine'],
    subtasks: [
      { id: 'hst10', title: 'Design questionnaire', done: false, assignee: 'OD Specialist', status: 'open' },
      { id: 'hst11', title: 'Set up survey platform', done: false, assignee: 'OD Specialist', status: 'open' },
    ],
    activity: [],
    followUps: [],
  },
];

const HR_BOARD_KEY = 'hr_pm_board_tasks';

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
        exec: this.reportingService.getExecutiveReport(),
        workforce: this.reportingService.getWorkforceOverview(),
        payroll: this.reportingService.getPayrollSummary(),
        leave: this.reportingService.getLeaveAttendance(),
        turnover: this.reportingService.getEmployeeTurnover(),
      }).subscribe({
        next: (data) => {
          this.execReport = data.exec;
          this.workforceReport = data.workforce;
          this.payrollReport = data.payroll;
          this.leaveReport = data.leave;
          this.turnoverReport = data.turnover;
          this.reportsLoading = false;
        },
        error: () => {
          this.reportsError = true;
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

  readonly columns: Array<{ key: TaskStatus; label: string }> = [
    { key: 'To Do', label: 'To Do' },
    { key: 'In Progress', label: 'In Progress' },
    { key: 'In Review', label: 'In Review' },
    { key: 'Done', label: 'Done' },
  ];
  readonly statuses: TaskStatus[] = ['To Do', 'In Progress', 'In Review', 'Done'];
  readonly priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

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
  employeeSubmissions: EmployeeSubmission[] = [
    {
      id: 'e1', initials: 'DA', name: 'Damilola A.', role: 'Senior Manager', department: 'Risk & Compliance',
      color: '#2563eb', avgSelfScore: 4.0, supScore: 4, status: 'pending', open: true, reviewedNote: '',
      goals: [
        { title: 'Q2 NPL Report Submission', weight: 20, selfScore: 4, evidenceCount: 2 },
        { title: 'Compliance Audit Prep', weight: 25, selfScore: 5, evidenceCount: 1 },
        { title: 'Credit Risk Analysis', weight: 20, selfScore: 3, evidenceCount: 1 },
        { title: 'Team Training Coordination', weight: 20, selfScore: 0, evidenceCount: 0 },
        { title: 'IFRS 9 Filing Support', weight: 15, selfScore: 0, evidenceCount: 0 },
      ],
      reviewNote: 'Solid work overall. NPL submission remains open — please close by Jun 3 as committed. All other deliverables met standard.',
      decision: 'approved',
    },
    {
      id: 'e2', initials: 'JO', name: 'John Obi', role: 'Analyst', department: 'IFRS & Reporting',
      color: '#16a34a', avgSelfScore: 3.5, supScore: 4, status: 'reviewed', open: false,
      reviewedNote: 'Strong IFRS 9 contribution. Data extraction completed ahead of schedule. Disclosure note review on track for Jun 15.',
      goals: [
        { title: 'IFRS 9 Data Extraction', weight: 30, selfScore: 4, evidenceCount: 2 },
        { title: 'Impairment Model Support', weight: 35, selfScore: 3, evidenceCount: 1 },
        { title: 'Disclosure Note Review', weight: 35, selfScore: 3, evidenceCount: 0 },
      ],
      reviewNote: '', decision: 'approved',
    },
    {
      id: 'e3', initials: 'FK', name: 'Fatima K.', role: 'Senior Analyst', department: 'Payroll & Audit',
      color: '#d97706', avgSelfScore: 4.2, supScore: 0, status: 'pending', open: false, reviewedNote: '',
      goals: [
        { title: 'Payroll Variance Audit', weight: 40, selfScore: 5, evidenceCount: 3 },
        { title: 'Branch Compliance Checks', weight: 35, selfScore: 4, evidenceCount: 2 },
        { title: 'Remediation Report', weight: 25, selfScore: 3, evidenceCount: 1 },
      ],
      reviewNote: '', decision: 'approved',
    },
    {
      id: 'e4', initials: 'AS', name: 'Amara S.', role: 'Manager', department: 'Financial Reporting',
      color: '#7c3aed', avgSelfScore: 3.8, supScore: 0, status: 'pending', open: false, reviewedNote: '',
      goals: [
        { title: 'Q1 Financial Statements', weight: 40, selfScore: 4, evidenceCount: 2 },
        { title: 'Management Accounts', weight: 35, selfScore: 4, evidenceCount: 1 },
        { title: 'FINREP Submission', weight: 25, selfScore: 3, evidenceCount: 1 },
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

  constructor(
    private readonly productivityDataService: ProductivityDataService,
    private readonly productivityReviewService: ProductivityReviewService,
    private readonly reportingService: HrReportingService,
    private readonly employeeService: EmployeeService,
  ) {}

  ngOnInit(): void {
    this.productivityDataService.init();
    this.productivityReviewService.init();
    this.subscription.add(
      this.productivityDataService.workspace$.subscribe(w => {
        this.metrics = w.metrics; this.tasks = w.tasks; this.cycles = w.cycles;
        this.scorecards = w.scorecards; this.leaderboard = w.leaderboard;
        this.trendPoints = w.trendPoints; this.insights = w.insights;
      })
    );
    const raw = localStorage.getItem(HR_BOARD_KEY);
    this.boardTasks = raw ? JSON.parse(raw) : [...HR_SEED];
    this.buildGantt();
    this.initNewTask();

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
      })
    );
  }

  ngOnDestroy(): void { this.subscription.unsubscribe(); }

  // ── Board methods ──────────────────────────────────────────────────────────
  private save(): void { localStorage.setItem(HR_BOARD_KEY, JSON.stringify(this.boardTasks)); }

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
      id: `hr${Date.now()}`, title: '', description: '', assignee: '', team: '',
      status: 'To Do', priority: 'Medium', startDate: new Date().toISOString().slice(0, 10),
      dueDate: '', weight: 10, progress: 0, tags: [], subtasks: [], activity: [],
    };
  }

  get filteredBoard(): BoardTask[] {
    return this.boardTasks.filter(t => {
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
      event.container.data[event.currentIndex].status = targetStatus;
    }
    this.save();
  }

  openDetail(task: BoardTask): void { this.selectedTask = task; this.detailTab = 'overview'; this.newActivityText = ''; }
  closeDetail(): void { this.selectedTask = null; this.save(); }

  toggleSubtask(task: BoardTask, sub: SubTask): void {
    sub.done = !sub.done;
    if (task.subtasks.length) task.progress = Math.round((task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100);
    this.save();
  }

  addSubtask(task: BoardTask, title: string): void {
    if (!title.trim()) return;
    task.subtasks.push({ id: `st${Date.now()}`, title: title.trim(), done: false, assignee: task.assignee });
    this.save();
  }

  postActivity(): void {
    if (!this.selectedTask || !this.newActivityText.trim()) return;
    this.selectedTask.activity.unshift({
      id: `act${Date.now()}`, author: sessionStorage.getItem('fullName') || 'You',
      text: this.newActivityText.trim(), timestamp: new Date().toISOString(),
    });
    this.newActivityText = '';
    this.save();
  }

  addTask(): void {
    const t = this.newTask as BoardTask;
    if (!t.title?.trim()) return;
    t.id = `hr${Date.now()}`;
    this.boardTasks.unshift({ ...t });
    this.save();
    this.showAddTask = false;
    this.initNewTask();
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
    const fmt = (n: number | null | undefined) => n != null ? `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'N/A';
    return [
      { label: 'Total Gross Pay', value: fmt(r.totalGrossPay), color: '#2563eb' },
      { label: 'Total Net Payable', value: fmt(r.totalNetPayable), color: '#16a34a' },
      { label: 'Total Deductions', value: fmt(r.totalDeductions), color: '#dc2626' },
      { label: 'Total Employer Cost', value: fmt(r.totalEmployerCost), color: '#d97706' },
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

  todayColumn(): number { return Math.floor((new Date().getTime() - this.ganttStart.getTime()) / 86400000) + 1; }
  completedSubtasks(task: BoardTask): number { return task.subtasks.filter(s => s.done).length; }
  priorityClass(p: string): string { return `priority-${p.toLowerCase()}`; }
  statusClass(s: string): string { return `status-${s.toLowerCase().replace(/\s+/g, '-')}`; }
  formatDate(d: string): string {
    if (!d) return '—';
    try { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d)); }
    catch { return d; }
  }
  formatTs(iso: string): string {
    try { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
    catch { return iso; }
  }
  get uniqueAssignees(): string[] { return [...new Set(this.boardTasks.map(t => t.assignee))].filter(Boolean); }

  subDotClass(sub: SubTask): string {
    if (sub.done) return 'done';
    if (sub.status === 'blocked') return 'blocked';
    if (sub.status === 'ip') return 'ip';
    return 'open';
  }

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

  taskPriorityBadge(priority: string): string {
    const m: Record<string, string> = { Low: 'b-green', Medium: 'b-yellow', High: 'b-red', Critical: 'b-red' };
    return m[priority] || 'b-gray';
  }

  postInlineUpdate(task: BoardTask, event: Event): void {
    event.stopPropagation();
    if (!task.inlineText?.trim()) return;
    task.followUps = task.followUps || [];
    task.followUps.unshift({
      id: `fu${Date.now()}`, author: task.assignee || 'You',
      initials: this.getInitials(task.assignee || 'You'), color: '#2563eb',
      timestamp: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()),
      text: task.inlineText.trim(), photos: [], progress: task.progress,
    });
    task.inlineText = '';
    this.save();
  }
}
