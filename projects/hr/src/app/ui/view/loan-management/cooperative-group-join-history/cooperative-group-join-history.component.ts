import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import {
  CooperativeLoanGroup
} from '../../../service/loan/cooperative-loan/cooperative.types';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { CooperativeGroupMembership, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';

type GroupJoinStatusFilter = 'ALL' | CooperativeGroupMembership['status'];

interface GroupJoinHistoryRow {
  id: string;
  memberId: string;
  memberName: string;
  memberCode: string; // will be formatted as COP-XXX
  groupName: string;
  status: CooperativeGroupMembership['status'];
  requestedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  rejectionReason?: string;
}

@Component({
  selector: 'app-cooperative-group-join-history',
  templateUrl: './cooperative-group-join-history.component.html',
  styleUrls: ['./cooperative-group-join-history.component.scss']
})
export class CooperativeGroupJoinHistoryComponent implements OnInit {
  // Pagination
  pageSize = 20;
  currentPage = 1;

  isLoading = true;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredApplications.length / this.pageSize));
  }

  get pagedApplications(): GroupJoinHistoryRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredApplications.slice(start, start + this.pageSize);
  }

  currentUuid = uuidV4();
  applications: GroupJoinHistoryRow[] = [];
  statusFilter: GroupJoinStatusFilter = 'ALL';
  searchTerm = '';
  actionMessage = '';
  showReviewModal = false;
  reviewAction: 'approve' | 'reject' = 'approve';
  reviewNote = '';
  reviewError = '';
  selectedApplication?: GroupJoinHistoryRow;

  readonly applicationColumns: TableColumn<GroupJoinHistoryRow>[] = [
    { header: 'Member', field: 'memberName', sortable: true },
    { header: 'Member ID', field: 'memberCode', sortable: true, formatter: (row) => this.formatMemberId(row.memberCode) },
    { header: 'Group', field: 'groupName', sortable: true },
    { 
      header: 'Status', 
      field: 'status', 
      sortable: true,
      formatter: (row) => {
        if (row.status === 'ACTIVE') return 'Active';
        if (row.status === 'PENDING') return 'Pending';
        if (row.status === 'REJECTED') return 'Rejected';
        return row.status;
      },
      badgeClass: (row) => {
        if (row.status === 'ACTIVE') return 'status-badge status-active';
        if (row.status === 'PENDING') return 'status-badge status-pending';
        if (row.status === 'REJECTED') return 'status-badge status-rejected';
        return 'status-badge';
      }
    },
    { header: 'Requested', sortField: 'requestedAt', sortable: true, formatter: (row) => new Date(row.requestedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) },
    {
      header: 'Reviewed',
      sortField: 'reviewedAt',
      sortable: true,
      formatter: (row) => row.reviewedAt ? new Date(row.reviewedAt).toLocaleString() : 'Awaiting review'
    },
    {
      header: 'Notes',
      formatter: (row) => row.reviewNote || row.rejectionReason || 'No note'
    }
  ];

  private formatMemberId(memberCode: string): string {
    // If already formatted, return as is
    if (memberCode && memberCode.startsWith('COP-')) return memberCode;
    // Try to extract numeric part
    const num = Number(memberCode);
    if (!isNaN(num)) {
      return `COP-${num.toString().padStart(3, '0')}`;
    }
    return memberCode || '';
  }

  readonly applicationActions: TableAction<GroupJoinHistoryRow>[] = [
    { id: 'view', label: '', ariaLabel: 'View group join request', className: 'view-btn', icon: 'pi pi-eye' },
    { id: 'approve', label: '', ariaLabel: 'Approve group join request', className: 'approve-btn', icon: 'pi pi-check', visible: (row) => row.status === 'PENDING' },
    { id: 'reject', label: '', ariaLabel: 'Reject group join request', className: 'reject-btn', icon: 'pi pi-times', visible: (row) => row.status === 'PENDING' }
  ];

  constructor(
    private readonly cooperativeService: CooperativeService,
    private readonly backNavigationService: BackNavigationService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

      this.isLoading = true;
      forkJoin({
        groups: this.cooperativeService.loadGroups(),
        members: this.cooperativeService.getMembers(),
        memberships: this.cooperativeService.loadGroupMemberships()
      }).subscribe({
        next: () => {
          this.loadApplications();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }

  get filteredApplications(): GroupJoinHistoryRow[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    return this.applications.filter(application => {
      const matchesStatus = this.statusFilter === 'ALL' || application.status === this.statusFilter;
      const matchesSearch = !normalizedSearch || [
        application.memberName,
        application.memberCode,
        application.groupName,
        application.status,
        application.rejectionReason || ''
      ].some(value => value.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesSearch;
    });
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pendingCount(): number {
    return this.applications.filter(application => application.status === 'PENDING').length;
  }

  get approvedCount(): number {
    return this.applications.filter(application => application.status === 'ACTIVE').length;
  }

  get rejectedCount(): number {
    return this.applications.filter(application => application.status === 'REJECTED').length;
  }

  setStatusFilter(filter: GroupJoinStatusFilter): void {
    this.statusFilter = filter;
    this.currentPage = 1; // Reset to first page when filter changes
  }

  approveApplication(id: string, note = ''): void {
    this.cooperativeService.approveGroupMembership(Number(id), note).subscribe({
      next: (updatedMembership) => {
        if (!updatedMembership) {
          this.actionMessage = 'Unable to approve the selected join request.';
          return;
        }

        const memberName = this.resolveMember(String(updatedMembership.memberId))?.fullName || 'Member';
        const groupName = this.cooperativeService.getGroupById(updatedMembership.groupId)?.name || 'the selected group';
        this.actionMessage = `${memberName} has been approved to join ${groupName}.`;
        this.loadApplications();
        
        // Clear message after 5 seconds
        setTimeout(() => {
          this.actionMessage = '';
        }, 5000);
      },
      error: () => {
        this.actionMessage = 'Unable to approve the selected join request.';
        setTimeout(() => {
          this.actionMessage = '';
        }, 5000);
      }
    });
  }

  rejectApplication(id: string, reason: string): void {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      this.actionMessage = 'A rejection reason is required.';
      setTimeout(() => {
        this.actionMessage = '';
      }, 5000);
      return;
    }

    this.cooperativeService.rejectGroupMembership(Number(id), trimmedReason).subscribe({
      next: (updatedMembership) => {
        if (!updatedMembership) {
          this.actionMessage = 'Unable to reject the selected join request.';
          return;
        }

        const memberName = this.resolveMember(String(updatedMembership.memberId))?.fullName || 'Member';
        const groupName = this.cooperativeService.getGroupById(updatedMembership.groupId)?.name || 'the selected group';
        this.actionMessage = `${memberName}'s request to join ${groupName} was rejected.`;
        this.loadApplications();
        
        setTimeout(() => {
          this.actionMessage = '';
        }, 5000);
      },
      error: () => {
        this.actionMessage = 'Unable to reject the selected join request.';
        setTimeout(() => {
          this.actionMessage = '';
        }, 5000);
      }
    });
  }

  viewMember(memberId: string): void {
    this.router.navigate([`/admin/hr/cooperative/members/${memberId}/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative', source: 'group-join-history' }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  handleApplicationAction(event: { actionId: string; row: GroupJoinHistoryRow }): void {
    if (event.actionId === 'view') {
      this.viewMember(event.row.memberId);
      return;
    }

    if (event.actionId === 'approve') {
      this.openReviewModal('approve', event.row);
      return;
    }

    if (event.actionId === 'reject') {
      this.openReviewModal('reject', event.row);
    }
  }

  openReviewModal(action: 'approve' | 'reject', application: GroupJoinHistoryRow): void {
    this.reviewAction = action;
    this.selectedApplication = application;
    this.reviewNote = '';
    this.reviewError = '';
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.reviewNote = '';
    this.reviewError = '';
    this.selectedApplication = undefined;
  }

  submitReview(): void {
    if (!this.selectedApplication) {
      return;
    }

    if (this.reviewAction === 'reject' && !this.reviewNote.trim()) {
      this.reviewError = 'A rejection reason is required.';
      return;
    }

    if (this.reviewAction === 'approve') {
      this.approveApplication(this.selectedApplication.id, this.reviewNote.trim());
    } else {
      this.rejectApplication(this.selectedApplication.id, this.reviewNote.trim());
    }

    this.closeReviewModal();
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  private loadApplications(): void {
    const members = this.cooperativeService.getMembersSnapshot();
    const memberMap = new Map<number, CooperativeMember>(members.map((member: CooperativeMember) => [member.id, member]));
    const groupMap = new Map<number, CooperativeLoanGroup>(this.cooperativeService.getGroups().map((group: CooperativeLoanGroup) => [group.id, group]));

    this.applications = this.cooperativeService.getGroupMemberships()
      .map((membership: CooperativeGroupMembership) => {
        const member = memberMap.get(membership.memberId) || {} as CooperativeMember;
        const group = groupMap.get(membership.groupId) || {} as CooperativeLoanGroup;
        return {
          id: String(membership.id),
          memberId: String(membership.memberId),
          memberName: this.cooperativeService.getMemberDisplayName(membership.memberId),
          memberCode: String(member?.memberId || membership.memberId),
          groupName: group?.name || 'Unknown group',
          status: membership.status,
          requestedAt: membership.requestedAt || membership.joinedAt || new Date().toISOString(),
          reviewedAt: membership.reviewedAt,
          reviewNote: membership.reviewNote,
          rejectionReason: membership.rejectionReason
        };
      })
      .sort((a: GroupJoinHistoryRow, b: GroupJoinHistoryRow) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  private resolveMember(memberId: string): CooperativeMember | undefined {
    return this.cooperativeService.getMembersSnapshot().find((member: CooperativeMember) => String(member.id) === memberId || String(member.memberId) === memberId);
  }
}