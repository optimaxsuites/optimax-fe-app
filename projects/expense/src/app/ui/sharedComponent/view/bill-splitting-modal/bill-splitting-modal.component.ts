import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BillSplit, BillSplitParticipant, BillSplitMethod } from './bill-splitting.model';

@Component({
  selector: 'app-bill-splitting-modal',
  templateUrl: './bill-splitting-modal.component.html',
  styleUrls: ['./bill-splitting-modal.component.scss']
})
export class BillSplittingModalComponent {
  @Input() totalAmount = 0;                        // comes from parent expense amount
  @Input() participants: BillSplitParticipant[] = []; // list of participants

  @Output() save = new EventEmitter<BillSplit>();
  @Output() cancel = new EventEmitter<void>();

  method: BillSplitMethod = 'equal';   // default
  errorMessage: string | null = null;

  private validateSplit(): boolean {
    if (this.method === 'percentage') {
      const totalPercent = this.participants.reduce((sum, p) => sum + (p.sharePercent || 0), 0);
      if (totalPercent !== 100) {
        this.errorMessage = `Percentages must equal 100% (currently ${totalPercent}%)`;
        return false;
      }
    }

    if (this.method === 'amount') {
      const total = this.participants.reduce((sum, p) => sum + (p.shareAmount || 0), 0);
      if (total !== this.totalAmount) {
        this.errorMessage = `Amounts must equal ${this.totalAmount} (currently ${total})`;
        return false;
      }
    }

    this.errorMessage = null;
    return true;
  }

  onSave() {
    if (!this.validateSplit()) return;

    // Auto-calc for equal split
    if (this.method === 'equal') {
      const perHead = this.totalAmount / this.participants.length;
      this.participants.forEach(p => (p.shareAmount = perHead));
    }

    const result: BillSplit = {
      enabled: true,
      method: this.method,
      totalAmount: this.totalAmount,
      participants: this.participants
    };

    this.save.emit(result);
  }
}
