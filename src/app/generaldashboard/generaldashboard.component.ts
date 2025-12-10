import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../ui/services/dashboard.service';
import { SalesPerformanceResponse } from '../ui/models/interface/dashboard.models';
import { formatISO, subDays } from 'date-fns';
import { SideModalComponent } from '../ui/sharedComponent/view/side-modal/side-modal.component';

@Component({
  selector: 'app-generaldashboard',
  templateUrl: './generaldashboard.component.html',
  styleUrls: ['./generaldashboard.component.scss']
})
export class GeneraldashboardComponent implements OnInit {

  // User information extracted from sessionStorage
  userInfo: any = {
    name: '',
    fullname: '',
    role: '',
    roles: [],
    department: '',
    employeeId: '',
    bankName: '',
    daysWorked: 0,
    email: '',
    industry: '',
    branchId: null,
    branchName: '',
    phoneNumber: '',
    companyName: '',
    accountId: '',
    address: '',
    city: '',
    country: '',
    state: '',
    postalCode: '',
    bio: '',
    currency: '',
    language: '',
    timeZone: '',
    username: '',
    gender: '',
    profileImage: '',
    clientType: '',
    domain: ''
  };
  
  userId: number | null = null;
  selectedModule: string = 'General';

  // sales report data
  salesReport: SalesPerformanceResponse | null = null;
  reportLoading = false;
  reportError: string | null = null;

  // UI state for side modals
  showPayslipModal = false;
  showTaskModal = false;
  showAttendanceModal = false;
  selectedTask: any = null;

  // notifications, tasks etc
  notifications: string[] = [
    'System maintenance scheduled for Friday 8 PM.',
    'Staff meeting on Tuesday morning.',
    'Your password expires in 3 days.'
  ];
  unreadNotifications = 0;
  showNotifications = false;
  newTask: string = '';

  // tasks
  tasks: Array<{ id: number; title: string; time?: string; description?: string; status?: string }> = [];

  // payslips + attendance placeholders
  payslips: Array<{ month: string; status: string }> = [];
  attendance = { lastClockIn: '', status: '' };
  events: Array<{ title: string; date: string }> = [];

  // Chart data
  pieChart: any = {
    series: [44, 55, 13, 43, 22],
    chart: {
      width: 380,
      type: "pie"
    },
    labels: ["Team A", "Team B", "Team C", "Team D", "Team E"],
    colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'],
    legend: {
      position: "bottom"
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: "bottom"
        }
      }
    }]
  };

  lineChart: any = {
    series: [{
      name: "Desktops",
      data: [10, 41, 35, 51, 49, 62, 69, 91, 148]
    }],
    chart: {
      height: 350,
      type: "line",
      zoom: {
        enabled: false
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: "straight"
    },
    grid: {
      row: {
        colors: ["#f3f3f3", "transparent"],
        opacity: 0.5
      }
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
    },
    colors: ['#008FFB'],
    legend: {
      position: "top"
    }
  };

  pieChartSummary = "Module activity distribution across departments";
  lineChartSummary = "Monthly performance trends for the current year";

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadUserInfoFromSessionStorage();
    this.loadPlaceholders();
    
    if (this.userId) {
      this.loadSalesReportForUser();
      this.loadTasksForUser();
    }
  }

  /**
   * Extract user information from sessionStorage using userprimaryinfodata
   */
  loadUserInfoFromSessionStorage() {
    console.log('Loading user info from sessionStorage...');
    
    // First, check for userprimaryinfodata as requested by supervisor
    const userPrimaryInfoDataStr = sessionStorage.getItem('userprimaryinfodata');
    
    console.log('userprimaryinfodata from session:', userPrimaryInfoDataStr);
    
    // Try to get data from userprimaryinfodata first
    if (userPrimaryInfoDataStr) {
      try {
        const userPrimaryData = JSON.parse(userPrimaryInfoDataStr);
        console.log('Parsed userprimaryinfodata:', userPrimaryData);
        
        // Extract data based on the structure you provided
        this.userInfo = {
          // Personal Info
          id: userPrimaryData.id || 1,
          fullname: userPrimaryData.fullname || '',
          name: userPrimaryData.fullname || '',
          email: userPrimaryData.email || '',
          phoneNumber: userPrimaryData.phoneNumber || '',
          username: userPrimaryData.username || userPrimaryData.user?.username || '',
          gender: userPrimaryData.gender || '',
          profileImage: userPrimaryData.profileImage || '',
          
          // Company Info
          companyName: userPrimaryData.companyName || '',
          accountId: userPrimaryData.accountId || '',
          clientType: userPrimaryData.clientType || '',
          industry: userPrimaryData.industry || '',
          
          // Location Info
          address: userPrimaryData.address || '',
          city: userPrimaryData.city || '',
          state: userPrimaryData.state || '',
          country: userPrimaryData.country || '',
          postalCode: userPrimaryData.postalCode || '',
          
          // Additional Info
          bio: userPrimaryData.bio || '',
          currency: userPrimaryData.currency || 'NGN',
          language: userPrimaryData.language || 'English',
          timeZone: userPrimaryData.timeZone || 'Africa/Lagos',
          domain: userPrimaryData.domain || '',
          
          // Derived fields
          employeeId: userPrimaryData.accountId ? `EMP-${userPrimaryData.accountId}` : 
                     (userPrimaryData.id ? `EMP-${userPrimaryData.id}` : 'N/A'),
          role: this.extractUserRole(userPrimaryData),
          roles: this.extractUserRoles(userPrimaryData),
          department: this.getDepartmentFromUserData(userPrimaryData),
          bankName: 'Standard Bank', // Default or from user data if available
          daysWorked: this.calculateDaysWorked(),
          branchId: null,
          branchName: ''
        };
        
        this.userId = this.userInfo.id;
        
      } catch (error) {
        console.error('Error parsing userprimaryinfodata:', error);
        // Fallback to existing method if userprimaryinfodata fails
        this.loadFromOtherSessionSources();
      }
    } else {
      console.warn('userprimaryinfodata not found in session storage');
      // Fallback to existing method
      this.loadFromOtherSessionSources();
    }

    // Load branch info if available
    const branchInfoStr = sessionStorage.getItem('userBranchInfoRegData');
    if (branchInfoStr) {
      try {
        const branchInfo = JSON.parse(branchInfoStr);
        this.userInfo.branchId = branchInfo.branchId;
        this.userInfo.branchName = branchInfo.branchName;
        if (branchInfo.department && !this.userInfo.department) {
          this.userInfo.department = branchInfo.department;
        }
      } catch (error) {
        console.error('Error parsing branch info:', error);
      }
    }

    console.log('Final user info loaded from userprimaryinfodata:', this.userInfo);
    console.log('User ID:', this.userId);
    console.log('User Fullname:', this.userInfo.fullname);
    console.log('User Email:', this.userInfo.email);
    console.log('User Company:', this.userInfo.companyName);
  }

  /**
   * Fallback method to load from other session storage sources
   */
  loadFromOtherSessionSources() {
    console.log('Falling back to other session storage sources...');
    
    const userRegDataStr = sessionStorage.getItem('userRegData');
    const userInfoStr = sessionStorage.getItem('userInfo');
    const fullnameStr = sessionStorage.getItem('fullname');
    const emailStr = sessionStorage.getItem('email');
    const userIdStr = sessionStorage.getItem('userid');
    const roleStr = sessionStorage.getItem('role');
    
    // Try to get data from userRegData first
    if (userRegDataStr) {
      try {
        const userRegData = JSON.parse(userRegDataStr);
        this.userInfo = {
          name: userRegData.fullname || userRegData.name || '',
          fullname: userRegData.fullname || '',
          email: userRegData.email || userRegData.user?.email || '',
          phoneNumber: userRegData.phoneNumber || '',
          companyName: userRegData.companyName || '',
          accountId: userRegData.accountId || '',
          industry: userRegData.industry || '',
          id: userRegData.id || userRegData.user?.id,
          username: userRegData.username || userRegData.user?.username || '',
          employeeId: userRegData.accountId ? `EMP-${userRegData.accountId}` : 
                     (userRegData.id ? `EMP-${userRegData.id}` : 'N/A'),
          role: roleStr || userRegData.roles || userRegData.user?.role || 'User',
          roles: Array.isArray(userRegData.roles) ? userRegData.roles : 
                (typeof userRegData.roles === 'string' ? [userRegData.roles] : []),
          department: this.getDepartmentFromRole(),
          bankName: 'Standard Bank',
          daysWorked: this.calculateDaysWorked(),
          address: userRegData.address || '',
          city: userRegData.city || '',
          country: userRegData.country || '',
          clientType: userRegData.clientType || ''
        };
        
        this.userId = this.userInfo.id;
        
      } catch (error) {
        console.error('Error parsing userRegData:', error);
      }
    }
    
    // If userInfo exists separately, merge it
    if (userInfoStr) {
      try {
        const parsedUserInfo = JSON.parse(userInfoStr);
        this.userInfo = { ...this.userInfo, ...parsedUserInfo };
      } catch (error) {
        console.error('Error parsing userInfo:', error);
      }
    }
    
    // Fallback to individual session items
    if (!this.userInfo.fullname && fullnameStr) {
      this.userInfo.fullname = fullnameStr;
      this.userInfo.name = fullnameStr;
    }
    
    if (!this.userInfo.email && emailStr) {
      this.userInfo.email = emailStr;
    }
    
    if (!this.userId && userIdStr) {
      this.userId = parseInt(userIdStr, 10);
      this.userInfo.id = this.userId;
      if (!this.userInfo.employeeId) {
        this.userInfo.employeeId = `EMP-${this.userId}`;
      }
    }
    
    if (!this.userInfo.role && roleStr) {
      this.userInfo.role = roleStr;
      if (!this.userInfo.roles.length && roleStr) {
        this.userInfo.roles = [roleStr];
      }
    }
  }

  /**
   * Extract user role from primary info data
   */
  private extractUserRole(userData: any): string {
    // Try to get role from different possible locations
    const roleSources = [
      userData.role,
      userData.user?.role,
      sessionStorage.getItem('role'),
      'User' // Default
    ];
    
    for (const source of roleSources) {
      if (source) return source;
    }
    
    return 'User';
  }

  /**
   * Extract user roles from primary info data
   */
  private extractUserRoles(userData: any): string[] {
    if (userData.roles && Array.isArray(userData.roles)) {
      return userData.roles;
    }
    
    if (userData.role) {
      return [userData.role];
    }
    
    const roleFromSession = sessionStorage.getItem('role');
    if (roleFromSession) {
      return [roleFromSession];
    }
    
    return [];
  }

  /**
   * Get department from user data
   */
  private getDepartmentFromUserData(userData: any): string {
    // Use industry to determine department
    const industry = (userData.industry || '').toLowerCase();
    
    if (industry.includes('pharmacy')) return 'Pharmacy';
    if (industry.includes('food') || industry.includes('beverage')) return 'Food & Beverage';
    if (industry.includes('retail')) return 'Retail';
    if (industry.includes('hospital')) return 'Healthcare';
    if (industry.includes('technology')) return 'Technology';
    if (industry.includes('finance')) return 'Finance';
    
    // Use client type
    const clientType = (userData.clientType || '').toLowerCase();
    if (clientType.includes('company')) return 'Corporate';
    if (clientType.includes('individual')) return 'Individual';
    
    return 'General Operations';
  }

  /**
   * Debug method to check all sessionStorage items
   */
  debugSessionStorage() {
    console.log('=== SessionStorage Debug ===');
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key || '');
      console.log(`${key}: ${value}`);
    }
    console.log('=== End Debug ===');
  }

  loadPlaceholders() {
    this.unreadNotifications = this.notifications.length;

    this.tasks = [
      { id: 1, title: 'Review daily sales report', time: '09:00', description: 'Check and validate daily sales figures', status: 'Pending' },
      { id: 2, title: 'Verify staff attendance', time: '10:30', description: 'Review attendance records for the week', status: 'Pending' },
      { id: 3, title: 'Prepare monthly report', time: '14:00', description: 'Compile data for monthly performance review', status: 'In Progress' }
    ];

    this.payslips = [
      { month: 'January 2025', status: 'Available' },
      { month: 'February 2025', status: 'Available' },
      { month: 'March 2025', status: 'Pending' }
    ];

    this.attendance = { lastClockIn: '2025-03-01 08:45 AM', status: 'Present' };

    this.events = [
      { title: 'Quarterly Review Meeting', date: 'March 10, 2025' },
      { title: 'Team Building Event', date: 'March 15, 2025' },
      { title: 'Monthly Audit', date: 'March 25, 2025' }
    ];
  }

  private getDepartmentFromRole(): string {
    const role = (this.userInfo.role || '').toLowerCase();
    const industry = (this.userInfo.industry || '').toLowerCase();
    
    // Use industry to determine department if available
    if (industry.includes('pharmacy')) return 'Pharmacy';
    if (industry.includes('food') || industry.includes('beverage')) return 'Food & Beverage';
    if (industry.includes('retail')) return 'Retail';
    if (industry.includes('hospital')) return 'Healthcare';
    
    // Fallback to role-based department
    if (role.includes('admin')) return 'Administration';
    if (role.includes('finance')) return 'Finance';
    if (role.includes('sales')) return 'Sales';
    if (role.includes('hr')) return 'Human Resources';
    if (role.includes('it')) return 'Information Technology';
    
    return 'General Operations';
  }

  private calculateDaysWorked(): number {
    // Simple calculation - you can replace with actual logic
    const joinDate = new Date('2024-01-01');
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - joinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.min(diffDays, 365);
  }

  private buildDefaultReportPayload() {
    const branchIds = this.userInfo.branchId ? [this.userInfo.branchId] : [];
    
    const endDate = new Date();
    const startDate = subDays(endDate, 7);
    
    return {
      startDate: formatISO(startDate),
      endDate: formatISO(endDate),
      branchIds: branchIds,
      cashierIds: this.userId ? [this.userId] : [],
      paymentMethods: [],
      groupBy: 'date'
    };
  }

  loadSalesReportForUser() {
    if (!this.userId) {
      console.warn('No user ID available. Cannot load sales report.');
      return;
    }
    
    this.reportLoading = true;
    this.reportError = null;

    const body = this.buildDefaultReportPayload();
    this.dashboardService.salesPerformanceReport(body).subscribe({
      next: (res) => {
        this.salesReport = res;
        this.reportLoading = false;
        
        if (this.isAdmin) {
          console.log('Admin user - showing full report');
        } else if (this.isCashier) {
          console.log('Cashier user - showing limited report');
        }
      },
      error: (err) => {
        console.error('Sales report error', err);
        this.reportError = err?.message || 'Failed to load sales report';
        this.reportLoading = false;
      }
    });
  }

  // Notification methods
  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.unreadNotifications = 0;
    }
  }

  // Task methods
  addTask(title: string) {
    if (!title.trim()) return;
    
    const nextId = this.tasks.length ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1;
    this.tasks.push({ 
      id: nextId, 
      title: title, 
      time: '09:00', 
      description: '', 
      status: 'Pending' 
    });
    this.newTask = '';
  }

  removeTask(index: number) {
    this.tasks.splice(index, 1);
  }

  removeTaskById(id: number) {
    this.tasks = this.tasks.filter(t => t.id !== id);
  }

  loadTasksForUser() {
    if (this.userId == null) return;
    // TODO: Implement backend call to fetch tasks for user
  }

  // Modal methods
  openTaskModal(task: any) {
    this.selectedTask = { ...task };
    this.showTaskModal = true;
  }

  closeTaskModal(save = false) {
    if (save && this.selectedTask) {
      const idx = this.tasks.findIndex(t => t.id === this.selectedTask.id);
      if (idx >= 0) this.tasks[idx] = { ...this.selectedTask };
    }
    this.showTaskModal = false;
    this.selectedTask = null;
  }

  openPayslipModal() { 
    this.showPayslipModal = true; 
  }

  closePayslipModal() { 
    this.showPayslipModal = false; 
  }

  openAttendanceModal() { 
    this.showAttendanceModal = true; 
  }

  closeAttendanceModal() { 
    this.showAttendanceModal = false; 
  }

  // Role checking methods
  hasRole(role: string): boolean {
    if (!this.userInfo.roles || !this.userInfo.roles.length) {
      // Check if role string contains the role
      const userRole = (this.userInfo.role || '').toLowerCase();
      const searchRole = role.toLowerCase();
      return userRole.includes(searchRole);
    }
    
    const searchRole = role.toLowerCase();
    return this.userInfo.roles.some((r: string) => 
      r.toLowerCase().includes(searchRole)
    );
  }

  get isAdmin(): boolean {
    return this.hasRole('admin') || this.hasRole('role_admin');
  }

  get isCashier(): boolean {
    return this.hasRole('cashier') || this.hasRole('role_cashier');
  }
}