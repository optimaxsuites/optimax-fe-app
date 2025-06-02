import { Component, OnInit, ViewChild } from '@angular/core';
import { 
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexLegend,
  ApexFill,
  ApexTooltip,
  ApexGrid,
  ApexPlotOptions,
  ApexResponsive,
  ApexNonAxisChartSeries
} from 'ng-apexcharts';
import { StyleColor } from '../../../models/enums';
import { FormGroup, FormBuilder } from '@angular/forms';
import { BranchDTO } from '../../../service/report.service';
// import { BranchDTO } from '../../../models/interface';
// import { PieChartOptions } from '../report-dashboard.component';
interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: string;
}

export type RevenueChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  markers: any;
  tooltip: ApexTooltip;
  yaxis: ApexYAxis;
  grid: ApexGrid;
  legend: ApexLegend;
  title?: ApexTitleSubtitle;
  colors: string[];
}

export interface OrdersChartOptions {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  fill: ApexFill;
  colors: string[];
}

export interface PieChartOptions {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  responsive: ApexResponsive[];
  labels: any;
  colors: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
}


interface CashierPerformanceDTO {
  cashier: UserDTO;
  branch: BranchDTO;
  ordersHandled: number;
  revenueGenerated: number;
  refunds: number;
  discountsGiven: number;
}

interface CashierReportDTO {
  cashiers: CashierPerformanceDTO[];
}

interface CashierReportRequestDTO {
  startDate: Date;
  endDate: Date;
  branchIds?: number[];
  shift?: string;
}
@Component({
  selector: 'app-inventory-report',
  templateUrl: './inventory-report.component.html',
  styleUrl: './inventory-report.component.scss',
})
export class InventoryReportComponent implements OnInit {
  @ViewChild("revenueChart") revenueChart!: ChartComponent;
  @ViewChild("ordersChart") ordersChart!: ChartComponent;
  @ViewChild("refundsChart") refundsChart!: ChartComponent;
  
  public reportForm!: FormGroup;
  public reportData!: CashierReportDTO;
  public filteredReportData!: CashierReportDTO;
  public branches: BranchDTO[] = [];
  public shifts: string[] = ['Morning', 'Afternoon', 'Evening', 'Night'];
  public activeTab: string = 'overview';
  public selectedCashier: CashierPerformanceDTO | null = null;
  public loading: boolean = false;
  public periodComparison: 'weekly' | 'monthly' = 'weekly';
  
  public revenueChartOptions!: RevenueChartOptions;
  public ordersChartOptions!: OrdersChartOptions;
  public refundsChartOptions!: PieChartOptions;

  filterForm: boolean = false
  
  constructor(private fb: FormBuilder) {
    this.initCharts();
  }
  
  ngOnInit(): void {
    this.initForm();
    this.loadBranches();
    this.loadDummyData();
    this.applyFilter();
  }
  
  initForm(): void {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    this.reportForm = this.fb.group({
      startDate: [lastMonth],
      endDate: [today],
      branchIds: [[]],
      shift: ['']
    });
  }
  
  openFilterForm(){
    this.filterForm = !this.filterForm
  }
  loadBranches(): void {
    // In a real app, this would be fetched from a service
    this.branches = [
      { id: 1, name: 'Downtown Branch', location: 'Main Street 123' },
      { id: 2, name: 'Westside Mall', location: 'Commercial Avenue 45' },
      { id: 3, name: 'East Shopping Center', location: 'East Highway 67' },
      { id: 4, name: 'North Plaza', location: 'Northern Boulevard 89' },
    ];
  }
  
  loadDummyData(): void {
    // Generate realistic dummy data
    const cashiers: CashierPerformanceDTO[] = [];
    
    const names = ['John Smith', 'Jane Doe', 'Robert Johnson', 'Lisa Kim', 
                  'Michael Brown', 'Sarah Garcia', 'David Martinez', 'Emma Wilson',
                  'Thomas Lee', 'Maria Rodriguez', 'James Taylor', 'Linda Chen'];
                  
    for (let i = 0; i < 12; i++) {
      const branchIndex = i % this.branches.length;
      
      cashiers.push({
        cashier: {
          id: i + 1,
          name: names[i],
          email: names[i].toLowerCase().replace(' ', '.') + '@company.com',
          role: 'Cashier'
        },
        branch: this.branches[branchIndex],
        ordersHandled: Math.floor(Math.random() * 300) + 150,
        revenueGenerated: Math.floor(Math.random() * 15000) + 5000,
        refunds: Math.floor(Math.random() * 20),
        discountsGiven: Math.floor(Math.random() * 50) + 10
      });
    }
    
    this.reportData = { cashiers };
  }
  
  applyFilter(): void {
    this.loading = true;
    
    // Simulate API request
    setTimeout(() => {
      const formValue = this.reportForm.value;
      
      // Filter data based on form values
      this.filteredReportData = {
        cashiers: this.reportData.cashiers.filter(cashier => {
          // Filter by branch if any selected
          if (formValue.branchIds && formValue.branchIds.length > 0) {
            if (!formValue.branchIds.includes(cashier.branch.id)) {
              return false;
            }
          }
          
          return true;
        })
      };
      
      this.updateCharts();
      this.loading = false;
    }, 800);
  }
  
  initCharts(): void {
    // Revenue Chart Options
    this.revenueChartOptions = {
      series: [],
      chart: {
        height: 350,
        type: 'line',
        dropShadow: {
          enabled: true,
          color: '#000',
          top: 18,
          left: 7,
          blur: 10,
          opacity: 0.2
        },
        toolbar: {
          show: true
        }
      },
      colors: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      grid: {
        borderColor: '#e7e7e7',
        row: {
          colors: ['#f3f3f3', 'transparent'],
          opacity: 0.5
        },
      },
      markers: {
        size: 1
      },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        title: {
          text: 'Month'
        }
      },
      yaxis: {
        title: {
          text: 'Revenue ($)'
        },
        min: 0,
        max: 25000
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        floating: true,
        offsetY: -25,
        offsetX: -5
      },
      tooltip: {
        y: {
          formatter: function(value) {
            return "$" + value.toFixed(2);
          }
        }
      }
    };
    
    // Orders Chart Options
    this.ordersChartOptions = {
      series: [],
      chart: {
        type: 'bar',
        height: 350,
        stacked: true,
        toolbar: {
          show: true
        },
        zoom: {
          enabled: true
        }
      },
      colors: ['#4F46E5', '#EF4444'],
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 4,
          columnWidth: '55%',
        },
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: [],
      },
      yaxis: {
        title: {
          text: 'Orders'
        }
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: function(val) {
            return val + " orders";
          }
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'left'
      }
    };
    
    // Refunds Pie Chart
    this.refundsChartOptions = {
      series: [],
      chart: {
        width: 380,
        type: 'pie',
      },
      labels: [],
      colors: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'],
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: {
              width: 300
            },
            legend: {
              position: 'bottom'
            }
          }
        }
      ],
      legend: {
        position: 'right',
      },
      dataLabels: {
        enabled: true,
        formatter: function(val: number) {
          return val.toFixed(1) + "%";
        }
      }
    };
  }
  
  updateCharts(): void {
    const topPerformers = [...this.filteredReportData.cashiers]
      .sort((a, b) => b.revenueGenerated - a.revenueGenerated)
      .slice(0, 5);
    
    // Update revenue chart
    this.revenueChartOptions.series = [{
      name: 'Revenue',
      data: topPerformers.map(c => c.revenueGenerated)
    }];
    this.revenueChartOptions.xaxis = {
      categories: topPerformers.map(c => c.cashier.name)
    };
    
    // Update orders chart
    this.ordersChartOptions.series = [
      {
        name: 'Orders Handled',
        data: topPerformers.map(c => c.ordersHandled)
      },
      {
        name: 'Refunds',
        data: topPerformers.map(c => c.refunds)
      }
    ];
    this.ordersChartOptions.xaxis = {
      categories: topPerformers.map(c => c.cashier.name)
    };
    
    // Update refunds pie chart
    const totalRefunds = this.filteredReportData.cashiers.reduce((sum, c) => sum + c.refunds, 0);
    this.refundsChartOptions.series = this.filteredReportData.cashiers
      .slice(0, 4)
      .map(c => (c.refunds / totalRefunds) * 100);
    
    this.refundsChartOptions.labels = this.filteredReportData.cashiers
      .slice(0, 4)
      .map(c => c.cashier.name);
  }
  
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
  
  selectCashier(cashier: CashierPerformanceDTO): void {
    this.selectedCashier = cashier;
    this.activeTab = 'detail';
  }
  
  togglePeriodComparison(): void {
    this.periodComparison = this.periodComparison === 'weekly' ? 'monthly' : 'weekly';
    // In a real app, this would trigger data refresh
  }
  
  getMetricClass(value: number, threshold1: number, threshold2: number): string {
    if (value >= threshold2) return 'text-green-600';
    if (value >= threshold1) return 'text-yellow-500';
    return 'text-red-500';
  }
  
  getAverageRevenue(): number {
    if (!this.filteredReportData?.cashiers.length) return 0;
    const total = this.filteredReportData.cashiers.reduce((sum, c) => sum + c.revenueGenerated, 0);
    return total / this.filteredReportData.cashiers.length;
  }
  
  getTotalOrders(): number {
    if (!this.filteredReportData?.cashiers.length) return 0;
    return this.filteredReportData.cashiers.reduce((sum, c) => sum + c.ordersHandled, 0);
  }
  
  getTotalRevenue(): number {
    if (!this.filteredReportData?.cashiers.length) return 0;
    return this.filteredReportData.cashiers.reduce((sum, c) => sum + c.revenueGenerated, 0);
  }
  
  getTotalRefunds(): number {
    if (!this.filteredReportData?.cashiers.length) return 0;
    return this.filteredReportData.cashiers.reduce((sum, c) => sum + c.refunds, 0);
  }
  
  exportReport(format: 'pdf' | 'excel'): void {
    // In a real app, this would trigger export functionality
    console.log(`Exporting report as ${format}...`);
  }

  getCashiersByBranch(branchId: number) {
    return this.filteredReportData?.cashiers.filter(c => c.branch.id === branchId) || [];
  }
  
  getOrdersHandled(branchId: number): number {
    return this.getCashiersByBranch(branchId).reduce((sum, c) => sum + c.ordersHandled, 0);
  }
  
  getRevenue(branchId: number): number {
    return this.getCashiersByBranch(branchId).reduce((sum, c) => sum + c.revenueGenerated, 0);
  }
  
  getRefunds(branchId: number): number {
    return this.getCashiersByBranch(branchId).reduce((sum, c) => sum + c.refunds, 0);
  }
  
}
