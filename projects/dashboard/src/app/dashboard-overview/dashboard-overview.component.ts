import { Component, OnInit } from '@angular/core';
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
  ApexTooltip
} from 'ng-apexcharts';

export type BarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
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
  tooltip?: ApexTooltip;
  fill?: ApexFill;
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
  customer: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Refunded';
}

// Define the API response structure
interface SalesPerformanceResponse {
  totalSales?: number;
  transactionCount?: number;
  refunds?: number;
  revenue?: number;
  monthlyData?: any[];
  dailyData?: any[];
  categoryData?: any[];
  // Add any other properties that might come from your API
  [key: string]: any; // Allow any additional properties
}

@Component({
  selector: 'dashboard-overview',
  templateUrl: './dashboard-overview.component.html',
})
export class DashboardOverviewComponent implements OnInit {
  // Chart option objects
  public barChartOptions: Partial<BarChartOptions> = {};
  public pieChartOptions: Partial<PieChartOptions> = {};

  // Metrics (will be populated from API)
  public metrics = {
    totalSales: 0,
    transactions: 0,
    refunds: 0,
    revenue: 0
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

  // Session storage data
  public loggedInUser: User | null = null;
  public userId: number | null = null;
  public userFullName: string = '';
  public userRoles: string[] = [];
  public userEmail: string = '';
  public branchInfo: any = null;

  // Modal state
  public showDetailsModal = false;
  public selectedTransaction: Transaction | null = null;

  // Loading states
  public isLoading: boolean = true;
  public salesReport: SalesPerformanceResponse | null = null;
  public reportError: string | null = null;
  public hasRealData: boolean = false;

  // Current date for display
  public today = new Date();

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
    this.initChartsWithEmptyData();
    this.loadSalesData();
  }

  /**
   * Computed property for transaction total
   */
  get totalTransactionAmount(): number {
    return this.recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  /**
   * Load user information from sessionStorage
   */
  private loadUserFromSessionStorage(): void {
    try {
      // Try to get user data from multiple possible sources in sessionStorage
      const userRegData = sessionStorage.getItem('userRegData');
      const userInfoData = sessionStorage.getItem('userInfo');
      
      if (userRegData) {
        this.loggedInUser = JSON.parse(userRegData);
      } else if (userInfoData) {
        this.loggedInUser = JSON.parse(userInfoData);
      }

      // Extract individual values
      this.userId = this.loggedInUser?.id || 
                   parseInt(sessionStorage.getItem('userid') || '0') || null;
      
      this.userFullName = this.loggedInUser?.fullname || 
                         sessionStorage.getItem('fullname') || 
                         'User Name';
      
      this.userEmail = this.loggedInUser?.email || 
                      sessionStorage.getItem('email') || 
                      '';

      // Handle roles
      const roles = this.loggedInUser?.roles || 
                   sessionStorage.getItem('role') || 
                   '';
      
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
        id: this.userId,
        name: this.userFullName,
        roles: this.userRoles,
        email: this.userEmail
      });

    } catch (error) {
      console.error('Error loading user from sessionStorage:', error);
    }
  }

  /**
   * Update user info object with session data
   */
  private updateUserInfoFromSession(): void {
    this.userInfo.name = this.userFullName;

    if (this.userRoles.length > 0) {
      // Map role to display name
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

    // Generate employee ID from user ID
    if (this.userId) {
      this.userInfo.employeeId = `EMP${this.userId.toString().padStart(5, '0')}`;
    } else {
      this.userInfo.employeeId = 'EMP00000';
    }

    // Update department if branch info is available
    if (this.branchInfo?.branchName) {
      this.userInfo.department = `${this.userInfo.role} - ${this.branchInfo.branchName}`;
    } else {
      this.userInfo.department = this.userInfo.role;
    }
  }

  /**
   * Load sales data for the logged-in user - CHANGED TO PUBLIC
   */
  public loadSalesData(): void {
    if (!this.userId) {
      console.warn('Cannot load sales data: User ID not available');
      this.reportError = 'Please log in to view sales data';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.reportError = null;

    // Get date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Build payload according to your Swagger API
    const payload = {
      startDate: startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      endDate: endDate.toISOString().split('T')[0],
      cashierIds: [this.userId], // Filters by cashier
      branchIds: this.branchInfo?.branchId ? [this.branchInfo.branchId] : [],
      paymentMethods: [], // Empty array = all payment methods
      groupBy: 'date'
    };

    console.log('Fetching sales data for cashier:', this.userId, 'Payload:', payload);

    // Call the dashboard service
    this.dashboardService.salesPerformanceReport(payload).subscribe({
      next: (response: SalesPerformanceResponse) => {
        console.log('Sales data received:', response);
        this.salesReport = response;
        
        // Check if we have real data
        this.hasRealData = this.checkIfHasRealData(response);
        
        // Update UI with real data
        if (this.hasRealData) {
          this.updateMetricsFromResponse(response);
          this.updateChartsFromResponse(response);
          this.updateRecentTransactionsFromResponse(response as any);
        } else {
          // Keep empty charts
          this.resetMetricsToZero();
          this.resetChartsToEmpty();
          this.recentTransactions = [];
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading sales data:', error);
        
        // Show error message
        this.reportError = `Failed to load sales data: ${error.message || 'Please try again later'}`;
        this.isLoading = false;
        this.hasRealData = false;
        
        // Reset to empty state
        this.resetMetricsToZero();
        this.resetChartsToEmpty();
        this.recentTransactions = [];
      }
    });
  }

  /**
   * Check if response has real data - FIXED TYPE ISSUE
   */
  private checkIfHasRealData(response: SalesPerformanceResponse): boolean {
    // Check if any metric has non-zero value
    const hasSales = (response.totalSales || 0) > 0;
    const hasTransactions = (response.transactionCount || 0) > 0;
    const hasRevenue = (response.revenue || 0) > 0;
    
    // Check if we have chart data - use optional chaining with fallback
    const monthlyDataLength = response.monthlyData?.length || 0;
    const dailyDataLength = response.dailyData?.length || 0;
    const categoryDataLength = response.categoryData?.length || 0;
    
    const hasChartData = monthlyDataLength > 0 || dailyDataLength > 0 || categoryDataLength > 0;
    
    return hasSales || hasTransactions || hasRevenue || hasChartData;
  }

  /**
   * Reset metrics to zero
   */
  private resetMetricsToZero(): void {
    this.metrics = {
      totalSales: 0,
      transactions: 0,
      refunds: 0,
      revenue: 0
    };
  }

  /**
   * Reset charts to empty state
   */
  private resetChartsToEmpty(): void {
    this.barChartOptions.series = [{ name: 'Sales', data: [] }];
    this.barChartOptions.xaxis = { categories: [] };
    this.pieChartOptions.series = [];
    this.pieChartOptions.labels = [];
  }

  /**
   * Update metrics from API response
   */
  private updateMetricsFromResponse(response: SalesPerformanceResponse): void {
    if (!response) {
      console.warn('No response data received');
      return;
    }

    // Adjust these based on your actual API response structure
    if (response.totalSales !== undefined) {
      this.metrics.totalSales = response.totalSales;
    }
    
    if (response.transactionCount !== undefined) {
      this.metrics.transactions = response.transactionCount;
    }
    
    if (response.refunds !== undefined) {
      this.metrics.refunds = response.refunds;
    }
    
    if (response.revenue !== undefined) {
      this.metrics.revenue = response.revenue;
    }
  }

  /**
   * Update recent transactions from API response
   */
  private updateRecentTransactionsFromResponse(response: any): void {
    // Check various possible property names for transactions
    let transactions: any[] = [];
    
    if (response.recentTransactions && Array.isArray(response.recentTransactions)) {
      transactions = response.recentTransactions;
    } else if (response.recentSales && Array.isArray(response.recentSales)) {
      transactions = response.recentSales;
    } else if (response.transactions && Array.isArray(response.transactions)) {
      transactions = response.transactions;
    } else if (response.data && Array.isArray(response.data)) {
      transactions = response.data;
    }
    
    // If no transactions found in response, keep empty array
    if (transactions.length === 0) {
      this.recentTransactions = [];
      return;
    }
    
    this.recentTransactions = transactions.slice(0, 5).map((tx: any, index: number) => ({
      id: tx.transactionId || tx.id || `TXN-${1000 + index}`,
      date: tx.transactionDate ? new Date(tx.transactionDate).toISOString().split('T')[0] : 
            tx.date || new Date().toISOString().split('T')[0],
      customer: tx.customerName || tx.customer || 'Anonymous Customer',
      amount: tx.totalAmount || tx.amount || 0,
      status: this.getTransactionStatus(tx.status || 'Completed')
    }));
  }

  /**
   * Get transaction status with type safety
   */
  private getTransactionStatus(status: string): 'Completed' | 'Pending' | 'Refunded' {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('refund')) {
      return 'Refunded';
    } else if (statusLower.includes('pending')) {
      return 'Pending';
    }
    return 'Completed';
  }

  /**
   * Initialize charts with empty data
   */
  private initChartsWithEmptyData(): void {
    this.initBarChart();
    this.initPieChart();
  }

  /**
   * Initialize bar chart with empty data
   */
  private initBarChart() {
    this.barChartOptions = {
      series: [
        {
          name: 'Sales',
          data: [] // Start empty
        }
      ],
      chart: {
        type: 'bar',
        height: 320,
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      xaxis: {
        categories: [] // Start empty
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
      fill: { 
        opacity: 1,
        colors: ['#3b82f6']
      }
    };
  }

  /**
   * Initialize pie chart with empty data
   */
  private initPieChart() {
    this.pieChartOptions = {
      series: [], // Start empty
      chart: {
        type: 'pie',
        height: 320
      },
      labels: [], // Start empty
      tooltip: {
        y: {
          formatter: (val: number) => `₦${val.toLocaleString()}`
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
      fill: { 
        opacity: 1,
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
      }
    };
  }

  /**
   * Update charts from API response
   */
  private updateChartsFromResponse(response: SalesPerformanceResponse): void {
    if (!response) return;

    // Update bar chart
    if (response.monthlyData && Array.isArray(response.monthlyData)) {
      const monthlyData = response.monthlyData;
      this.barChartOptions.series = [{
        name: 'Sales',
        data: monthlyData.map((item: any) => item.sales || item.amount || item.value || 0)
      }];
      
      if (monthlyData.length > 0) {
        this.barChartOptions.xaxis = {
          categories: monthlyData.map((item: any) => 
            item.month || item.date || item.label || ''
          )
        };
      }
    } else if (response.dailyData && Array.isArray(response.dailyData)) {
      // If we have daily data, use last 7 days
      const dailyData = response.dailyData.slice(-7); // Last 7 days
      this.barChartOptions.series = [{
        name: 'Sales',
        data: dailyData.map((item: any) => item.sales || 0)
      }];
      this.barChartOptions.xaxis = {
        categories: dailyData.map((item: any) => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-US', { weekday: 'short' });
        })
      };
    }

    // Update pie chart
    if (response.categoryData && Array.isArray(response.categoryData)) {
      const categoryData = response.categoryData;
      this.pieChartOptions.series = categoryData.map((item: any) => 
        item.value || item.amount || item.sales || 0
      );
      this.pieChartOptions.labels = categoryData.map((item: any) => 
        item.category || item.name || item.label || 'Unknown'
      );
    }
  }

  /**
   * Format currency for display
   */
  formatCurrency(value: number) {
    return new Intl.NumberFormat('en-NG', { 
      style: 'currency', 
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Open transaction details modal
   */
  openDetails(tx: Transaction) {
    this.selectedTransaction = tx;
    this.showDetailsModal = true;
  }

  /**
   * Close transaction details modal
   */
  closeDetailsModal() {
    this.selectedTransaction = null;
    this.showDetailsModal = false;
  }

  /**
   * Get user avatar URL
   */
  getUserAvatar(): string {
    return 'https://cdn-icons-png.flaticon.com/128/1814/1814249.png';
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
    console.log('Exporting data for user:', this.userId);
    alert(`Exporting data for ${this.userInfo.name}`);
  }

  /**
   * Generate new report
   */
  generateNewReport(): void {
    console.log('Generating new report');
    this.loadSalesData();
  }

  /**
   * View all transactions
   */
  viewAllTransactions(): void {
    console.log('Viewing all transactions for user:', this.userId);
    alert(`This would show all transactions for ${this.userInfo.name}`);
  }

  /**
   * Refresh dashboard
   */
  refreshDashboard(): void {
    this.loadSalesData();
  }

  /**
   * Check if session data is available
   */
  isUserLoggedIn(): boolean {
    return !!this.userId && !!this.userFullName;
  }

  /**
   * Calculate total of all transactions (alternative method)
   */
  calculateTotal(): number {
    return this.totalTransactionAmount;
  }

  /**
   * Format role for display
   */
  formatRoleDisplay(role: string): string {
    return role.replace('ROLE_', '').replace(/_/g, ' ');
  }

  /**
   * Get chart series data length safely
   */
  getBarChartDataLength(): number {
    return this.barChartOptions.series?.[0]?.data?.length || 0;
  }

  /**
   * Get pie chart series length safely
   */
  getPieChartSeriesLength(): number {
    return this.pieChartOptions.series?.length || 0;
  }

  /**
   * Check if data is loaded
   */
  isDataLoaded(): boolean {
    return !this.isLoading;
  }
}