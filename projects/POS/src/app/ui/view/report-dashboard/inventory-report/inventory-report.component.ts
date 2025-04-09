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
  selector: 'app-inventory-report',
  templateUrl: './inventory-report.component.html',
  styleUrl: './inventory-report.component.scss',
})
export class InventoryReportComponent implements OnInit {
  // Daily Inventory Report charts
  public chartOptions24H: ChartOptions;
  public chartOptionsWeek: ChartOptions;
  public chartOptionsMonth: ChartOptions;

  // Long-Term Inventory Analysis charts
  public chartOptionsQuarter: ChartOptions;
  public chartOptionsYear: ChartOptions;
  public chartOptionsFiveYears: ChartOptions;
  chartColor = [StyleColor.CELADON_GREEN];

  constructor() {
    // Chart for last 24 hours: Inventory Level (line chart)
    this.chartOptions24H = {
      series: [
        {
          name: 'Inventory Level',
          data: [
            1200, 1195, 1180, 1175, 1180, 1190, 1205, 1210, 1200, 1190, 1185,
            1170, 1165, 1170, 1180, 1190, 1200, 1210, 1220, 1215, 1210, 1205,
            1200, 1195,
          ],
        },
      ],
      chart: {
        height: 350,
        type: 'line',
      },
      title: {
        text: 'Inventory Level - Last 24 Hours',
      },
      xaxis: {
        categories: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      },
    };

    // Chart for last week: Daily Restocks (bar chart)
    this.chartOptionsWeek = {
      series: [
        {
          name: 'Restocks',
          data: [150, 180, 130, 170, 160, 190, 210],
        },
      ],
      chart: {
        height: 350,
        type: 'bar',
      },
      title: {
        text: 'Daily Restocks - Last Week',
      },
      xaxis: {
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
    };

    // Chart for last month: Inventory Turnover (area chart)
    this.chartOptionsMonth = {
      series: [
        {
          name: 'Turnover',
          data: [
            300, 320, 310, 330, 340, 320, 310, 300, 350, 340, 330, 320, 310,
            300, 320, 330, 340, 350, 360, 370, 360, 350, 340, 330, 320, 310,
            300, 320, 330, 340,
          ],
        },
      ],
      chart: {
        height: 350,
        type: 'area',
      },
      title: {
        text: 'Inventory Turnover - Last Month',
      },
      xaxis: {
        categories: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
      },
    };

    // Chart for last quarter: Average Inventory Level (bar chart)
    this.chartOptionsQuarter = {
      series: [
        {
          name: 'Average Inventory',
          data: [1180, 1195, 1200],
        },
      ],
      chart: {
        height: 350,
        type: 'bar',
      },
      title: {
        text: 'Average Inventory - Last Quarter',
      },
      xaxis: {
        categories: ['Month 1', 'Month 2', 'Month 3'],
      },
    };

    // Chart for last year: Inventory Valuation (line chart)
    this.chartOptionsYear = {
      series: [
        {
          name: 'Inventory Valuation ($)',
          data: [
            25000, 26000, 24000, 25500, 26500, 27000, 28000, 27500, 29000,
            30000, 31000, 32000,
          ],
        },
      ],
      chart: {
        height: 350,
        type: 'line',
      },
      title: {
        text: 'Inventory Valuation - Last Year',
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

    // Chart for last 5 years: Inventory Growth (area chart)
    this.chartOptionsFiveYears = {
      series: [
        {
          name: 'Inventory Growth',
          data: [15000, 15500, 16000, 16500, 17000],
        },
      ],
      chart: {
        height: 350,
        type: 'area',
      },
      title: {
        text: 'Inventory Growth - Last 5 Years',
      },
      xaxis: {
        categories: ['2018', '2019', '2020', '2021', '2022'],
      },
    };
  }

  ngOnInit(): void {}
}
