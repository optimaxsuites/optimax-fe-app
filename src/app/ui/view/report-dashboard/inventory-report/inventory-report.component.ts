import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
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
import { FormGroup, FormBuilder } from '@angular/forms';
import { ReportService, CashierReportRequestDTO } from '../../../service/report.service';
import { StyleColor } from '../../../models/enums';

interface UserDTO {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface BranchDTO {
  id: number;
  name: string;
  location: string;
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
};

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

@Component({
  selector: 'app-inventory-report',
  templateUrl: './inventory-report.component.html',
  styleUrls: ['./inventory-report.component.scss'],
})
export class InventoryReportComponent implements OnInit, AfterViewInit {
  @ViewChild("revenueChart") revenueChart!: ChartComponent;
  @ViewChild("ordersChart") ordersChart!: ChartComponent;
  @ViewChild("refundsChart") refundsChart!: ChartComponent;
  
  public reportForm!: FormGroup;
  public filteredReportData: CashierReportDTO = { cashiers: [] };
  public branches: BranchDTO[] = [];
  public shifts: string[] = ['Morning', 'Afternoon', 'Evening', 'Night'];
  public activeTab: string = 'overview';
  public selectedCashier: CashierPerformanceDTO | null = null;
  public loading: boolean = false;
  public periodComparison: 'weekly' | 'monthly' = 'weekly';
  public filterForm: boolean = false;
  
  public revenueChartOptions!: RevenueChartOptions;
  public ordersChartOptions!: OrdersChartOptions;
  public refundsChartOptions!: PieChartOptions;


  
  constructor(
    private fb: FormBuilder,
    private reportService: ReportService
  ) {
    this.initCharts();
  }

  ngOnInit(): void {
    this.initForm();
    this.loadBranches();
    console.log('Component initialized. Loading branches...');
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.applyFilter(), 100);
  }

  initForm(): void {
  const today = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  

  const endDate = new Date(2025, 6, 19);
  const startDate = new Date(2025, 5, 19); 
  
  this.reportForm = this.fb.group({
    startDate: [startDate],
    endDate: [endDate],
    branchIds: [[]], 
    shift: [''] 
  });
  
  console.log('Form initialized with fixed dates:', {
    startDate: startDate,
    endDate: endDate
  });
}

  openFilterForm() {
    this.filterForm = !this.filterForm;
  }

  
private formatDate(date: Date): string {
  return date.toISOString(); 
}

  loadBranches(): void {
    this.reportService.getBranches().subscribe({
      next: (branches) => {
        this.branches = branches;
        console.log('Branches loaded successfully:', branches);
        this.applyFilter(); 
      },
      error: (error) => {
        console.error('Failed to load branches:', error);
        this.branches = [];
        this.applyFilter();
      }
    });
  }

applyFilter(): void {
  this.loading = true;
  const formValue = this.reportForm.value;
  
  const payload: CashierReportRequestDTO = {
    startDate: this.formatDate(formValue.startDate),
    endDate: this.formatDate(formValue.endDate),
    branchIds: formValue.branchIds?.length ? formValue.branchIds : [0],
    shift: formValue.shift || "string"
  };

  console.log('Sending payload to API:', payload);
  
  this.reportService.getCashierPerformanceReport(payload).subscribe({
    next: (response) => {
      console.log(' API Response received:', response);
      console.log('Number of cashiers:', response?.cashiers?.length || 0);
      
      if (!response || !response.cashiers || response.cashiers.length === 0) {
        console.warn('No cashier data in response');
      }
      
      this.filteredReportData = response;
      console.log('Updated filteredReportData:', this.filteredReportData);
      
      this.updateCharts();
      this.loading = false;
    },
    error: (error) => {
      console.error('Error fetching report:', error);
      console.error('Error details:', {
        status: error.status,
        message: error.message,
        error: error.error
      });
      this.loading = false;
    }
  }); 
}





  initCharts(): void {
    this.revenueChartOptions = {
      series: [{ name: "Revenue", data: [0, 0, 0] }],
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
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        title: {
          text: 'Months'
        }
      },
      yaxis: {
        title: {
          text: 'Revenue (₦)'
        },
        min: 0
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
      series: [
        { name: "Orders Handled", data: [0, 0, 0] },
        { name: "Refunds", data: [0, 0, 0] }
      ],
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
  console.log('Updating charts with data:', this.filteredReportData);
  
  if (!this.filteredReportData || !this.filteredReportData.cashiers || this.filteredReportData.cashiers.length === 0) {
    console.warn('No data available for charts');
    // Set empty data for charts
    this.revenueChartOptions.series = [{ name: 'Revenue', data: [] }];
    this.revenueChartOptions.xaxis = { categories: [] };
    this.ordersChartOptions.series = [
      { name: 'Orders Handled', data: [] },
      { name: 'Refunds', data: [] }
    ];
    this.ordersChartOptions.xaxis = { categories: [] };
    this.refundsChartOptions.series = [];
    this.refundsChartOptions.labels = [];
    return;
  }

  const topPerformers = [...this.filteredReportData.cashiers]
    .sort((a, b) => (b.revenueGenerated || 0) - (a.revenueGenerated || 0))
    .slice(0, 5);
  
  console.log('Top performers:', topPerformers);
  
  // Update revenue chart
  this.revenueChartOptions.series = [{
    name: 'Revenue',
    data: topPerformers.map(c => c.revenueGenerated || 0)
  }];
  this.revenueChartOptions.xaxis = {
    categories: topPerformers.map(c => c.cashier?.name || 'Unknown')
  };
  
  // Update orders chart
  this.ordersChartOptions.series = [
    {
      name: 'Orders Handled',
      data: topPerformers.map(c => c.ordersHandled || 0)
    },
    {
      name: 'Refunds',
      data: topPerformers.map(c => c.refunds || 0)
    }
  ];
  this.ordersChartOptions.xaxis = {
    categories: topPerformers.map(c => c.cashier?.name || 'Unknown')
  };
  
  // Update refunds pie chart
  const totalRefunds = this.filteredReportData.cashiers.reduce((sum, c) => sum + (c.refunds || 0), 0);
  
  if (totalRefunds > 0) {
    const topRefunders = this.filteredReportData.cashiers
      .filter(c => (c.refunds || 0) > 0)
      .slice(0, 4);
    
    this.refundsChartOptions.series = topRefunders.map(c => 
      ((c.refunds || 0) / totalRefunds) * 100
    );
    this.refundsChartOptions.labels = topRefunders.map(c => 
      c.cashier?.name || 'Unknown'
    );
  } else {
    this.refundsChartOptions.series = [];
    this.refundsChartOptions.labels = [];
  }
  
  console.log('Charts updated successfully');
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
    this.applyFilter();
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
    const cashiers = this.filteredReportData?.cashiers || [];
    return cashiers.reduce((sum, c) => sum + (c.ordersHandled || 0), 0);
  }

  getTotalRevenue(): number {
    const cashiers = this.filteredReportData?.cashiers || [];
    return cashiers.reduce((sum, c) => sum + (c.revenueGenerated || 0), 0);
  }

  getTotalRefunds(): number {
    const cashiers = this.filteredReportData?.cashiers || [];
    return cashiers.reduce((sum, c) => sum + (c.refunds || 0), 0);
  }

  exportReport(format: 'pdf' | 'excel'): void {
    console.log(`Exporting report as ${format}...`);
    const payload: CashierReportRequestDTO = {
      startDate: this.formatDate(this.reportForm.value.startDate),
      endDate: this.formatDate(this.reportForm.value.endDate),
      branchIds: this.reportForm.value.branchIds?.length ? this.reportForm.value.branchIds : [0],
      shift: this.reportForm.value.shift || "string"
    };
  }

  getCashiersByBranch(branchId: number) {
    return this.filteredReportData?.cashiers?.filter(c => c.branch?.id === branchId) || [];
  }
  
  getOrdersHandled(branchId: number): number {
    return this.getCashiersByBranch(branchId).reduce((sum, c) => sum + (c.ordersHandled || 0), 0);
  }
  
  getRevenue(branchId: number): number {
    return this.getCashiersByBranch(branchId).reduce((sum, c) => sum + (c.revenueGenerated || 0), 0);
  }
  
  getRefunds(branchId: number): number {
    return this.getCashiersByBranch(branchId).reduce((sum, c) => sum + (c.refunds || 0), 0);
  }
}
