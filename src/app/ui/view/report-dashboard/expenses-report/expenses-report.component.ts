import { Component, OnInit } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexPlotOptions,
  ApexStroke,
  ApexFill,
  ApexTooltip,
} from 'ng-apexcharts';
import { StyleColor } from '../../../models/enums';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
  dataLabels?: ApexDataLabels;
  plotOptions?: ApexPlotOptions;
  stroke?: ApexStroke;
  fill?: ApexFill;
  tooltip?: ApexTooltip;
};

@Component({
  selector: 'app-expenses-report',
  templateUrl: './expenses-report.component.html',
  styleUrl: './expenses-report.component.scss',
})
export class ExpensesReportComponent implements OnInit {
  // Daily Expense Report charts
  public chartOptions24H: ChartOptions;
  public chartOptionsWeek: ChartOptions;
  public chartOptionsMonth: ChartOptions;

  // Long-Term Expense Report charts
  public chartOptionsQuarter: ChartOptions;
  public chartOptionsYear: ChartOptions;
  public chartOptionsFiveYears: ChartOptions;
  chartColor = [StyleColor.CELADON_GREEN];

  constructor() {
    // Chart for expenses in the last 24 hours (line chart with hourly data)
    this.chartOptions24H = {
      series: [
        {
          name: 'Expenses ($)',
          data: [
            25, 30, 28, 35, 40, 38, 45, 50, 42, 48, 55, 60, 58, 65, 70, 68, 75,
            80, 78, 85, 90, 88, 95, 100,
          ],
        },
      ],
      chart: {
        height: 350,
        type: 'line',
      },
      title: {
        text: 'Last 24 Hours',
      },
      xaxis: {
        categories: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      },
    };

    // Chart for expenses in the last week (bar chart with daily data)
    this.chartOptionsWeek = {
      series: [
        {
          name: 'Expenses ($)',
          data: [150, 180, 165, 200, 175, 190, 210],
        },
      ],
      chart: {
        height: 350,
        type: 'bar',
      },
      title: {
        text: 'Last Week',
      },
      xaxis: {
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
    };

    // Chart for expenses in the last month (area chart with daily data)
    this.chartOptionsMonth = {
      series: [
        {
          name: 'Expenses ($)',
          data: [
            600, 650, 620, 700, 680, 720, 750, 800, 770, 820, 790, 850, 830,
            880, 860, 910, 890, 940, 920, 980, 960, 1020, 1000, 1070, 1050,
            1120, 1100, 1170, 1150, 1220, 1200,
          ],
        },
      ],
      chart: {
        height: 350,
        type: 'area',
      },
      title: {
        text: 'Last Month',
      },
      xaxis: {
        categories: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
      },
    };

    // Chart for expenses in the last quarter (bar chart with monthly data for 3 months)
    this.chartOptionsQuarter = {
      series: [
        {
          name: 'Expenses ($)',
          data: [2000, 2100, 2050],
        },
      ],
      chart: {
        height: 350,
        type: 'bar',
      },
      title: {
        text: 'Last Quarter',
      },
      xaxis: {
        categories: ['Month 1', 'Month 2', 'Month 3'],
      },
    };

    // Chart for expenses in the last year (line chart with monthly data)
    this.chartOptionsYear = {
      series: [
        {
          name: 'Expenses ($)',
          data: [
            8000, 8500, 8200, 8700, 9000, 9500, 9800, 10000, 9700, 10200, 10500,
            10800,
          ],
        },
      ],
      chart: {
        height: 350,
        type: 'line',
      },
      title: {
        text: 'Last Year',
      },
      xaxis: {
        categories: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
      },
    };

    // Chart for expenses in the last 5 years (area chart with yearly data)
    this.chartOptionsFiveYears = {
      series: [
        {
          name: 'Expenses ($)',
          data: [40000, 42000, 41000, 43000, 44000],
        },
      ],
      chart: {
        height: 350,
        type: 'area',
      },
      title: {
        text: 'Last 5 Years',
      },
      xaxis: {
        categories: ['2018', '2019', '2020', '2021', '2022'],
      },
    };
  }

  ngOnInit(): void {}
}
