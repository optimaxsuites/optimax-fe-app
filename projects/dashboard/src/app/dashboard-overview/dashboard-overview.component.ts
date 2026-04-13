import { Component, OnInit, HostListener } from '@angular/core';
import { DashboardService } from '../ui/services/dashboard.service';
import {
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexChart,
  ApexXAxis,
  ApexAxisChartSeries,
  ApexDataLabels,
  ApexStroke,
  ApexGrid,
  ApexFill,
  ApexTooltip,
  ApexYAxis,
  ApexLegend,
  ApexPlotOptions
} from 'ng-apexcharts';
import { SalesPerformanceResponse } from '../ui/models/interface/dashboard.models';

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  grid?: ApexGrid;
  tooltip?: ApexTooltip;
  fill?: ApexFill;
  plotOptions?: ApexPlotOptions;
  colors?: string[];
};

export type PieChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  responsive?: ApexResponsive[];
  tooltip?: ApexTooltip;
  fill?: ApexFill;
  legend?: ApexLegend;
};

export type TopProductsChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  responsive?: ApexResponsive[];
  tooltip?: ApexTooltip;
  fill?: ApexFill;
  legend?: ApexLegend;
  plotOptions?: ApexPlotOptions;
  dataLabels?: ApexDataLabels;
  colors?: string[];
};

export type BranchSalesChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  grid?: ApexGrid;
  tooltip?: ApexTooltip;
  fill?: ApexFill;
  legend?: ApexLegend;
  colors?: string[];
};

interface User {
  id?: number;
  username?: string;
  fullname?: string;
  email?: string;
  roles?: string | string[];
  accessToken?: string;
  token?: string;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  status: 'Completed' | 'Pending' | 'Refunded';
  transactionsCount: number;
}

@Component({
  selector: 'dashboard-overview',
  templateUrl: './dashboard-overview.component.html',
})
export class DashboardOverviewComponent implements OnInit {
  // Chart option objects
  public barChartOptions: Partial<BarChartOptions> = {};
  public pieChartOptions: Partial<PieChartOptions> = {};
  public topProductsChartOptions: Partial<TopProductsChartOptions> = {};
  public branchSalesChartOptions: Partial<BranchSalesChartOptions> = {};

  // Metrics (will be populated from API)
  public metrics = {
    totalSales: 0,
    transactions: 0,
    refunds: 0,
    revenue: 0,
    averageOrderValue: 0,
    totalDiscounts: 0
  };

  public userInfo = {
    name: '',
    role: '',
    department: '',
    employeeId: '',
    bankName: 'GTBank',
    daysWorked: 0,
    phoneNumber: '+234 801 234 5678'
  };

  public recentTransactions: Transaction[] = [];
  public allTransactions: Transaction[] = []; // For the side modal
  
  // Additional data for cards
  public topProducts: any[] = [];
  public paymentMethods: any[] = [];
  public salesBreakdown: any[] = [];
  public branchSales: any[] = [];

  // Session storage data
  public loggedInUser: User | null = null;
  public userId: number = 0;
  public username: string = '';
  public userFullName: string = '';
  public userRoles: string[] = [];
  public userEmail: string = '';
  public branchInfo: any = null;

  // Modal states
  public showDetailsModal = false;
  public showAllTransactionsModal = false;
  public selectedTransaction: Transaction | null = null;

  // Loading states
  public isLoading: boolean = true;
  public salesReport: SalesPerformanceResponse | null = null;
  public reportError: string | null = null;
  public hasRealData: boolean = false;

  // Current date for display
  public today = new Date();

  // Filter dropdown state
  public showFilterDropdown: boolean = false;
  public currentFilter: string = '30days';
  public currentFilterLabel: string = 'Last 30 Days';

  modules = [
    { name: 'POS', route: 'dashboard-overview' },
    { name: 'Kitchen' },
    { name: 'Accounting' },
    { name: 'HR' },
    { name: 'General', route: '/' },
  ];

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.loadUserFromSessionStorage();
    this.initAllChartsWithEmptyData();
    this.loadSalesData();
  }

  /**
   * Close filter dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showFilterDropdown = false;
    }
  }

  /**
   * Toggle filter dropdown
   */
  toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  /**
   * Apply filter based on selected period
   */
  applyFilter(filterType: string): void {
    this.currentFilter = filterType;
    
    // Update filter label
    const filterLabels: { [key: string]: string } = {
      'today': 'Today',
      'week': 'This Week',
      'month': 'This Month',
      'year': 'This Year',
      '30days': 'Last 30 Days'
    };
    this.currentFilterLabel = filterLabels[filterType] || 'Last 30 Days';
    
    this.showFilterDropdown = false;
    this.loadSalesData();
  }

  /**
   * Computed property for transaction total
   */
  get totalTransactionAmount(): number {
    return this.recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  /**
   * Computed property for all transactions total
   */
  get allTransactionsTotal(): number {
    return this.allTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  // Add getter methods for template safety
  get hasTopProductsData(): boolean {
    const series = this.topProductsChartOptions.series;
    return !!series && series.length > 0;
  }

  get hasBranchSalesData(): boolean {
    const series = this.branchSalesChartOptions.series;
    return !!series && 
           series.length > 0 && 
           !!series[0]?.data && 
           series[0].data.length > 0;
  }

  get topProductsCount(): number {
    if (!this.hasTopProductsData) return 0;
    const series = this.topProductsChartOptions.series;
    return series?.length || 0;
  }

  get branchSalesCount(): number {
    if (!this.hasBranchSalesData) return 0;
    const series = this.branchSalesChartOptions.series;
    return series?.[0]?.data?.length || 0;
  }

  /**
   * Load user information from sessionStorage - FIXED FOR REAL SESSION DATA
   */
  public loadUserFromSessionStorage(): void {
    try {
      // Get userId from sessionStorage
      const userIdStr = sessionStorage.getItem('userid') || '0';
      this.userId = parseInt(userIdStr) || 0;
      
      // GET USERNAME - This is the key fix (from sessionStorage 'username' = 'damilola')
      this.username = sessionStorage.getItem('username') || '';
      
      // Get userRegData (contains full user object)
      const userRegData = sessionStorage.getItem('userRegData');
      if (userRegData) {
        try {
          this.loggedInUser = JSON.parse(userRegData);
          
          // Use username from userRegData if not already set
          if (this.loggedInUser?.username && !this.username) {
            this.username = this.loggedInUser.username;
          }
          
          // Set userId from userRegData if available
          if (this.loggedInUser?.id && this.userId === 0) {
            this.userId = this.loggedInUser.id;
          }
        } catch (e) {
          console.error('Error parsing userRegData:', e);
        }
      }

      // Handle fullname - special case for string "undefined"
      const fullnameFromStorage = sessionStorage.getItem('fullname');
      if (fullnameFromStorage && fullnameFromStorage !== 'undefined') {
        this.userFullName = fullnameFromStorage;
      } else {
        // If fullname is "undefined" or empty, use username
        this.userFullName = this.username || 'User';
      }

      // Get email
      this.userEmail = sessionStorage.getItem('email') || 
                      this.loggedInUser?.email || 
                      '';

      // Handle roles
      const roleFromStorage = sessionStorage.getItem('role');
      const roles = this.loggedInUser?.roles || roleFromStorage || '';
      
      if (Array.isArray(roles)) {
        this.userRoles = roles;
      } else if (typeof roles === 'string') {
        this.userRoles = roles.split(',').map(r => r.trim());
      } else {
        this.userRoles = [roles];
      }

      // Load branch info if available
      const branchInfoStr = sessionStorage.getItem('userBranchInfoRegData');
      if (branchInfoStr) {
        try {
          this.branchInfo = JSON.parse(branchInfoStr);
        } catch (e) {
          console.error('Error parsing branch info:', e);
        }
      }

      // Update user info with session data
      this.updateUserInfoFromSession();

      console.log('User loaded from session:', {
        userId: this.userId,
        username: this.username,
        fullName: this.userFullName,
        roles: this.userRoles,
        email: this.userEmail,
        branchInfo: this.branchInfo
      });

    } catch (error) {
      console.error('Error loading user from sessionStorage:', error);
    }
  }

  /**
   * Update user info object with session data
   */
  private updateUserInfoFromSession(): void {
    // Use username for display name
    this.userInfo.name = this.username || 'User';

    if (this.userRoles.length > 0) {
      const mainRole = this.userRoles[0];
      if (mainRole.includes('ADMIN')) {
        this.userInfo.role = 'Administrator';
      } else if (mainRole.includes('MANAGER')) {
        this.userInfo.role = 'Manager';
      } else if (mainRole.includes('CASHIER')) {
        this.userInfo.role = 'Cashier';
      } else if (mainRole.includes('SUPERVISOR')) {
        this.userInfo.role = 'Supervisor';
      } else {
        this.userInfo.role = 'Employee';
      }
    } else {
      this.userInfo.role = 'Employee';
    }

    // Generate employee ID
    if (this.userId) {
      this.userInfo.employeeId = `${this.userId.toString().padStart(5, '0')}`;
    } else {
      this.userInfo.employeeId = `${this.username}` || '00000';
    }

    // Update department
    if (this.branchInfo?.branchName) {
      this.userInfo.department = `${this.userInfo.role} - ${this.branchInfo.branchName}`;
    } else {
      this.userInfo.department = this.userInfo.role;
    }
  }

  /**
   * Load sales data for the logged-in user with filter
   */
  public loadSalesData(): void {
    if (!this.userId || this.userId === 0) {
      console.warn('Cannot load sales data: User ID not available');
      this.reportError = 'Please log in to view sales data';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.reportError = null;

    // Calculate date range based on filter
    const { startDate, endDate } = this.calculateDateRange(this.currentFilter);

    // Build payload - CRITICAL: Use the user ID as cashierId
    const payload = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      branchIds: this.branchInfo?.branchId ? [this.branchInfo.branchId] : [],
      cashierIds: [this.userId], // THIS IS THE KEY - using userId as cashierId
      paymentMethods: [],
      groupBy: 'date'
    };

    console.log('Fetching sales data for:', {
      cashierId: this.userId,
      username: this.username,
      filter: this.currentFilter,
      payload: payload
    });

    this.dashboardService.salesPerformanceReport(payload).subscribe({
      next: (response: any) => {
        console.log('Full API Response:', response);
        this.salesReport = response;
        
        // Always try to update with whatever data we get
        this.updateAllDataFromResponse(response);
        this.hasRealData = this.checkIfHasRealData(response);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading sales data:', error);
        this.reportError = `Failed to load sales data: ${error.message || 'Please try again'}`;
        this.isLoading = false;
        this.hasRealData = false;
        this.resetAllData();
      }
    });
  }

  /**
   * Calculate date range based on filter type
   */
  private calculateDateRange(filterType: string): { startDate: Date, endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    
    switch(filterType) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(1); // First day of current month
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear(), 0, 1); // January 1st
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '30days':
      default:
        startDate.setDate(startDate.getDate() - 30);
        break;
    }
    
    return { startDate, endDate };
  }

  /**
   * Update ALL data from API response
   */
  private updateAllDataFromResponse(response: any): void {
    if (!response) {
      console.warn('No response data received');
      this.resetAllData();
      return;
    }

    // 1. Update main metrics
    this.updateMetricsFromResponse(response);
    
    // 2. Update charts
    this.updateChartsFromResponse(response);
    
    // 3. Update recent transactions
    this.updateRecentTransactionsFromResponse(response);
    
    // 4. Update additional data for cards
    this.updateAdditionalData(response);
    
    // 5. Update all transactions for side modal
    this.updateAllTransactionsFromResponse(response);
    
    // 6. Update branch sales data
    this.updateBranchSalesData(response);
  }

  /**
   * Update metrics from API response
   */
  private updateMetricsFromResponse(response: any): void {
    this.metrics.totalSales = response.totalRevenue || 0;
    this.metrics.transactions = response.totalTransactions || 0;
    this.metrics.revenue = response.totalRevenue || 0;
    this.metrics.averageOrderValue = response.averageOrderValue || 0;
    this.metrics.totalDiscounts = response.totalDiscounts || 0;
    this.metrics.refunds = 0; // Placeholder - you may need a separate API
  }

  /**
   * Update additional data for display
   */
  private updateAdditionalData(response: any): void {
    // Top selling products
    this.topProducts = response.topSellingProducts?.slice(0, 5) || [];
    
    // Payment methods
    this.paymentMethods = response.paymentMethodBreakdown || [];
    
    // Sales breakdown
    this.salesBreakdown = response.breakdown?.slice(0, 10) || [];
    
    console.log('Additional data loaded:', {
      topProducts: this.topProducts.length,
      paymentMethods: this.paymentMethods.length,
      salesBreakdown: this.salesBreakdown.length
    });
  }

  /**
   * Update branch sales data from API response - FIXED: Better handling of API response
   */
 /**
 * Update branch sales data from API response - FIXED: Using correct field name
 */
private updateBranchSalesData(response: any): void {
  console.log('API Response for branch sales:', response);
  
  // Check for the correct field name from Swagger: totalSalesPerBranch
  const branchSalesData = response.totalSalesPerBranch || [];
  
  console.log('Branch sales data from API (totalSalesPerBranch):', branchSalesData);
  
  if (branchSalesData.length > 0) {
    // Transform the API data to match our chart format
    this.branchSales = branchSalesData.map((item: any) => ({
      branchName: item.branch?.name || 'Unknown Branch',
      revenue: item.totalRevenue || 0,
      transactions: item.totalTransactions || 0,
      averageOrderValue: item.averageOrderValue || 0
    }));
    
    // Sort by revenue (highest to lowest)
    this.branchSales.sort((a: any, b: any) => b.revenue - a.revenue);
    
    console.log('Transformed branch revenue data:', this.branchSales);
  } else if (response.breakdown && response.breakdown.length > 0) {
    console.log('Creating branch data from breakdown as fallback');
    
    // Create branch sales data from breakdown if totalSalesPerBranch is empty
    const branchMap = new Map<string, number>();
    
    response.breakdown.forEach((item: any) => {
      if (item.branch?.name) {
        const branchName = item.branch.name;
        const revenue = item.revenue || 0;
        
        if (branchMap.has(branchName)) {
          branchMap.set(branchName, branchMap.get(branchName)! + revenue);
        } else {
          branchMap.set(branchName, revenue);
        }
      }
    });
    
    // Convert to array and sort by revenue (highest to lowest)
    this.branchSales = Array.from(branchMap.entries())
      .map(([branchName, revenue]) => ({ 
        branchName, 
        revenue,
        transactions: 0,
        averageOrderValue: 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  } else {
    // No branch data available
    this.branchSales = [];
    console.log('No branch data available in API response (totalSalesPerBranch is empty)');
  }
  
  console.log('Final branch revenue data loaded:', this.branchSales);
}
  /**
   * Update recent transactions from API response - FIXED: Using breakdown array
   */
  private updateRecentTransactionsFromResponse(response: any): void {
    if (!response.breakdown || !Array.isArray(response.breakdown)) {
      this.recentTransactions = [];
      return;
    }
    
    // Get breakdown entries for this cashier
    const cashierBreakdown = response.breakdown
      .filter((item: any) => item.cashier === this.userId)
      .slice(0, 5); // Get latest 5
    
    // If no cashier-specific breakdown, use any breakdown entries
    const breakdownToUse = cashierBreakdown.length > 0 
      ? cashierBreakdown 
      : response.breakdown.slice(0, 5);
    
    // Create transactions from breakdown entries
    this.recentTransactions = breakdownToUse.map((item: any, index: number) => {
      // Generate a transaction ID based on date and index
      const date = item.date ? new Date(item.date) : new Date();
      const transactionId = `TXN-${date.getTime()}-${index}`;
      
      return {
        id: transactionId,
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        amount: item.revenue || 0,
        paymentMethod: this.formatPaymentMethod(item.paymentMethod || 'CASH'),
        status: 'Completed', // Since breakdown doesn't have status, assume completed
        transactionsCount: item.transactions || 1
      };
    });
    
    console.log('Recent transactions loaded:', this.recentTransactions);
  }

  /**
   * Update all transactions for side modal
   */
  private updateAllTransactionsFromResponse(response: any): void {
    if (!response.breakdown || !Array.isArray(response.breakdown)) {
      this.allTransactions = [];
      return;
    }
    
    // Get ALL breakdown entries for this cashier
    const cashierBreakdown = response.breakdown
      .filter((item: any) => item.cashier === this.userId);
    
    // If no cashier-specific breakdown, use all breakdown
    const breakdownToUse = cashierBreakdown.length > 0 
      ? cashierBreakdown 
      : response.breakdown;
    
    // Create transactions from breakdown entries
    this.allTransactions = breakdownToUse.map((item: any, index: number) => {
      const date = item.date ? new Date(item.date) : new Date();
      const transactionId = `TXN-${date.getTime()}-${index}`;
      
      return {
        id: transactionId,
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        amount: item.revenue || 0,
        paymentMethod: this.formatPaymentMethod(item.paymentMethod || 'CASH'),
        status: 'Completed',
        transactionsCount: item.transactions || 1
      };
    });
    
    console.log('All transactions loaded:', this.allTransactions.length);
  }

  /**
   * Check if response has real data
   */
  private checkIfHasRealData(response: any): boolean {
    if (!response) return false;
    
    const hasRevenue = (response.totalRevenue || 0) > 0;
    const hasTransactions = (response.totalTransactions || 0) > 0;
    const hasBreakdown = response.breakdown && response.breakdown.length > 0;
    const hasTopProducts = response.topSellingProducts && response.topSellingProducts.length > 0;
    
    return hasRevenue || hasTransactions || hasBreakdown || hasTopProducts;
  }

  /**
   * Reset all data
   */
  private resetAllData(): void {
    this.metrics = {
      totalSales: 0,
      transactions: 0,
      refunds: 0,
      revenue: 0,
      averageOrderValue: 0,
      totalDiscounts: 0
    };
    this.resetChartsToEmpty();
    this.recentTransactions = [];
    this.allTransactions = [];
    this.topProducts = [];
    this.paymentMethods = [];
    this.salesBreakdown = [];
    this.branchSales = [];
  }

  /**
   * Reset charts to empty state
   */
  private resetChartsToEmpty(): void {
    // Reset all charts to empty state
    this.initAllChartsWithEmptyData();
  }

  /**
   * Initialize all charts with empty data
   */
  private initAllChartsWithEmptyData(): void {
    this.initBarChart();
    this.initPieChart();
    this.initTopProductsChart();
    this.initBranchSalesChart();
  }

  /**
   * Initialize bar chart with empty data
   */
 private initBarChart(): void {
  this.barChartOptions = {
    series: [
      {
        name: 'Daily Revenue',
        data: []
      }
    ],
    chart: {
      type: 'line',
      height: 320,
      toolbar: { show: false }
    },
    xaxis: {
      categories: [],
      labels: {
        style: {
          fontSize: '11px'
        }
      }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => {
          // Dynamic formatter will be set in updateChartsFromResponse
          return '₦' + val.toFixed(0);
        }
      }
    },
    dataLabels: { enabled: false },
    stroke: { 
      width: 3,
      curve: 'smooth'
    },
    grid: { borderColor: '#e6e6e6' },
    tooltip: {
      y: {
        formatter: (val: number) => `₦${val.toLocaleString()}`
      }
    },
    fill: { 
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100]
      }
    }
  };
}

  /**
   * Initialize pie chart with empty data
   */
  private initPieChart(): void {
    this.pieChartOptions = {
      series: [],
      chart: {
        type: 'pie',
        height: 320
      },
      labels: [],
      tooltip: {
        y: {
          formatter: (val: number) => `₦${val.toLocaleString()}`
        }
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: { width: '100%' },
          legend: { position: 'bottom' }
        }
      }],
      fill: { 
        opacity: 1,
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center'
      }
    };
  }

  /**
   * Initialize top products donut chart
   */
  private initTopProductsChart(): void {
    this.topProductsChartOptions = {
      series: [],
      chart: {
        type: 'donut',
        height: 350,
        toolbar: { show: false }
      },
      labels: [],
      plotOptions: {
        pie: {
          donut: {
            size: '55%',
            labels: {
              show: true,
                name: {
                show: true,
                // fontSize: '14px',
                // fontWeight: 600,
                color: '#374151'
              },
              value: {
                show: true,
                // fontSize: '20px',
                // fontWeight: 700,
                color: '#111827',
                formatter: (val: string) => {
                  const numValue = parseFloat(val);
                  if (!isNaN(numValue)) {
                    return this.formatCurrency(numValue);
                  }
                  return '₦0';
                }
              },
              total: {
                show: true,
                label: 'Total Revenue',
                formatter: (w: any) => {
                  const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                  if (total >= 1000000) {
                    return '₦' + (total / 1000000).toFixed(1) + 'M';
                  } else if (total >= 1000) {
                    return '₦' + (total / 1000).toFixed(1) + 'K';
                  } else {
                    return '₦' + total.toFixed(0);
                  }
                }
              }
            }
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number, opts: any) => {
          return opts.w.config.labels[opts.seriesIndex] + ': ' + val.toFixed(1) + '%';
        },
        style: {
          fontSize: '11px',
          fontWeight: 'normal'
        }
      },
      tooltip: {
        y: {
          formatter: (val: number) => `₦${val.toLocaleString()}`
        }
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: { width: '100%' },
          legend: { position: 'bottom' }
        }
      }],
      fill: {
        opacity: 1,
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center'
      },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']
    };
  }

  /**
   * Initialize branch sales line chart
   */
  private initBranchSalesChart(): void {
    this.branchSalesChartOptions = {
      series: [
        {
          name: 'Revenue',
          data: []
        }
      ],
      chart: {
        type: 'line',
        height: 350,
        toolbar: { show: false }
      },
      xaxis: {
        categories: [],
        labels: {
          style: {
            fontSize: '12px'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Revenue (₦)'
        },
        labels: {
          formatter: (val: number) => {
            if (val >= 1000000) {
              return '₦' + (val / 1000000).toFixed(1) + 'M';
            } else if (val >= 1000) {
              return '₦' + (val / 1000).toFixed(1) + 'K';
            } else {
              return '₦' + val.toFixed(0);
            }
          }
        }
      },
      dataLabels: { enabled: false },
      stroke: { 
        width: 3,
        curve: 'smooth'
      },
      grid: { borderColor: '#e6e6e6' },
      tooltip: {
        y: {
          formatter: (val: number) => `₦${val.toLocaleString()}`
        }
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
      legend: {
        position: 'top',
        horizontalAlign: 'right'
      },
      colors: ['#10b981']
    };
  }

  /**
   * Update charts from API response - FIXED: Branch Performance chart
   */
  private updateChartsFromResponse(response: any): void {
    console.log('Updating charts with response:', response);
    
  // 1. Update Bar Chart (Daily Revenue from breakdown) - FIXED: Dynamic date ranges
if (response.breakdown && response.breakdown.length > 0) {
  // Process breakdown data for the bar chart based on current filter
  const chartData = this.processDailyData(response.breakdown);
  
  this.barChartOptions.series = [{
    name: 'Daily Revenue',
    data: chartData.map(item => item.revenue)
  }];
  
  this.barChartOptions.xaxis = {
    categories: chartData.map(item => item.date),
    labels: {
      style: {
        fontSize: '11px'
      },
      rotate: this.currentFilter === 'month' ? -45 : 0 // Rotate labels for month view if needed
    }
  };
  
  // Adjust y-axis formatter based on data scale
  const maxRevenue = Math.max(...chartData.map(item => item.revenue));
  this.barChartOptions.yaxis = {
    labels: {
      formatter: (val: number) => {
        if (val >= 1000000) {
          return '₦' + (val / 1000000).toFixed(1) + 'M';
        } else if (val >= 1000) {
          return '₦' + (val / 1000).toFixed(1) + 'K';
        } else {
          return '₦' + val.toFixed(0);
        }
      }
    }
  };
  
  console.log('Bar chart data for filter "' + this.currentFilter + '":', {
    series: this.barChartOptions.series,
    categories: this.barChartOptions.xaxis?.categories,
    dataPoints: chartData.length
  });
} else {
  // Reset to empty if no data
  this.barChartOptions.series = [{
    name: 'Daily Revenue',
    data: []
  }];
  this.barChartOptions.xaxis = {
    categories: []
  };
}

    // 2. Update Pie Chart (Payment Methods)
    if (response.paymentMethodBreakdown && response.paymentMethodBreakdown.length > 0) {
      this.pieChartOptions.series = response.paymentMethodBreakdown.map((item: any) => item.revenue || 0);
      this.pieChartOptions.labels = response.paymentMethodBreakdown.map((item: any) => 
        this.formatPaymentMethod(item.paymentMethod)
      );
      
      console.log('Pie chart data:', {
        series: this.pieChartOptions.series,
        labels: this.pieChartOptions.labels
      });
    }
    // Fallback: Use top selling products if no payment breakdown
    else if (response.topSellingProducts && response.topSellingProducts.length > 0) {
      const topProducts = response.topSellingProducts.slice(0, 5);
      this.pieChartOptions.series = topProducts.map((item: any) => item.revenue || 0);
      this.pieChartOptions.labels = topProducts.map((item: any) => 
        item.product?.name?.substring(0, 20) || `Product ${item.product?.id || 'N/A'}`
      );
    } else {
      // Reset to empty if no data
      this.pieChartOptions.series = [];
      this.pieChartOptions.labels = [];
    }

    // 3. Update Top Products Donut Chart
    if (response.topSellingProducts && response.topSellingProducts.length > 0) {
      // Remove duplicate products by name
      const uniqueProducts = this.getUniqueTopProducts(response.topSellingProducts);
      const topProducts = uniqueProducts.slice(0, 10); // Top 10 unique products
      
      this.topProductsChartOptions.series = topProducts.map((item: any) => item.revenue || 0);
      this.topProductsChartOptions.labels = topProducts.map((item: any) => {
        const productName = item.product?.name || `Product ${item.product?.id || 'N/A'}`;
        return productName.length > 25 ? productName.substring(0, 25) + '...' : productName;
      });
      
      console.log('Top products donut chart data loaded:', {
        uniqueProducts: topProducts.length,
        totalRevenue: topProducts.reduce((sum: number, item: any) => sum + (item.revenue || 0), 0)
      });
    } else {
      // Reset to empty if no data
      this.topProductsChartOptions.series = [];
      this.topProductsChartOptions.labels = [];
    }

    // 4. Update Branch Revenue Line Chart - FIXED: Use this.branchSales which is populated in updateBranchSalesData()
    console.log('Branch sales data for chart:', this.branchSales);
 // 4. Update Branch Revenue Line Chart - FIXED: Using transformed branch data
if (this.branchSales && this.branchSales.length > 0) {
  const branchData = this.branchSales.slice(0, 10); // Top 10 branches by revenue
  
  this.branchSalesChartOptions.series = [{
    name: 'Revenue',
    data: branchData.map((item: any) => item.revenue || 0)
  }];
  
  this.branchSalesChartOptions.xaxis = {
    categories: branchData.map((item: any) => {
      const branchName = item.branchName || 'Unknown Branch';
      return branchName.length > 15 ? branchName.substring(0, 15) + '...' : branchName;
    })
  };
  
  console.log('Branch revenue chart data loaded:', {
    branches: branchData.length,
    totalRevenue: branchData.reduce((sum: number, item: any) => sum + (item.revenue || 0), 0),
    branchNames: branchData.map((item: any) => item.branchName),
    revenues: branchData.map((item: any) => item.revenue)
  });
} else {
  // Reset to empty if no data
  this.branchSalesChartOptions.series = [{
    name: 'Revenue',
    data: []
  }];
  this.branchSalesChartOptions.xaxis = {
    categories: []
  };
  console.log('No branch sales data available for chart');
}
  }

  /**
   * Get unique top products by removing duplicates
   */
  private getUniqueTopProducts(products: any[]): any[] {
    const productMap = new Map<string, any>();
    
    products.forEach((item: any) => {
      const productName = item.product?.name || `Product ${item.product?.id || 'N/A'}`;
      const productId = item.product?.id || productName;
      
      // If product already exists, sum the revenue
      if (productMap.has(productId)) {
        const existing = productMap.get(productId)!;
        existing.revenue = (existing.revenue || 0) + (item.revenue || 0);
      } else {
        productMap.set(productId, { ...item });
      }
    });
    
    // Convert back to array and sort by revenue (highest to lowest)
    return Array.from(productMap.values())
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  }/**
 * Process daily data from breakdown - FIXED: Dynamic date ranges based on filter
 */
private processDailyData(breakdown: any[]): any[] {
  if (!breakdown || breakdown.length === 0) {
    return [];
  }

  const dateMap = new Map<string, number>();
  
  breakdown.forEach(item => {
    if (item.date) {
      const dateStr = new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      const revenue = item.revenue || 0;
      
      if (dateMap.has(dateStr)) {
        dateMap.set(dateStr, dateMap.get(dateStr)! + revenue);
      } else {
        dateMap.set(dateStr, revenue);
      }
    }
  });
  
  // Convert to array
  let result = Array.from(dateMap.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Dynamically adjust the number of data points based on filter
  switch(this.currentFilter) {
    case 'today':
      // Show hourly data for today
      result = this.processHourlyData(breakdown);
      break;
    case 'week':
      // Show last 7 days
      result = result.slice(-7);
      break;
    case 'month':
      // Show last 30 days or specific month days
      result = this.processMonthlyData(breakdown);
      break;
    case 'year':
      // Show last 12 months
      result = this.processYearlyData(breakdown);
      break;
    case '30days':
    default:
      // Show last 30 days
      result = result.slice(-30);
      break;
  }
  
  return result;
}

/**
 * Process hourly data for today filter
 */
private processHourlyData(breakdown: any[]): any[] {
  const hourlyMap = new Map<string, number>();
  
  breakdown.forEach(item => {
    if (item.date) {
      const date = new Date(item.date);
      const hourStr = date.getHours().toString().padStart(2, '0') + ':00';
      const revenue = item.revenue || 0;
      
      if (hourlyMap.has(hourStr)) {
        hourlyMap.set(hourStr, hourlyMap.get(hourStr)! + revenue);
      } else {
        hourlyMap.set(hourStr, revenue);
      }
    }
  });
  
  // Get hours 0-23 and fill missing hours with 0
  const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0') + ':00');
  return hours.map(hour => ({
    date: hour,
    revenue: hourlyMap.get(hour) || 0
  }));
}

/**
 * Process monthly data for month filter
 */
private processMonthlyData(breakdown: any[]): any[] {
  const monthlyMap = new Map<string, number>();
  
  breakdown.forEach(item => {
    if (item.date) {
      const date = new Date(item.date);
      const monthStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      const revenue = item.revenue || 0;
      
      if (monthlyMap.has(monthStr)) {
        monthlyMap.set(monthStr, monthlyMap.get(monthStr)! + revenue);
      } else {
        monthlyMap.set(monthStr, revenue);
      }
    }
  });
  
  // Get all days of current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  const result = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    result.push({
      date: dateStr,
      revenue: monthlyMap.get(dateStr) || 0
    });
  }
  
  return result;
}

/**
 * Process yearly data for year filter
 */
private processYearlyData(breakdown: any[]): any[] {
  const yearlyMap = new Map<string, number>();
  
  breakdown.forEach(item => {
    if (item.date) {
      const date = new Date(item.date);
      const monthStr = date.toLocaleDateString('en-US', {
        month: 'short'
      });
      const revenue = item.revenue || 0;
      
      if (yearlyMap.has(monthStr)) {
        yearlyMap.set(monthStr, yearlyMap.get(monthStr)! + revenue);
      } else {
        yearlyMap.set(monthStr, revenue);
      }
    }
  });
  
  // Get last 12 months
  const months = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = date.toLocaleDateString('en-US', {
      month: 'short'
    });
    months.push({
      date: monthStr,
      revenue: yearlyMap.get(monthStr) || 0
    });
  }
  
  return months;
}

  /**
   * Format payment method for display
   */
  private formatPaymentMethod(method: string): string {
    if (!method) return 'Cash';
    
    const methodMap: { [key: string]: string } = {
      'CASH': 'Cash',
      'CARD': 'Card',
      'TRANSFER': 'Transfer',
      'POS': 'POS',
      'MOBILE_MONEY': 'Mobile Money',
      'CHEQUE': 'Cheque',
      'CREDIT': 'Credit',
      'DEBIT': 'Debit'
    };
    
    return methodMap[method.toUpperCase()] || method.replace(/_/g, ' ');
  }

  /**
   * Format currency for display
   */
  formatCurrency(value: number): string {
    if (isNaN(value)) value = 0;
    return new Intl.NumberFormat('en-NG', { 
      style: 'currency', 
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Get product name safely
   */
  getProductName(product: any): string {
    return product?.name || product?.productName || 'Unknown Product';
  }

  /**
   * Open transaction details modal
   */
  openDetails(tx: Transaction): void {
    this.selectedTransaction = tx;
    this.showDetailsModal = true;
  }

  /**
   * Open transaction from side modal in details modal
   */
  openTransactionInModal(tx: Transaction): void {
    this.selectedTransaction = tx;
    this.showDetailsModal = true;
    this.showAllTransactionsModal = false;
  }

  /**
   * Close transaction details modal
   */
  closeDetailsModal(): void {
    this.selectedTransaction = null;
    this.showDetailsModal = false;
  }

  /**
   * Open all transactions side modal
   */
  viewAllTransactions(): void {
    console.log('Opening all transactions modal for cashier:', this.userId);
    this.showAllTransactionsModal = true;
  }

  /**
   * Close all transactions side modal
   */
  closeAllTransactionsModal(): void {
    this.showAllTransactionsModal = false;
  }

  /**
   * Export all transactions
   */
  exportAllTransactions(): void {
    console.log('Exporting all transactions for cashier:', this.userId);
    alert(`Exporting ${this.allTransactions.length} transactions for ${this.userInfo.name}`);
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    if (!this.userRoles.length) return false;

    switch(permission) {
      case 'export':
        return this.userRoles.some(role => 
          role.includes('ADMIN') || role.includes('MANAGER')
        );
      case 'generate_reports':
        return this.userRoles.some(role => 
          role.includes('ADMIN') || role.includes('MANAGER') || role.includes('SUPERVISOR')
        );
      case 'view_all_transactions':
        return this.userRoles.some(role => 
          role.includes('ADMIN') || role.includes('MANAGER')
        );
      default:
        return true;
    }
  }

  /**
   * Export data functionality
   */
  exportData(): void {
    console.log('Exporting data for cashier:', this.userId);
    alert(`Exporting data for ${this.userInfo.name}`);
  }

  /**
   * Generate new report (kept for compatibility but renamed to filter)
   */
  generateNewReport(): void {
    this.loadSalesData();
  }

  /**
   * Refresh dashboard
   */
  refreshDashboard(): void {
    this.loadSalesData();
  }
}