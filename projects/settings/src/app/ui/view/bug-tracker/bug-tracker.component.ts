import { Component, OnInit } from '@angular/core';

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
type Status = 'Open' | 'In Progress' | 'Blocked' | 'Done' | "Won't Fix";

interface WorkLog {
  timestamp: string;
  note: string;
}

interface Bug {
  id: string;
  title: string;
  module: string;
  priority: Priority;
  status: Status;
  assignee: string;
  reporter: string;
  createdAt: string;
  description: string;
  workLog: WorkLog[];
}

const STORAGE_KEY = 'optimax_bugs_v2';

const SEED_BUGS: Bug[] = [
  { id: 'BUG-001', title: 'Commerce submenus not visible to non-admin users', module: 'Commerce', priority: 'Critical', status: 'Open', assignee: 'Frontend Team', reporter: 'Damilola Awe', createdAt: new Date().toISOString(), description: 'AppRegister entries missing for AI_ANALYSIS, QUOTE_MGMT, DELIVERY_MGMT, DOC_MGMT, PROCURE_MGMT, VENDOR_PORTAL. getUserPermissions() returns empty array for these codes so sidebar filters them out.', workLog: [] },
  { id: 'BUG-002', title: 'Inventory Management not assignable to roles', module: 'Inventory', priority: 'Critical', status: 'Open', assignee: 'Backend Team', reporter: 'Damilola Awe', createdAt: new Date().toISOString(), description: 'No AppRegister rows for INVENTORY module. RolesNpermissionComponent builds permission matrix from module.appRegister which is empty, so Inventory never appears in role management.', workLog: [] },
  { id: 'BUG-003', title: 'AppModule/AppRegister CRUD forms missing in Settings', module: 'General', priority: 'High', status: 'In Progress', assignee: 'Frontend Team', reporter: 'Damilola Awe', createdAt: new Date().toISOString(), description: 'No UI to create AppModules or AppRegister entries. Admins cannot wire new frontend components to role permissions without direct DB access.', workLog: [] },
  { id: 'BUG-004', title: 'Paystack bulk transfer missing OTP confirmation step', module: 'Accounting', priority: 'High', status: 'Open', assignee: 'Backend Team', reporter: 'Damilola Awe', createdAt: new Date().toISOString(), description: 'PaystackTransferResource initiates bulk transfer but does not handle OTP finalisation endpoint (/transfer/finalize) when Paystack requires it.', workLog: [] },
  { id: 'BUG-005', title: 'Mono bank sync job has no error retry or dead-letter queue', module: 'Accounting', priority: 'High', status: 'Open', assignee: 'Backend Team', reporter: 'Damilola Awe', createdAt: new Date().toISOString(), description: 'PaystackSyncJobService runs as a scheduled job but failed syncs are silently dropped. No retry policy, no alerting.', workLog: [] },
  { id: 'BUG-006', title: 'Vendor RFQ comparison matrix not implemented', module: 'Procurement', priority: 'Medium', status: 'Open', assignee: 'Frontend Team', reporter: 'Damilola Awe', createdAt: new Date().toISOString(), description: 'VendorPortal shows individual vendor quotes but has no side-by-side comparison grid. Procurement staff must manually compare quotes.', workLog: [] },
  { id: 'BUG-007', title: 'Sales Order entity missing — no formal SO lifecycle', module: 'Commerce', priority: 'High', status: 'Open', assignee: 'Backend Team', reporter: 'Damilola Awe', createdAt: new Date().toISOString(), description: 'QuotationResource handles quote-to-order but there is no dedicated SalesOrder entity with status (draft/confirmed/invoiced/shipped). COGS cannot be auto-posted without an SO trigger.', workLog: [] },
  { id: 'BUG-008', title: 'Inventory reorder point alert not implemented', module: 'Inventory', priority: 'Medium', status: 'Open', assignee: 'Backend Team', reporter: 'Damilola Awe', createdAt: new Date().toISOString(), description: 'InventoryBalance tracks quantity but there is no scheduled job or webhook to raise an alert when stock falls below a configurable reorder point.', workLog: [] },
  { id: 'BUG-009', title: 'HR attendance clock-in location not validated server-side', module: 'Attendance', priority: 'Medium', status: 'Open', assignee: 'Backend Team', reporter: 'Damilola Awe', createdAt: new Date().toISOString(), description: 'Clock-in endpoint accepts lat/lng from client without server-side geofence check against branch location. Easy to spoof.', workLog: [] },
  { id: 'BUG-010', title: 'Payroll bulk payslip generation times out for large orgs', module: 'Payroll', priority: 'High', status: 'Open', assignee: 'Backend Team', reporter: 'Damilola Awe', createdAt: new Date().toISOString(), description: 'Processing all employees in a single synchronous HTTP call causes 504 on orgs with 200+ employees. Should be queued as a background job.', workLog: [] },
];

const MODULES = ['All', 'HR', 'Accounting', 'Commerce', 'Inventory', 'Procurement', 'Payroll', 'Attendance', 'Recruitment', 'Performance', 'Loans', 'POS', 'General', 'Infrastructure'];
const STATUSES: Status[] = ['Open', 'In Progress', 'Blocked', 'Done', "Won't Fix"];
const PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
const ASSIGNEES = ['Ese Oseose', 'Miracle I.', 'Damilola Awe', 'Backend Team', 'Frontend Team', 'DevOps', 'QA'];

@Component({
  selector: 'app-bug-tracker',
  templateUrl: './bug-tracker.component.html',
  styleUrl: './bug-tracker.component.scss'
})
export class BugTrackerComponent implements OnInit {

  bugs: Bug[] = [];
  filtered: Bug[] = [];

  activeModule = 'All';
  filterStatus = '';
  filterPriority = '';
  filterAssignee = '';
  searchText = '';
  sortBy: 'newest' | 'oldest' | 'priority' | 'status' = 'newest';

  modules = MODULES;
  statuses = STATUSES;
  priorities = PRIORITIES;
  assignees = ASSIGNEES;

  showForm = false;
  editingBug: Bug | null = null;
  form: Partial<Bug> = this.blankForm();

  expandedId: string | null = null;
  newLogNote = '';

  showStats = true;

  ngOnInit(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { this.bugs = JSON.parse(stored); } catch { this.bugs = []; }
    }
    if (this.bugs.length === 0) {
      this.bugs = SEED_BUGS;
      this.save();
    }
    this.applyFilters();
  }

  get stats() {
    const total = this.bugs.length;
    const done = this.bugs.filter(b => b.status === 'Done' || b.status === "Won't Fix").length;
    const open = this.bugs.filter(b => b.status === 'Open').length;
    const blocked = this.bugs.filter(b => b.status === 'Blocked').length;
    const critical = this.bugs.filter(b => b.priority === 'Critical' && b.status !== 'Done').length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, open, blocked, critical, pct };
  }

  selectModule(m: string): void {
    this.activeModule = m;
    this.applyFilters();
  }

  applyFilters(): void {
    let list = [...this.bugs];

    if (this.activeModule !== 'All') {
      list = list.filter(b => b.module === this.activeModule);
    }
    if (this.filterStatus) list = list.filter(b => b.status === this.filterStatus);
    if (this.filterPriority) list = list.filter(b => b.priority === this.filterPriority);
    if (this.filterAssignee) list = list.filter(b => b.assignee === this.filterAssignee);
    if (this.searchText) {
      const t = this.searchText.toLowerCase();
      list = list.filter(b => b.title.toLowerCase().includes(t) || b.description.toLowerCase().includes(t) || b.id.toLowerCase().includes(t));
    }

    list = list.sort((a, b) => {
      if (this.sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (this.sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (this.sortBy === 'priority') return PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
      if (this.sortBy === 'status') return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
      return 0;
    });

    this.filtered = list;
  }

  openForm(bug?: Bug): void {
    if (bug) {
      this.editingBug = bug;
      this.form = { ...bug };
    } else {
      this.editingBug = null;
      this.form = this.blankForm();
    }
    this.showForm = true;
  }

  saveForm(): void {
    if (!this.form.title || !this.form.module || !this.form.priority || !this.form.status) return;

    if (this.editingBug) {
      const idx = this.bugs.findIndex(b => b.id === this.editingBug!.id);
      if (idx > -1) this.bugs[idx] = { ...this.bugs[idx], ...this.form } as Bug;
    } else {
      const newBug: Bug = {
        id: 'BUG-' + String(this.nextId()).padStart(3, '0'),
        title: this.form.title!,
        module: this.form.module!,
        priority: this.form.priority as Priority,
        status: this.form.status as Status,
        assignee: this.form.assignee || '',
        reporter: this.form.reporter || '',
        createdAt: new Date().toISOString(),
        description: this.form.description || '',
        workLog: []
      };
      this.bugs.unshift(newBug);
    }
    this.save();
    this.applyFilters();
    this.showForm = false;
  }

  deleteBug(id: string): void {
    if (!confirm('Delete this bug?')) return;
    this.bugs = this.bugs.filter(b => b.id !== id);
    this.save();
    this.applyFilters();
  }

  updateStatus(bug: Bug, status: Status): void {
    bug.status = status;
    this.save();
    this.applyFilters();
  }

  toggleExpand(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
    this.newLogNote = '';
  }

  addLog(bug: Bug): void {
    if (!this.newLogNote.trim()) return;
    bug.workLog.unshift({ timestamp: new Date().toLocaleString(), note: this.newLogNote.trim() });
    this.newLogNote = '';
    this.save();
  }

  exportCsv(): void {
    const rows = [['ID', 'Title', 'Module', 'Priority', 'Status', 'Assignee', 'Reporter', 'Created']];
    this.filtered.forEach(b => rows.push([b.id, b.title, b.module, b.priority, b.status, b.assignee, b.reporter, b.createdAt]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'optimax_bugs.csv';
    a.click();
  }

  priorityClass(p: Priority): string {
    return { Critical: 'pri-critical', High: 'pri-high', Medium: 'pri-medium', Low: 'pri-low' }[p] || '';
  }

  statusClass(s: Status): string {
    return { 'Open': 'st-open', 'In Progress': 'st-inprog', 'Blocked': 'st-blocked', 'Done': 'st-done', "Won't Fix": 'st-wontfix' }[s] || '';
  }

  private nextId(): number {
    const ids = this.bugs.map(b => parseInt(b.id.replace('BUG-', ''), 10)).filter(n => !isNaN(n));
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  private blankForm(): Partial<Bug> {
    return { title: '', module: '', priority: 'Medium', status: 'Open', assignee: '', reporter: '', description: '' };
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bugs));
  }
}
