import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { PayrollService } from '../../../service/payroll.service';

interface CorrectionEntry {
  empIndex: number;
  employeeId: any;
  name: string;
  originalNet: number;
  originalDeductions: number;
  originalGross: number;
  adjustedNet: number;
  adjustedDeductions: number;
  note: string;
  dirty: boolean;
}

@Component({
  selector: 'app-payroll-correction',
  templateUrl: './payroll-correction.component.html',
  styleUrls: ['./payroll-correction.component.scss'],
})
export class PayrollCorrectionComponent implements OnInit, OnDestroy {
  loading = false;
  saving = false;
  runs: any[] = [];
  selectedRunId: number | null = null;
  selectedRun: any = null;
  entries: CorrectionEntry[] = [];
  searchTerm = '';
  showReapproveConfirm = false;
  reapproveNote = '';
  toastMsg = ''; toastType: 'success' | 'error' | 'info' = 'info'; showToast = false;
  private subs = new Subscription();
  readonly monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  constructor(private payrollService: PayrollService) {}

  ngOnInit(): void { this.loadRuns(); }
  ngOnDestroy(): void { this.subs.unsubscribe(); }

  loadRuns(): void {
    this.loading = true;
    this.subs.add(
      this.payrollService.getPayrollGenerationResponses(1, 200).pipe(catchError(() => of([]))).subscribe({
        next: (res: any) => {
          this.runs = (Array.isArray(res) ? res : (res?.content ?? []))
            .sort((a: any, b: any) => (+b.year - +a.year) || (+b.month - +a.month));
          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  selectRun(runId: number): void {
    this.selectedRunId = runId;
    this.selectedRun = this.runs.find(r => r.id === runId) ?? null;
    const emps: any[] = (this.selectedRun?.employees ?? []).filter((e: any) =>
      (e.employee?.employeeStatus ?? e.employeeStatus ?? 'ACTIVE') === 'ACTIVE'
    );
    this.entries = emps.map((e, i) => ({
      empIndex: i,
      employeeId: e.employee?.id ?? e.employeeId ?? e.id,
      name: `${e.employee?.firstName ?? e.firstName ?? ''} ${e.employee?.lastName ?? e.lastName ?? ''}`.trim() || `Employee ${i + 1}`,
      originalNet: +(e.netPayable ?? 0),
      originalDeductions: +(e.totalDeductions ?? 0),
      originalGross: +(e.grossPay ?? 0),
      adjustedNet: +(e.netPayable ?? 0),
      adjustedDeductions: +(e.totalDeductions ?? 0),
      note: '',
      dirty: false,
    }));
  }

  runLabel(run: any): string {
    return `${this.monthNames[(+run.month - 1)]} ${run.year} — ${(run.employees ?? []).length} employees — ${(run.payrollApprovalInstance?.status || run.status || 'DRAFT').toUpperCase()}`;
  }

  markDirty(entry: CorrectionEntry): void {
    entry.dirty = entry.adjustedNet !== entry.originalNet || entry.adjustedDeductions !== entry.originalDeductions || !!entry.note;
  }

  get filteredEntries(): CorrectionEntry[] {
    const q = this.searchTerm.toLowerCase().trim();
    return q ? this.entries.filter(e => e.name.toLowerCase().includes(q)) : this.entries;
  }

  get dirtyCount(): number { return this.entries.filter(e => e.dirty).length; }

  resetEntry(entry: CorrectionEntry): void {
    entry.adjustedNet = entry.originalNet;
    entry.adjustedDeductions = entry.originalDeductions;
    entry.note = '';
    entry.dirty = false;
  }

  resetAll(): void { this.entries.forEach(e => this.resetEntry(e)); }

  fmt(v: number): string {
    return '₦' + Number(v).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  netDiff(entry: CorrectionEntry): number { return entry.adjustedNet - entry.originalNet; }

  saveCorrections(): void {
    const dirty = this.entries.filter(e => e.dirty);
    if (!dirty.length) { this.showAlert('No corrections to save.', 'info'); return; }
    // In production, call a PATCH/PUT endpoint per entry.
    // For now, store locally and show re-approval prompt
    const corrections = dirty.map(e => ({
      employeeId: e.employeeId,
      name: e.name,
      adjustedNet: e.adjustedNet,
      adjustedDeductions: e.adjustedDeductions,
      note: e.note,
    }));
    const storeKey = `payroll_corrections_run_${this.selectedRunId}`;
    localStorage.setItem(storeKey, JSON.stringify(corrections));
    this.showReapproveConfirm = true;
  }

  confirmReapproval(): void {
    if (!this.selectedRun?.payrollApprovalInstance?.id && !this.selectedRun?.id) {
      this.showAlert('No approval instance found for this run.', 'error');
      this.showReapproveConfirm = false;
      return;
    }
    this.saving = true;
    const approvalId = this.selectedRun.payrollApprovalInstance?.id ?? this.selectedRun.id;
    const payload = { comment: this.reapproveNote || 'Payroll corrections applied — re-submitted for approval.' };
    this.payrollService.approvePayroll(approvalId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.showReapproveConfirm = false;
        this.showAlert(`Corrections saved and payroll re-submitted for approval.`, 'success');
        this.entries.forEach(e => { if (e.dirty) { e.originalNet = e.adjustedNet; e.originalDeductions = e.adjustedDeductions; e.dirty = false; } });
      },
      error: () => {
        this.saving = false;
        this.showAlert('Corrections saved locally. Re-approval submission failed — retry from the Payroll screen.', 'error');
        this.showReapproveConfirm = false;
      }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMsg = msg; this.toastType = type; this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }
}
