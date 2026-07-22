import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';
import { PayrollService } from '../../../service/payroll.service';
import { v4 as uuidV4 } from 'uuid';

interface MonthBar {
  label: string;
  grossPct: number;
  netPct: number;
  grossRaw: number;
  netRaw: number;
}

@Component({
  selector: 'app-payroll-dashboard',
  templateUrl: './payroll-dashboard.component.html',
  styleUrls: ['./payroll-dashboard.component.scss'],
})
export class PayrollDashboardComponent implements OnInit, OnDestroy {
  loading = true;

  totalGrossThisMonth = 0;
  totalNetThisMonth = 0;
  totalDeductionsThisMonth = 0;
  employeeCountThisMonth = 0;
  pendingApprovals = 0;

  recentRuns: any[] = [];
  monthlyBars: MonthBar[] = [];

  private subs = new Subscription();

  readonly monthNames = [
    'Jan','Feb','Mar','Apr','May','Jun',
    'Jul','Aug','Sep','Oct','Nov','Dec',
  ];

  get insightText(): string {
    if (this.pendingApprovals > 0) {
      return `${this.pendingApprovals} payroll run${this.pendingApprovals > 1 ? 's' : ''} awaiting approval. Review and approve to proceed with disbursement.`;
    }
    if (this.totalNetThisMonth === 0) {
      return 'No payroll has been generated for the current month yet. Use "Generate Payroll" to begin.';
    }
    return `Payroll for ${this.currentMonthLabel} is ready. Net disbursement: ${this.fmt(this.totalNetThisMonth)} across ${this.employeeCountThisMonth} employees.`;
  }

  get currentMonthLabel(): string {
    const now = new Date();
    return `${this.monthNames[now.getMonth()]} ${now.getFullYear()}`;
  }

  constructor(private payrollService: PayrollService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  load(): void {
    this.loading = true;
    this.subs.add(
      this.payrollService.getPayrollGenerationResponses(1, 200).pipe(
        catchError(() => of([]))
      ).subscribe({
        next: (runs: any[]) => {
          const allRuns: any[] = Array.isArray(runs) ? runs : (runs as any)?.content ?? [];
          this.processRuns(allRuns);
          this.loading = false;
        },
        error: () => { this.loading = false; }
      })
    );
  }

  private processRuns(runs: any[]): void {
    const now = new Date();
    const cm = now.getMonth() + 1;
    const cy = now.getFullYear();

    // Current month run
    const thisMonthRun = runs.find(r => +r.month === cm && +r.year === cy);
    if (thisMonthRun) {
      const emps: any[] = thisMonthRun.employees ?? [];
      this.totalGrossThisMonth     = emps.reduce((s, e) => s + (+(e.grossPay ?? 0)), 0);
      this.totalNetThisMonth       = emps.reduce((s, e) => s + (+(e.netPayable ?? 0)), 0);
      this.totalDeductionsThisMonth = emps.reduce((s, e) => s + (+(e.totalDeductions ?? 0)), 0);
      this.employeeCountThisMonth  = emps.length;
    }

    // Pending approvals across all runs
    this.pendingApprovals = runs.filter(r => {
      const s = (r.payrollApprovalInstance?.status || r.status || '').toUpperCase();
      return s === 'PENDING' || s === 'IN_REVIEW';
    }).length;

    // Recent 8 runs for table
    this.recentRuns = [...runs]
      .sort((a, b) => (+b.year - +a.year) || (+b.month - +a.month))
      .slice(0, 8);

    // Monthly bar chart — last 6 months
    const bars: MonthBar[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cy, cm - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const run = runs.find(r => +r.month === m && +r.year === y);
      const emps: any[] = run?.employees ?? [];
      const gross = emps.reduce((s, e) => s + (+(e.grossPay ?? 0)), 0);
      const net   = emps.reduce((s, e) => s + (+(e.netPayable ?? 0)), 0);
      bars.push({ label: this.monthNames[m - 1], grossRaw: gross, netRaw: net, grossPct: 0, netPct: 0 });
    }
    const maxGross = Math.max(...bars.map(b => b.grossRaw), 1);
    bars.forEach(b => {
      b.grossPct = Math.round((b.grossRaw / maxGross) * 100);
      b.netPct   = Math.round((b.netRaw   / maxGross) * 100);
    });
    this.monthlyBars = bars;
  }

  runStatus(run: any): string {
    return (run.payrollApprovalInstance?.status || run.status || 'DRAFT').toUpperCase();
  }

  runGross(run: any): number {
    return (run.employees ?? []).reduce((s: number, e: any) => s + (+(e.grossPay ?? 0)), 0);
  }

  runNet(run: any): number {
    return (run.employees ?? []).reduce((s: number, e: any) => s + (+(e.netPayable ?? 0)), 0);
  }

  runPeriod(run: any): string {
    const m = run.month != null ? +run.month : 1;
    return `${this.monthNames[m - 1]} ${run.year ?? ''}`.trim();
  }

  fmt(val: number): string {
    if (!val) return '₦0';
    if (val >= 1_000_000_000) return '₦' + (val / 1_000_000_000).toFixed(1) + 'B';
    if (val >= 1_000_000)     return '₦' + (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000)         return '₦' + (val / 1_000).toFixed(1) + 'K';
    return '₦' + val.toLocaleString();
  }

  navigate(target: string): void {
    const uuid = uuidV4();
    const routes: Record<string, string> = {
      payroll:       `/admin/hr/payroll/${uuid}`,
      operations:    `/admin/hr/payroll-operations/${uuid}`,
      disbursement:  `/admin/hr/payroll-disbursement/${uuid}`,
      correction:    `/admin/hr/payroll-correction/${uuid}`,
      bonus:         `/admin/hr/bonus-disbursement/${uuid}`,
      settings:      `/admin/hr/settings/${uuid}`,
      employees:     `/admin/hr/employee-management/${uuid}`,
      attendance:    `/admin/hr/attendance/${uuid}`,
      analytics:     `/admin/hr/analytics/${uuid}`,
    };
    const path = routes[target];
    if (path) this.router.navigateByUrl(path);
  }
}
