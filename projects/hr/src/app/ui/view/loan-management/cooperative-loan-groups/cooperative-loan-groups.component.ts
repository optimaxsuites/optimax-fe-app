import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeGroupMembership, CooperativeLoanGroup, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
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

@Component({
  selector: 'app-cooperative-loan-groups',
  templateUrl: './cooperative-loan-groups.component.html',
  styleUrls: ['./cooperative-loan-groups.component.scss']
})
export class CooperativeLoanGroupsComponent implements OnInit {
  currentUuid = uuidV4();
  groups: CooperativeLoanGroup[] = [];
  members: CooperativeMember[] = [];
  groupMetricsById: Record<string, GroupMetrics> = {};
  groupSummaryRows: GroupTableRow[] = [];
  showGroupForm = false;
  showGroupDetails = false;
  selectedGroupForDetails: CooperativeLoanGroup | null = null;
  editingGroupId: string | null = null;
  groupForm!: FormGroup;

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
    { id: 'view', label: 'View', className: 'view-btn' },
    { id: 'edit', label: 'Edit', className: 'edit-btn' },
    { id: 'deactivate', label: 'Deactivate', className: 'toggle-btn', visible: (row: GroupTableRow) => row.status === 'ACTIVE' },
    { id: 'activate', label: 'Activate', className: 'toggle-btn', visible: (row: GroupTableRow) => row.status === 'INACTIVE' }
  ];

  constructor(
    private cooperativeService: CooperativeService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    this.initializeForm();
    this.loadMembers();
    this.loadGroups();
  }

  loadMembers(): void {
    this.cooperativeService.getMembers().subscribe(members => {
      this.members = members;
      this.rebuildGroupMetrics();
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
    this.groups = this.cooperativeService.getGroups();
    this.rebuildGroupMetrics();
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

    if (this.editingGroupId) {
      this.cooperativeService.updateGroup({ id: this.editingGroupId, ...payload });
    } else {
      this.cooperativeService.addGroup(payload);
    }

    this.cancelForm();
    this.loadGroups();
  }

  toggleGroupStatus(group: CooperativeLoanGroup): void {
    const nextStatus = group.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.cooperativeService.setGroupStatus(group.id, nextStatus);
    this.loadGroups();
  }

  viewGroupDetails(group: CooperativeLoanGroup): void {
    this.selectedGroupForDetails = group;
    this.showGroupDetails = true;
  }

  closeGroupDetails(): void {
    this.showGroupDetails = false;
    this.selectedGroupForDetails = null;
  }

  cancelForm(): void {
    this.showGroupForm = false;
    this.editingGroupId = null;
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }
}
