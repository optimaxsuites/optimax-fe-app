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
    this.applyToGroup.emit(groupId);
  }

  onClose() {
    this.closeModal.emit();
  }
}
