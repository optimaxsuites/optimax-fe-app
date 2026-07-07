import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, finalize } from 'rxjs';
import { CrmApiService } from '../../service/crm-api.service';
import {
  CommissionCategory, CommissionScheme, CommissionTarget, CommissionEntry,
} from '../../domain/crm.model';

@Component({
  selector: 'app-crm-commission',
  templateUrl: './crm-commission.component.html',
  styleUrls: ['./crm-commission.component.scss'],
})
export class CrmCommissionComponent implements OnInit {

  // ── Tab state ──────────────────────────────────────────────
  activeTab: 'schemes' | 'targets' | 'entries' | 'dashboard' | 'categories' = 'schemes';

  // ── Loading ────────────────────────────────────────────────
  loading$ = new BehaviorSubject(false);
  saving$  = new BehaviorSubject(false);

  // ── Categories ─────────────────────────────────────────────
  categories: CommissionCategory[] = [];
  showCategoryForm = false;
  editingCategory: CommissionCategory | null = null;
  categoryForm!: FormGroup;

  // ── Schemes ────────────────────────────────────────────────
  schemes: CommissionScheme[] = [];
  showSchemeForm = false;
  editingScheme: CommissionScheme | null = null;
  schemeForm!: FormGroup;

  readonly applicableToOptions = [
    { value: 'INDIVIDUAL', label: 'Individual Employee' },
    { value: 'DEPARTMENT', label: 'Department (all members)' },
    { value: 'UNIT',       label: 'Unit / Branch (all members)' },
    { value: 'ROLE',       label: 'Job Role (all holders)' },
  ];

  readonly calcMethods = [
    { value: 'PERCENT_SALES',   label: '% of Sales' },
    { value: 'PERCENT_PROFIT',  label: '% of Profit' },
    { value: 'PERCENT_REVENUE', label: '% of Revenue' },
    { value: 'FLAT_PER_UNIT',   label: 'Flat per Unit / Deal' },
    { value: 'TIERED',          label: 'Tiered Bands' },
  ];
  readonly frequencies = ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'PER_EVENT'];
  readonly paymentModes = ['PAYROLL', 'STANDALONE'];

  // ── Targets ────────────────────────────────────────────────
  targets: CommissionTarget[] = [];
  showTargetForm = false;
  editingTarget: CommissionTarget | null = null;
  targetForm!: FormGroup;

  // ── Entries ────────────────────────────────────────────────
  entries: CommissionEntry[] = [];
  showEntryForm = false;
  editingEntry: CommissionEntry | null = null;
  entryForm!: FormGroup;
  selectedEntryIds = new Set<number>();
  entryStatusFilter = '';

  // ── Dashboard stats ────────────────────────────────────────
  dashStats = { pending: 0, approved: 0, pendingAmount: 0, approvedAmount: 0, paid: 0, paidAmount: 0 };

  constructor(
    private api: CrmApiService,
    private fb: FormBuilder,
    private snack: MatSnackBar,
  ) {}

  ngOnInit() {
    this.buildForms();
    this.loadAll();
  }

  // ── Forms ──────────────────────────────────────────────────

  buildForms() {
    this.categoryForm = this.fb.group({
      name:        ['', Validators.required],
      description: [''],
      active:      [true],
    });

    this.schemeForm = this.fb.group({
      name:              ['', Validators.required],
      categoryId:        [null],
      calculationMethod: ['PERCENT_SALES', Validators.required],
      ratePercent:       [null],
      capAmount:         [null],
      minThreshold:      [null],
      frequency:         ['MONTHLY', Validators.required],
      paymentMode:       ['PAYROLL', Validators.required],
      applicableTo:      ['INDIVIDUAL'],
      active:            [true],
      validFrom:         [null],
      validTo:           [null],
      tiers:             this.fb.array([]),
    });

    this.targetForm = this.fb.group({
      schemeId:    [null, Validators.required],
      employeeId:  [null, Validators.required],
      employeeName:['', Validators.required],
      periodStart: ['', Validators.required],
      periodEnd:   ['', Validators.required],
      targetValue: [null, [Validators.required, Validators.min(0)]],
      currency:    ['NGN'],
      notes:       [''],
    });

    this.entryForm = this.fb.group({
      targetId:    [null],
      schemeId:    [null, Validators.required],
      employeeId:  [null, Validators.required],
      employeeName:['', Validators.required],
      periodStart: ['', Validators.required],
      periodEnd:   ['', Validators.required],
      actualValue: [null, [Validators.required, Validators.min(0)]],
      targetValue: [null],
      notes:       [''],
    });
  }

  get tiersArray(): FormArray {
    return this.schemeForm.get('tiers') as FormArray;
  }

  addTier() {
    this.tiersArray.push(this.fb.group({
      thresholdFrom: [0, Validators.required],
      thresholdTo:   [null],
      ratePercent:   [null, Validators.required],
    }));
  }

  removeTier(i: number) {
    this.tiersArray.removeAt(i);
  }

  isTiered(): boolean {
    return this.schemeForm.get('calculationMethod')?.value === 'TIERED';
  }

  // ── Load ───────────────────────────────────────────────────

  loadAll() {
    this.loadCategories();
    this.loadSchemes();
    this.loadTargets();
    this.loadEntries();
  }

  loadCategories() {
    this.api.getCommissionCategories().subscribe({
      next: (data) => { this.categories = data || []; },
      error: () => {},
    });
  }

  loadSchemes() {
    this.loading$.next(true);
    this.api.getCommissionSchemes().pipe(finalize(() => this.loading$.next(false))).subscribe({
      next: (data) => { this.schemes = data || []; },
      error: () => {},
    });
  }

  loadTargets() {
    this.api.getCommissionTargets().subscribe({
      next: (data) => { this.targets = data || []; },
      error: () => {},
    });
  }

  loadEntries(status?: string) {
    this.api.getCommissionEntries(status).subscribe({
      next: (data) => { this.entries = data || []; this.recalcDash(); },
      error: () => {},
    });
  }

  filterEntries() {
    this.loadEntries(this.entryStatusFilter || undefined);
  }

  recalcDash() {
    this.dashStats = this.entries.reduce((acc, e) => {
      if (e.status === 'PENDING_APPROVAL') { acc.pending++; acc.pendingAmount += e.computedAmount || 0; }
      if (e.status === 'APPROVED')         { acc.approved++; acc.approvedAmount += e.computedAmount || 0; }
      if (e.status === 'PAID')             { acc.paid++;     acc.paidAmount     += e.computedAmount || 0; }
      return acc;
    }, { pending: 0, approved: 0, pendingAmount: 0, approvedAmount: 0, paid: 0, paidAmount: 0 });
  }

  // ── Scheme CRUD ────────────────────────────────────────────

  openSchemeForm(s?: CommissionScheme) {
    this.editingScheme = s || null;
    this.tiersArray.clear();
    this.schemeForm.reset({ calculationMethod: 'PERCENT_SALES', frequency: 'MONTHLY', paymentMode: 'PAYROLL', active: true });
    if (s) {
      this.schemeForm.patchValue(s);
      (s.tiers || []).forEach(t => this.tiersArray.push(this.fb.group({
        thresholdFrom: [t.thresholdFrom, Validators.required],
        thresholdTo:   [t.thresholdTo],
        ratePercent:   [t.ratePercent, Validators.required],
      })));
    }
    this.showSchemeForm = true;
  }

  closeSchemeForm() { this.showSchemeForm = false; this.editingScheme = null; }

  saveScheme() {
    if (this.schemeForm.invalid) { this.schemeForm.markAllAsTouched(); return; }
    const payload: CommissionScheme = this.schemeForm.value;
    const cat = this.categories.find(c => c.id === payload.categoryId);
    if (cat) payload.categoryName = cat.name;
    this.saving$.next(true);
    const op = this.editingScheme?.id
      ? this.api.updateCommissionScheme(this.editingScheme.id, payload)
      : this.api.createCommissionScheme(payload);
    op.pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => { this.snack.open(`Scheme ${this.editingScheme ? 'updated' : 'created'}`, 'Close', { duration: 3000 }); this.closeSchemeForm(); this.loadSchemes(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  deleteScheme(s: CommissionScheme) {
    if (!confirm(`Delete scheme "${s.name}"?`)) return;
    this.api.deleteCommissionScheme(s.id!).subscribe({
      next: () => { this.snack.open('Scheme deleted', 'Close', { duration: 3000 }); this.loadSchemes(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  // ── Target CRUD ────────────────────────────────────────────

  openTargetForm(t?: CommissionTarget) {
    this.editingTarget = t || null;
    this.targetForm.reset({ currency: 'NGN' });
    if (t) this.targetForm.patchValue(t);
    this.showTargetForm = true;
  }

  closeTargetForm() { this.showTargetForm = false; this.editingTarget = null; }

  saveTarget() {
    if (this.targetForm.invalid) { this.targetForm.markAllAsTouched(); return; }
    const payload: CommissionTarget = this.targetForm.value;
    const scheme = this.schemes.find(s => s.id === payload.schemeId);
    if (scheme) payload.schemeName = scheme.name;
    this.saving$.next(true);
    const op = this.editingTarget?.id
      ? this.api.updateCommissionTarget(this.editingTarget.id, payload)
      : this.api.createCommissionTarget(payload);
    op.pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => { this.snack.open(`Target ${this.editingTarget ? 'updated' : 'set'}`, 'Close', { duration: 3000 }); this.closeTargetForm(); this.loadTargets(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  deleteTarget(t: CommissionTarget) {
    if (!confirm('Remove this target?')) return;
    this.api.deleteCommissionTarget(t.id!).subscribe({
      next: () => { this.snack.open('Target removed', 'Close', { duration: 3000 }); this.loadTargets(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  // ── Category CRUD ─────────────────────────────────────────

  openCategoryForm(c?: CommissionCategory) {
    this.editingCategory = c || null;
    this.categoryForm.reset({ active: true });
    if (c) this.categoryForm.patchValue(c);
    this.showCategoryForm = true;
  }

  closeCategoryForm() { this.showCategoryForm = false; this.editingCategory = null; }

  saveCategory() {
    if (this.categoryForm.invalid) { this.categoryForm.markAllAsTouched(); return; }
    const payload: CommissionCategory = this.categoryForm.value;
    this.saving$.next(true);
    const op = this.editingCategory?.id
      ? this.api.updateCommissionCategory(this.editingCategory.id, payload)
      : this.api.createCommissionCategory(payload);
    op.pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => { this.snack.open(`Category ${this.editingCategory ? 'updated' : 'created'}`, 'Close', { duration: 3000 }); this.closeCategoryForm(); this.loadCategories(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  deleteCategory(c: CommissionCategory) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    this.api.deleteCommissionCategory(c.id!).subscribe({
      next: () => { this.snack.open('Category deleted', 'Close', { duration: 3000 }); this.loadCategories(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  // ── Entry CRUD + Approval ──────────────────────────────────

  openEntryForm(e?: CommissionEntry) {
    this.editingEntry = e || null;
    this.entryForm.reset();
    if (e) this.entryForm.patchValue(e);
    this.showEntryForm = true;
  }

  closeEntryForm() { this.showEntryForm = false; this.editingEntry = null; }

  saveEntry() {
    if (this.entryForm.invalid) { this.entryForm.markAllAsTouched(); return; }
    const payload: CommissionEntry = { ...this.entryForm.value, status: 'DRAFT' };
    const scheme = this.schemes.find(s => s.id === payload.schemeId);
    if (scheme) payload.schemeName = scheme.name;
    this.saving$.next(true);
    const op = this.editingEntry?.id
      ? this.api.updateCommissionEntry(this.editingEntry.id, payload)
      : this.api.createCommissionEntry(payload);
    op.pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: () => { this.snack.open('Entry saved', 'Close', { duration: 3000 }); this.closeEntryForm(); this.loadEntries(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  submitForApproval(e: CommissionEntry) {
    this.api.updateCommissionEntry(e.id!, { status: 'PENDING_APPROVAL' }).subscribe({
      next: () => { this.snack.open('Submitted for approval', 'Close', { duration: 3000 }); this.loadEntries(); },
      error: (err) => this.snack.open(err, 'Close', { duration: 4000 }),
    });
  }

  approveSelected() {
    const ids = [...this.selectedEntryIds];
    if (!ids.length) { this.snack.open('Select entries to approve', 'Close', { duration: 3000 }); return; }
    this.api.approveCommissionEntries(ids).subscribe({
      next: () => { this.snack.open(`${ids.length} entries approved`, 'Close', { duration: 3000 }); this.selectedEntryIds.clear(); this.loadEntries(); },
      error: (e) => this.snack.open(e, 'Close', { duration: 4000 }),
    });
  }

  rejectEntry(e: CommissionEntry) {
    const reason = prompt('Rejection reason (optional):') ?? '';
    this.api.rejectCommissionEntry(e.id!, reason).subscribe({
      next: () => { this.snack.open('Entry rejected', 'Close', { duration: 3000 }); this.loadEntries(); },
      error: (err) => this.snack.open(err, 'Close', { duration: 4000 }),
    });
  }

  toggleEntrySelect(id: number) {
    if (this.selectedEntryIds.has(id)) this.selectedEntryIds.delete(id);
    else this.selectedEntryIds.add(id);
  }

  // ── HR Payroll Push ────────────────────────────────────────

  pushToPayroll(e: CommissionEntry) {
    if (!e.employeeId || !e.computedAmount) {
      this.snack.open('Entry must have an employee and computed amount', 'Close', { duration: 3000 });
      return;
    }
    const period = e.periodStart ? e.periodStart.slice(0, 7) : '';
    this.saving$.next(true);
    this.api.pushCommissionToPayroll({
      id: e.id!, employeeId: e.employeeId, amount: e.computedAmount,
      period, schemeName: e.schemeName,
    }).pipe(finalize(() => this.saving$.next(false))).subscribe({
      next: (res: any) => {
        this.api.updateCommissionEntry(e.id!, { status: 'PAID', hrBonusId: res?.id }).subscribe({
          next: () => { this.snack.open('Pushed to payroll run ✓', 'Close', { duration: 3000 }); this.loadEntries(); },
          error: () => this.snack.open('Pushed to HR payroll — status update pending', 'Close', { duration: 4000 }),
        });
      },
      error: (err) => this.snack.open(err, 'Close', { duration: 4000 }),
    });
  }

  // ── Helpers ────────────────────────────────────────────────

  statusColor(s?: string): string {
    const map: Record<string, string> = {
      DRAFT: '#94a3b8', PENDING_APPROVAL: '#f59e0b',
      APPROVED: '#10b981', PAID: '#6366f1', REJECTED: '#ef4444',
    };
    return map[s || ''] || '#64748b';
  }

  calcLabel(v?: string): string {
    return this.calcMethods.find(m => m.value === v)?.label ?? v ?? '—';
  }

  fmt(v?: number): string {
    if (v == null) return '—';
    if (v >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return '₦' + (v / 1_000).toFixed(0) + 'K';
    return '₦' + v.toLocaleString('en-NG');
  }

  pct(v?: number): string {
    return v != null ? v.toFixed(1) + '%' : '—';
  }

  entryStatusClass(s?: string): string {
    return (s || '').toLowerCase().replace(/_/g, '_');
  }

  achColor(v?: number): string {
    if (v == null) return '#94a3b8';
    if (v >= 100) return '#10b981';
    if (v >= 75)  return '#f59e0b';
    return '#ef4444';
  }

  get schemeBreakdown(): { schemeName: string; count: number; total: number; approved: number }[] {
    const map = new Map<string, { schemeName: string; count: number; total: number; approved: number }>();
    for (const e of this.entries) {
      const key = e.schemeName || 'Unknown';
      if (!map.has(key)) map.set(key, { schemeName: key, count: 0, total: 0, approved: 0 });
      const row = map.get(key)!;
      row.count++;
      row.total += e.computedAmount || 0;
      if (e.status === 'APPROVED' || e.status === 'PAID') row.approved += e.computedAmount || 0;
    }
    return [...map.values()];
  }
}
