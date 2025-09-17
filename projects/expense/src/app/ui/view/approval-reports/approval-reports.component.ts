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
  filteredTableData: any[] = [];  // To hold filtered data after loading
  tableData: any[] = [];
  expenses: any[] = [];  // Holds data from localStorage

 




  get totalExpenses() {
    return this.filteredTableData.reduce((sum, item) => {
      // Ensure 'amount' is a number before adding to the sum
      const amount = parseFloat(item.amount);  // Ensure it's a number
      return sum + (isNaN(amount) ? 0 : amount);  // Add the amount, ensuring no NaN values
    }, 0);

  }

  
  
 get approvedCount() {
    return this.filteredTableData.filter(item => item.status === 'Approved').length;
  }
  
   get pendingCount() {
    return this.filteredTableData.filter(item => item.status === 'Pending').length;
  }
  
  get oldestPendingRequest() {
    // Fetch expenses from local storage
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    console.log('Fetched expenses from local storage:', expenses); // Log the expenses data
  
    // Filter pending requests
    const pendingRequests = expenses.filter((item: { status: string; }) => item.status === 'Pending');
    console.log('Pending requests:', pendingRequests); // Log the filtered pending requests
  
    if (pendingRequests.length === 0) return null;
  
    // Find the oldest pending request based on the eventDate
    const oldestRequest = pendingRequests.reduce((oldest: { eventDate: string | number | Date; }, current: { eventDate: string | number | Date; }) => {
      const currentEventDate = new Date(current.eventDate); // Ensure eventDate is a valid date
      const oldestEventDate = new Date(oldest.eventDate); // Ensure eventDate is a valid date
  
      console.log('Comparing dates:', currentEventDate, oldestEventDate); // Log the dates being compared
  
      // Compare dates to find the oldest
      return currentEventDate < oldestEventDate ? current : oldest;
    });
  
    // Calculate the difference between current date and the oldest request's eventDate
    const currentDate = new Date();
    const oldestDate = new Date(oldestRequest.eventDate);
    
    console.log('Oldest request date:', oldestDate); // Log the oldest request date
    console.log('Current date:', currentDate); // Log the current date
  
    const diffTime = Math.abs(currentDate.getTime() - oldestDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24)); // Convert time difference to days
  
    console.log('Difference in days:', diffDays); // Log the number of days difference
  
    return diffDays; // Return the number of days since the oldest pending request
  }
  get rejectedCount() {
    return this.filteredTableData.filter(item => item.status === 'Rejected').length;
  }
   
  get thisWeekApprovedCount() {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Set to the start of the current week (Sunday)
    const approvedThisWeek = this.filteredTableData.filter(item => {
      const itemDate = new Date(item.eventDate);
      return item.status === 'Approved' && itemDate >= startOfWeek;
    });
    return approvedThisWeek.length;
  }
  get avgApprovedAmount() {
    const approvedExpenses = this.filteredTableData.filter(item => item.status === 'Approved');
    if (approvedExpenses.length === 0) return '0';  // Avoid division by zero
  
    const totalAmount = approvedExpenses.reduce((sum, item) => sum + item.amount, 0);
    const avgAmount = totalAmount / approvedExpenses.length;
  
    // Format the number with commas
    return avgAmount.toLocaleString(); // This will format the number with commas
  }

  get lastRejectedDays() {
    // Fetch expenses from local storage
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    console.log('Fetched expenses from local storage:', expenses); // Log the expenses data
  
    // Filter rejected requests
    const rejectedRequests = expenses.filter((item: { status: string; }) => item.status === 'Rejected');
    console.log('Rejected requests:', rejectedRequests); // Log the filtered rejected requests
  
    if (rejectedRequests.length === 0) return null; // If there are no rejected requests, return null
  
    // Find the oldest rejected request based on the eventDate
    const oldestRejected = rejectedRequests.reduce((oldest: { eventDate: string | number | Date; }, current: { eventDate: string | number | Date; }) => {
      const currentEventDate = new Date(current.eventDate); // Ensure eventDate is a valid date
      const oldestEventDate = new Date(oldest.eventDate); // Ensure eventDate is a valid date
  
      console.log('Comparing dates:', currentEventDate, oldestEventDate); // Log the dates being compared
  
      // Compare dates to find the oldest
      return currentEventDate < oldestEventDate ? current : oldest;
    });
  
    // Calculate the difference between current date and the oldest rejected request's eventDate
    const currentDate = new Date();
    const oldestDate = new Date(oldestRejected.eventDate);
  
    console.log('Oldest rejected request date:', oldestDate); // Log the oldest rejected request date
    console.log('Current date:', currentDate); // Log the current date
  
    const diffTime = Math.abs(currentDate.getTime() - oldestDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24)); // Convert time difference to days
  
    console.log('Difference in days:', diffDays); // Log the number of days difference
  
    return diffDays; // Return the number of days since the oldest rejected request
  }
  
    

  
  loadExpensesFromLocalStorage(): void {
    // Get expenses from localStorage (return empty array if not found)
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    
    // Assign the loaded expenses to 'expenses' array
    this.expenses = expenses;
    
    console.log('Loaded expenses into table:', this.expenses);
  }
  
  get topCategory() {
    const categories = this.filteredTableData.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});

    let topCategory = '';
    let maxAmount = 0;

    for (const category in categories) {
      if (categories[category] > maxAmount) {
        topCategory = category;
        maxAmount = categories[category];
      }
    }

    return topCategory || 'None';
  }

  ngOnInit() {
    this.loadExpensesFromLocalStorage();

    // Set filtered data (default to all loaded expenses)
    this.filteredTableData = [...this.expenses];

    // Additional chart data setup
    this.setupCharts();

  }



  setupCharts() {
    // Setup your charts based on the data from 'this.expenses'
    this.lineChartData = {
      labels: this.expenses.map(item => item.expenseName),  // Dynamic labels
      datasets: [{
        label: 'Expense Amounts',
        data: this.expenses.map(item => item.amount),  // Dynamic amounts
        backgroundColor: 'rgba(0, 0, 0, 0)',
        borderColor: '#36A2EB',
        borderWidth: 2,
        fill: false,
      }]
    };



    this.doughnutChartData = {
      labels: ['Approved', 'Pending', 'Rejected'],
      datasets: [{
        data: [
          this.expenses.filter(item => item.status === 'Approved').length,
          this.expenses.filter(item => item.status === 'Pending').length,
          this.expenses.filter(item => item.status === 'Rejected').length
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




 applyFilter(event: any): void {
    const status = event.target.value;
    if (status === 'all') {
      this.filteredTableData = [...this.expenses];
    } else {
      this.filteredTableData = this.expenses.filter(item => item.status.toLowerCase() === status.toLowerCase());
    }
  }
 
}
