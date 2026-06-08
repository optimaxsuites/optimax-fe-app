import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { IssueTrackerApiService } from '../../service/issue-tracker-api.service';

type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type Status = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'WONT_FIX';

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
  workLog?: WorkLog[];
  shares?: Share[];
}

const MODULES = ['All', 'HR', 'ACCOUNTING', 'COMMERCE', 'INVENTORY', 'PROCUREMENT',
  'PAYROLL', 'ATTENDANCE', 'RECRUITMENT', 'PERFORMANCE', 'LOANS', 'POS', 'GENERAL', 'INFRASTRUCTURE'];
const STATUSES: Status[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'WONT_FIX'];
const PRIORITIES: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

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

  activeModule = 'All';
  filterStatus = '';
  filterPriority = '';
  searchText = '';
  sortBy: 'newest' | 'oldest' | 'priority' | 'status' = 'newest';

  modules = MODULES;
  statuses = STATUSES;
  priorities = PRIORITIES;

  showForm = false;
  editingIssue: Issue | null = null;
  form: Partial<Issue> = this.blankForm();

  expandedId: number | null = null;
  newLogNote = '';
  newLogEmail = '';

  showShareDialog = false;
  sharingIssue: Issue | null = null;
  shareForm: Partial<Share> = { shareType: 'DM' };

  // Link panel
  showLinkPanel = false;
  linkingIssue: Issue | null = null;
  linkWorkTaskId = '';
  linkGoalId = '';

  constructor(
    private api: IssueTrackerApiService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getAll(1, 100).subscribe({
      next: (data) => {
        this.issues = data || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.toast('error', err);
        this.loading = false;
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
    if (this.filterStatus) list = list.filter(b => b.status === this.filterStatus);
    if (this.filterPriority) list = list.filter(b => b.priority === this.filterPriority);
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
    this.showForm = true;
  }

  saveForm(): void {
    if (!this.form.title || !this.form.module || !this.form.priority) return;
    this.saving = true;
    const payload = { ...this.form, status: this.form.status || 'OPEN' };

    const req = this.editingIssue?.id
      ? this.api.update(this.editingIssue.id, payload)
      : this.api.create(payload);

    req.subscribe({
      next: (saved) => {
        if (this.editingIssue?.id) {
          const idx = this.issues.findIndex(i => i.id === this.editingIssue!.id);
          if (idx > -1) this.issues[idx] = saved;
        } else {
          this.issues.unshift(saved);
        }
        this.applyFilters();
        this.showForm = false;
        this.saving = false;
        this.toast('success', this.editingIssue?.id ? 'Issue updated' : 'Issue created — notifications sent');
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
    this.api.patchStatus(issue.id!, status).subscribe({
      next: (updated) => {
        const idx = this.issues.findIndex(i => i.id === issue.id);
        if (idx > -1) this.issues[idx] = updated;
        this.applyFilters();
      },
      error: (err) => this.toast('error', err)
    });
  }

  toggleExpand(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
    this.newLogNote = '';
    this.newLogEmail = '';
  }

  addLog(issue: Issue): void {
    if (!this.newLogNote.trim()) return;
    const payload = {
      note: this.newLogNote.trim(),
      loggedByUserId: 0,
      loggedByEmail: this.newLogEmail || '',
      loggedByName: ''
    };
    this.api.addWorkLog(issue.id!, payload).subscribe({
      next: (log) => {
        if (!issue.workLog) issue.workLog = [];
        issue.workLog.unshift(log);
        this.newLogNote = '';
        this.newLogEmail = '';
      },
      error: (err) => this.toast('error', err)
    });
  }

  openShare(issue: Issue): void {
    this.sharingIssue = issue;
    this.shareForm = { shareType: 'DM' };
    this.showShareDialog = true;
  }

  submitShare(): void {
    if (!this.sharingIssue?.id) return;
    const payload = { ...this.shareForm, sharedByUserId: 0 };
    this.api.shareIssue(this.sharingIssue.id, payload).subscribe({
      next: () => {
        this.showShareDialog = false;
        this.toast('success', this.shareForm.shareType === 'DM'
          ? `Issue shared with ${this.shareForm.sharedToEmail} — email sent`
          : `Issue posted to #${this.shareForm.channelName}`);
      },
      error: (err) => this.toast('error', err)
    });
  }

  openLinkPanel(issue: Issue): void {
    this.linkingIssue = issue;
    this.linkWorkTaskId = issue.workTaskId ? String(issue.workTaskId) : '';
    this.linkGoalId = issue.performanceGoalId ? String(issue.performanceGoalId) : '';
    this.showLinkPanel = true;
  }

  saveLinks(): void {
    if (!this.linkingIssue?.id) return;
    const payload = {
      ...this.linkingIssue,
      workTaskId: this.linkWorkTaskId ? Number(this.linkWorkTaskId) : null,
      performanceGoalId: this.linkGoalId ? Number(this.linkGoalId) : null
    };
    this.api.update(this.linkingIssue.id, payload).subscribe({
      next: (updated) => {
        const idx = this.issues.findIndex(i => i.id === this.linkingIssue!.id);
        if (idx > -1) this.issues[idx] = updated;
        this.applyFilters();
        this.showLinkPanel = false;
        this.toast('success', 'Links saved');
      },
      error: (err) => this.toast('error', err)
    });
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

  priorityClass(p: Priority): string {
    return { CRITICAL: 'pri-critical', HIGH: 'pri-high', MEDIUM: 'pri-medium', LOW: 'pri-low' }[p] || '';
  }

  statusClass(s: Status): string {
    return { OPEN: 'st-open', IN_PROGRESS: 'st-inprog', BLOCKED: 'st-blocked', DONE: 'st-done', WONT_FIX: 'st-wontfix' }[s] || '';
  }

  statusLabel(s: Status): string {
    return { OPEN: 'Open', IN_PROGRESS: 'In Progress', BLOCKED: 'Blocked', DONE: 'Done', WONT_FIX: "Won't Fix" }[s] || s;
  }

  private blankForm(): Partial<Issue> {
    return { title: '', module: '', priority: 'MEDIUM', status: 'OPEN',
      reporterEmail: '', reporterName: '', assigneeEmail: '', assigneeName: '',
      supervisorEmail: '', supervisorName: '', description: '' };
  }

  private toast(severity: 'success' | 'error', detail: string): void {
    this.messageService.add({ severity, summary: severity === 'success' ? 'Done' : 'Error', detail, key: 'tl', life: 3500 });
  }
}
