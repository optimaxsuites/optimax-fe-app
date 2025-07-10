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
      stroke: { curve: 'smooth', width: 5 },
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
      width : '100%',
      toolbar: { show: false }
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
          size: '55%',
          labels: {
            show: true,
            name: {
              show: false 
            },
            value: {
              show: true,
              fontSize: '16px',
              fontWeight: 600,
              color: '#333',
              offsetY: 0,
              formatter: (val: string) => {
                const total = this.expenseChartOptions['series'].reduce((a: number, b: number) => a + b, 0);
                const percentage = (parseFloat(val) / total * 100).toFixed(1);
                return `${percentage}%`; 
              }
            },
            total: {
              show: true,
              label: 'Total', 
              color: '#333',
              fontSize: '16px',
              fontWeight: 600,
              formatter: () => {
                const total = this.expenseChartOptions ['series'].reduce((a: number, b: number) => a + b, 0);
                return `${this.currencySymbol}${total.toFixed(0)}`; 
              }
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: false 
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      markers: {
        width: 12,
        height: 12,
        radius: 12
      },
      itemMargin: {
        horizontal: 10,
        vertical: 5
      }
    },
    colors: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
    title: {
      text: 'Expense Breakdown', 
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: 'bold'
      }
    },
    subtitle: {
      text: 'This Month', 
      align: 'left',
      margin: 10,
      style: {
        fontSize: '14px'
      }
    }
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
