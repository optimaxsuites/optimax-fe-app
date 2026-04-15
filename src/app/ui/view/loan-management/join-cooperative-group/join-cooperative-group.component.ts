import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CooperativeLoanGroup } from '../../../service/loan/cooperative-loan/cooperative.types';

@Component({
  selector: 'app-join-cooperative-group',
  templateUrl: './join-cooperative-group.component.html',  
  styleUrls: ['./join-cooperative-group.component.scss']   
})
export class JoinCooperativeGroupComponent {
  @Input() availableGroups: CooperativeLoanGroup[] = [];
  @Input() eligibleGroupIds: string[] = [];
  @Output() applyToGroup = new EventEmitter<string>();
  @Output() closeModal = new EventEmitter<void>();

  loadingGroupId: string | null = null;
  applicationSent: boolean = false;

  formatCurrency(amount: number | undefined): string {
    return Number(amount || 0).toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  isEligible(groupId: string): boolean {
    return this.eligibleGroupIds.includes(groupId);
  }

  getBorrowCapPercentage(group: CooperativeLoanGroup): number {
    return Number(group.withdrawCap || group.maxBorrowingPercentage || 0);
  }

  getBorrowCapSummary(group: CooperativeLoanGroup): string {
    return `${this.getBorrowCapPercentage(group)}% of total group contributions`;
  }

  getLateFeeSummary(group: CooperativeLoanGroup): string {
    const percentage = Number(group.lateFeePercentage || 0);
    const graceDays = Number(group.lateFeeGraceDays || 0);
    return `${percentage}% after ${graceDays} day${graceDays === 1 ? '' : 's'}`;
  }

  getMemberLimitSummary(group: CooperativeLoanGroup): string {
    const memberLimit = Number(group.memberLimit || 0);
    return memberLimit > 0 ? `${memberLimit} members max` : 'No member cap';
  }

  getGuarantorSummary(group: CooperativeLoanGroup): string {
    if (!group.requiresGuarantors) {
      return 'No guarantor requirement';
    }

    const minimumGuarantors = Number(group.minimumGuarantors || 0);
    return `${minimumGuarantors || 1} guarantor${minimumGuarantors === 1 ? '' : 's'} required`;
  }

  getAccountingSummary(group: CooperativeLoanGroup): string {
    const hasAccountingEmail = String(group.accountingEmail || '').trim().length > 0;
    const hasContributionRail = String(group.contributionsBankName || '').trim().length > 0
      && String(group.contributionsAccount || '').trim().length > 0;

    if (hasAccountingEmail && hasContributionRail) {
      return 'Accounting and collection rail configured';
    }

    if (hasAccountingEmail) {
      return 'Accounting contact configured';
    }

    return 'Accounting details will be shared after approval';
  }

  onApply(groupId: string) {
    if (this.loadingGroupId) return;
    this.loadingGroupId = groupId;
    this.applyToGroup.emit(groupId);
    this.applicationSent = true;
    // Show loading for 1s, then close modal
    setTimeout(() => {
      this.loadingGroupId = null;
      this.closeModal.emit();
    }, 1000);
  }

  onClose() {
    this.closeModal.emit();
  }
}
