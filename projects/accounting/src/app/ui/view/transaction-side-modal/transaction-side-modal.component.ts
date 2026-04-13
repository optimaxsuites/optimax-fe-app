import { Component, Input, Output, EventEmitter } from '@angular/core';

interface Transaction {
  id: number;
  date: string;
  description: string;
  spent: number | null;
  received: number | null;
  assignedTo: string;
  reviewed?: boolean;
}

@Component({
  selector: 'transaction-side-modal',
  templateUrl: './transaction-side-modal.component.html',
})
export class TransactionSideModalComponent {
  @Input() transaction: Transaction | null = null;
  @Output() close = new EventEmitter<void>();

  selectedAccount: string = '';

  onClose() {
    this.close.emit();
  }

  confirmTransaction() {
    if (!this.transaction) return;
    if (!this.transaction.assignedTo || !this.selectedAccount) {
      alert('Please select both category and account before confirming.');
      return;
    }

    this.transaction.reviewed = true;
    this.onClose();
  }
}
