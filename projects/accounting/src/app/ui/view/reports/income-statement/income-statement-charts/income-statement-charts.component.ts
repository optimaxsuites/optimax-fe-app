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

  revenueChartOptions!: Partial<any>;
  expenseChartOptions!: Partial<any>;

  chartHeight = 350;
  currencySymbol = '₦';

  ngOnChanges(changes: SimpleChanges): void {
    if (this.monthlyData && this.expenseDistribution) {
      this.initRevenueChart();
      this.initExpenseChart();
    }
  }

  initRevenueChart(): void {
    this.revenueChartOptions = {
      series: [
        { name: 'Revenue', data: this.monthlyData.revenue },
        { name: 'Expenses', data: this.monthlyData.expenses },
        { name: 'Profit', data: this.monthlyData.profit }
      ],
      chart: {
        height: this.chartHeight,
        type: 'bar',
        toolbar: { show: true }
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { categories: this.monthlyData.labels },
      tooltip: {
        x: { format: 'MMM yyyy' },
        y: {
          formatter: (val: number) =>
            `${this.currencySymbol}${val.toLocaleString()}`
        }
      },
      legend: { position: 'top' },
      title: { text: 'Revenue & Expenses Trend', align: 'left' },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: { height: 300 },
            legend: { position: 'bottom' }
          }
        }
      ],
      theme: { mode: 'light' }
    };
  }

  initExpenseChart(): void {
    this.expenseChartOptions = {
      series: [
        Math.abs(this.expenseDistribution.administrative),
        Math.abs(this.expenseDistribution.salariesAndWages),
        Math.abs(this.expenseDistribution.maintenance),
        Math.abs(this.expenseDistribution.logisticsAndDistribution),
        Math.abs(this.expenseDistribution.otherOperatingExpenses)
      ],
      chart: {
        type: 'donut',
        height: this.chartHeight,
        toolbar: { show: true }
      },
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
            size: '45%',
            
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Expenses',
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  return `${this.currencySymbol}${total.toLocaleString()}`;
                }
              }
            }
          }
        }
      },
      fill: { type: 'gradient' },
      legend: { position: 'bottom' },
      title: { text: 'Expense Distribution', align: 'left' },
      dataLabels: {
        enabled: false
      },
      colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: { height: 300 },
            legend: { position: 'bottom' }
          }
        }
      ]
    };
  }

  updateCharts(): void {
    if (this.revenueChartOptions && this.expenseChartOptions) {
      this.revenueChartOptions['series'] = [
        { name: 'Revenue', data: this.monthlyData.revenue },
        { name: 'Expenses', data: this.monthlyData.expenses },
        { name: 'Profit', data: this.monthlyData.profit }
      ];

      this.expenseChartOptions['series'] = [
        Math.abs(this.expenseDistribution.administrative),
        Math.abs(this.expenseDistribution.salariesAndWages),
        Math.abs(this.expenseDistribution.maintenance),
        Math.abs(this.expenseDistribution.logisticsAndDistribution),
        Math.abs(this.expenseDistribution.otherOperatingExpenses)
      ];
    }
  }
}
