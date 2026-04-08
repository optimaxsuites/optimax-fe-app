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
