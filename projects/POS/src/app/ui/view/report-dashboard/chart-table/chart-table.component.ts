import { Component, Input } from '@angular/core';
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

type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
  dataLabels: ApexDataLabels;
  // plotOptions?: ApexPlotOptions;
  stroke: ApexStroke;
  // fill: ApexFill;
  // tooltip: ApexTooltip;
};

@Component({
  selector: 'app-chart-table',
  templateUrl: './chart-table.component.html',
  styleUrl: './chart-table.component.scss',
})
export class ChartTableComponent {
  @Input() chartData: ChartOptions = {} as any;
  // @Input() tableData: {}[] = [{}];
  // @Input() cols: { field: string; header: string }[] = [
  //   { field: 'Dummy', header: 'Dummy' },
  // ];
  showModal = false;
  tableData: { colName: string; value: number }[] = [];

  constructor() {}

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    const values = this.chartData.series[0].data as number[];
    const xAxis = this.chartData.xaxis.categories as string[];

    const temp: typeof this.tableData = [];
    xAxis.forEach((val, index) => {
      temp.push({ colName: val, value: values[index] });
    });

    this.tableData = temp;
  }
}
