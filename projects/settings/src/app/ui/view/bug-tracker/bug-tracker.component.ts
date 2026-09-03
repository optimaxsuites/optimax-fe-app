import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MessageService } from 'primeng/api';
import { forkJoin, switchMap } from 'rxjs';
import { IssueTrackerApiService } from '../../service/issue-tracker-api.service';
import { ImageViewerDialogComponent } from './image-viewer-dialog.component';

type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Status = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'TESTING' | 'DONE' | 'WONT_FIX';
type IssueType = 'BUG' | 'FEATURE';

interface WorkLog {
  id?: number;
  note: string;
  loggedByUserId?: number;
  loggedByEmail?: string;
  loggedByName?: string;
  createdAt?: string;
}

interface Share {
  id?: number;
  shareType: 'CHANNEL' | 'DM';
  channelName?: string;
  sharedToEmail?: string;
  sharedToName?: string;
  sharedToUserId?: number;
  sharedByUserId?: number;
  sharedByEmail?: string;
}

interface Issue {
  id?: number;
  title: string;
  description?: string;
  module: string;
  priority: Priority;
  status: Status;
  issueType?: IssueType;
  tags?: string;
  reporterUserId?: number;
  reporterEmail?: string;
  reporterName?: string;
  assigneeUserId?: number;
  assigneeEmail?: string;
  assigneeName?: string;
  supervisorUserId?: number;
  supervisorEmail?: string;
  supervisorName?: string;
  workTaskId?: number;
  performanceGoalId?: number;
  createdAt?: string;
  resolvedAt?: string;
  resolutionHours?: number;
  workLog?: WorkLog[];
  shares?: Share[];
}

interface AttachmentItem { name: string; dataUrl: string; type: string; }

interface ChannelItem { id: number; name: string; selected: boolean; }
interface UserItem { id: number; userId?: number; fullname?: string; email?: string; selected: boolean; }
interface TaskItem { id: number; title: string; status: string; priority: string; }

const MODULES = ['All', 'HR', 'ACCOUNTING', 'COMMERCE', 'INVENTORY', 'PROCUREMENT',
  'PAYROLL', 'ATTENDANCE', 'RECRUITMENT', 'PERFORMANCE', 'LOANS', 'POS', 'GENERAL', 'INFRASTRUCTURE'];
const STATUSES: Status[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'TESTING', 'DONE', 'WONT_FIX'];
const PRIORITIES: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const ISSUE_TYPES: IssueType[] = ['BUG', 'FEATURE'];

@Component({
  selector: 'app-bug-tracker',
  templateUrl: './bug-tracker.component.html',
  styleUrl: './bug-tracker.component.scss'
})
export class BugTrackerComponent implements OnInit {

  issues: Issue[] = [];
  filtered: Issue[] = [];
  loading = false;
  saving = false;
  serviceUnavailable = false;

  activeModule = 'All';
  filterStatus = '';
  filterPriority = '';
  filterAssignee = '';
  filterType = '';
  searchText = '';
  sortBy: 'newest' | 'oldest' | 'priority' | 'status' = 'newest';

  modules = MODULES;
  statuses = STATUSES;
  priorities = PRIORITIES;
  issueTypes = ISSUE_TYPES;

  showForm = false;
  editingIssue: Issue | null = null;
  form: Partial<Issue> = this.blankForm();

  expandedId: number | null = null;
  newLogNote = '';
  loadingLogs: number | null = null;

  // ── Reassign ──────────────────────────────────────────────────────────────────
  reassigningId: number | null = null;
  reassignEmail = '';

  // ── User list for assignee / supervisor dropdowns ───────────────────────────
  userList: { id: number; fullname: string; email: string }[] = [];

  get uniqueAssignees(): string[] {
    return [...new Set(
      this.issues.filter(i => i.assigneeName).map(i => i.assigneeName!)
    )].sort();
  }

  onAssigneeSelect(email: string): void {
    const user = this.userList.find(u => u.email === email);
    if (user) {
      this.form.assigneeName  = user.fullname;
      this.form.assigneeEmail = user.email;
    }
  }

  onSupervisorSelect(email: string): void {
    const user = this.userList.find(u => u.email === email);
    if (user) {
      this.form.supervisorName  = user.fullname;
      this.form.supervisorEmail = user.email;
    }
  }

  // ── Share dialog ────────────────────────────────────────────────────────────
  showShareDialog = false;
  sharingIssue: Issue | null = null;
  shareLoading = false;
  shareSubmitting = false;
  shareTab: 'DM' | 'CHANNEL' = 'DM';

  channels: ChannelItem[] = [];
  channelSearch = '';

  dmUsers: UserItem[] = [];
  userSearch = '';

  get filteredChannels(): ChannelItem[] {
    const q = this.channelSearch.toLowerCase();
    return q ? this.channels.filter(c => c.name.toLowerCase().includes(q)) : this.channels;
  }

  get filteredDmUsers(): UserItem[] {
    const q = this.userSearch.toLowerCase();
    const list = this.dmUsers.filter(u => u.fullname || u.email);
    return q
      ? list.filter(u =>
          (u.fullname || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q))
      : list;
  }

  get selectedChannelCount(): number { return this.channels.filter(c => c.selected).length; }
  get selectedUserCount(): number { return this.dmUsers.filter(u => u.selected).length; }

  // ── Attachments ─────────────────────────────────────────────────────────────
  formAttachments: AttachmentItem[] = [];
  dragOverForm = false;
  private readonly ATTACH_DELIM = '\n\n__ATTACHMENTS__\n';

  // ── Link panel ─────────────────────────────────────────────────────────────
  showLinkPanel = false;
  linkingIssue: Issue | null = null;
  linkPanelLoading = false;

  availableTasks: TaskItem[] = [];
  taskSearch = '';
  selectedTaskId: number | null = null;
  linkedTaskTitle = '';

  showCreateTask = false;
  newTaskTitle = '';
  newTaskPriority = 'MEDIUM';
  newTaskStatus = 'TO_DO';
  creatingTask = false;

  get filteredTasks(): TaskItem[] {
    const q = this.taskSearch.toLowerCase();
    return q ? this.availableTasks.filter(t =>
      t.title.toLowerCase().includes(q) || String(t.id).includes(q)) : this.availableTasks;
  }

  highlightedIssueId: number | null = null;

  constructor(
    private api: IssueTrackerApiService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    const issueParam = this.route.snapshot.queryParamMap.get('issue');
    if (issueParam) this.highlightedIssueId = Number(issueParam);
    this.load();
    this.api.getAllUsers().subscribe({
      next: (users) => {
        this.userList = (users || [])
          .filter((u: any) => u.email || u.userId)
          .map((u: any) => ({
            id:       u.userId || u.id || 0,
            fullname: u.fullname || u.username || '',
            email:    u.email || '',
          }))
          .filter((u: any) => !!u.email)
          .sort((a: any, b: any) => a.fullname.localeCompare(b.fullname));
      },
      error: () => {},
    });
  }

  load(): void {
    this.loading = true;
    this.serviceUnavailable = false;
    this.api.getAll(1, 100).subscribe({
      next: (data) => {
        this.issues = data || [];
        this.applyFilters();
        this.loading = false;
        if (this.highlightedIssueId) {
          setTimeout(() => {
            this.expandedId = this.highlightedIssueId;
            const el = document.getElementById(`issue-${this.highlightedIssueId}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      },
      error: (err: string) => {
        this.loading = false;
        if (typeof err === 'string' && (err.includes('503') || err.includes('502') || err.includes('Service Unavailable'))) {
          this.serviceUnavailable = true;
        } else {
          this.toast('error', err);
        }
      }
    });
  }

  get stats() {
    const total = this.issues.length;
    const done = this.issues.filter(b => b.status === 'DONE' || b.status === 'WONT_FIX').length;
    const open = this.issues.filter(b => b.status === 'OPEN').length;
    const blocked = this.issues.filter(b => b.status === 'BLOCKED').length;
    const critical = this.issues.filter(b => b.priority === 'CRITICAL' && b.status !== 'DONE').length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, open, blocked, critical, pct };
  }

  selectModule(m: string): void {
    this.activeModule = m;
    if (m !== 'All') {
      this.loading = true;
      this.api.getByModule(m).subscribe({
        next: (data) => { this.issues = data || []; this.applyFilters(); this.loading = false; },
        error: () => { this.loading = false; }
      });
    } else {
      this.load();
    }
  }

  applyFilters(): void {
    let list = [...this.issues];
    if (this.filterStatus)   list = list.filter(b => b.status === this.filterStatus);
    if (this.filterPriority) list = list.filter(b => b.priority === this.filterPriority);
    if (this.filterAssignee) list = list.filter(b => b.assigneeName === this.filterAssignee);
    if (this.filterType)     list = list.filter(b => (b.issueType || 'BUG') === this.filterType);
    if (this.searchText) {
      const t = this.searchText.toLowerCase();
      list = list.filter(b =>
        b.title?.toLowerCase().includes(t) ||
        b.description?.toLowerCase().includes(t) ||
        String(b.id).includes(t)
      );
    }
    list = list.sort((a, b) => {
      if (this.sortBy === 'newest') return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
      if (this.sortBy === 'oldest') return new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime();
      if (this.sortBy === 'priority') return PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
      if (this.sortBy === 'status') return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
      return 0;
    });
    this.filtered = list;
  }

  openForm(issue?: Issue): void {
    this.editingIssue = issue || null;
    this.form = issue ? { ...issue } : this.blankForm();
    this.formAttachments = this.attachmentsFromDesc(issue?.description);
    if (issue?.description) this.form.description = this.descriptionText(issue.description);
    this.tempFormLog = [];
    this.formLogNote = '';
    this.showForm = true;
  }

  saveForm(): void {
    if (!this.form.title || !this.form.module || !this.form.priority) return;
    this.saving = true;
    const meId = Number(sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || 0) || undefined;
    const desc = (this.form.description || '') +
      (this.formAttachments.length ? this.ATTACH_DELIM + JSON.stringify(this.formAttachments) : '');
    const payload = { ...this.form, description: desc, status: this.form.status || 'OPEN', reporterUserId: this.form.reporterUserId || meId };
    const logsToPost = [...this.tempFormLog];

    const req = this.editingIssue?.id
      ? this.api.update(this.editingIssue.id, payload)
      : this.api.create(payload);

    req.subscribe({
      next: (saved) => {
        const isNew = !this.editingIssue?.id;
        if (this.editingIssue?.id) {
          const idx = this.issues.findIndex(i => i.id === this.editingIssue!.id);
          if (idx > -1) this.issues[idx] = saved;
        } else {
          this.issues.unshift(saved);
        }
        this.applyFilters();
        this.showForm = false;
        this.saving = false;
        this.formAttachments = [];
        this.toast('success', isNew ? 'Issue created — notifications sent' : 'Issue updated');

        if (isNew && saved.assigneeEmail) {
          this.sendAssigneeEmail(saved);
        }

        const meId2 = Number(sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || 0);
        logsToPost.forEach(log => {
          this.api.addWorkLog(saved.id!, {
            note: log.note,
            loggedByUserId: meId2,
            loggedByEmail: log.loggedByEmail || '',
            loggedByName: log.loggedByName || ''
          }).subscribe({
            next: (newLog) => {
              const issue = this.issues.find(i => i.id === saved.id);
              if (issue) {
                if (!issue.workLog) issue.workLog = [];
                issue.workLog.unshift(newLog);
              }
            },
            error: () => {}
          });
        });
      },
      error: (err) => { this.toast('error', err); this.saving = false; }
    });
  }

  deleteIssue(id: number): void {
    if (!confirm('Delete this issue?')) return;
    this.api.delete(id).subscribe({
      next: () => {
        this.issues = this.issues.filter(i => i.id !== id);
        this.applyFilters();
        this.toast('success', 'Issue deleted');
      },
      error: (err) => this.toast('error', err)
    });
  }

  updateStatus(issue: Issue, status: Status): void {
    const previousStatus = issue.status;
    this.api.patchStatus(issue.id!, status).subscribe({
      next: (updated) => {
        const idx = this.issues.findIndex(i => i.id === issue.id);
        if (idx > -1) this.issues[idx] = updated;
        this.applyFilters();
        if (updated.reporterEmail) {
          this.sendReporterStatusEmail(updated, previousStatus);
        }
      },
      error: (err) => this.toast('error', err)
    });
  }

  toggleExpand(id: number): void {
    if (this.expandedId === id) {
      this.expandedId = null;
    } else {
      this.expandedId = id;
      const issue = this.issues.find(i => i.id === id);
      if (issue && issue.workLog == null) {
        this.loadingLogs = id;
        this.api.getWorkLog(id).subscribe({
          next: (logs) => { issue.workLog = logs || []; this.loadingLogs = null; },
          error: () => { issue.workLog = []; this.loadingLogs = null; }
        });
      }
    }
    this.newLogNote = '';
    this.reassigningId = null;
    this.reassignEmail = '';
  }

  addLog(issue: Issue): void {
    if (!this.newLogNote.trim()) return;
    const meId = Number(sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || 0);
    const meEmail = sessionStorage.getItem('email') || sessionStorage.getItem('userEmail') || '';
    const rawName = sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || '';
    const meName = (rawName === 'undefined' || rawName === 'null') ? '' : rawName;

    const isAssignee   = !!meEmail && meEmail === issue.assigneeEmail;
    const isSupervisor = !!meEmail && meEmail === issue.supervisorEmail;

    const noteText = this.newLogNote.trim();
    this.newLogNote = '';

    // Optimistic update — show immediately, before the API responds
    const optimistic: WorkLog = {
      note: noteText,
      loggedByUserId: meId,
      loggedByEmail: meEmail,
      loggedByName: meName,
      createdAt: new Date().toISOString()
    };
    issue.workLog = [optimistic, ...(issue.workLog || [])];
    // Also update filtered so *ngFor sees the new array reference
    this.filtered = [...this.filtered];

    const payload = { note: noteText, loggedByUserId: meId, loggedByEmail: meEmail, loggedByName: meName };
    this.api.addWorkLog(issue.id!, payload).subscribe({
      next: (log) => {
        // Swap optimistic entry with the server-confirmed entry (has real id + createdAt)
        if (log && log.id) {
          const idx = issue.workLog!.indexOf(optimistic);
          if (idx > -1) {
            issue.workLog = [...issue.workLog!.slice(0, idx), log, ...issue.workLog!.slice(idx + 1)];
          }
        }
        if ((isAssignee || isSupervisor) && issue.reporterEmail) {
          this.sendLogNotificationEmail(issue, log || optimistic, meName || meEmail);
        }
      },
      error: (err) => {
        // Revert the optimistic entry on failure
        issue.workLog = issue.workLog!.filter(l => l !== optimistic);
        this.filtered = [...this.filtered];
        this.newLogNote = noteText;
        this.toast('error', err);
      }
    });
  }

  // ── Reassign ─────────────────────────────────────────────────────────────────

  startReassign(issue: Issue): void {
    this.reassigningId = issue.id!;
    this.reassignEmail = issue.assigneeEmail || '';
  }

  cancelReassign(): void {
    this.reassigningId = null;
    this.reassignEmail = '';
  }

  submitReassign(issue: Issue): void {
    const user = this.userList.find(u => u.email === this.reassignEmail);
    if (!user) return;
    const payload = { ...issue, assigneeEmail: user.email, assigneeName: user.fullname, assigneeUserId: user.id };
    this.api.update(issue.id!, payload).subscribe({
      next: (updated) => {
        const idx = this.issues.findIndex(i => i.id === issue.id);
        if (idx > -1) this.issues[idx] = updated;
        this.applyFilters();
        this.reassigningId = null;
        this.reassignEmail = '';
        this.toast('success', `Reassigned to ${user.fullname}`);
      },
      error: (err) => this.toast('error', err)
    });
  }

  // ── Share ───────────────────────────────────────────────────────────────────

  openShare(issue: Issue): void {
    this.sharingIssue = issue;
    this.shareTab = 'DM';
    this.channelSearch = '';
    this.userSearch = '';
    this.channels = [];
    this.dmUsers = [];
    this.shareLoading = true;
    this.showShareDialog = true;

    forkJoin({
      channels: this.api.getChannels(),
      users: this.api.getAllUsers(),
    }).subscribe({
      next: ({ channels, users }) => {
        this.channels = (channels || [])
          .filter((c: any) => c.status !== 'ARCHIVED' && c.channelType !== 'PRIVATE')
          .map((c: any) => ({ id: c.id ?? c.channelId ?? 0, name: c.name || c.channelCode || 'Channel', selected: false }))
          .sort((a: ChannelItem, b: ChannelItem) => a.name.localeCompare(b.name));

        this.dmUsers = (users || [])
          .map((u: any) => {
            const fn = String(u?.firstName || u?.firstname || '').trim();
            const ln = String(u?.lastName || u?.lastname || '').trim();
            const fullName = (fn || ln) ? `${fn} ${ln}`.trim() : String(u?.fullname || u?.username || u?.name || '').trim();
            return {
              id: Number(u?.id || u?.userId || 0),
              userId: Number(u?.userId || u?.id || 0),
              fullname: fullName,
              email: String(u?.email || u?.emailAddress || ''),
              selected: false,
            };
          })
          .filter((u: UserItem) => u.id && (u.fullname || u.email))
          .sort((a: UserItem, b: UserItem) => (a.fullname || '').localeCompare(b.fullname || ''));

        this.shareLoading = false;
      },
      error: () => { this.shareLoading = false; this.toast('error', 'Failed to load contacts. Check your connection.'); }
    });
  }

  toggleChannelSelect(item: ChannelItem): void { item.selected = !item.selected; }
  toggleUserSelect(item: UserItem): void { item.selected = !item.selected; }

  submitShare(): void {
    if (!this.sharingIssue?.id) return;

    const selectedChannels = this.channels.filter(c => c.selected);
    const selectedUsers = this.dmUsers.filter(u => u.selected);

    if (this.shareTab === 'CHANNEL' && !selectedChannels.length) {
      this.toast('error', 'Select at least one channel.');
      return;
    }
    if (this.shareTab === 'DM' && !selectedUsers.length) {
      this.toast('error', 'Select at least one person.');
      return;
    }

    this.shareSubmitting = true;
    const issue = this.sharingIssue;
    const id = issue.id!;
    const senderUserId = Number(sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || 0);

    const shareCalls = this.shareTab === 'CHANNEL'
      ? selectedChannels.map(c => this.api.shareIssue(id, {
          shareType: 'CHANNEL', channelName: c.name, sharedByUserId: senderUserId,
        }))
      : selectedUsers.map(u => this.api.shareIssue(id, {
          shareType: 'DM', sharedToUserId: u.userId,
          sharedToName: u.fullname, sharedToEmail: u.email, sharedByUserId: senderUserId,
        }));

    forkJoin(shareCalls).subscribe({
      next: () => {
        const msgCalls = this.shareTab === 'CHANNEL'
          ? selectedChannels.map(c =>
              this.api.postIssueCardMessage(c.id, senderUserId, issue))
          : selectedUsers.map(u =>
              this.api.getOrCreateDmChannel(senderUserId, u.userId ?? u.id)
                .pipe(switchMap((channel: any) => this.api.postIssueCardMessage(channel.id ?? channel.channelId, senderUserId, issue)))
            );

        forkJoin(msgCalls.length ? msgCalls : [this.api.getShares(id)]).subscribe({
          error: () => {}
        });

        this.shareSubmitting = false;
        this.showShareDialog = false;
        const count = shareCalls.length;
        const successMsg = this.shareTab === 'CHANNEL'
          ? `Issue shared to ${count} channel${count > 1 ? 's' : ''}`
          : `Issue shared with ${count} person${count > 1 ? 's' : ''}`;
        this.toast('success', successMsg);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('optimax-notification', {
            detail: { title: `Bug #${id} shared`, body: successMsg, category: 'module' }
          }));
        }
      },
      error: (err) => {
        const msg = typeof err === 'string' ? err : 'Share failed. The server may not support this operation yet.';
        this.toast('error', msg);
        this.shareSubmitting = false;
      }
    });
  }

  // ── Link to task ────────────────────────────────────────────────────────────

  openLinkPanel(issue: Issue): void {
    this.linkingIssue = issue;
    this.selectedTaskId = issue.workTaskId || null;
    this.linkedTaskTitle = '';
    this.taskSearch = '';
    this.showCreateTask = false;
    this.newTaskTitle = '';
    this.newTaskPriority = 'MEDIUM';
    this.newTaskStatus = 'TO_DO';
    this.availableTasks = [];
    this.linkPanelLoading = true;
    this.showLinkPanel = true;

    this.api.getAllTasks().subscribe({
      next: (tasks) => {
        this.availableTasks = (tasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status || '',
          priority: t.priority || '',
        }));
        if (this.selectedTaskId) {
          const linked = this.availableTasks.find(t => t.id === this.selectedTaskId);
          if (linked) this.linkedTaskTitle = linked.title;
        }
        this.linkPanelLoading = false;
      },
      error: () => { this.linkPanelLoading = false; }
    });
  }

  selectTask(task: TaskItem): void {
    this.selectedTaskId = task.id;
    this.linkedTaskTitle = task.title;
    this.taskSearch = '';
  }

  clearTaskLink(): void {
    this.selectedTaskId = null;
    this.linkedTaskTitle = '';
  }

  createAndLinkTask(): void {
    if (!this.newTaskTitle.trim()) return;
    this.creatingTask = true;
    const dto = {
      title: this.newTaskTitle.trim(),
      priority: this.newTaskPriority,
      status: this.newTaskStatus,
      description: `Linked from Issue #${this.linkingIssue?.id}: ${this.linkingIssue?.title}`,
    };
    this.api.createTask(dto).subscribe({
      next: (created) => {
        this.availableTasks.unshift({ id: created.id, title: created.title, status: created.status, priority: created.priority });
        this.selectedTaskId = created.id;
        this.linkedTaskTitle = created.title;
        this.showCreateTask = false;
        this.newTaskTitle = '';
        this.creatingTask = false;
        this.toast('success', `Task #${created.id} created and selected`);
      },
      error: (err) => { this.toast('error', err); this.creatingTask = false; }
    });
  }

  saveLinks(): void {
    if (!this.linkingIssue?.id) return;
    const payload = {
      ...this.linkingIssue,
      workTaskId: this.selectedTaskId || null,
    };
    this.api.update(this.linkingIssue.id, payload).subscribe({
      next: (updated) => {
        const idx = this.issues.findIndex(i => i.id === this.linkingIssue!.id);
        if (idx > -1) this.issues[idx] = updated;
        this.applyFilters();
        this.showLinkPanel = false;
        this.toast('success', this.selectedTaskId ? `Linked to Task #${this.selectedTaskId}` : 'Task link removed');
      },
      error: (err) => this.toast('error', err)
    });
  }

  // ── Attachment handlers ──────────────────────────────────────────────────────

  @HostListener('document:paste', ['$event'])
  onDocumentPaste(e: ClipboardEvent): void {
    if (!this.showForm) return;
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(i => i.kind === 'file' && i.type.startsWith('image/'));
    if (!imageItems.length) return;
    imageItems.forEach(item => {
      const file = item.getAsFile();
      if (file) this.processFiles([file]);
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.processFiles(Array.from(input.files));
    input.value = '';
  }

  onFormDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOverForm = true;
  }

  onFormDragLeave(): void {
    this.dragOverForm = false;
  }

  onFormDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOverForm = false;
    if (e.dataTransfer?.files) this.processFiles(Array.from(e.dataTransfer.files));
  }

  removeFormAttachment(index: number): void {
    this.formAttachments = this.formAttachments.filter((_, i) => i !== index);
  }

  descriptionText(desc?: string): string {
    if (!desc) return '';
    const i = desc.indexOf(this.ATTACH_DELIM);
    return i > -1 ? desc.substring(0, i) : desc;
  }

  attachmentsFromDesc(desc?: string): AttachmentItem[] {
    if (!desc) return [];
    const i = desc.indexOf(this.ATTACH_DELIM);
    if (i === -1) return [];
    try { return JSON.parse(desc.substring(i + this.ATTACH_DELIM.length)); } catch { return []; }
  }

  private processFiles(files: File[]): void {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.formAttachments = [
          ...this.formAttachments,
          { name: file.name || 'image.png', dataUrl: ev.target!.result as string, type: file.type },
        ];
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Image carousel / lightbox ─────────────────────────────────────────────────

  openCarousel(allAtts: AttachmentItem[], clickedIndex: number, event: MouseEvent): void {
    event.stopPropagation();
    const imageAtts = allAtts.filter(a => a.type?.startsWith('image/'));
    if (!imageAtts.length) return;
    const images = imageAtts.map(a => a.dataUrl);
    const clickedSrc = allAtts[clickedIndex]?.dataUrl ?? '';
    const startIdx = Math.max(0, images.indexOf(clickedSrc));
    this.showCarouselDom(images, startIdx);
  }

  private showCarouselDom(images: string[], startIdx: number): void {
    this.removeLightboxDom();
    let idx = startIdx;
    const total = images.length;

    const overlay = document.createElement('div');
    overlay.id = '_bt_lightbox';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(0,0,0,0.92)', 'display:flex',
      'flex-direction:column', 'align-items:center', 'justify-content:center',
      'gap:12px', 'padding:56px 80px 28px', 'box-sizing:border-box', 'cursor:default'
    ].join(';');

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'position:absolute;top:14px;right:18px;background:none;border:none;color:#fff;font-size:26px;line-height:1;cursor:pointer;padding:0;';
    closeBtn.innerHTML = '&#x2715;';
    closeBtn.onclick = (e) => { e.stopPropagation(); this.removeLightboxDom(); };

    const imgEl = document.createElement('img');
    imgEl.src = images[idx];
    imgEl.style.cssText = 'max-width:88vw;max-height:72vh;object-fit:contain;border-radius:10px;box-shadow:0 24px 60px rgba(0,0,0,0.6);display:block;transition:opacity 0.15s;';
    imgEl.onclick = (e) => e.stopPropagation();

    const counter = document.createElement('div');
    counter.style.cssText = 'color:rgba(255,255,255,0.75);font-size:13px;font-family:Arial,sans-serif;min-width:60px;text-align:center;';

    const dotEls: HTMLButtonElement[] = [];
    const dotsRow = document.createElement('div');
    dotsRow.style.cssText = 'display:flex;gap:6px;align-items:center;justify-content:center;';
    if (total > 1 && total <= 12) {
      for (let d = 0; d < total; d++) {
        const dot = document.createElement('button');
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;border:none;cursor:pointer;padding:0;transition:background 0.2s;';
        dot.style.background = d === idx ? '#ffffff' : 'rgba(255,255,255,0.35)';
        dotEls.push(dot);
        dotsRow.appendChild(dot);
      }
    }

    const hint = document.createElement('p');
    hint.style.cssText = 'color:rgba(255,255,255,0.45);font-size:12px;margin:0;font-family:Arial,sans-serif;';
    hint.textContent = total > 1
      ? 'Use ← → arrow keys to navigate · Esc to close'
      : 'Click outside or press Esc to close';

    const navigate = (newIdx: number): void => {
      idx = newIdx;
      imgEl.style.opacity = '0';
      setTimeout(() => { imgEl.src = images[idx]; imgEl.style.opacity = '1'; }, 150);
      if (total > 1) counter.textContent = `${idx + 1} / ${total}`;
      dotEls.forEach((d, i) => { d.style.background = i === idx ? '#ffffff' : 'rgba(255,255,255,0.35)'; });
    };

    dotEls.forEach((dot, d) => { dot.onclick = (e) => { e.stopPropagation(); navigate(d); }; });

    if (total > 1) {
      counter.textContent = `${idx + 1} / ${total}`;

      const prevBtn = document.createElement('button');
      prevBtn.style.cssText = 'position:absolute;left:16px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:32px;width:48px;height:48px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;';
      prevBtn.innerHTML = '&#8249;';
      prevBtn.onclick = (e) => { e.stopPropagation(); navigate(((idx - 1) + total) % total); };
      prevBtn.onmouseenter = () => { prevBtn.style.background = 'rgba(255,255,255,0.25)'; };
      prevBtn.onmouseleave = () => { prevBtn.style.background = 'rgba(255,255,255,0.12)'; };

      const nextBtn = document.createElement('button');
      nextBtn.style.cssText = 'position:absolute;right:16px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:32px;width:48px;height:48px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;';
      nextBtn.innerHTML = '&#8250;';
      nextBtn.onclick = (e) => { e.stopPropagation(); navigate((idx + 1) % total); };
      nextBtn.onmouseenter = () => { nextBtn.style.background = 'rgba(255,255,255,0.25)'; };
      nextBtn.onmouseleave = () => { nextBtn.style.background = 'rgba(255,255,255,0.12)'; };

      overlay.appendChild(prevBtn);
      overlay.appendChild(nextBtn);
    }

    const onKey = (e: KeyboardEvent) => {
      if (total <= 1) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(((idx - 1) + total) % total); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate((idx + 1) % total); }
    };
    document.addEventListener('keydown', onKey);
    (overlay as any)._keyHandler = onKey;

    overlay.onclick = () => this.removeLightboxDom();

    overlay.appendChild(closeBtn);
    overlay.appendChild(imgEl);
    if (total > 1) {
      overlay.appendChild(counter);
      if (total <= 12) overlay.appendChild(dotsRow);
    }
    overlay.appendChild(hint);

    document.body.appendChild(overlay);
  }

  private removeLightboxDom(): void {
    const el = document.getElementById('_bt_lightbox');
    if (el) {
      const kh = (el as any)._keyHandler;
      if (kh) document.removeEventListener('keydown', kh);
      document.body.removeChild(el);
    }
  }

  @HostListener('document:keydown.escape')
  closeLightbox(): void {
    this.removeLightboxDom();
  }

  // ── Email notifications ─────────────────────────────────────────────────────

  private sendAssigneeEmail(issue: Issue): void {
    const assigneeName  = issue.assigneeName  || issue.assigneeEmail || 'Team Member';
    const reporterName  = issue.reporterName  || issue.reporterEmail || 'A colleague';
    const priorityColor: Record<string, string> = {
      CRITICAL: '#b91c1c', HIGH: '#c2410c', MEDIUM: '#d97706', LOW: '#16a34a',
    };
    const statusLabel: Record<string, string> = {
      OPEN: 'Open', IN_PROGRESS: 'In Progress', BLOCKED: 'Blocked',
      TESTING: 'Testing', DONE: 'Done', WONT_FIX: "Won't Fix",
    };
    const priColor  = priorityColor[issue.priority] || '#475569';
    const appBase   = typeof window !== 'undefined' ? window.location.origin : '';
    const issueUrl  = `${appBase}/admin/settings/bug-tracker?issue=${issue.id}`;
    const dateStr   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const body = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:0 0 32px 0;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1e3a4c,#2e6276);padding:28px 32px 24px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">OptimaX Issue Tracker</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">You have been assigned a new issue</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;color:#1e293b;">Hi <strong>${assigneeName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
            <strong>${reporterName}</strong> has raised an issue and assigned it to you on the OptimaX platform.
          </p>
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:4px solid ${priColor};border-radius:10px;padding:20px 22px;margin-bottom:24px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">
              <span style="background:#2e6276;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;padding:3px 8px;border-radius:4px;">${issue.module}</span>
              <span style="color:#64748b;font-size:12px;font-weight:600;">#${issue.id}</span>
              <span style="color:${priColor};background:${priColor}1a;font-size:11px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:4px;">${issue.priority}</span>
              <span style="color:#1d4ed8;background:#dbeafe;font-size:11px;font-weight:600;text-transform:uppercase;padding:2px 8px;border-radius:4px;">${statusLabel[issue.status] || issue.status}</span>
            </div>
            <h2 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#0f172a;line-height:1.35;">${issue.title}</h2>
            ${issue.description ? `<p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">${this.descriptionText(issue.description)}</p>` : ''}
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
            <tr>
              <td style="padding:9px 14px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0;color:#374151;width:35%;">Reported By</td>
              <td style="padding:9px 14px;border:1px solid #e2e8f0;color:#1e293b;">${reporterName}</td>
            </tr>
            ${issue.supervisorName || issue.supervisorEmail ? `
            <tr>
              <td style="padding:9px 14px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0;color:#374151;">Supervisor</td>
              <td style="padding:9px 14px;border:1px solid #e2e8f0;color:#1e293b;">${issue.supervisorName || issue.supervisorEmail}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:9px 14px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0;color:#374151;">Date Raised</td>
              <td style="padding:9px 14px;border:1px solid #e2e8f0;color:#1e293b;">${dateStr}</td>
            </tr>
            ${issue.tags ? `
            <tr>
              <td style="padding:9px 14px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0;color:#374151;">Tags</td>
              <td style="padding:9px 14px;border:1px solid #e2e8f0;color:#1e293b;">${issue.tags}</td>
            </tr>` : ''}
          </table>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${issueUrl}" style="display:inline-block;background:#2e6276;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700;font-size:14px;">
              View Issue in OptimaX
            </a>
          </div>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
            Please keep the issue status updated as you work on it.
          </p>
        </div>
        <div style="background:#f1f5f9;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">OptimaX ERP Platform &nbsp;·&nbsp; This is an automated notification.</p>
        </div>
      </div>
    `;

    this.api.sendEmail({
      name:          assigneeName,
      receiverEmail: issue.assigneeEmail!,
      subject:       `[OptimaX] Issue Assigned: ${issue.title} [#${issue.id}]`,
      body,
    }).subscribe();
  }

  private sendReporterStatusEmail(issue: Issue, fromStatus: Status): void {
    if (!issue.reporterEmail) return;
    const reporterName = issue.reporterName || issue.reporterEmail || 'Reporter';
    const assigneeName = issue.assigneeName || issue.assigneeEmail || 'the assigned engineer';
    const statusLabel: Record<string, string> = {
      OPEN: 'Open', IN_PROGRESS: 'In Progress', BLOCKED: 'Blocked',
      TESTING: 'Testing', DONE: 'Done', WONT_FIX: "Won't Fix",
    };
    const statusColors: Record<string, string> = {
      OPEN: '#dc2626', IN_PROGRESS: '#1d4ed8', BLOCKED: '#b45309',
      TESTING: '#7c3aed', DONE: '#16a34a', WONT_FIX: '#64748b',
    };
    const fromLabel = statusLabel[fromStatus] || fromStatus;
    const toLabel   = statusLabel[issue.status] || issue.status;
    const toColor   = statusColors[issue.status] || '#475569';
    const appBase   = typeof window !== 'undefined' ? window.location.origin : '';
    const issueUrl  = `${appBase}/admin/settings/bug-tracker?issue=${issue.id}`;
    const dateStr   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const body = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:0 0 32px;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1e3a4c,#2e6276);padding:28px 32px 24px;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">OptimaX Issue Tracker</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Issue status has been updated</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;color:#1e293b;">Hi <strong>${reporterName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
            An issue you reported has been updated by <strong>${assigneeName}</strong>.
          </p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px 22px;margin-bottom:24px;">
            <h2 style="margin:0 0 16px;font-size:15px;font-weight:700;color:#0f172a;">#${issue.id} — ${issue.title}</h2>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <span style="font-size:13px;color:#64748b;">Status changed from</span>
              <span style="background:#f1f5f9;color:#374151;font-weight:600;font-size:12px;padding:4px 10px;border-radius:6px;">${fromLabel}</span>
              <span style="color:#94a3b8;font-size:14px;">→</span>
              <span style="background:${toColor}1a;color:${toColor};font-weight:700;font-size:12px;padding:4px 10px;border-radius:6px;">${toLabel}</span>
            </div>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${issueUrl}" style="display:inline-block;background:#2e6276;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700;font-size:14px;">
              View Issue in OptimaX
            </a>
          </div>
          <p style="margin:0;font-size:12px;color:#94a3b8;">${dateStr} · This is an automated notification. Do not reply.</p>
        </div>
      </div>
    `;

    this.api.sendEmail({
      name:          reporterName,
      receiverEmail: issue.reporterEmail,
      subject:       `[OptimaX] Issue #${issue.id} status updated: ${fromLabel} → ${toLabel}`,
      body,
    }).subscribe();
  }

  private sendLogNotificationEmail(issue: Issue, log: WorkLog, loggerName: string): void {
    if (!issue.reporterEmail) return;
    const reporterName = issue.reporterName || issue.reporterEmail || 'Reporter';
    const appBase  = typeof window !== 'undefined' ? window.location.origin : '';
    const issueUrl = `${appBase}/admin/settings/bug-tracker?issue=${issue.id}`;
    const dateStr  = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr  = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const body = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:0 0 32px;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1e3a4c,#2e6276);padding:28px 32px 24px;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">OptimaX Issue Tracker</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">A new update has been added to your issue</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;color:#1e293b;">Hi <strong>${reporterName}</strong>,</p>
          <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
            <strong>${loggerName}</strong> added a work log update to issue <strong>#${issue.id}</strong>.
          </p>
          <div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid #2e6276;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
            <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${loggerName} &nbsp;·&nbsp; ${dateStr} ${timeStr}</div>
            <p style="margin:0;font-size:13.5px;color:#1e293b;line-height:1.6;white-space:pre-wrap;">${log.note}</p>
          </div>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${issueUrl}" style="display:inline-block;background:#2e6276;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700;font-size:14px;">
              View Issue #${issue.id}
            </a>
          </div>
          <p style="margin:0;font-size:12px;color:#94a3b8;">${dateStr} · This is an automated notification. Do not reply.</p>
        </div>
      </div>
    `;

    this.api.sendEmail({
      name:          reporterName,
      receiverEmail: issue.reporterEmail,
      subject:       `[OptimaX] Update on Issue #${issue.id}: ${issue.title}`,
      body,
    }).subscribe();
  }

  taskStatusLabel(s: string): string {
    return { TO_DO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done' }[s] || s;
  }

  exportCsv(): void {
    const rows = [['ID', 'Title', 'Module', 'Priority', 'Status', 'Assignee', 'Reporter', 'Created',
      'WorkTask', 'PerformanceGoal']];
    this.filtered.forEach(b => rows.push([
      String(b.id), b.title, b.module, b.priority, b.status,
      b.assigneeEmail || '', b.reporterEmail || '', b.createdAt || '',
      b.workTaskId ? String(b.workTaskId) : '', b.performanceGoalId ? String(b.performanceGoalId) : ''
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'optimax_issues.csv';
    a.click();
  }

  priorityClass(p: string): string {
    return ({ CRITICAL: 'pri-critical', HIGH: 'pri-high', MEDIUM: 'pri-medium', LOW: 'pri-low' } as Record<string, string>)[p] || '';
  }

  statusClass(s: Status): string {
    return { OPEN: 'st-open', IN_PROGRESS: 'st-inprog', BLOCKED: 'st-blocked', TESTING: 'st-testing', DONE: 'st-done', WONT_FIX: 'st-wontfix' }[s] || '';
  }

  statusLabel(s: Status): string {
    return { OPEN: 'Open', IN_PROGRESS: 'In Progress', BLOCKED: 'Blocked', TESTING: 'Testing', DONE: 'Done', WONT_FIX: "Won't Fix" }[s] || s;
  }

  formLogNote = '';
  tempFormLog: WorkLog[] = [];

  addFormLog(): void {
    if (!this.formLogNote.trim()) return;
    this.tempFormLog = [{
      note: this.formLogNote.trim(),
      loggedByEmail: this.form.reporterEmail || '',
      loggedByName: this.form.reporterName || '',
      createdAt: new Date().toISOString()
    }, ...this.tempFormLog];
    this.formLogNote = '';
  }

  removeFormLog(index: number): void {
    this.tempFormLog.splice(index, 1);
  }

  timeAgo(dateStr?: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  formatResolution(hours?: number): string {
    if (hours == null) return '';
    if (hours < 1)   return '< 1h';
    if (hours < 24)  return `${hours}h`;
    const days = Math.floor(hours / 24);
    const rem  = hours % 24;
    return rem ? `${days}d ${rem}h` : `${days}d`;
  }

  parseTags(tags?: string): string[] {
    if (!tags) return [];
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  safeDisplayName(name?: string): string {
    return (!name || name === 'undefined' || name === 'null') ? '' : name;
  }

  private blankForm(): Partial<Issue> {
    const meId = Number(sessionStorage.getItem('userid') || sessionStorage.getItem('userId') || 0) || undefined;
    const meEmail = sessionStorage.getItem('email') || sessionStorage.getItem('userEmail') || '';
    const rawName = sessionStorage.getItem('fullname') || sessionStorage.getItem('username') || '';
    const meName = (rawName === 'undefined' || rawName === 'null') ? '' : rawName;
    return { title: '', module: '', priority: 'MEDIUM', status: 'OPEN',
      issueType: 'BUG',
      tags: '',
      reporterUserId: meId,
      reporterEmail: meEmail, reporterName: meName,
      assigneeEmail: '', assigneeName: '',
      supervisorEmail: '', supervisorName: '', description: '' };
  }

  trackAttachment(index: number, att: AttachmentItem): string {
    return att.dataUrl || String(index);
  }

  private toast(severity: 'success' | 'error', detail: string): void {
    this.messageService.add({ severity, summary: severity === 'success' ? 'Done' : 'Error', detail, key: 'tl', life: 3500 });
  }
}
