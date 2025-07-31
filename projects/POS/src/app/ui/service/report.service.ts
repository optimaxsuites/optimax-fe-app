import { Injectable } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexGrid, ApexStroke, ApexTooltip, ApexPlotOptions, ApexFill, ApexLegend, ApexResponsive } from 'ng-apexcharts';
export interface ProductPerformanceReportRequestDTO {
  startDate: Date;
  endDate: Date;
  branchIds?: number[];
  categoryIds?: number[];
  groupBy?: 'product' | 'category' | 'variant';
}

export interface BranchDTO {
  id: number;
  name: string;
  location: string;
}

export interface CategoryDTO {
  id: number;
  name: string;
  description?: string;
}

export interface ProductDTO {
  id: number;
  name: string;
  sku: string;
  price: number;
}

export interface ProductStatsDTO {
  product: ProductDTO;
  quantitySold: number;
  revenue: number;
  percentageOfTotal: number;
}

export interface ProductPerformanceDTO {
  product: ProductDTO;
  category: CategoryDTO;
  variant?: string;
  quantitySold: number;
  totalRevenue: number;
  grossMargin: number;
  branch?: BranchDTO;
}

export interface ProductPerformanceReportDTO {
  totalProductsSold: number;
  totalRevenue: number;
  bestsellers: ProductStatsDTO[];
  underperformers: ProductStatsDTO[];
  productPerformanceBreakdown: ProductPerformanceDTO[];
}

// Chart type definitions
export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  legend: ApexLegend;
  responsive: ApexResponsive[];
  colors: string[];
};
@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor() { }
}
