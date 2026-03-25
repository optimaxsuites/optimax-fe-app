import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { EmployeeService } from '../../../service/employee.service';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import {
  CooperativeEmployeeProfile,
  CooperativeGroupMembership,
  CooperativeGroupInviteHistoryEntry,
  CooperativeLoanGroup,
  CooperativeMember
} from '../../../service/loan/cooperative-loan/cooperative.types';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';

interface GroupMetrics {
  memberCount: number;
  totalContribution: number;
  members: Array<{ name: string; monthlyContributionAmount: number; totalContribution: number }>;
}

interface GroupTableRow {
  id: string;
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
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
  rank: CooperativeEmployeeProfile['rank'];
  employmentStartDate: string;
  tenureMonths: number;
}

@Component({
  selector: 'app-cooperative-loan-groups',
  templateUrl: './cooperative-loan-groups.component.html',
  styleUrls: ['./cooperative-loan-groups.component.scss']
})
export class CooperativeLoanGroupsComponent implements OnInit {
  currentUuid = uuidV4();
  groups: CooperativeLoanGroup[] = [];
  members: CooperativeMember[] = [];
  employeeDirectory: GroupInviteEmployeeRow[] = [];
  groupMetricsById: Record<string, GroupMetrics> = {};
  groupSummaryRows: GroupTableRow[] = [];
  showGroupForm = false;
  showGroupDetails = false;
  showInviteMembersModal = false;
  selectedGroupForDetails: CooperativeLoanGroup | null = null;
  selectedGroupForInvite: CooperativeLoanGroup | null = null;
  selectedGroupInviteHistory: CooperativeGroupInviteHistoryEntry[] = [];
  editingGroupId: string | null = null;
  groupForm!: FormGroup;
  inviteDepartmentFilter = 'ALL';
  inviteRankFilter: CooperativeEmployeeProfile['rank'] | 'ALL' = 'ALL';
  inviteTenureFilter: InviteTenureFilter = 'ALL';
  selectedInviteEmployeeIds = new Set<string>();
  inviteMessage = '';

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
    this.loadMembers();
    this.loadGroups();
    this.loadEmployeeDirectory();
  }

  loadMembers(): void {
    this.cooperativeService.getMembers().subscribe(members => {
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
      },
      error: () => {
        this.employeeDirectory = [];
      }
    });
  }

  initializeForm(): void {
    this.groupForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      minEligibleSalary: [0, [Validators.required, Validators.min(0)]],
      monthlyContributionAmount: [1000, [Validators.required, Validators.min(1)]],
      maxBorrowingPercentage: [100, [Validators.required, Validators.min(1)]],
      minAmount: [1000, [Validators.required, Validators.min(1)]],
      maxAmount: [10000, [Validators.required, Validators.min(1)]],
      interestRate: [0, [Validators.required, Validators.min(0)]],
      minDuration: [1, [Validators.required, Validators.min(1)]],
      maxDuration: [12, [Validators.required, Validators.min(1)]],
      requiresShares: [false],
      patronageEligible: [true],
      patronageRate: [0, [Validators.required, Validators.min(0)]],
      status: ['ACTIVE', Validators.required]
    });

    this.groupForm.get('patronageEligible')?.valueChanges.subscribe(enabled => {
      if (!enabled) {
        this.groupForm.get('patronageRate')?.setValue(0);
      }
    });
  }

  loadGroups(): void {
    this.cooperativeService.loadGroups().subscribe(groups => {
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
    }, {} as Record<string, GroupMetrics>);

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

  getGroupMetrics(groupId: string): GroupMetrics {
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
    this.groupForm.reset({
      name: '',
      description: '',
      minEligibleSalary: 0,
      monthlyContributionAmount: 1000,
      maxBorrowingPercentage: 100,
      minAmount: 1000,
      maxAmount: 10000,
      interestRate: 0,
      minDuration: 1,
      maxDuration: 12,
      requiresShares: false,
      patronageEligible: true,
      patronageRate: 0,
      status: 'ACTIVE'
    });
  }

  openEditForm(group: CooperativeLoanGroup): void {
    this.editingGroupId = group.id;
    this.showGroupForm = true;
    this.groupForm.patchValue(group);
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }

    const formValue = this.groupForm.value;
    if (Number(formValue.minAmount) > Number(formValue.maxAmount)) {
      this.groupForm.get('maxAmount')?.setErrors({ range: true });
      return;
    }

    if (Number(formValue.minDuration) > Number(formValue.maxDuration)) {
      this.groupForm.get('maxDuration')?.setErrors({ range: true });
      return;
    }

    const payload = {
      ...formValue,
      minEligibleSalary: Number(formValue.minEligibleSalary),
      monthlyContributionAmount: Number(formValue.monthlyContributionAmount),
      maxBorrowingPercentage: Number(formValue.maxBorrowingPercentage),
      minAmount: Number(formValue.minAmount),
      maxAmount: Number(formValue.maxAmount),
      interestRate: Number(formValue.interestRate),
      minDuration: Number(formValue.minDuration),
      maxDuration: Number(formValue.maxDuration),
      patronageRate: Number(formValue.patronageRate)
    } as Omit<CooperativeLoanGroup, 'id'>;

    const request = this.editingGroupId
      ? this.cooperativeService.updateGroup({ id: this.editingGroupId, ...payload })
      : this.cooperativeService.addGroup(payload);

    request.subscribe(() => {
      this.cancelForm();
      this.loadGroups();
    });
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
    return !this.isEmployeeAlreadyInSelectedGroup(employee);
  }

  isInviteSelected(employeeId: string): boolean {
    return this.selectedInviteEmployeeIds.has(employeeId);
  }

  toggleInviteSelection(employeeId: string): void {
    if (this.selectedInviteEmployeeIds.has(employeeId)) {
      this.selectedInviteEmployeeIds.delete(employeeId);
      return;
    }

    this.selectedInviteEmployeeIds.add(employeeId);
  }

  toggleSelectAllVisibleInviteEmployees(): void {
    if (this.isAllVisibleInviteEmployeesSelected) {
      this.selectableFilteredInviteEmployees.forEach(employee => this.selectedInviteEmployeeIds.delete(employee.employeeId));
      return;
    }

    this.selectableFilteredInviteEmployees.forEach(employee => this.selectedInviteEmployeeIds.add(employee.employeeId));
  }

  sendGroupInviteEmails(): void {
    if (!this.selectedGroupForInvite) {
      return;
    }

    const recipients = this.employeeDirectory.filter(employee => this.selectedInviteEmployeeIds.has(employee.employeeId));
    if (recipients.length === 0) {
      this.inviteMessage = 'Select at least one employee to send the group invitation email.';
      return;
    }

    const emailSubject = this.inviteEmailSubject;
    const emailBody = this.inviteEmailBodyPreview;
    this.cooperativeService.recordGroupInvites(
      this.selectedGroupForInvite.id,
      recipients.map(employee => ({
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
    this.selectedGroupInviteHistory = this.cooperativeService.getGroupInviteHistory(this.selectedGroupForInvite.id);

    const recipientEmails = recipients.map(employee => employee.email).join(', ');
    this.inviteMessage = `Invitation email prepared for ${recipients.length} employee${recipients.length === 1 ? '' : 's'} for ${this.selectedGroupForInvite.name}. Recipients: ${recipientEmails}. The email directs them to the My Membership dashboard, where they can still apply and be reviewed.`;
    this.selectedInviteEmployeeIds.clear();
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

  cancelForm(): void {
    this.showGroupForm = false;
    this.editingGroupId = null;
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
    this.backNavigationService.goBack(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  private mapEmployeeToInviteRow(employee: any): GroupInviteEmployeeRow | null {
    const firstName = String(employee?.firstName || '').trim();
    const lastName = String(employee?.lastName || '').trim();
    const fallbackName = String(employee?.fullName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || fallbackName;
    const email = String(employee?.email || employee?.workEmail || '').trim();
    const employeeId = String(employee?.id ?? employee?.employeeId ?? employee?.staffId ?? '').trim();

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
      tenureMonths: this.getTenureMonths(normalizedStartDate)
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
