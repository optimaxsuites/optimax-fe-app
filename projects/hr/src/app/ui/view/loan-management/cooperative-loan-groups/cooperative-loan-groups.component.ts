import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EmployeeService } from '../../../service/employee.service';
import { EmployeeLoanService } from '../../../service/loan/emoloyee-loan.service';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { MailNotificationService } from '../../../service/mailNotification.service';
// Add other needed types if used in this file
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import {
  CooperativeEmployeeProfile,
  CooperativeGroupMembership,
  CooperativeGroupInviteHistoryEntry,
  CooperativeLoanGroup,
  CooperativeMember
} from '../../../service/loan/cooperative-loan/cooperative.types';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';
import { environment } from '../../../shared-component/environments/environment';

interface GroupMetrics {
  memberCount: number;
  totalContribution: number;
  members: Array<{ name: string; monthlyContributionAmount: number; totalContribution: number }>;
}

interface GroupTableRow {
  id: number;
  name: string;
  memberCount: number;
  totalContribution: number;
  monthlyContributionAmount: number;
  interestRate: number;
  patronageRate: number;
  status: 'ACTIVE' | 'INACTIVE';
}

type InviteTenureFilter = 'ALL' | 'UNDER_6_MONTHS' | 'SIX_TO_TWELVE_MONTHS' | 'ONE_TO_THREE_YEARS' | 'OVER_THREE_YEARS';

interface GroupInviteEmployeeRow {
  employeeId: number;
  fullName: string;
  email: string;
  department: string;
  rank: CooperativeEmployeeProfile['rank'];
  employmentStartDate: string;
  tenureMonths: number;
  monthlySalary: number;
}

interface SalaryLookupResponse {
  baseSalary?: number;
  monthlySalary?: number;
  salary?: number;
}

@Component({
  selector: 'app-cooperative-loan-groups',
  templateUrl: './cooperative-loan-groups.component.html',
  styleUrls: ['./cooperative-loan-groups.component.scss']
})
export class CooperativeLoanGroupsComponent implements OnInit {
  currentUuid = uuidV4();
  private readonly bankAccountPattern = /^\d{10}$/;
  groups: CooperativeLoanGroup[] = [];
  members: CooperativeMember[] = [];
  employeeDirectory: GroupInviteEmployeeRow[] = [];
  employeeSalaryById: Record<number, number> = {};
  groupMetricsById: Record<number, GroupMetrics> = {};
  groupSummaryRows: GroupTableRow[] = [];
  showGroupForm = false;
  showGroupDetails = false;
  showInviteMembersModal = false;
  selectedGroupForDetails: CooperativeLoanGroup | null = null;
  selectedGroupForInvite: CooperativeLoanGroup | null = null;
  selectedGroupInviteHistory: CooperativeGroupInviteHistoryEntry[] = [];
  editingGroupId: number | null = null;
  groupForm!: FormGroup;
  inviteDepartmentFilter = 'ALL';
  inviteRankFilter: CooperativeEmployeeProfile['rank'] | 'ALL' = 'ALL';
  inviteTenureFilter: InviteTenureFilter = 'ALL';
  selectedInviteEmployeeIds = new Set<number>();
  inviteMessage = '';
  isSendingInviteEmails = false;
  formMessage = '';
  formMessageSeverity: 'success' | 'error' | 'info' | 'warn' = 'info';

  readonly inviteTenureOptions: Array<{ value: InviteTenureFilter; label: string }> = [
    { value: 'ALL', label: 'All tenures' },
    { value: 'UNDER_6_MONTHS', label: 'Under 6 months' },
    { value: 'SIX_TO_TWELVE_MONTHS', label: '6 to 12 months' },
    { value: 'ONE_TO_THREE_YEARS', label: '1 to 3 years' },
    { value: 'OVER_THREE_YEARS', label: 'Over 3 years' }
  ];

  groupSummaryColumns: TableColumn<GroupTableRow>[] = [
    { header: 'Group', field: 'name', sortable: true },
    { header: 'Members', field: 'memberCount', sortable: true, align: 'center' },
    {
      header: 'Total Contributions',
      sortable: true,
      sortField: 'totalContribution',
      formatter: (row: GroupTableRow) => this.formatCurrency(row.totalContribution)
    },
    {
      header: 'Monthly Contribution',
      sortable: true,
      sortField: 'monthlyContributionAmount',
      formatter: (row: GroupTableRow) => this.formatCurrency(row.monthlyContributionAmount)
    },
    {
      header: 'Interest',
      sortable: true,
      sortField: 'interestRate',
      formatter: (row: GroupTableRow) => `${row.interestRate}%`
    },
    {
      header: 'Patronage',
      sortable: true,
      sortField: 'patronageRate',
      formatter: (row: GroupTableRow) => `${row.patronageRate}%`
    },
    {
      header: 'Status',
      field: 'status',
      sortable: true
    }
  ];

  groupSummaryActions: TableAction<GroupTableRow>[] = [
    { id: 'invite', label: 'Invite New Members', className: 'invite-btn' },
    { id: 'view', label: 'View', className: 'view-btn' },
    { id: 'edit', label: 'Edit', className: 'edit-btn' },
    { id: 'deactivate', label: 'Deactivate', className: 'toggle-btn', visible: (row: GroupTableRow) => row.status === 'ACTIVE' },
    { id: 'activate', label: 'Activate', className: 'toggle-btn', visible: (row: GroupTableRow) => row.status === 'INACTIVE' }
  ];

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

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    this.initializeForm();
    this.loadInitialData();
  }

  private loadInitialData(): void {
    forkJoin({
      members: this.cooperativeService.getMembers(),
      groups: this.cooperativeService.loadGroups(),
      employees: this.employeeService.getAllEmployee()
    }).subscribe({
      next: ({ members, groups, employees }) => {
        this.members = members;
        this.groups = groups;
        this.employeeDirectory = (Array.isArray(employees) ? employees : [])
          .map(employee => this.mapEmployeeToInviteRow(employee))
          .filter((employee): employee is GroupInviteEmployeeRow => !!employee)
          .sort((left, right) => left.fullName.localeCompare(right.fullName));

        this.rebuildGroupMetrics();
        this.loadEmployeeSalaries();
      },
      error: () => {
        this.members = [];
        this.groups = [];
        this.employeeDirectory = [];
        this.employeeSalaryById = {};
        this.rebuildGroupMetrics();
      }
    });
  }

  loadMembers(): void {
    this.cooperativeService.getMembers().subscribe((members: CooperativeMember[]) => {
      this.members = members;
      this.rebuildGroupMetrics();
    });
  }

  loadEmployeeDirectory(): void {
    this.employeeService.getAllEmployee().subscribe({
      next: employees => {
        this.employeeDirectory = (Array.isArray(employees) ? employees : [])
          .map(employee => this.mapEmployeeToInviteRow(employee))
          .filter((employee): employee is GroupInviteEmployeeRow => !!employee)
          .sort((left, right) => left.fullName.localeCompare(right.fullName));

        this.loadEmployeeSalaries();
      },
      error: () => {
        this.employeeDirectory = [];
        this.employeeSalaryById = {};
      }
    });
  }

  private loadEmployeeSalaries(): void {
    if (this.employeeDirectory.length === 0) {
      this.employeeSalaryById = {};
      return;
    }

    forkJoin(
      this.employeeDirectory.map((employee) => this.employeeLoanService.getSalaryByEmployeeId(employee.employeeId).pipe(
        map((salaryData: SalaryLookupResponse) => ({
          employeeId: employee.employeeId,
          salary: Number(salaryData?.baseSalary || salaryData?.monthlySalary || salaryData?.salary || employee.monthlySalary || 0)
        })),
        catchError(() => of({ employeeId: employee.employeeId, salary: Number(employee.monthlySalary || 0) }))
      ))
    ).subscribe((salaryRows) => {
      this.employeeSalaryById = salaryRows.reduce((acc, row) => {
        acc[row.employeeId] = row.salary;
        return acc;
      }, {} as Record<number, number>);

      this.employeeDirectory = this.employeeDirectory.map((employee) => ({
        ...employee,
        monthlySalary: this.employeeSalaryById[employee.employeeId] ?? employee.monthlySalary
      }));
    });
  }

  initializeForm(): void {
    this.groupForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: ['', Validators.required],
      minEligibleSalary: [0, [Validators.required, Validators.min(0)]],
      monthlyContributionAmount: [1000, [Validators.required, Validators.min(1)]],
      maxBorrowingPercentage: [100, [Validators.required, Validators.min(1)]],
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
      minDuration: [1, [Validators.required, Validators.min(1)]],
      maxDuration: [12, [Validators.required, Validators.min(1)]],
      requiresGuarantors: [false],
      minimumGuarantors: [0],
      patronageEligible: [true],
      patronageRate: [0, [Validators.required, Validators.min(0)]],
      status: ['ACTIVE', Validators.required]
    });

    this.groupForm.get('requiresGuarantors')?.valueChanges.subscribe((enabled) => {
      const minimumGuarantorsControl = this.groupForm.get('minimumGuarantors');
      if (!minimumGuarantorsControl) {
        return;
      }

      if (enabled) {
        minimumGuarantorsControl.setValidators([Validators.required, Validators.min(1)]);
        if (Number(minimumGuarantorsControl.value || 0) < 1) {
          minimumGuarantorsControl.setValue(1);
        }
      } else {
        minimumGuarantorsControl.clearValidators();
        minimumGuarantorsControl.setValue(0);
      }

      minimumGuarantorsControl.updateValueAndValidity({ emitEvent: false });
    });

    this.groupForm.get('patronageEligible')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.groupForm.get('patronageRate')?.setValue(0);
      }
    });
  }

  loadGroups(): void {
    this.cooperativeService.loadGroups().subscribe((groups: CooperativeLoanGroup[]) => {
      this.groups = groups;
      this.rebuildGroupMetrics();
    });
  }

  private rebuildGroupMetrics(): void {
    if (this.groups.length === 0 || this.members.length === 0) {
      this.groupMetricsById = {};
      this.groupSummaryRows = [];
      return;
    }

    this.groupMetricsById = this.groups.reduce((acc, group) => {
      const activeMemberships = this.members
        .map(member => {
          const membership = this.cooperativeService.getGroupMembership(member.id, group.id);
          if (!membership || membership.status !== 'ACTIVE') {
            return null;
          }

          return {
            member,
            membership
          };
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
      name: group.name,
      memberCount: this.getGroupMetrics(group.id).memberCount,
      totalContribution: this.getGroupMetrics(group.id).totalContribution,
      monthlyContributionAmount: Number(group.monthlyContributionAmount || 0),
      interestRate: Number(group.interestRate || 0),
      patronageRate: Number(group.patronageRate || 0),
      status: group.status
    }));
  }

  getGroupMetrics(groupId: number): GroupMetrics {
    return this.groupMetricsById[groupId] || { memberCount: 0, totalContribution: 0, members: [] };
  }

  handleGroupSummaryAction(event: { actionId: string; row: GroupTableRow }): void {
    const targetGroup = this.groups.find(item => item.id === event.row.id);
    if (!targetGroup) {
      return;
    }

    if (event.actionId === 'invite') {
      this.openInviteMembersModal(targetGroup);
      return;
    }

    if (event.actionId === 'view') {
      this.viewGroupDetails(targetGroup);
      return;
    }

    if (event.actionId === 'edit') {
      this.openEditForm(targetGroup);
      return;
    }

    if (event.actionId === 'activate' || event.actionId === 'deactivate') {
      this.toggleGroupStatus(targetGroup);
    }
  }

  openAddForm(): void {
    this.editingGroupId = null;
    this.showGroupForm = true;
    this.clearFormMessage();
    this.groupForm.reset({
      code: '',
      name: '',
      description: '',
      minEligibleSalary: 0,
      monthlyContributionAmount: 1000,
      maxBorrowingPercentage: 100,
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
      minDuration: 1,
      maxDuration: 12,
      requiresGuarantors: false,
      minimumGuarantors: 0,
      patronageEligible: true,
      patronageRate: 0,
      status: 'ACTIVE'
    });
  }

  openEditForm(group: CooperativeLoanGroup): void {
    this.editingGroupId = group.id;
    this.showGroupForm = true;
    this.clearFormMessage();
    this.groupForm.patchValue(group);
  }

  saveGroup(): void {
  if (this.groupForm.invalid) {
    this.groupForm.markAllAsTouched();
    return;
  }

  const formValue = this.groupForm.value;
  if (Number(formValue.minDuration) > Number(formValue.maxDuration)) {
    this.groupForm.get('maxDuration')?.setErrors({ range: true });
    return;
  }

  const payload = {
    ...formValue,
    code: String(formValue.code || '').trim(),
    minEligibleSalary: Number(formValue.minEligibleSalary),
    monthlyContributionAmount: Number(formValue.monthlyContributionAmount),
    maxBorrowingPercentage: Number(formValue.maxBorrowingPercentage),
    minAmount: 0,
    maxAmount: 0,
    withdrawCap: 0,
    interestRate: Number(formValue.interestRate),
    memberLimit: formValue.memberLimit ? Number(formValue.memberLimit) : undefined,
    contributionsBankName: String(formValue.contributionsBankName || '').trim(),
    contributionsAccount: String(formValue.contributionsAccount || '').trim(),
    principalBankName: String(formValue.principalBankName || '').trim(),
    principalCollectionAccount: String(formValue.principalCollectionAccount || '').trim(),
    interestBankName: String(formValue.interestBankName || '').trim(),
    interestCollectionAccount: String(formValue.interestCollectionAccount || '').trim(),
    lateFeePercentage: Number(formValue.lateFeePercentage),
    lateFeeBankName: String(formValue.lateFeeBankName || '').trim(),
    lateFeeCollectionAccount: String(formValue.lateFeeCollectionAccount || '').trim(),
    lateFeeGraceDays: Number(formValue.lateFeeGraceDays),
    accountingEmail: String(formValue.accountingEmail || '').trim(),
    accountingWebhookUrl: String(formValue.accountingWebhookUrl || '').trim() || undefined,
    minDuration: Number(formValue.minDuration),
    maxDuration: Number(formValue.maxDuration),
    requiresShares: false,
    requiresGuarantors: Boolean(formValue.requiresGuarantors),
    minimumGuarantors: formValue.requiresGuarantors ? Number(formValue.minimumGuarantors || 0) : 0,
    patronageRate: Number(formValue.patronageRate)
  } as Omit<CooperativeLoanGroup, 'id'>;

  const request = this.editingGroupId
    ? this.cooperativeService.updateGroup({ id: this.editingGroupId, ...payload })
    : this.cooperativeService.createGroup(payload); // Use createGroup instead of addGroup

  request.subscribe({
    next: () => {
      this.loadGroups(); // This will refresh groups from backend
      this.showMessage('Group saved successfully.', 'success');
      this.cancelForm(1500);
    },
    error: (error) => {
      console.error('Error saving group:', error);
      this.showMessage('Failed to save group. Review the fields and try again.', 'error');
    }
  });
}

private showMessage(message: string, type: 'success' | 'error'): void {
  this.formMessage = message;
  this.formMessageSeverity = type;
}

  clearFormMessage(): void {
    this.formMessage = '';
  }

  normalizeAccountField(controlName: string): void {
    const control = this.groupForm.get(controlName);
    if (!control) {
      return;
    }

    const normalized = String(control.value || '')
      .replace(/\D+/g, '')
      .trim();
    control.setValue(normalized, { emitEvent: false });
    control.updateValueAndValidity({ emitEvent: false });
}

  hasControlError(controlName: string, errorName?: string): boolean {
    const control = this.groupForm.get(controlName);
    if (!control) {
      return false;
    }

    const shouldShow = control.invalid && (control.touched || control.dirty);
    if (!shouldShow) {
      return false;
    }

    return errorName ? !!control.errors?.[errorName] : true;
  }

  getControlErrorMessage(controlName: string): string {
    const control = this.groupForm.get(controlName);
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      switch (controlName) {
        case 'code':
          return 'Group code is required.';
        case 'name':
          return 'Group name is required.';
        case 'description':
          return 'Description is required.';
        case 'contributionsBankName':
          return 'Contributions bank name is required.';
        case 'contributionsAccount':
          return 'Contributions account is required.';
        case 'principalBankName':
          return 'Principal bank name is required.';
        case 'principalCollectionAccount':
          return 'Principal account is required.';
        case 'interestBankName':
          return 'Interest bank name is required.';
        case 'interestCollectionAccount':
          return 'Interest account is required.';
        case 'lateFeeBankName':
          return 'Late fee bank name is required.';
        case 'lateFeeCollectionAccount':
          return 'Late fee account is required.';
        case 'accountingEmail':
          return 'Accounting email is required.';
        default:
          return 'This field is required.';
      }
    }

    if (control.errors['email']) {
      return 'Enter a valid email address.';
    }

    if (control.errors['pattern']) {
      switch (controlName) {
        case 'contributionsAccount':
        case 'principalCollectionAccount':
        case 'interestCollectionAccount':
        case 'lateFeeCollectionAccount':
          return 'Account number must be exactly 10 digits.';
        default:
          return 'Enter a valid value.';
      }
    }

    if (control.errors['min']) {
      if (controlName === 'memberLimit') {
        return 'Member limit must be at least 1.';
      }
      return 'Value must be greater than or equal to 0.';
    }

    if (control.errors['range']) {
      return 'Max duration must be greater than or equal to min duration.';
    }

    return 'Enter a valid value.';
  }

  toggleGroupStatus(group: CooperativeLoanGroup): void {
    const nextStatus = group.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.cooperativeService.setGroupStatus(group.id, nextStatus).subscribe(() => {
      this.loadGroups();
    });
  }

  viewGroupDetails(group: CooperativeLoanGroup): void {
    this.selectedGroupForDetails = group;
    this.showGroupDetails = true;
  }

  closeGroupDetails(): void {
    this.showGroupDetails = false;
    this.selectedGroupForDetails = null;
  }

  openInviteMembersModal(group: CooperativeLoanGroup): void {
    this.selectedGroupForInvite = group;
    this.selectedGroupInviteHistory = this.cooperativeService.getGroupInviteHistory(group.id);
    this.showInviteMembersModal = true;
    this.inviteDepartmentFilter = 'ALL';
    this.inviteRankFilter = 'ALL';
    this.inviteTenureFilter = 'ALL';
    this.selectedInviteEmployeeIds.clear();
    this.inviteMessage = '';
  }

  closeInviteMembersModal(): void {
    this.showInviteMembersModal = false;
    this.selectedGroupForInvite = null;
    this.selectedGroupInviteHistory = [];
    this.selectedInviteEmployeeIds.clear();
    this.inviteMessage = '';
  }

  get inviteDepartmentOptions(): string[] {
    return [...new Set(this.employeeDirectory.map(employee => employee.department).filter(Boolean))].sort((left, right) =>
      left.localeCompare(right)
    );
  }

  get inviteRankOptions(): CooperativeEmployeeProfile['rank'][] {
    return ['JUNIOR', 'MID', 'SENIOR', 'EXEC'];
  }

  get filteredInviteEmployees(): GroupInviteEmployeeRow[] {
    return this.employeeDirectory.filter(employee => {
      const matchesDepartment = this.inviteDepartmentFilter === 'ALL' || employee.department === this.inviteDepartmentFilter;
      const matchesRank = this.inviteRankFilter === 'ALL' || employee.rank === this.inviteRankFilter;
      const matchesTenure = this.matchesTenureFilter(employee.tenureMonths, this.inviteTenureFilter);

      return matchesDepartment && matchesRank && matchesTenure;
    });
  }

  get selectableFilteredInviteEmployees(): GroupInviteEmployeeRow[] {
    return this.filteredInviteEmployees.filter(employee => this.canInviteEmployee(employee));
  }

  get selectedInviteCount(): number {
    return this.selectedInviteEmployeeIds.size;
  }

  get isAllVisibleInviteEmployeesSelected(): boolean {
    return this.selectableFilteredInviteEmployees.length > 0
      && this.selectableFilteredInviteEmployees.every(employee => this.selectedInviteEmployeeIds.has(employee.employeeId));
  }

  get inviteEmailSubject(): string {
    if (!this.selectedGroupForInvite) {
      return 'New cooperative group available';
    }

    return `New cooperative group available: ${this.selectedGroupForInvite.name}`;
  }

  get inviteEmailBodyPreview(): string {
    if (!this.selectedGroupForInvite) {
      return '';
    }

    return `A new cooperative group, ${this.selectedGroupForInvite.name}, is now open for applications. Visit your My Membership dashboard to review the group and submit an application if you are interested. Please note that applications still go through the normal review process and may be declined if the group criteria are not met.`;
  }

  get inviteActionLabel(): string {
    return this.selectedInviteCount === 1 ? 'Send Invite Email' : 'Send Invite Emails';
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
      return;
    }
    this.selectedInviteEmployeeIds.add(employeeId);
  }


  toggleAllVisibleInviteSelection(): void {
    if (this.isAllVisibleInviteEmployeesSelected) {
      this.selectableFilteredInviteEmployees.forEach(employee => this.selectedInviteEmployeeIds.delete(employee.employeeId));
      return;
    }
    this.selectableFilteredInviteEmployees.forEach(employee => this.selectedInviteEmployeeIds.add(employee.employeeId));
  }

  sendGroupInviteEmails(): void {
    if (!this.selectedGroupForInvite || this.isSendingInviteEmails) {
      return;
    }

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
              rank: employee.rank,
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
            <li><strong>Rank:</strong> ${employee.rank}</li>
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

  get groupInviteHistoryCount(): number {
    return this.selectedGroupInviteHistory.length;
  }

  getHistoryDateLabel(sentAt: string): string {
    return new Date(sentAt).toLocaleString();
  }

  getInviteTenureLabel(employee: GroupInviteEmployeeRow): string {
    return this.getTenureLabel(employee.tenureMonths);
  }

  getTenureLabel(tenureMonths: number): string {
    const years = Math.floor(tenureMonths / 12);
    const months = tenureMonths % 12;

    if (years <= 0) {
      return `${months}mo`;
    }

    if (months === 0) {
      return `${years}y`;
    }

    return `${years}y ${months}mo`;
  }

  getInviteStatusLabel(employee: GroupInviteEmployeeRow): string {
    if (!this.isEmployeeSalaryEligible(employee)) {
      return 'INELIGIBLE';
    }

    const member = this.getMemberByEmployeeEmail(employee.email);
    if (!member || !this.selectedGroupForInvite) {
      return 'Eligible';
    }

    const membership = this.cooperativeService.getGroupMembership(member.id, this.selectedGroupForInvite.id);
    if (membership?.status === 'ACTIVE') {
      return 'Already a member';
    }

    if (membership?.status === 'PENDING') {
      return 'Application pending';
    }

    return 'Eligible';
  }

  cancelForm(delayMs = 0): void {
    const finalize = (): void => {
      this.showGroupForm = false;
      this.editingGroupId = null;
      this.clearFormMessage();
    };

    if (delayMs > 0) {
      window.setTimeout(finalize, delayMs);
      return;
    }

    finalize();
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  openGroupJoinHistory(): void {
    this.router.navigate(['/admin/hr/cooperative/group-join-applications', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/dashboard', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  private mapEmployeeToInviteRow(employee: any): GroupInviteEmployeeRow | null {
    const firstName = String(employee?.firstName || '').trim();
    const lastName = String(employee?.lastName || '').trim();
    const fallbackName = String(employee?.fullName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || fallbackName;
    const email = String(employee?.email || employee?.workEmail || '').trim();
    const employeeIdRaw = employee?.id ?? employee?.employeeId ?? employee?.staffId;
    const employeeId = typeof employeeIdRaw === 'string' ? parseInt(employeeIdRaw, 10) : Number(employeeIdRaw);
    if (!employeeId || isNaN(employeeId)) {
      return null;
    }

    if (!fullName || !email || !employeeId) {
      return null;
    }

    const department = String(employee?.department?.name || employee?.department || employee?.unit || 'Unassigned').trim() || 'Unassigned';
    const levelName = String(employee?.level?.name || employee?.level || employee?.jobTitle || '').trim();
    const employmentStartDate = employee?.employementStartDate || employee?.employmentStartDate || employee?.hireDate || employee?.createdAt;
    let normalizedStartDate = '';
    if (employmentStartDate) {
      const dateObj = new Date(employmentStartDate);
      normalizedStartDate = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : '';
    } else {
      normalizedStartDate = new Date().toISOString();
    }

    return {
      employeeId,
      fullName,
      email,
      department,
      rank: this.mapRank(levelName),
      employmentStartDate: normalizedStartDate,
      tenureMonths: this.getTenureMonths(normalizedStartDate),
      monthlySalary: Number(employee?.monthlySalary || employee?.salary || employee?.baseSalary || 0)
    };
  }

  private isEmployeeSalaryEligible(employee: GroupInviteEmployeeRow): boolean {
    if (!this.selectedGroupForInvite) {
      return true;
    }

    const minimumSalary = Number(this.selectedGroupForInvite.minEligibleSalary || 0);
    const employeeSalary = Number(this.employeeSalaryById[employee.employeeId] ?? employee.monthlySalary ?? 0);
    return employeeSalary >= minimumSalary;
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

  private getTenureMonths(startDate: string): number {
    const parsedDate = new Date(startDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return 0;
    }

    const now = new Date();
    let months = (now.getFullYear() - parsedDate.getFullYear()) * 12;
    months += now.getMonth() - parsedDate.getMonth();

    if (now.getDate() < parsedDate.getDate()) {
      months -= 1;
    }

    return Math.max(months, 0);
  }

  private matchesTenureFilter(tenureMonths: number, filter: InviteTenureFilter): boolean {
    if (filter === 'ALL') {
      return true;
    }

    if (filter === 'UNDER_6_MONTHS') {
      return tenureMonths < 6;
    }

    if (filter === 'SIX_TO_TWELVE_MONTHS') {
      return tenureMonths >= 6 && tenureMonths < 12;
    }

    if (filter === 'ONE_TO_THREE_YEARS') {
      return tenureMonths >= 12 && tenureMonths <= 36;
    }

    return tenureMonths > 36;
  }

  private isEmployeeAlreadyInSelectedGroup(employee: GroupInviteEmployeeRow): boolean {
    if (!this.selectedGroupForInvite) {
      return false;
    }

    const member = this.getMemberByEmployeeEmail(employee.email);
    if (!member) {
      return false;
    }

    const membership = this.cooperativeService.getGroupMembership(member.id, this.selectedGroupForInvite.id);
    return membership?.status === 'ACTIVE' || membership?.status === 'PENDING';
  }

  private getMemberByEmployeeEmail(email: string): CooperativeMember | undefined {
    const normalizedEmail = email.trim().toLowerCase();
    return this.members.find(member => member.email.trim().toLowerCase() === normalizedEmail);
  }
}
