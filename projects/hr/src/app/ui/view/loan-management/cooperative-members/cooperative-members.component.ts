import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';

interface MemberMessage {
  severity: 'success' | 'error';
  summary: string;
  detail: string;
}

@Component({
  selector: 'app-cooperative-members',
  templateUrl: './cooperative-members.component.html',
  styleUrls: ['./cooperative-members.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CooperativeMembersComponent implements OnInit {
  formatDate(value: any): string {
    if (!value) return '-';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return String(value);
  }

  readonly pageSize = 20;
  currentPage = 1;
  currentUuid = uuidV4();
  members: CooperativeMember[] = [];
  filteredMembers: CooperativeMember[] = [];
  isLoading = true;
  searchTerm = '';
  messages: MemberMessage[] = [];

  // Filters
  filters = {
    status: '',
    joinDateFrom: '',
    joinDateTo: ''
  };

  // Sorting
  sortField = 'memberId';
  sortDirection: 'asc' | 'desc' = 'asc';

  statusOptions = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMembers.length / this.pageSize));
  }

  get paginationStart(): number {
    return this.filteredMembers.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredMembers.length);
  }

  get paginatedMembers(): CooperativeMember[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredMembers.slice(startIndex, startIndex + this.pageSize);
  }

  get suspendedMembersCount(): number {
    return this.members.filter(m => m.status === 'SUSPENDED').length;
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  get inactiveMembersCount(): number {
    return this.members.filter(m => m.status === 'INACTIVE').length;
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filters = { status: '', joinDateFrom: '', joinDateTo: '' };
    this.sortField = 'memberId';
    this.sortDirection = 'asc';
    this.applyFilters();
  }

  viewMember(id: number): void {
    this.router.navigate([`/admin/hr/cooperative/members/${id}/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  // Format member ID as COP-XXX (zero-padded)
  formatMemberId(memberId: number): string {
    return `COP-${String(memberId).padStart(3, '0')}`;
  }

  // Title Case for status
  formatStatus(status: string): string {
    if (!status) return '';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  get activeMembersCount(): number {
    return this.members.filter((member) => member.status === 'ACTIVE').length;
  }

  // ==================== SORTING METHODS ====================
  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // ==================== MESSAGE METHODS ====================
  private showSuccess(detail: string): void {
    this.messages = [{ severity: 'success', summary: 'Success', detail }];
    setTimeout(() => { this.messages = []; }, 5000);
  }

  private showError(detail: string): void {
    this.messages = [{ severity: 'error', summary: 'Error', detail }];
    setTimeout(() => { this.messages = []; }, 7000);
  }

  constructor(
    private cooperativeService: CooperativeService,
    private route: ActivatedRoute,
    private router: Router,
    private backNavigationService: BackNavigationService
  ) {}

  ngOnInit(): void {
    const routeUuid = this.route.snapshot.paramMap.get('uuid');
    if (routeUuid) {
      this.currentUuid = routeUuid;
    }

    this.loadMembers();
  }

  loadMembers(): void {
    this.isLoading = true;
    this.cooperativeService.getMembers().subscribe({
      next: (members) => {
        this.members = members;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.showError('Failed to load cooperative members');
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let results = [...this.members];

    // Search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      results = results.filter(m => 
        m.fullName.toLowerCase().includes(term) ||
        m.memberId.toString().toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.filters.status) {
      results = results.filter(m => m.status === this.filters.status);
    }

    // Date range filter
    if (this.filters.joinDateFrom) {
      const from = new Date(this.filters.joinDateFrom);
      results = results.filter(m => m.joinDate && new Date(m.joinDate) >= from);
    }
    if (this.filters.joinDateTo) {
      const to = new Date(this.filters.joinDateTo);
      to.setDate(to.getDate() + 1);
      results = results.filter(m => m.joinDate && new Date(m.joinDate) < to);
    }

    // Sorting - add support for 'sn' (serial number)
    if (this.sortField === 'sn') {
      // S/N sorting is handled by index, not by actual data
      // Keep current order
    } else {
      results = results.sort((a, b) => {
        let valueA: any;
        let valueB: any;
        switch (this.sortField) {
          case 'memberId':
            valueA = a.memberId;
            valueB = b.memberId;
            break;
          case 'fullName':
            valueA = a.fullName.toLowerCase();
            valueB = b.fullName.toLowerCase();
            break;
          case 'email':
            valueA = a.email.toLowerCase();
            valueB = b.email.toLowerCase();
            break;
          case 'phone':
            valueA = a.phone || '';
            valueB = b.phone || '';
            break;
          case 'status':
            valueA = a.status;
            valueB = b.status;
            break;
          case 'joinDate':
            valueA = new Date(a.joinDate).getTime();
            valueB = new Date(b.joinDate).getTime();
            break;
          default:
            valueA = a.memberId;
            valueB = b.memberId;
        }
        if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.filteredMembers = results;
    this.currentPage = 1;
  }

  updateMemberStatus(member: CooperativeMember, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): void {
    if (member.status === status) {
      return;
    }

    this.cooperativeService.updateMember({
      ...member,
      status
    }).subscribe({
      next: () => {
        this.loadMembers();
        this.showSuccess(`${member.fullName} status updated to ${this.formatStatus(status)}`);
      },
      error: () => {
        this.showError(`Failed to update ${member.fullName}'s status`);
      }
    });
  }

  reactivateMember(member: CooperativeMember, event: Event): void {
    event.stopPropagation();
    const shouldReactivate = window.confirm(`Reactivate ${member.fullName}? They will regain active cooperative privileges.`);
    if (!shouldReactivate) {
      return;
    }
    this.updateMemberStatus(member, 'ACTIVE');
  }

  markMemberInactive(member: CooperativeMember, event: Event): void {
    event.stopPropagation();
    const shouldMarkInactive = window.confirm(`Mark ${member.fullName} as inactive?`);
    if (!shouldMarkInactive) {
      return;
    }
    this.updateMemberStatus(member, 'INACTIVE');
  }

  activateInactiveMember(member: CooperativeMember, event: Event): void {
    event.stopPropagation();
    const shouldActivate = window.confirm(`Set ${member.fullName} back to active?`);
    if (!shouldActivate) {
      return;
    }
    this.updateMemberStatus(member, 'ACTIVE');
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/loan', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'ACTIVE': 'status-active',
      'INACTIVE': 'status-inactive',
      'SUSPENDED': 'status-suspended'
    };
    return statusMap[status] || `status-${status?.toLowerCase() || 'unknown'}`;
  }
}