import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { forkJoin, of, timeout, catchError } from 'rxjs';
import { map } from 'rxjs/operators';
import { Message } from 'primeng/api';
import { EmployeeService } from '../../../service/employee.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import {
  CooperativeEmployeeProfile,
  CooperativeGroupMembership,
  CooperativeGroupInviteHistoryEntry,
  CooperativeLoanGroup,
  CooperativeMember,
  CooperativeStaffRank
} from '../../../service/loan/cooperative-loan/cooperative.types';
import { environment } from '../../../shared-component/environments/environment';

interface GroupMetrics {
  memberCount: number;
  totalContribution: number;
  members: Array<{ name: string; monthlyContributionAmount: number; totalContribution: number }>;
}

interface GroupTableRow {
  id: number;
  code: string;
  name: string;
  description: string;
  memberCount: number;
  totalContribution: number;
  monthlyContributionAmount: number;
  withdrawCap: number;
  memberLimit?: number;
  contributionsBankName?: string;
  contributionsAccount?: string;
  principalBankName?: string;
  principalCollectionAccount?: string;
  interestBankName?: string;
  interestCollectionAccount?: string;
  lateFeeBankName?: string;
  lateFeeCollectionAccount?: string;
  interestRate: number;
  patronageRate: number;
  requiresGuarantors: boolean;
  minimumGuarantors: number;
  accountingEmail: string;
  lateFeePercentage: number;
  lateFeeGraceDays: number;
  hasAccountingConfiguration: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

type InviteTenureFilter = 'ALL' | 'UNDER_6_MONTHS' | 'SIX_TO_TWELVE_MONTHS' | 'ONE_TO_THREE_YEARS' | 'OVER_THREE_YEARS';

interface GroupInviteEmployeeRow {
  employeeId: number;
  fullName: string;
  email: string;
  department: string;
  level?: string;
  employmentStartDate: string;
  tenureMonths: number;
  monthlySalary: number;
}

type GroupFormValueSource = Omit<Partial<CooperativeLoanGroup>, 'memberLimit'> & {
  code?: string;
  name?: string;
  description?: string;
  memberLimit?: number | null;
  status?: 'ACTIVE' | 'INACTIVE';
};

@Component({
  selector: 'app-cooperative-loan-groups',
  templateUrl: './cooperative-loan-groups.component.html',
  styleUrls: ['./cooperative-loan-groups.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CooperativeLoanGroupsComponent implements OnInit {
  // ==================== PROPERTIES ====================
  inviteLevelOptions: string[] = [];
  currentUuid = uuidV4();
  private readonly bankAccountPattern = /^\d{10}$/;
  groups: CooperativeLoanGroup[] = [];
  members: CooperativeMember[] = [];
  employeeDirectory: GroupInviteEmployeeRow[] = [];
  employeeSalaryById: Record<number, number> = {};
  groupMetricsById: Record<number, GroupMetrics> = {};
  groupSummaryRows: GroupTableRow[] = [];
  filteredGroups: GroupTableRow[] = [];
  showGroupForm = false;
  showGroupDetails = false;
  showInviteMembersModal = false;
  selectedGroupForDetails: CooperativeLoanGroup | null = null;
  selectedGroupForInvite: CooperativeLoanGroup | null = null;
  selectedGroupInviteHistory: CooperativeGroupInviteHistoryEntry[] = [];
  editingGroupId: number | null = null;
  groupForm!: FormGroup;
  inviteDepartmentFilter = 'ALL';
  inviteLevelFilter: string | 'ALL' = 'ALL';
  inviteTenureFilter: InviteTenureFilter = 'ALL';
  selectedInviteEmployeeIds = new Set<number>();
  inviteMessage = '';
  isSendingInviteEmails = false;
  formMessage = '';
  formMessageSeverity: 'success' | 'error' | 'info' | 'warn' = 'info';
  messages: Message[] = [];
  searchTerm = '';
  isSubmitting = false;
  isDeleting = false;
  groupToDelete: GroupTableRow | null = null;
  showDeleteModal = false;
  
  // Loading states
  isLoading = true;
  isLoadingGroups = true;
  isLoadingMembers = true;
  isLoadingEmployees = true;
  loadError = '';
  errorDetails = '';
  currentPage = 1;
  pageSize = 10;
  currentInvitePage = 1;
  invitePageSize = 10;
  
  // Sorting properties
  sortField = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';

  readonly inviteTenureOptions: Array<{ value: InviteTenureFilter; label: string }> = [
    { value: 'ALL', label: 'All tenures' },
    { value: 'UNDER_6_MONTHS', label: 'Under 6 months' },
    { value: 'SIX_TO_TWELVE_MONTHS', label: '6 to 12 months' },
    { value: 'ONE_TO_THREE_YEARS', label: '1 to 3 years' },
    { value: 'OVER_THREE_YEARS', label: 'Over 3 years' }
  ];

  // ==================== COMPUTED PROPERTIES ====================
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredGroups.length / this.pageSize));
  }

  get paginatedGroupRows(): GroupTableRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredGroups.slice(start, start + this.pageSize);
  }

  get inviteTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredInviteEmployees.length / this.invitePageSize));
  }

  get paginatedInviteEmployees(): GroupInviteEmployeeRow[] {
    const start = (this.currentInvitePage - 1) * this.invitePageSize;
    return this.filteredInviteEmployees.slice(start, start + this.invitePageSize);
  }

  get activeGroupCount(): number {
    return this.groups.filter(group => group.status === 'ACTIVE').length;
  }

  get inactiveGroupCount(): number {
    return this.groups.filter(group => group.status !== 'ACTIVE').length;
  }

  get totalMembersAcrossGroups(): number {
    return this.groupSummaryRows.reduce((sum, row) => sum + row.memberCount, 0);
  }

  get totalContributionsAcrossGroups(): number {
    return this.groupSummaryRows.reduce((sum, row) => sum + row.totalContribution, 0);
  }

  get configuredAccountingGroupCount(): number {
    return this.groupSummaryRows.filter(row => row.hasAccountingConfiguration).length;
  }

  get inviteDepartmentOptions(): string[] {
    return [...new Set(this.employeeDirectory.map(employee => employee.department).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  }

  get filteredInviteEmployees(): GroupInviteEmployeeRow[] {
    const invitedIds = this.selectedGroupForInvite
      ? new Set(this.selectedGroupInviteHistory.map(entry => entry.employeeId))
      : new Set<number>();
    return this.employeeDirectory.filter(employee => {
      if (invitedIds.has(employee.employeeId)) return false;
      const matchesDepartment = this.inviteDepartmentFilter === 'ALL' || employee.department === this.inviteDepartmentFilter;
      const matchesLevel = this.inviteLevelFilter === 'ALL' || (employee.level && employee.level.toLowerCase() === String(this.inviteLevelFilter).toLowerCase());
      const matchesTenure = this.matchesTenureFilter(employee.tenureMonths, this.inviteTenureFilter);
      return matchesDepartment && matchesLevel && matchesTenure;
    });
  }

  get selectableFilteredInviteEmployees(): GroupInviteEmployeeRow[] {
    return this.filteredInviteEmployees.filter(employee => this.canInviteEmployee(employee));
  }

  get selectedInviteCount(): number {
    return this.selectedInviteEmployeeIds.size;
  }

  get isAllVisibleInviteEmployeesSelected(): boolean {
    return this.selectableFilteredInviteEmployees.length > 0 &&
      this.selectableFilteredInviteEmployees.every(employee => this.selectedInviteEmployeeIds.has(employee.employeeId));
  }

  get inviteEmailSubject(): string {
    if (!this.selectedGroupForInvite) return 'New cooperative group available';
    return `New cooperative group available: ${this.selectedGroupForInvite.name}`;
  }

  get inviteEmailBodyPreview(): string {
    if (!this.selectedGroupForInvite) return '';
    return `A new cooperative group, ${this.selectedGroupForInvite.name}, is now open for applications. Visit your "My Membership" dashboard to review the group and submit an application if you are interested. Please note that applications still go through the normal review process and may be declined if the group criteria are not met.`;
  }

  get inviteActionLabel(): string {
    return this.selectedInviteCount === 1 ? 'Send Invite Email' : 'Send Invite Emails';
  }

  // ==================== GETTERS FOR FORM CONTROL ====================
  get nameControl() { return this.groupForm.get('name'); }
  get codeControl() { return this.groupForm.get('code'); }
  get descriptionControl() { return this.groupForm.get('description'); }

  get isCodeReadonly(): boolean {
    if (this.editingGroupId === null) {
      return false;
    }

    return !!String(this.codeControl?.value || '').trim();
  }

  // ==================== CONSTRUCTOR ====================
  constructor(
    private cooperativeService: CooperativeService,
    private employeeService: EmployeeService,
    private employeeLoanService: EmployeeLoanService,
    private mailNotificationService: MailNotificationService,
    private http: HttpClient,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private backNavigationService: BackNavigationService
  ) {}

  // ==================== LIFECYCLE HOOKS ====================
  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    this.initializeForm();
    this.loadLevels();
    this.loadInitialData();
  }

  // ==================== INITIALIZATION METHODS ====================
  private loadLevels(): void {
    this.employeeLoanService.getAllLevels().subscribe({
      next: (levels: any[]) => {
        if (Array.isArray(levels)) {
          this.inviteLevelOptions = levels.map(l => l.name || l.level || l).filter(Boolean);
        } else {
          this.inviteLevelOptions = [];
        }
      },
      error: () => {
        this.inviteLevelOptions = [];
      }
    });
  }

  initializeForm(): void {
    this.groupForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: ['', Validators.required],
      monthlyContributionAmount: [1000, [Validators.required, Validators.min(1)]],
      withdrawCap: [0, [Validators.required, Validators.min(0)]],
      interestRate: [0, [Validators.required, Validators.min(0)]],
      memberLimit: [null, Validators.min(1)],
      contributionsBankName: ['', Validators.required],
      contributionsAccount: ['', [Validators.required, Validators.pattern(this.bankAccountPattern)]],
      principalBankName: ['', Validators.required],
      principalCollectionAccount: ['', [Validators.required, Validators.pattern(this.bankAccountPattern)]],
      interestBankName: ['', Validators.required],
      interestCollectionAccount: ['', [Validators.required, Validators.pattern(this.bankAccountPattern)]],
      lateFeePercentage: [0, [Validators.required, Validators.min(0)]],
      lateFeeBankName: ['', Validators.required],
      lateFeeCollectionAccount: ['', [Validators.required, Validators.pattern(this.bankAccountPattern)]],
      lateFeeGraceDays: [0, [Validators.required, Validators.min(0)]],
      accountingEmail: ['', [Validators.required, Validators.email]],
      accountingWebhookUrl: [''],
      requiresGuarantors: [false],
      minimumGuarantors: [0],
      patronageEligible: [true],
      patronageRate: [0, [Validators.required, Validators.min(0)]],
      status: ['ACTIVE', Validators.required]
    });

    this.groupForm.get('requiresGuarantors')?.valueChanges.subscribe((enabled) => {
      const minimumGuarantorsControl = this.groupForm.get('minimumGuarantors');
      if (!minimumGuarantorsControl) return;
      if (enabled) {
        minimumGuarantorsControl.setValidators([Validators.required, Validators.min(1)]);
        if (Number(minimumGuarantorsControl.value || 0) < 1) minimumGuarantorsControl.setValue(1);
      } else {
        minimumGuarantorsControl.clearValidators();
        minimumGuarantorsControl.setValue(0);
      }
      minimumGuarantorsControl.updateValueAndValidity({ emitEvent: false });
    });

    this.groupForm.get('patronageEligible')?.valueChanges.subscribe(enabled => {
      if (!enabled) this.groupForm.get('patronageRate')?.setValue(0);
    });
  }

  // ==================== DATA LOADING METHODS ====================
  public loadInitialData(): void {
    this.isLoading = true;
    this.isLoadingGroups = true;
    this.isLoadingMembers = true;
    this.isLoadingEmployees = true;
    this.loadError = '';
    this.errorDetails = '';
    
    this.cooperativeService.loadGroups().pipe(timeout(30000)).subscribe({
      next: (apiGroups: any[]) => {
        this.groups = (apiGroups || []).map((apiGroup: any) => this.mapApiGroupToCooperativeLoanGroup(apiGroup));
        this.isLoadingGroups = false;
        
        this.cooperativeService.getMembers().pipe(timeout(30000)).subscribe({
          next: (members: CooperativeMember[]) => {
            this.members = members || [];
            this.isLoadingMembers = false;
            
            this.cooperativeService.loadGroupMemberships().pipe(timeout(30000)).subscribe({
              next: () => {
                this.employeeService.getAllEmployee().pipe(timeout(30000)).subscribe({
                  next: (employees: any[]) => {
                    this.employeeDirectory = (Array.isArray(employees) ? employees : [])
                      .map((employee: any) => this.mapEmployeeToInviteRow(employee))
                      .filter((employee): employee is GroupInviteEmployeeRow => !!employee)
                      .sort((left, right) => left.fullName.localeCompare(right.fullName));
                    
                    this.isLoadingEmployees = false;
                    this.rebuildGroupMetrics();
                    
                    if (this.employeeDirectory.length > 0) {
                      this.loadEmployeeSalariesDebug();
                    }
                    
                    this.isLoading = false;
                  },
                  error: (error) => {
                    console.error('Failed to load employees:', error);
                    this.loadError = 'Failed to load employees.';
                    this.isLoadingEmployees = false;
                    this.isLoading = false;
                    this.rebuildGroupMetrics();
                  }
                });
              },
              error: (error) => {
                console.error('Failed to load memberships:', error);
                this.employeeService.getAllEmployee().pipe(timeout(30000)).subscribe({
                  next: (employees: any[]) => {
                    this.employeeDirectory = (Array.isArray(employees) ? employees : [])
                      .map((employee: any) => this.mapEmployeeToInviteRow(employee))
                      .filter((employee): employee is GroupInviteEmployeeRow => !!employee)
                      .sort((left, right) => left.fullName.localeCompare(right.fullName));
                    this.isLoadingEmployees = false;
                    this.rebuildGroupMetrics();
                    if (this.employeeDirectory.length > 0) this.loadEmployeeSalariesDebug();
                    this.isLoading = false;
                  },
                  error: () => {
                    this.isLoadingEmployees = false;
                    this.isLoading = false;
                    this.rebuildGroupMetrics();
                  }
                });
              }
            });
          },
          error: (error) => {
            console.error('Failed to load members:', error);
            this.loadError = 'Failed to load members.';
            this.isLoadingMembers = false;
            this.isLoading = false;
            this.rebuildGroupMetrics();
          }
        });
      },
      error: (error) => {
        console.error('Failed to load groups:', error);
        this.loadError = 'Failed to load groups.';
        this.isLoadingGroups = false;
        this.isLoading = false;
      }
    });
  }

  private mapApiGroupToCooperativeLoanGroup(apiGroup: any): CooperativeLoanGroup {
    const monthlyContributionAmount = this.resolveMonthlyContributionAmount(apiGroup);
    const hasExplicitPatronageEligible = apiGroup?.patronageEligible !== undefined && apiGroup?.patronageEligible !== null;
    const patronageEligible = hasExplicitPatronageEligible
      ? apiGroup.patronageEligible === true
      : Number(apiGroup?.patronageRate || 0) > 0;

    return {
      id: apiGroup.id || apiGroup.groupId,
      code: apiGroup.code || '',
      name: apiGroup.name || '',
      description: apiGroup.description || '',
      monthlyContributionAmount,
      withdrawCap: apiGroup.withdrawCap || 0,
      maxBorrowingPercentage: apiGroup.withdrawCap || 0,
      interestRate: apiGroup.interestRate || 0,
      memberLimit: apiGroup.memberLimit,
      status: apiGroup.status || 'INACTIVE',
      requiresGuarantors: apiGroup.requiresGuarantors || false,
      minimumGuarantors: apiGroup.minimumGuarantors || 0,
      patronageEligible,
      patronageRate: apiGroup.patronageRate || 0,
      contributionsBankName: apiGroup.contributionsBankName || '',
      contributionsAccount: apiGroup.contributionsAccount || '',
      principalBankName: apiGroup.principalBankName || '',
      principalCollectionAccount: apiGroup.principalCollectionAccount || '',
      interestBankName: apiGroup.interestBankName || '',
      interestCollectionAccount: apiGroup.interestCollectionAccount || '',
      lateFeePercentage: apiGroup.lateFeePercentage || 0,
      lateFeeBankName: apiGroup.lateFeeBankName || '',
      lateFeeCollectionAccount: apiGroup.lateFeeCollectionAccount || '',
      lateFeeGraceDays: apiGroup.lateFeeGraceDays || 0,
      accountingEmail: apiGroup.accountingEmail || '',
      accountingWebhookUrl: apiGroup.accountingWebhookUrl || '',
      minEligibleSalary: apiGroup.minEligibleSalary || 0,
      minAmount: 0,
      maxAmount: 0,
      minDuration: 0,
      maxDuration: 0,
      requiresShares: false,
      groupId: apiGroup.id || apiGroup.groupId,
      monthlyAmount: monthlyContributionAmount,
      currentBalance: apiGroup.currentBalance || 0,
      contributionHistory: apiGroup.contributionHistory || [],
      loanHistory: apiGroup.loanHistory || [],
      patronageAmount: apiGroup.patronageAmount || 0,
      minMemberTenureMonths: apiGroup.minMemberTenureMonths || 0
    } as CooperativeLoanGroup;
  }

  // ==================== DATA PROCESSING METHODS ====================
  private rebuildGroupMetrics(): void {
    if (this.groups.length === 0) {
      this.groupMetricsById = {};
      this.groupSummaryRows = [];
      this.filteredGroups = [];
      return;
    }

    this.groupMetricsById = this.groups.reduce((acc, group) => {
      const activeMemberships = this.members
        .map(member => {
          const membership = this.cooperativeService.getGroupMembership(member.id, group.id);
          if (!membership || membership.status !== 'ACTIVE') return null;
          return { member, membership };
        })
        .filter((entry): entry is { member: CooperativeMember; membership: CooperativeGroupMembership } => !!entry);

      acc[group.id] = {
        memberCount: activeMemberships.length,
        totalContribution: activeMemberships.reduce((sum, entry) => sum + Number(entry.membership.totalContribution || 0), 0),
        members: activeMemberships.map(entry => ({
          name: entry.member.fullName,
          monthlyContributionAmount: Number(entry.membership.monthlyContributionAmount || 0),
          totalContribution: Number(entry.membership.totalContribution || 0)
        }))
      };
      return acc;
    }, {} as Record<number, GroupMetrics>);

    this.groupSummaryRows = this.groups.map(group => ({
      id: group.id,
      code: String(group.code || '').trim(),
      name: group.name,
      description: String(group.description || '').trim(),
      memberCount: this.getGroupMetrics(group.id).memberCount,
      totalContribution: this.getGroupMetrics(group.id).totalContribution,
      monthlyContributionAmount: this.resolveMonthlyContributionAmount(group),
      withdrawCap: Number(group.withdrawCap || group.maxBorrowingPercentage || 0),
      memberLimit: group.memberLimit,
      contributionsBankName: String(group.contributionsBankName || '').trim(),
      contributionsAccount: String(group.contributionsAccount || '').trim(),
      principalBankName: String(group.principalBankName || '').trim(),
      principalCollectionAccount: String(group.principalCollectionAccount || '').trim(),
      interestBankName: String(group.interestBankName || '').trim(),
      interestCollectionAccount: String(group.interestCollectionAccount || '').trim(),
      lateFeeBankName: String(group.lateFeeBankName || '').trim(),
      lateFeeCollectionAccount: String(group.lateFeeCollectionAccount || '').trim(),
      interestRate: Number(group.interestRate || 0),
      patronageRate: Number(group.patronageRate || 0),
      requiresGuarantors: Boolean(group.requiresGuarantors),
      minimumGuarantors: Number(group.minimumGuarantors || 0),
      accountingEmail: String(group.accountingEmail || '').trim(),
      lateFeePercentage: Number(group.lateFeePercentage || 0),
      lateFeeGraceDays: Number(group.lateFeeGraceDays || 0),
      hasAccountingConfiguration: this.hasAccountingConfiguration(group),
      status: group.status
    }));
    
    this.applyFilters();
  }

  private loadEmployeeSalariesDebug(): void {
    if (this.employeeDirectory.length === 0) return;
    
    this.employeeDirectory.forEach((employee) => {
      this.employeeLoanService.getSalaryByEmployeeId(employee.employeeId).pipe(
        timeout(10000),
        catchError(() => of({ baseSalary: employee.monthlySalary }))
      ).subscribe({
        next: (salaryData: any) => {
          const salary = Number(salaryData?.baseSalary || salaryData?.monthlySalary || salaryData?.salary || employee.monthlySalary || 0);
          this.employeeSalaryById[employee.employeeId] = salary;
          const empIndex = this.employeeDirectory.findIndex(e => e.employeeId === employee.employeeId);
          if (empIndex !== -1) this.employeeDirectory[empIndex].monthlySalary = salary;
        }
      });
    });
  }

  // ==================== HELPER METHODS ====================
  getGroupMetrics(groupId: number): GroupMetrics {
    return this.groupMetricsById[groupId] || { memberCount: 0, totalContribution: 0, members: [] };
  }

  getGroupById(id: number): CooperativeLoanGroup | undefined {
    return this.groups.find(g => g.id === id);
  }

  hasAccountingConfiguration(group: CooperativeLoanGroup | GroupTableRow): boolean {
    return [
      group.contributionsBankName,
      group.contributionsAccount,
      group.principalBankName,
      group.principalCollectionAccount,
      group.interestBankName,
      group.interestCollectionAccount,
      group.lateFeeBankName,
      group.lateFeeCollectionAccount,
      group.accountingEmail
    ].every(value => String(value || '').trim().length > 0);
  }

  getLateFeeSummary(group: CooperativeLoanGroup | GroupTableRow): string {
    const fee = Number(group.lateFeePercentage || 0);
    const graceDays = Number(group.lateFeeGraceDays || 0);
    return `${fee}% after ${graceDays} day${graceDays === 1 ? '' : 's'}`;
  }

  getBorrowCapSummary(group: CooperativeLoanGroup | GroupTableRow): string {
    const percentage = Number(group.withdrawCap || 0);
    return `${percentage}% of total group contributions`;
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  trackByGroupId(index: number, item: GroupTableRow): number {
    return item.id;
  }

  // ==================== FILTER AND SORT METHODS ====================
  applyFilters(): void {
    let filtered = [...this.groupSummaryRows];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(term) ||
        group.code.toLowerCase().includes(term)
      );
    }
    
    this.filteredGroups = filtered;
    this.currentPage = 1;
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.sortGroupRows();
    this.currentPage = 1;
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  sortGroupRows(): void {
    this.groupSummaryRows.sort((a, b) => {
      let valA: any, valB: any;
      switch (this.sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'code':
          valA = a.code.toLowerCase();
          valB = b.code.toLowerCase();
          break;
        case 'monthlyContributionAmount':
          valA = a.monthlyContributionAmount;
          valB = b.monthlyContributionAmount;
          break;
        case 'interestRate':
          valA = a.interestRate;
          valB = b.interestRate;
          break;
        case 'memberCount':
          valA = a.memberCount;
          valB = b.memberCount;
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        default:
          return 0;
      }
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    this.applyFilters();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  changeInvitePage(page: number): void {
    if (page < 1 || page > this.inviteTotalPages) return;
    this.currentInvitePage = page;
  }

  // ==================== GROUP CRUD OPERATIONS ====================
  openAddForm(): void {
    this.editingGroupId = null;
    this.showGroupForm = true;
    this.clearFormMessage();
    this.groupForm.reset({
      code: '',
      name: '',
      description: '',
      monthlyContributionAmount: 1000,
      withdrawCap: 0,
      interestRate: 0,
      memberLimit: null,
      contributionsBankName: '',
      contributionsAccount: '',
      principalBankName: '',
      principalCollectionAccount: '',
      interestBankName: '',
      interestCollectionAccount: '',
      lateFeePercentage: 0,
      lateFeeBankName: '',
      lateFeeCollectionAccount: '',
      lateFeeGraceDays: 0,
      accountingEmail: '',
      accountingWebhookUrl: '',
      requiresGuarantors: false,
      minimumGuarantors: 0,
      patronageEligible: true,
      patronageRate: 0,
      status: 'ACTIVE'
    });
  }

  openEditForm(group: CooperativeLoanGroup | undefined): void {
    if (!group) return;
    this.editingGroupId = group.id;
    this.showGroupForm = true;
    this.clearFormMessage();
    this.groupForm.reset(this.toGroupFormValue({
      ...group,
      code: this.resolveEditCode(group)
    }));
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      this.showMessage('Please fill in all required fields', 'error');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.groupForm.getRawValue();
    const existingGroup = this.editingGroupId ? this.groups.find((group) => group.id === this.editingGroupId) : undefined;
    const payload = this.buildGroupPayload(formValue, existingGroup);
    
    const isUpdate = typeof this.editingGroupId === 'number';
    const request = isUpdate
      ? this.cooperativeService.updateGroup({ ...payload, id: this.editingGroupId as number })
      : this.cooperativeService.createGroup(payload);

    request.subscribe({
      next: () => {
        this.cooperativeService.refreshGroups().subscribe({
          next: (groups) => {
            this.groups = groups;
            this.rebuildGroupMetrics();
            this.showMessage(isUpdate ? 'Group updated successfully.' : 'Group created successfully.', 'success');
            setTimeout(() => this.cancelForm(), 1200);
            this.isSubmitting = false;
          },
          error: () => {
            this.showMessage((isUpdate ? 'Group updated' : 'Group created') + ', but the refreshed group list could not be loaded immediately.', 'error');
            setTimeout(() => this.cancelForm(), 1800);
            this.isSubmitting = false;
          }
        });
      },
      error: (error) => {
        console.error('Error saving group:', error);
        this.showMessage('Failed to save group. Review the fields and try again.', 'error');
        this.isSubmitting = false;
      }
    });
  }

  private buildGroupPayload(formValue: Record<string, unknown>, existingGroup?: CooperativeLoanGroup): any {
    const requiresGuarantors = Boolean(formValue['requiresGuarantors']);
    const minimumGuarantors = requiresGuarantors ? Math.max(1, Number(formValue['minimumGuarantors'] || 0)) : 0;
    const monthlyContributionAmount = Number(formValue['monthlyContributionAmount'] || 0);

    return {
      code: String(formValue['code'] || '').trim(),
      name: String(formValue['name'] || '').trim(),
      description: String(formValue['description'] || '').trim(),
      monthlyContributionAmount,
      // Keep legacy API naming for compatibility with any downstream adapters.
      monthlyAmount: monthlyContributionAmount,
      memberLimit: formValue['memberLimit'] !== undefined && formValue['memberLimit'] !== null && formValue['memberLimit'] !== '' ? Number(formValue['memberLimit']) : undefined,
      withdrawCap: Number(formValue['withdrawCap'] || 0),
      maxBorrowingPercentage: Number(formValue['withdrawCap'] || 0),
      interestRate: Number(formValue['interestRate'] || 0),
      status: (formValue['status'] as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
      requiresGuarantors: requiresGuarantors,
      minimumGuarantors: minimumGuarantors,
      patronageEligible: Boolean(formValue['patronageEligible']),
      patronageRate: Number(formValue['patronageRate'] || 0),
      contributionsBankName: String(formValue['contributionsBankName'] || '').trim(),
      contributionsAccount: String(formValue['contributionsAccount'] || '').trim(),
      principalBankName: String(formValue['principalBankName'] || '').trim(),
      principalCollectionAccount: String(formValue['principalCollectionAccount'] || '').trim(),
      interestBankName: String(formValue['interestBankName'] || '').trim(),
      interestCollectionAccount: String(formValue['interestCollectionAccount'] || '').trim(),
      lateFeePercentage: Number(formValue['lateFeePercentage'] || 0),
      lateFeeBankName: String(formValue['lateFeeBankName'] || '').trim(),
      lateFeeCollectionAccount: String(formValue['lateFeeCollectionAccount'] || '').trim(),
      lateFeeGraceDays: Number(formValue['lateFeeGraceDays'] || 0),
      accountingEmail: String(formValue['accountingEmail'] || '').trim(),
      accountingWebhookUrl: String(formValue['accountingWebhookUrl'] || '').trim() || undefined,
    };
  }

  toGroupFormValue(group: GroupFormValueSource): Record<string, unknown> {
    return {
      code: String(group.code || '').trim(),
      name: String(group.name || '').trim(),
      description: String(group.description || '').trim(),
      monthlyContributionAmount: this.resolveMonthlyContributionAmount(group),
      withdrawCap: Number(group.withdrawCap || group.maxBorrowingPercentage || 0),
      interestRate: Number(group.interestRate || 0),
      memberLimit: group.memberLimit ?? null,
      contributionsBankName: String(group.contributionsBankName || '').trim(),
      contributionsAccount: String(group.contributionsAccount || '').trim(),
      principalBankName: String(group.principalBankName || '').trim(),
      principalCollectionAccount: String(group.principalCollectionAccount || '').trim(),
      interestBankName: String(group.interestBankName || '').trim(),
      interestCollectionAccount: String(group.interestCollectionAccount || '').trim(),
      lateFeePercentage: Number(group.lateFeePercentage || 0),
      lateFeeBankName: String(group.lateFeeBankName || '').trim(),
      lateFeeCollectionAccount: String(group.lateFeeCollectionAccount || '').trim(),
      lateFeeGraceDays: Number(group.lateFeeGraceDays || 0),
      accountingEmail: String(group.accountingEmail || '').trim(),
      accountingWebhookUrl: String(group.accountingWebhookUrl || '').trim(),
      requiresGuarantors: Boolean(group.requiresGuarantors),
      minimumGuarantors: Number(group.minimumGuarantors || 0),
      patronageEligible: group.patronageEligible !== false,
      patronageRate: Number(group.patronageRate || 0),
      status: group.status || 'ACTIVE'
    };
  }

  private resolveMonthlyContributionAmount(source: unknown): number {
    const valueSource = (source || {}) as Record<string, unknown>;
    const candidates: unknown[] = [
      valueSource['monthlyContributionAmount'],
      valueSource['monthlyAmount'],
      valueSource['monthlyContribution'],
      valueSource['contributionAmount'],
      valueSource['amountPerMonth'],
      valueSource['monthly_contribution_amount']
    ];

    for (const candidate of candidates) {
      const parsed = this.parseNumberCandidate(candidate);
      if (parsed !== null) {
        return parsed;
      }
    }

    return 0;
  }

  private parseNumberCandidate(value: unknown): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (!normalized) {
        return null;
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private resolveEditCode(group: CooperativeLoanGroup): string {
    const code = String(group.code || '').trim().toUpperCase();
    if (code) {
      return code;
    }

    return `COOP-${String(group.id || 0).padStart(3, '0')}`;
  }

  cancelForm(delayMs = 0): void {
    const finalize = (): void => {
      this.showGroupForm = false;
      this.editingGroupId = null;
    };
    if (delayMs > 0) {
      window.setTimeout(finalize, delayMs);
      return;
    }
    finalize();
  }

  clearFormMessage(): void {
    this.formMessage = '';
  }

  normalizeAccountField(controlName: string): void {
    const control = this.groupForm.get(controlName);
    if (!control) return;
    const normalized = String(control.value || '').replace(/\D+/g, '').trim();
    control.setValue(normalized, { emitEvent: false });
    control.updateValueAndValidity({ emitEvent: false });
  }

  hasControlError(controlName: string, errorName?: string): boolean {
    const control = this.groupForm.get(controlName);
    if (!control) return false;
    const shouldShow = control.invalid && (control.touched || control.dirty);
    if (!shouldShow) return false;
    return errorName ? !!control.errors?.[errorName] : true;
  }

  getControlErrorMessage(controlName: string): string {
    const control = this.groupForm.get(controlName);
    if (!control?.errors) return '';

    if (control.errors['required']) {
      switch (controlName) {
        case 'code': return 'Group code is required.';
        case 'name': return 'Group name is required.';
        case 'description': return 'Description is required.';
        case 'contributionsBankName': return 'Contributions bank name is required.';
        case 'contributionsAccount': return 'Contributions account is required.';
        case 'principalBankName': return 'Principal bank name is required.';
        case 'principalCollectionAccount': return 'Principal account is required.';
        case 'interestBankName': return 'Interest bank name is required.';
        case 'interestCollectionAccount': return 'Interest account is required.';
        case 'lateFeeBankName': return 'Late fee bank name is required.';
        case 'lateFeeCollectionAccount': return 'Late fee account is required.';
        case 'accountingEmail': return 'Accounting email is required.';
        case 'minimumGuarantors': return 'Minimum guarantors is required when guarantors are enabled.';
        default: return 'This field is required.';
      }
    }
    if (control.errors['email']) return 'Enter a valid email address.';
    if (control.errors['pattern']) return 'Account number must be exactly 10 digits.';
    if (control.errors['min']) {
      if (controlName === 'memberLimit') return 'Member limit must be at least 1.';
      if (controlName === 'minimumGuarantors') return 'At least 1 guarantor is required when this rule is enabled.';
      return 'Value must be greater than or equal to 0.';
    }
    return 'Enter a valid value.';
  }

  // ==================== MODAL METHODS ====================
  viewGroupDetails(group: CooperativeLoanGroup | undefined): void {
    if (!group) return;
    this.selectedGroupForDetails = group;
    this.showGroupDetails = true;
  }

  closeGroupDetails(): void {
    this.showGroupDetails = false;
    this.selectedGroupForDetails = null;
  }

  confirmDelete(group: GroupTableRow): void {
    this.groupToDelete = group;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.groupToDelete = null;
    this.isDeleting = false;
  }

  deleteGroup(): void {
    if (!this.groupToDelete) return;
    this.isDeleting = true;
    this.cooperativeService.deleteGroup(this.groupToDelete.id).subscribe({
      next: () => {
        this.showMessage('Group deleted successfully', 'success');
        this.loadInitialData();
        this.closeDeleteModal();
      },
      error: () => {
        this.showMessage('Failed to delete group', 'error');
        this.isDeleting = false;
      }
    });
  }

  // ==================== INVITE MEMBERS METHODS ====================
  openInviteMembersModal(group: CooperativeLoanGroup | undefined): void {
    if (!group) return;
    this.selectedGroupForInvite = group;
    this.selectedGroupInviteHistory = this.cooperativeService.getGroupInviteHistory(group.id);
    this.showInviteMembersModal = true;
    this.inviteDepartmentFilter = 'ALL';
    this.inviteLevelFilter = 'ALL';
    this.inviteTenureFilter = 'ALL';
    this.selectedInviteEmployeeIds.clear();
    this.inviteMessage = '';
    this.currentInvitePage = 1;
  }

  closeInviteMembersModal(): void {
    this.showInviteMembersModal = false;
    this.selectedGroupForInvite = null;
    this.selectedGroupInviteHistory = [];
    this.selectedInviteEmployeeIds.clear();
    this.inviteMessage = '';
  }

  getVisibleInviteSelectionLabel(): string {
    return this.isAllVisibleInviteEmployeesSelected ? 'Clear Visible Selection' : 'Select All';
  }

  canInviteEmployee(employee: GroupInviteEmployeeRow): boolean {
    return this.isEmployeeSalaryEligible(employee) && !this.isEmployeeAlreadyInSelectedGroup(employee);
  }

  isInviteSelected(employeeId: number): boolean {
    return this.selectedInviteEmployeeIds.has(employeeId);
  }

  toggleInviteSelection(employeeId: number): void {
    if (this.selectedInviteEmployeeIds.has(employeeId)) {
      this.selectedInviteEmployeeIds.delete(employeeId);
    } else {
      this.selectedInviteEmployeeIds.add(employeeId);
    }
    this.currentInvitePage = 1;
  }

  toggleAllVisibleInviteSelection(): void {
    if (this.isAllVisibleInviteEmployeesSelected) {
      this.selectableFilteredInviteEmployees.forEach(employee => this.selectedInviteEmployeeIds.delete(employee.employeeId));
    } else {
      this.selectableFilteredInviteEmployees.forEach(employee => this.selectedInviteEmployeeIds.add(employee.employeeId));
    }
  }

  sendGroupInviteEmails(): void {
    if (!this.selectedGroupForInvite || this.isSendingInviteEmails) return;

    const recipients = this.employeeDirectory.filter(employee => this.selectedInviteEmployeeIds.has(employee.employeeId));
    if (recipients.length === 0) {
      this.inviteMessage = 'Select at least one employee to send the group invitation email.';
      return;
    }

    const emailSubject = this.inviteEmailSubject;
    const emailBody = this.inviteEmailBodyPreview;
    this.isSendingInviteEmails = true;
    this.inviteMessage = '';

    forkJoin(
      recipients.map((employee) => this.sendGroupInviteMail(employee).pipe(
        map(() => ({ success: true, employee })),
        catchError((error) => {
          console.error(`Failed to send group invite email to ${employee.email}:`, error);
          return of({ success: false, employee });
        })
      ))
    ).subscribe({
      next: (results) => {
        const successfulRecipients = results.filter((result) => result.success).map((result) => result.employee);
        const failedRecipients = results.filter((result) => !result.success).map((result) => result.employee.email);

        if (successfulRecipients.length > 0) {
          this.cooperativeService.recordGroupInvites(
            this.selectedGroupForInvite!.id,
            successfulRecipients.map(employee => ({
              employeeId: employee.employeeId,
              employeeName: employee.fullName,
              employeeEmail: employee.email,
              department: employee.department,
              level: employee.level,
              rank: (employee.level?.toUpperCase() as CooperativeStaffRank) || 'JUNIOR',
              tenureMonths: employee.tenureMonths,
              subject: emailSubject,
              message: emailBody
            }))
          );
          this.selectedGroupInviteHistory = this.cooperativeService.getGroupInviteHistory(this.selectedGroupForInvite!.id);
        }

        if (failedRecipients.length === 0) {
          this.inviteMessage = `Invitation email sent to ${successfulRecipients.length} employee${successfulRecipients.length === 1 ? '' : 's'} for ${this.selectedGroupForInvite!.name}.`;
        } else if (successfulRecipients.length === 0) {
          this.inviteMessage = `No invitation emails were sent successfully. Failed recipients: ${failedRecipients.join(', ')}.`;
        } else {
          this.inviteMessage = `Invitation email sent to ${successfulRecipients.length} employee${successfulRecipients.length === 1 ? '' : 's'}. Failed recipients: ${failedRecipients.join(', ')}.`;
        }

        this.selectedInviteEmployeeIds.clear();
        this.isSendingInviteEmails = false;
      },
      error: () => {
        this.inviteMessage = 'Unable to send invitation emails right now.';
        this.isSendingInviteEmails = false;
      }
    });
  }

  private buildGroupInviteMail(employee: GroupInviteEmployeeRow): { name: string; to: string; recieverEmail: string; receiverEmail: string; subject: string; body: string } {
    const dashboardUrl = `${window.location.origin}/member/cooperative/dashboard/${this.currentUuid}`;
    const groupName = this.selectedGroupForInvite?.name || 'the selected cooperative group';
    const groupCode = this.selectedGroupForInvite?.code ? ` (${this.selectedGroupForInvite.code})` : '';
    const description = this.selectedGroupForInvite?.description ? `<p><strong>Group overview:</strong> ${this.selectedGroupForInvite.description}</p>` : '';

    return {
      name: employee.fullName,
      to: employee.email,
      recieverEmail: employee.email,
      receiverEmail: employee.email,
      subject: this.inviteEmailSubject,
      body: `
        <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
          <p>Dear ${employee.fullName},</p>
          <p>A cooperative group has opened for applications and you are eligible to apply.</p>
          <ul>
            <li><strong>Group:</strong> ${groupName}${groupCode}</li>
            <li><strong>Department:</strong> ${employee.department}</li>
            <li><strong>Level:</strong> ${employee.level}</li>
          </ul>
          ${description}
          <p>To apply, sign in and open your <strong>My Membership</strong> dashboard:</p>
          <p><a href="${dashboardUrl}" target="_blank" rel="noopener noreferrer">Open My Membership Dashboard</a></p>
          <p>Please note that applications are still reviewed and can be approved or rejected based on group criteria.</p>
          <p>Regards,<br/><strong>Cooperative Admin</strong></p>
        </div>
      `
    };
  }

  private sendGroupInviteMail(employee: GroupInviteEmployeeRow) {
    const rawApiKey = String(environment.apiKey || '').trim();
    const apiKey = rawApiKey.startsWith('ApiKey ') ? rawApiKey : `ApiKey ${rawApiKey}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    });

    return this.http.post(
      'https://automation.optimaxsuites.com/webhook/735f4d81-3f63-4390-9b03-098be2a31469',
      this.buildGroupInviteMail(employee),
      { headers }
    );
  }

  getInviteTenureLabel(employee: GroupInviteEmployeeRow): string {
    return this.getTenureLabel(employee.tenureMonths);
  }

  getTenureLabel(tenureMonths: number): string {
    const years = Math.floor(tenureMonths / 12);
    const months = tenureMonths % 12;
    if (years <= 0) return `${months}mo`;
    if (months === 0) return `${years}y`;
    return `${years}y ${months}mo`;
  }

  getInviteStatusLabel(employee: GroupInviteEmployeeRow): string {
    if (!this.isEmployeeSalaryEligible(employee)) return 'INELIGIBLE';
    const member = this.getMemberByEmployeeEmail(employee.email);
    if (!member || !this.selectedGroupForInvite) return 'Eligible';
    const membership = this.cooperativeService.getGroupMembership(member.id, this.selectedGroupForInvite.id);
    if (membership?.status === 'ACTIVE') return 'Already a member';
    if (membership?.status === 'PENDING') return 'Application pending';
    return 'Eligible';
  }

  // ==================== PRIVATE HELPER METHODS ====================
  private showMessage(detail: string, severity: 'success' | 'error'): void {
    this.messages = [{ severity, summary: severity === 'success' ? 'Success' : 'Error', detail }];
    setTimeout(() => { this.messages = []; }, 5000);
  }

  private mapEmployeeToInviteRow(employee: any): GroupInviteEmployeeRow | null {
    const firstName = String(employee?.firstName || '').trim();
    const lastName = String(employee?.lastName || '').trim();
    const fallbackName = String(employee?.fullName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || fallbackName;
    const email = String(employee?.email || employee?.workEmail || '').trim();
    const employeeIdRaw = employee?.id ?? employee?.employeeId ?? employee?.staffId;
    const employeeId = typeof employeeIdRaw === 'string' ? parseInt(employeeIdRaw, 10) : Number(employeeIdRaw);
    if (!employeeId || isNaN(employeeId) || !fullName || !email) return null;

    const department = String(employee?.department?.name || employee?.department || employee?.unit || 'Unassigned').trim() || 'Unassigned';
    const levelName = String(employee?.level?.name || employee?.level || employee?.jobTitle || '').trim();
    const employmentStartDate = employee?.employementStartDate || employee?.employmentStartDate || employee?.hireDate || employee?.createdAt;
    let normalizedStartDate = '';
    if (employmentStartDate) {
      const dateObj = new Date(employmentStartDate);
      normalizedStartDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString();
    } else {
      normalizedStartDate = new Date().toISOString();
    }

    return {
      employeeId,
      fullName,
      email,
      department,
      level: levelName,
      employmentStartDate: normalizedStartDate,
      tenureMonths: this.getTenureMonths(normalizedStartDate),
      monthlySalary: Number(employee?.monthlySalary || employee?.salary || employee?.baseSalary || 0)
    };
  }

  private isEmployeeSalaryEligible(employee: GroupInviteEmployeeRow): boolean {
    if (!this.selectedGroupForInvite) return true;
    const minimumSalary = Number(this.selectedGroupForInvite.minEligibleSalary || 0);
    const employeeSalary = Number(this.employeeSalaryById[employee.employeeId] ?? employee.monthlySalary ?? 0);
    return employeeSalary >= minimumSalary;
  }

  private getTenureMonths(startDate: string): number {
    const parsedDate = new Date(startDate);
    if (Number.isNaN(parsedDate.getTime())) return 0;
    const now = new Date();
    let months = (now.getFullYear() - parsedDate.getFullYear()) * 12;
    months += now.getMonth() - parsedDate.getMonth();
    if (now.getDate() < parsedDate.getDate()) months -= 1;
    return Math.max(months, 0);
  }

  private matchesTenureFilter(tenureMonths: number, filter: InviteTenureFilter): boolean {
    if (filter === 'ALL') return true;
    if (filter === 'UNDER_6_MONTHS') return tenureMonths < 6;
    if (filter === 'SIX_TO_TWELVE_MONTHS') return tenureMonths >= 6 && tenureMonths < 12;
    if (filter === 'ONE_TO_THREE_YEARS') return tenureMonths >= 12 && tenureMonths <= 36;
    return tenureMonths > 36;
  }

  private isEmployeeAlreadyInSelectedGroup(employee: GroupInviteEmployeeRow): boolean {
    if (!this.selectedGroupForInvite) return false;
    const member = this.getMemberByEmployeeEmail(employee.email);
    if (!member) return false;
    const membership = this.cooperativeService.getGroupMembership(member.id, this.selectedGroupForInvite.id);
    return membership?.status === 'ACTIVE' || membership?.status === 'PENDING';
  }

  private getMemberByEmployeeEmail(email: string): CooperativeMember | undefined {
    const normalizedEmail = email.trim().toLowerCase();
    return this.members.find(member => member.email.trim().toLowerCase() === normalizedEmail);
  }

  // ==================== NAVIGATION ====================
  goBack(): void {
    this.router.navigate(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }
}