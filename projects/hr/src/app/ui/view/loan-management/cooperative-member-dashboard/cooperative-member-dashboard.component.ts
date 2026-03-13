import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { Subscription } from 'rxjs';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { EmployeeService } from '../../../service/employee.service';
import {
  CooperativeMember,
  CooperativeLoan,
  CooperativeRepayment,
  CooperativeGroupMembership,
  CooperativeNotification,
  CooperativeEmployeeProfile,
  CooperativeMembershipEligibility,
  CooperativeMembershipApplication,
  CooperativeStaffRank
} from '../../../service/loan/cooperative-loan/cooperative.types';
import { LoanApplication, RepaymentScheduleItem } from '../../../service/loan/loan.types';
@Component({
  selector: 'app-cooperative-member-dashboard',
  templateUrl: './cooperative-member-dashboard.component.html',
  styleUrls: ['./cooperative-member-dashboard.component.scss']
})
export class CooperativeMemberDashboardComponent implements OnInit, OnDestroy {
  currentUuid = uuidV4();
  currentMemberId = '1';
  
  member?: CooperativeMember;
  loans: CooperativeLoan[] = [];
  repaymentsByLoanId: Record<string, CooperativeRepayment[]> = {};
  isLoading = true;
  showApplicationModal = false;
  showPaymentModal = false;
  showLoanHistory = true;
  showLoanDetailsModal = false;
  loanStatusFilter: 'PENDING' | 'ACTIVE' | 'COMPLETED' = 'ACTIVE';
  selectedRepaymentHistoryLoanId: string | null = null;
  selectedLoanForDetails: CooperativeLoan | null = null;
  selectedPaymentLoan?: CooperativeLoan;
  paymentAmount = 0;
  paymentMethod: CooperativeRepayment['paymentMethod'] = 'BANK_TRANSFER';
  actionMessage = '';
  memberStatusUpdates: CooperativeNotification[] = [];
  memberGroups: Array<{
    membership: CooperativeGroupMembership;
    groupName: string;
    maxBorrowable: number;
  }> = [];
  selectedGroupId: string = 'ALL';
  patronageRate = 20;
  membershipEligibility?: CooperativeMembershipEligibility;
  membershipMessage = '';
  showTierOnApply = false;
  selectedPreviewRole: 'JUNIOR' | 'MID' | 'SENIOR' = 'MID';
  readonly previewRoles: Array<{ label: string; value: 'JUNIOR' | 'MID' | 'SENIOR' }> = [
    { label: 'Junior', value: 'JUNIOR' },
    { label: 'Mid', value: 'MID' },
    { label: 'Senior', value: 'SENIOR' }
  ];
  selectedManager = '';
  managers = [
    { id: 'MGR-001', name: 'Grace Eke' },
    { id: 'MGR-002', name: 'Peter Obi' },
    { id: 'MGR-003', name: 'Mary Jones' }
  ];
  currentEmployeeProfile: CooperativeEmployeeProfile = {
    employeeId: 'EMP-001',
    fullName: 'Current Employee',
    email: 'employee@company.com',
    phone: '+234 800 000 0000',
    department: 'Operations',
    rank: 'MID',
    employmentType: 'PERMANENT',
    employmentStartDate: '2024-01-15T08:00:00Z',
    onProbation: false,
    probationEndDate: '2024-07-15T08:00:00Z',
    hasActiveDisciplinaryIssue: false,
    managerId: 'MGR-001'
  };
  private notificationsSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    this.loadCurrentEmployeeProfile();

    this.notificationsSubscription = this.cooperativeService.getNotificationsObservable().subscribe(notifications => {
      this.updateMemberStatusUpdates(notifications);
    });
  }

  ngOnDestroy(): void {
    this.notificationsSubscription?.unsubscribe();
  }

  loadCurrentEmployeeProfile(): void {
    this.employeeService.getAllEmployee().subscribe({
      next: (data) => {
        const employees = Array.isArray(data)
          ? data : []
          

        const userRegDataRaw = sessionStorage.getItem('userRegData');
        const userRegData = userRegDataRaw ? JSON.parse(userRegDataRaw) : null;
        const sessionUsername = String(sessionStorage.getItem('username') || '').trim().toLowerCase();
        const sessionUserId = String(sessionStorage.getItem('userid') || '').trim();

        const matchedEmployee = employees.find((employee: any) => {
          const employeeId = String(employee?.id ?? employee?.employeeId ?? '').trim();
          const employeeEmail = String(employee?.email || employee?.workEmail || '').trim().toLowerCase();
          const employeeUsername = String(employee?.username || employee?.userName || '').trim().toLowerCase();

          const regEmail = String(userRegData?.email || '').trim().toLowerCase();
          const regUsername = String(userRegData?.username || '').trim().toLowerCase();

          if (sessionUserId && employeeId === sessionUserId) {
            return true;
          }

          if (regEmail && employeeEmail && employeeEmail === regEmail) {
            return true;
          }

          if (sessionUsername && (employeeUsername === sessionUsername || employeeEmail === sessionUsername)) {
            return true;
          }

          if (regUsername && (employeeUsername === regUsername || employeeEmail === regUsername)) {
            return true;
          }

          return false;
        }) || employees[0];

        if (matchedEmployee) {
          this.currentEmployeeProfile = this.mapEmployeeToProfile(matchedEmployee);
          this.currentMemberId = this.currentEmployeeProfile.employeeId || this.currentMemberId;
          this.selectedPreviewRole = this.toPreviewRole(this.currentEmployeeProfile.rank);
        }

        this.loadMemberData();
      },
      error: () => {
        this.loadMemberData();
      }
    });
  }

  loadMemberData(): void {
    this.isLoading = true;
    this.actionMessage = '';
    this.showTierOnApply = false;
    
    const member = this.cooperativeService.getMemberById(this.currentMemberId);
    if (member) {
      this.member = member;
      this.currentEmployeeProfile = {
        ...this.currentEmployeeProfile,
        employeeId: member.id,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        department: member.address || this.currentEmployeeProfile.department
      };
      this.loans = this.cooperativeService
        .getLoansByMember(member.id)
        .sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
      this.memberGroups = this.cooperativeService.getGroupMembershipsByMember(member.id)
        .filter(item => item.status === 'ACTIVE')
        .map(item => ({
          membership: item,
          groupName: this.cooperativeService.getGroupById(item.groupId || item.groupId)?.name || 'Unknown Group',
          maxBorrowable: this.cooperativeService.getMaxBorrowableAmountForGroup(member.id, item.groupId || item.groupId)
        }));
      this.selectedGroupId = this.memberGroups[0]?.membership.groupId || this.memberGroups[0]?.membership.groupId || 'ALL';
      this.loadRepayments();
    } else {
      this.loans = [];
      this.repaymentsByLoanId = {};
      this.memberGroups = [];
    }

    this.membershipEligibility = this.cooperativeService.checkMembershipEligibility(this.currentEmployeeProfile);
    this.updateMemberStatusUpdates();
    
    this.isLoading = false;
  }

  onPreviewRoleChange(role: 'JUNIOR' | 'MID' | 'SENIOR'): void {
    this.selectedPreviewRole = role;
    this.currentEmployeeProfile = {
      ...this.currentEmployeeProfile,
      rank: role
    };

    this.showTierOnApply = false;
    this.selectedManager = '';
    this.membershipMessage = '';
    this.membershipEligibility = this.cooperativeService.checkMembershipEligibility(this.currentEmployeeProfile);
  }

  private toPreviewRole(rank: CooperativeStaffRank): 'JUNIOR' | 'MID' | 'SENIOR' {
    if (rank === 'SENIOR' || rank === 'EXEC') {
      return 'SENIOR';
    }

    if (rank === 'MID') {
      return 'MID';
    }

    return 'JUNIOR';
  }

  get hasMembership(): boolean {
    return !!this.member;
  }

  get canApplyForLoan(): boolean {
    return this.selectedPreviewRole !== 'JUNIOR';
  }

  submitMembershipApplication(): void {
    this.showTierOnApply = true;

    if (!this.membershipEligibility) {
      return;
    }

    if (this.hasMembership) {
      this.membershipMessage = 'You are already an active cooperative member.';
      return;
    }

    if (this.membershipEligibility.requiresManagerApproval && !this.selectedManager) {
      this.membershipMessage = 'Please select your manager before submitting the application.';
      return;
    }

    const application: CooperativeMembershipApplication = {
      employee: this.currentEmployeeProfile,
      source: 'SELF',
      requestedTier: this.membershipEligibility.policy.tier,
      note: this.selectedManager ? `Manager selected: ${this.selectedManager}` : undefined
    };

    const result = this.cooperativeService.applyForMembership(application);
    this.membershipMessage = result.message;

    if (result.success) {
      this.showTierOnApply = false;
    }

    if (result.member) {
      this.member = result.member;
      this.loadMemberData();
    }
  }

  requestInvite(): void {
    const result = this.cooperativeService.inviteEmployee(this.currentEmployeeProfile);
    this.membershipMessage = result.message;
  }

  private mapEmployeeToProfile(employee: any): CooperativeEmployeeProfile {
    const firstName = String(employee?.firstName || '').trim();
    const lastName = String(employee?.lastName || '').trim();
    const fallbackName = String(employee?.fullName || employee?.name || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || fallbackName || 'Current Employee';

    const email = String(employee?.email || employee?.workEmail || '').trim() || 'employee@company.com';
    const levelName = String(employee?.level?.name || employee?.level || employee?.jobTitle || '').trim();
    const employmentTypeName = String(
      employee?.employmentType?.name || employee?.employmentType || employee?.jobType?.name || employee?.jobType || ''
    ).trim();

    return {
      employeeId: String(employee?.id ?? employee?.employeeId ?? this.currentEmployeeProfile.employeeId),
      fullName,
      email,
      phone: String(employee?.phone || this.currentEmployeeProfile.phone || '').trim(),
      department: String(employee?.department?.name || employee?.department || this.currentEmployeeProfile.department || 'Operations').trim(),
      rank: this.mapRank(levelName),
      employmentType: this.mapEmploymentType(employmentTypeName),
      employmentStartDate:
        employee?.employementStartDate ||
        employee?.employmentStartDate ||
        employee?.hireDate ||
        this.currentEmployeeProfile.employmentStartDate,
      onProbation: Boolean(employee?.onProbation),
      probationEndDate: employee?.probationEndDate || this.currentEmployeeProfile.probationEndDate,
      hasActiveDisciplinaryIssue: Boolean(employee?.hasActiveDisciplinaryIssue || employee?.disciplinaryCaseOpen),
      managerId: String(employee?.supervisor?.id || employee?.supervisor || employee?.managerId || this.currentEmployeeProfile.managerId || '').trim() || undefined
    };
  }

  private mapRank(value: string): CooperativeEmployeeProfile['rank'] {
    const normalized = value.toLowerCase();

    if (normalized.includes('executive') || normalized.includes('exec') || normalized.includes('director')) {
      return 'EXEC';
    }

    if (normalized.includes('senior') || normalized.includes('manager') || normalized.includes('lead') || normalized.includes('head')) {
      return 'SENIOR';
    }

    if (normalized.includes('mid') || normalized.includes('associate') || normalized.includes('level 2') || normalized.includes('level 3')) {
      return 'MID';
    }

    return 'JUNIOR';
  }

  private mapEmploymentType(value: string): CooperativeEmployeeProfile['employmentType'] {
    const normalized = value.toLowerCase();

    if (normalized.includes('intern')) {
      return 'INTERN';
    }

    if (normalized.includes('contract')) {
      return 'CONTRACT';
    }

    return 'PERMANENT';
  }

  // Computed properties
  get activeLoans(): CooperativeLoan[] {
    return this.filterLoansBySelectedGroup(this.loans).filter(l => l.status === 'ACTIVE');
  }

  get pendingLoans(): CooperativeLoan[] {
    return this.filterLoansBySelectedGroup(this.loans).filter(l => l.status === 'PENDING');
  }

  get completedLoans(): CooperativeLoan[] {
    return this.filterLoansBySelectedGroup(this.loans).filter(l => l.status === 'COMPLETED');
  }

  get totalBorrowed(): number {
    return this.filterLoansBySelectedGroup(this.loans).reduce((sum, l) => sum + l.amount, 0);
  }

  get personalTotalBorrowed(): number {
    return this.loans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  }

  get outstandingBalance(): number {
    return this.activeLoans.reduce((sum, loan) => sum + this.getOutstandingAmount(loan), 0);
  }

  get personalOutstandingBalance(): number {
    return this.loans
      .filter(loan => loan.status === 'ACTIVE')
      .reduce((sum, loan) => sum + this.getOutstandingAmount(loan), 0);
  }

  get nextPayment(): { amount: number; dueDate: string } | null {
    const upcoming = this.activeLoans
      .flatMap(loan => this.getOpenRepayments(loan.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    if (upcoming) {
      return {
        amount: upcoming.amount,
        dueDate: upcoming.dueDate
      };
    }

    return null;
  }

  get personalNextPayment(): { amount: number; dueDate: string } | null {
    const upcoming = this.loans
      .filter(loan => loan.status === 'ACTIVE')
      .flatMap(loan => this.getOpenRepayments(loan.id))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    if (upcoming) {
      return {
        amount: upcoming.amount,
        dueDate: upcoming.dueDate
      };
    }

    return null;
  }

  get estimatedPatronageThisYear(): number {
    const year = new Date().getFullYear();
    const memberLoanIds = new Set(this.loans.map(loan => loan.id));

    const yearlyInterestPaid = Object.values(this.repaymentsByLoanId)
      .flat()
      .filter(repayment => {
        if (!repayment.paidDate) {
          return false;
        }

        return new Date(repayment.paidDate).getFullYear() === year && memberLoanIds.has(repayment.loanId);
      })
      .reduce((sum, repayment) => {
        const loan = this.loans.find(item => item.id === repayment.loanId);
        if (!loan || !loan.totalRepayment) {
          return sum;
        }

        const ratio = Math.max((loan.totalRepayment - loan.amount) / loan.totalRepayment, 0);
        return sum + repayment.amount * ratio;
      }, 0);

    return Number((yearlyInterestPaid * (this.patronageRate / 100)).toFixed(2));
  }

  get primaryActiveLoan(): CooperativeLoan | null {
    return this.activeLoans[0] || null;
  }

  get filteredLoansByStatus(): CooperativeLoan[] {
    if (this.loanStatusFilter === 'PENDING') {
      return this.pendingLoans;
    }

    if (this.loanStatusFilter === 'COMPLETED') {
      return this.completedLoans;
    }

    return this.activeLoans;
  }

  get selectedGroupName(): string {
    if (this.selectedGroupId === 'ALL') {
      return 'All Groups';
    }

    return this.memberGroups.find(group => (group.membership.groupId || group.membership.groupId) === this.selectedGroupId)?.groupName || 'Selected Group';
  }

  // Navigation
  viewAllLoans(): void {
    this.router.navigate(['/admin/hr/loan-management/employee-loan-history', this.member?.id || this.currentMemberId, this.currentUuid], {
      state: { source: 'employee', cooperative: true, uuid: this.currentUuid }
    });
  }

  applyForLoan(): void {
    if (!this.canApplyForLoan) {
      this.actionMessage = 'Junior staff are not eligible to apply for cooperative loans yet.';
      return;
    }

    this.showApplicationModal = true;
  }

  openQuickPaymentModal(): void {
    if (!this.primaryActiveLoan) {
      this.actionMessage = 'No active loan available for payment right now.';
      return;
    }

    this.openPaymentModal(this.primaryActiveLoan);
  }

  toggleLoanHistory(): void {
    this.showLoanHistory = !this.showLoanHistory;
  }

  viewFullLoanHistory(): void {
    this.viewAllLoans();
  }

  setGroupDashboard(groupId: string): void {
    this.selectedGroupId = groupId;
    this.selectedRepaymentHistoryLoanId = null;
  }

  closeApplicationModal(): void {
    this.showApplicationModal = false;
  }

  onApplicationSubmitted(): void {
    this.showApplicationModal = false;
    this.loadMemberData();
  }

  viewLoanDetails(id: string): void {
    const loan = this.loans.find(item => item.id === id);
    if (!loan) {
      this.actionMessage = 'Loan details are not available right now.';
      return;
    }

    this.selectedLoanForDetails = loan;
    this.showLoanDetailsModal = true;
  }

  closeLoanDetailsModal(): void {
    this.showLoanDetailsModal = false;
    this.selectedLoanForDetails = null;
  }

  openFullLoanDetailsFromModal(): void {
    if (!this.selectedLoanForDetails) {
      return;
    }

    const loanId = this.selectedLoanForDetails.id;
    this.closeLoanDetailsModal();
    this.router.navigate([`/member/cooperative/loans/${loanId}/${this.currentUuid}`]);
  }

  viewRepaymentHistory(id: string): void {
    this.selectedRepaymentHistoryLoanId = this.selectedRepaymentHistoryLoanId === id ? null : id;
  }

  closeRepaymentHistory(): void {
    this.selectedRepaymentHistoryLoanId = null;
  }

  get selectedRepaymentHistoryLoan(): CooperativeLoan | null {
    if (!this.selectedRepaymentHistoryLoanId) {
      return null;
    }

    return this.loans.find(item => item.id === this.selectedRepaymentHistoryLoanId) || null;
  }

  get selectedRepaymentHistoryRows(): CooperativeRepayment[] {
    if (!this.selectedRepaymentHistoryLoanId) {
      return [];
    }

    return [...(this.repaymentsByLoanId[this.selectedRepaymentHistoryLoanId] || [])]
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }

  get selectedRepaymentScheduleLoan(): LoanApplication | null {
    if (!this.selectedRepaymentHistoryLoan) {
      return null;
    }

    return this.toLoanApplicationScheduleView(this.selectedRepaymentHistoryLoan);
  }

  private toLoanApplicationScheduleView(loan: CooperativeLoan): LoanApplication {
    const repayments = [...(this.repaymentsByLoanId[loan.id] || [])]
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const totalPaid = repayments
      .filter(item => item.status === 'PAID')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const currentBalance = repayments
      .filter(item => item.status !== 'PAID')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    let remainingBalance = Number(loan.totalRepayment || 0);
    const repaymentSchedule: RepaymentScheduleItem[] = repayments.map((item, index) => {
      const totalPayment = Number(item.amount || 0);
      const principal = Number(item.principalComponent || Math.max(totalPayment - Number(item.interestComponent || 0), 0));
      const interest = Number(item.interestComponent || 0);
      remainingBalance = Math.max(Number((remainingBalance - totalPayment).toFixed(2)), 0);

      return {
        monthNumber: index + 1,
        dueDate: item.dueDate,
        principal,
        interest,
        totalPayment,
        remainingBalance,
        status: item.status,
        paymentDate: item.paidDate,
        paidAmount: item.status === 'PAID' ? totalPayment : 0
      };
    });

    return {
      id: loan.loanId,
      employeeId: this.member?.memberId || loan.memberId,
      fullName: this.member?.fullName || 'Cooperative Member',
      department: this.currentEmployeeProfile.department || 'Cooperative',
      loanAmount: Number(loan.amount || 0),
      status: loan.status === 'DEFAULTED' ? 'ACTIVE' : loan.status,
      dateSubmitted: loan.applicationDate,
      purpose: loan.purpose,
      repaymentPeriod: Number(loan.duration || 0),
      monthlyRepayment: Number(loan.monthlyRepayment || 0),
      acknowledgment: true,
      interestRate: Number(loan.interestRate || 0),
      currentBalance,
      totalPaid,
      statusHistory: [],
      repaymentSchedule,
      paymentHistory: []
    };
  }

  setLoanStatusFilter(status: 'PENDING' | 'ACTIVE' | 'COMPLETED'): void {
    this.loanStatusFilter = status;
  }

  openPaymentModal(loan: CooperativeLoan): void {
    this.selectedPaymentLoan = loan;
    this.paymentAmount = this.getNextInstallmentAmount(loan.id) || loan.monthlyRepayment;
    this.paymentMethod = 'BANK_TRANSFER';
    this.showPaymentModal = true;
    this.actionMessage = '';
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedPaymentLoan = undefined;
    this.paymentAmount = 0;
    this.paymentMethod = 'BANK_TRANSFER';
  }

  submitPayment(): void {
    if (!this.selectedPaymentLoan || this.paymentAmount <= 0) {
      return;
    }

    const repayment = this.cooperativeService.recordRepayment(this.selectedPaymentLoan.id, {
      amount: this.paymentAmount,
      paymentMethod: this.paymentMethod,
      paidDate: new Date().toISOString()
    });

    if (!repayment) {
      this.actionMessage = 'Unable to record payment right now. Please try again.';
      return;
    }

    this.closePaymentModal();
    this.loadMemberData();
    this.actionMessage = `Payment of ${this.formatCurrency(repayment.amount)} was recorded successfully.`;
  }

  getOutstandingAmount(loan: CooperativeLoan): number {
    const repayments = this.repaymentsByLoanId[loan.id] || [];
    if (repayments.length === 0) {
      return loan.amount;
    }

    return repayments
      .filter(item => item.status !== 'PAID')
      .reduce((sum, item) => sum + item.amount, 0);
  }

  getNextDueDate(loanId: string): string | null {
    const next = this.getOpenRepayments(loanId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    return next?.dueDate || null;
  }

  getNextInstallmentAmount(loanId: string): number {
    const next = this.getOpenRepayments(loanId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    return next?.amount || 0;
  }

  getLastPaymentDate(loanId: string): string | null {
    const lastPaid = (this.repaymentsByLoanId[loanId] || [])
      .filter(item => item.status === 'PAID' && !!item.paidDate)
      .sort((a, b) => new Date(b.paidDate as string).getTime() - new Date(a.paidDate as string).getTime())[0];

    return lastPaid?.paidDate || null;
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  goBack(): void {
    this.router.navigate(['/member/cooperative/dashboard', this.currentUuid]);
  }

  private loadRepayments(): void {
    this.repaymentsByLoanId = {};
    this.loans.forEach(loan => {
      this.repaymentsByLoanId[loan.id] = this.cooperativeService.getRepaymentsByLoanId(loan.id);
    });
  }

  private getOpenRepayments(loanId: string): CooperativeRepayment[] {
    return (this.repaymentsByLoanId[loanId] || []).filter(item => item.status !== 'PAID');
  }

  private filterLoansBySelectedGroup(loans: CooperativeLoan[]): CooperativeLoan[] {
    if (this.selectedGroupId === 'ALL') {
      return loans;
    }

    return loans.filter(loan => (loan.groupId || loan.groupId) === this.selectedGroupId);
  }

  getActivationLinkFromMessage(message: string): string | null {
    if (!message) {
      return null;
    }

    const match = message.match(/(https?:\/\/\S+|\/member\/cooperative\/dashboard\S*)/i);
    return match ? match[0].replace(/[).,]+$/, '') : null;
  }

  getMessageWithoutActivationLink(message: string): string {
    const link = this.getActivationLinkFromMessage(message);
    if (!link) {
      return message;
    }

    return message.replace(link, '').replace(/\s{2,}/g, ' ').trim();
  }

  openActivationLink(event: Event, link: string): void {
    event.preventDefault();

    if (!link) {
      return;
    }

    if (link.startsWith('/member/cooperative/dashboard')) {
      this.router.navigate(['/member/cooperative/dashboard', this.currentUuid], {
        queryParams: { activateMembership: 'true' }
      });
      return;
    }

    if (/^https?:\/\//i.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }

    this.router.navigateByUrl(link);
  }

  private updateMemberStatusUpdates(source?: CooperativeNotification[]): void {
    const allNotifications = source || [];
    const targetMemberId = this.member?.id || this.currentMemberId;

    this.memberStatusUpdates = allNotifications
      .filter(notification => notification.recipient === 'MEMBER')
      .filter(notification => !targetMemberId || notification.memberId === targetMemberId)
      .filter(notification =>
        notification.type === 'LOAN_STATUS_UPDATE' ||
        notification.type === 'LOAN_INFO_REQUESTED' ||
        notification.type === 'GUARANTOR_STATUS_UPDATE' ||
        notification.type === 'LOAN_DEFAULTED'
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }
}