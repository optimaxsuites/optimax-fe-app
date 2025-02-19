import { Component, OnInit } from '@angular/core';
import { arrOfCustomReports } from '../custom-report-data';
import { StyleColor } from '../../../models/enums';
import { ChartOptions } from '../sales-report/sales-report.component';
import { ChartType } from 'ng-apexcharts';

@Component({
  selector: 'app-custom-report',
  templateUrl: './custom-report.component.html',
  styleUrl: './custom-report.component.scss',
})
export class CustomReportComponent implements OnInit {
  //@ts-ignore
  arrOfCustomReportsCopy: ChartOptions[] = arrOfCustomReports;
  reportToUse = '';
  reportNames = [''];

  // public chartOptions24H: ChartOptions;
  // public chartOptionsWeek: ChartOptions;
  // public chartOptionsMonth: ChartOptions;

  // // Long-Term Inventory Analysis charts
  // public chartOptionsQuarter: ChartOptions;
  // public chartOptionsYear: ChartOptions;
  // public chartOptionsFiveYears: ChartOptions;
  chartColor = [StyleColor.CELADON_GREEN];

  // constructor() {
  //   this.chartOptions24H = {
  //     series: [
  //       {
  //         name: 'Chart 1',
  //         data: [
  //           1200, 1195, 1180, 1175, 1180, 1190, 1205, 1210, 1200, 1190, 1185,
  //           1170, 1165, 1170, 1180, 1190, 1200, 1210, 1220, 1215, 1210, 1205,
  //           1200, 1195,
  //         ],
  //       },
  //     ],
  //     chart: {
  //       height: 350,
  //       type: (this.arrOfCustomReportsCopy[0].chartType as ChartType) ?? 'line',
  //     },
  //     title: {
  //       text: 'Chart 1',
  //     },
  //     xaxis: {
  //       categories: Array.from({ length: 24 }, (_, i) => `${i}:00`),
  //     },
  //   };

  //   // Chart for last week: Daily Restocks (bar chart)
  //   this.chartOptionsWeek = {
  //     series: [
  //       {
  //         name: 'Chart 2',
  //         data: [150, 180, 130, 170, 160, 190, 210],
  //       },
  //     ],
  //     chart: {
  //       height: 350,
  //       type: (this.arrOfCustomReportsCopy[1].chartType as ChartType) ?? 'line',
  //     },
  //     title: {
  //       text: 'Chart 2',
  //     },
  //     xaxis: {
  //       categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  //     },
  //   };

  //   // Chart for last month: Inventory Turnover (area chart)
  //   this.chartOptionsMonth = {
  //     series: [
  //       {
  //         name: 'Turnover',
  //         data: [
  //           300, 320, 310, 330, 340, 320, 310, 300, 350, 340, 330, 320, 310,
  //           300, 320, 330, 340, 350, 360, 370, 360, 350, 340, 330, 320, 310,
  //           300, 320, 330, 340,
  //         ],
  //       },
  //     ],
  //     chart: {
  //       height: 350,
  //       type: 'area',
  //     },
  //     title: {
  //       text: 'Inventory Turnover - Last Month',
  //     },
  //     xaxis: {
  //       categories: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
  //     },
  //   };

  //   // Chart for last quarter: Average Inventory Level (bar chart)
  //   this.chartOptionsQuarter = {
  //     series: [
  //       {
  //         name: 'Average Inventory',
  //         data: [1180, 1195, 1200],
  //       },
  //     ],
  //     chart: {
  //       height: 350,
  //       type: 'bar',
  //     },
  //     title: {
  //       text: 'Average Inventory - Last Quarter',
  //     },
  //     xaxis: {
  //       categories: ['Month 1', 'Month 2', 'Month 3'],
  //     },
  //   };

  //   // Chart for last year: Inventory Valuation (line chart)
  //   this.chartOptionsYear = {
  //     series: [
  //       {
  //         name: 'Inventory Valuation ($)',
  //         data: [
  //           25000, 26000, 24000, 25500, 26500, 27000, 28000, 27500, 29000,
  //           30000, 31000, 32000,
  //         ],
  //       },
  //     ],
  //     chart: {
  //       height: 350,
  //       type: 'line',
  //     },
  //     title: {
  //       text: 'Inventory Valuation - Last Year',
  //     },
  //     xaxis: {
  //       categories: [
  //         'Jan',
  //         'Feb',
  //         'Mar',
  //         'Apr',
  //         'May',
  //         'Jun',
  //         'Jul',
  //         'Aug',
  //         'Sep',
  //         'Oct',
  //         'Nov',
  //         'Dec',
  //       ],
  //     },
  //   };

  //   // Chart for last 5 years: Inventory Growth (area chart)
  //   this.chartOptionsFiveYears = {
  //     series: [
  //       {
  //         name: 'Inventory Growth',
  //         data: [15000, 15500, 16000, 16500, 17000],
  //       },
  //     ],
  //     chart: {
  //       height: 350,
  //       type: 'area',
  //     },
  //     title: {
  //       text: 'Inventory Growth - Last 5 Years',
  //     },
  //     xaxis: {
  //       categories: ['2018', '2019', '2020', '2021', '2022'],
  //     },
  //   };
  // }
  ngOnInit(): void {
    //@ts-ignore
    // this.arrOfCustomReportsCopy = arrOfCustomReports;
    this.reportNames = arrOfCustomReports.map((reportData) => {
      return reportData.name;
    });

    this.loadChartsForReport();
  }

  loadChartsForReport(reportName: string | null = null) {
    const index = this.reportNames.indexOf(reportName ?? this.reportToUse);
    const report = arrOfCustomReports[index == -1 ? 0 : index];

    this.arrOfCustomReportsCopy = report.charts.map((val) => {
      return {
        title: { text: val.chartType } as ApexTitleSubtitle,
        chart: {
          height: 350,
          type: val.chartStyle,
        },
        series: [
          {
            name: val.timeframe,
            data: [10, 41, 35, 51, 49, 62, 69],
          },
        ],
        xaxis: {
          categories: [
            'Period 1',
            'Period 2',
            'Period 3',
            'Period 4',
            'Period 5',
            'Period 6',
            'Period 7',
          ],
        },
      } as ChartOptions;
    });
  }

  selectReportName(event: Event) {
    const reportName = (event.target as HTMLSelectElement).value;

    this.reportToUse = reportName;
    this.loadChartsForReport(reportName);
  }
}
