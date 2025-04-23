import { Component } from '@angular/core';
import { Chart } from 'chart.js';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-approval-reports',
  templateUrl: './approval-reports.component.html',
  styleUrl: './approval-reports.component.scss'
})
export class ApprovalReportsComponent {

  lineChartData: any;
  doughnutChartData: any;
  chartOptions: any;

  tableData = [
    {
      expenseName: 'Team Lunch',
      amount: 12000, // Amount as a number
      status: 'Approved',
      dateSubmitted: new Date('2024-04-01'),
      submittedBy: 'Ada Okafor',
      approvedBy: 'Mr. Johnson',
      approvalDate: new Date('2024-04-02'),
      comment: 'Monthly team bonding lunch'
    },
    {
      expenseName: 'Office Stationery',
      amount: 8500,
      status: 'Pending',
      dateSubmitted: new Date('2024-04-05'),
      submittedBy: 'Chinedu Eze',
      approvedBy: '',
      approvalDate: null,
      comment: 'Restocking pens and papers'
    },
    {
      expenseName: 'Client Entertainment',
      amount: 25000,
      status: 'Rejected',
      dateSubmitted: new Date('2024-04-03'),
      submittedBy: 'Funmi Ade',
      approvedBy: 'Mrs. Bello',
      approvalDate: new Date('2024-04-04'),
      comment: 'Exceeded budget'
    },
    {
      expenseName: 'Software Subscription',
      amount: 18750,
      status: 'Approved',
      dateSubmitted: new Date('2024-04-07'),
      submittedBy: 'Ibrahim Musa',
      approvedBy: 'Mr. Johnson',
      approvalDate: new Date('2024-04-08'),
      comment: 'Monthly design tool fee'
    },
    {
      expenseName: 'Transport Refund',
      amount: 5000,
      status: 'Approved',
      dateSubmitted: new Date('2024-04-09'),
      submittedBy: 'Ngozi Umeh',
      approvedBy: 'Mrs. Bello',
      approvalDate: new Date('2024-04-10'),
      comment: 'Reimbursement for client visit'
    },
    {
      expenseName: 'Team Training Materials',
      amount: 22300,
      status: 'Pending',
      dateSubmitted: new Date('2024-04-11'),
      submittedBy: 'Tunde Alabi',
      approvedBy: '',
      approvalDate: null,
      comment: 'Books and online course access'
    },
    {
      expenseName: 'Printer Ink',
      amount: 6200,
      status: 'Approved',
      dateSubmitted: new Date('2024-04-12'),
      submittedBy: 'Grace Emeka',
      approvedBy: 'Mr. Johnson',
      approvalDate: new Date('2024-04-13'),
      comment: 'Black and color cartridges'
    }
  ];
  
  get totalExpenses() {
    return this.tableData.reduce((sum, item) => sum + item.amount, 0);
  }
  
  get approvedCount() {
    return this.tableData.filter(item => item.status === 'Approved').length;
  }
  
  get pendingCount() {
    return this.tableData.filter(item => item.status === 'Pending').length;
  }
  
  get rejectedCount() {
    return this.tableData.filter(item => item.status === 'Rejected').length;
  }  

  filteredTableData = [...this.tableData]; // Default to all data

  ngOnInit() {
    this.lineChartData = {
      labels: ['Team Lunch', 'Office Stationery', 'Client Entertainment', 'Software Subscription', 'Transport Refund'], // Dummy labels for expenses
      datasets: [{
        label: 'Expense Amounts',  // Label for the line chart
        data: [12000, 8500, 25000, 18750, 5000], // Dummy amounts for each expense
        backgroundColor: 'rgba(0, 0, 0, 0)',  // Transparent background
        borderColor: '#36A2EB',  // Border color for the line
        borderWidth: 2,  // Thickness of the border
        fill: false,  // No fill under the line (transparent background)
      }]
    };

    this.doughnutChartData = {
      labels: ['Approved', 'Pending', 'Rejected'],
      datasets: [{
        data: [
          this.tableData.filter(item => item.status === 'Approved').length,
          this.tableData.filter(item => item.status === 'Pending').length,
          this.tableData.filter(item => item.status === 'Rejected').length
        ],
        backgroundColor: ['#36A2EB', '#FFCD56', '#FF6384']
      }]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right'
        }
      }
    };
  }

  ngAfterViewInit() {
    this.createCharts();
  }

  createCharts() {
    new Chart('areaChart', {
      type: 'line',
      data: {
        labels: ['Mar 1', 'Mar 3', 'Mar 5', 'Mar 7', 'Mar 9', 'Mar 11', 'Mar 13'],
        datasets: [{
          label: 'Users',
          data: [12000, 25000, 20000, 28000, 24000, 30000, 35000],
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          tension: 0.4,
        }]
      }
    });

    new Chart('barChart', {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue',
          data: [3000, 5000, 7000, 9000, 11000, 15000],
          backgroundColor: '#3b82f6'
        }]
      }
    });
    
  }
  applyFilter(event: any): void {
    const status = event.target.value;
    if (status === 'all') {
      this.filteredTableData = [...this.tableData];
    } else {
      this.filteredTableData = this.tableData.filter(item => item.status.toLowerCase() === status.toLowerCase());
    }
  }
 
}
