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
  HrProbationTracking,
  HrVacancyAging,
  HrRiskSummary,
  HrBonusReport,
  HrOvertimeCost,
} from '../productivity/hr-reporting.service';
import {
  ApexNonAxisChartSeries,
  ApexChart,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexDataLabels,
  ApexPlotOptions,
  ApexFill,
  ApexLegend,
  ApexTooltip,
  ApexGrid,
  ApexStroke,
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  labels?: string[];
  dataLabels?: ApexDataLabels;
  plotOptions?: ApexPlotOptions;
  fill?: ApexFill;
  legend?: ApexLegend;
  tooltip?: ApexTooltip;
  grid?: ApexGrid;
  stroke?: ApexStroke;
  colors?: string[];
};

@Component({
  selector: 'app-hr-analytics-dashboard',
  templateUrl: './hr-analytics-dashboard.component.html',
  styleUrl: './hr-analytics-dashboard.component.scss',
})
export class HrAnalyticsDashboardComponent implements OnInit {
  loading = true;
  error = false;
  today = new Date();

  executive?: HrExecutiveReport;
  workforce?: HrWorkforceOverview;
  payroll?: HrPayrollSummary;
  leave?: HrLeaveAttendance;
  turnover?: HrEmployeeTurnover;
  probation?: HrProbationTracking;
  vacancies?: HrVacancyAging;
  risk?: HrRiskSummary;
  bonus?: HrBonusReport;
  overtime?: HrOvertimeCost;

  // ── Charts ──────────────────────────────────────────────────────────────────
  workforceChart!: Partial<ChartOptions>;
  payrollChart!: Partial<ChartOptions>;
  leaveDonutChart!: Partial<ChartOptions>;
  turnoverChart!: Partial<ChartOptions>;

  readonly BRAND   = '#2E6276';
  readonly GREEN   = '#2EB270';
  readonly AMBER   = '#f59e0b';
  readonly RED     = '#ef4444';
  readonly TEAL    = '#4291b1';

  constructor(private reporting: HrReportingService) {}

  ngOnInit(): void {
    forkJoin({
      executive: this.reporting.getExecutiveReport().pipe(catchError(() => of(undefined))),
      workforce: this.reporting.getWorkforceOverview().pipe(catchError(() => of(undefined))),
      payroll:   this.reporting.getPayrollSummary().pipe(catchError(() => of(undefined))),
      leave:     this.reporting.getLeaveAttendance().pipe(catchError(() => of(undefined))),
      turnover:  this.reporting.getEmployeeTurnover().pipe(catchError(() => of(undefined))),
      probation: this.reporting.getProbationTracking().pipe(catchError(() => of(undefined))),
      vacancies: this.reporting.getVacancyAging().pipe(catchError(() => of(undefined))),
      risk:      this.reporting.getHrRisk().pipe(catchError(() => of(undefined))),
      bonus:     this.reporting.getBonusReport().pipe(catchError(() => of(undefined))),
      overtime:  this.reporting.getOvertimeCost().pipe(catchError(() => of(undefined))),
    }).subscribe({
      next: (data) => {
        this.executive = data.executive;
        this.workforce = data.workforce;
        this.payroll   = data.payroll;
        this.leave     = data.leave;
        this.turnover  = data.turnover;
        this.probation = data.probation;
        this.vacancies = data.vacancies;
        this.risk      = data.risk;
        this.bonus     = data.bonus;
        this.overtime  = data.overtime;
        this.buildCharts();
        this.loading = false;
      },
      error: () => {
        this.error   = true;
        this.loading = false;
      },
    });
  }

  private buildCharts(): void {
    const chartBase: Partial<ApexChart> = {
      toolbar: { show: false },
      fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
      foreColor: '#64748b',
    };

    // ── Workforce headcount by department ──────────────────────────────────
    const deptMap = new Map<string, number>();
    this.workforce?.rows.forEach(r => {
      deptMap.set(r.department, (deptMap.get(r.department) ?? 0) + r.headcount);
    });
    const depts    = [...deptMap.keys()];
    const counts   = [...deptMap.values()];

    this.workforceChart = {
      series: [{ name: 'Headcount', data: counts }],
      chart: { ...chartBase, type: 'bar', height: 260 },
      xaxis: { categories: depts, labels: { style: { fontSize: '11px' } } },
      plotOptions: { bar: { borderRadius: 5, columnWidth: '45%' } },
      dataLabels: { enabled: false },
      colors: [this.BRAND],
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { theme: 'light' },
    };

    // ── Payroll gross vs net by department ─────────────────────────────────
    const pdepts = this.payroll?.rows.map(r => r.department) ?? [];
    this.payrollChart = {
      series: [
        { name: 'Gross Pay',    data: this.payroll?.rows.map(r => r.grossPay)    ?? [] },
        { name: 'Net Payable',  data: this.payroll?.rows.map(r => r.netPayable)  ?? [] },
        { name: 'Deductions',   data: this.payroll?.rows.map(r => r.totalDeductions) ?? [] },
      ],
      chart: { ...chartBase, type: 'bar', height: 260, stacked: false },
      xaxis: { categories: pdepts, labels: { style: { fontSize: '11px' } } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      colors: [this.BRAND, this.GREEN, this.AMBER],
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { theme: 'light', y: { formatter: (v) => '₦' + v.toLocaleString() } },
      legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px' },
    };

    // ── Leave status donut ─────────────────────────────────────────────────
    const lv = this.leave;
    this.leaveDonutChart = {
      series: [lv?.approvedRequests ?? 0, lv?.pendingRequests ?? 0, lv?.rejectedRequests ?? 0],
      chart: { ...chartBase, type: 'donut', height: 240 },
      labels: ['Approved', 'Pending', 'Rejected'],
      colors: [this.GREEN, this.AMBER, this.RED],
      legend: { position: 'bottom', fontSize: '12px' },
      dataLabels: { enabled: true, style: { fontSize: '11px' } },
      plotOptions: { pie: { donut: { size: '60%' } } },
      tooltip: { theme: 'light' },
    };

    // ── Turnover rate by department ────────────────────────────────────────
    const tdepts = this.turnover?.rows.map(r => r.department) ?? [];
    this.turnoverChart = {
      series: [
        { name: 'Joins',         data: this.turnover?.rows.map(r => r.joins)        ?? [] },
        { name: 'Exits',         data: this.turnover?.rows.map(r => r.exits)        ?? [] },
        { name: 'Turnover Rate', data: this.turnover?.rows.map(r => +(r.turnoverRate * 100).toFixed(1)) ?? [] },
      ],
      chart: { ...chartBase, type: 'bar', height: 260 },
      xaxis: { categories: tdepts, labels: { style: { fontSize: '11px' } } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      colors: [this.GREEN, this.RED, this.AMBER],
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { theme: 'light' },
      legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px' },
    };
  }

  formatCurrency(val: number | undefined): string {
    if (!val) return '₦0';
    return '₦' + (val / 1_000_000 >= 1
      ? (val / 1_000_000).toFixed(1) + 'M'
      : (val / 1_000).toFixed(0) + 'K');
  }

  probationStatusClass(status: string): string {
    if (status === 'OVERDUE') return 'badge-red';
    if (status === 'DUE_SOON') return 'badge-amber';
    return 'badge-blue';
  }
}
