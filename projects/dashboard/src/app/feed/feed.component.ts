import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HeaderStateService } from '../../../../../src/app/ui/shared/service/header-state.service';
import { environment } from '../ui/sharedComponent/service/environments/environment';
import {
  CollaborationService,
  TaskRoutinePlan,
  TaskRoutineReview,
  TaskRoutineStaffOption,
  TaskRoutineSummary,
  TaskRoutineUpdate,
  TaskRoutineWorkItem,
  TaskRoutineAttachment,
} from '../ui/services/collaboration.service';

// damilola worked on this: rebuilt tasks and routines into an enterprise planner with sticky-board and gantt views.
type TaskLane = 'BACKLOG' | 'TODAY' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
type ComposeMode = 'sticky' | 'form' | 'batch';
type PlannerVisualMode = 'sticky' | 'gantt';
type ReviewDecision = 'APPROVED' | 'CHANGES' | 'NOTED';
type DependencyType = 'NONE' | 'PROJECT' | 'PERSON';
type TaskPriority = 'Low' | 'Medium' | 'High';
type RoutineType = 'Daily' | 'Routine' | 'Workplan';
type TaskStatusBucket = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
type WorkItemStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';

interface TaskAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  previewUrl?: string;
}

interface TaskUpdate {
  id: string;
  authorUserId?: number | null;
  author: string;
  note: string;
  progress: number;
  createdAt: string;
}

interface TaskReview {
  id: string;
  reviewerUserId?: number | null;
  reviewer: string;
  decision: ReviewDecision;
  note: string;
  createdAt: string;
  emailPreview?: string;
  attachments: TaskAttachment[];
}

interface TaskWorkItem {
  id: string;
  title: string;
  ownerUserId?: number | null;
  owner: string;
  timelineStart: string;
  timelineDue: string;
  dependency: string;
  status: WorkItemStatus;
  progress: number;
}

interface DraftWorkItem {
  title: string;
  owner: string;
  timelineStart: string;
  timelineDue: string;
  dependency: string;
  status: WorkItemStatus;
  progress: number;
}

interface RoutineTask {
  id: string;
  title: string;
  description: string;
  ownerUserId?: number | null;
  assigneeUserId?: number | null;
  supervisorUserId?: number | null;
  lane: TaskLane;
  progress: number;
  owner: string;
  assignee: string;
  timelineStart: string;
  timelineDue: string;
  routineType: RoutineType;
  priority: TaskPriority;
  dependencyType: DependencyType;
  dependencyValue: string;
  projectName: string;
  tags: string[];
  attachments: TaskAttachment[];
  updates: TaskUpdate[];
  reviews: TaskReview[];
  workItems: TaskWorkItem[];
  sharedWithSupervisor: boolean;
  supervisorApproved: boolean;
  linkedToProductivity?: boolean;
  linkedToPayroll?: boolean;
  payrollMonth?: string;
  productivityWeight?: number;
  emailQueuedAt?: string;
}

interface ReminderCard {
  title: string;
  caption: string;
  tone: 'due' | 'review' | 'routine';
}

interface PerformanceCard {
  name: string;
  role: string;
  weeklyScore: number;
  monthlyScore: number;
  completed: number;
  awaitingReview: number;
  lastUpdate: string;
}

interface PersonOption {
  name: string;
  role: string;
  userId?: number | null;
}

interface DraftState {
  title: string;
  description: string;
  routineType: RoutineType;
  priority: TaskPriority;
  timelineStart: string;
  timelineDue: string;
  assignee: string;
  projectName: string;
  dependencyType: DependencyType;
  dependencyValue: string;
  tags: string;
  workItems: DraftWorkItem[];
}

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss'],
})
export class FeedComponent implements OnInit, OnDestroy {
  @Input() userInfo: any = {};

  readonly lanes: Array<{
    key: TaskLane;
    label: string;
    subtitle: string;
    icon: string;
    accent: string;
  }> = [
    {
      key: 'BACKLOG',
      label: 'Pinned backlog',
      subtitle: 'Ideas, work briefs, and newly captured plans.',
      icon: 'pi pi-thumbtack',
      accent: 'tone-backlog',
    },
    {
      key: 'TODAY',
      label: 'Today focus',
      subtitle: 'Work due now and immediate execution items.',
      icon: 'pi pi-calendar-clock',
      accent: 'tone-today',
    },
    {
      key: 'IN_PROGRESS',
      label: 'In progress',
      subtitle: 'Workstreams actively moving across teams.',
      icon: 'pi pi-play-circle',
      accent: 'tone-progress',
    },
    {
      key: 'REVIEW',
      label: 'Supervisor review',
      subtitle: 'Shared plans awaiting feedback or sign-off.',
      icon: 'pi pi-eye',
      accent: 'tone-review',
    },
    {
      key: 'DONE',
      label: 'Closed loop',
      subtitle: 'Completed outcomes feeding formal reporting.',
      icon: 'pi pi-check-circle',
      accent: 'tone-done',
    },
  ];

  readonly enterpriseProjects = [
    'OptimaXCloud IAAS',
    'Treasury Controls Rollout',
    'Retail Network Uplift',
    'Terminal Safety Dashboard',
    'Vendor Compliance Programme',
  ];

  currentUuid = 'uu';
  isSupervisor = false;
  isLoading = false;
  activePage: 'planner' | 'reviews' | 'reports' = 'planner';
  composeMode: ComposeMode = 'sticky';
  visualMode: PlannerVisualMode = 'sticky';
  composerVisible = false;
  taskDialogVisible = false;
  taskBoard: Record<TaskLane, RoutineTask[]> = {
    BACKLOG: [],
    TODAY: [],
    IN_PROGRESS: [],
    REVIEW: [],
    DONE: [],
  };
  people: PersonOption[] = [];
  staffOptions: TaskRoutineStaffOption[] = [];
  draft: DraftState = this.emptyDraft();
  batchRows = '';
  pendingAttachments: TaskAttachment[] = [];
  pendingReviewAttachments: TaskAttachment[] = [];
  reminders: ReminderCard[] = [];
  updateDrafts: Record<string, string> = {};
  supervisorNotes: Record<string, string> = {};
  selectedReviewOwner = 'All';
  searchTerm = '';
  selectedStatusBucket: TaskStatusBucket = 'ALL';
  selectedTask: RoutineTask | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly headerStateService: HeaderStateService,
    private readonly collaborationService: CollaborationService,
  ) {}

  ngOnInit(): void {
    this.currentUuid = this.route.snapshot.paramMap.get('uuid') || 'uu';
    this.isSupervisor = this.readRole().includes('ROLE_ADMIN') || this.readRole().includes('SUPERVISOR');
    this.loadHomeData();
  }

  ngOnDestroy(): void {
    this.revokeAttachmentUrls(this.pendingAttachments);
    this.revokeAttachmentUrls(this.pendingReviewAttachments);
    this.tasks.forEach((task) => this.revokeAttachmentUrls(task.attachments));
    this.tasks.forEach((task) => task.reviews.forEach((review) => this.revokeAttachmentUrls(review.attachments || [])));
  }

  get tasks(): RoutineTask[] {
    return this.lanes.flatMap((lane) => this.taskBoard[lane.key]);
  }

  get dropListIds(): string[] {
    return this.lanes.map((lane) => this.dropListId(lane.key));
  }

  get selectedTaskUpdates(): TaskUpdate[] {
    return this.selectedTask?.updates || [];
  }

  get selectedTaskReviews(): TaskReview[] {
    return this.selectedTask?.reviews || [];
  }

  get reminderMetrics(): { label: string; value: string; caption: string }[] {
    const total = this.tasks.length || 1;
    const completed = this.taskBoard.DONE.length;
    const review = this.taskBoard.REVIEW.length;
    const workstreams = this.tasks.reduce((sum, task) => sum + task.workItems.length, 0);
    return [
      {
        label: 'Active plans',
        value: String(this.taskBoard.TODAY.length + this.taskBoard.IN_PROGRESS.length),
        caption: 'parent tasks moving across the organisation',
      },
      {
        label: 'Tracked workstreams',
        value: String(workstreams),
        caption: 'child items monitored from start to finish',
      },
      {
        label: 'Completion',
        value: `${Math.round((completed / total) * 100)}%`,
        caption: 'plans already closed into reporting',
      },
      {
        label: 'Supervisor queue',
        value: String(review),
        caption: 'shared plans awaiting feedback',
      },
    ];
  }

  get visibleReviewTasks(): RoutineTask[] {
    const reviewTasks = this.tasks.filter(
      (task) => task.sharedWithSupervisor || task.lane === 'REVIEW' || task.supervisorApproved,
    );
    if (this.selectedReviewOwner === 'All') return reviewTasks;
    return reviewTasks.filter((task) => task.assignee === this.selectedReviewOwner);
  }

  get filteredTasks(): RoutineTask[] {
    const query = this.searchTerm.trim().toLowerCase();
    const base = this.tasks.filter(
      (task) => this.selectedStatusBucket === 'ALL' || this.belongsToStatusBucket(task, this.selectedStatusBucket),
    );
    if (!query) return base;
    return base.filter((task) => this.matchesTaskQuery(task, query));
  }

  get statusBuckets(): Array<{
    key: TaskStatusBucket;
    label: string;
    count: number;
    icon: string;
    caption: string;
  }> {
    return [
      {
        key: 'OPEN',
        label: 'Open',
        count: this.tasks.filter((task) => this.belongsToStatusBucket(task, 'OPEN')).length,
        icon: 'pi pi-folder-open',
        caption: 'Pinned or scheduled plans still being arranged.',
      },
      {
        key: 'IN_PROGRESS',
        label: 'In Progress',
        count: this.tasks.filter((task) => this.belongsToStatusBucket(task, 'IN_PROGRESS')).length,
        icon: 'pi pi-chart-line',
        caption: 'Execution and review workstreams in motion.',
      },
      {
        key: 'CLOSED',
        label: 'Closed',
        count: this.tasks.filter((task) => this.belongsToStatusBucket(task, 'CLOSED')).length,
        icon: 'pi pi-check-circle',
        caption: 'Finished plans already contributing to reporting.',
      },
    ];
  }

  get selectedStatusTasks(): RoutineTask[] {
    return this.filteredTasks
      .slice()
      .sort((left, right) => left.timelineDue.localeCompare(right.timelineDue) || right.progress - left.progress);
  }

  get selectedStatusTitle(): string {
    if (this.selectedStatusBucket === 'ALL') return 'All task plans';
    return this.statusBuckets.find((bucket) => bucket.key === this.selectedStatusBucket)?.label || 'Tasks';
  }

  get reportCards(): PerformanceCard[] {
    const grouped = new Map<string, RoutineTask[]>();
    this.tasks.forEach((task) => {
      const key = task.assignee || task.owner;
      grouped.set(key, [...(grouped.get(key) || []), task]);
    });

    return Array.from(grouped.entries()).map(([name, rows]) => {
      const completed = rows.filter((task) => task.lane === 'DONE').length;
      const awaitingReview = rows.filter((task) => task.lane === 'REVIEW').length;
      const progressBase = rows.length ? rows.reduce((sum, task) => sum + task.progress, 0) / rows.length : 0;
      const itemBonus = Math.min(18, rows.reduce((sum, task) => sum + task.workItems.length, 0));
      const monthlyScore = Math.min(100, Math.round(progressBase * 0.75 + itemBonus));
      const weeklyScore = Math.min(100, Math.round(progressBase));
      const latestUpdate = rows
        .flatMap((task) => task.updates)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

      return {
        name,
        role: this.people.find((person) => person.name === name)?.role || 'Contributor',
        weeklyScore,
        monthlyScore,
        completed,
        awaitingReview,
        lastUpdate: latestUpdate
          ? new Date(latestUpdate.createdAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })
          : 'No updates yet',
      };
    });
  }

  get ganttDayLabels(): Array<{ iso: string; label: string }> {
    const range = this.ganttRange();
    const days: Array<{ iso: string; label: string }> = [];
    const current = new Date(range.start);
    while (current <= range.end) {
      const iso = this.isoFromDate(current);
      days.push({
        iso,
        label: current.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  get ganttTasks(): RoutineTask[] {
    return this.selectedStatusTasks;
  }

  tasksForLane(lane: TaskLane): RoutineTask[] {
    return this.taskBoard[lane].filter((task) => this.filteredTasks.includes(task));
  }

  laneProgress(lane: TaskLane): number {
    const tasks = this.tasksForLane(lane);
    if (!tasks.length) return 0;
    return Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);
  }

  openComposer(mode?: ComposeMode): void {
    if (mode) this.composeMode = mode;
    this.composerVisible = true;
  }

  closeComposer(): void {
    this.composerVisible = false;
    this.resetDraft();
    this.batchRows = '';
  }

  setActivePage(page: 'planner' | 'reviews' | 'reports'): void {
    if (page === 'reviews' && !this.isSupervisor) {
      this.activePage = 'reports';
      return;
    }
    this.activePage = page;
  }

  setComposeMode(mode: ComposeMode): void {
    this.composeMode = mode;
  }

  setVisualMode(mode: PlannerVisualMode): void {
    this.visualMode = mode;
  }

  setStatusBucket(bucket: TaskStatusBucket): void {
    this.selectedStatusBucket = bucket;
  }

  openTaskDialog(task: RoutineTask): void {
    this.selectedTask = task;
    this.taskDialogVisible = true;
  }

  closeTaskDialog(): void {
    this.taskDialogVisible = false;
    this.selectedTask = null;
    this.revokeAttachmentUrls(this.pendingReviewAttachments);
    this.pendingReviewAttachments = [];
  }

  createTask(): void {
    if (this.composeMode === 'batch') {
      this.createBatchTasks();
      this.closeComposer();
      return;
    }

    const title = this.draft.title.trim();
    if (!title) return;

    const task = this.buildTaskFromDraft(title);
    this.syncTaskProgress(task);
    this.collaborationService.createTaskRoutinePlan(this.toApiPlan(task)).subscribe({
      next: () => {
        this.closeComposer();
        this.loadHomeData();
      },
    });
  }

  addDraftWorkItem(): void {
    this.draft.workItems.push(this.emptyDraftWorkItem(this.draft.assignee || this.currentActor()));
  }

  removeDraftWorkItem(index: number): void {
    this.draft.workItems.splice(index, 1);
  }

  onAttachmentSelected(event: Event): void {
    this.collectAttachments(event, this.pendingAttachments, true);
  }

  onReviewAttachmentSelected(event: Event): void {
    this.collectAttachments(event, this.pendingReviewAttachments, true);
  }

  removeReviewAttachment(attachment: TaskAttachment): void {
    this.removeAttachmentFromCollection(attachment, 'pendingReviewAttachments');
  }

  removePendingAttachment(attachment: TaskAttachment): void {
    this.removeAttachmentFromCollection(attachment, 'pendingAttachments');
  }

  drop(event: CdkDragDrop<RoutineTask[]>, lane: TaskLane): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }

    this.taskBoard[lane].forEach((task) => {
      task.lane = lane;
      if (lane === 'TODAY' && task.progress < 18) task.progress = 18;
      if (lane === 'IN_PROGRESS' && task.progress < 45) task.progress = 45;
      if (lane === 'REVIEW' && task.progress < 76) task.progress = 76;
      if (lane === 'DONE') task.progress = 100;
    });
    this.taskBoard[lane].forEach((task) => this.saveTask(task));
  }

  addDailyUpdate(task: RoutineTask): void {
    const note = (this.updateDrafts[task.id] || '').trim();
    if (!note) return;
    this.syncTaskProgress(task);
    task.updates.unshift({
      id: this.makeId('upd'),
      author: this.currentActor(),
      note,
      progress: task.progress,
      createdAt: new Date().toISOString(),
    });
    this.moveTaskForProgress(task);
    this.updateDrafts[task.id] = '';
    this.saveTask(task);
  }

  addDetailedReview(task: RoutineTask, decision: ReviewDecision): void {
    this.applyReview(task, decision);
  }

  nudgeProgress(task: RoutineTask, step: number): void {
    task.progress = Math.max(0, Math.min(100, task.progress + step));
    this.moveTaskForProgress(task);
    this.saveTask(task);
  }

  shareWithSupervisor(task: RoutineTask): void {
    task.sharedWithSupervisor = true;
    task.lane = 'REVIEW';
    task.emailQueuedAt = new Date().toISOString();
    const supervisor = this.supervisorName();
    this.headerStateService.pushNotification({
      title: `${task.assignee} shared a task plan`,
      body: `${task.title} was sent to ${supervisor} for review.`,
      category: 'module',
      route: `/admin/dashboard/tasks-routines/${this.currentUuid}`,
      contextLabel: 'Tasks and Routines',
    });
    this.saveTask(task);
  }

  applyReview(task: RoutineTask, decision: ReviewDecision): void {
    const note = (this.supervisorNotes[task.id] || '').trim();
    const reviewAttachments = this.pendingReviewAttachments.map((attachment) => ({ ...attachment }));
    task.reviews.unshift({
      id: this.makeId('rev'),
      reviewer: this.currentActor(),
      decision,
      note: note || this.defaultReviewMessage(decision),
      createdAt: new Date().toISOString(),
      attachments: reviewAttachments,
    });
    task.supervisorApproved = decision === 'APPROVED';
    task.sharedWithSupervisor = true;
    task.lane = decision === 'APPROVED' ? 'IN_PROGRESS' : 'REVIEW';
    this.supervisorNotes[task.id] = '';
    this.revokeAttachmentUrls(this.pendingReviewAttachments);
    this.pendingReviewAttachments = [];
    this.headerStateService.pushNotification({
      title: `Review update for ${task.assignee}`,
      body: `${task.title} was ${decision.toLowerCase().replace('_', ' ')} by ${this.currentActor()}.`,
      category: 'module',
      route: `/admin/dashboard/tasks-routines/${this.currentUuid}`,
      contextLabel: 'Supervisor review',
    });
    this.saveTask(task);
  }

  updateWorkItem(task: RoutineTask, item: TaskWorkItem): void {
    item.progress = this.statusProgress(item.status, item.progress);
    this.syncTaskProgress(task);
    this.moveTaskForProgress(task);
    this.saveTask(task);
  }

  taskCompletionLabel(task: RoutineTask): string {
    if (!task.workItems.length) return 'No workstreams added yet';
    const completed = task.workItems.filter((item) => item.status === 'DONE').length;
    return `${completed}/${task.workItems.length} workstreams closed`;
  }

  taskRollupPercent(task: RoutineTask): number {
    if (!task.workItems.length) return task.progress;
    return Math.round(task.workItems.reduce((sum, item) => sum + item.progress, 0) / task.workItems.length);
  }

  taskBlockedCount(task: RoutineTask): number {
    return task.workItems.filter((item) => item.status === 'BLOCKED').length;
  }

  taskOpenCount(task: RoutineTask): number {
    return task.workItems.filter((item) => item.status !== 'DONE').length;
  }

  taskStatusTone(task: RoutineTask): string {
    if (task.lane === 'DONE') return 'is-done';
    if (task.lane === 'REVIEW') return 'is-review';
    if (task.lane === 'IN_PROGRESS') return 'is-progress';
    return 'is-open';
  }

  workItemTone(status: WorkItemStatus): string {
    return `work-${status.toLowerCase()}`;
  }

  reviewDecisionStamp(decision: ReviewDecision): string {
    if (decision === 'APPROVED') return 'Approved';
    if (decision === 'CHANGES') return 'Changes Requested';
    return 'Noted';
  }

  supervisorEmailPreview(task: RoutineTask): string {
    const supervisor = this.supervisorName();
    return `To: ${supervisor} | Subject: Review request - ${task.title} | ${task.assignee} shared ${task.workItems.length || 1} tracked item(s) for review.`;
  }

  ganttColumn(startIso: string, dueIso: string): string {
    const labels = this.ganttDayLabels;
    const startIndex = Math.max(
      1,
      labels.findIndex((day) => day.iso === this.clampIsoToRange(startIso)) + 1,
    );
    const endIndex = Math.max(
      startIndex,
      labels.findIndex((day) => day.iso === this.clampIsoToRange(dueIso)) + 1,
    );
    return `${startIndex} / span ${endIndex - startIndex + 1}`;
  }

  ganttDependencyLine(task: RoutineTask, item: TaskWorkItem): { left: number; width: number } | null {
    if (!item.dependency) return null;
    const source = task.workItems.find(
      (candidate) => candidate.id !== item.id && candidate.title.trim().toLowerCase() === item.dependency.trim().toLowerCase(),
    );
    if (!source) return null;
    const labels = this.ganttDayLabels;
    const total = Math.max(1, labels.length);
    const startIndex = this.ganttIndexForIso(item.timelineStart, labels, 'start');
    const sourceEndIndex = this.ganttIndexForIso(source.timelineDue, labels, 'end');
    if (startIndex <= sourceEndIndex) {
      return null;
    }
    const left = (sourceEndIndex / total) * 100;
    const width = Math.max(((startIndex - sourceEndIndex) / total) * 100, 2);
    return { left, width };
  }

  trackTask(index: number, task: RoutineTask): string {
    return task.id;
  }

  trackWorkItem(index: number, item: TaskWorkItem | DraftWorkItem): string {
    return 'id' in item && item.id ? item.id : `${item.title}-${index}`;
  }

  dropListId(lane: TaskLane): string {
    return `tasks-routines-${lane.toLowerCase()}`;
  }

  toneClass(review: TaskReview): string {
    return `review-${review.decision.toLowerCase()}`;
  }

  attachmentLooksLikeImage(attachment: TaskAttachment): boolean {
    return attachment.type.startsWith('image/');
  }

  private loadHomeData(): void {
    this.isLoading = true;
    this.collaborationService.getTaskRoutineHome(this.searchTerm, this.selectedStatusBucket, 1, 50).subscribe({
      next: (home) => {
        this.staffOptions = home.staffOptions || [];
        this.people = this.staffOptions.map((person) => ({
          name: person.fullname || [person.firstName, person.lastName].filter(Boolean).join(' ').trim(),
          role: person.role || person.department || 'Staff',
          userId: person.userId ?? null,
        })).filter((person) => person.name);
        if (!this.people.length) {
          const sessionUser = this.sessionProfileName();
          if (sessionUser) {
            this.people = [{ name: sessionUser, role: String(this.userInfo?.role || 'Staff') }];
          }
        }
        this.taskBoard = { BACKLOG: [], TODAY: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
        (home.plans?.content || []).map((plan) => this.fromApiPlan(plan)).forEach((task) => this.taskBoard[task.lane].push(task));
        this.draft = this.emptyDraft();
        this.loadReminderCards();
        this.notifyAtLogin();
        this.isLoading = false;
      },
      error: () => {
        this.people = [];
        this.taskBoard = { BACKLOG: [], TODAY: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
        this.isLoading = false;
      },
    });
  }

  private saveTask(task: RoutineTask): void {
    const payload = this.toApiPlan(task);
    const request$ = task.id.startsWith('task-')
      ? this.collaborationService.createTaskRoutinePlan(payload)
      : this.collaborationService.updateTaskRoutinePlan(Number(task.id), payload);
    request$.subscribe({
      next: (saved) => this.replaceTaskWithApi(saved),
    });
  }

  private saveTaskAndRefresh(task: RoutineTask): void {
    const payload = this.toApiPlan(task);
    const request$ = task.id.startsWith('task-')
      ? this.collaborationService.createTaskRoutinePlan(payload)
      : this.collaborationService.updateTaskRoutinePlan(Number(task.id), payload);
    request$.subscribe({
      next: () => this.loadHomeData(),
    });
  }

  private createBatchTasks(): void {
    const rows = this.batchRows
      .split('\n')
      .map((row) => row.trim())
      .filter(Boolean);
    if (!rows.length) return;
    const payloads = rows
      .map((row) => {
        const [title, assignee, dueDate, projectName, dependencyValue] = row.split('|').map((item) => item.trim());
        if (!title) return null;
        const assigneePerson = this.findPersonByName(assignee || this.currentActor());
        return {
          title,
          description: projectName ? `Batch-created workplan linked to ${projectName}.` : 'Batch-created daily task entry.',
          ownerUserId: Number(this.meUserId() || assigneePerson?.userId || 0) || null,
          assigneeUserId: assigneePerson?.userId ?? this.meUserId(),
          supervisorUserId: this.supervisorUserId(),
          lane: 'BACKLOG' as TaskLane,
          progress: 8,
          timelineStart: this.todayIso(),
          timelineDue: dueDate || this.todayIso(),
          routineType: 'Workplan' as RoutineType,
          priority: 'Medium' as TaskPriority,
          dependencyType: (dependencyValue ? 'PERSON' : 'NONE') as DependencyType,
          dependencyValue: dependencyValue || '',
          projectName: projectName || '',
          tags: ['batch'],
          attachments: [] as TaskAttachment[],
          updates: [] as TaskUpdate[],
          reviews: [] as TaskReview[],
          workItems: [] as TaskWorkItem[],
          sharedWithSupervisor: false,
          supervisorApproved: false,
          linkedToProductivity: true,
          linkedToPayroll: false,
        } as RoutineTask;
      })
      .filter((task): task is RoutineTask => !!task)
      .map((task) => this.toApiPlan(task));

    if (!payloads.length) return;
    forkJoin(payloads.map((payload) => this.collaborationService.createTaskRoutinePlan(payload))).subscribe({
      next: () => {
        this.batchRows = '';
        this.loadHomeData();
      },
    });
  }

  private buildTaskFromDraft(title: string): RoutineTask {
    const assignee = this.findPersonByName(this.draft.assignee || this.currentActor());
    return this.normalizeTask({
      id: this.makeId('task'),
      title,
      description: this.draft.description.trim() || 'Task created from the tasks and routines planner.',
      ownerUserId: this.meUserId(),
      assigneeUserId: assignee?.userId ?? this.meUserId(),
      supervisorUserId: this.supervisorUserId(),
      lane: 'BACKLOG',
      progress: 10,
      owner: this.currentActor(),
      assignee: assignee?.name || this.draft.assignee || this.currentActor(),
      timelineStart: this.draft.timelineStart || this.todayIso(),
      timelineDue: this.draft.timelineDue || this.todayIso(),
      routineType: this.draft.routineType,
      priority: this.draft.priority,
      dependencyType: this.draft.dependencyType,
      dependencyValue: this.draft.dependencyType === 'NONE' ? '' : this.draft.dependencyValue,
      projectName: this.draft.projectName,
      tags: this.draft.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter(Boolean),
      attachments: this.pendingAttachments.map((attachment) => ({ ...attachment })),
      updates: [],
      reviews: [],
      workItems: this.draft.workItems
        .filter((item) => item.title.trim())
        .map((item) => ({
          id: this.makeId('wi'),
          title: item.title.trim(),
          ownerUserId: this.findPersonByName(item.owner || this.draft.assignee || this.currentActor())?.userId ?? null,
          owner: item.owner || assignee?.name || this.draft.assignee || this.currentActor(),
          timelineStart: item.timelineStart || this.draft.timelineStart || this.todayIso(),
          timelineDue: item.timelineDue || this.draft.timelineDue || this.todayIso(),
          dependency: item.dependency.trim(),
          status: item.status,
          progress: this.statusProgress(item.status, item.progress),
        })),
      sharedWithSupervisor: false,
      supervisorApproved: false,
      linkedToProductivity: true,
      linkedToPayroll: false,
      productivityWeight: 1,
    });
  }

  private fromApiPlan(plan: TaskRoutinePlan): RoutineTask {
    return this.normalizeTask({
      id: String(plan.id || this.makeId('task')),
      title: plan.title,
      description: plan.description || '',
      ownerUserId: plan.ownerUserId ?? plan.owner?.userId ?? plan.owner?.id ?? null,
      assigneeUserId: plan.assigneeUserId ?? plan.assignee?.userId ?? plan.assignee?.id ?? null,
      supervisorUserId: plan.supervisorUserId ?? plan.supervisor?.userId ?? plan.supervisor?.id ?? null,
      lane: plan.lane || 'BACKLOG',
      progress: plan.progress || 0,
      owner: this.displayNameFromUser(plan.owner, plan.ownerUserId),
      assignee: this.displayNameFromUser(plan.assignee, plan.assigneeUserId),
      timelineStart: plan.timelineStart || this.todayIso(),
      timelineDue: plan.timelineDue || plan.timelineStart || this.todayIso(),
      routineType: plan.routineType || 'Daily',
      priority: plan.priority || 'Medium',
      dependencyType: plan.dependencyType || 'NONE',
      dependencyValue: plan.dependencyValue || '',
      projectName: plan.projectName || '',
      tags: plan.tags || [],
      attachments: (plan.attachments || []).map((attachment) => this.mapAttachmentFromApi(attachment)),
      updates: (plan.updates || []).map((update) => ({
        id: update.id || this.makeId('upd'),
        authorUserId: update.authorUserId ?? null,
        author: update.authorName || this.personNameByUserId(update.authorUserId) || 'Staff',
        note: update.note,
        progress: Number(update.progress || 0),
        createdAt: update.createdAt || new Date().toISOString(),
      })),
      reviews: (plan.reviews || []).map((review) => ({
        id: review.id || this.makeId('rev'),
        reviewerUserId: review.reviewerUserId ?? null,
        reviewer: review.reviewerName || this.personNameByUserId(review.reviewerUserId) || 'Reviewer',
        decision: review.decision,
        note: review.note,
        createdAt: review.createdAt || new Date().toISOString(),
        emailPreview: review.emailPreview,
        attachments: (review.attachments || []).map((attachment) => this.mapAttachmentFromApi(attachment)),
      })),
      workItems: (plan.workItems || []).map((item) => ({
        id: item.id || this.makeId('wi'),
        title: item.title,
        ownerUserId: item.ownerUserId ?? null,
        owner: item.ownerName || this.personNameByUserId(item.ownerUserId) || 'Staff',
        timelineStart: item.timelineStart || plan.timelineStart || this.todayIso(),
        timelineDue: item.timelineDue || item.timelineStart || plan.timelineDue || this.todayIso(),
        dependency: item.dependency || '',
        status: item.status,
        progress: this.statusProgress(item.status, Number(item.progress || 0)),
      })),
      sharedWithSupervisor: !!plan.sharedWithSupervisor,
      supervisorApproved: !!plan.supervisorApproved,
      linkedToProductivity: !!plan.linkedToProductivity,
      linkedToPayroll: !!plan.linkedToPayroll,
      payrollMonth: plan.payrollMonth || '',
      productivityWeight: Number(plan.productivityWeight || 0),
      emailQueuedAt: plan.emailQueuedAt,
    });
  }

  private toApiPlan(task: RoutineTask): TaskRoutinePlan {
    return {
      id: /^\d+$/.test(task.id) ? Number(task.id) : undefined,
      ownerUserId: task.ownerUserId ?? this.findPersonByName(task.owner)?.userId ?? this.meUserId(),
      assigneeUserId: task.assigneeUserId ?? this.findPersonByName(task.assignee)?.userId ?? this.meUserId(),
      supervisorUserId: task.supervisorUserId ?? this.supervisorUserId(),
      title: task.title,
      description: task.description,
      lane: task.lane,
      status: this.taskStatusForLane(task.lane),
      progress: taskRollup(task),
      timelineStart: task.timelineStart,
      timelineDue: task.timelineDue,
      routineType: task.routineType,
      priority: task.priority,
      dependencyType: task.dependencyType,
      dependencyValue: task.dependencyValue,
      projectName: task.projectName,
      tags: task.tags,
      attachments: task.attachments.map((attachment) => this.mapAttachmentToApi(attachment)),
      workItems: task.workItems.map((item) => ({
        id: item.id,
        title: item.title,
        ownerUserId: item.ownerUserId ?? this.findPersonByName(item.owner)?.userId ?? null,
        ownerName: item.owner,
        timelineStart: item.timelineStart,
        timelineDue: item.timelineDue,
        dependency: item.dependency,
        status: item.status,
        progress: this.statusProgress(item.status, item.progress),
      })),
      updates: task.updates.map((update) => ({
        id: update.id,
        authorUserId: update.authorUserId ?? this.findPersonByName(update.author)?.userId ?? this.meUserId(),
        authorName: update.author,
        note: update.note,
        progress: update.progress,
        createdAt: update.createdAt,
      })),
      reviews: task.reviews.map((review) => ({
        id: review.id,
        reviewerUserId: review.reviewerUserId ?? this.findPersonByName(review.reviewer)?.userId ?? this.meUserId(),
        reviewerName: review.reviewer,
        decision: review.decision,
        note: review.note,
        createdAt: review.createdAt,
        emailPreview: review.emailPreview || this.supervisorEmailPreview(task),
        attachments: (review.attachments || []).map((attachment) => this.mapAttachmentToApi(attachment)),
      })),
      sharedWithSupervisor: task.sharedWithSupervisor,
      supervisorApproved: task.supervisorApproved,
      linkedToProductivity: task.linkedToProductivity ?? true,
      linkedToPayroll: task.linkedToPayroll ?? false,
      payrollMonth: task.payrollMonth,
      productivityWeight: task.productivityWeight ?? 1,
    };
  }

  private replaceTaskWithApi(plan: TaskRoutinePlan): void {
    const mapped = this.fromApiPlan(plan);
    for (const lane of this.lanes) {
      const rows = this.taskBoard[lane.key];
      const index = rows.findIndex((task) => task.id === mapped.id || (!!plan.id && task.id === String(plan.id)));
      if (index >= 0) {
        rows.splice(index, 1);
      }
    }
    this.taskBoard[mapped.lane].unshift(mapped);
    if (this.selectedTask?.id === mapped.id || this.selectedTask?.id === String(plan.id)) {
      this.selectedTask = mapped;
    }
    this.loadReminderCards();
  }

  private loadReminderCards(): void {
    this.reminders = [];
    const dueToday = this.tasks.filter((task) => task.timelineDue === this.todayIso() && task.lane !== 'DONE');
    dueToday.slice(0, 3).forEach((task) => {
      this.reminders.push({
        title: task.title,
        caption: `Due today for ${task.assignee}`,
        tone: 'due',
      });
    });

    const reviewTasks = this.tasks.filter((task) => task.sharedWithSupervisor && !task.supervisorApproved);
    reviewTasks.slice(0, 2).forEach((task) => {
      this.reminders.push({
        title: task.title,
        caption: `Awaiting supervisor action for ${task.assignee}`,
        tone: 'review',
      });
    });

    if (!this.reminders.length) {
      this.reminders.push({
        title: 'Planner is clear',
        caption: 'No urgent blockers are currently surfacing on the board.',
        tone: 'routine',
      });
    }
  }

  private notifyAtLogin(): void {
    const key = `optimax_tasks_routines_reminder_${this.todayIso()}_${this.currentActor()}`;
    if (sessionStorage.getItem(key)) return;
    const reviewCount = this.tasks.filter((task) => task.sharedWithSupervisor && !task.supervisorApproved).length;
    const dueToday = this.tasks.filter((task) => task.timelineDue === this.todayIso() && task.lane !== 'DONE').length;
    if (reviewCount || dueToday) {
      this.headerStateService.pushNotification({
        title: this.isSupervisor ? 'Supervisor review reminders' : 'Today’s routine reminders',
        body: this.isSupervisor
          ? `${reviewCount} shared plan${reviewCount === 1 ? '' : 's'} need review and ${dueToday} task${dueToday === 1 ? '' : 's'} are due today.`
          : `${dueToday} task${dueToday === 1 ? '' : 's'} are due today and ${reviewCount} shared item${reviewCount === 1 ? '' : 's'} are in review.`,
        category: 'module',
        route: `/admin/dashboard/tasks-routines/${this.currentUuid}`,
        contextLabel: 'Tasks and Routines',
      });
      sessionStorage.setItem(key, '1');
    }
  }

  private matchesTaskQuery(task: RoutineTask, query: string): boolean {
    return [
      task.title,
      task.description,
      task.assignee,
      task.owner,
      task.projectName,
      task.dependencyValue,
      task.routineType,
      task.priority,
      task.lane,
      task.timelineStart,
      task.timelineDue,
      task.tags.join(' '),
      task.workItems.map((item) => `${item.title} ${item.owner} ${item.status} ${item.dependency}`).join(' '),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  }

  private belongsToStatusBucket(task: RoutineTask, bucket: Exclude<TaskStatusBucket, 'ALL'>): boolean {
    if (bucket === 'OPEN') return task.lane === 'BACKLOG' || task.lane === 'TODAY';
    if (bucket === 'IN_PROGRESS') return task.lane === 'IN_PROGRESS' || task.lane === 'REVIEW';
    return task.lane === 'DONE';
  }

  private syncTaskProgress(task: RoutineTask): void {
    if (!task.workItems.length) return;
    const aggregate = task.workItems.reduce((sum, item) => sum + this.statusProgress(item.status, item.progress), 0);
    task.progress = Math.round(aggregate / task.workItems.length);
  }

  private moveTaskForProgress(task: RoutineTask): void {
    if (task.progress >= 100) {
      this.moveTask(task, 'DONE');
    } else if (task.sharedWithSupervisor && task.progress >= 70) {
      this.moveTask(task, 'REVIEW');
    } else if (task.progress >= 40) {
      this.moveTask(task, 'IN_PROGRESS');
    } else if (task.progress >= 15) {
      this.moveTask(task, 'TODAY');
    }
  }

  private moveTask(task: RoutineTask, lane: TaskLane): void {
    if (task.lane === lane) return;
    const source = this.taskBoard[task.lane];
    const index = source.findIndex((row) => row.id === task.id);
    if (index >= 0) source.splice(index, 1);
    task.lane = lane;
    if (lane === 'DONE') task.progress = 100;
    this.taskBoard[lane].unshift(task);
  }

  private normalizeTask(task: any): RoutineTask {
    const normalized: RoutineTask = {
      id: task.id || this.makeId('task'),
      title: task.title || 'Untitled task',
      description: task.description || '',
      ownerUserId: task.ownerUserId ?? null,
      assigneeUserId: task.assigneeUserId ?? null,
      supervisorUserId: task.supervisorUserId ?? null,
      lane: (task.lane || 'BACKLOG') as TaskLane,
      progress: Number(task.progress || 0),
      owner: task.owner || this.currentActor(),
      assignee: task.assignee || task.owner || this.currentActor(),
      timelineStart: task.timelineStart || this.todayIso(),
      timelineDue: task.timelineDue || task.timelineStart || this.todayIso(),
      routineType: (task.routineType || 'Daily') as RoutineType,
      priority: (task.priority || 'Medium') as TaskPriority,
      dependencyType: (task.dependencyType || 'NONE') as DependencyType,
      dependencyValue: task.dependencyValue || '',
      projectName: task.projectName || '',
      tags: Array.isArray(task.tags) ? task.tags : [],
      attachments: Array.isArray(task.attachments)
        ? task.attachments.map((attachment: any) => ({
            ...attachment,
            previewUrl: this.normalizeAttachmentUrl(attachment.previewUrl),
          }))
        : [],
      updates: Array.isArray(task.updates)
        ? task.updates.map((update: any) => ({
            ...update,
            authorUserId: update.authorUserId ?? null,
          }))
        : [],
      reviews: Array.isArray(task.reviews)
        ? task.reviews.map((review: any) => ({
            ...review,
            reviewerUserId: review.reviewerUserId ?? null,
            attachments: Array.isArray(review.attachments)
              ? review.attachments.map((attachment: any) => ({
                  ...attachment,
                  previewUrl: this.normalizeAttachmentUrl(attachment.previewUrl),
                }))
              : [],
          }))
        : [],
      workItems: Array.isArray(task.workItems)
        ? task.workItems.map((item: any) => ({
            id: item.id || this.makeId('wi'),
            title: item.title || 'Work item',
            ownerUserId: item.ownerUserId ?? null,
            owner: item.owner || task.assignee || this.currentActor(),
            timelineStart: item.timelineStart || task.timelineStart || this.todayIso(),
            timelineDue: item.timelineDue || item.timelineStart || task.timelineDue || this.todayIso(),
            dependency: item.dependency || '',
            status: (item.status || 'OPEN') as WorkItemStatus,
            progress: this.statusProgress((item.status || 'OPEN') as WorkItemStatus, Number(item.progress || 0)),
          }))
        : [],
      sharedWithSupervisor: !!task.sharedWithSupervisor,
      supervisorApproved: !!task.supervisorApproved,
      linkedToProductivity: task.linkedToProductivity ?? true,
      linkedToPayroll: !!task.linkedToPayroll,
      payrollMonth: task.payrollMonth || '',
      productivityWeight: Number(task.productivityWeight || 0),
      emailQueuedAt: task.emailQueuedAt,
    };
    this.syncTaskProgress(normalized);
    return normalized;
  }

  private resetDraft(): void {
    this.revokeAttachmentUrls(this.pendingAttachments);
    this.pendingAttachments = [];
    this.draft = this.emptyDraft();
  }

  private emptyDraft(): DraftState {
    return {
      title: '',
      description: '',
      routineType: 'Daily',
      priority: 'Medium',
      timelineStart: this.todayIso(),
      timelineDue: this.plusDaysIso(5),
      assignee: this.currentActor(),
      projectName: '',
      dependencyType: 'NONE',
      dependencyValue: '',
      tags: '',
      workItems: [
        this.emptyDraftWorkItem(this.currentActor()),
        this.emptyDraftWorkItem(this.currentActor(), 2),
      ],
    };
  }

  private emptyDraftWorkItem(owner: string, dayOffset = 0): DraftWorkItem {
    return {
      title: '',
      owner,
      timelineStart: this.plusDaysIso(dayOffset),
      timelineDue: this.plusDaysIso(dayOffset + 2),
      dependency: '',
      status: 'OPEN',
      progress: 0,
    };
  }

  private currentActor(): string {
    return this.sessionProfileName() || this.userInfo?.username || this.people[0]?.name || 'Staff';
  }

  private supervisorName(): string {
    if (this.isSupervisor) return this.currentActor();
    return this.people.find((person) => /manager|lead|supervisor|partner|head/i.test(person.role))?.name || this.people[0]?.name || 'Supervisor';
  }

  private sessionProfileName(): string {
    return (
      this.userInfo?.fullname ||
      sessionStorage.getItem('fullname') ||
      sessionStorage.getItem('username') ||
      ''
    );
  }

  private readRole(): string {
    return sessionStorage.getItem('role') || '';
  }

  private makeId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private plusDaysIso(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private isoFromDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private ganttRange(): { start: Date; end: Date } {
    const items = this.ganttTasks.flatMap((task) => [task, ...task.workItems]);
    if (!items.length) {
      return {
        start: new Date(this.todayIso()),
        end: new Date(this.plusDaysIso(14)),
      };
    }

    const starts = items.map((item: any) => new Date(item.timelineStart || this.todayIso()).getTime());
    const ends = items.map((item: any) => new Date(item.timelineDue || item.timelineStart || this.todayIso()).getTime());
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    min.setDate(min.getDate() - 1);
    max.setDate(max.getDate() + 1);
    return { start: min, end: max };
  }

  private clampIsoToRange(iso: string): string {
    const labels = this.ganttDayLabels.map((day) => day.iso);
    if (!labels.length) return iso;
    if (iso < labels[0]) return labels[0];
    if (iso > labels[labels.length - 1]) return labels[labels.length - 1];
    return iso;
  }

  private ganttIndexForIso(
    iso: string,
    labels: Array<{ iso: string; label: string }>,
    anchor: 'start' | 'end',
  ): number {
    const clamped = this.clampIsoToRange(iso);
    const index = labels.findIndex((day) => day.iso === clamped);
    if (index < 0) return 0;
    return anchor === 'end' ? index + 1 : index;
  }

  private statusProgress(status: WorkItemStatus, progress: number): number {
    if (status === 'DONE') return 100;
    if (status === 'BLOCKED') return Math.min(progress || 25, 65);
    if (status === 'IN_PROGRESS') return Math.max(progress || 35, 20);
    return Math.min(progress || 0, 25);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  private collectAttachments(event: Event, target: TaskAttachment[], uploadToApi = false): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    if (!uploadToApi) {
      files.forEach((file) => target.push(this.localAttachmentFromFile(file)));
      input.value = '';
      return;
    }
    files.forEach((file) => {
      const preview = this.localAttachmentFromFile(file);
      target.push(preview);
      this.collaborationService.uploadTaskRoutineAttachment(file).subscribe({
        next: (saved) => {
          const index = target.findIndex((row) => row.id === preview.id);
          const merged = this.mapAttachmentFromApi(saved, preview.previewUrl);
          if (index >= 0) {
            target[index] = merged;
          } else {
            target.push(merged);
          }
        },
      });
    });
    input.value = '';
  }

  private removeAttachmentFromCollection(
    attachment: TaskAttachment,
    collection: 'pendingAttachments' | 'pendingReviewAttachments',
  ): void {
    const rows = this[collection];
    const index = rows.findIndex((row) => row.id === attachment.id);
    if (index >= 0) {
      const [removed] = rows.splice(index, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    }
  }

  private revokeAttachmentUrls(attachments: TaskAttachment[]): void {
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    });
  }

  private defaultReviewMessage(decision: ReviewDecision): string {
    if (decision === 'APPROVED') return 'Approved and released for tracking.';
    if (decision === 'CHANGES') return 'Changes requested before approval.';
    return 'Review noted for follow-up.';
  }

  private localAttachmentFromFile(file: File): TaskAttachment {
    return {
      id: this.makeId('att'),
      name: file.name,
      size: this.formatFileSize(file.size),
      type: file.type,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    };
  }

  private mapAttachmentFromApi(attachment?: TaskRoutineAttachment, fallbackPreviewUrl?: string): TaskAttachment {
    return {
      id: attachment?.id || this.makeId('att'),
      name: attachment?.name || 'Attachment',
      size: attachment?.size || '',
      type: attachment?.type || 'application/octet-stream',
      previewUrl: this.normalizeAttachmentUrl(attachment?.previewUrl) || fallbackPreviewUrl,
    };
  }

  private mapAttachmentToApi(attachment: TaskAttachment): TaskRoutineAttachment {
    return {
      id: attachment.id,
      name: attachment.name,
      size: attachment.size,
      type: attachment.type,
      previewUrl: attachment.previewUrl,
    };
  }

  private normalizeAttachmentUrl(url?: string): string | undefined {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url) || url.startsWith('blob:')) {
      return url;
    }
    const base = (environment.baseUrl || environment.apiBaseUrl || '').replace(/\/$/, '');
    return `${base}${url.startsWith('/') ? url : `/${url}`}`;
  }

  private findPersonByName(name?: string): PersonOption | undefined {
    const normalized = (name || '').trim().toLowerCase();
    if (!normalized) return undefined;
    return this.people.find((person) => person.name.trim().toLowerCase() === normalized);
  }

  private personNameByUserId(userId?: number | null): string {
    if (!userId) return '';
    return this.people.find((person) => Number(person.userId || 0) === Number(userId))?.name || '';
  }

  private displayNameFromUser(user?: { fullname?: string; username?: string }, userId?: number | null): string {
    return user?.fullname || user?.username || this.personNameByUserId(userId) || this.currentActor();
  }

  private meUserId(): number | null {
    const value = Number(sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || this.userInfo?.userId || 0);
    return value || null;
  }

  private supervisorUserId(): number | null {
    if (this.isSupervisor) {
      return this.meUserId();
    }
    return this.people.find((person) => /manager|lead|supervisor|partner|head/i.test(person.role))?.userId ?? null;
  }

  private taskStatusForLane(lane: TaskLane): 'OPEN' | 'IN_PROGRESS' | 'CLOSED' {
    if (lane === 'DONE') return 'CLOSED';
    if (lane === 'IN_PROGRESS' || lane === 'REVIEW') return 'IN_PROGRESS';
    return 'OPEN';
  }
}

function taskRollup(task: RoutineTask): number {
  if (!task.workItems.length) {
    return Number(task.progress || 0);
  }
  return Math.round(task.workItems.reduce((sum, item) => sum + Number(item.progress || 0), 0) / task.workItems.length);
}
