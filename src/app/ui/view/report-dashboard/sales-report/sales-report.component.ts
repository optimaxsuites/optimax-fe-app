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
  selector: 'app-sales-report',
  templateUrl: './sales-report.component.html',
  styleUrl: './sales-report.component.scss',
})
export class SalesReportComponent implements OnInit {
  // Daily Sales Report charts
  public chartOptions24H: ChartOptions;
  public chartOptionsWeek: ChartOptions;
  public chartOptionsMonth: ChartOptions;

  // Long-Term Sales Report charts
  public chartOptionsQuarter: ChartOptions;
  public chartOptionsYear: ChartOptions;
  public chartOptionsFiveYears: ChartOptions;
  chartColor = [StyleColor.CELADON_GREEN];

  constructor() {
    // Chart for last 24 hours (line chart with hourly data)
    this.chartOptions24H = {
      series: [
        {
          name: 'Sales',
          data: [
            10, 20, 15, 30, 25, 40, 35, 50, 45, 60, 55, 70, 65, 80, 75, 90, 85,
            100, 95, 110, 105, 120, 115, 130,
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

    // Chart for last week (bar chart with daily data)
    this.chartOptionsWeek = {
      series: [
        {
          name: 'Sales',
          data: [150, 200, 180, 220, 210, 230, 250],
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

    // Chart for last month (area chart with daily data)
    this.chartOptionsMonth = {
      series: [
        {
          name: 'Sales',
          data: [
            500, 600, 550, 700, 650, 800, 750, 900, 850, 1000, 950, 1100, 1050,
            1200, 1150, 1300, 1250, 1400, 1350, 1500, 1450, 1600, 1550, 1700,
            1650, 1800, 1750, 1900, 1850, 2000, 1950,
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

    // Chart for last quarter (bar chart with monthly data for 3 months)
    this.chartOptionsQuarter = {
      series: [
        {
          name: 'Sales',
          data: [3000, 3200, 3100],
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

    // Chart for last year (line chart with monthly data)
    this.chartOptionsYear = {
      series: [
        {
          name: 'Sales',
          data: [
            12000, 15000, 13000, 16000, 17000, 18000, 20000, 19000, 21000,
            22000, 23000, 24000,
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

    // Chart for last 5 years (area chart with yearly data)
    this.chartOptionsFiveYears = {
      series: [
        {
          name: 'Sales',
          data: [50000, 52000, 54000, 56000, 58000],
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
