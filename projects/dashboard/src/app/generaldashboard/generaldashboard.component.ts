import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  ApexNonAxisChartSeries,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexDataLabels,
  ApexLegend,
  ApexGrid,
  ApexResponsive
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  stroke?: ApexStroke;
  colors?: string[];
  dataLabels?: ApexDataLabels;
  legend: ApexLegend;      // Make non-optional
  grid?: ApexGrid;
  labels?: string[];
  responsive?: ApexResponsive[];
};

@Component({
  selector: 'app-generaldashboard',
  templateUrl: './generaldashboard.component.html',
  styleUrls: ['./generaldashboard.component.scss']
})
export class GeneraldashboardComponent {

  constructor(private router: Router) {}

  dropdownOpen = false;
  selectedModule = 'Overview';
  newTask = '';
  tasks: string[] = [
    'Review daily sales report',
    'Update inventory records',
    'Verify staff attendance'
  ];
  showNotifications = false;
  unreadNotifications: number = 3;

  modules = [
    { name: 'POS', route: 'dashboard-overview' },
    { name: 'Kitchen' },
    { name: 'Accounting' },
    { name: 'HR' },
    { name: 'General', route: '/' },
  ];

  // ------------------------------
  // ApexCharts Data
  // ------------------------------

  pieChart: ChartOptions = {
    series: [45, 25, 20, 10],
    labels: ['POS', 'Kitchen', 'Accounting', 'HR'],
    chart: { type: 'pie', height: 350 },
    colors: ['#6366F1', '#10B981', '#f63bb2ff', '#EF4444'],
    legend: { position: 'bottom' },      // Required
    responsive: [{ breakpoint: 480, options: { chart: { width: 300 }, legend: { position: 'bottom' } } }]
  };

  lineChart: ChartOptions = {
   series: [
  { name: 'POS', data: Array.from({length: 10}, () => Math.floor(Math.random() * 100)) },
  { name: 'Kitchen', data: Array.from({length: 10}, () => Math.floor(Math.random() * 80)) },
  { name: 'Accounting', data: Array.from({length: 10}, () => Math.floor(Math.random() * 70)) },
  { name: 'HR', data: Array.from({length: 10}, () => Math.floor(Math.random() * 50)) }
]
,
    chart: { type: 'line', height: 350, zoom: { enabled: false } },
    xaxis: { categories: Array.from({length: 10}, (_, i) => `Day ${i + 1}`) },
    stroke: { curve: 'smooth' },
    colors: ['#6366F1', '#10B981', '#f63bb2ff', '#EF4444'],
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },  // Required
    grid: { row: { colors: ['#f3f3f3', 'transparent'], opacity: 0.5 } }
  };

  // ------------------------------
  // Dynamic Chart Summaries
  // ------------------------------

  get pieChartSummary(): string {
    const series = this.pieChart.series as number[];
    const labels = this.pieChart.labels || [];
    if (!series || !labels) return '';
    const maxIndex = series.indexOf(Math.max(...series));
    return `${labels[maxIndex]} module currently drives the largest share of overall activity.`;
  }

  get lineChartSummary(): string {
    // Ensure series is typed correctly
    const seriesTyped = this.lineChart.series as { name: string; data: number[] }[];
    if (!seriesTyped || seriesTyped.length === 0) return '';
    const latestValues = seriesTyped.map(s => s.data[s.data.length - 1]);
    const maxIndex = latestValues.indexOf(Math.max(...latestValues));
    return `${seriesTyped[maxIndex].name} shows the highest performance in the most recent period.`;
  }

  // ------------------------------
  // Dashboard Methods
  // ------------------------------
  toggleDropdown() { this.dropdownOpen = !this.dropdownOpen; }

  selectModule(module: any) {
    this.selectedModule = module.name; 
    this.dropdownOpen = false;
    if (module.route) {
      const target = module.route.startsWith('/') ? module.route : `/${module.route}`;
      this.router.navigateByUrl(target).catch(err => console.error('Navigation error', err));
    }
  }

  addTask() {
    if (this.newTask.trim() !== '') {
      this.tasks.push(this.newTask);
      this.newTask = '';
    }
  }

  removeTask(index: number) { this.tasks.splice(index, 1); }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) this.unreadNotifications = 0;
  }
  public userInfo = {
  name: 'Okafor Chukwuemeka',
  role: 'Software Engineer',
  department: 'Sales',
  employeeId: 'tok123abc',
  bankName: 'GTBank',
  daysWorked: 22,
  phoneNumber: '+234 801 234 5678'
};
}
