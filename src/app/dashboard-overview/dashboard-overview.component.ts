import { Component, OnInit, ViewChild } from '@angular/core';
import { AppDashboardModule } from '../app.module';
import { DashboardsideModalComponent } from '../shared/dashboardside-modal/dashboardside-modal.component';
import {
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexChart,
  ApexXAxis,
  ApexAxisChartSeries,
  ApexTitleSubtitle,
  ApexDataLabels,
  ApexStroke,
  ApexGrid,
  ApexFill,
  ApexTooltip
} from 'ng-apexcharts';

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title?: ApexTitleSubtitle;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  grid?: ApexGrid;
  tooltip?: ApexTooltip;
  fill?: ApexFill;
};

export type PieChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  responsive?: ApexResponsive[];
  title?: ApexTitleSubtitle;
  tooltip?: ApexTooltip;
  fill?: ApexFill;
};

@Component({
  selector: 'dashboard-overview',
  templateUrl: './dashboard-overview.component.html',
})
export class DashboardOverviewComponent implements OnInit {
  // Chart option objects
  public barChartOptions: Partial<BarChartOptions> = {};
  public pieChartOptions: Partial<PieChartOptions> ={};

  // Dummy data for cards and table
  public metrics = {
    totalSales: 125_430,
    transactions: 1_284,
    refunds: 24,
    revenue: 98_750
  };

    public userInfo = {
  name: 'Okafor Chukwuemeka',
  role: 'Software Engineer',
  department: 'Sales',
  employeeId: 'tok123abc',
  bankName: 'GTBank',
  daysWorked: 22
};

  public recentTransactions = [
    { id: 'TXN-1001', date: '2025-10-12', customer: 'Olivia N.', amount: 5400, status: 'Completed' },
    { id: 'TXN-1002', date: '2025-10-11', customer: 'James K.', amount: 2200, status: 'Pending' },
    { id: 'TXN-1003', date: '2025-10-10', customer: 'Ada C.', amount: 1200, status: 'Refunded' },
    { id: 'TXN-1004', date: '2025-10-09', customer: 'Chinedu E.', amount: 7600, status: 'Completed' },
    { id: 'TXN-1005', date: '2025-10-08', customer: 'Maya P.', amount: 3200, status: 'Completed' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.initBarChart();
    this.initPieChart();
  }

  private initBarChart() {
    // Example monthly sales data
    this.barChartOptions = {
      series: [
        {
          name: 'Sales',
          data: [12000, 15000, 14000, 18000, 21000, 20000, 23000, 22000, 24000, 26000, 25000, 27000]
        }
      ],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 2
      },
      grid: { borderColor: '#e6e6e6' },
      tooltip: {
        y: {
          formatter: (val: number) => `₦${val.toLocaleString()}`
        }
      },
      fill: { opacity: 1 }
    };
  }

  private initPieChart() {
    // Example category breakdown
    this.pieChartOptions = {
      series: [55, 30, 10, 5],
      chart: {
        type: 'pie',
        height: 320
      },
      labels: ['Product A', 'Product B', 'Product C', 'Refunds'],
      tooltip: {
        y: {
          formatter: (val: number) => `${val}%`
        }
      },
      responsive: [
        {
          breakpoint: 768,
          options: {
            chart: { width: '100%' },
            legend: { position: 'bottom' }
          }
        }
      ],
      fill: { opacity: 1 }
    };
  }

  // Utility for formatting currency in template
  formatCurrency(value: number) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value);
  }

 



// inside DashboardOverviewComponent class
public showDetailsModal = false;
public selectedTransaction: any = null;

openDetails(tx: any) {
  this.selectedTransaction = tx;
  this.showDetailsModal = true;
}


closeDetailsModal() {
  console.log('closeDetailsModal called');
  this.selectedTransaction = null;
  this.showDetailsModal = false;
}

}
