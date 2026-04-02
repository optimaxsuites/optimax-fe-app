import { Component } from '@angular/core';
import { 
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexStroke,
  ApexGrid,
  ApexFill,
  ApexLegend,
  ApexPlotOptions,
  ApexTooltip,
  ApexNonAxisChartSeries
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  grid?: ApexGrid;
  fill?: ApexFill;
  legend?: ApexLegend;
  plotOptions?: ApexPlotOptions;
  tooltip?: ApexTooltip;
  colors?: string[];
  labels?: string[];
};

@Component({
  selector: 'app-approval-reports',
  templateUrl: './approval-reports.component.html',
  styleUrl: './approval-reports.component.scss'
})
export class ApprovalReportsComponent {

  // ApexCharts options
  salesTrendChartOptions!: Partial<ChartOptions>;
  paymentMethodChartOptions!: Partial<ChartOptions>;
  revenueBranchChartOptions!: Partial<ChartOptions>;
  topProductsChartOptions!: Partial<ChartOptions>;
  categoryBarChartOptions!: Partial<ChartOptions>;
  categoryPieChartOptions!: Partial<ChartOptions>;
  submitterChartOptions!: Partial<ChartOptions>;
  statusDoughnutChartOptions!: Partial<ChartOptions>;
  
  filteredTableData: any[] = [];
  tableData: any[] = [];
  expenses: any[] = [];
  
  // Tabs
  tabs = ['Overview', 'Categories', 'Submitters', 'Status', 'Detailed Report'];
  selectedTab = 'Overview';
  
  // Filter state
  currentFilters = {
    status: 'all',
    category: 'all',
    paidBy: 'all',
    recurring: 'all'
  };

  get uniqueCategories(): string[] {
    const categories = this.expenses.map(item => item.category).filter(Boolean);
    return [...new Set(categories)];
  }

  get uniqueSubmitters(): string[] {
    const submitters = this.expenses.map(item => item.id).filter(Boolean);
    return [...new Set(submitters)];
  }

  get totalExpenses() {
    return this.filteredTableData.reduce((sum, item) => {
      const amount = parseFloat(item.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }
  
  get approvedCount() {
    return this.filteredTableData.filter(item => item.status === 'Approved').length;
  }
  
  get pendingCount() {
    return this.filteredTableData.filter(item => item.status === 'Pending').length;
  }
  
  get oldestPendingRequest() {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    console.log('Fetched expenses from local storage:', expenses);
  
    const pendingRequests = expenses.filter((item: { status: string; }) => item.status === 'Pending');
    console.log('Pending requests:', pendingRequests);
  
    if (pendingRequests.length === 0) return null;
  
    const oldestRequest = pendingRequests.reduce((oldest: { eventDate: string | number | Date; }, current: { eventDate: string | number | Date; }) => {
      const currentEventDate = new Date(current.eventDate);
      const oldestEventDate = new Date(oldest.eventDate);
  
      console.log('Comparing dates:', currentEventDate, oldestEventDate);
  
      return currentEventDate < oldestEventDate ? current : oldest;
    });
  
    const currentDate = new Date();
    const oldestDate = new Date(oldestRequest.eventDate);
    
    console.log('Oldest request date:', oldestDate);
    console.log('Current date:', currentDate);
  
    const diffTime = Math.abs(currentDate.getTime() - oldestDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
  
    console.log('Difference in days:', diffDays);
  
    return diffDays;
  }

  get rejectedCount() {
    return this.filteredTableData.filter(item => item.status === 'Rejected').length;
  }
   
  get thisWeekApprovedCount() {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const approvedThisWeek = this.filteredTableData.filter(item => {
      const itemDate = new Date(item.eventDate);
      return item.status === 'Approved' && itemDate >= startOfWeek;
    });
    return approvedThisWeek.length;
  }

  get avgApprovedAmount() {
    const approvedExpenses = this.filteredTableData.filter(item => item.status === 'Approved');
    if (approvedExpenses.length === 0) return '0';
  
    const totalAmount = approvedExpenses.reduce((sum, item) => sum + item.amount, 0);
    const avgAmount = totalAmount / approvedExpenses.length;
  
    return avgAmount.toLocaleString();
  }

  get approvedTotal() {
    return this.filteredTableData
      .filter(item => item.status === 'Approved')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get pendingTotal() {
    return this.filteredTableData
      .filter(item => item.status === 'Pending')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get rejectedTotal() {
    return this.filteredTableData
      .filter(item => item.status === 'Rejected')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  get topSubmittersData() {
    const submitterMap = new Map();
    
    this.filteredTableData.forEach(item => {
      const submitter = item.id || 'Unknown';
      if (!submitterMap.has(submitter)) {
        submitterMap.set(submitter, { name: submitter, count: 0, total: 0 });
      }
      const data = submitterMap.get(submitter);
      data.count++;
      data.total += item.amount || 0;
    });

    return Array.from(submitterMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }

  get dateRangeLabel() {
    if (this.filteredTableData.length === 0) return '';
    
    const dates = this.filteredTableData
      .map(item => new Date(item.eventDate))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (dates.length === 0) return '';
    
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    
    return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  }

  get lastRejectedDays() {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    console.log('Fetched expenses from local storage:', expenses);
  
    const rejectedRequests = expenses.filter((item: { status: string; }) => item.status === 'Rejected');
    console.log('Rejected requests:', rejectedRequests);
  
    if (rejectedRequests.length === 0) return null;
  
    const oldestRejected = rejectedRequests.reduce((oldest: { eventDate: string | number | Date; }, current: { eventDate: string | number | Date; }) => {
      const currentEventDate = new Date(current.eventDate);
      const oldestEventDate = new Date(oldest.eventDate);
  
      console.log('Comparing dates:', currentEventDate, oldestEventDate);
  
      return currentEventDate < oldestEventDate ? current : oldest;
    });
    
    const currentDate = new Date();
    const oldestDate = new Date(oldestRejected.eventDate);
  
    console.log('Oldest rejected request date:', oldestDate);
    console.log('Current date:', currentDate);
  
    const diffTime = Math.abs(currentDate.getTime() - oldestDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
  
    console.log('Difference in days:', diffDays);
  
    return diffDays;
  }
    
  loadExpensesFromLocalStorage(): void {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
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
    this.filteredTableData = [...this.expenses];
    this.setupCharts();
  }

  setupCharts() {
    // Sort expenses by date
    const sortedExpenses = [...this.expenses].sort((a, b) => 
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );

    // Prepare data
    const dates = sortedExpenses.map(item => {
      const date = new Date(item.eventDate);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const amounts = sortedExpenses.map(item => item.amount);

    // Sales Trend Chart (Area Chart like in reference)
    this.salesTrendChartOptions = {
      series: [{
        name: 'Revenue',
        data: amounts
      }],
      chart: {
        type: 'area',
        height: 350,
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
          stops: [0, 90, 100]
        }
      },
      colors: ['#6366f1'],
      xaxis: {
        categories: dates,
        labels: {
          rotate: -45,
          style: {
            fontSize: '11px'
          }
        }
      },
      yaxis: {
        labels: {
          formatter: (value) => `₦${value.toLocaleString()}`
        }
      },
      grid: {
        borderColor: '#e5e7eb',
        strokeDashArray: 4
      },
      tooltip: {
        y: {
          formatter: (value) => `₦${value.toLocaleString()}`
        }
      }
    };

    // Payment Method Distribution (Donut Chart)
    const approvedCount = this.expenses.filter(item => item.status === 'Approved').length;
    const pendingCount = this.expenses.filter(item => item.status === 'Pending').length;
    const rejectedCount = this.expenses.filter(item => item.status === 'Rejected').length;

    this.paymentMethodChartOptions = {
      series: [approvedCount, pendingCount, rejectedCount],
      chart: {
        type: 'donut',
        height: 350
      },
      labels: ['Approved', 'Pending', 'Rejected'],
      colors: ['#10b981', '#fbbf24', '#ef4444'],
      legend: {
        position: 'right',
        fontSize: '12px',
        markers: {
          radius: 12
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`
      },
      plotOptions: {
        pie: {
          donut: {
            size: '70%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                fontSize: '16px',
                fontWeight: 600,
                formatter: () => `${approvedCount + pendingCount + rejectedCount}`
              }
            }
          }
        }
      },
      tooltip: {
        y: {
          formatter: (value) => `${value} requests`
        }
      }
    };

    // Revenue by Branch / Category Chart
    const categoryTotals = this.expenses.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + item.amount;
      return acc;
    }, {});

    const categoryLabels = Object.keys(categoryTotals).slice(0, 8);
    const categoryData = categoryLabels.map(label => categoryTotals[label]);

    this.revenueBranchChartOptions = {
      series: [{
        name: 'Amount',
        data: categoryData
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 8,
          dataLabels: {
            position: 'top'
          }
        }
      },
      colors: ['#0ea5e9'],
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: categoryLabels,
        labels: {
          formatter: (value) => `₦${Number(value).toLocaleString()}`
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '11px'
          }
        }
      },
      grid: {
        borderColor: '#e5e7eb',
        strokeDashArray: 4
      }
    };

    // Top Products / Submitters Chart
    const submitterTotals = this.expenses.reduce((acc, item) => {
      const submitter = item.id || 'Unknown';
      acc[submitter] = (acc[submitter] || 0) + item.amount;
      return acc;
    }, {});

    const submitterLabels = Object.keys(submitterTotals).slice(0, 8);
    const submitterData = submitterLabels.map(label => submitterTotals[label]);

    this.topProductsChartOptions = {
      series: [{
        name: 'Total Expenses',
        data: submitterData
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 8
        }
      },
      colors: ['#8b5cf6'],
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: submitterLabels,
        labels: {
          formatter: (value) => `₦${Number(value).toLocaleString()}`
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '11px'
          }
        }
      },
      grid: {
        borderColor: '#e5e7eb',
        strokeDashArray: 4
      }
    };

    // Category Bar Chart (for Categories tab)
    this.categoryBarChartOptions = {
      series: [{
        name: 'Total Amount',
        data: categoryData
      }],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '60%'
        }
      },
      colors: ['#0ea5e9'],
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: categoryLabels,
        labels: {
          rotate: -45,
          style: {
            fontSize: '11px'
          }
        }
      },
      yaxis: {
        labels: {
          formatter: (value) => `₦${Number(value).toLocaleString()}`
        }
      },
      grid: {
        borderColor: '#e5e7eb',
        strokeDashArray: 4
      }
    };

    // Category Pie Chart
    this.categoryPieChartOptions = {
      series: categoryData,
      chart: {
        type: 'pie',
        height: 400
      },
      labels: categoryLabels,
      colors: ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6'],
      legend: {
        position: 'right',
        fontSize: '12px'
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`
      },
      tooltip: {
        y: {
          formatter: (value) => `₦${value.toLocaleString()}`
        }
      }
    };

    // Submitter Chart (for Submitters tab)
    this.submitterChartOptions = {
      series: [{
        name: 'Total Expenses',
        data: submitterData
      }],
      chart: {
        type: 'bar',
        height: 400,
        toolbar: {
          show: false
        }
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '60%'
        }
      },
      colors: ['#8b5cf6'],
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: submitterLabels,
        labels: {
          rotate: -45,
          style: {
            fontSize: '11px'
          }
        }
      },
      yaxis: {
        labels: {
          formatter: (value) => `₦${Number(value).toLocaleString()}`
        }
      },
      grid: {
        borderColor: '#e5e7eb',
        strokeDashArray: 4
      }
    };

    // Status Doughnut Chart (for Status tab)
    this.statusDoughnutChartOptions = {
      series: [approvedCount, pendingCount, rejectedCount],
      chart: {
        type: 'donut',
        height: 400
      },
      labels: ['Approved', 'Pending', 'Rejected'],
      colors: ['#10b981', '#fbbf24', '#ef4444'],
      legend: {
        position: 'bottom',
        fontSize: '13px',
        markers: {
          radius: 12
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val.toFixed(1)}%`
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Requests',
                fontSize: '18px',
                fontWeight: 700,
                color: '#374151',
                formatter: () => `${approvedCount + pendingCount + rejectedCount}`
              }
            }
          }
        }
      },
      tooltip: {
        y: {
          formatter: (value) => `${value} requests`
        }
      }
    };
  }

  applyStatusFilter(event: any): void {
    this.currentFilters.status = event.target.value;
    this.applyAllFilters();
  }

  applyCategoryFilter(event: any): void {
    this.currentFilters.category = event.target.value;
    this.applyAllFilters();
  }

  applyPaidByFilter(event: any): void {
    this.currentFilters.paidBy = event.target.value;
    this.applyAllFilters();
  }

  applyRecurringFilter(event: any): void {
    this.currentFilters.recurring = event.target.value;
    this.applyAllFilters();
  }

  applyAllFilters(): void {
    this.filteredTableData = this.expenses.filter(item => {
      // Status filter
      if (this.currentFilters.status !== 'all' && 
          item.status.toLowerCase() !== this.currentFilters.status.toLowerCase()) {
        return false;
      }

      // Category filter
      if (this.currentFilters.category !== 'all' && 
          item.category !== this.currentFilters.category) {
        return false;
      }

      // Paid By (Submitted By) filter
      if (this.currentFilters.paidBy !== 'all' && 
          item.id !== this.currentFilters.paidBy) {
        return false;
      }

      // Recurring filter
      if (this.currentFilters.recurring !== 'all') {
        const isRecurring = item.isRecurring || item.recurring || false;
        if (this.currentFilters.recurring === 'recurring' && !isRecurring) {
          return false;
        }
        if (this.currentFilters.recurring === 'one-time' && isRecurring) {
          return false;
        }
      }

      return true;
    });
  }

  clearAllFilters(): void {
    this.currentFilters = {
      status: 'all',
      category: 'all',
      paidBy: 'all',
      recurring: 'all'
    };
    
    // Reset all dropdowns
    (document.getElementById('statusFilter') as HTMLSelectElement).value = 'all';
    (document.getElementById('categoryFilter') as HTMLSelectElement).value = 'all';
    (document.getElementById('paidByFilter') as HTMLSelectElement).value = 'all';
    (document.getElementById('recurringFilter') as HTMLSelectElement).value = 'all';
    
    this.filteredTableData = [...this.expenses];
  }

  selectTab(tab: string): void {
    this.selectedTab = tab;
  }

  // Keep for backwards compatibility
  applyFilter(event: any): void {
    this.applyStatusFilter(event);
  }
}