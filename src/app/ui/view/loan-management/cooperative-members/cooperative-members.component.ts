import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { v4 as uuidV4 } from 'uuid';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { BackNavigationService } from '../../../shared-component/service/navigation/back-navigation.service';
import { CooperativeMember } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-cooperative-members',
  templateUrl: './cooperative-members.component.html',
  styleUrls: ['./cooperative-members.component.scss']
})
export class CooperativeMembersComponent implements OnInit {
  currentUuid = uuidV4();
  members: CooperativeMember[] = [];
  filteredMembers: CooperativeMember[] = [];
  isLoading = true;
  searchTerm = '';

  // Filters
  filters = {
    status: 'ACTIVE',
    minShares: null as number | null,
    maxShares: null as number | null
  };

  // Sorting
  sortField = 'joinDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  statusOptions = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

  get activeMembersCount(): number {
    return this.members.filter((member) => member.status === 'ACTIVE').length;
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
    this.cooperativeService.getMembers().subscribe(members => {
      this.members = members;
      this.applyFilters();
      this.isLoading = false;
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

    // Shares range
    if (this.filters.minShares !== null) {
      results = results.filter(m => m.shareCapital >= this.filters.minShares!);
    }
    if (this.filters.maxShares !== null) {
      results = results.filter(m => m.shareCapital <= this.filters.maxShares!);
    }

    this.filteredMembers = this.sortData(results);
  }

  sortData(data: CooperativeMember[]): CooperativeMember[] {
    return data.sort((a, b) => {
      let valueA: any, valueB: any;

      switch(this.sortField) {
        case 'memberId':
          valueA = a.memberId;
          valueB = b.memberId;
          break;
        case 'fullName':
          valueA = a.fullName.toLowerCase();
          valueB = b.fullName.toLowerCase();
          break;
        case 'shareCapital':
          valueA = a.shareCapital;
          valueB = b.shareCapital;
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
          return 0;
      }

      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

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

  resetFilters(): void {
    this.searchTerm = '';
    this.filters = { status: 'ACTIVE', minShares: null, maxShares: null };
    this.sortField = 'joinDate';
    this.sortDirection = 'desc';
    this.applyFilters();
  }

  viewMember(id: number): void {
    this.router.navigate([`/admin/hr/cooperative/members/${id}/${this.currentUuid}`], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  viewLoanHistory(memberId: number, event: Event): void {
    event.stopPropagation();
    this.router.navigate([`/admin/hr/cooperative/members/${memberId}/${this.currentUuid}`], {
      queryParams: { tab: 'loans', dashboard: 'cooperative' }
    });
  }

  updateMemberStatus(member: CooperativeMember, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'): void {
    if (member.status === status) {
      return;
    }

    this.cooperativeService.updateMember({
      ...member,
      status
    }).subscribe(() => {
      this.loadMembers();
    });
  }

  suspendMember(member: CooperativeMember, event: Event): void {
    event.stopPropagation();
    const shouldSuspend = window.confirm(`Suspend ${member.fullName}? They will lose active cooperative privileges until reactivated.`);
    if (!shouldSuspend) {
      return;
    }
    this.updateMemberStatus(member, 'SUSPENDED');
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

  addMember(): void {
    this.router.navigate(['/admin/hr/cooperative/members/add', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/hr/cooperative/dashboard', this.currentUuid], {
      queryParams: { dashboard: 'cooperative' }
    });
  }

  formatCurrency(amount: number): string {
    return this.cooperativeService.formatCurrency(amount);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
}