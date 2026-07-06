import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import {
  CooperativeLoanGroup
} from '../../../service/loan/cooperative-loan/cooperative.types';
import { CooperativeGroupMembership, CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';

type GroupJoinStatusFilter = 'ALL' | CooperativeGroupMembership['status'];

interface GroupJoinHistoryRow {
  id: string;
  memberId: string;
  memberName: string;
  memberCode: string;
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
  styleUrls: ['./cooperative-group-join-history.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CooperativeGroupJoinHistoryComponent implements OnInit {
  pageSize = 10;
  currentPage = 1;
  sortField: string = 'requestedAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  isLoading = true;
  Math = Math;

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

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredApplications.length / this.pageSize));
  }

  get pagedApplications(): GroupJoinHistoryRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredApplications.slice(start, start + this.pageSize);
  }

  get filteredApplications(): GroupJoinHistoryRow[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    let filtered = this.applications.filter(application => {
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
    
    filtered = this.sortApplications(filtered);
    return filtered;
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

  constructor(
    private readonly cooperativeService: CooperativeService,
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

  setStatusFilter(filter: GroupJoinStatusFilter): void {
    this.statusFilter = filter;
    this.currentPage = 1;
  }

  approveApplication(id: string, note = ''): void {
    this.cooperativeService.approveGroupMembership(Number(id), note).subscribe({
      next: (updatedMembership) => {
        if (!updatedMembership) {
          this.actionMessage = 'Unable to approve the selected join request.';
          return;
        }
        this.isLoading = true;
        forkJoin({
          groups: this.cooperativeService.refreshGroups(),
          members: this.cooperativeService.getMembers(),
          memberships: this.cooperativeService.loadGroupMemberships()
        }).subscribe({
          next: () => {
            this.loadApplications();
            this.isLoading = false;
            const memberName = this.resolveMember(String(updatedMembership.memberId))?.fullName || 'Member';
            const groupName = this.cooperativeService.getGroupById(updatedMembership.groupId)?.name || 'the selected group';
            this.actionMessage = `${memberName} has been approved to join ${groupName}.`;
            setTimeout(() => { this.actionMessage = ''; }, 5000);
          },
          error: () => {
            this.isLoading = false;
            this.actionMessage = 'Unable to refresh data after approval.';
            setTimeout(() => { this.actionMessage = ''; }, 5000);
          }
        });
      },
      error: () => {
        this.actionMessage = 'Unable to approve the selected join request.';
        setTimeout(() => { this.actionMessage = ''; }, 5000);
      }
    });
  }

  rejectApplication(id: string, reason: string): void {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      this.actionMessage = 'A rejection reason is required.';
      setTimeout(() => { this.actionMessage = ''; }, 5000);
      return;
    }

    this.cooperativeService.rejectGroupMembership(Number(id), trimmedReason).subscribe({
      next: (updatedMembership) => {
        if (!updatedMembership) {
          this.actionMessage = 'Unable to reject the selected join request.';
          return;
        }
        this.isLoading = true;
        forkJoin({
          groups: this.cooperativeService.refreshGroups(),
          members: this.cooperativeService.getMembers(),
          memberships: this.cooperativeService.loadGroupMemberships()
        }).subscribe({
          next: () => {
            this.loadApplications();
            this.isLoading = false;
            const memberName = this.resolveMember(String(updatedMembership.memberId))?.fullName || 'Member';
            const groupName = this.cooperativeService.getGroupById(updatedMembership.groupId)?.name || 'the selected group';
            this.actionMessage = `${memberName}'s request to join ${groupName} was rejected.`;
            setTimeout(() => { this.actionMessage = ''; }, 5000);
          },
          error: () => {
            this.isLoading = false;
            this.actionMessage = 'Unable to refresh data after rejection.';
            setTimeout(() => { this.actionMessage = ''; }, 5000);
          }
        });
      },
      error: () => {
        this.actionMessage = 'Unable to reject the selected join request.';
        setTimeout(() => { this.actionMessage = ''; }, 5000);
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
    if (!this.selectedApplication) return;

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

  private loadApplications(): void {
    const members = this.cooperativeService.getMembersSnapshot();
    const memberMap = new Map<number, CooperativeMember>(members.map((member: CooperativeMember) => [member.id, member]));
    const groupMap = new Map<number, CooperativeLoanGroup>(this.cooperativeService.getGroups().map((group: CooperativeLoanGroup) => [group.id, group]));

    this.applications = this.cooperativeService.getGroupMemberships()
      .filter((membership: CooperativeGroupMembership) => Number(membership.memberId) > 0 && Number(membership.groupId) > 0)
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
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  private resolveMember(memberId: string): CooperativeMember | undefined {
    return this.cooperativeService.getMembersSnapshot().find(
      (member: CooperativeMember) => String(member.id) === memberId || String(member.memberId) === memberId
    );
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
  }

  private sortApplications(applications: GroupJoinHistoryRow[]): GroupJoinHistoryRow[] {
    const sorted = [...applications];
    return sorted.sort((a, b) => {
      let valA: any, valB: any;
      
      switch (this.sortField) {
        case 'memberName':
          valA = a.memberName.toLowerCase();
          valB = b.memberName.toLowerCase();
          break;
        case 'memberCode':
          valA = this.formatMemberId(a.memberCode);
          valB = this.formatMemberId(b.memberCode);
          break;
        case 'groupName':
          valA = a.groupName.toLowerCase();
          valB = b.groupName.toLowerCase();
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'requestedAt':
          valA = new Date(a.requestedAt).getTime();
          valB = new Date(b.requestedAt).getTime();
          break;
        case 'reviewedAt':
          valA = a.reviewedAt ? new Date(a.reviewedAt).getTime() : 0;
          valB = b.reviewedAt ? new Date(b.reviewedAt).getTime() : 0;
          break;
        default:
          valA = a.memberName.toLowerCase();
          valB = b.memberName.toLowerCase();
      }
      
      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'ALL';
    this.sortField = 'requestedAt';
    this.sortDirection = 'desc';
    this.currentPage = 1;
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  formatMemberId(memberCode: string): string {
    if (!memberCode) return '—';
    if (memberCode.startsWith('COP-')) return memberCode;
    const num = Number(memberCode);
    if (!isNaN(num)) {
      return `COP-${num.toString().padStart(3, '0')}`;
    }
    return memberCode;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }
}