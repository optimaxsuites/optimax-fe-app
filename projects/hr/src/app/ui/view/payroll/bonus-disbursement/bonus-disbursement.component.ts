import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';
import { PayrollService } from '../../../service/payroll.service';
import { EmployeeService } from '../../../service/employee.service';

type BonusStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
type BonusSource = 'BONUS' | 'COMMISSION' | 'INCENTIVE' | 'AWARD';

interface BonusEntry {
  id?: number;
  employeeId: number;
  employeeName: string;
  sourceType: BonusSource;
  amount: number;
  reason: string;
  status: BonusStatus;
  verdict?: string;
  createdAt?: string;
  applied?: boolean;
}

@Component({
  selector: 'app-bonus-disbursement',
  templateUrl: './bonus-disbursement.component.html',
  styleUrls: ['./bonus-disbursement.component.scss'],
})
export class BonusDisbursementComponent implements OnInit, OnDestroy {
  activeTab: 'pending' | 'approved' | 'rejected' | 'new' = 'pending';
  loading = false;
  submitting = false;
  bonuses: BonusEntry[] = [];
  employees: any[] = [];
  toastMsg = ''; toastType: 'success' | 'error' | 'info' = 'info'; showToast = false;

  // New bonus form
  form = {
    employeeId: null as number | null,
    sourceType: 'BONUS' as BonusSource,
    amount: null as number | null,
    reason: '',
  };

  // Approval panel
  approvingId: number | null = null;
  approvalComment = '';
  showApprovalPanel = false;
  approvalAction: 'approve' | 'reject' = 'approve';

  readonly sourceTypes: BonusSource[] = ['BONUS', 'COMMISSION', 'INCENTIVE', 'AWARD'];

  private subs = new Subscription();

  constructor(
    private payrollService: PayrollService,
    private employeeService: EmployeeService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  loadData(): void {
    this.loading = true;
    this.subs.add(
      forkJoin({
        bonuses: this.payrollService.getEmployeePayrollBonuses({ size: 500 }).pipe(catchError(() => of([]))),
        employees: this.employeeService.getAllEmployee().pipe(catchError(() => of([]))),
      }).subscribe({
        next: ({ bonuses, employees }) => {
          this.employees = (employees as any[]) ?? [];
          const rawBonuses: any[] = Array.isArray(bonuses) ? bonuses : (bonuses as any)?.content ?? [];
          this.bonuses = rawBonuses.map(b => ({
            id: b.id,
            employeeId: b.employeeId ?? b.employee?.id,
            employeeName: b.employee
              ? `${b.employee.firstName ?? ''} ${b.employee.lastName ?? ''}`.trim()
              : this.resolveName(b.employeeId),
            sourceType: (b.sourceType ?? 'BONUS').toUpperCase() as BonusSource,
            amount: +(b.amount ?? 0),
            reason: b.reason ?? b.description ?? '',
            status: (b.status ?? 'PENDING').toUpperCase() as BonusStatus,
            verdict: b.verdict ?? '',
            createdAt: b.createdAt ?? '',
            applied: !!b.applied,
          }));
          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  private resolveName(empId: number): string {
    const e = this.employees.find((em: any) => em.id === empId);
    if (!e) return `Employee #${empId}`;
    return `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim();
  }

  get pending(): BonusEntry[] { return this.bonuses.filter(b => b.status === 'PENDING'); }
  get approved(): BonusEntry[] { return this.bonuses.filter(b => b.status === 'APPROVED'); }
  get rejected(): BonusEntry[] { return this.bonuses.filter(b => b.status === 'REJECTED'); }

  fmt(v: number): string {
    return '₦' + Number(v).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  totalApproved(): number { return this.approved.reduce((s, b) => s + b.amount, 0); }

  submitNew(): void {
    if (!this.form.employeeId || !this.form.amount || !this.form.reason.trim()) {
      this.showAlert('Fill all fields: employee, amount, and reason.', 'error'); return;
    }
    this.submitting = true;
    const payload = {
      employeeId: this.form.employeeId,
      sourceType: this.form.sourceType,
      amount: this.form.amount,
      reason: this.form.reason,
      status: 'PENDING',
      applied: false,
    };
    this.payrollService.postEmployeePayrollBonus(payload).subscribe({
      next: (created: any) => {
        const emp = this.employees.find((e: any) => e.id === this.form.employeeId);
        this.bonuses.unshift({
          id: created.id,
          employeeId: this.form.employeeId!,
          employeeName: emp ? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() : `Employee #${this.form.employeeId}`,
          sourceType: this.form.sourceType,
          amount: this.form.amount!,
          reason: this.form.reason,
          status: 'PENDING',
        });
        this.form = { employeeId: null, sourceType: 'BONUS', amount: null, reason: '' };
        this.submitting = false;
        this.activeTab = 'pending';
        this.showAlert('Bonus entry created and pending approval.', 'success');
      },
      error: () => { this.submitting = false; this.showAlert('Failed to create bonus entry. Try again.', 'error'); }
    });
  }

  openApproval(bonus: BonusEntry, action: 'approve' | 'reject'): void {
    this.approvingId = bonus.id ?? null;
    this.approvalAction = action;
    this.approvalComment = '';
    this.showApprovalPanel = true;
  }

  confirmApproval(): void {
    if (!this.approvingId) return;
    const bonus = this.bonuses.find(b => b.id === this.approvingId);
    if (!bonus) return;
    this.submitting = true;
    const newStatus: BonusStatus = this.approvalAction === 'approve' ? 'APPROVED' : 'REJECTED';
    const payload = { ...bonus, status: newStatus, verdict: this.approvalComment };
    this.payrollService.updateEmployeePayrollBonus(this.approvingId, payload).subscribe({
      next: () => {
        bonus.status = newStatus;
        bonus.verdict = this.approvalComment;
        this.submitting = false;
        this.showApprovalPanel = false;
        this.showAlert(`Bonus ${newStatus.toLowerCase()} successfully.`, 'success');
        this.activeTab = this.approvalAction === 'approve' ? 'approved' : 'rejected';
      },
      error: () => { this.submitting = false; this.showAlert('Action failed. Try again.', 'error'); }
    });
  }

  private showAlert(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMsg = msg; this.toastType = type; this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }
}
