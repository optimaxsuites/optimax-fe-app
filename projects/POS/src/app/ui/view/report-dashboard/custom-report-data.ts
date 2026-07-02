import { ChartType } from 'ng-apexcharts';
type ChartArrayData = {
  chartType: string;
  timeframe: string;
  chartStyle: ChartType;
};
type ReportData = {
  name: string;
  charts: ChartArrayData[];
};

export let arrOfCustomReports: ReportData[] = [];
