import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  HrReportingService,
  HrExecutiveReport,
  HrWorkforceOverview,
  HrPayrollSummary,
  HrLeaveAttendance,
  HrEmployeeTurnover,
  HrCompensationEquity,
  HrRiskSummary,
  HrProbationTracking,
  HrStatutoryRemittance,
  HrBonusReport,
  HrOvertimeCost,
  HrVacancyAging,
} from '../productivity/hr-reporting.service';

type Tab =
  | 'executive' | 'workforce' | 'payroll' | 'leave'
  | 'turnover' | 'risk' | 'probation' | 'equity'
  | 'bonus' | 'statutory' | 'overtime' | 'vacancy';

@Component({
  selector: 'app-hr-reports',
  templateUrl: './hr-reports.component.html',
  styleUrl: './hr-reports.component.scss',
})
export class HrReportsComponent implements OnInit {
  loading = true;
  error = false;

  activeTab: Tab = 'executive';
  probationFilter: 'ALL' | 'OVERDUE' | 'DUE_SOON' | 'ACTIVE' = 'ALL';

  execReport: HrExecutiveReport | null = null;
  workforceReport: any = null;
  payrollReport: any = null;
  leaveReport: any = null;
  turnoverReport: any = null;
  riskReport: HrRiskSummary | null = null;
  probationReport: any = null;
  equityReport: any = null;
  bonusReport: any = null;
  statutoryReport: any = null;
  overtimeReport: any = null;
  vacancyReport: any = null;

  constructor(private reporting: HrReportingService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    const safe = <T>(obs: import('rxjs').Observable<T>) => obs.pipe(catchError(() => of(null as T | null)));
    forkJoin({
      exec:      safe(this.reporting.getExecutiveReport()),
      workforce: safe(this.reporting.getWorkforceOverview()),
      payroll:   safe(this.reporting.getPayrollSummary()),
      leave:     safe(this.reporting.getLeaveAttendance()),
      turnover:  safe(this.reporting.getEmployeeTurnover()),
      risk:      safe(this.reporting.getHrRisk()),
      probation: safe(this.reporting.getProbationTracking()),
      equity:    safe(this.reporting.getCompensationEquity()),
      bonus:     safe(this.reporting.getBonusReport()),
      statutory: safe(this.reporting.getStatutoryRemittance()),
      overtime:  safe(this.reporting.getOvertimeCost()),
      vacancy:   safe(this.reporting.getVacancyAging()),
    }).subscribe({
      next: (data) => {
        this.execReport      = data.exec;
        this.workforceReport = data.workforce;
        this.payrollReport   = data.payroll;
        this.leaveReport     = data.leave;
        this.turnoverReport  = data.turnover;
        this.riskReport      = data.risk;
        this.probationReport = data.probation;
        this.equityReport    = data.equity;
        this.bonusReport     = data.bonus;
        this.statutoryReport = data.statutory;
        this.overtimeReport  = data.overtime;
        this.vacancyReport   = data.vacancy;
        this.loading = false;
        this.error = Object.values(data).every(v => v === null);
      },
      error: () => { this.error = true; this.loading = false; },
    });
  }

  // ── Computed row helpers ───────────────────────────────────────────────────

  get filteredProbationRows(): any[] {
    const rows: any[] = (this.probationReport as any)?.rows ?? [];
    if (this.probationFilter === 'ALL') return rows;
    if (this.probationFilter === 'OVERDUE') return rows.filter((r: any) => r.probationStatus === 'Overdue');
    if (this.probationFilter === 'DUE_SOON') return rows.filter((r: any) => r.probationStatus === 'DueSoon');
    if (this.probationFilter === 'ACTIVE') return rows.filter((r: any) => r.probationStatus === 'Active');
    return rows;
  }

  daysRemaining(endDate: string): number {
    if (!endDate) return 0;
    return Math.round((new Date(endDate).getTime() - Date.now()) / 86400000);
  }

  probationStatusClass(status: string): string {
    if (status === 'Overdue') return 'rpt-badge rpt-badge--red';
    if (status === 'DueSoon') return 'rpt-badge rpt-badge--orange';
    return 'rpt-badge rpt-badge--green';
  }

  leaveStatusClass(status: string): string {
    if (status === 'APPROVED') return 'rpt-badge rpt-badge--green';
    if (status === 'PENDING')  return 'rpt-badge rpt-badge--orange';
    if (status === 'REJECTED') return 'rpt-badge rpt-badge--red';
    return 'rpt-badge';
  }

  fmt(n: number | null | undefined): string {
    if (n == null) return '—';
    return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  fmtPct(n: number | null | undefined): string {
    if (n == null) return '—';
    return n.toFixed(2) + '%';
  }

  formatDate(d: string): string {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }

  vacancyExpired(row: any): boolean {
    return !!row.expired;
  }

  vacancyDaysColor(days: number): string {
    return days > 60 ? '#dc2626' : days > 30 ? '#d97706' : '#374151';
  }

  turnoverColor(rate: number): string {
    return rate > 10 ? '#dc2626' : '#d97706';
  }

  tabHasData(tab: Tab): boolean {
    const map: Record<Tab, any> = {
      executive: this.execReport, workforce: this.workforceReport, payroll: this.payrollReport,
      leave: this.leaveReport, turnover: this.turnoverReport, risk: this.riskReport,
      probation: this.probationReport, equity: this.equityReport, bonus: this.bonusReport,
      statutory: this.statutoryReport, overtime: this.overtimeReport, vacancy: this.vacancyReport,
    };
    return !!map[tab];
  }
}
