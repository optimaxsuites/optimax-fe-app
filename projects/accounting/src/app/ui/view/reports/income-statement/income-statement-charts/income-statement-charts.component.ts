import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
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
  ApexFill
} from "ng-apexcharts";

export interface MonthlyData {
  labels: string[];
  revenue: number[];
  expenses: number[];
  profit: number[];
}

export interface ExpenseDistribution {
  administrative: number;
  salaries: number;
  maintenance: number;
  logistics: number;
  other: number;
}

export type RevenueChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  title: ApexTitleSubtitle;
};

export type ExpenseChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  legend: ApexLegend;
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-income-statement-charts',
  templateUrl: './income-statement-charts.component.html',
  styleUrls: ['./income-statement-charts.component.scss']
})
export class IncomeStatementChartsComponent implements OnChanges {
  @Input() monthlyData!: MonthlyData;
  @Input() expenseDistribution!: ExpenseDistribution;

  revenueChartOptions: RevenueChartOptions = {} as RevenueChartOptions;
  expenseChartOptions: ExpenseChartOptions = {} as ExpenseChartOptions;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.hasRequiredInputs()) {
      this.initCharts();
    } else {
      console.warn('Missing required input data for charts');
    }
  }

  private hasRequiredInputs(): boolean {
    return !!this.monthlyData && !!this.expenseDistribution &&
           Array.isArray(this.monthlyData.labels) &&
           Array.isArray(this.monthlyData.revenue) &&
           Array.isArray(this.monthlyData.expenses) &&
           Array.isArray(this.monthlyData.profit) &&
           this.monthlyData.labels.length === this.monthlyData.revenue.length &&
           this.monthlyData.labels.length === this.monthlyData.expenses.length &&
           this.monthlyData.labels.length === this.monthlyData.profit.length;
  }

  private initCharts(): void {
    this.initRevenueChart();
    this.initExpenseChart();
  }

  private initRevenueChart(): void {
    if (!this.monthlyData) return;

    this.revenueChartOptions = {
      series: [
        { name: "Revenue", data: [...this.monthlyData.revenue] },
        { name: "Expenses", data: [...this.monthlyData.expenses] },
        { name: "Profit", data: [...this.monthlyData.profit] }
      ],
      chart: {
        height: 350,
        type: "bar",
        toolbar: { show: false }
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2 },
      xaxis: { categories: [...this.monthlyData.labels] },
      tooltip: { x: { format: "MMM yyyy" } },
      legend: { position: "top" },
      title: { text: "Revenue & Expenses Trend", align: "left" }
    };
  }

  private initExpenseChart(): void {
    if (!this.expenseDistribution) return;

    this.expenseChartOptions = {
      series: [{
        name: 'Expenses',
        data: [
          this.expenseDistribution.administrative,
          this.expenseDistribution.salaries,
          this.expenseDistribution.maintenance,
          this.expenseDistribution.logistics,
          this.expenseDistribution.other
        ]
      }],
      chart: {
        type: "pie",
        height: 350
      },
      labels: [
        'Administrative',
        'Salaries & Wages',
        'Maintenance',
        'Logistics & Distribution',
        'Other'
      ],
      plotOptions: {
        pie: {
          donut: {
            size: "65%"
          }
        }
      },
      fill: {
        type: "gradient"
      },
      legend: {
        position: "bottom"
      },
      title: {
        text: "Expense Distribution",
        align: "left"
      }
    };
  }

  public refreshCharts(): void {
    if (this.hasRequiredInputs()) {
      this.initCharts();
    }
  }
}