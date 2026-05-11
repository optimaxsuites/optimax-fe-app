import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CooperativeService } from '../../../service/loan/cooperative-loan/cooperative.service';
import { CooperativeLoanGroup, CooperativeMember, CooperativeGroupMembership } from '../../../service/loan/cooperative-loan/cooperative.types';
import { Message } from 'primeng/api';
import { v4 as uuidV4 } from 'uuid';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-cooperative-patronage-distribution',
  templateUrl: './cooperative-patronage-distribution.component.html',
  styleUrls: ['./cooperative-patronage-distribution.component.scss']
})
export class CooperativePatronageDistributionComponent implements OnInit {
  allGroups: CooperativeLoanGroup[] = [];
  groups: CooperativeLoanGroup[] = [];
  members: CooperativeMember[] = [];
  groupMemberships: CooperativeGroupMembership[] = [];
  loading = true;
  error: string | null = null;
  messages: Message[] = [];

  selectedGroup: CooperativeLoanGroup | null = null;
  selectedMember: CooperativeMember | null = null;
  showDistributionModal = false;
  
  // Properties for distribution modal
  distributing = false;
  distributionSuccess: string | null = null;
  distributionError: string | null = null;
  totalPatronage = 0;
  distribution: { member: CooperativeMember; share: number }[] = [];

  // Search and pagination for groups
  groupSearchTerm = '';
  filteredGroups: CooperativeLoanGroup[] = [];
  groupsPage = 1;
  groupsPageSize = 10;

  // Search and pagination for members
  memberSearchTerm = '';
  filteredMembers: CooperativeMember[] = [];
  membersPage = 1;
  membersPageSize = 10;

  // Distribution notes and checklist
  distributionNotes = '';
  checklistVerified = false;
  checklistAmountCalculated = false;
  checklistAccountingNotified = false;

  // Batch member actions
  selectedMemberIds: Set<number> = new Set();
  batchSending = false;

  constructor(
    private cooperativeService: CooperativeService,
    private location: Location,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    this.cooperativeService.loadGroups().subscribe({
      next: (groups: CooperativeLoanGroup[]) => {
        this.allGroups = groups || [];
        this.cooperativeService.getMembers().subscribe({
          next: (members: CooperativeMember[]) => {
            this.members = members || [];
            this.cooperativeService.loadGroupMemberships().subscribe({
              next: (memberships: CooperativeGroupMembership[]) => {
                this.groupMemberships = memberships || [];
                this.refreshEligibleGroups();
                this.loading = false;
              },
              error: (err: any) => {
                this.error = 'Failed to load group memberships.';
                this.loading = false;
                this.showMessage('error', 'Error', this.error);
              }
            });
          },
          error: (err: any) => {
            this.error = 'Failed to load members.';
            this.loading = false;
            this.showMessage('error', 'Error', this.error);
          }
        });
      },
      error: (err: any) => {
        this.error = 'Failed to load groups.';
        this.loading = false;
        this.showMessage('error', 'Error', this.error);
      }
    });
  }

  selectGroup(group: CooperativeLoanGroup) {
    this.selectedGroup = group;
    this.selectedMember = null;
    this.memberSearchTerm = '';
    this.filteredMembers = this.getGroupMembers(group);
    this.membersPage = 1;
    this.clearBatchSelection();
    // Reset checklist when selecting a new group
    this.resetChecklist();
  }

  getGroupMembers(group: CooperativeLoanGroup | null): CooperativeMember[] {
    if (!group || !this.groupMemberships.length) return [];
    const memberIds = this.groupMemberships
      .filter((gm) => gm.groupId === group.id && gm.status === 'ACTIVE')
      .map((gm) => gm.memberId);
    return this.members.filter((m) => memberIds.includes(m.id));
  }

  // Returns the formatted group membership ID for a member in a group
  getFormattedGroupMembershipId(member: CooperativeMember, group: CooperativeLoanGroup | null): string {
    if (!member || !group) return '';
    const membership = this.groupMemberships.find(
      (gm) => gm.memberId === member.id && gm.groupId === group.id
    );
    if (!membership) return '';
    const id = membership.id ? String(membership.id) : '';
    const last4 = id.length > 4 ? id.slice(-4) : id;
    return `GM-${group.id}-${member.id}-${last4}`;
  }
  
  filterGroups(): void {
    const eligibleGroups = this.getEligibleGroups();
    if (!this.groupSearchTerm) {
      this.filteredGroups = [...eligibleGroups];
    } else {
      const term = this.groupSearchTerm.toLowerCase();
      this.filteredGroups = eligibleGroups.filter(group => 
        (group.name?.toLowerCase().includes(term) || false) || 
        (group.code?.toLowerCase().includes(term) || false)
      );
    }
    this.groupsPage = 1;
  }

  filterMembers(): void {
    const members = this.selectedGroup ? this.getGroupMembers(this.selectedGroup) : [];
    if (!this.memberSearchTerm) {
      this.filteredMembers = [...members];
    } else {
      const term = this.memberSearchTerm.toLowerCase();
      this.filteredMembers = members.filter(member => 
        (member.fullName?.toLowerCase().includes(term) || false)
      );
    }
    this.selectedMemberIds.forEach((memberId) => {
      if (!this.filteredMembers.some((member) => member.id === memberId)) {
        this.selectedMemberIds.delete(memberId);
      }
    });
    this.membersPage = 1;
  }

  viewMember(member: CooperativeMember) {
    this.selectedMember = member;
    // Reset checklist when viewing a new member
    this.resetChecklist();
  }

  resetChecklist(): void {
    this.checklistVerified = false;
    this.checklistAmountCalculated = false;
    this.checklistAccountingNotified = false;
    this.distributionNotes = '';
  }

  private refreshEligibleGroups(): void {
    this.groups = this.getEligibleGroups();
    this.filterGroups();

    if (this.selectedGroup && !this.groups.some((group) => group.id === this.selectedGroup?.id)) {
      this.selectedGroup = null;
      this.selectedMember = null;
      this.filteredMembers = [];
      this.clearBatchSelection();
    } else if (this.selectedGroup) {
      this.filterMembers();
    }
  }

  private getEligibleGroups(): CooperativeLoanGroup[] {
    return this.allGroups.filter((group) => this.isGroupEligibleForPatronage(group));
  }

  private isGroupEligibleForPatronage(group: CooperativeLoanGroup): boolean {
    return !!group
      && group.status === 'ACTIVE'
      && group.patronageEligible === true
      && Number(group.patronageAmount || 0) > 0
      && this.getGroupMembers(group).length > 0;
  }

  closeDistributionModal() {
    this.showDistributionModal = false;
    this.distributing = false;
    this.distributionSuccess = null;
    this.distributionError = null;
    this.distribution = [];
    this.totalPatronage = 0;
  }

  /**
   * Patronage refund is proportional to interest paid by member:
   * Patronage Refund = (Member's Interest Paid ÷ Total Interest of All Members) × Co-op Profit
   */
  getMemberPatronageShare(member: CooperativeMember | null): number {
    if (!member || !this.selectedGroup) return 0;
    const group = this.selectedGroup;
    const members = this.getGroupMembers(group);
    const totalPatronage = Number(group.patronageAmount || 0);
    // Calculate total interest paid by all members in this group
    const memberInterestMap = this.getGroupMembersInterestPaidMap(group);
    const totalInterestPaid = Array.from(memberInterestMap.values()).reduce((sum, val) => sum + val, 0);
    if (totalInterestPaid === 0) return 0;
    const memberInterestPaid = memberInterestMap.get(member.id) || 0;
    return (memberInterestPaid / totalInterestPaid) * totalPatronage;
  }

  /**
   * Returns a Map of memberId to total interest paid for all members in the group
   */
  getGroupMembersInterestPaidMap(group: CooperativeLoanGroup): Map<number, number> {
    const map = new Map<number, number>();
    if (!group) return map;
    // Get all members in this group
    const members = this.getGroupMembers(group);
    // For each member, sum their totalInterestPaid for loans in this group
    for (const member of members) {
      let totalInterest = 0;
      // Get all loans for this member
      const loans = this.cooperativeService.getLoansByMember(member.id);
      for (const loan of loans) {
        // Only count loans in this group and with a valid totalInterestPaid
        if ((loan.groupId === group.id || loan.cooperativeGroupId === group.id) && Number(loan.totalInterestPaid) > 0) {
          totalInterest += Number(loan.totalInterestPaid);
        }
      }
      map.set(member.id, totalInterest);
    }
    return map;
  }

  getPerMemberShare(group: CooperativeLoanGroup | null): number {
    if (!group) return 0;
    const members = this.getGroupMembers(group);
    const totalPatronage = Number(group.patronageAmount || 0);
    return members.length > 0 ? totalPatronage / members.length : 0;
  }

  // Returns the total interest paid by all members in a group
  getGroupTotalInterestPaid(group: CooperativeLoanGroup): number {
    if (!group) return 0;
    const memberInterestMap = this.getGroupMembersInterestPaidMap(group);
    return Array.from(memberInterestMap.values()).reduce((sum, val) => sum + val, 0);
  }
    
  // Returns a local patronage rate for a group if not present
  getLocalPatronageRate(group: CooperativeLoanGroup | null): number {
    if (!group) return 10;
    // You can customize this logic as needed
    return 10;
  }

  getTotalPatronagePool(): number {
    return this.groups.reduce((sum, group) => sum + Number(group.patronageAmount || 0), 0);
  }

  get batchSelectedMembers(): CooperativeMember[] {
    return this.filteredMembers.filter((member) => this.selectedMemberIds.has(member.id));
  }

  get isBatchMode(): boolean {
    return this.batchSelectedMembers.length >= 2;
  }

  getBatchResultsLabel(): string {
    const count = this.batchSelectedMembers.length;
    return `${count} member${count === 1 ? '' : 's'} selected`;
  }

  getBatchPatronageTotal(): number {
    return this.batchSelectedMembers.reduce((sum, member) => sum + this.getMemberPatronageShare(member), 0);
  }

  isBatchSelected(member: CooperativeMember): boolean {
    return this.selectedMemberIds.has(member.id);
  }

  toggleBatchSelect(member: CooperativeMember): void {
    if (this.selectedMemberIds.has(member.id)) {
      this.selectedMemberIds.delete(member.id);
      return;
    }

    this.selectedMemberIds.add(member.id);
  }

  selectAllMembers(): void {
    this.filteredMembers.forEach((member) => this.selectedMemberIds.add(member.id));
  }

  clearBatchSelection(): void {
    this.selectedMemberIds.clear();
  }

  sendToAccounting(member: CooperativeMember | null) {
    if (!member) return;
    if (!this.isChecklistReady()) {
      this.showMessage('warn', 'Checklist Incomplete', 'Please complete the distribution checklist before sending to accounting.');
      return;
    }

    const refundAmount = this.getLocalMemberPatronageRefund(member, this.selectedGroup);
    this.batchSending = true;

    this.postPatronageToAccounting(member).subscribe({
      next: () => {
        this.batchSending = false;
        this.checklistAccountingNotified = true;
        this.showMessage('success', 'Success', `Patronage refund of ${this.formatCurrency(refundAmount)} for ${member.fullName} sent to accounting!`);
      },
      error: (err) => {
        this.batchSending = false;
        console.error('Accounting API error:', err);
        this.showMessage('error', 'Error', 'Failed to send to accounting: ' + (err?.message || err?.statusText || 'Unknown error'));
      }
    });
  }

  sendBatchToAccounting(): void {
    if (!this.isBatchMode) {
      return;
    }

    if (!this.isChecklistReady()) {
      this.showMessage('warn', 'Checklist Incomplete', 'Please complete the distribution checklist before batch sending to accounting.');
      return;
    }

    this.batchSending = true;
    const requests = this.batchSelectedMembers.map((member) =>
      this.postPatronageToAccounting(member).pipe(
        map(() => ({ member, success: true })),
        catchError((error) => of({ member, success: false, error }))
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        this.batchSending = false;
        this.checklistAccountingNotified = true;

        const successes = results.filter((result) => result.success);
        const failures = results.filter((result) => !result.success);

        if (!failures.length) {
          this.showMessage('success', 'Batch Sent', `${successes.length} patronage refund requests were sent to accounting.`);
          return;
        }

        const failedNames = failures.map((result) => result.member.fullName).slice(0, 3).join(', ');
        this.showMessage(
          failures.length === results.length ? 'error' : 'warn',
          failures.length === results.length ? 'Batch Failed' : 'Batch Partially Sent',
          failures.length === results.length
            ? `None of the selected patronage requests could be sent. Failed members: ${failedNames}.`
            : `${successes.length} sent successfully, ${failures.length} failed. Failed members: ${failedNames}.`
        );
      },
      error: () => {
        this.batchSending = false;
        this.showMessage('error', 'Batch Failed', 'The batch patronage requests could not be sent to accounting.');
      }
    });
  }

  confirmMemberDistribution(member: CooperativeMember | null) {
    if (!member) return;
    
    if (!this.isChecklistReady()) {
      this.showMessage('warn', 'Checklist Incomplete', 'Please complete the distribution checklist before distributing.');
      return;
    }
    
    this.showMessage('success', 'Success', `Patronage of ${this.formatCurrency(this.getMemberPatronageShare(member))} distributed to ${member.fullName}!`);
    // Keep the member selected, don't clear selection
  }

  distributePatronage(group: CooperativeLoanGroup) {
    this.selectedGroup = group;
    this.totalPatronage = Number(group.patronageAmount || 0);
    const members = this.getGroupMembers(group);
    const totalMembers = members.length;
    this.distribution = members.map(member => ({
      member,
      share: totalMembers > 0 ? this.totalPatronage / totalMembers : 0
    }));
    this.showDistributionModal = true;
  }

  confirmDistribution() {
    this.distributing = true;
    this.distributionSuccess = null;
    this.distributionError = null;
    
    setTimeout(() => {
      this.distributing = false;
      this.distributionSuccess = 'Patronage distribution successful!';
      this.showMessage('success', 'Success', this.distributionSuccess);
      setTimeout(() => this.closeDistributionModal(), 1500);
    }, 1200);
  }

  get paginatedGroups(): CooperativeLoanGroup[] {
    const startIndex = (this.groupsPage - 1) * this.groupsPageSize;
    return this.filteredGroups.slice(startIndex, startIndex + this.groupsPageSize);
  }

  getGroupsTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredGroups.length / this.groupsPageSize));
  }

  goToGroupsPage(page: number): void {
    if (page < 1 || page > this.getGroupsTotalPages()) return;
    this.groupsPage = page;
  }

  getGroupsResultsLabel(): string {
    const start = (this.groupsPage - 1) * this.groupsPageSize + 1;
    const end = Math.min(this.groupsPage * this.groupsPageSize, this.filteredGroups.length);
    return `Showing ${start}-${end} of ${this.filteredGroups.length} groups`;
  }

  get paginatedMembers(): CooperativeMember[] {
    const startIndex = (this.membersPage - 1) * this.membersPageSize;
    return this.filteredMembers.slice(startIndex, startIndex + this.membersPageSize);
  }

  getMembersTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMembers.length / this.membersPageSize));
  }

  goToMembersPage(page: number): void {
    if (page < 1 || page > this.getMembersTotalPages()) return;
    this.membersPage = page;
  }

  getMembersResultsLabel(): string {
    const start = (this.membersPage - 1) * this.membersPageSize + 1;
    const end = Math.min(this.membersPage * this.membersPageSize, this.filteredMembers.length);
    return `Showing ${start}-${end} of ${this.filteredMembers.length} members`;
  }

    // Returns a local total interest paid for a member for demo purposes (dynamic)
    getLocalMemberTotalInterestPaid(member: CooperativeMember, group: CooperativeLoanGroup | null): number {
      if (!member || !group) return 0;
      // Demo: vary by member ID and group ID
      return 500000 + ((member.id * 12345 + (group.id || 0) * 54321) % 700000);
    }

      // Patronage refund using only local demo values
  getLocalMemberPatronageRefund(member: CooperativeMember, group: CooperativeLoanGroup | null): number {
    if (!member || !group) return 0;
    const memberInterest = this.getLocalMemberTotalInterestPaid(member, group);
    const groupTotalInterest = this.getLocalGroupTotalInterestPaid(group);
    const patronagePool = this.getLocalPatronagePool(group);
    if (groupTotalInterest === 0) return 0;
    return (memberInterest / groupTotalInterest) * patronagePool;
  }
  getMemberStatusClass(status: string | undefined): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'status-active';
      case 'INACTIVE':
        return 'status-inactive';
      case 'SUSPENDED':
        return 'status-suspended';
      case 'PENDING':
        return 'status-pending';
      default:
        return 'status-active';
    }
  }

    // Returns a local total interest paid for demo purposes (dynamic)
    getLocalGroupTotalInterestPaid(group: CooperativeLoanGroup): number {
      if (!group) return 0;
      // Demo: vary by group ID
      return 1000000 + ((group.id || 0) * 250000) % 2000000;
    }

  // Returns a local patronage pool for demo purposes (dynamic)
  getLocalPatronagePool(group: CooperativeLoanGroup): number {
    if (!group) return 0;
    // Demo: vary by group ID
    return 2000000 + ((group.id || 0) * 1000000) % 4000000;
  }

  // Returns the total interest paid for a member in the selected group
  getTotalInterestPaidForMember(member: CooperativeMember, group: CooperativeLoanGroup | null): number {
    if (!member || !group) return 0;
    const memberInterestMap = this.getGroupMembersInterestPaidMap(group);
    return memberInterestMap.get(member.id) || 0;
  }

  formatCurrency(value: number): string {
    if (value === null || value === undefined || isNaN(value)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(value);
  }

  private showMessage(severity: 'success' | 'error' | 'warn' | 'info', summary: string, detail: string): void {
    this.messages = [{ severity, summary, detail }];
    setTimeout(() => { this.messages = []; }, 5000);
  }

  private isChecklistReady(): boolean {
    return this.checklistVerified && this.checklistAmountCalculated;
  }

  private postPatronageToAccounting(member: CooperativeMember) {
    const group = this.selectedGroup;
    const refundAmount = this.getLocalMemberPatronageRefund(member, group);
    const reference = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const now = new Date();
    const apiUrl = 'https://be.optimaxsuites.com/x/api/v2/accounting/events';

    const payload = {
      sourceModule: 'HR',
      eventType: 'PATRONAGE',
      amount: refundAmount,
      currency: 'NGN',
      reference,
      description: `Patronage refund for ${member.fullName} (${member.id})`,
      transactionDate: now.toISOString(),
      metadata: {
        memberName: member.fullName,
        accountNumber: member.memberAccountNumber || 'N/A',
        memberId: member.id,
        bankName: member.memberBankName || 'N/A',
        groupName: group?.name || 'N/A',
        groupCode: group?.code || 'N/A',
        totalInterestPaid: this.getLocalMemberTotalInterestPaid(member, group),
        groupMembershipId: this.getFormattedGroupMembershipId(member, group),
        notes: this.distributionNotes || undefined
      }
    };

    return this.http.post(apiUrl, payload);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/admin/hr/loan', uuidV4()]);
  }
}