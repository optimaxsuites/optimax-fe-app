import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexTooltip,
  ApexStroke,
  ApexLegend,
  ApexTitleSubtitle,
  ApexPlotOptions,
  ApexFill,
  ApexYAxis,
  ApexResponsive,
  ApexTheme
} from 'ng-apexcharts';

export interface MonthlyFinancialData {
  labels: string[];
  revenue: number[];
  expenses: number[];
  profit: number[];
}

export interface ExpenseDistribution {
  administrative: number;
  salariesAndWages: number;
  maintenance: number;
  logisticsAndDistribution: number;
  otherOperatingExpenses: number;
}

@Component({
  selector: 'app-income-statement-charts',
  templateUrl: './income-statement-charts.component.html',
  styleUrls: ['./income-statement-charts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncomeStatementChartsComponent implements OnChanges {

  @Input() monthlyData!: MonthlyFinancialData;
  @Input() expenseDistribution!: ExpenseDistribution;
  /** Optional subtitle to override 'This Month' label on the donut chart. */
  @Input() periodLabel = 'This Month';

  revenueChartOptions!: Partial<any>;
  expenseChartOptions!: Partial<any>;

  readonly chartHeight    = 350;
  readonly currencySymbol = '₦';

  ngOnChanges(changes: SimpleChanges): void {
    if (this.monthlyData && this.expenseDistribution) {
      this.initRevenueChart();
      this.initExpenseChart();
    }
  }

  // ── Revenue / Expense Trend Bar Chart ────────────────────────────────────────
  initRevenueChart(): void {
    this.revenueChartOptions = {
      series: [
        { name: 'Revenue',  data: this.monthlyData.revenue },
        { name: 'Expenses', data: this.monthlyData.expenses },
        { name: 'Profit',   data: this.monthlyData.profit }
      ],
      chart: {
        height: this.chartHeight,
        type: 'bar',
        toolbar: { show: true }
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 5 },
      xaxis: { categories: this.monthlyData.labels },
      yaxis: {
        labels: {
          formatter: (val: number) => `${this.currencySymbol}${(val / 1_000_000).toFixed(1)}M`
        }
      },
      tooltip: {
        x: { format: 'MMM yyyy' },
        y: { formatter: (val: number) => `${this.currencySymbol}${val.toLocaleString()}` }
      },
      legend: { position: 'top' },
      title: { text: 'Revenue & Expenses Trend', align: 'left' },
      colors: ['#2E7D52', '#FF5722', '#1E88E5'],
      responsive: [{
        breakpoint: 768,
        options: { chart: { height: 280 }, legend: { position: 'bottom' } }
      }],
      theme: { mode: 'light' }
    };
  }

  // ── Expense Distribution Donut Chart ─────────────────────────────────────────
  initExpenseChart(): void {
    const series = [
      Math.abs(this.expenseDistribution.administrative),
      Math.abs(this.expenseDistribution.salariesAndWages),
      Math.abs(this.expenseDistribution.maintenance),
      Math.abs(this.expenseDistribution.logisticsAndDistribution),
      Math.abs(this.expenseDistribution.otherOperatingExpenses)
    ];
    const total = series.reduce((a, b) => a + b, 0);

    this.expenseChartOptions = {
      series,
      chart: { type: 'donut', height: this.chartHeight, width: '100%', toolbar: { show: false } },
      labels: [
        'Administrative',
        'Salaries & Wages',
        'Maintenance',
        'Logistics & Distribution',
        'Other Operating Expenses'
      ],
      plotOptions: {
        pie: {
          donut: {
            size: '55%',
            labels: {
              show: true,
              name:  { show: false },
              value: {
                show: true,
                fontSize: '16px',
                fontWeight: 600,
                color: '#333',
                formatter: (val: string) => {
                  const pct = (parseFloat(val) / total * 100).toFixed(1);
                  return `${pct}%`;
                }
              },
              total: {
                show: true,
                label: 'Total',
                color: '#333',
                fontSize: '16px',
                fontWeight: 600,
                formatter: () => `${this.currencySymbol}${total.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`
              }
            }
          }
        }
      },
      dataLabels: { enabled: false },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        fontSize: '12px',
        markers:    { width: 12, height: 12, radius: 12 },
        itemMargin: { horizontal: 10, vertical: 5 }
      },
      colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
      title: {
        text: 'Expense Breakdown',
        align: 'left',
        style: { fontSize: '16px', fontWeight: 'bold' }
      },
      subtitle: {
        text: this.periodLabel,    // FIX: uses @Input instead of hardcoded 'This Month'
        align: 'left',
        margin: 10,
        style: { fontSize: '14px' }
      },
      tooltip: {
        y: { formatter: (val: number) => `${this.currencySymbol}${val.toLocaleString()}` }
      }
    };
  }

  // ── Update without full reinit (used by parent if data changes) ───────────────
  updateCharts(): void {
    if (this.revenueChartOptions && this.expenseChartOptions) {
      this.revenueChartOptions = {
        ...this.revenueChartOptions,
        series: [
          { name: 'Revenue',  data: this.monthlyData.revenue },
          { name: 'Expenses', data: this.monthlyData.expenses },
          { name: 'Profit',   data: this.monthlyData.profit }
        ]
      };
      this.expenseChartOptions = {
        ...this.expenseChartOptions,
        series: [
          Math.abs(this.expenseDistribution.administrative),
          Math.abs(this.expenseDistribution.salariesAndWages),
          Math.abs(this.expenseDistribution.maintenance),
          Math.abs(this.expenseDistribution.logisticsAndDistribution),
          Math.abs(this.expenseDistribution.otherOperatingExpenses)
        ]
      };
    }
  }
}