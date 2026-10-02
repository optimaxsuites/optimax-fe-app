import { Component, OnInit, OnDestroy } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';
import { TaskReminderService, TaskReminder, ReminderOffset } from './task-reminder.service';

export type ViewMode = 'board' | 'list' | 'gantt';
export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
  assignee: string;
}

export interface ActivityEntry {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface BoardTask {
  id: string;
  title: string;
  description: string;
  assignee: string;
  team: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  startDate: string;
  weight: number;
  progress: number;
  tags: string[];
  subtasks: SubTask[];
  activity: ActivityEntry[];
  expanded?: boolean;
  reminderOffset?: ReminderOffset;
  reminderNote?: string;
}

const SEED_TASKS: BoardTask[] = [
  {
    id: 't1', title: 'Q3 Performance Report Compilation',
    description: 'Compile all departmental KPIs and produce the quarterly executive summary.',
    assignee: 'Adaeze Obi', team: 'HR Analytics', status: 'In Progress', priority: 'High',
    startDate: '2026-05-20', dueDate: '2026-06-10', weight: 30, progress: 60, tags: ['report', 'Q3'],
    subtasks: [
      { id: 'st1', title: 'Collect dept data', done: true, assignee: 'Adaeze Obi' },
      { id: 'st2', title: 'Normalize metrics', done: true, assignee: 'Adaeze Obi' },
      { id: 'st3', title: 'Draft executive summary', done: false, assignee: 'Adaeze Obi' },
    ],
    activity: [{ id: 'a1', author: 'Adaeze Obi', text: 'Data from 6 departments collected. Normalization complete.', timestamp: '2026-05-28T09:14:00Z' }],
  },
  {
    id: 't2', title: 'Onboarding Process Redesign',
    description: 'Redesign the 30-60-90 day onboarding plan for new hires across all units.',
    assignee: 'Chukwuemeka Eze', team: 'Talent', status: 'To Do', priority: 'Medium',
    startDate: '2026-06-02', dueDate: '2026-06-25', weight: 20, progress: 0, tags: ['onboarding', 'talent'],
    subtasks: [
      { id: 'st4', title: 'Review current plan', done: false, assignee: 'Chukwuemeka Eze' },
      { id: 'st5', title: 'Interview new hires', done: false, assignee: 'Chukwuemeka Eze' },
    ],
    activity: [],
  },
  {
    id: 't3', title: 'Payroll Variance Audit',
    description: 'Identify and resolve salary variance anomalies flagged in the May payroll run.',
    assignee: 'Fatima Al-Hassan', team: 'Payroll', status: 'In Review', priority: 'Critical',
    startDate: '2026-05-28', dueDate: '2026-06-05', weight: 25, progress: 85, tags: ['payroll', 'audit'],
    subtasks: [
      { id: 'st6', title: 'Pull variance report', done: true, assignee: 'Fatima Al-Hassan' },
      { id: 'st7', title: 'Cross-reference HRIS', done: true, assignee: 'Fatima Al-Hassan' },
      { id: 'st8', title: 'Remediation sign-off', done: false, assignee: 'CFO' },
    ],
    activity: [
      { id: 'a2', author: 'Fatima Al-Hassan', text: '3 anomalies identified — two resolved, one pending CFO sign-off.', timestamp: '2026-06-01T14:30:00Z' },
    ],
  },
  {
    id: 't4', title: 'Training Needs Analysis',
    description: 'Survey all departments and map skill gaps against the 2026 strategic plan.',
    assignee: 'Ngozi Adeleke', team: 'L&D', status: 'To Do', priority: 'Medium',
    startDate: '2026-06-05', dueDate: '2026-06-30', weight: 15, progress: 0, tags: ['training'],
    subtasks: [{ id: 'st9', title: 'Build survey form', done: false, assignee: 'Ngozi Adeleke' }],
    activity: [],
  },
  {
    id: 't5', title: 'Leave Policy Update',
    description: 'Revise maternity/paternity leave policy to align with new labour law amendments.',
    assignee: 'Emeka Okpara', team: 'HR Compliance', status: 'Done', priority: 'High',
    startDate: '2026-05-01', dueDate: '2026-05-30', weight: 10, progress: 100, tags: ['policy', 'compliance'],
    subtasks: [
      { id: 'st10', title: 'Legal review', done: true, assignee: 'Legal' },
      { id: 'st11', title: 'Board approval', done: true, assignee: 'Emeka Okpara' },
      { id: 'st12', title: 'Publish updated policy', done: true, assignee: 'Emeka Okpara' },
    ],
    activity: [{ id: 'a3', author: 'Emeka Okpara', text: 'Policy published and shared with all staff.', timestamp: '2026-05-30T11:00:00Z' }],
  },
  {
    id: 't6', title: 'HRIS Data Cleanup',
    description: 'Audit and correct stale employee records in the HRIS before the annual reporting cycle.',
    assignee: 'Blessing Nwosu', team: 'HR Ops', status: 'In Progress', priority: 'Low',
    startDate: '2026-05-15', dueDate: '2026-06-15', weight: 10, progress: 40, tags: ['HRIS', 'data'],
    subtasks: [
      { id: 'st13', title: 'Export stale records', done: true, assignee: 'Blessing Nwosu' },
      { id: 'st14', title: 'Validate against contracts', done: false, assignee: 'Blessing Nwosu' },
    ],
    activity: [],
  },
];

const STORAGE_KEY = 'pm_board_tasks';

@Component({
  selector: 'app-productivity-tasks-page',
  templateUrl: './productivity-tasks-page.component.html',
  styleUrls: ['./productivity-tasks-page.component.scss'],
})
export class ProductivityTasksPageComponent implements OnInit, OnDestroy {
  viewMode: ViewMode = 'board';
  allTasks: BoardTask[] = [];

  filterStatus = '';
  filterPriority = '';
  filterAssignee = '';
  searchText = '';

  selectedTask: BoardTask | null = null;
  detailTab: 'overview' | 'subtasks' | 'activity' = 'overview';

  showAddTask = false;
  showBatch = false;
  batchText = '';
  newActivityText = '';

  newTask: Partial<BoardTask> = {};

  pendingAlerts: TaskReminder[] = [];

  readonly reminderOptions: Array<{ value: ReminderOffset; label: string }> = [
    { value: 'none',    label: 'No reminder' },
    { value: '1_day',   label: '1 day before due date' },
    { value: '3_days',  label: '3 days before due date' },
    { value: '1_week',  label: '1 week before due date' },
    { value: '2_weeks', label: '2 weeks before due date' },
  ];

  private reminderSub?: Subscription;

  constructor(readonly reminderService: TaskReminderService) {}

  readonly columns: Array<{ key: TaskStatus; label: string }> = [
    { key: 'To Do', label: 'To Do' },
    { key: 'In Progress', label: 'In Progress' },
    { key: 'In Review', label: 'In Review' },
    { key: 'Done', label: 'Done' },
  ];

  readonly priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
  readonly statuses: TaskStatus[] = ['To Do', 'In Progress', 'In Review', 'Done'];

  ganttDays: string[] = [];
  ganttStart!: Date;

  ngOnInit(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    this.allTasks = raw ? JSON.parse(raw) : [...SEED_TASKS];
    this.buildGantt();
    this.initNewTask();
    this.reminderSub = this.reminderService.onReminderFired.subscribe(r => {
      this.pendingAlerts.unshift(r);
    });
    this.reminderService.startPolling();
  }

  ngOnDestroy(): void {
    this.reminderSub?.unsubscribe();
    this.reminderService.stopPolling();
  }

  dismissAlert(index: number): void {
    this.pendingAlerts.splice(index, 1);
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.allTasks));
  }

  private buildGantt(): void {
    const today = new Date();
    this.ganttStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    const days: string[] = [];
    const cur = new Date(this.ganttStart);
    while (cur <= end) {
      days.push(`${cur.getMonth() + 1}/${cur.getDate()}`);
      cur.setDate(cur.getDate() + 1);
    }
    this.ganttDays = days;
  }

  private initNewTask(): void {
    this.newTask = {
      id: `t${Date.now()}`,
      title: '', description: '', assignee: '', team: '',
      status: 'To Do', priority: 'Medium',
      startDate: new Date().toISOString().slice(0, 10), dueDate: '',
      weight: 10, progress: 0, tags: [], subtasks: [], activity: [],
      reminderOffset: 'none', reminderNote: '',
    };
  }

  get filteredTasks(): BoardTask[] {
    return this.allTasks.filter(t => {
      if (this.filterStatus && t.status !== this.filterStatus) return false;
      if (this.filterPriority && t.priority !== this.filterPriority) return false;
      if (this.filterAssignee && !t.assignee.toLowerCase().includes(this.filterAssignee.toLowerCase())) return false;
      if (this.searchText && !t.title.toLowerCase().includes(this.searchText.toLowerCase())) return false;
      return true;
    });
  }

  columnTasks(status: TaskStatus): BoardTask[] {
    return this.filteredTasks.filter(t => t.status === status);
  }

  colId(status: TaskStatus): string {
    return `col-${status.replace(/\s/g, '-')}`;
  }

  connectedTo(status: TaskStatus): string[] {
    return this.statuses.filter(s => s !== status).map(s => this.colId(s));
  }

  drop(event: CdkDragDrop<BoardTask[]>, targetStatus: TaskStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      event.container.data[event.currentIndex].status = targetStatus;
    }
    this.save();
  }

  openDetail(task: BoardTask): void {
    this.selectedTask = task;
    this.detailTab = 'overview';
    this.newActivityText = '';
  }

  closeDetail(): void {
    this.selectedTask = null;
    this.save();
  }

  toggleSubtask(task: BoardTask, sub: SubTask): void {
    sub.done = !sub.done;
    if (task.subtasks.length) {
      task.progress = Math.round((task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100);
    }
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
      id: `act${Date.now()}`,
      author: sessionStorage.getItem('fullName') || 'You',
      text: this.newActivityText.trim(),
      timestamp: new Date().toISOString(),
    });
    this.newActivityText = '';
    this.save();
  }

  addTask(): void {
    const t = this.newTask as BoardTask;
    if (!t.title?.trim()) return;
    t.id = `t${Date.now()}`;
    this.allTasks.unshift({ ...t });
    this.save();
    if (t.reminderOffset && t.reminderOffset !== 'none' && t.dueDate) {
      this.reminderService.schedule(
        t.id, t.title, t.dueDate,
        t.reminderOffset,
        t.reminderNote || undefined,
        t.assignee || undefined,
      );
    }
    this.showAddTask = false;
    this.initNewTask();
  }

  importBatch(): void {
    const lines = this.batchText.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const parts = line.split('\t');
      const title = parts[0] || '';
      const assignee = parts[1] || '';
      const team = parts[2] || '';
      const dueDate = parts[3] || '';
      const rawStatus = parts[4] || 'To Do';
      const rawPriority = parts[5] || 'Medium';
      if (!title.trim()) return;
      const status: TaskStatus = this.statuses.includes(rawStatus.trim() as TaskStatus)
        ? rawStatus.trim() as TaskStatus : 'To Do';
      const priority: TaskPriority = this.priorities.includes(rawPriority.trim() as TaskPriority)
        ? rawPriority.trim() as TaskPriority : 'Medium';
      this.allTasks.push({
        id: `t${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: title.trim(), description: '', assignee: assignee.trim(), team: team.trim(),
        status, priority, startDate: new Date().toISOString().slice(0, 10),
        dueDate: dueDate.trim(), weight: 10, progress: 0, tags: [], subtasks: [], activity: [],
      });
    });
    this.save();
    this.showBatch = false;
    this.batchText = '';
  }

  ganttColumn(startDate: string, dueDate: string): string {
    const start = new Date(startDate || new Date());
    const end = new Date(dueDate || new Date());
    const col1 = Math.max(1, Math.floor((start.getTime() - this.ganttStart.getTime()) / 86400000) + 1);
    const col2 = Math.max(col1 + 1, Math.floor((end.getTime() - this.ganttStart.getTime()) / 86400000) + 2);
    return `${col1} / ${Math.min(col2, this.ganttDays.length + 1)}`;
  }

  todayColumn(): number {
    return Math.floor((new Date().getTime() - this.ganttStart.getTime()) / 86400000) + 1;
  }

  priorityClass(p: string): string {
    return `priority-${p.toLowerCase()}`;
  }

  statusClass(s: string): string {
    return `status-${s.toLowerCase().replace(/\s+/g, '-')}`;
  }

  completedSubtasks(task: BoardTask): number {
    return task.subtasks.filter(s => s.done).length;
  }

  formatTs(iso: string): string {
    try {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    } catch { return iso; }
  }

  formatDate(d: string): string {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d));
    } catch { return d; }
  }

  toggleRow(task: BoardTask): void {
    task.expanded = !task.expanded;
  }

  get uniqueAssignees(): string[] {
    return [...new Set(this.allTasks.map(t => t.assignee))].filter(Boolean);
  }

  subtaskInput = '';
}
