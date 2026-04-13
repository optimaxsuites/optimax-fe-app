import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../ui/services/dashboard.service';
import { SalesPerformanceResponse } from '../ui/models/interface/dashboard.models';
import { formatISO, subDays } from 'date-fns';
import { SideModalComponent } from '../ui/sharedComponent/view/side-modal/side-modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-generaldashboard',
  templateUrl: './generaldashboard.component.html',
  styleUrls: ['./generaldashboard.component.scss'],
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
    domain: '',
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
    'Your password expires in 3 days.',
  ];
  unreadNotifications = 0;
  showNotifications = false;
  newTask: string = '';

  // tasks
  tasks: Array<{
    id: number;
    title: string;
    time?: string;
    description?: string;
    status?: string;
  }> = [];

  // payslips + attendance placeholders
  payslips: Array<{ month: string; status: string }> = [];
  attendance = { lastClockIn: '', status: '' };
  events: Array<{
    title: string;
    date: string;
    color?: string;
    iconColor?: string;
  }> = [];

  // ===== FEED DATA =====
  newPostText: string = '';
  feedPosts: Array<{
    id: number;
    author: string;
    authorInitials: string;
    avatarColor: string;
    role: string;
    timeAgo: string;
    content: string;
    image?: string;
    likes: number;
    shares: number;
    liked: boolean;
    showComments: boolean;
    newCommentText: string;
    commentList: Array<{
      id: number;
      author: string;
      authorInitials: string;
      avatarColor: string;
      text: string;
      timeAgo: string;
    }>;
  }> = [];

  // ===== AI CHATBOT DATA =====
  newChatMessage: string = '';
  aiTyping: boolean = false;
  chatMessages: Array<{
    sender: 'ai' | 'user';
    text: string;
    time: string;
  }> = [];
  aiSuggestions: string[] = [
    'Summarize tasks',
    'Draft email',
    'Check schedule',
  ];

  // AI responses pool for fake responses
  private aiResponsePool: string[] = [
    'Sure! I can help you with that. Let me pull up the relevant information for you.',
    'You have 3 priority tasks remaining today: a sales report review, staff attendance check, and a monthly report. You also have 3 meetings later this month.',
    "Your attendance record for this week looks great — you've been present all 3 days so far.",
    "I've drafted a quick email summary. Would you like me to adjust the tone or add any details?",
    'Based on your schedule, your next event is the Quarterly Review Meeting on March 10, 2025.',
    'I noticed your monthly report task is still In Progress. Would you like me to set a reminder for it?',
    'Great question! I recommend reviewing the daily sales figures before the 2 PM deadline.',
    'Your payslips for January and February are available. March is still pending processing.',
  ];

  // Chart data (unchanged)
  pieChart: any = {
    series: [44, 55, 13, 43, 22],
    chart: { width: 380, type: 'pie' },
    labels: ['Team A', 'Team B', 'Team C', 'Team D', 'Team E'],
    colors: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'],
    legend: { position: 'bottom' },
    responsive: [
      {
        breakpoint: 480,
        options: { chart: { width: 200 }, legend: { position: 'bottom' } },
      },
    ],
  };

  lineChart: any = {
    series: [{ name: 'Desktops', data: [10, 41, 35, 51, 49, 62, 69, 91, 148] }],
    chart: { height: 350, type: 'line', zoom: { enabled: false } },
    dataLabels: { enabled: false },
    stroke: { curve: 'straight' },
    grid: { row: { colors: ['#f3f3f3', 'transparent'], opacity: 0.5 } },
    xaxis: {
      categories: [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
      ],
    },
    colors: ['#008FFB'],
    legend: { position: 'top' },
  };

  pieChartSummary = 'Module activity distribution across departments';
  lineChartSummary = 'Monthly performance trends for the current year';

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.loadUserInfoFromSessionStorage();
    this.loadPlaceholders();
    this.loadFeedPosts();
    this.loadInitialChatMessages();

    if (this.userId) {
      this.loadSalesReportForUser();
      this.loadTasksForUser();
    }
  }

  // ===== FEED METHODS =====

  loadFeedPosts() {
    this.feedPosts = [
      {
        id: 1,
        author: 'Oyelere Olatoye',
        authorInitials: 'OO',
        avatarColor: '#6366f1',
        role: 'HR Manager',
        timeAgo: '2 hours ago',
        content:
          'Exciting news! We are happy to announce the new health benefit packages available for all employees starting next month. Check your internal portal for details.',
        likes: 24,
        shares: 8,
        liked: false,
        showComments: false,
        newCommentText: '',
        commentList: [
          {
            id: 1,
            author: 'Ogah Steve',
            authorInitials: 'OS',
            avatarColor: '#f59e0b',
            text: 'This is great news! Thanks for sharing, Toye.',
            timeAgo: '1 hour ago',
          },
          {
            id: 2,
            author: 'Michael Okafor',
            authorInitials: 'MO',
            avatarColor: '#10b981',
            text: 'Looking forward to reviewing the new packages!',
            timeAgo: '45 min ago',
          },
        ],
      },
      {
        id: 2,
        author: 'Akin Johnson',
        authorInitials: 'AJ',
        avatarColor: '#f59e0b',
        role: 'Product Lead',
        timeAgo: '5 hours ago',
        content:
          'Great session today on the Q3 roadmap! Thanks to everyone for the valuable feedback. 🚀',
        image: 'assets/images/meeting-placeholder.jpg',
        likes: 45,
        shares: 3,
        liked: false,
        showComments: false,
        newCommentText: '',
        commentList: [
          {
            id: 1,
            author: 'Jessica Damilola',
            authorInitials: 'JD',
            avatarColor: '#6366f1',
            text: 'Excellent work Akin! The roadmap looks solid.',
            timeAgo: '4 hours ago',
          },
        ],
      },
      {
        id: 3,
        author: 'Michael Okafor',
        authorInitials: 'MO',
        avatarColor: '#10b981',
        role: 'Finance Officer',
        timeAgo: '1 day ago',
        content:
          'Reminder: Q1 budget submissions are due this Friday. Please ensure all department heads have submitted their reports. Reach out if you need any assistance.',
        likes: 18,
        shares: 2,
        liked: false,
        showComments: false,
        newCommentText: '',
        commentList: [],
      },
    ];
  }

  onPostEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      event.preventDefault();
      this.submitPost();
    }
  }

  onCommentEnter(event: Event, post: any) {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      event.preventDefault();
      this.submitComment(post);
    }
  }

  toggleLike(post: any) {
    post.liked = !post.liked;
    post.likes += post.liked ? 1 : -1;
  }

  toggleComments(post: any) {
    post.showComments = !post.showComments;
  }

  submitPost() {
    const text = this.newPostText.trim();
    if (!text) return;

    const name = this.userInfo.username || this.userInfo.fullname || 'You';
    const role = this.userInfo.role || 'User';

    const newPost = {
      id: Date.now(),
      author: name,
      authorInitials: this.getUserInitials(),
      avatarColor: '#6366f1',
      role: role,
      timeAgo: 'Just now',
      content: text,
      likes: 0,
      shares: 0,
      liked: false,
      showComments: false,
      newCommentText: '',
      commentList: [] as any[],
    };

    this.feedPosts.unshift(newPost);
    this.newPostText = '';
  }

  submitComment(post: any) {
    const text = (post.newCommentText || '').trim();
    if (!text) return;

    const name = this.userInfo.username || this.userInfo.fullname || 'You';
    const newComment = {
      id: Date.now(),
      author: name,
      authorInitials: this.getUserInitials(),
      avatarColor: '#6366f1',
      text: text,
      timeAgo: 'Just now',
    };

    post.commentList.push(newComment);
    post.newCommentText = '';
  }

  getUserInitials(): string {
    const name = this.userInfo.username || this.userInfo.fullname || '';
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  autoGrow(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }

  // ===== AI CHATBOT METHODS =====

  loadInitialChatMessages() {
    const firstName =
      this.userInfo.username || this.userInfo.fullname || 'there';
    this.chatMessages = [
      {
        sender: 'ai',
        text: `Hello ${firstName}! How can I help you with your administrative tasks today?`,
        time: 'AI Assistant • 09:12 AM',
      },
      {
        sender: 'user',
        text: 'Can you summarize my tasks for the week?',
        time: 'You • 09:15 AM',
      },
      {
        sender: 'ai',
        text: 'Certainly! You have 3 priority tasks remaining today: a sales report review, staff attendance check, and a monthly report. You also have 3 meetings later this month.',
        time: 'AI Assistant • 09:15 AM',
      },
    ];
  }

  sendChatMessage(message: string) {
    if (!message || !message.trim()) return;

    const now = new Date();
    const timeStr = `You • ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // Push user message
    this.chatMessages.push({
      sender: 'user',
      text: message.trim(),
      time: timeStr,
    });
    this.newChatMessage = '';

    // Simulate AI typing
    this.aiTyping = true;
    setTimeout(
      () => {
        this.aiTyping = false;
        const aiResponse = this.getAIResponse(message);
        const aiTime = `AI Assistant • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        this.chatMessages.push({
          sender: 'ai',
          text: aiResponse,
          time: aiTime,
        });
      },
      1200 + Math.random() * 800,
    );
  }

  private getAIResponse(userMessage: string): string {
    const msg = userMessage.toLowerCase();

    if (msg.includes('task') || msg.includes('summarize')) {
      return `You currently have ${this.tasks.length} tasks: ${this.tasks.map((t) => t.title).join(', ')}. ${this.tasks.filter((t) => t.status === 'In Progress').length} are in progress.`;
    }
    if (msg.includes('attendance')) {
      return 'Your attendance record looks great this week. You have been marked Present for Monday, Tuesday, and Wednesday.';
    }
    if (msg.includes('payslip') || msg.includes('salary')) {
      return 'Your payslips for January and February 2025 are available. March is still pending processing.';
    }
    if (
      msg.includes('event') ||
      msg.includes('meeting') ||
      msg.includes('schedule')
    ) {
      return 'Your upcoming events: Quarterly Review Meeting on March 10, Team Building Event on March 15, and Monthly Audit on March 25.';
    }
    if (msg.includes('email') || msg.includes('draft')) {
      return 'I can help you draft an email. Could you provide more details — who is it for and what is the main message?';
    }

    // Random response from pool
    const randomIndex = Math.floor(Math.random() * this.aiResponsePool.length);
    return this.aiResponsePool[randomIndex];
  }

  /**
   * Extract user information from sessionStorage using userprimaryinfodata
   */
  loadUserInfoFromSessionStorage() {
    console.log('Loading user info from sessionStorage...');

    const userPrimaryInfoDataStr = sessionStorage.getItem(
      'userprimaryinfodata',
    );
    console.log('userprimaryinfodata from session:', userPrimaryInfoDataStr);

    if (userPrimaryInfoDataStr) {
      try {
        const userPrimaryData = JSON.parse(userPrimaryInfoDataStr);
        console.log('Parsed userprimaryinfodata:', userPrimaryData);

        this.userInfo = {
          id: userPrimaryData.id || 1,
          fullname: userPrimaryData.fullname || '',
          name: userPrimaryData.fullname || '',
          email: userPrimaryData.email || '',
          phoneNumber: userPrimaryData.phoneNumber || '',
          username:
            userPrimaryData.username || userPrimaryData.user?.username || '',
          gender: userPrimaryData.gender || '',
          profileImage: userPrimaryData.profileImage || '',
          companyName: userPrimaryData.companyName || '',
          accountId: userPrimaryData.accountId || '',
          clientType: userPrimaryData.clientType || '',
          industry: userPrimaryData.industry || '',
          address: userPrimaryData.address || '',
          city: userPrimaryData.city || '',
          state: userPrimaryData.state || '',
          country: userPrimaryData.country || '',
          postalCode: userPrimaryData.postalCode || '',
          bio: userPrimaryData.bio || '',
          currency: userPrimaryData.currency || 'NGN',
          language: userPrimaryData.language || 'English',
          timeZone: userPrimaryData.timeZone || 'Africa/Lagos',
          domain: userPrimaryData.domain || '',
          employeeId: userPrimaryData.accountId
            ? `${userPrimaryData.accountId}`
            : userPrimaryData.id
              ? `${userPrimaryData.id}`
              : 'N/A',
          role: this.extractUserRole(userPrimaryData),
          roles: this.extractUserRoles(userPrimaryData),
          department: this.getDepartmentFromUserData(userPrimaryData),
          bankName: 'Standard Bank',
          daysWorked: this.calculateDaysWorked(),
          branchId: null,
          branchName: '',
        };

        this.userId = this.userInfo.id;
      } catch (error) {
        console.error('Error parsing userprimaryinfodata:', error);
        this.loadFromOtherSessionSources();
      }
    } else {
      console.warn('userprimaryinfodata not found in session storage');
      this.loadFromOtherSessionSources();
    }

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

    console.log('Final user info loaded:', this.userInfo);
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
          employeeId: userRegData.accountId
            ? `EMP-${userRegData.accountId}`
            : userRegData.id
              ? `EMP-${userRegData.id}`
              : 'N/A',
          role:
            roleStr || userRegData.roles || userRegData.user?.role || 'User',
          roles: Array.isArray(userRegData.roles)
            ? userRegData.roles
            : typeof userRegData.roles === 'string'
              ? [userRegData.roles]
              : [],
          department: this.getDepartmentFromRole(),
          bankName: 'Standard Bank',
          daysWorked: this.calculateDaysWorked(),
          address: userRegData.address || '',
          city: userRegData.city || '',
          country: userRegData.country || '',
          clientType: userRegData.clientType || '',
        };
        this.userId = this.userInfo.id;
      } catch (error) {
        console.error('Error parsing userRegData:', error);
      }
    }

    if (userInfoStr) {
      try {
        const parsedUserInfo = JSON.parse(userInfoStr);
        this.userInfo = { ...this.userInfo, ...parsedUserInfo };
      } catch (error) {
        console.error('Error parsing userInfo:', error);
      }
    }

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

  private extractUserRole(userData: any): string {
    const roleSources = [
      userData.role,
      userData.user?.role,
      sessionStorage.getItem('role'),
      'User',
    ];
    for (const source of roleSources) {
      if (source) return source;
    }
    return 'User';
  }

  private extractUserRoles(userData: any): string[] {
    if (userData.roles && Array.isArray(userData.roles)) return userData.roles;
    if (userData.role) return [userData.role];
    const roleFromSession = sessionStorage.getItem('role');
    if (roleFromSession) return [roleFromSession];
    return [];
  }

  private getDepartmentFromUserData(userData: any): string {
    const industry = (userData.industry || '').toLowerCase();
    if (industry.includes('pharmacy')) return 'Pharmacy';
    if (industry.includes('food') || industry.includes('beverage'))
      return 'Food & Beverage';
    if (industry.includes('retail')) return 'Retail';
    if (industry.includes('hospital')) return 'Healthcare';
    if (industry.includes('technology')) return 'Technology';
    if (industry.includes('finance')) return 'Finance';
    const clientType = (userData.clientType || '').toLowerCase();
    if (clientType.includes('company')) return 'Corporate';
    if (clientType.includes('individual')) return 'Individual';
    return 'General Operations';
  }

  loadPlaceholders() {
    this.unreadNotifications = this.notifications.length;

    this.tasks = [
      {
        id: 1,
        title: 'Review daily sales report',
        time: '09:00',
        description: 'Check and validate daily sales figures',
        status: 'Pending',
      },
      {
        id: 2,
        title: 'Verify staff attendance',
        time: '10:30',
        description: 'Review attendance records for the week',
        status: 'Pending',
      },
      {
        id: 3,
        title: 'Prepare monthly report',
        time: '14:00',
        description: 'Compile data for monthly performance review',
        status: 'In Progress',
      },
    ];

    this.payslips = [
      { month: 'January 2025', status: 'Available' },
      { month: 'February 2025', status: 'Available' },
      { month: 'March 2025', status: 'Pending' },
    ];

    this.attendance = { lastClockIn: '2025-03-01 08:45 AM', status: 'Present' };

    this.events = [
      {
        title: 'Quarterly Review Meeting',
        date: 'March 10, 2025',
        color: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Team Building Event',
        date: 'March 15, 2025',
        color: 'bg-orange-100',
        iconColor: 'text-orange-500',
      },
      {
        title: 'Monthly Audit',
        date: 'March 25, 2025',
        color: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
      },
    ];
  }

  private getDepartmentFromRole(): string {
    const role = (this.userInfo.role || '').toLowerCase();
    const industry = (this.userInfo.industry || '').toLowerCase();
    if (industry.includes('pharmacy')) return 'Pharmacy';
    if (industry.includes('food') || industry.includes('beverage'))
      return 'Food & Beverage';
    if (industry.includes('retail')) return 'Retail';
    if (industry.includes('hospital')) return 'Healthcare';
    if (role.includes('admin')) return 'Administration';
    if (role.includes('finance')) return 'Finance';
    if (role.includes('sales')) return 'Sales';
    if (role.includes('hr')) return 'Human Resources';
    if (role.includes('it')) return 'Information Technology';
    return 'General Operations';
  }

  private calculateDaysWorked(): number {
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
      groupBy: 'date',
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
      },
      error: (err) => {
        console.error('Sales report error', err);
        this.reportError = err?.message || 'Failed to load sales report';
        this.reportLoading = false;
      },
    });
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) this.unreadNotifications = 0;
  }

  addTask(title: string) {
    if (!title.trim()) return;
    const nextId = this.tasks.length
      ? Math.max(...this.tasks.map((t) => t.id)) + 1
      : 1;
    this.tasks.push({
      id: nextId,
      title: title,
      time: '09:00',
      description: '',
      status: 'Pending',
    });
    this.newTask = '';
  }

  removeTask(index: number) {
    this.tasks.splice(index, 1);
  }

  removeTaskById(id: number) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }

  loadTasksForUser() {
    if (this.userId == null) return;
    // TODO: Implement backend call to fetch tasks for user
  }

  openTaskModal(task: any) {
    this.selectedTask = { ...task };
    this.showTaskModal = true;
  }

  closeTaskModal(save = false) {
    if (save && this.selectedTask) {
      const idx = this.tasks.findIndex((t) => t.id === this.selectedTask.id);
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

  hasRole(role: string): boolean {
    if (!this.userInfo.roles || !this.userInfo.roles.length) {
      const userRole = (this.userInfo.role || '').toLowerCase();
      return userRole.includes(role.toLowerCase());
    }
    return this.userInfo.roles.some((r: string) =>
      r.toLowerCase().includes(role.toLowerCase()),
    );
  }

  get isAdmin(): boolean {
    return this.hasRole('admin') || this.hasRole('role_admin');
  }

  get isCashier(): boolean {
    return this.hasRole('cashier') || this.hasRole('role_cashier');
  }

  debugSessionStorage() {
    console.log('=== SessionStorage Debug ===');
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key || '');
      console.log(`${key}: ${value}`);
    }
    console.log('=== End Debug ===');
  }
}
