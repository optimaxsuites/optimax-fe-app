import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { forkJoin, catchError, of } from 'rxjs';

export interface OvertimeType {
  id: number;
  name: string;
  description?: string;
}

export interface Level {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

export interface OvertimeRule {
  id?: number;
  maxHours: number;
  rate: number;
  overtimeTypeId: number | null;
  levelId: number | null;
}

@Component({
  selector: 'app-overtime-management',
  templateUrl: './overtime-management.component.html',
  styleUrl: './overtime-management.component.scss',
})
export class OvertimeManagementComponent implements OnInit {
  readonly BASE = 'https://be.optimaxsuites.com/x/api/v2/hr';

  activeTab: 'rules' | 'types' = 'rules';

  loading = true;
  error = false;

  rules: OvertimeRule[] = [];
  types: OvertimeType[] = [];
  levels: Level[] = [];

  // ── Modal state ───────────────────────────────────────────────────────────
  showRuleModal = false;
  showTypeModal = false;
  showDeleteConfirm = false;

  ruleForm: OvertimeRule = this.blankRule();
  typeForm: OvertimeType = this.blankType();

  editingRuleId: number | null = null;
  editingTypeId: number | null = null;
  deletePending: { kind: 'rule' | 'type'; id: number } | null = null;

  saving = false;
  deleting = false;
  toast: { msg: string; kind: 'success' | 'error' } | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    forkJoin({
      rules:  this.http.get<OvertimeRule[]>(`${this.BASE}/overtimes?size=200`).pipe(catchError(() => of([]))),
      types:  this.http.get<OvertimeType[]>(`${this.BASE}/overtimeTypes?size=200`).pipe(catchError(() => of([]))),
      levels: this.http.get<Level[]>(`${this.BASE}/levels?size=200`).pipe(catchError(() => of([]))),
    }).subscribe({
      next: (data) => {
        this.rules  = data.rules  ?? [];
        this.types  = data.types  ?? [];
        this.levels = data.levels ?? [];
        this.loading = false;
      },
      error: () => { this.error = true; this.loading = false; },
    });
  }

  // ── Lookups ───────────────────────────────────────────────────────────────
  typeName(id: number | null): string {
    if (!id) return '—';
    return this.types.find(t => t.id === id)?.name ?? `#${id}`;
  }

  levelName(id: number | null): string {
    if (!id) return '—';
    return this.levels.find(l => l.id === id)?.name ?? `#${id}`;
  }

  ruleLabel(rule: OvertimeRule): string {
    return `${this.levelName(rule.levelId)} · ${this.typeName(rule.overtimeTypeId)}`;
  }

  rulesForType(typeId: number): number {
    return this.rules.filter(r => r.overtimeTypeId === typeId).length;
  }

  // ── Rule CRUD ─────────────────────────────────────────────────────────────
  openAddRule(): void {
    this.editingRuleId = null;
    this.ruleForm = this.blankRule();
    this.showRuleModal = true;
  }

  openEditRule(rule: OvertimeRule): void {
    this.editingRuleId = rule.id ?? null;
    this.ruleForm = { ...rule };
    this.showRuleModal = true;
  }

  saveRule(): void {
    if (this.saving) return;
    this.saving = true;
    const url = this.editingRuleId
      ? `${this.BASE}/overtimes/${this.editingRuleId}`
      : `${this.BASE}/overtimes`;
    const req = this.editingRuleId
      ? this.http.put<any>(url, this.ruleForm)
      : this.http.post<OvertimeRule>(url, this.ruleForm);
    req.pipe(catchError((e: HttpErrorResponse) => { this.showToast(e.message ?? 'Error', 'error'); this.saving = false; return of(null); }))
      .subscribe(res => {
        if (res !== null) {
          this.showToast(this.editingRuleId ? 'Rule updated' : 'Rule created', 'success');
          this.showRuleModal = false;
          this.load();
        }
        this.saving = false;
      });
  }

  confirmDeleteRule(rule: OvertimeRule): void {
    this.deletePending = { kind: 'rule', id: rule.id! };
    this.showDeleteConfirm = true;
  }

  // ── Type CRUD ─────────────────────────────────────────────────────────────
  openAddType(): void {
    this.editingTypeId = null;
    this.typeForm = this.blankType();
    this.showTypeModal = true;
  }

  openEditType(type: OvertimeType): void {
    this.editingTypeId = type.id;
    this.typeForm = { ...type };
    this.showTypeModal = true;
  }

  saveType(): void {
    if (this.saving) return;
    this.saving = true;
    const url = this.editingTypeId
      ? `${this.BASE}/overtimeTypes/${this.editingTypeId}`
      : `${this.BASE}/overtimeTypes`;
    const req = this.editingTypeId
      ? this.http.put<any>(url, this.typeForm)
      : this.http.post<OvertimeType>(url, this.typeForm);
    req.pipe(catchError((e: HttpErrorResponse) => { this.showToast(e.message ?? 'Error', 'error'); this.saving = false; return of(null); }))
      .subscribe(res => {
        if (res !== null) {
          this.showToast(this.editingTypeId ? 'Type updated' : 'Type created', 'success');
          this.showTypeModal = false;
          this.load();
        }
        this.saving = false;
      });
  }

  confirmDeleteType(type: OvertimeType): void {
    this.deletePending = { kind: 'type', id: type.id };
    this.showDeleteConfirm = true;
  }

  // ── Shared delete ─────────────────────────────────────────────────────────
  execDelete(): void {
    if (!this.deletePending || this.deleting) return;
    const { kind, id } = this.deletePending;
    this.deleting = true;
    const url = kind === 'rule'
      ? `${this.BASE}/overtimes/${id}`
      : `${this.BASE}/overtimeTypes/${id}`;
    this.http.delete(url).pipe(
      catchError((e: HttpErrorResponse) => { this.showToast(e.message ?? 'Error', 'error'); this.deleting = false; return of(null); })
    ).subscribe(() => {
      this.showToast('Deleted successfully', 'success');
      this.showDeleteConfirm = false;
      this.deletePending = null;
      this.deleting = false;
      this.load();
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletePending = null;
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  private showToast(msg: string, kind: 'success' | 'error'): void {
    this.toast = { msg, kind };
    setTimeout(() => (this.toast = null), 3500);
  }

  private blankRule(): OvertimeRule {
    return { maxHours: 0, rate: 0, overtimeTypeId: null, levelId: null };
  }

  private blankType(): OvertimeType {
    return { id: 0, name: '', description: '' };
  }
}
