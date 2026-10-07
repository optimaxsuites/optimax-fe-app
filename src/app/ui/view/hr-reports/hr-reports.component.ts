import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  HrProbationTrackingRow,
} from '../productivity/hr-reporting.service';
import { TableColumn } from '../../shared-component/view/table/table.component';

const col = (header: string, field: string, extra: Partial<TableColumn> = {}): TableColumn =>
  ({ header, field, sortable: true, ...extra });

type Tab =
  | 'executive' | 'workforce' | 'payroll' | 'leave'
  | 'turnover' | 'risk' | 'probation' | 'equity'
  | 'bonus' | 'statutory' | 'overtime' | 'vacancy';

@Component({
  selector: 'app-hr-reports',
  templateUrl: './hr-reports.component.html',
  styleUrl: './hr-reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrReportsComponent implements OnInit {
  loading = true;
  error = false;

  activeTab: Tab = 'executive';

  readonly tabs: { key: Tab; label: string; icon: string; desc: string }[] = [
    { key: 'executive', label: 'Executive',  icon: 'fa-chart-pie',       desc: 'Headline workforce, payroll and loan figures at a glance.' },
    { key: 'workforce', label: 'Workforce',  icon: 'fa-users',           desc: 'Headcount, joins, exits and vacancies by department.' },
    { key: 'payroll',   label: 'Payroll',    icon: 'fa-money-bill-wave', desc: 'Gross pay, deductions and employer cost by department.' },
    { key: 'leave',     label: 'Leave',      icon: 'fa-calendar-alt',    desc: 'Leave requests by type and approval status.' },
    { key: 'turnover',  label: 'Turnover',   icon: 'fa-exchange-alt',    desc: 'Joins, exits and turnover rate per department.' },
    { key: 'risk',      label: 'HR Risk',    icon: 'fa-shield-alt',      desc: 'Loan defaults, overdue accounts and exposure.' },
    { key: 'probation', label: 'Probation',  icon: 'fa-user-clock',      desc: 'Employees on probation and review deadlines.' },
    { key: 'equity',    label: 'Pay Equity', icon: 'fa-balance-scale',   desc: 'Average and median net pay by level.' },
    { key: 'bonus',     label: 'Bonus',      icon: 'fa-gift',            desc: 'Bonus payouts by level.' },
    { key: 'statutory', label: 'Statutory',  icon: 'fa-landmark',        desc: 'NSITF and ITF remittance rates.' },
    { key: 'overtime',  label: 'Overtime',   icon: 'fa-clock',           desc: 'Configured overtime cost by level.' },
    { key: 'vacancy',   label: 'Vacancies',  icon: 'fa-briefcase',       desc: 'Open roles and how long they have been open.' },
  ];

  lastUpdated: Date | null = null;

  readonly cols = {
    workforce: [
      col('Department', 'department'), col('Level', 'level'), col('Status', 'status'), col('Gender', 'gender'),
      col('Headcount', 'headcount'), col('Joins', 'joins'), col('Exits', 'exits'), col('Vacancies', 'vacancyCount'),
    ],
    payroll: [
      col('Department', 'department'), col('Employees', 'employeeCount'), col('Gross Pay', 'grossPay'),
      col('Net Payable', 'netPayable'), col('Deductions', 'totalDeductions'), col('Employer Cost', 'employerCost'),
    ],
    leave: [
      col('Leave Type', 'leaveType'), col('Status', 'status'), col('Requests', 'requestCount'), col('Total Days', 'totalDays'),
    ],
    turnover: [
      col('Department', 'department'), col('Joins', 'joins'), col('Exits', 'exits'), col('Turnover Rate', 'turnoverRate'),
    ],
    probation: [
      col('Employee', 'employeeName'), col('Department', 'department'), col('Level', 'level'),
      col('End Date', 'probationEndDate'), col('Days Remaining', 'probationEndDate'), col('Status', 'probationStatus'),
    ],
    equity: [
      col('Level', 'level'), col('Department', 'department'), col('Gender', 'gender'),
      col('Count', 'employeeCount'), col('Avg Net Pay', 'averageNetPayable'), col('Median Net Pay', 'medianApproxNetPayable'),
    ],
    bonus: [
      col('Level', 'level'), col('Type', 'bonusType'), col('Count', 'count'), col('Total', 'totalAmount'),
    ],
    statutory: [
      col('#', 'id'), col('NSITF Rate (%)', 'nsitfRate'), col('ITF Rate (%)', 'itfRate'),
      col('Created', 'createdAt'), col('Updated', 'updatedAt'),
    ],
    overtime: [
      col('Level', 'level'), col('Overtime Type', 'overtimeType'), col('Max Hours', 'maxHours'),
      col('Rate (₦/hr)', 'rate'), col('Configured Cost (₦)', 'configuredCost'),
    ],
    vacancy: [
      col('Job Title', 'jobTitle'), col('Location', 'location'), col('Type', 'jobType'),
      col('Days Open', 'daysOpen'), col('Status', 'expired'),
    ],
  };

  get activeTabMeta() {
    return this.tabs.find(t => t.key === this.activeTab);
  }
  probationFilter: 'ALL' | 'OVERDUE' | 'DUE_SOON' | 'ACTIVE' = 'ALL';
  search = '';

  execReport: HrExecutiveReport | null = null;
  workforceReport: HrWorkforceOverview | null = null;
  payrollReport: HrPayrollSummary | null = null;
  leaveReport: HrLeaveAttendance | null = null;
  turnoverReport: HrEmployeeTurnover | null = null;
  riskReport: HrRiskSummary | null = null;
  probationReport: HrProbationTracking | null = null;
  equityReport: HrCompensationEquity | null = null;
  bonusReport: HrBonusReport | null = null;
  statutoryReport: HrStatutoryRemittance | null = null;
  overtimeReport: HrOvertimeCost | null = null;
  vacancyReport: HrVacancyAging | null = null;

  constructor(private reporting: HrReportingService, private cdr: ChangeDetectorRef) {}

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
        this.lastUpdated     = new Date();
        this.loading = false;
        this.error = Object.values(data).every(v => v === null);
        this.cdr.markForCheck();
      },
      error: () => { this.error = true; this.loading = false; this.cdr.markForCheck(); },
    });
  }

  print(): void {
    window.print();
  }

  selectTab(key: Tab): void {
    this.activeTab = key;
    this.search = '';
  }

  get hasTable(): boolean {
    return this.activeTab !== 'executive' && this.activeTab !== 'risk' && this.tabHasData(this.activeTab);
  }

  get activeRows(): any[] {
    const reports: Record<Tab, { rows?: any[] } | null> = {
      executive: null, risk: null,
      workforce: this.workforceReport, payroll: this.payrollReport, leave: this.leaveReport,
      turnover: this.turnoverReport, probation: this.probationReport, equity: this.equityReport,
      bonus: this.bonusReport, statutory: this.statutoryReport, overtime: this.overtimeReport,
      vacancy: this.vacancyReport,
    };
    return reports[this.activeTab]?.rows ?? [];
  }

  // Stable array identities: fresh arrays on every change detection would trip ExpressionChanged errors on [rows].
  private readonly noRows: any[] = [];
  private rowsCache = new WeakMap<object, { q: string; out: any[] }>();
  private probationCache: { src: unknown; filter: string; out: HrProbationTrackingRow[] } | null = null;

  rows<T extends object>(list: T[] | null | undefined): T[] {
    if (!list) return this.noRows as T[];
    const q = this.search.trim().toLowerCase();
    if (!q) return list;
    const hit = this.rowsCache.get(list);
    if (hit && hit.q === q) return hit.out as T[];
    const out = list.filter(r => Object.values(r).some(v => v != null && String(v).toLowerCase().includes(q)));
    this.rowsCache.set(list, { q, out });
    return out;
  }

  get emptyText(): string {
    return this.search.trim() ? 'No rows match your search.' : 'No data available.';
  }

  onTabKeydown(e: KeyboardEvent, index: number): void {
    const last = this.tabs.length - 1;
    let next: number;
    switch (e.key) {
      case 'ArrowRight': next = index === last ? 0 : index + 1; break;
      case 'ArrowLeft':  next = index === 0 ? last : index - 1; break;
      case 'Home':       next = 0; break;
      case 'End':        next = last; break;
      default: return;
    }
    e.preventDefault();
    this.selectTab(this.tabs[next].key);
    document.getElementById('rpt-tab-' + this.tabs[next].key)?.focus();
  }

  // ── Computed row helpers ───────────────────────────────────────────────────

  get filteredProbationRows(): HrProbationTrackingRow[] {
    const src = this.rows(this.probationReport?.rows);
    if (this.probationFilter === 'ALL') return src;
    const c = this.probationCache;
    if (c && c.src === src && c.filter === this.probationFilter) return c.out;
    const status = { OVERDUE: 'Overdue', DUE_SOON: 'DueSoon', ACTIVE: 'Active' }[this.probationFilter];
    const out = src.filter(r => r.probationStatus === status);
    this.probationCache = { src, filter: this.probationFilter, out };
    return out;
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
    return days > 60 ? 'var(--rpt-danger-text)' : days > 30 ? 'var(--rpt-warn-text)' : 'var(--table-text)';
  }

  turnoverColor(rate: number): string {
    return rate > 10 ? 'var(--rpt-danger-text)' : 'var(--rpt-warn-text)';
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
