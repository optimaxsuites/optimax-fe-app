import { Component, ViewChild } from '@angular/core';

// import {
//   ChartComponent,
//   ApexAxisChartSeries,
//   ApexChart,
//   ApexXAxis,
//   ApexDataLabels,
//   ApexStroke,
//   ApexYAxis,
//   ApexFill,
//   ApexLegend,
//   ApexPlotOptions,
//   ApexResponsive,
//   ApexGrid,
//   ApexTooltip
// } from "ng-apexcharts";

// export type ChartOptions = {
//   series: ApexAxisChartSeries;
//   chart: ApexChart;
//   dataLabels: ApexDataLabels;
//   plotOptions: ApexPlotOptions;
//   stroke: ApexStroke;
//   xaxis: ApexXAxis;
//   yaxis: ApexYAxis;
//   colors: string[];
//   fill: ApexFill;
//   legend: ApexLegend;
//   responsive: ApexResponsive;
//   grid: ApexGrid;
//   tooltip: ApexTooltip;
// };

@Component({
  selector: 'app-levels',
  templateUrl: './levels.component.html',
  styleUrls: ['./levels.component.scss']
})
export class LevelsComponent {
  

  // @ViewChild("chart") chart!: ChartComponent;
  // public chartOptions: Partial<ChartOptions>;

  // constructor() {
  //   this.chartOptions = {
  //     series: [
  //       {
  //         // name: "Q1 Budget",
  //         data: [3,1,2,4,5]
  //       },
  //       {
  //         // name: "Q1 Actual",
  //         data: [6,4,6,8,2]
  //       },
  //     ],
  //     chart: {
  //       type: "bar",
  //       height: '210',
  //       width: '100%',
  //       stacked: false,
  //       toolbar:{
  //         show: false,
  //       },
  //       zoom: {
  //         enabled: true
  //       },
  //       animations: {
  //         enabled: true,
  //         easing: 'easeinout',
  //         speed: 800,
  //         animateGradually: {
  //           enabled: true,
  //           delay: 150
  //         },
  //         dynamicAnimation: {
  //           enabled: true,
  //           speed: 450
  //         }
  //       },
  //       brush: {
  //         enabled: false,
  //         target: undefined,
  //         autoScaleYaxis: false
  //       }

  //     },
  //     grid:{
  //       show: false,
  //       yaxis: {
  //         lines: {
  //             show: false
  //         }
  //       },
  //       xaxis: {
  //         lines: {
  //             show: false
  //         }
  //       }, 
  //     },
  //     responsive:{
  //       breakpoint: 480,
  //         options: {
            
  //           legend: {
  //             position: 'bottom',
  //           }
  //         }
  //     },
  //     tooltip:{
  //       enabled: false
  //     },
  //     stroke: {
  //       show: true,
  //       curve: 'stepline',
  //       // lineCap: 'butt',
  //       // colors: undefined,
  //       width: 1,
  //       dashArray: 0, 

  //     },
  //     plotOptions: {
  //       bar: {
  //         horizontal: false,
  //         borderRadius: 10,
  //         borderRadiusApplication: 'end',
  //         columnWidth: '45%',
  //         distributed: true,

  //       }
  //     },
  //     colors: ["#80c7fd", "#008FFB"],
  //     xaxis: {
  //       labels:{
  //         show: false,
  //       },
  //       tooltip:{
  //         enabled: false
  //       }
  //     },
  //     yaxis: {
  //       show: false,
  //       labels:{
  //         show: false,
  //       },
  //       tooltip:{
  //         enabled: false,

  //       }
  //     },
  //     legend:{
  //       show: false,
        
  //     },
  //     dataLabels:{
  //       enabled: false,

  //     }
  //   };
  // }


  chartOptions = {
    title: {
      text: ' ',
    },
    theme: 'light1',
    animationEnabled: true,
    exportEnabled: true,
    axisY: {
      includeZero: true,
      valueFormatString: '₦#,##0k',
    },
    data: [
      {
        type: 'line', //change type to bar, line, area, pie, etc
        yValueFormatString: '₦#,##0k',
        color: '#25925B ',
        dataPoints: [
          { label: 'Jan', y: 172 },
          { label: 'Feb', y: 189 },
          { label: 'Mar', y: 201 },
          { label: 'Apr', y: 83 },
          { label: 'May', y: 166 },
          { label: 'Jun', y: 196 },
          { label: 'Jul', y: 330 },
          { label: 'Aug', y: 167 },
          { label: 'Sep', y: 175 },
          { label: 'Oct', y: 95 },
          { label: 'Nov', y: 156 },
          { label: 'Dec', y: 164 },
        ],
      },
    ],
  };

}
