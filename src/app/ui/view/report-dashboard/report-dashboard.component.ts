import { Component, OnInit } from '@angular/core';
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexTitleSubtitle,
  ApexPlotOptions,
  ApexResponsive,
  ApexNonAxisChartSeries,
} from 'ng-apexcharts';

// Define interfaces using Apex types for type safety

export type SalesSummaryChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
};

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  dataLabels: ApexDataLabels;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
};

export type PieChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  responsive: ApexResponsive[];
  title: ApexTitleSubtitle;
};

export type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  responsive: ApexResponsive[];
  title: ApexTitleSubtitle;
};

@Component({
  selector: 'app-report-dashboard',
  templateUrl: './report-dashboard.component.html',
  styleUrl: './report-dashboard.component.scss',
})
export class ReportDashboardComponent implements OnInit {
  // 1. Sales Summary Report (Line Chart)
  public salesSummary: SalesSummaryChartOptions = {
    series: [
      {
        name: 'Total Sales',
        data: [500, 700, 800, 650, 900, 1200, 1100],
      },
    ],
    chart: { type: 'line', height: 350 },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' },
    title: { text: 'Total Sales by Day', align: 'center' },
  };

  // 2. Prescription Sales Report (Multi-Series Bar Chart)
  public prescriptionSales: BarChartOptions = {
    series: [
      {
        name: 'Prescriptions Filled',
        data: [120, 150, 180, 130, 160],
      },
      {
        name: 'Revenue',
        data: [2000, 2500, 3000, 2200, 2700],
      },
    ],
    chart: { type: 'bar', height: 350 },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'] },
    title: { text: 'Weekly Prescription Sales', align: 'center' },
  };

  // 3. Inventory Turnover Report (Donut Chart with Alerts)
  public inventoryTurnover: DonutChartOptions & { alerts: string[] } = {
    series: [75, 25],
    chart: { type: 'donut', height: 350 },
    labels: ['Fast-Moving', 'Slow-Moving'],
    responsive: [
      {
        breakpoint: 480,
        options: { chart: { width: 200 }, legend: { position: 'bottom' } },
      },
    ],
    title: { text: 'Inventory Turnover', align: 'center' },
    alerts: ['Reorder: Aspirin stock low', 'Reorder: Antibiotics stock low'],
  };

  // 4. Customer Purchase History Report (Pie Chart)
  public customerPurchase: PieChartOptions = {
    series: [40, 35, 25],
    chart: { type: 'pie', height: 350 },
    labels: ['Frequent', 'Occasional', 'New'],
    responsive: [
      {
        breakpoint: 480,
        options: { chart: { width: 200 }, legend: { position: 'bottom' } },
      },
    ],
    title: { text: 'Customer Segments', align: 'center' },
  };

  // 5. Returns and Refunds Report (Bar Chart)
  public returnsRefunds: BarChartOptions = {
    series: [
      {
        name: 'Returns Processed',
        data: [5, 3, 4, 2, 6],
      },
    ],
    chart: { type: 'bar', height: 350 },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: [
        'Damaged',
        'Wrong Item',
        'Expired',
        'Other',
        'Customer Request',
      ],
    },
    title: { text: 'Return Reasons', align: 'center' },
  };

  // 6. Drug Interaction Alerts Report (Line Chart)
  public drugInteraction: SalesSummaryChartOptions = {
    series: [
      {
        name: 'Alerts',
        data: [1, 0, 2, 1, 3, 1, 0],
      },
    ],
    chart: { type: 'line', height: 350 },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' },
    title: { text: 'Weekly Drug Interaction Alerts', align: 'center' },
  };

  // 7. Sales by Category Report (Donut Chart)
  public salesByCategory: DonutChartOptions = {
    series: [50, 30, 20],
    chart: { type: 'donut', height: 350 },
    labels: ['OTC', 'Prescription', 'Supplements'],
    responsive: [
      {
        breakpoint: 480,
        options: { chart: { width: 200 }, legend: { position: 'bottom' } },
      },
    ],
    title: { text: 'Sales by Medication Type', align: 'center' },
  };

  // 8. Employee Performance Report (Bar Chart)
  public employeePerformance: BarChartOptions = {
    series: [
      {
        name: 'Pharmacist A',
        data: [80, 90, 75, 85],
      },
      {
        name: 'Pharmacist B',
        data: [70, 80, 65, 95],
      },
    ],
    chart: { type: 'bar', height: 350 },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] },
    title: { text: 'Individual Sales Performance', align: 'center' },
  };

  // 9. Insurance Claims Report (Bar Chart)
  public insuranceClaims: BarChartOptions = {
    series: [
      {
        name: 'Submitted',
        data: [15, 20, 18, 22],
      },
      {
        name: 'Paid',
        data: [12, 18, 15, 20],
      },
    ],
    chart: { type: 'bar', height: 350 },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: ['Q1', 'Q2', 'Q3', 'Q4'] },
    title: { text: 'Insurance Claims Overview', align: 'center' },
  };

  // 10. Regulatory Compliance Report (Radial Bar Chart)
  public regulatoryCompliance: {
    series: number[];
    chart: ApexChart;
    title: ApexTitleSubtitle;
  } = {
    series: [85],
    chart: { type: 'radialBar', height: 350 },
    title: { text: 'Regulatory Compliance (%)', align: 'center' },
  };

  constructor() {}

  ngOnInit(): void {
    // TODO: Fetch from an API
  }
}
