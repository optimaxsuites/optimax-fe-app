// ...imports remain unchanged...
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeGroupService, CooperativeGroupContext } from '../../../service/loan/cooperative-loan/cooperative-group.service';
import { CooperativeLoan } from '../../../../ui/domain/loan/cooperative-loan.dto';
import {
  CooperativeLoanGroup,
  CooperativeRepayment,
  CooperativeMember,
  CooperativeStats,
  CooperativeEmployeeProfile,
  CooperativeMembershipEligibility,
  CooperativeGroupMembership
} from '../../../service/loan/cooperative-loan/cooperative.types';
import { EmployeeService } from '../../../service/employee.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { getSessionUserDisplayName } from '../../../shared-component/service/session-user-display.util';
import { formatLoanPurposeDisplay, formatCooperativeLoanCode as _formatCooperativeLoanCode } from '../../../service/loan/loan-display.util';
import { startLoanLoadProfiler } from '../../../service/loan/loan-load-profiler.util';
import { PaymentHistory, StatusHistory } from '../../../domain/loan/cooperative-loan.dto';

interface DashboardActivity {
  icon: string;
  message: string;
  time: string;
}

interface DashboardAlert {
  level: 'warning' | 'danger';
  message: string;
}

type PatronageDistributionMethod = 'ADD_TO_SHARES' | 'CASH_PAYOUT' | 'APPLY_TO_LOAN';

interface MemberPatronageRow {
  memberId: number;
  memberName: string;
  interestPaid: number;
  patronageAmount: number;
  distributionMethod: PatronageDistributionMethod;
  hasActiveLoan: boolean;
}

interface InviteCandidateRow {
  employee: CooperativeEmployeeProfile;
  eligibility: CooperativeMembershipEligibility;
}

interface CooperativeDashboardLoanRow {
  loan: CooperativeLoan;
  displayId: string;
  groupName: string;
  amount: number;
  status: string;
  statusClass: string;
  requestDate: string;
  membershipId: string | number | null;
  groupMembershipId: string | number | null;
  formattedMemberId: string;
  formattedCooperativeMemberId: string;
  formattedMembershipId: string;
}

interface GroupJoinApplicationRow {
  id: number;
  memberId: number;
  memberName: string;
  memberCode: number;
  groupId: number;
  groupName: string;
  status: CooperativeGroupMembership['status'];
  requestDate: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

@Component({
  selector: 'app-cooperative-dashboard',
  templateUrl: './cooperative-dashboard.component.html',
  styleUrls: ['./cooperative-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None  // Add this line
})
export class CooperativeDashboardComponent implements OnInit, OnDestroy {
        // Helper to format membership ID (matches dashboard logic)
        // Format membership ID as [group code letters]-[memberId]-[membershipId]
        private formatMembershipId(membershipIdRaw: string, groupCode: string, memberIdNum: string | number): string {
          // Only use the leading alphabetical part of the group code
          const groupCodeLetters = (groupCode.match(/^[A-Za-z]+/) || [''])[0];
          return groupCodeLetters && memberIdNum && membershipIdRaw ? `${groupCodeLetters}-${memberIdNum}-${membershipIdRaw}` : '';
        }

        // Helper to build recent loan row (matches usage in loadDashboard)
        private buildRecentLoanRow(loan: CooperativeLoan): CooperativeDashboardLoanRow {
          const member = this.getMemberForLoan(loan);
          const membership = this.resolveMembershipForLoan(loan, member);
          const group = this.getGroupForLoan(loan) || (membership?.groupId ? this.groupLookup.get(Number(membership.groupId)) : undefined);
          const groupCode = group?.code || '';
          const memberIdNum = loan.cooperativeMemberId || loan.memberId || member?.id || member?.memberId;
          const membershipIdRaw = membership?.membershipId || '';
          // Format Member ID as COP-XXX (zero-padded)
          const formattedCooperativeMemberId = memberIdNum ? `COP-${String(memberIdNum).padStart(3, '0')}` : '';
          // Format Membership ID as [group code letters]-[memberId]-[membershipId]
          const formattedMembershipId = membershipIdRaw && groupCode && memberIdNum ? this.formatMembershipId(String(membershipIdRaw), groupCode, String(memberIdNum)) : '';
          const groupMembershipId = membership?.id || null;
          return {
            loan,
            displayId: this.getLoanDisplayId(loan),
            groupName: this.getLoanGroupName(loan),
            amount: Number(loan.amount || 0),
            status: loan.status || '',
            statusClass: loan?.status ? 'status-' + loan.status.toLowerCase() : '',
            requestDate: loan.requestDate || loan.applicationDate || '',
            membershipId: loan.membershipId || null,
            groupMembershipId,
            formattedMemberId: String(loan.memberId || ''),
            formattedCooperativeMemberId,
            formattedMembershipId
          };
        }

        // Helper to rebuild lookups (matches usage in loadDashboard)
        private rebuildLookups(members: CooperativeMember[], groups: CooperativeLoanGroup[]): void {
          this.memberNameLookup.clear();
          this.groupNameLookup.clear();
          this.groupCodeLookup.clear();
          this.memberLookup.clear();
          this.groupLookup.clear();
          members.forEach((member) => {
            [member.id, member.memberId, member.employeeId]
              .filter((value): value is number => typeof value === 'number' && !isNaN(value))
              .forEach((key) => {
                this.memberNameLookup.set(key, member.fullName);
                this.memberLookup.set(key, member);
              });
          });
          groups.forEach((group) => {
            this.groupNameLookup.set(group.id, group.name);
            this.groupCodeLookup.set(group.id, group.code || '');
            this.groupLookup.set(group.id, group);
          });
        }
      private memberLookup = new Map<number, CooperativeMember>();
      private groupLookup = new Map<number, CooperativeLoanGroup>();

      private rebuildLookupsForDashboard(members: CooperativeMember[], groups: CooperativeLoanGroup[]): void {
        this.memberLookup.clear();
        this.groupLookup.clear();
        members.forEach((member) => {
          [member.id, member.memberId]
            .filter((value): value is number => typeof value === 'number' && !isNaN(value))
            .forEach((key) => this.memberLookup.set(key, member));
        });
        groups.forEach((group) => this.groupLookup.set(group.id, group));
      }

      private getMemberForLoan(loan: CooperativeLoan): CooperativeMember | undefined {
        const directMembershipId = Number(loan.membershipId || 0);
        if (directMembershipId > 0) {
          const membership = this.memberships.find((item) => Number(item.id) === directMembershipId);
          const byMembership = this.allMembers.find((member) => Number(member.id) === Number(membership?.memberId || 0));
          if (byMembership) {
            return byMembership;
          }
        }

        const cooperativeMemberId = Number(loan.cooperativeMemberId || 0);
        if (cooperativeMemberId > 0) {
          const byId = this.allMembers.find((member) => Number(member.id) === cooperativeMemberId);
          if (byId) {
            return byId;
          }

          const byMemberId = this.allMembers.find((member) => Number(member.memberId || 0) === cooperativeMemberId);
          if (byMemberId) {
            return byMemberId;
          }
        }

        const memberId = Number(loan.memberId || 0);
        if (memberId > 0) {
          const byMemberId = this.allMembers.find((member) => Number(member.memberId || 0) === memberId);
          if (byMemberId) {
            return byMemberId;
          }

          const byId = this.allMembers.find((member) => Number(member.id) === memberId);
          if (byId) {
            return byId;
          }

          const byEmployeeId = this.allMembers.find((member) => Number(member.employeeId || 0) === memberId);
          if (byEmployeeId) {
            return byEmployeeId;
          }
        }

        return undefined;
      }

      private getGroupForLoan(loan: CooperativeLoan): CooperativeLoanGroup | undefined {
        const gid = loan.cooperativeGroupId || loan.groupId || 0;
        return this.groupLookup.get(gid);
      }

      private resolveMembershipForLoan(loan: CooperativeLoan, member?: CooperativeMember): CooperativeGroupMembership | undefined {
        const directMembershipId = Number(loan.membershipId || 0);
        if (directMembershipId > 0) {
          const byId = this.memberships.find((item: CooperativeGroupMembership) => Number(item.id) === directMembershipId);
          if (byId) {
            return byId;
          }
        }

        const groupIdNum = Number(loan.cooperativeGroupId || loan.groupId || 0);
        const candidateMemberIds = [
          Number(loan.cooperativeMemberId || 0),
          Number(loan.memberId || 0),
          Number(member?.id || 0),
          Number(member?.memberId || 0),
          Number(member?.employeeId || 0)
        ].filter((value) => value > 0);

        if (!groupIdNum && candidateMemberIds.length > 0) {
          const candidateMemberships = this.memberships.filter((item: CooperativeGroupMembership) =>
            candidateMemberIds.includes(Number(item.memberId))
          );
          const activeMemberships = candidateMemberships.filter((item: CooperativeGroupMembership) => String(item.status || '').toUpperCase() === 'ACTIVE');
          const pool = activeMemberships.length > 0 ? activeMemberships : candidateMemberships;
          return pool[0];
        }

        return this.memberships.find((item: CooperativeGroupMembership) =>
          groupIdNum > 0
          && Number(item.groupId) === groupIdNum
          && candidateMemberIds.includes(Number(item.memberId))
        );
      }

      public getFormattedMembershipId(loan: CooperativeLoan): string {
	const member = this.getMemberForLoan(loan);
	const group = this.getGroupForLoan(loan);
	const memberIdNum = loan.cooperativeMemberId || loan.memberId || member?.id || member?.memberId;
	const membership = this.resolveMembershipForLoan(loan, member);
	const membershipIdRaw = membership?.membershipId || '';
	const groupCode = group?.code;
  return membershipIdRaw && groupCode && memberIdNum ? this.formatMembershipId(String(membershipIdRaw), groupCode, String(memberIdNum)) : '';
  }

  public memberships: CooperativeGroupMembership[] = [];

  public selectedLevel: string = '';

  /**
   * Returns unique level values from inviteCandidates for the filter dropdown
   */
  get inviteCandidateLevels(): string[] {
    const levels = new Set<string>();
    for (const row of this.inviteCandidates) {
      if (row.employee.level) {
        levels.add(row.employee.level);
      }
    }
    return Array.from(levels);
  }

  /**
   * Returns invite candidates filtered by the selected level (if any)
   */
  get filteredInviteCandidates(): InviteCandidateRow[] {
    if (!this.selectedLevel) return this.inviteCandidates;
    return this.inviteCandidates.filter(row => row.employee.level === this.selectedLevel);
  }

  onLevelFilterChange(level: string) {
    this.selectedLevel = level;
  }

  // Format status label for display (e.g., READY_FOR_DISBURSEMENT -> Ready for Disbursement)
  formatStatusLabel(status: string | undefined): string {
    if (!status) return '';
    
    const statusMap: Record<string, string> = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'READY_FOR_DISBURSEMENT': 'Ready for Disbursement',
      'ACTIVE': 'Active',
      'OVERDUE': 'Overdue',
      'SKIPPED': 'Skipped',
      'PAUSED': 'Paused',
      'DEFAULTED': 'Defaulted',
      'COMPLETED': 'Completed',
      'REJECTED': 'Rejected'
    };
    
    return statusMap[status] || status.toLowerCase().replace(/_/g, ' ');
  }

  // Format stage label for display
  formatStageLabel(stage: string | undefined): string {
    if (!stage) return '';
    
    const stageMap: Record<string, string> = {
      'READY_FOR_ADMIN_REVIEW': 'Ready for Review',
      'UNDER_ADMIN_REVIEW': 'Under Review',
      'PENDING_GUARANTOR_APPROVAL': 'Pending Guarantor Approval',
      'INFO_REQUESTED': 'Info Requested'
    };
    
    return stageMap[stage] || stage.toLowerCase().replace(/_/g, ' ');
  }

  // Expose as a public method for template use
  public formatCooperativeLoanCode(raw: string | number | undefined | null): string {
    return _formatCooperativeLoanCode(raw);
  }
  
  // Membership Applications Modal Logic
  pendingMembershipApplications: any[] = [];
  showMembershipApplicationsModal = false;
  showMembershipApplicationViewModal = false;
  selectedMembershipApplication: any = null;
  
  /**
   * Returns a safe display string for a loan's ID/code, truncated if needed.
   */
  getLoanDisplayId(loan: CooperativeLoan | undefined | null): string {
    if (!loan) return '';
    const id = loan.loanCode ?? loan.loanId ?? '';
    const str = id?.toString() ?? '';
    return str.length > 11 ? str.slice(0, 11) + '...' : str;
  }
  
  currentUuid = uuidV4();
  selectedDashboard: 'advance' | 'cooperative' = 'cooperative';
  isDashboardMenuOpen = false;
  stats!: CooperativeStats;
  recentLoans: CooperativeLoan[] = [];
  recentLoanRows: CooperativeDashboardLoanRow[] = [];
  recentMembers: CooperativeMember[] = [];
  recentGroupJoinApplications: GroupJoinApplicationRow[] = [];
  pendingApprovals: CooperativeLoan[] = [];
  recentActivity: DashboardActivity[] = [];
  alerts: DashboardAlert[] = [];
  patronageEstimate = 0;
  showPatronageModal = false;
  patronageYear = 2024;
  patronageYearOptions: number[] = [];
  patronageRate = 20;
  totalInterestCollected = 0;
  totalToDistribute = 0;
  patronageRows: MemberPatronageRow[] = [];
  patronageMessage = '';
  isLoading = true;
  showLoanSummaryModal = false;
  selectedLoanForSummary: CooperativeLoan | null = null;
  employeeDirectory: CooperativeEmployeeProfile[] = [];
  inviteCandidates: InviteCandidateRow[] = [];
  selectedInviteEmployeeIds = new Set<number>();
  inviteMessage = '';
  groupJoinActionMessage = '';
  showInviteMembersModal = false;
  isInviteCandidatesLoading = false;
  showGroupJoinReviewModal = false;
  groupJoinReviewAction: 'approve' | 'reject' = 'approve';
  groupJoinReviewNote = '';
  groupJoinReviewError = '';
  selectedGroupJoinApplication: GroupJoinApplicationRow | null = null;

  private allLoans: CooperativeLoan[] = [];
  private allMembers: CooperativeMember[] = [];
  public readonly memberNameLookup = new Map<number, string>();
  private readonly groupNameLookup = new Map<number, string>();
  private readonly groupCodeLookup = new Map<number, string>();
  private readonly subscriptions = new Subscription();

  cooperativeGroupContext: CooperativeGroupContext = {
    members: [],
    groups: [],
    groupMemberships: [],
    contributionEntries: [],
    saveToStorage: () => {
      // Sync context changes back to CooperativeService arrays
      this.cooperativeService['members'] = [...this.cooperativeGroupContext.members];
      this.cooperativeService['groups'] = [...this.cooperativeGroupContext.groups];
      this.cooperativeService['groupMemberships'] = [...this.cooperativeGroupContext.groupMemberships];
      this.cooperativeService['contributionEntries'] = [...this.cooperativeGroupContext.contributionEntries];
    }
  };

  get adminDisplayName(): string {
    return getSessionUserDisplayName('Admin');
  }

  constructor(
    private cooperativeService: CooperativeService,
    private cooperativeGroupService: CooperativeGroupService,
    private employeeService: EmployeeService,
    private employeeLoanService: EmployeeLoanService,
    private backNavigationService: BackNavigationService,
    private router: Router,
    private route: ActivatedRoute,
    private hostElement: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    console.log('[CooperativeDashboard] ngOnInit running');
    // Preload group data to warm up cache for all loan-management UIs
    this.cooperativeService.loadGroups().subscribe();

    // Always set currentUuid from route params and keep it updated
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        const uuid = params.get('uuid');
        if (uuid) {
          this.currentUuid = uuid;
        }
      })
    );

    this.subscriptions.add(this.route.queryParamMap.subscribe(params => {
      this.selectedDashboard = params.get('dashboard') === 'advance' ? 'advance' : 'cooperative';
    }));

    this.stats = this.cooperativeService.getStats();
    this.loadDashboard();

    // Fetch levels for dynamic filter
    this.employeeLoanService.getAllLevels().subscribe({
      next: (levels) => {
        this.levels = Array.isArray(levels) ? levels : [];
        console.log('Levels loaded for filter:', this.levels);
      },
      error: (err) => {
        this.levels = [];
        console.error('[CooperativeDashboard] Error loading levels:', err);
      }
    });
  }
  
  // Levels for dynamic filter
  levels: any[] = [];

  formatPurposeDisplay(purpose?: string | null): string {
    return formatLoanPurposeDisplay(purpose);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.isDashboardMenuOpen) {
      return;
    }

    if (!this.hostElement.nativeElement.contains(event.target as Node)) {
      this.isDashboardMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.isDashboardMenuOpen = false;
  }

  navigateToCurrentDashboard(): void {
    this.onDashboardSelect(this.selectedDashboard);
  }

  toggleDashboardMenu(event?: Event): void {
    event?.stopPropagation();
    this.isDashboardMenuOpen = !this.isDashboardMenuOpen;
  }

  switchDashboard(value: 'advance' | 'cooperative'): void {
    this.isDashboardMenuOpen = false;
    this.onDashboardSelect(value);
  }

  onDashboardSelect(value: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dashboard: value === 'advance' ? 'advance' : 'cooperative' },
      queryParamsHandling: 'merge'
    });
  }

  get defaultedLoansCount(): number {
    return this.allLoans.filter(loan => loan.status === 'DEFAULTED').length;
  }

  get pendingLoansCount(): number {
    return this.allLoans.filter(loan => loan.status === 'PENDING').length;
  }

  get approvedLoansCount(): number {
    return this.allLoans.filter(loan => loan.status === 'APPROVED' || loan.status === 'READY_FOR_DISBURSEMENT').length;
  }

  get activeLoansCount(): number {
    return this.allLoans.filter(loan => loan.status === 'ACTIVE').length;
  }

  get activeMembersCount(): number {
    return this.allMembers.filter(member => member.status === 'ACTIVE').length;
  }

  private readonly VIEWED_MEMBERS_KEY = 'cooperative-viewed-member-ids';

  private getViewedMemberIds(): Set<number> {
    try {
      const stored = localStorage.getItem(this.VIEWED_MEMBERS_KEY);
      if (stored) {
        return new Set<number>(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    return new Set<number>();
  }

  private markMemberAsViewed(id: number): void {
    const viewed = this.getViewedMemberIds();
    viewed.add(id);
    try {
      localStorage.setItem(this.VIEWED_MEMBERS_KEY, JSON.stringify(Array.from(viewed)));
    } catch {
      // ignore storage errors
    }
  }

  get newMembersCount(): number {
    const viewed = this.getViewedMemberIds();
    return this.allMembers.filter(member => member.status === 'ACTIVE' && !viewed.has(member.id)).length;
  }

  get groupsCount(): number {
    return this.cooperativeGroupContext.groups.length;
  }

  get availableFundBalance(): number {
    return Math.max((this.stats?.totalFund || 0) - (this.stats?.loanPortfolio || 0), 0);
  }

  get totalBalance(): number {
    return this.allLoans
      .filter((loan) => loan.status === 'ACTIVE')
      .reduce((sum, loan) => sum + Number(
        loan.outstandingBalance ||
        loan.outstandingPrincipal ||
        Math.max(Number(loan.totalRepayment || loan.totalRepayable || 0) - Number(loan.totalPaid || 0), 0)
      ), 0);
  }

  getAdminInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  loadDashboard(): void {
    const loadProfiler = startLoanLoadProfiler('cooperative-admin-dashboard');
    this.isLoading = true;

    forkJoin({
      groups: this.cooperativeService.loadGroups(),
      loans: this.cooperativeService.refreshLoans(),
      members: this.cooperativeService.getMembers(),
      memberships: this.cooperativeService.loadGroupMemberships(),
      contributions: this.cooperativeService.loadContributionEntries()
    }).subscribe({
      next: ({ groups, loans, members, memberships }: { groups: CooperativeLoanGroup[]; loans: CooperativeLoan[]; members: CooperativeMember[]; memberships: CooperativeGroupMembership[]; contributions: any }) => {
        // Loans
        this.allLoans = [...loans];
        // Helper to extract numeric part of loan ID
        const getNumericLoanId = (loan: CooperativeLoan): number => {
          const idStr = (loan.loanCode ?? loan.loanId ?? loan.id ?? '').toString();
          // Extract trailing digits (e.g., 'COP-123' -> 123)
          const match = idStr.match(/(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        };
        this.recentLoans = [...loans]
          .sort((a: CooperativeLoan, b: CooperativeLoan) => getNumericLoanId(b) - getNumericLoanId(a))
          .slice(0, 5);
        this.pendingApprovals = loans
          .filter((loan: CooperativeLoan) => loan.status === 'PENDING' && loan.applicationStage === 'READY_FOR_ADMIN_REVIEW')
          .sort((a: CooperativeLoan, b: CooperativeLoan) => getNumericLoanId(b) - getNumericLoanId(a))
          .slice(0, 5);
        this.patronageEstimate = this.estimatePatronage();
        this.refreshPatronageYearOptions();

        // Members
        this.allMembers = [...members];
        this.rebuildLookups(members, groups || []);
        this.recentMembers = [...members]
          .sort((a: CooperativeMember, b: CooperativeMember) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
          .slice(0, 5);
        this.memberships = memberships || [];
        console.log('[CooperativeDashboard] memberships loaded:', this.memberships);
        this.recentLoanRows = this.recentLoans.map((loan) => this.buildRecentLoanRow(loan));

        // Dependent refreshes
        this.stats = this.cooperativeService.getStats();
        this.loadRecentGroupJoinApplications();
        this.refreshDashboardSignals();
        this.refreshInviteCandidates();
        loadProfiler.success({ loans: this.allLoans.length, members: this.allMembers.length });
        this.isLoading = false;
      },
      error: () => {
        forkJoin({
          groups: this.cooperativeService.loadGroups(),
          loans: this.cooperativeService.refreshLoans(),
          members: this.cooperativeService.getMembers(),
          memberships: this.cooperativeService.loadGroupMemberships(),
          contributions: this.cooperativeService.loadContributionEntries()
        }).subscribe({
          next: ({ groups, loans, members, memberships }: { groups: CooperativeLoanGroup[]; loans: CooperativeLoan[]; members: CooperativeMember[]; memberships: CooperativeGroupMembership[]; contributions: any }) => {
            // Loans
            this.allLoans = [...loans];
            this.recentLoans = [...loans]
              .sort((a: CooperativeLoan, b: CooperativeLoan) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
              .slice(0, 5);
            this.pendingApprovals = loans
              .filter((loan: CooperativeLoan) => loan.status === 'PENDING' && loan.applicationStage === 'READY_FOR_ADMIN_REVIEW')
              .sort((a: CooperativeLoan, b: CooperativeLoan) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
              .slice(0, 5);
            this.patronageEstimate = this.estimatePatronage();
            this.refreshPatronageYearOptions();

            // Members
            this.allMembers = [...members];
            this.rebuildLookups(members, groups || []);
            this.rebuildLookupsForDashboard(members, groups || []);
            this.recentMembers = [...members]
              .sort((a: CooperativeMember, b: CooperativeMember) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
              .slice(0, 5);
            this.memberships = memberships || [];
            this.recentLoanRows = this.recentLoans.map((loan) => {
              const row = this.buildRecentLoanRow(loan);
              row.formattedMembershipId = this.getFormattedMembershipId(loan);
              return row;
            });

            // Dependent refreshes
            this.stats = this.cooperativeService.getStats();
            this.loadRecentGroupJoinApplications();
            this.refreshDashboardSignals();
            this.refreshInviteCandidates();
            loadProfiler.success({ loans: this.allLoans.length, members: this.allMembers.length });
            this.isLoading = false;
          },
          error: () => {
            this.allLoans = [];
            this.allMembers = [];
            this.recentLoans = [];
            this.pendingApprovals = [];
            this.recentMembers = [];
            this.employeeDirectory = [];
            this.stats = this.cooperativeService.getStats();
            this.loadRecentGroupJoinApplications();
            this.refreshDashboardSignals();
            this.refreshInviteCandidates();
            loadProfiler.error({ message: 'Failed to load cooperative dashboard data' });
            this.isLoading = false;
          }
        });
      }
    });
  }

  get inviteCandidatesCount(): number {
    return this.inviteCandidates.length;
  }

  get selectedInviteCount(): number {
    return this.selectedInviteEmployeeIds.size;
  }

  get inviteActionLabel(): string {
    return this.selectedInviteCount === 1 ? 'Invite Member' : 'Invite Members';
  }

  get pendingGroupJoinCount(): number {
    return this.cooperativeService.getGroupMemberships().filter((item: CooperativeGroupMembership) => item.status === 'PENDING').length;
  }

  get pendingExtensionRequestsCount(): number {
    return this.allLoans.reduce((count, loan) => {
      const requests = (loan as any)?.gracePeriodRequests;
      if (!Array.isArray(requests)) {
        return count;
      }
      return count + requests.filter((request: any) => String(request?.status || '').toUpperCase() === 'PENDING').length;
    }, 0);
  }

  get disbursementQueueCount(): number {
    // Show only loans that still need the APPROVED -> READY_FOR_DISBURSEMENT transition.
    return this.allLoans.filter((loan) => loan.status === 'APPROVED').length;
  }

  get activeGroupsCount(): number {
    return this.cooperativeService.getGroups().filter((group: CooperativeLoanGroup) => group.status === 'ACTIVE').length;
  }

  get isAllInviteCandidatesSelected(): boolean {
    return this.inviteCandidates.length > 0 && this.selectedInviteEmployeeIds.size === this.inviteCandidates.length;
  }

  refreshDashboardSignals(): void {
    this.recentActivity = this.buildRecentActivity();
    this.alerts = this.buildAlerts();
  }

  buildRecentActivity(): DashboardActivity[] {
    const activities: DashboardActivity[] = [];
    const memberMap = new Map(this.allMembers.map(member => [member.id, member]));

    const latestLoan = this.recentLoans[0];
    if (latestLoan) {
      const memberId = this.getLoanMemberId(latestLoan);
      const groupId = this.getLoanGroupId(latestLoan);
      const group = groupId ? this.cooperativeService.getGroupById(Number(groupId)) : undefined;
      activities.push({
        icon: 'fas fa-file-signature',
        message: `${this.cooperativeService.getMemberDisplayName(memberId)} applied for ${this.formatCurrency(latestLoan.amount)} (${group?.name || 'Loan'})`,
        time: this.getRelativeTime(latestLoan.requestDate)
      });
    }

    const latestGroupJoin = this.recentGroupJoinApplications[0];
    if (latestGroupJoin) {
      activities.push({
        icon: 'fas fa-users',
        message: `${latestGroupJoin.memberName} requested access to ${latestGroupJoin.groupName}`,
        time: this.getRelativeTime(latestGroupJoin.requestDate)
      });
    }

    const activeLoan = this.allLoans.find(loan => loan.status === 'ACTIVE');
    if (activeLoan) {
      const memberId = this.getLoanMemberId(activeLoan);
      activities.push({
        icon: 'fas fa-money-check-alt',
        message: `${this.cooperativeService.getMemberDisplayName(memberId)} made payment of ${this.formatCurrency(activeLoan.repaymentAmount || activeLoan.repaymentAmount || 0)}`,
        time: '5h ago'
      });
    }

    const latestMember = this.recentMembers[0];
    if (latestMember) {
      activities.push({
        icon: 'fas fa-user-plus',
        message: `New member joined: ${latestMember.fullName}`,
        time: this.getRelativeTime(latestMember.joinDate)
      });
    }

    return activities;
  }

  buildAlerts(): DashboardAlert[] {
    const dashboardAlerts: DashboardAlert[] = [];

    const overdueCount = this.allLoans.filter(loan => this.isLoanOverdue(loan)).length;
    if (overdueCount > 0) {
      dashboardAlerts.push({
        level: 'danger',
        message: `${overdueCount} loan${overdueCount > 1 ? 's are' : ' is'} overdue and require immediate follow-up.`
      });
    }

    const availableFund = this.stats.totalFund - this.stats.loanPortfolio;
    if (availableFund < 100000) {
      dashboardAlerts.push({
        level: 'warning',
        message: `Low cooperative fund balance: ${this.formatCurrency(Math.max(availableFund, 0))} available for new disbursements.`
      });
    }

    if (this.pendingApprovals.length > 0) {
      dashboardAlerts.push({
        level: 'warning',
        message: `${this.pendingApprovals.length} pending approval${this.pendingApprovals.length > 1 ? 's need' : ' needs'} attention.`
      });
    }

    const pendingGroupApplications = this.recentGroupJoinApplications.filter(item => item.status === 'PENDING').length;
    if (pendingGroupApplications > 0) {
      dashboardAlerts.push({
        level: 'warning',
        message: `${pendingGroupApplications} group join request${pendingGroupApplications > 1 ? 's require' : ' requires'} admin review.`
      });
    }

    return dashboardAlerts;
  }

  isLoanOverdue(loan: CooperativeLoan): boolean {
    const disbursedDate = loan.disbursedDate || loan.disbursedDate;
    const duration = loan.duration || loan.repaymentTime || 0;
    if (loan.status !== 'ACTIVE' || !disbursedDate || !duration) {
      return false;
    }

    const disbursedAt = new Date(disbursedDate).getTime();
    const now = Date.now();
    const durationMs = duration * 30 * 24 * 60 * 60 * 1000;

    return now - disbursedAt > durationMs;
  }

  getRelativeTime(dateValue: string): string {
    const now = Date.now();
    const value = new Date(dateValue).getTime();
    const seconds = Math.max(0, Math.floor((now - value) / 1000));

    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days === 1) {
      return 'yesterday';
    }

    return `${days}d ago`;
  }

  estimatePatronage(): number {
    return this.stats.loanPortfolio * 0.02;
  }

  navigateTo(path: string): void {
    if (path === 'loans') {
      this.reviewPendingApprovals();
      return;
    }

    this.router.navigate([`/admin/hr/cooperative/${path}/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  openMembersList(): void {
    this.navigateTo('members');
  }

  openPatronageDistribution(): void {
    this.router.navigate([`/admin/hr/cooperative/patronage-distribution/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  viewMember(id: number): void {
    this.markMemberAsViewed(id);
    this.router.navigate([`/admin/hr/cooperative/members/${id}/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  openGroupJoinHistory(): void {
    this.router.navigate([`/admin/hr/cooperative/group-join-applications/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  // openGroupJoinReviewModal(action: 'approve' | 'reject', application: GroupJoinApplicationRow): void {
  //   this.groupJoinReviewAction = action;
  //   this.selectedGroupJoinApplication = application;
  //   this.groupJoinReviewNote = '';
  //   this.groupJoinReviewError = '';
  //   this.showGroupJoinReviewModal = false;
  // }

  openGroupJoinReviewModal(action: 'approve' | 'reject', application: GroupJoinApplicationRow): void {
  // Close any existing modal first
  this.showGroupJoinReviewModal = false;
  
  // Small delay to ensure modal is closed
  setTimeout(() => {
    this.groupJoinReviewAction = action;
    this.selectedGroupJoinApplication = application;
    this.groupJoinReviewNote = '';
    this.groupJoinReviewError = '';
    this.showGroupJoinReviewModal = true;
  }, 50);
}

  closeGroupJoinReviewModal(): void {
    this.showGroupJoinReviewModal = false;
    this.groupJoinReviewNote = '';
    this.groupJoinReviewError = '';
    this.selectedGroupJoinApplication = null;
  }

  submitGroupJoinReview(): void {
    if (!this.selectedGroupJoinApplication) {
      return;
    }

    if (this.groupJoinReviewAction === 'reject' && !this.groupJoinReviewNote.trim()) {
      this.groupJoinReviewError = 'A rejection reason is required.';
      return;
    }

    if (this.groupJoinReviewAction === 'approve') {
      this.approveGroupJoinApplication(Number(this.selectedGroupJoinApplication.id), this.groupJoinReviewNote.trim());
    } else {
      this.rejectGroupJoinApplication(Number(this.selectedGroupJoinApplication.id), this.groupJoinReviewNote.trim());
    }

    this.closeGroupJoinReviewModal();
  }

  approveGroupJoinApplication(id: number, note = ''): void {
    this.cooperativeService.approveGroupMembership(id, note).subscribe({
      next: (membership) => {
        if (!membership) {
          this.groupJoinActionMessage = 'Unable to approve the selected group join request.';
          return;
        }
        const groupName = this.cooperativeGroupContext.groups.find(g => g.id === membership.groupId)?.name || 'the selected group';
        this.groupJoinActionMessage = `${this.getMemberName(membership.memberId)} has been approved to join ${groupName}.`;
        this.loadDashboard();
      },
      error: () => {
        this.groupJoinActionMessage = 'Unable to approve the selected group join request.';
      }
    });
  }

  rejectGroupJoinApplication(id: number, reason: string): void {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      this.groupJoinActionMessage = 'A rejection reason is required.';
      return;
    }
    this.cooperativeService.rejectGroupMembership(id, trimmedReason).subscribe({
      next: (membership) => {
        if (!membership) {
          this.groupJoinActionMessage = 'Unable to reject the selected group join request.';
          return;
        }
        const groupName = this.cooperativeGroupContext.groups.find(g => g.id === membership.groupId)?.name || 'the selected group';
        this.groupJoinActionMessage = `${this.getMemberName(membership.memberId)} was not approved to join ${groupName}.`;
        this.loadDashboard();
      },
      error: () => {
        this.groupJoinActionMessage = 'Unable to reject the selected group join request.';
      }
    });
  }

  viewLoan(id: number | undefined | null): void {
    if (typeof id !== 'number') return;
    const loan = this.allLoans.find(item => item.id === id);
    if (!loan) {
      return;
    }
    this.selectedLoanForSummary = loan;
    this.showLoanSummaryModal = true;
  }

  closeLoanSummaryModal(): void {
    this.showLoanSummaryModal = false;
    this.selectedLoanForSummary = null;
  }

  getSelectedLoanMemberName(): string {
    if (!this.selectedLoanForSummary) {
      return '';
    }

    return this.getMemberName(this.getLoanMemberId(this.selectedLoanForSummary));
  }

  getSelectedLoangroupName(): string {
    if (!this.selectedLoanForSummary) {
      return '';
    }

    const groupId = this.selectedLoanForSummary ? this.getLoanGroupId(this.selectedLoanForSummary) : '';
    return groupId ? this.groupNameLookup.get(Number(groupId)) || 'N/A' : 'N/A';
  }

  getLoanGroupName(loan: CooperativeLoan): string {
    const groupId = this.getLoanGroupId(loan);
    return groupId ? this.groupNameLookup.get(Number(groupId)) || 'Unknown Group' : 'Ungrouped';
  }

  openCooperativeApprovalForm(loan: CooperativeLoan): void {
    this.closeLoanSummaryModal();
    this.router.navigate([`/admin/hr/cooperative/loans/${loan.id}/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative', mode: 'review' }
    });
  }

  openCooperativeLoanHistory(loanOrMemberId: CooperativeLoan | number): void {
    this.closeLoanSummaryModal();
    let memberId: number | undefined;
    if (typeof loanOrMemberId === 'number') {
      memberId = loanOrMemberId;
    } else if (loanOrMemberId && typeof loanOrMemberId === 'object') {
      memberId = this.getLoanMemberId(loanOrMemberId);
    }
    if (!memberId) return;
    this.router.navigate(['/admin/hr/loan-management/cooperative-member-loan-history', memberId, this.currentUuid], {
      state: { source: 'admin', cooperative: true, uuid: this.currentUuid }
    });
  }

  reviewPendingApprovals(): void {
    this.router.navigate(['/admin/hr/cooperative/loan-approval', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  disburseLoans(): void {
    this.router.navigate(['/admin/hr/cooperative/loan-disbursement', this.currentUuid], {
      queryParams: { status: 'APPROVED', mode: 'disburse', dashboard: 'cooperative' }
    });
  }

  openReports(): void {
    this.router.navigate(['/admin/hr/cooperative/reports', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  reviewDefaultedLoans(): void {
    this.router.navigate(['/admin/hr/cooperative/loan-approval', this.currentUuid], {
      queryParams: { dashboard: 'cooperative', status: 'DEFAULTED' }
    });
  }

  manageLoans(): void {
    this.router.navigate(['/admin/hr/cooperative/loan-approval', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  getSelectedLoanGroupCode(): string {
    const loan = this.selectedLoanForSummary;
    if (!loan) {
      return 'N/A';
    }

    const groupId = this.getLoanGroupId(loan);
    return groupId ? this.groupCodeLookup.get(Number(groupId)) || 'N/A' : 'N/A';
  }

  getSelectedLoanRepayments(loan: CooperativeLoan): CooperativeRepayment[] {
    return this.cooperativeService.getRepaymentsByLoanId(loan.id);
  }

  getPreviewLifecycleStageFields(loan: CooperativeLoan): Array<{ label: string; value: string }> {
    return [
      { label: 'Applied On', value: this.formatPreviewDate(loan.requestDate || loan.applicationDate) },
      { label: 'Approved On', value: this.formatPreviewDate(loan.approvedDate) },
      { label: 'Disbursed On', value: this.formatPreviewDate(loan.disbursedDate) },
      { label: 'Repayment Start', value: this.formatPreviewDate(loan.repaymentStartDate) }
    ];
  }

  formatPreviewDate(dateValue?: string): string {
    if (!dateValue) {
      return 'N/A';
    }

    return new Date(dateValue).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPreviewStatusClass(status?: string): string {
    if (!status) return 'status-default';
    return `status-${String(status).toLowerCase()}`;
  }

  getPreviewAmountPaid(loan: CooperativeLoan): number {
    return Number(loan.totalPaid || 0);
  }

  getPreviewOutstandingBalance(loan: CooperativeLoan): number {
    return Number(loan.outstandingBalance || loan.outstandingPrincipal || Math.max(Number(loan.totalRepayment || loan.totalRepayable || 0) - Number(loan.totalPaid || 0), 0));
  }

  getPreviewLateFeesTotal(loan: CooperativeLoan): number {
    return Number(loan.totalLateFeesAccrued || 0);
  }

  getPreviewOverdueInstallmentsCount(loan: CooperativeLoan): number {
    return this.getSelectedLoanRepayments(loan).filter((repayment) => repayment.status === 'OVERDUE').length;
  }

  getPreviewSkippedInstallmentsCount(loan: CooperativeLoan): number {
    return this.getSelectedLoanRepayments(loan).filter((repayment) => repayment.status === 'SKIPPED').length;
  }

  hasPreviewBeenDisbursed(loan: CooperativeLoan): boolean {
    return !!loan.disbursedDate || ['ACTIVE', 'OVERDUE', 'SKIPPED', 'PAUSED', 'DEFAULTED', 'COMPLETED'].includes(loan.status || '');
  }

  getPreviewProgressPercentage(loan: CooperativeLoan): number {
    const totalRepayable = Number(loan.totalRepayment || loan.totalRepayable || 0);
    if (!totalRepayable) {
      return 0;
    }

    return Math.min((Number(loan.totalPaid || 0) / totalRepayable) * 100, 100);
  }

  getPreviewPaidInstallmentsCount(loan: CooperativeLoan): number {
    return this.getSelectedLoanRepayments(loan).filter((repayment) => repayment.status === 'PAID').length;
  }

  getPreviewTotalInstallmentsCount(loan: CooperativeLoan): number {
    return this.getSelectedLoanRepayments(loan).length;
  }

  getPreviewRepaymentStatusTitle(loan: CooperativeLoan): string {
    if (loan.status === 'PAUSED') {
      return 'Repayment Paused';
    }
    if (loan.status === 'DEFAULTED') {
      return 'Defaulted';
    }
    if (loan.status === 'OVERDUE') {
      return 'Overdue';
    }
    if (loan.status === 'SKIPPED') {
      return 'Grace Shift Active';
    }
    if (loan.status === 'COMPLETED') {
      return 'Completed';
    }
    return this.hasPreviewBeenDisbursed(loan) ? 'Repayment Active' : 'Awaiting Disbursement';
  }

  getPreviewAdminFeedback(loan: CooperativeLoan): StatusHistory | null {
    const timelineComment = [...(loan.statusHistory || [])]
      .filter((item) => !!item?.notes)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())[0];

    return timelineComment || null;
  }

  getLifecycleInstallmentsPreview(loan: CooperativeLoan): CooperativeRepayment[] {
    return this.getSelectedLoanRepayments(loan).slice(0, 6);
  }

  getInstallmentLifecycleLabel(item: CooperativeRepayment): string {
    if (item.status === 'PAID') {
      return 'Paid';
    }
    if (item.status === 'OVERDUE') {
      return 'Overdue';
    }
    if (item.status === 'SKIPPED') {
      return 'Skipped';
    }
    return 'Upcoming';
  }

  getSelectedLoanPaymentHistory(loan: CooperativeLoan): PaymentHistory[] {
    return [...(loan.paymentHistory || [])]
      .sort((left, right) => new Date(right.paidAt || right.recordedAt || 0).getTime() - new Date(left.paidAt || left.recordedAt || 0).getTime())
      .slice(0, 4);
  }

  getPaymentMethodLabel(method?: string): string {
    switch (String(method || '').toUpperCase()) {
      case 'BANK_TRANSFER':
        return 'Bank Transfer';
      case 'CASH':
        return 'Cash';
      case 'PAYROLL_DEDUCTION':
        return 'Payroll Deduction';
      case 'CHEQUE':
        return 'Cheque';
      case 'MOBILE_MONEY':
        return 'Mobile Money';
      default:
        return method || 'Not set';
    }
  }

  openPurposeManagement(): void {
    const routeBase = this.router.url.includes('/admin/hr/')
      ? '/admin/hr/cooperative'
      : '/cooperative';
    const targetUuid = this.currentUuid || uuidV4();

    this.router.navigate([`${routeBase}/loan-purposes`, targetUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  openGracePeriodRequests(): void {
    const routeBase = this.router.url.includes('/admin/hr/')
      ? '/admin/hr/cooperative'
      : '/cooperative';
    const targetUuid = this.currentUuid || uuidV4();

    this.router.navigate([`${routeBase}/grace-period-requests`, targetUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  openInviteMembersModal(): void {
    this.inviteMessage = '';
    this.selectedInviteEmployeeIds.clear();
    this.showInviteMembersModal = true;
    this.ensureInviteCandidatesLoaded();
  }

  closeInviteMembersModal(): void {
    this.showInviteMembersModal = false;
  }

  toggleInviteSelection(employeeId: number): void {
    if (this.selectedInviteEmployeeIds.has(employeeId)) {
      this.selectedInviteEmployeeIds.delete(employeeId);
      return;
    }
    this.selectedInviteEmployeeIds.add(employeeId);
  }

  isInviteSelected(employeeId: number): boolean {
    return this.selectedInviteEmployeeIds.has(employeeId);
  }

  selectAllInviteCandidates(): void {
    if (this.isAllInviteCandidatesSelected) {
      this.selectedInviteEmployeeIds.clear();
      return;
    }

    this.selectedInviteEmployeeIds = new Set<number>(this.inviteCandidates.map(item => item.employee.employeeId));
  }

  inviteSelectedCandidates(): void {
    if (this.selectedInviteEmployeeIds.size === 0) {
      this.inviteMessage = 'Select at least one employee to invite.';
      return;
    }

    const selectedRows = this.inviteCandidates.filter(item => this.selectedInviteEmployeeIds.has(item.employee.employeeId));
    const successfulInvites = selectedRows
      .map(item => this.cooperativeService.inviteEmployee(item.employee))
      .filter(result => result.success).length;

    this.inviteMessage = `${successfulInvites} invite(s) processed successfully. Congratulations messages with activation links were delivered to selected employee account updates.`;
    this.selectedInviteEmployeeIds.clear();
    this.refreshInviteCandidates();
  }

  runPatronageCalculator(): void {
    this.patronageEstimate = this.estimatePatronage();
    this.patronageMessage = '';
    this.refreshPatronageYearOptions();
    this.showPatronageModal = true;
    this.calculatePatronage();
  }

  setPatronageYear(yearValue: number | string): void {
    const parsedYear = Number(yearValue);
    if (!Number.isFinite(parsedYear)) {
      return;
    }

    this.patronageYear = parsedYear;
    this.calculatePatronage();
  }

  closePatronageModal(): void {
    this.showPatronageModal = false;
  }

  calculatePatronage(): void {
    const loansById = new Map(this.allLoans.map(loan => [loan.id, loan]));
    const memberById = new Map(this.allMembers.map(member => [member.id, member]));
    const activeLoanMembers = new Set<number>(
      this.allLoans
        .filter(loan => loan.status === 'ACTIVE')
        .map(loan => this.getLoanMemberId(loan))
        .filter((memberId): memberId is number => typeof memberId === 'number' && !isNaN(memberId))
    );

    const paidRepayments = this.allLoans
      .flatMap(loan => this.cooperativeService.getRepaymentsByLoanId(loan.id))
      .filter(repayment => {
        if (!repayment.paidDate || repayment.status !== 'PAID') {
          return false;
        }

        return new Date(repayment.paidDate).getFullYear() === this.patronageYear;
      });

    const interestByMember = new Map<number, number>();

    paidRepayments.forEach(repayment => {
      const loan = loansById.get(repayment.loanId);
      if (!loan || !loan.totalRepayment) {
        return;
      }

      const interestRatio = Math.max((loan.totalRepayment - loan.amount) / loan.totalRepayment, 0);
      const interestPortion = Number((repayment.amount * interestRatio).toFixed(2));
      const memberId = this.getLoanMemberId(loan);
      if (typeof memberId !== 'number' || isNaN(memberId)) {
        return;
      }

      const previous = interestByMember.get(memberId) || 0;
      interestByMember.set(memberId, Number((previous + interestPortion).toFixed(2)));
    });

    this.totalInterestCollected = Number(
      Array.from(interestByMember.values()).reduce((sum, value) => sum + value, 0).toFixed(2)
    );
    this.totalToDistribute = Number((this.totalInterestCollected * (this.patronageRate / 100)).toFixed(2));

    this.patronageRows = Array.from(memberById.values())
      .map(member => {
        const interestPaid = interestByMember.get(Number(member.id)) || 0;
        const patronageAmount = Number((interestPaid * (this.patronageRate / 100)).toFixed(2));
        const hasActiveLoan = activeLoanMembers.has(Number(member.id));
        return {
          memberId: member.id,
          memberName: member.fullName,
          interestPaid,
          patronageAmount,
          distributionMethod: hasActiveLoan ? 'APPLY_TO_LOAN' : 'ADD_TO_SHARES',
          hasActiveLoan
        } as MemberPatronageRow;
      })
      .filter(item => item.interestPaid > 0)
      .sort((a, b) => b.interestPaid - a.interestPaid);
  }

  onDistributionMethodChange(row: MemberPatronageRow, method: PatronageDistributionMethod): void {
    row.distributionMethod = method;
  }

  approvePatronageDistribution(): void {
    if (this.patronageRows.length === 0 || this.totalToDistribute <= 0) {
      this.patronageMessage = 'No patronage available to distribute for the selected year.';
      return;
    }

    this.patronageRows.forEach(row => {
      const member = this.allMembers.find(item => item.id === row.memberId);
      if (!member || row.patronageAmount <= 0) {
        return;
      }

      if (row.distributionMethod === 'ADD_TO_SHARES') {
        member.shareCapital = Number((member.shareCapital + row.patronageAmount).toFixed(2));
        this.cooperativeService.updateMember({ ...member }).subscribe();
        return;
      }

      if (row.distributionMethod === 'APPLY_TO_LOAN') {
        this.cooperativeService.applyPatronageToMemberLoan(Number(row.memberId), row.patronageAmount).subscribe((result: { appliedAmount: number; loanId?: number }) => {
          if (result.appliedAmount <= 0) {
            member.shareCapital = Number((member.shareCapital + row.patronageAmount).toFixed(2));
            this.cooperativeService.updateMember({ ...member }).subscribe();
          }
        });
        return;
      }
    });

    this.patronageMessage = `Patronage distribution approved for ${this.patronageRows.length} member(s).`;
    this.loadDashboard();
    this.calculatePatronage();
  }

  exportPatronageReport(): void {
    if (this.patronageRows.length === 0) {
      this.patronageMessage = 'No patronage data to export for the selected year.';
      return;
    }

    const headers = ['Member', 'Interest Paid', 'Patronage', 'Distribution Method'];
    const rows = this.patronageRows.map(item => [
      item.memberName,
      item.interestPaid.toFixed(2),
      item.patronageAmount.toFixed(2),
      this.getDistributionMethodLabel(item.distributionMethod)
    ]);

    const csvContent = [headers, ...rows]
      .map(line => line.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `patronage-distribution-${this.patronageYear}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  printPatronageReport(): void {
    window.print();
  }

  getDistributionMethodLabel(method: PatronageDistributionMethod): string {
    if (method === 'ADD_TO_SHARES') {
      return 'Add to Shares';
    }

    if (method === 'CASH_PAYOUT') {
      return 'Cash Payout';
    }

    return 'Apply to Loan';
  }

  private refreshPatronageYearOptions(): void {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set<number>([currentYear]);

    this.allLoans.forEach(loan => {
      this.cooperativeService.getRepaymentsByLoanId(loan.id).forEach((repayment: CooperativeRepayment) => {
        if (repayment.paidDate) {
          yearSet.add(new Date(repayment.paidDate).getFullYear());
        }
      });
    });

    this.patronageYearOptions = Array.from(yearSet).sort((a, b) => b - a);

    if (this.patronageYearOptions.length > 0 && !this.patronageYearOptions.includes(this.patronageYear)) {
      this.patronageYear = this.patronageYearOptions[0];
    }
  }

  goToPendingApproval(loanId: number): void {
    this.router.navigate([`/admin/hr/cooperative/loans/${loanId}/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  getMemberName(memberId: number | undefined): string {
    if (typeof memberId === 'number' && memberId > 0) {
      const byId = this.allMembers.find((member) => Number(member.id) === memberId);
      if (byId?.fullName) {
        return byId.fullName;
      }

      const byMemberId = this.allMembers.find((member) => Number(member.memberId || 0) === memberId);
      if (byMemberId?.fullName) {
        return byMemberId.fullName;
      }

      const byEmployeeId = this.allMembers.find((member) => Number(member.employeeId || 0) === memberId);
      if (byEmployeeId?.fullName) {
        return byEmployeeId.fullName;
      }
    }
    return 'Unknown Member';
  }

  getMemberNameForLoan(loan: CooperativeLoan): string {
    return this.getMemberForLoan(loan)?.fullName || 'Unknown Member';
  }

  public getLoanMemberId(loan: CooperativeLoan): number {
    return loan.cooperativeMemberId || loan.memberId || 0;
  }

  private getLoanGroupId(loan: CooperativeLoan): number {
    return loan.groupId || loan.cooperativeGroupId || 0;
  }

  getInviteTenureLabel(employee: CooperativeEmployeeProfile): string {
    const startDate = new Date(employee.employmentStartDate);
    const now = new Date();
    let months = (now.getFullYear() - startDate.getFullYear()) * 12;
    months += now.getMonth() - startDate.getMonth();
    if (now.getDate() < startDate.getDate()) {
      months -= 1;
    }

    return `${Math.max(months, 0)}mo`;
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  private loadRecentGroupJoinApplications(): void {
    // Sync context with latest members/groups/memberships
    this.cooperativeGroupContext.members = [...this.allMembers];
    this.cooperativeGroupContext.groups = [...this.cooperativeService.getGroups()];
    this.cooperativeGroupContext.groupMemberships = [...this.cooperativeService.getGroupMemberships()];

    const memberMap = new Map(this.cooperativeGroupContext.members.map(member => [member.id, member]));
    const groupMap = new Map<number, CooperativeLoanGroup>(this.cooperativeGroupContext.groups.map((group: CooperativeLoanGroup) => [group.id, group]));

    this.recentGroupJoinApplications = this.cooperativeGroupService.getGroupMemberships(this.cooperativeGroupContext)
      .filter((membership: CooperativeGroupMembership) => membership.status === 'PENDING')
      .map((membership: CooperativeGroupMembership) => {
        const member = memberMap.get(membership.memberId) || this.cooperativeService.getMemberById(membership.memberId);
        const group = groupMap.get(membership.groupId);

        return {
          id: membership.id,
          memberId: membership.memberId,
          memberName: this.cooperativeService.getMemberDisplayName(membership.memberId),
          memberCode: member?.memberId || membership.memberId,
          groupId: membership.groupId,
          groupName: group?.name || 'Unknown group',
          status: membership.status,
          requestDate: membership.requestedAt || membership.joinedAt || new Date().toISOString(),
          reviewedAt: membership.reviewedAt,
          rejectionReason: membership.rejectionReason
        } satisfies GroupJoinApplicationRow;
      })
      .sort((a: any, b: any) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
      .slice(0, 5);
  }

  private refreshInviteCandidates(): void {
    const memberEmails = new Set(this.allMembers.map(member => member.email.toLowerCase()));
    this.inviteCandidates = this.employeeDirectory
      .map(employee => ({
        employee,
        eligibility: this.cooperativeService.checkMembershipEligibility(employee)
      }))
      .filter(item =>
        item.eligibility.canBeInvited &&
        !memberEmails.has(item.employee.email.toLowerCase())
      );
  }

  private ensureInviteCandidatesLoaded(): void {
    if (this.employeeDirectory.length > 0) {
      this.refreshInviteCandidates();
      return;
    }

    this.isInviteCandidatesLoading = true;
    this.employeeService.getAllEmployee().pipe(catchError(() => of([]))).subscribe({
      next: (employees) => {
        const rawEmployees = Array.isArray(employees) ? employees : [];
        this.employeeDirectory = rawEmployees
          .map((employee: any) => this.mapEmployeeToProfile(employee))
          .filter((employee: CooperativeEmployeeProfile | null): employee is CooperativeEmployeeProfile => !!employee);
        this.refreshInviteCandidates();
        this.isInviteCandidatesLoading = false;
      },
      error: () => {
        this.employeeDirectory = [];
        this.refreshInviteCandidates();
        this.isInviteCandidatesLoading = false;
      }
    });
  }

  private mapEmployeeToProfile(employee: any): CooperativeEmployeeProfile | null {
    console.log('Raw employee object:', employee);
    const firstName = String(employee?.firstName || '').trim();
    const lastName = String(employee?.lastName || '').trim();
    const fallbackName = String(employee?.fullName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || fallbackName;
    const email = String(employee?.email || employee?.workEmail || '').trim();

    if (!fullName || !email) {
      return null;
    }

    const employeeId = String(employee?.id ?? employee?.employeeId ?? employee?.staffId ?? '');
    if (!employeeId) {
      return null;
    }

    const departmentName =
      String(employee?.department?.name || employee?.department || employee?.unit || '').trim() || 'Unassigned';

    const levelName = String(employee?.level?.name || employee?.level || employee?.jobTitle || '').trim();
    const employmentTypeName = String(
      employee?.employmentType?.name || employee?.employmentType || employee?.jobType?.name || employee?.jobType || ''
    ).trim();

    const employmentStartDate =
      employee?.employementStartDate || employee?.employmentStartDate || employee?.hireDate || employee?.createdAt;

    return {
      employeeId: Number(employeeId),
      fullName,
      email,
      phone: String(employee?.phone || '').trim(),
      department: departmentName,
      level: levelName,
      employmentType: this.mapEmploymentType(employmentTypeName),
      employmentStartDate: employmentStartDate || new Date().toISOString(),
      onProbation: Boolean(employee?.onProbation),
      probationEndDate: employee?.probationEndDate,
      hasActiveDisciplinaryIssue: Boolean(employee?.hasActiveDisciplinaryIssue || employee?.disciplinaryCaseOpen),
      managerId: String(employee?.supervisor?.id || employee?.supervisor || employee?.managerId || '').trim() || undefined
    };
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

  goBack(): void {
    this.backNavigationService.goBack(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  openMembershipApplicationsModal(): void {
    this.loadPendingMembershipApplications();
    this.showMembershipApplicationsModal = true;
  }

  closeMembershipApplicationsModal(): void {
    this.showMembershipApplicationsModal = false;
  }

  loadPendingMembershipApplications(): void {
    this.pendingMembershipApplications = this.cooperativeService.getPendingMembershipApplications();
  }

  openMembershipApplicationView(application: any): void {
    this.selectedMembershipApplication = application;
    this.showMembershipApplicationViewModal = true;
  }

  closeMembershipApplicationViewModal(): void {
    this.showMembershipApplicationViewModal = false;
    this.selectedMembershipApplication = null;
  }

  approveMembershipApplication(applicationId: number): void {
    this.cooperativeService.approveMembershipApplication(applicationId).then(() => {
      this.loadPendingMembershipApplications();
      this.closeMembershipApplicationViewModal();
    });
  }

  rejectMembershipApplication(applicationId: number): void {
    this.cooperativeService.rejectMembershipApplication(applicationId).then(() => {
      this.loadPendingMembershipApplications();
      this.closeMembershipApplicationViewModal();
    });
  }
}