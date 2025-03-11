import { Component, OnInit } from '@angular/core';
import {
  ChartComponent,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexMarkers,
  ApexYAxis,
  ApexGrid,
  ApexLegend,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexPlotOptions,
} from 'ng-apexcharts';

export interface LineChartOptions {
  series: { name: string; data: number[] }[];
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  markers: ApexMarkers;
  yaxis?: ApexYAxis;
  grid: ApexGrid;
  legend?: ApexLegend;
  title?: ApexTitleSubtitle;
  tooltip: ApexTooltip;
}

export interface DonutChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  responsive: ApexResponsive[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  title: ApexTitleSubtitle;
}

@Component({
  selector: 'app-summary-report',
  templateUrl: './summary-report.component.html',
  styleUrl: './summary-report.component.scss',
})
export class SummaryReportComponent implements OnInit {
  // Line Chart Options
  //@ts-ignore
  public lineChartOptions: LineChartOptions;

  // Donut Chart Options
  //@ts-ignore
  public donutChartOptions: DonutChartOptions;
  public generalChartOptions: any;
  public generalChartOptions2: any;

  constructor() {}

  ngOnInit(): void {
    this.initLineChart();
    this.initDonutChart();

    this.generalChartOptions = this.lineChartOptions;
    this.generalChartOptions2 = this.donutChartOptions;
  }

  private initLineChart(): void {
    this.lineChartOptions = {
      series: [
        {
          name: 'Orders',
          data: [10, 40, 35, 50, 49, 60, 70], // sample data
        },
      ],
      chart: {
        type: 'line',
        height: 250,
        toolbar: {
          show: false,
        },
      },
      xaxis: {
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 3,
      },
      markers: {
        size: 4,
      },
      grid: {
        strokeDashArray: 4,
      },
      tooltip: {
        theme: 'light',
      },
    };
  }

  private initDonutChart(): void {
    this.donutChartOptions = {
      series: [44, 55, 41, 17],
      chart: {
        type: 'donut',
        height: 250,
      },
      labels: ['Team A', 'Team B', 'Team C', 'Team D'],
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 200,
            },
            legend: {
              position: 'bottom',
            },
          },
        },
      ],
      plotOptions: {
        pie: {
          donut: {
            size: '60%',
          },
        },
      },
      dataLabels: {
        enabled: true,
      },
      legend: {
        position: 'right',
      },
      title: {
        text: 'Category Distribution',
        align: 'center',
        style: {
          fontSize: '16px',
        },
      },
    };
  }
}
